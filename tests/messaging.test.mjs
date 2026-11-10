// Run with: npm test   (node --test, no dependencies)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, canMessage, CAN_MESSAGE } from '../src/messaging/store.js';
import { createMemoryBus } from '../src/messaging/transport.js';
import { groupByDay, listTime, dayLabel, duration } from '../src/messaging/format.js';

const T0 = Date.UTC(2026, 10, 9, 15, 0, 0);

function setup(opts = {}) {
  const clock = { t: T0 };
  const bus = createMemoryBus();
  const mk = (config = {}) => createStore({ transport: bus.connect(), now: () => clock.t, config: { ...opts, ...config } });
  return { clock, bus, mk, store: mk() };
}
const tick = () => new Promise((r) => setTimeout(r, 5));
const ids = (rows) => rows.map((r) => r.id);

/* ------------------------------------------------------------- permissions */

test('who can message whom (every role pair)', () => {
  const expected = {
    resident: ['staff'],
    staff: ['resident', 'client', 'admin'],
    client: ['staff', 'admin'],
    admin: ['staff', 'admin', 'resident', 'client'],
  };
  assert.deepEqual(CAN_MESSAGE, expected);
  for (const from of Object.keys(expected)) {
    for (const to of ['resident', 'staff', 'client', 'admin']) {
      assert.equal(canMessage(from, to), expected[from].includes(to), `${from} -> ${to}`);
    }
  }
});

test('residents cannot start a chat with anyone: they go through the assistant', () => {
  const { store } = setup();
  assert.equal(store.startDirect('res-1', 'stf-1', 'hi').reason, 'use_assistant');
  assert.equal(store.startDirect('res-1', 'adm-1', 'hi').reason, 'use_assistant');
  assert.deepEqual(store.recipients('res-1'), []);
});

test('client cannot message a resident; staff cannot message staff', () => {
  const { store } = setup();
  assert.equal(store.startDirect('cli-1', 'res-1', 'hi').reason, 'not_allowed');
  assert.equal(store.startDirect('stf-1', 'stf-2', 'hi').reason, 'not_allowed');
});

test('recipients follow the matrix; staff and client reach Admin as Support', () => {
  const { store } = setup();
  const kinds = (id) => store.recipients(id).map((r) => (r.type === 'support' ? 'support' : store.user(r.userId).role));
  assert.deepEqual([...new Set(kinds('stf-1'))].sort(), ['client', 'resident', 'support']);
  assert.deepEqual([...new Set(kinds('cli-1'))].sort(), ['staff', 'support']);
  assert.deepEqual([...new Set(kinds('adm-1'))].sort(), ['admin', 'client', 'resident', 'staff']);
});

/* --------------------------------------------------- resident: assistant first */

test('opening Messages starts the assistant; staff are not involved or notified', () => {
  const { store } = setup();
  const staffBefore = ids(store.listFor('stf-1'));
  const badgeBefore = store.badgeCount('stf-1');
  const r = store.ensureSession('res-1');
  assert.ok(r.ok && r.created);
  const t = store.get(r.convId, 'res-1');
  assert.equal(t.conv.status, 'bot');
  assert.equal(t.messages[0].from, 'bot');
  assert.ok(t.messages.some((m) => m.choices), 'greeting offers quick replies');
  assert.deepEqual(ids(store.listFor('stf-1')), staffBefore, 'staff list unchanged');
  assert.equal(store.badgeCount('stf-1'), badgeBefore, 'staff badge unchanged');
  assert.equal(store.get(r.convId, 'stf-1').reason, 'not_found');
  const again = store.ensureSession('res-1');
  assert.equal(again.convId, r.convId);
  assert.equal(again.created, false);
});

test('staff are never notified by the assistant part of a chat; residents are', () => {
  const { store } = setup();
  const queued = store.listFor('stf-1').find((r) => r.tags.includes('queue'));
  assert.equal(store.unreadCount(queued.id, 'stf-1'), 1, 'only what the resident typed for staff');
  const mine = store.listFor('stf-1').find((r) => r.status === 'active');
  assert.equal(store.unreadCount(mine.id, 'stf-1'), 1, 'the resident message, not the assistant greeting');
  const { convId } = store.ensureSession('res-1');
  store.choose(convId, 'res-1', 'topic:permit');
  assert.ok(store.unreadCount(convId, 'res-1') >= 2, 'assistant replies count for the resident');
});

