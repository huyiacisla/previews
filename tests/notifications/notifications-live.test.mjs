// The bell and the Notifications page: what Messenger and Social really said to a person, on top of the sample list.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../src/features/messaging/store.js';
import { createMemoryBus } from '../../src/features/messaging/transport.js';
import { ensureFeed } from '../../src/features/social/seed.js';
import { addReply as residentReply } from '../../src/features/social/store.js';
import { messengerItems, socialItems, liveItems } from '../../src/features/notifications/live.js';
import { buildAll, isRead, counts, setRead, readMap } from '../../src/features/notifications/store.js';
import { pickPersona } from '../../src/features/messaging/personas.js';

const T0 = Date.UTC(2026, 10, 9, 15, 0, 0);
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
function setup() {
  const clock = { t: T0 };
  const bus = createMemoryBus();
  const store = createStore({ transport: bus.connect(), now: () => clock.t });
  return { clock, store };
}
const client = pickPersona('client', 'cli-1');
const staff = pickPersona('staff', 'stf-1');

test('a message makes one unread notification for the person who got it, none for the sender', () => {
  const { store } = setup();
  const r = store.startDirect('stf-1', 'cli-1', 'Can we move the gate repair to Friday?');
  assert.ok(r.ok, JSON.stringify(r));
  const mine = messengerItems(store, client).filter((n) => n.convId === r.convId);
  assert.equal(mine.length, 1);
  assert.equal(mine[0].read, false);
  assert.equal(mine[0].cat, 'messages');
  assert.equal(mine[0].dest, 'messages');
  assert.match(mine[0].title, /^Jordan Lee sent (you a message|\d+ messages)$/, 'the chat may already hold earlier unread messages from the sample data');
  assert.match(mine[0].detail, /gate repair/);
  assert.ok(messengerItems(store, staff).filter((n) => n.convId === r.convId).every((n) => !/gate repair/.test(n.detail)), 'the sender is never told about their own message');
});

test('reading the chat reads the notification, and it stays in the list as read', () => {
  const { store } = setup();
  const { convId } = store.startDirect('stf-1', 'cli-1', 'First');
  const before = messengerItems(store, client).find((n) => n.convId === convId);
  assert.equal(before.read, false);
  store.markRead(convId, 'cli-1');
  const after = messengerItems(store, client).find((n) => n.convId === convId);
  assert.equal(after.read, true);
  assert.equal(after.id, before.id, 'the same message, the same id');
});

test('"mark as unread" on a message makes the chat unread again, and the badge follows', () => {
  const { store } = setup();
  const { convId } = store.startDirect('stf-1', 'cli-1', 'Please confirm');
  store.markRead(convId, 'cli-1');
  const readBadge = store.badgeCount('cli-1');
  assert.equal(messengerItems(store, client).find((n) => n.convId === convId).read, true);
  assert.ok(store.markUnread(convId, 'cli-1').ok);
  assert.equal(messengerItems(store, client).find((n) => n.convId === convId).read, false);
  assert.equal(store.badgeCount('cli-1'), readBadge + 1);
  assert.equal(store.markUnread(convId, 'stf-1').ok, true, 'the sender has nothing to un-read: nothing changes');
  assert.equal(store.markUnread('nope', 'cli-1').reason, 'not_found');
});

test('a new message in the same chat is unread again, with a new id and a count', () => {
  const { store, clock } = setup();
  const { convId } = store.startDirect('stf-1', 'cli-1', 'First');
  store.markRead(convId, 'cli-1');
  const first = messengerItems(store, client).find((n) => n.convId === convId);
  clock.t += 60000;
  store.send(convId, 'stf-1', 'Second');
  clock.t += 60000;
  store.send(convId, 'stf-1', 'Third');
  const now = messengerItems(store, client).find((n) => n.convId === convId);
  assert.notEqual(now.id, first.id);
  assert.equal(now.read, false);
  assert.match(now.title, /sent 2 messages/);
  assert.equal(now.detail, 'Third');
});

test('the badge of Messages and the unread notifications of Messenger always agree', () => {
  const { store } = setup();
  store.startDirect('stf-1', 'cli-1', 'One');
  store.startDirect('stf-2', 'cli-1', 'Two');
  for (const id of ['cli-1', 'stf-1', 'res-1', 'adm-1']) {
    const p = pickPersona(store ? ({ 'cli-1': 'client', 'stf-1': 'staff', 'res-1': 'resident', 'adm-1': 'admin' })[id] : 'client', id);
    const unread = messengerItems(store, p).reduce((n, x) => n + (x.read ? 0 : 1), 0);
    const convsWithNew = store.alertsFor(id).filter((a) => a.unread > 0).length;
    assert.equal(unread, convsWithNew);
    assert.equal(store.badgeCount(id) > 0, unread > 0, `${id}: badge and notifications say the same thing`);
  }
});

test('someone who does not exist gets nothing', () => {
  const { store } = setup();
  assert.deepEqual(store.alertsFor('nobody'), []);
  assert.deepEqual(messengerItems(store, null), []);
  assert.deepEqual(socialItems(mem(), 'client', client), [], 'a Client has no Social');
});

