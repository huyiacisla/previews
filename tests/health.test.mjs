import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../src/messaging/store.js';
import { ensurePropertyFeed } from '../src/social/seed.js';
import { monitor } from '../src/social/monitor.js';
import { checkMessages, readMessages } from '../src/health/messages-checks.js';
import { modules, overall, healthReport } from '../src/health/health.js';

const store = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const withMessages = (mutate) => { const s = store(); const d = createSeed(Date.now()); if (mutate) mutate(d); s.setItem('eso-msg-v1', JSON.stringify(d)); return s; };
const failed = (s) => checkMessages(s).filter((c) => !c.ok).map((c) => c.id);

test('the sample conversations pass every Messages check', () => {
  const s = withMessages();
  assert.deepEqual(checkMessages(s).filter((c) => !c.ok).map((c) => `${c.id}: ${c.found.map((f) => f.where + ' ' + f.detail).join('; ')}`), []);
  assert.ok(checkMessages(s).length >= 8);
});

test('no messages yet is not an error; unreadable messages are', () => {
  assert.equal(readMessages(store()).state, 'none');
  assert.deepEqual(failed(store()), []);
  const s = store({ 'eso-msg-v1': '{oops' });
  assert.deepEqual(failed(s), ['messages-readable']);
  assert.deepEqual(failed(store({ 'eso-msg-v1': '{"v":1}' })), ['messages-readable']);
});

test('each kind of damage in the messages is found', () => {
  const s = withMessages((d) => {
    const [first, second] = Object.keys(d.convs);
    d.msgs.ghost = [{ id: 'mx1', convId: 'ghost', from: 'res-1', kind: 'text', text: 'lost', at: Date.now() }];     // no such conversation
    d.msgs[first].push({ ...d.msgs[first][0] });                                                                      // duplicate id
    d.convs[second].ticketNo = d.convs[first].ticketNo || 1081; d.convs[first].ticketNo = d.convs[second].ticketNo;   // same ticket number
    d.convs[first].status = 'sleeping';                                                                               // unknown status
    d.convs[first].kind = 'resident_support';
    d.msgs[second].push({ id: 'mx2', convId: second, from: 'stranger-9', kind: 'text', text: 'hi', at: Date.now() + 5 * 86400000 }); // unknown person, future
  });
  const ids = failed(s);
  for (const id of ['msg-conversation', 'msg-unique', 'ticket-numbers', 'status-valid', 'known-people', 'times']) assert.ok(ids.includes(id), `${id} should find something (got ${ids})`);
  for (const c of checkMessages(s).filter((x) => !x.ok)) assert.ok(c.fix.length > 20 && c.found.every((f) => f.where && f.detail));
});

test('an emergency that nobody acknowledged for a long time is reported as something to do now', () => {
  const s = withMessages((d) => { const id = Object.keys(d.convs)[0]; d.convs[id].emergency = { at: Date.now() - 40 * 60000, by: 'res-1', ackBy: null, ackAt: null, smsAt: null }; });
  assert.ok(failed(s).includes('emergency-waiting'));
  const s2 = withMessages((d) => { const id = Object.keys(d.convs)[0]; d.convs[id].emergency = { at: Date.now() - 40 * 60000, by: 'res-1', ackBy: 'stf-1', ackAt: Date.now() - 39 * 60000, smsAt: null }; });
  assert.ok(!failed(s2).includes('emergency-waiting'));
});

test('System health lists Messages and the Social of every property that has a feed, with a total', () => {
  const s = withMessages();
  s.setItem('capacity-state:client', JSON.stringify({ properties: [{ name: 'Harbor Court', units: 10 }, { name: 'No Feed Yet', units: 5 }] }));
  ensurePropertyFeed(s, 'extra-1', 'Harbor Court');
  monitor(s, 'main');
  const mods = modules(s);
  assert.deepEqual(mods.map((m) => m.id), ['messages', 'documents', 'notifications', 'social-main', 'social-extra-1']);
  const o = overall(mods);
  assert.equal(o.failedModules, 0);
  assert.match(healthReport(mods), /all \d+ checks passed in 5 modules/);
});

test('a fault is attributed to the module and property it is in, and the report says where and how to fix', () => {
  const s = withMessages((d) => { d.convs[Object.keys(d.convs)[0]].status = 'sleeping'; d.convs[Object.keys(d.convs)[0]].kind = 'resident_support'; });
  s.setItem('capacity-state:client', JSON.stringify({ properties: [{ name: 'Harbor Court', units: 10 }] }));
  ensurePropertyFeed(s, 'extra-1', 'Harbor Court');
  monitor(s, 'main');
  const f = JSON.parse(s.getItem('eso-feed:extra-1')); f.posts.push({ id: 'w1', a: 'me', t: Date.now(), txt: 'twin', aud: 'all' }); s.setItem('eso-feed:extra-1', JSON.stringify(f));
  const mods = modules(s);
  assert.deepEqual(mods.filter((m) => m.failed).map((m) => m.id), ['messages', 'social-extra-1']);
  const t = healthReport(mods);
  assert.match(t, /== Messages and Ticket box/);
  assert.match(t, /== Social: Harbor Court/);
  assert.match(t, /Fix:/);
});