test('the assistant can resolve a question without ever reaching staff', () => {
  const { store } = setup();
  const { convId } = store.ensureSession('res-1');
  const staffBefore = ids(store.listFor('stf-1'));
  assert.ok(store.choose(convId, 'res-1', 'topic:guest').ok);
  assert.ok(store.choose(convId, 'res-1', 'faq:guest:request').ok);
  assert.ok(store.choose(convId, 'res-1', 'helped:yes').ok);
  const t = store.get(convId, 'res-1');
  assert.equal(t.conv.status, 'closed');
  assert.equal(t.conv.closedBy, 'bot');
  assert.deepEqual(ids(store.listFor('stf-1')), staffBefore);
  assert.equal(t.canPost.reason, 'closed');
  assert.equal(store.ensureSession('res-1').created, true, 'next visit starts a fresh assistant chat');
});

test('stale or invented quick replies are rejected', () => {
  const { store } = setup();
  const { convId } = store.ensureSession('res-1');
  assert.equal(store.choose(convId, 'res-1', 'nope').reason, 'invalid_choice');
  store.choose(convId, 'res-1', 'topic:permit');
  assert.equal(store.choose(convId, 'res-1', 'topic:guest').reason, 'invalid_choice', 'the topic menu is no longer offered');
});

test('free text is answered from the FAQ; two misses offer a person', () => {
  const { store } = setup();
  const { convId } = store.ensureSession('res-1');
  store.send(convId, 'res-1', 'how do I request a guest pass for my friend');
  let msgs = store.get(convId, 'res-1').messages;
  assert.match(msgs.at(-2).text, /Guest passes are requested/);
  const second = setup().store;
  const c2 = second.ensureSession('res-1').convId;
  second.send(c2, 'res-1', 'zzz qqq');
  second.send(c2, 'res-1', 'xxx yyy');
  msgs = second.get(c2, 'res-1').messages;
  assert.ok(msgs.at(-1).choices.some((c) => c.id === 'staff:request'));
});

test('a person is requested: chat moves to the queue with a summary for staff', () => {
  const { store } = setup();
  const { convId } = store.ensureSession('res-1');
  store.choose(convId, 'res-1', 'topic:report');
  store.choose(convId, 'res-1', 'faq:report:violation');
  store.send(convId, 'res-1', 'Blue pickup in the fire lane, plate 4ABC999.');
  assert.ok(store.choose(convId, 'res-1', 'staff:request').ok);
  assert.equal(store.get(convId, 'res-1').conv.status, 'queued');
  const view = store.get(convId, 'stf-1');
  assert.ok(view.ok, 'staff can see it now');
  assert.equal(view.conv.status, 'queued');
  assert.equal(view.conv.summary.topic, 'Report a vehicle');
  assert.ok(view.conv.summary.details.some((d) => d.includes('4ABC999')));
  assert.deepEqual(view.actions, ['claim']);
  assert.equal(view.canPost.reason, 'not_claimed', 'staff cannot chat before taking it');
  assert.ok(store.listFor('stf-1').find((r) => r.id === convId).tags.includes('queue'));
});

test('only one staff member can take a queued chat', async () => {
  const { mk } = setup();
  const a = mk();
  const b = mk();
  const convId = a.listFor('stf-1').find((r) => r.tags.includes('queue')).id;
  const ra = a.claim(convId, 'stf-1');
  const rb = b.claim(convId, 'stf-2');
  assert.equal([ra, rb].filter((r) => r.ok).length, 1);
  assert.equal(rb.reason, 'already_taken');
  await tick();
  assert.equal(b.get(convId, 'stf-1').conv.assigneeId, 'stf-1');
  assert.equal(b.get(convId, 'stf-2').reason, 'not_found', 'the loser no longer sees it');
});

