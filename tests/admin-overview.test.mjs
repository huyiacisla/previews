// Admin Command Center: the Support queue and the unread messages are the same numbers the Ticket box and Messages show.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/messaging/store.js';
import { createMemoryBus } from '../src/messaging/transport.js';
import { pickPersona } from '../src/messaging/personas.js';
import { supportQueue, messagesWaiting, adminOverview, waited, PLATFORM, HEALTH, ACTIVITY } from '../src/admin/overview.js';

const T0 = Date.UTC(2026, 10, 13, 15, 0, 0);
function setup() {
  const clock = { t: T0 };
  const store = createStore({ transport: createMemoryBus().connect(), now: () => clock.t });
  return { clock, store };
}
const admin = pickPersona('admin', 'adm-1');
const admin2 = pickPersona('admin', 'adm-2');

test('the queue counts exactly what the Ticket box of an admin shows', () => {
  const { store, clock } = setup();
  const q = supportQueue(store, admin, clock.t);
  const box = store.ticketBox('adm-1');
  assert.equal(q.total, box.length);
  assert.equal(q.open, store.ticketCounts('adm-1').open);
  assert.equal(q.byStage.open + q.byStage.pending + q.byStage.resolved, box.length, 'every ticket is in exactly one stage');
  assert.equal(q.rows.length, q.open);
  assert.equal(q.fromStaff + q.fromClients, q.open, 'only Staff and Clients open Support tickets');
});

test('a ticket a Client opens appears at once, without an owner, and takes the count up by one', () => {
  const { store, clock } = setup();
  const before = supportQueue(store, admin, clock.t);
  const r = store.startSupport('cli-1', { subject: 'Invoice shows the wrong plan', text: 'We are on Growth, the invoice says Starter.', priority: 'high', category: 'Billing' });
  assert.ok(r.ok, JSON.stringify(r));
  const after = supportQueue(store, admin, clock.t);
  assert.equal(after.open, before.open + 1);
  assert.equal(after.unassigned, before.unassigned + 1);
  assert.equal(after.fromClients, before.fromClients + 1);
  assert.equal(after.high, before.high + 1);
  const row = after.rows.find((t) => t.id === r.convId);
  assert.ok(row);
  assert.equal(row.subject, 'Invoice shows the wrong plan');
  assert.equal(row.requester.name, 'Dana Whitfield');
  assert.equal(row.category, 'Billing');
  assert.equal(row.assignee, '');
  assert.equal(after.rows[0].priority, 'high', 'High priority goes to the top');
  // the same ticket, by the same id, is what the Ticket box opens
  assert.equal(store.ticketRecord('adm-1', r.convId).ticket.no, row.no);
});

test('a Staff ticket reaches the admin queue too; a Resident chat never does', () => {
  const { store, clock } = setup();
  const before = supportQueue(store, admin, clock.t);
  assert.ok(store.startSupport('stf-1', { subject: 'Gate reader offline', text: 'Reader 2 stopped answering.', category: 'Bug / technical' }).ok);
  const after = supportQueue(store, admin, clock.t);
  assert.equal(after.fromStaff, before.fromStaff + 1);
  assert.ok(after.rows.every((t) => t.kind === 'support'), 'resident tickets belong to the property team, not to Support');
  assert.equal(store.startSupport('res-1', { subject: 'Hi', text: 'Hello' }).reason, 'not_allowed');
});

test('taking, pending and resolving a ticket move it between the counts', () => {
  const { store, clock } = setup();
  const r = store.startSupport('cli-2', { subject: 'Cannot add a property', text: 'The button is greyed out.' });
  const q0 = supportQueue(store, admin, clock.t);
  assert.ok(store.assignSupport(r.convId, 'adm-1', 'adm-1').ok);
  const q1 = supportQueue(store, admin, clock.t);
  assert.equal(q1.unassigned, q0.unassigned - 1);
  assert.equal(q1.mine, q0.mine + 1);
  assert.equal(supportQueue(store, admin2, clock.t).mine, supportQueue(store, admin2, clock.t).rows.filter((t) => t.assignee === 'Casey Ng').length, 'each admin sees their own share');
  assert.ok(store.setSupportStatus(r.convId, 'adm-1', 'pending').ok);
  const q2 = supportQueue(store, admin, clock.t);
  assert.equal(q2.byStage.pending, q1.byStage.pending + 1);
  assert.equal(q2.byStage.open, q1.byStage.open - 1);
  assert.equal(q2.open, q1.open, 'pending is still open work');
  clock.t += 3600000;
  assert.ok(store.setSupportStatus(r.convId, 'adm-1', 'resolved').ok);
  const q3 = supportQueue(store, admin, clock.t);
  assert.equal(q3.open, q2.open - 1);
  assert.equal(q3.byStage.resolved, q2.byStage.resolved + 1);
  assert.equal(q3.resolvedThisWeek, q2.resolvedThisWeek + 1);
  assert.ok(!q3.rows.some((t) => t.id === r.convId), 'a resolved ticket leaves the queue');
  // the requester sees the same state in their own Ticket box
  assert.equal(store.ticketBox('cli-2').find((t) => t.id === r.convId).stage, 'resolved');
});

test('the queue is ordered: High first, then the one waiting longest', () => {
  const { store, clock } = setup();
  const a = store.startSupport('cli-1', { subject: 'Old normal', text: 'x', priority: 'normal' });
  clock.t += 600000;
  const b = store.startSupport('cli-1', { subject: 'New high', text: 'x', priority: 'high' });
  clock.t += 600000;
  const c = store.startSupport('stf-2', { subject: 'Newest low', text: 'x', priority: 'low' });
  const ids = supportQueue(store, admin, clock.t).rows.map((t) => t.id);
  assert.ok(ids.indexOf(b.convId) < ids.indexOf(a.convId), 'High before Normal');
  assert.ok(ids.indexOf(a.convId) < ids.indexOf(c.convId), 'Normal before Low');
  assert.ok(supportQueue(store, admin, clock.t).oldestMs >= 1200000);
});

