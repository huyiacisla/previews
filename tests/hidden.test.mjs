// Hide a conversation, restore it, and the Hidden tab's contents (conversations and messages "deleted for me").
// Pure core only (no DOM). Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/features/messaging/store.js';
import { createMemoryBus } from '../src/features/messaging/transport.js';

const T0 = Date.UTC(2026, 10, 9, 15, 0, 0);
function setup() {
  const clock = { t: T0 };
  const bus = createMemoryBus();
  const store = createStore({ transport: bus.connect(), now: () => clock.t });
  return { store, clock };
}
const direct = (store, user) => store.listFor(user).find((r) => r.kind === 'direct');

test('hide: leaves every list and the badge, is personal, and nothing is deleted', () => {
  const { store } = setup();
  const row = direct(store, 'cli-1');
  assert.ok(row, 'the Client has a conversation with Staff');
  const unreadBefore = store.badgeCount('cli-1');
  assert.equal(store.hideConversation(row.id, 'cli-1').ok, true);

  const after = store.listFor('cli-1').find((r) => r.id === row.id);
  assert.equal(after.hidden, true);
  assert.deepEqual(after.tags, ['hidden'], 'a hidden row only belongs to the Hidden tab');
  assert.ok(store.badgeCount('cli-1') <= unreadBefore);
  assert.equal(store.search('cli-1', 'rate').some((h) => h.convId === row.id), false, 'search skips hidden chats');
  assert.equal(store.listFor('stf-1').find((r) => r.id === row.id).hidden, false, 'the other person still sees it');
  assert.ok(store.get(row.id, 'cli-1').ok, 'the conversation itself is untouched');
  assert.deepEqual(store.hiddenItems('cli-1').conversations.map((r) => r.id), [row.id]);
});

test('restore puts it back; hiding twice or restoring what is not hidden changes nothing', () => {
  const { store } = setup();
  const row = direct(store, 'cli-1');
  store.hideConversation(row.id, 'cli-1');
  assert.equal(store.unhideConversation(row.id, 'cli-1').ok, true);
  assert.equal(store.listFor('cli-1').find((r) => r.id === row.id).hidden, false);
  assert.equal(store.hiddenItems('cli-1').conversations.length, 0);
  assert.equal(store.unhideConversation(row.id, 'cli-1').noop, true);
  assert.equal(store.hideConversation('nope', 'cli-1').reason, 'not_found');
  assert.equal(store.hideConversation(row.id, 'res-1').reason, 'not_found', 'cannot hide what you cannot see');
});

test('a hidden conversation comes back by itself when something new happens in it', () => {
  const { store, clock } = setup();
  const row = direct(store, 'cli-1');
  store.hideConversation(row.id, 'cli-1');
  clock.t += 60_000;
  assert.equal(store.send(row.id, row.id && 'stf-1', 'Following up on the rate card.').ok, true);
  const back = store.listFor('cli-1').find((r) => r.id === row.id);
  assert.equal(back.hidden, false);
  assert.ok(back.unread >= 1, 'and it counts as unread again');
});

test('an open emergency cannot be hidden, and a hidden chat surfaces when one is raised', () => {
  const { store, clock } = setup();
  const { convId } = store.ensureSession('res-1');
  store.send(convId, 'res-1', 'Water is coming through the ceiling!', { emergency: true });
  assert.equal(store.hideConversation(convId, 'stf-1').reason, 'emergency_open');
  store.acknowledgeEmergency(convId, 'stf-1');
  clock.t += 1000;
  assert.equal(store.hideConversation(convId, 'stf-1').ok, true, 'once acknowledged it can be hidden');
});

test('messages deleted for me are listed with their conversation and can be restored', () => {
  const { store } = setup();
  const row = direct(store, 'cli-1');
  const m = store.get(row.id, 'cli-1').messages.find((x) => x.kind !== 'system' && !x.deleted && x.text);
  assert.ok(m, 'there is a message to put away');
  assert.equal(store.hideMessage(row.id, 'cli-1', m.id).ok, true);
  const items = store.hiddenItems('cli-1');
  assert.deepEqual(items.messages.map((x) => [x.id, x.convId]), [[m.id, row.id]]);
  assert.equal(items.messages[0].convTitle, row.title);
  assert.equal(store.get(row.id, 'cli-1').messages.some((x) => x.id === m.id), false);
  assert.equal(store.unhideMessage(row.id, 'cli-1', m.id).ok, true);
  assert.equal(store.hiddenItems('cli-1').messages.length, 0);
  assert.equal(store.get(row.id, 'cli-1').messages.some((x) => x.id === m.id), true, 'back in the conversation');
});

test('hiding is stored per person: two people hide the same chat independently', () => {
  const { store } = setup();
  const row = direct(store, 'cli-1');
  store.hideConversation(row.id, 'stf-1');
  assert.equal(store.listFor('stf-1').find((r) => r.id === row.id).hidden, true);
  assert.equal(store.listFor('cli-1').find((r) => r.id === row.id).hidden, false);
});