test('full resident flow: queue -> take -> chat -> resolve -> rate -> new assistant chat', () => {
  const { store, clock } = setup();
  const queued = store.listFor('stf-1').find((r) => r.tags.includes('queue'));
  assert.equal(store.get(queued.id, 'res-2').conv.status, 'queued');
  assert.ok(store.claim(queued.id, 'stf-1').ok);
  clock.t += 1000;
  assert.ok(store.send(queued.id, 'stf-1', 'Hi Priya, I can replace the hangtag at the office today.').ok);
  assert.equal(store.unreadCount(queued.id, 'res-2'), 2, 'joined note + staff message');
  assert.equal(store.get(queued.id, 'stf-2').reason, 'not_found', 'other staff do not see a taken chat');
  assert.equal(store.send(queued.id, 'stf-2', 'hello').ok, false);
  assert.ok(store.send(queued.id, 'res-2', 'Great, thank you.').ok);
  store.markRead(queued.id, 'res-2');
  assert.equal(store.get(queued.id, 'stf-1').messages.find((m) => m.text.startsWith('Hi Priya')).delivery, 'read');
  assert.ok(store.resolve(queued.id, 'stf-1').ok);
  const closed = store.get(queued.id, 'res-2');
  assert.equal(closed.conv.status, 'closed');
  assert.equal(closed.canPost.reason, 'closed');
  assert.ok(closed.actions.includes('rate'));
  assert.ok(store.rate(queued.id, 'res-2', true).ok);
  assert.equal(store.rate(queued.id, 'res-2', false).ok, false, 'one rating only');
  const next = store.ensureSession('res-2');
  assert.ok(next.created);
  assert.equal(store.get(next.convId, 'res-2').conv.status, 'bot');
});

test('a resident can end their own chat, including from the queue', () => {
  const { store } = setup();
  const q = store.listFor('stf-1').find((r) => r.tags.includes('queue'));
  assert.ok(store.endChat(q.id, 'res-2').ok);
  assert.equal(store.get(q.id, 'res-2').conv.status, 'closed');
  assert.ok(!ids(store.listFor('stf-1')).includes(q.id), 'gone from the staff queue');
  assert.equal(store.endChat(q.id, 'res-2').ok, false);
  assert.equal(store.endChat(q.id, 'res-1').ok, false, 'not their chat');
});

test('idle chats close on their own', () => {
  const { store, clock } = setup({ botIdleMs: 1000, activeIdleMs: 60 * 60 * 1000 });
  const { convId } = store.ensureSession('res-1');
  const active = store.listFor('stf-1').find((r) => r.status === 'active'); // seeded, 12 min old
  clock.t += 1500;
  assert.equal(store.tick().closed, 1, 'only the idle assistant chat closes');
  assert.equal(store.get(convId, 'res-1').conv.status, 'closed');
  assert.equal(store.get(active.id, 'stf-1').conv.status, 'active');
  clock.t += 61 * 60 * 1000;
  assert.equal(store.tick().closed, 1);
  assert.equal(store.get(active.id, 'stf-1').conv.status, 'closed');
  assert.match(store.get(active.id, 'res-3').messages.at(-1).text, /inactivity/);
});

/* ------------------------------------------------------- direct and outreach */

test('staff and client talk normally', () => {
  const { store } = setup();
  const r = store.startDirect('stf-2', 'cli-2', 'Hello Marcus, the lot audit is done.');
  assert.ok(r.ok);
  assert.ok(store.send(r.convId, 'cli-2', 'Thanks.').ok);
  assert.ok(store.send(r.convId, 'stf-2', 'Anytime.').ok);
  assert.equal(store.startDirect('stf-2', 'cli-2', 'again').convId, r.convId, 'same thread is reused');
});

test('outreach to a resident is one-way until they answer, and capped', () => {
  const { store } = setup();
  const r = store.startDirect('stf-1', 'res-1', 'Your guest pass for Saturday is approved.');
  assert.ok(r.ok);
  assert.equal(store.send(r.convId, 'stf-1', 'Also, one more thing').reason, 'awaiting_reply');
  assert.ok(store.send(r.convId, 'res-1', 'Thanks!').ok, 'resident may reply to staff');
  assert.ok(store.send(r.convId, 'stf-1', 'You are welcome.').ok, 'after a reply the thread is normal');
  const a = store.startDirect('stf-2', 'res-2', 'Reminder about permits.');
  const b = store.startDirect('adm-1', 'res-2', 'Account notice.');
  const c = store.startDirect('stf-1', 'res-2', 'Another message.');
  assert.ok(a.ok && b.ok);
  assert.equal(c.reason, 'rate_limited');
  assert.ok(c.retryAt > T0);
});

