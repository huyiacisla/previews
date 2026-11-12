import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, TICKET_CATEGORIES } from '../src/messaging/store.js';
import { createMemoryBus } from '../src/messaging/transport.js';

const T0 = Date.UTC(2026, 10, 9, 15, 0, 0);
function setup() {
  const clock = { t: T0 };
  const bus = createMemoryBus();
  const store = createStore({ transport: bus.connect(), now: () => clock.t });
  return { clock, store };
}
const noOf = (store, who, id) => store.ticketBox(who).find((r) => r.id === id).no;

test('a new ticket gets a number of its own; each one after it gets the next', () => {
  const { store } = setup();
  const before = Math.max(...store.ticketBox('cli-1').map((r) => Number(r.no.slice(2))));
  const a = store.startSupport('cli-1', { subject: 'Invoice is missing', text: 'The March invoice is not in Billing.', category: 'Billing', priority: 'high' });
  const b = store.startSupport('cli-1', { subject: 'Cannot add a user', text: 'The Add user button does nothing.', category: 'Account & access' });
  assert.ok(a.ok && b.ok);
  const na = Number(noOf(store, 'cli-1', a.convId).slice(2));
  const nb = Number(noOf(store, 'cli-1', b.convId).slice(2));
  assert.ok(na > before, 'a number nobody had before');
  assert.equal(nb, na + 1, 'the next ticket gets the next number');
  assert.match(noOf(store, 'cli-1', a.convId), /^T-\d+$/);
  // the numbers are shared with tickets made elsewhere, so they never repeat
  const c = store.startSupport('stf-1', { subject: 'Plate import fails', text: 'It stops at row 200.' });
  assert.equal(Number(noOf(store, 'stf-1', c.convId).slice(2)), nb + 1);
});

test('the ticket is saved with its subject, priority, category and first message', () => {
  const { store } = setup();
  const r = store.startSupport('cli-1', { subject: 'Invoice is missing', text: 'The March invoice is not in Billing.', category: 'Billing', priority: 'high' });
  const rec = store.ticketRecord('cli-1', r.convId);
  assert.ok(rec.ok);
  assert.equal(rec.ticket.subject, 'Invoice is missing');
  assert.equal(rec.ticket.priority, 'high');
  assert.equal(rec.ticket.category, 'Billing');
  assert.equal(rec.ticket.stage, 'open');
  assert.equal(rec.ticket.isOpen, true);
  assert.equal(rec.ticket.requester.id, 'cli-1');
  assert.equal(rec.entries.filter((e) => e.author && e.text).length, 1);
  assert.equal(rec.entries.find((e) => e.author).text, 'The March invoice is not in Billing.');
});

test('only the person who opened it, and Admin, can see it', () => {
  const { store } = setup();
  const r = store.startSupport('cli-1', { subject: 'Invoice is missing', text: 'Please check.' });
  assert.ok(store.ticketBox('cli-1').some((t) => t.id === r.convId));
  assert.ok(store.ticketBox('adm-1').some((t) => t.id === r.convId), 'Admin sees every support ticket');
  assert.equal(store.ticketBox('cli-2').some((t) => t.id === r.convId), false, 'another client does not');
  assert.equal(store.ticketBox('stf-1').some((t) => t.id === r.convId), false, 'Staff do not');
  assert.equal(store.ticketRecord('cli-2', r.convId).ok, false);
});

test('the person and Admin can reply in the ticket, and a resolved ticket opens again', () => {
  const { store, clock } = setup();
  const r = store.startSupport('cli-1', { subject: 'Invoice is missing', text: 'Please check.' });
  clock.t += 60000;
  assert.ok(store.send(r.convId, 'adm-1', 'Looking at it now.').ok, 'Admin replies');
  clock.t += 60000;
  assert.ok(store.send(r.convId, 'cli-1', 'Thank you.').ok, 'the requester replies');
  const texts = store.ticketRecord('cli-1', r.convId).entries.filter((e) => e.author && e.text).map((e) => `${e.author.role}: ${e.text}`);
  assert.deepEqual(texts, ['client: Please check.', 'admin: Looking at it now.', 'client: Thank you.']);
  assert.equal(store.ticketRecord('cli-1', r.convId).ticket.messages, 3);
  assert.equal(store.send(r.convId, 'cli-2', 'Hello?').ok, false, 'someone else cannot write in it');
  // resolved by Admin, then the client writes again
  assert.ok(store.setSupportStatus(r.convId, 'adm-1', 'resolved').ok);
  assert.equal(store.ticketRecord('cli-1', r.convId).ticket.isOpen, false);
  clock.t += 60000;
  assert.ok(store.send(r.convId, 'cli-1', 'It happened again.').ok);
  assert.equal(store.ticketRecord('cli-1', r.convId).ticket.isOpen, true, 'a new reply reopens it');
});

test('what is typed is checked: subject, message, length, priority, category, who may open one', () => {
  const { store } = setup();
  assert.equal(store.startSupport('cli-1', { subject: '   ', text: 'x' }).reason, 'subject_required');
  assert.equal(store.startSupport('cli-1', { subject: 'ok', text: '  ' }).ok, false);
  assert.equal(store.startSupport('cli-1', { subject: 'x'.repeat(121), text: 'x' }).reason, 'subject_too_long');
  assert.equal(store.startSupport('cli-1', { subject: 'ok', text: 'x'.repeat(5000) }).reason, 'too_long');
  assert.equal(store.startSupport('res-1', { subject: 'ok', text: 'x' }).ok, false, 'residents go through the assistant');
  assert.equal(store.startSupport('adm-1', { subject: 'ok', text: 'x' }).ok, false, 'Admin answers tickets, not opens them');
  const odd = store.startSupport('cli-1', { subject: 'ok', text: 'x', priority: 'urgent!!', category: '<b>x</b>' });
  const t = store.ticketRecord('cli-1', odd.convId).ticket;
  assert.equal(t.priority, 'normal', 'an unknown priority becomes normal');
  assert.equal(t.category, '', 'an unknown category is dropped');
  assert.ok(TICKET_CATEGORIES.includes('Billing'));
});

test('a new ticket reaches Admin as an open support request and counts as open for its owner', () => {
  const { store } = setup();
  const open0 = store.ticketCounts('cli-1').open;
  const r = store.startSupport('cli-1', { subject: 'Invoice is missing', text: 'Please check.' });
  assert.equal(store.ticketCounts('cli-1').open, open0 + 1);
  const row = store.listFor('adm-1').find((x) => x.id === r.convId);
  assert.ok(row, 'it shows in the Admin support queue');
  assert.ok(row.tags.includes('queue'));
});