test('Social: a resident answering staff’s post becomes a notification for staff, and a resident only sees Social items they have not seen', () => {
  const NOW = Date.parse('2026-11-10T15:00:00');
  const s = mem();
  ensureFeed(s, NOW);
  // Alex Rivera answers a comment of Staff on p1
  const a = residentReply(s, 'res-1', 'p1', 'Thank you, that helped.', NOW);
  assert.ok(a.ok);
  const forStaff = socialItems(s, 'staff', staff, NOW + 60000);
  const hit = forStaff.find((n) => /Thank you, that helped/.test(n.detail) || /Alex Rivera/.test(n.title));
  assert.ok(hit, JSON.stringify(forStaff.map((n) => n.title)));
  assert.equal(hit.cat, 'community');
  assert.equal(hit.dest, 'social');
  assert.equal(hit.read, false);
  assert.ok(forStaff.length <= 8, 'a short list: the newest only');
  // a resident: items the Social page has seen are read
  const items = socialItems(s, 'resident', pickPersona('resident', 'res-2'), NOW + 60000);
  if (items.length) {
    const seen = { [items[0].id.replace(/^soc-/, '')]: true };
    const again = socialItems(s, 'resident', pickPersona('resident', 'res-2'), NOW + 60000, seen);
    assert.equal(again[0].read, true);
    assert.equal(again[1] ? again[1].read : false, false);
  }
});

test('Staff Settings > Social reach the bell: Pause Social, quiet hours and the Replies switch', () => {
  const NOW = Date.parse('2026-11-10T15:00:00'); // a Tuesday afternoon
  const s = mem();
  ensureFeed(s, NOW);
  assert.ok(residentReply(s, 'res-1', 'p1', 'Thank you, that helped.', NOW).ok);
  const at = NOW + 60000;
  const save = (o) => s.setItem('eso-social', JSON.stringify(o));
  const count = () => socialItems(s, 'staff', staff, at).length;
  const before = count();
  assert.ok(before > 0);
  save({ dnd: { until: at + 3600000 } });
  assert.equal(count(), 0, 'paused: nothing from Social');
  save({ dnd: { until: at - 1 } });
  assert.equal(count(), before, 'the pause is over');
  save({ dnd: { quiet: true, from: '14:00', to: '16:00', days: [2] } });
  assert.equal(count(), 0, 'inside the quiet hours of a chosen day');
  save({ dnd: { quiet: true, from: '14:00', to: '16:00', days: [1, 3] } });
  assert.equal(count(), before, 'a day that is not chosen');
  save({ dnd: { quiet: true, from: '22:00', to: '07:00', days: [1] } });
  assert.equal(count(), before, 'outside the window');
  save({ notif: { reply: false } });
  assert.ok(socialItems(s, 'staff', staff, at).every((n) => !/replied/.test(n.title)), 'Replies switched off');
  save({ notif: { reply: true } });
  assert.equal(count(), before);
});

test('Social news older than a week is not news', () => {
  const NOW = Date.parse('2026-11-10T15:00:00');
  const s = mem();
  ensureFeed(s, NOW);
  const later = NOW + 8 * 86400000;
  assert.deepEqual(socialItems(s, 'staff', staff, later), []);
});

test('live items sit among the sample ones by time; the sample list alone is unchanged', () => {
  const now = T0;
  const sample = buildAll(now, 'client');
  assert.equal(counts(sample, {}).unread, 109, 'without live items the bell says what it always said');
  const live = [{ id: 'msg-x-1', cat: 'messages', title: 'Jordan Lee sent you a message', detail: 'Hi', prop: null, dest: 'messages', read: false, ts: now - 1000, live: 'messenger' }];
  const all = buildAll(now, 'client', live);
  const sampleMessages = sample.filter((n) => n.cat === 'messages');
  assert.ok(sampleMessages.length > 0);
  assert.equal(all.length, sample.length - sampleMessages.length + 1, 'the real message replaces the sample ones: no message is told twice');
  assert.ok(all.every((n) => n.cat !== 'messages' || n.live), 'every Messages item is a real one');
  assert.equal(all[0].id, 'msg-x-1', 'the newest comes first');
  assert.ok(all.every((n, i) => i === 0 || all[i - 1].ts >= n.ts), 'newest first');
  assert.equal(counts(buildAll(now, 'client', []), {}).unread, 109 - sampleMessages.filter((n) => !n.read).length, 'with nothing live, only the sample Messages go');
  const staffAll = buildAll(now, 'staff', []);
  assert.ok(staffAll.every((n) => n.cat !== 'messages' && n.cat !== 'community'), 'Staff: Messages and Community are real too');
  assert.ok(buildAll(now, 'resident', []).every((n) => n.cat !== 'community'));
});

test('reading rules: your own mark wins, but reading the source reads the notification', () => {
  const s = mem();
  const unread = { id: 'msg-a-1', live: 'messenger', read: false };
  const read = { id: 'msg-a-1', live: 'messenger', read: true };
  assert.equal(isRead(unread, {}), false);
  assert.equal(isRead(read, {}), true);
  assert.equal(isRead(unread, { 'msg-a-1': true }), true, 'marked read here');
  assert.equal(isRead(unread, { 'msg-a-1': false }), false, 'marked unread here');
  assert.equal(isRead(read, { 'msg-a-1': false }), true, 'unread here, but the chat was read in Messenger: read');
  const sample = { id: 'n-x-0', read: true };
  assert.equal(isRead(sample, { 'n-x-0': false }), false, 'a sample item follows only the mark');
  setRead(s, 'cli-1', ['msg-a-1'], true);
  assert.equal(readMap(s, 'cli-1')['msg-a-1'], true);
});

test('liveItems puts Messenger and Social together for one person', () => {
  const { store } = setup();
  store.startDirect('cli-1', 'stf-1', 'Do you have the visitor list?');
  const s = mem();
  ensureFeed(s, Date.now());
  const items = liveItems({ role: 'staff', me: staff, store, storage: s, now: Date.now() });
  assert.ok(items.some((n) => n.live === 'messenger'));
  for (const n of items) assert.ok(n.id && n.title && typeof n.ts === 'number' && ['messages', 'community'].includes(n.cat));
});