test('a note from Admin to a resident is one-way; replies are not allowed', () => {
  const { store } = setup();
  const r = store.startDirect('adm-2', 'res-1', 'Your account was updated.');
  assert.ok(r.ok);
  assert.equal(store.send(r.convId, 'res-1', 'Why?').reason, 'one_way');
});

test('do-not-disturb silences outreach and announcements but not an active chat', () => {
  const { store } = setup();
  store.startDirect('stf-1', 'res-1', 'Hello');
  const before = store.badgeCount('res-1');
  assert.ok(before >= 2, 'announcement + outreach');
  store.setPref('res-1', { dnd: true });
  assert.equal(store.badgeCount('res-1'), 0);
  const chat = setup().store;
  const live = chat.listFor('stf-1').find((r) => r.status === 'active');
  chat.send(live.id, 'stf-1', 'Any update on the grey SUV?');
  chat.setPref('res-3', { dnd: true });
  assert.equal(chat.badgeCount('res-3'), 1, 'a live chat with staff still counts');
});

/* ------------------------------------------------------------------ support */

test('support thread: open -> pending -> open -> resolved -> reopened', () => {
  const { store } = setup();
  const r = store.startSupport('cli-1', { subject: 'Invoice question', text: 'Where do I download March invoices?' });
  assert.ok(r.ok);
  const row = store.listFor('adm-1').find((x) => x.id === r.convId);
  assert.ok(row.tags.includes('queue'));
  assert.ok(store.send(r.convId, 'adm-1', 'Billing > Invoices, filter by month.').ok);
  let c = store.get(r.convId, 'adm-1').conv;
  assert.equal(c.status, 'pending');
  assert.equal(c.assigneeId, 'adm-1');
  store.send(r.convId, 'cli-1', 'Found it, thanks.');
  assert.equal(store.get(r.convId, 'adm-1').conv.status, 'open');
  assert.ok(store.setSupportStatus(r.convId, 'adm-2', 'resolved').ok);
  assert.equal(store.get(r.convId, 'cli-1').conv.status, 'resolved');
  store.send(r.convId, 'cli-1', 'One more question.');
  assert.equal(store.get(r.convId, 'cli-1').conv.status, 'open');
  assert.equal(store.setSupportStatus(r.convId, 'cli-1', 'resolved').ok, false, 'requester cannot resolve');
});

test('staff messaging Admin becomes a support thread; other clients cannot see it', () => {
  const { store } = setup();
  const r = store.startDirect('stf-1', 'adm-1', 'The plate import is failing.');
  assert.ok(r.ok);
  assert.equal(store.get(r.convId, 'stf-1').conv.kind, 'support');
  assert.equal(store.get(r.convId, 'cli-1').reason, 'not_found');
  assert.equal(store.startSupport('res-1', { subject: 's', text: 't' }).ok, false);
  assert.equal(store.startSupport('cli-1', { subject: '  ', text: 't' }).reason, 'subject_required');
});

test('admin assigns and prioritises', () => {
  const { store } = setup();
  const q = store.listFor('adm-1').find((r) => r.tags.includes('queue'));
  assert.ok(store.assignSupport(q.id, 'adm-1', 'adm-2').ok);
  assert.ok(store.setPriority(q.id, 'adm-1', 'high').ok);
  assert.equal(store.setPriority(q.id, 'stf-1', 'low').ok, false);
  const row = store.listFor('adm-2').find((r) => r.id === q.id);
  assert.ok(row.tags.includes('mine'));
  assert.equal(row.priority, 'high');
});

/* ---------------------------------------------------------------- broadcast */

test('announcements: only Admin sends; audience is respected; nobody replies in the thread', () => {
  const { store } = setup();
  assert.equal(store.broadcast('stf-1', { title: 't', text: 'x' }).reason, 'not_allowed');
  const r = store.broadcast('adm-1', { title: 'Gate maintenance', text: 'Gate 2 is closed Tuesday.', audience: ['staff', 'client'] });
  assert.ok(r.ok);
  assert.ok(store.get(r.convId, 'stf-2').ok);
  assert.ok(store.get(r.convId, 'cli-2').ok);
  assert.equal(store.get(r.convId, 'res-1').reason, 'not_found');
  assert.equal(store.send(r.convId, 'stf-2', 'ok').reason, 'read_only');
  assert.equal(store.broadcast('adm-1', { title: 't', text: 'x', audience: [] }).reason, 'audience_required');
  const all = store.broadcast('adm-1', { title: 'Everyone', text: 'Hello all', audience: 'everyone' });
  for (const id of ['res-1', 'stf-1', 'cli-1', 'adm-2']) assert.ok(store.get(all.convId, id).ok, id);
});