test('unread messages: the same number as the Messages badge, and reading clears it', () => {
  const { store } = setup();
  const r = store.startSupport('cli-1', { subject: 'Need help', text: 'Please call me.' });
  const m = messagesWaiting(store, admin);
  assert.equal(m.unread, store.badgeCount('adm-1'));
  assert.ok(m.items.some((x) => x.convId === r.convId), 'a new ticket is also a conversation with something unread');
  store.markRead(r.convId, 'adm-1');
  const after = messagesWaiting(store, admin);
  assert.equal(after.unread, store.badgeCount('adm-1'));
  assert.ok(!after.items.some((x) => x.convId === r.convId));
});

test('the headline names the worst thing first', () => {
  const { store, clock } = setup();
  for (const t of store.ticketBox('adm-1').filter((x) => x.isOpen)) store.setSupportStatus(t.id, 'adm-1', 'resolved');
  assert.equal(adminOverview(store, admin, clock.t).headline, 'The Support queue is clear');
  const r = store.startSupport('cli-1', { subject: 'One', text: 'x' });
  assert.equal(adminOverview(store, admin, clock.t).headline, '1 ticket has no owner yet');
  store.assignSupport(r.convId, 'adm-1', 'adm-2');
  assert.equal(adminOverview(store, admin, clock.t).headline, '1 open ticket, all with an owner');
});

test('what the page draws: four tiles, the ticket rows with their links and badges, the messages', async () => {
  const { adminView } = await import('../src/admin/overview.js');
  const { store, clock } = setup();
  for (const t of store.ticketBox('adm-1').filter((x) => x.isOpen)) store.setSupportStatus(t.id, 'adm-1', 'resolved');
  const links = { tickets: '/admin/tickets.html?as=adm-1', messages: '/admin/messages.html?as=adm-1' };
  const clear = adminView(adminOverview(store, admin, clock.t), clock.t, links);
  assert.deepEqual(clear.tiles.map((t) => t.label), ['Open tickets', 'Unread messages', 'Emergencies', 'Platform alerts']);
  assert.equal(clear.tiles[0].value, '0');
  assert.equal(clear.tiles[0].tone, 'success');
  assert.equal(clear.tiles[0].note, 'Nothing is waiting');
  assert.equal(clear.queueRows.length, 0);
  assert.equal(clear.queueMore, '');
  assert.equal(clear.tiles[3].value, '32');
  assert.equal(clear.tiles[3].scroll, true, 'the alerts tile points inside the page');
  const r = store.startSupport('cli-1', { subject: 'Invoice shows the wrong plan', text: 'We are on Growth.', priority: 'high', category: 'Billing' });
  clock.t += 5 * 60000;
  const v = adminView(adminOverview(store, admin, clock.t), clock.t, links, () => '5:11 PM');
  assert.equal(v.tiles[0].value, '1');
  assert.equal(v.tiles[0].tone, 'warning', 'a ticket without an owner is a warning');
  assert.equal(v.tiles[0].note, '1 without an owner · oldest 5 min');
  assert.equal(v.tiles[0].href, links.tickets);
  const row = v.queueRows[0];
  assert.equal(row.href, `/admin/tickets.html?as=adm-1#/t/${r.convId}`, 'the row opens that ticket and keeps who is signed in');
  assert.equal(row.who, 'Dana Whitfield · Client · Billing');
  assert.deepEqual(row.badges, [{ text: 'High', tone: 'danger' }, { text: 'Open', tone: 'info' }, { text: 'Unassigned', tone: 'warning' }]);
  assert.equal(row.wait, '5 min');
  assert.match(row.aria, /no owner, waiting 5 min\.$/);
  assert.deepEqual(v.stages.map((s) => s.label), ['Open', 'Pending', 'Resolved']);
  assert.equal(v.queueSub.startsWith('1 from Clients · 0 from Staff'), true);
  assert.equal(v.queueMore, 'Most urgent first, then longest waiting');
  const msg = v.msgRows.find((x) => x.href.endsWith(`#/c/${r.convId}`));
  assert.ok(msg, 'the new ticket is also an unread conversation');
  assert.equal(msg.time, '5:11 PM');
  // more than six open: the page says how many it shows
  for (let i = 0; i < 7; i += 1) store.startSupport('stf-1', { subject: `Extra ${i}`, text: 'x' });
  const many = adminView(adminOverview(store, admin, clock.t), clock.t, links);
  assert.equal(many.queueRows.length, 6);
  assert.equal(many.queueMore, 'Showing 6 of 8 open, most urgent first');
});

test('waiting times read like a person would say them', () => {
  assert.equal(waited(20000), 'just now');
  assert.equal(waited(5 * 60000), '5 min');
  assert.equal(waited(3 * 3600000), '3 h');
  assert.equal(waited(3 * 86400000), '3 d');
});

test('the sample sections say what the captured dashboard said', () => {
  const v = Object.fromEntries(PLATFORM.map((p) => [p.key, p.value]));
  assert.deepEqual(v, { clients: '2', properties: '2', people: '43', spaces: '261', requests: '0', billing: '0', revenue: '$19' });
  assert.equal(HEALTH.warning, 32);
  assert.equal(HEALTH.groups[0].items.length, 8);
  assert.equal(ACTIVITY.length, 6);
});
