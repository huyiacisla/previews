// Switches the Staff settings write (0 and 1, not only true and false) and what a resident is allowed to know about staff.
import test from 'node:test';
import assert from 'node:assert/strict';
import { guidelines, needsGuidelines, timeline, mutePerson, unmuteAll, hiddenByMute } from '../src/social/store.js';
import { ensureFeed } from '../src/social/seed.js';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

test('"Require acceptance" off is honoured whether Staff wrote false or 0; missing or 1 means required', () => {
  for (const [accept, required] of [[false, false], [0, false], ['0', false], [true, true], [1, true], [undefined, true]]) {
    const s = mem();
    s.setItem('eso-mod', JSON.stringify({ gl: accept === undefined ? { ver: 3 } : { ver: 3, accept } }));
    assert.equal(guidelines(s).required, required, `accept=${String(accept)}`);
    assert.equal(needsGuidelines(s, 'res-1'), required, `a resident with nothing accepted, accept=${String(accept)}`);
  }
});

test('a resident can mute a neighbor: their posts leave only that resident\'s feed, and Unmute all brings them back', () => {
  const s = mem();
  const NOW = Date.UTC(2026, 10, 9, 10, 0, 0);
  ensureFeed(s, Date.UTC(2026, 10, 9, 9, 0, 0));
  const all = timeline(s, 'res-1', { now: NOW });
  const neighbor = all.find((p) => p.role === 'Resident' && p.by !== 'res:res-1');
  assert.ok(neighbor, 'a post by a neighbor');
  assert.deepEqual(mutePerson(s, 'res-1', neighbor.by), { ok: true });
  assert.ok(!timeline(s, 'res-1', { now: NOW }).some((p) => p.by === neighbor.by), 'gone from this resident\'s feed');
  assert.ok(timeline(s, 'res-2', { now: NOW }).some((p) => p.by === neighbor.by) || neighbor.by === 'res:res-2', 'still there for everybody else');
  assert.ok(hiddenByMute(s, 'res-1', NOW) >= 1, 'the number held back');
  assert.equal(mutePerson(s, 'res-1', 'me').ok, false, 'not the property team');
  assert.equal(mutePerson(s, 'res-1', 'dana').ok, false, 'not a member of the staff');
  assert.equal(mutePerson(s, 'res-1', 'res:res-1').ok, false, 'not yourself');
  assert.deepEqual(unmuteAll(s, 'res-1'), { ok: true });
  assert.equal(hiddenByMute(s, 'res-1', NOW), 0);
  assert.ok(timeline(s, 'res-1', { now: NOW }).some((p) => p.by === neighbor.by));
});

test('Staff can turn Social off for ONE resident: no violation, no strike, nobody else affected, and it comes back', async () => {
  const staffStore = await import('../src/social/staff-store.js');
  const s = mem();
  const NOW = Date.UTC(2026, 10, 9, 10, 0, 0);
  ensureFeed(s, Date.UTC(2026, 10, 9, 9, 0, 0));
  assert.ok(timeline(s, 'res-1', { now: NOW }).length > 0);
  assert.deepEqual(staffStore.setResidentSocial(s, 'res:res-1', false), { ok: true, off: true });
  assert.deepEqual(timeline(s, 'res-1', { now: NOW }), [], 'closed for that resident');
  assert.ok(timeline(s, 'res-2', { now: NOW }).length > 0, 'open for the others');
  assert.equal(staffStore.violations(s, NOW).length, 0, 'not a violation');
  assert.equal(staffStore.standings(s, NOW).find((p) => p.who === 'res:res-1').count, 0, 'not a strike');
  assert.equal(staffStore.setResidentSocial(s, 'nobody', false).ok, false);
  assert.equal(staffStore.residentSocialOff(s, 'res:res-1'), true);
  assert.deepEqual(staffStore.setResidentSocial(s, 'res:res-1', true), { ok: true, off: false });
  assert.ok(timeline(s, 'res-1', { now: NOW }).length > 0, 'back on');
});

test('a resident never sees the name of a member of the staff, only "Property team"', () => {
  const s = mem();
  ensureFeed(s, Date.UTC(2026, 10, 9, 9, 0, 0));
  const posts = timeline(s, 'res-1', { now: Date.UTC(2026, 10, 9, 10, 0, 0) });
  const staffNames = ['Noor Hassan', 'Luis Ortega', 'Kim Tran', 'Jordan Lee', 'Sam Okafor'];
  const seen = [];
  for (const p of posts) {
    seen.push(p.name, ...p.replies.map((r) => r.name), ...p.reactors.map((r) => r.name), ...p.sharers.map((x) => x.name));
  }
  assert.ok(seen.includes('Property team'));
  for (const n of staffNames) assert.ok(!seen.includes(n), `${n} must not appear to a resident`);
});