/* -------------------------------------------------------------- reads / misc */

test('delivery state: sent until the other person reads', () => {
  const { store } = setup();
  const r = store.startDirect('stf-1', 'cli-2', 'Quick question about the audit.');
  let m = store.get(r.convId, 'stf-1').messages.at(-1);
  assert.equal(m.delivery, 'sent');
  assert.equal(store.unreadCount(r.convId, 'cli-2'), 1);
  store.markRead(r.convId, 'cli-2');
  assert.equal(store.unreadCount(r.convId, 'cli-2'), 0);
  m = store.get(r.convId, 'stf-1').messages.at(-1);
  assert.equal(m.delivery, 'read');
  assert.equal(store.get(r.convId, 'cli-2').messages.at(-1).delivery, null, 'receivers do not see receipts');
});

test('validation: empty, too long, and safe retries', () => {
  const { store } = setup({ maxLen: 20 });
  const r = store.startDirect('stf-1', 'cli-2', 'hello');
  assert.equal(store.send(r.convId, 'stf-1', '   ').reason, 'empty');
  assert.equal(store.send(r.convId, 'stf-1', 'x'.repeat(21)).reason, 'too_long');
  const a = store.send(r.convId, 'stf-1', 'retry me', { clientId: 'k1' });
  const b = store.send(r.convId, 'stf-1', 'retry me', { clientId: 'k1' });
  assert.equal(a.messageId, b.messageId);
  assert.equal(b.duplicate, true);
  assert.equal(store.get(r.convId, 'stf-1').messages.filter((m) => m.text === 'retry me').length, 1);
  assert.equal(store.send('nope', 'stf-1', 'x').reason, 'not_found');
});

test('a message from a tab shows up in the other tab (live sync)', async () => {
  const { mk } = setup();
  const a = mk();
  const b = mk();
  let heard = 0;
  b.subscribe((src) => { if (src === 'remote') heard++; });
  const r = a.startDirect('stf-1', 'cli-2', 'Ping from tab A');
  await tick();
  assert.ok(heard >= 1);
  assert.equal(b.get(r.convId, 'cli-2').messages.at(-1).text, 'Ping from tab A');
  assert.equal(b.unreadCount(r.convId, 'cli-2'), 1);
});

test('two tabs writing at once never lose a message', () => {
  const { mk } = setup();
  const a = mk();
  const b = mk();
  const r = a.startDirect('stf-1', 'cli-2', 'start');
  for (let i = 0; i < 20; i++) {
    (i % 2 ? a : b).send(r.convId, i % 2 ? 'stf-1' : 'cli-2', `msg ${i}`);
  }
  assert.equal(a.get(r.convId, 'stf-1').messages.filter((m) => m.kind === 'text').length, 21);
});

test('reset restores the demo data, or empties it', () => {
  const { store } = setup();
  store.startDirect('stf-1', 'cli-2', 'x');
  store.reset({ empty: true });
  assert.equal(store.listFor('stf-1').length, 0);
  store.reset();
  assert.ok(store.listFor('stf-1').length > 0);
});

/* ------------------------------------------------- attachments, reactions, replies */

const PHOTO = 'data:image/png;base64,iVBORw0KGgo=';

test('attachments: photo-only message is fine; limits and bad data are rejected', () => {
  const { store } = setup({ maxAttachments: 2, maxAttachmentBytes: 1000 });
  const r = store.startDirect('stf-1', 'cli-2', 'hello');
  const ok = store.send(r.convId, 'stf-1', '', { attachments: [{ kind: 'image', name: 'plate.png', size: 500, data: PHOTO }] });
  assert.ok(ok.ok);
  const msg = store.get(r.convId, 'cli-2').messages.at(-1);
  assert.equal(msg.attachments[0].name, 'plate.png');
  assert.equal(store.listFor('cli-2').find((x) => x.id === r.convId).last.text, 'Photo');
  assert.equal(store.send(r.convId, 'stf-1', '').reason, 'empty');
  const three = [1, 2, 3].map((i) => ({ kind: 'image', name: `p${i}`, size: 10, data: PHOTO }));
  assert.equal(store.send(r.convId, 'stf-1', 'x', { attachments: three }).reason, 'too_many_attachments');
  assert.equal(store.send(r.convId, 'stf-1', 'x', { attachments: [{ kind: 'image', name: 'big', size: 5000, data: PHOTO }] }).reason, 'attachment_too_large');
  assert.equal(store.send(r.convId, 'stf-1', 'x', { attachments: [{ kind: 'image', name: 'x', size: 10, data: 'http://evil.example/x.png' }] }).reason, 'bad_attachment');
  assert.equal(store.send(r.convId, 'stf-1', 'x', { attachments: [{ kind: 'image', name: 'x', size: 10, data: 'data:text/html;base64,AAAA' }] }).reason, 'bad_attachment');
});

test('reactions: one per person, replace or toggle off, only real emoji', () => {
  const { store } = setup();
  const r = store.startDirect('stf-1', 'cli-2', 'Report is ready');
  const id = store.get(r.convId, 'stf-1').messages.at(-1).id;
  assert.ok(store.react(r.convId, 'cli-2', id, '👍').reacted);
  assert.ok(store.react(r.convId, 'stf-1', id, '❤️').reacted);
  assert.deepEqual(store.get(r.convId, 'cli-2').messages.at(-1).reactions, { '👍': ['cli-2'], '❤️': ['stf-1'] });
  store.react(r.convId, 'cli-2', id, '😂');
  assert.deepEqual(Object.keys(store.get(r.convId, 'cli-2').messages.at(-1).reactions).sort(), ['❤️', '😂'].sort());
  assert.equal(store.react(r.convId, 'cli-2', id, '😂').reacted, false);
  assert.equal(store.react(r.convId, 'cli-2', id, 'hello').reason, 'invalid_emoji');
  assert.equal(store.react(r.convId, 'cli-2', id, '<img>').reason, 'invalid_emoji');
  assert.equal(store.react(r.convId, 'res-1', id, '👍').reason, 'not_found', 'cannot react outside the conversation');
});

test('replies quote a message of the same conversation only', () => {
  const { store } = setup();
  const a = store.startDirect('stf-1', 'cli-2', 'first');
  const b = store.startDirect('stf-1', 'cli-1', 'other');
  const first = store.get(a.convId, 'stf-1').messages.at(-1).id;
  assert.ok(store.send(a.convId, 'cli-2', 'answer', { replyTo: first }).ok);
  assert.equal(store.get(a.convId, 'stf-1').messages.at(-1).replyPreview.text, 'first');
  assert.equal(store.send(b.convId, 'stf-1', 'x', { replyTo: first }).reason, 'invalid_reply');
});

test('unsend: own message, within the window, leaves a removed note', () => {
  const { store, clock } = setup({ unsendMs: 60000 });
  const r = store.startDirect('stf-1', 'cli-2', 'oops wrong chat');
  const id = store.get(r.convId, 'stf-1').messages.at(-1).id;
  assert.equal(store.unsend(r.convId, 'cli-2', id).reason, 'not_allowed', 'not your message');
  assert.ok(store.unsend(r.convId, 'stf-1', id).ok);
  const m = store.get(r.convId, 'cli-2').messages.at(-1);
  assert.equal(m.deleted, true);
  assert.equal(m.text, '');
  assert.equal(store.listFor('cli-2').find((x) => x.id === r.convId).last.text, 'Message removed');
  const s = store.send(r.convId, 'stf-1', 'late');
  clock.t += 61000;
  assert.equal(store.unsend(r.convId, 'stf-1', store.get(r.convId, 'stf-1').messages.at(-1).id).reason, 'too_late');
  assert.ok(s.ok);
});

test('edit: own text only, within the window, marks Edited and updates the list preview', () => {
  const { store, clock } = setup({ editMs: 60000 });
  const r = store.startDirect('stf-1', 'cli-2', 'Meet at 9');
  const id = store.get(r.convId, 'stf-1').messages.at(-1).id;
  assert.equal(store.edit(r.convId, 'cli-2', id, 'hack').reason, 'not_allowed', 'not your message');
  assert.equal(store.edit(r.convId, 'stf-1', id, '   ').reason, 'empty');
  assert.ok(store.edit(r.convId, 'stf-1', id, 'Meet at 10'));
  const m = store.get(r.convId, 'cli-2').messages.at(-1);
  assert.equal(m.text, 'Meet at 10');
  assert.ok(m.editedAt, 'edited flag is visible to the other side');
  assert.equal(store.listFor('cli-2').find((x) => x.id === r.convId).last.text, 'Meet at 10');
  assert.equal(store.edit(r.convId, 'stf-1', id, 'Meet at 10').noop, true, 'same text changes nothing');
  clock.t += 61000;
  assert.equal(store.edit(r.convId, 'stf-1', id, 'too late').reason, 'too_late');
  store.unsend(r.convId, 'stf-1', id);
  assert.equal(store.edit(r.convId, 'stf-1', id, 'x').reason, 'not_allowed', 'removed messages cannot be edited');
});

test('pin and mute are personal; muted chats leave the badge, pinned float to the top', () => {
  const { store } = setup();
  const a = store.startDirect('stf-1', 'cli-1', 'first');
  const b = store.startDirect('stf-1', 'cli-2', 'second');
  const before = store.listFor('cli-1').map((r) => r.id);
  assert.equal(store.toggleFlag(a.convId, 'cli-2', 'pinned').reason, 'not_found', 'cannot flag what you cannot see');
  assert.equal(store.toggleFlag(a.convId, 'cli-1', 'bogus').reason, 'invalid_flag');
  assert.ok(store.toggleFlag(a.convId, 'stf-1', 'pinned').on);
  assert.equal(store.listFor('stf-1')[0].id, a.convId, 'pinned first even though b is newer');
  assert.deepEqual(store.listFor('cli-1').map((r) => r.id), before, 'the other person is unaffected');
  const unread = store.badgeCount('cli-1');
  assert.ok(store.toggleFlag(a.convId, 'cli-1', 'muted').on);
  assert.equal(store.badgeCount('cli-1'), unread - store.unreadCount(a.convId, 'cli-1'));
  assert.equal(store.listFor('cli-1').find((r) => r.id === a.convId).muted, true);
  assert.equal(store.toggleFlag(a.convId, 'cli-1', 'muted').on, false, 'second call turns it off');
  assert.equal(store.badgeCount('cli-1'), unread);
  assert.ok(b.ok);
});

test('search: only what you can see, skips removed and system text, newest first', () => {
  const { store, clock } = setup();
  const r = store.startDirect('stf-1', 'cli-1', 'Invoice 4471 is ready');
  clock.t += 1000;
  store.send(r.convId, 'cli-1', 'Thanks for the INVOICE');
  const gone = store.send(r.convId, 'cli-1', 'invoice secret').messageId;
  store.unsend(r.convId, 'cli-1', gone);
  assert.deepEqual(store.search('stf-1', 'inv'.slice(0, 1)), [], 'one character is too short');
  const hits = store.search('stf-1', 'invoice');
  assert.equal(hits.length, 2);
  assert.ok(hits[0].at >= hits[1].at);
  assert.ok(hits.every((h) => h.convId === r.convId && !/secret/.test(h.snippet)));
  assert.equal(store.search('cli-2', 'invoice').length, 0, 'other clients never see it');
  assert.equal(store.search('res-1', 'invoice').length, 0, 'residents never see it');
});

/* ------------------------------------------------------------------- groups */

test('group of three: created by Staff, everyone sees it, joins and leaves are recorded', () => {
  const { store } = setup();
  const r = store.createGroup('stf-2', { name: 'Lot audit', memberIds: ['cli-1', 'cli-2'], text: 'Kick-off notes inside.' });
  assert.ok(r.ok);
  for (const id of ['stf-2', 'cli-1', 'cli-2']) assert.ok(store.get(r.convId, id).ok, id);
  for (const id of ['stf-1', 'res-1', 'adm-1']) assert.equal(store.get(r.convId, id).reason, 'not_found', id);
  const t = store.get(r.convId, 'stf-2');
  assert.equal(t.row.members.length, 3);
  assert.match(t.messages[0].text, /created the group with Dana Whitfield, Marcus Cole/);
  assert.ok(store.send(r.convId, 'cli-1', 'Thanks all.').ok);
  assert.ok(store.send(r.convId, 'cli-2', 'On it.').ok);
  assert.ok(store.addMember(r.convId, 'stf-2', 'adm-1').ok);
  assert.equal(store.addMember(r.convId, 'cli-1', 'adm-2').reason, 'not_allowed', 'clients cannot add people');
  assert.equal(store.get(r.convId, 'adm-1').row.members.length, 4);
  assert.ok(store.leaveGroup(r.convId, 'cli-2').ok);
  assert.equal(store.get(r.convId, 'cli-2').reason, 'not_found');
  assert.equal(store.send(r.convId, 'cli-2', 'still here?').ok, false);
  assert.match(store.get(r.convId, 'stf-2').messages.at(-1).text, /Marcus Cole left the group/);
});

test('group rules: no residents, needs three, only Staff or Admin create', () => {
  const { store } = setup();
  assert.equal(store.createGroup('stf-1', { name: 'x', memberIds: ['res-1', 'cli-1'] }).reason, 'not_allowed');
  assert.equal(store.createGroup('stf-1', { name: 'x', memberIds: ['cli-1'] }).reason, 'group_too_small');
  assert.equal(store.createGroup('cli-1', { name: 'x', memberIds: ['stf-1', 'cli-2'] }).reason, 'not_allowed');
  assert.equal(store.createGroup('stf-1', { name: '  ', memberIds: ['cli-1', 'cli-2'] }).reason, 'name_required');
  assert.deepEqual(store.groupCandidates('res-1'), []);
  assert.ok(!store.groupCandidates('stf-1').some((p) => p.role === 'resident'));
});

test('group read receipts report exactly who has read', () => {
  const { store } = setup();
  const r = store.createGroup('stf-1', { name: 'Trio', memberIds: ['cli-1', 'cli-2'], text: 'Hello both' });
  const mine = () => store.get(r.convId, 'stf-1').messages.at(-1);
  assert.equal(mine().delivery, 'sent');
  store.markRead(r.convId, 'cli-1');
  assert.equal(mine().delivery, 'partial');
  assert.deepEqual(mine().seenBy, ['Dana Whitfield']);
  store.markRead(r.convId, 'cli-2');
  assert.equal(mine().delivery, 'read');
  assert.deepEqual(mine().seenBy.sort(), ['Dana Whitfield', 'Marcus Cole']);
});

/* ------------------------------------------------------- presence and typing */

test('presence and typing expire; only people in the conversation see typing', async () => {
  const { mk, clock } = setup({ presenceMs: 1000, typingMs: 500 });
  const a = mk();
  const b = mk();
  const r = a.startDirect('stf-1', 'cli-2', 'hi');
  await tick();
  a.touchPresence('stf-1');
  assert.equal(b.presenceOf('stf-1').online, true);
  a.setTyping(r.convId, 'stf-1');
  assert.deepEqual(b.typingIn(r.convId, 'cli-2').map((p) => p.id), ['stf-1']);
  assert.deepEqual(b.typingIn(r.convId, 'stf-1'), [], 'you do not see your own typing');
  assert.deepEqual(b.typingIn(r.convId, 'res-1'), [], 'outsiders see nothing');
  clock.t += 600;
  assert.deepEqual(b.typingIn(r.convId, 'cli-2'), []);
  clock.t += 600;
  assert.equal(b.presenceOf('stf-1').online, false);
  a.touchPresence('stf-1');
  a.goOffline('stf-1');
  assert.equal(b.presenceOf('stf-1').online, false);
});

/* ------------------------------------------------------------------- format */

test('format helpers (UTC, en-US)', () => {
  const tz = 'UTC';
  const now = Date.UTC(2026, 10, 9, 15, 0);
  assert.equal(dayLabel(now, now, tz), 'Today');
  assert.equal(dayLabel(now - 86400000, now, tz), 'Yesterday');
  assert.equal(listTime(now - 3600000, now, tz), '2:00 PM');
  assert.equal(listTime(now - 3 * 86400000, now, tz), 'Fri');
  assert.equal(duration(30000), 'under 1 min');
  assert.equal(duration(7 * 60000), '7 min');
  assert.equal(duration(130 * 60000), '2 h 10 min');
  const groups = groupByDay([{ at: now - 86400000 }, { at: now - 1000 }, { at: now }], now, tz);
  assert.deepEqual(groups.map((g) => [g.label, g.items.length]), [['Yesterday', 1], ['Today', 2]]);
});
