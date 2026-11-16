// Social, the Staff Violations page: every resident with where they stand, a direct ban or warning (no comment attached), lifting a ban, and the search, filter and
// sort of the list. Real people through the real stores.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureFeed } from '../../src/features/social/seed.js';
import * as staff from '../../src/features/social/staff-store.js';
import * as res from '../../src/features/social/store.js';

const NOW = Date.parse('2026-11-10T15:00:00');
const HOUR = 3600000;
const DAY = 24 * HOUR;
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const fresh = () => { const s = mem(); ensureFeed(s, NOW); return s; };
const ME = 'Jordan Lee';
const by = (s, who, now = NOW) => staff.standings(s, now).find((p) => p.who === who);
const ban = (s, who, at, extra = {}) => staff.banResident(s, { who, reason: 'harass', note: 'Direct', until: at + HOUR, ...extra }, at, ME);

test('every resident who logs in is on the list from the start, in good standing', () => {
  const list = staff.standings(fresh(), NOW);
  assert.deepEqual(list.map((p) => p.who).sort(), ['res:res-1', 'res:res-2', 'res:res-3']);
  for (const p of list) assert.deepEqual([p.count, p.limit, p.status, p.items.length, p.folders.length, p.latest], [0, 3, 'clear', 0, 0, null]);
  assert.ok(list.every((p) => p.name && p.unit), 'name and unit, for Staff');
});

test('a direct ban follows the same rules as a violation on a comment, and is one strike', () => {
  const s = fresh();
  assert.equal(staff.banResident(s, { who: 'res:nobody', reason: 'hate', until: NOW + DAY }, NOW).ok, false, 'a resident who exists');
  assert.equal(staff.banResident(s, { who: 'res:res-2', until: NOW + DAY }, NOW).ok, false, 'a reason');
  assert.equal(staff.banResident(s, { who: 'res:res-2', reason: 'other', note: '', until: NOW + DAY }, NOW).ok, false, '"another reason" says what');
  assert.equal(staff.banResident(s, { who: 'res:res-2', reason: 'hate', until: NOW - HOUR }, NOW).ok, false, 'a date that is not in the past');
  assert.equal(staff.banResident(s, { who: 'res:res-2', reason: 'hate', until: NOW + 91 * DAY }, NOW).ok, false, 'not longer than 90 days');
  assert.deepEqual(staff.violations(s, NOW), [], 'a refused one leaves nothing');
  const r = staff.banResident(s, { who: 'res:res-2', reason: 'hate', note: 'Slurs in the lobby chat', until: NOW + 3 * DAY }, NOW, ME);
  assert.ok(r.ok);
  assert.equal(r.violation.manual, true);
  assert.equal(r.violation.comment, null);
  assert.equal(r.violation.by, ME);
  assert.equal(r.violation.rule, 'Be a good neighbor');
  const p = by(s, 'res:res-2');
  assert.deepEqual([p.status, p.count, p.items.length, p.until], ['paused', 1, 1, NOW + 3 * DAY]);
  assert.equal(by(s, 'res:res-1').status, 'clear', 'nobody else');
  // the resident is shut out, and is told in the same words
  const refused = res.addReply(s, 'res-2', 'p1', 'hi', NOW + HOUR);
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /paused until/);
  assert.equal(res.noticesOf(s, 'res-2', NOW + HOUR)[0].manual, true);
});

test('a warning with no comment is on the record, pauses nothing, and is not a strike', () => {
  const s = fresh();
  assert.equal(staff.warnResident(s, { who: 'res:res-3', reason: 'spam' }, NOW).ok, true, 'no date needed');
  const p = by(s, 'res:res-3');
  assert.deepEqual([p.status, p.count, p.items.length, p.items[0].kind, p.items[0].until], ['clear', 0, 1, 'warning', undefined]);
  assert.equal(res.addReply(s, 'res-3', 'p1', 'still fine', NOW + 1).ok, true);
});

test('two bans in the same moment are two records', () => {
  const s = fresh();
  const a = ban(s, 'res:res-1', NOW);
  const b = ban(s, 'res:res-2', NOW);
  const c = ban(s, 'res:res-1', NOW);
  assert.equal(new Set([a, b, c].map((x) => x.violation.id)).size, 3);
});

test('Unban: the clock stops now, the strike stays, who lifted it is kept, and the resident presses Resume', () => {
  const s = fresh();
  assert.equal(staff.unbanResident(s, 'res:res-2', NOW).ok, false, 'no ban is running');
  ban(s, 'res:res-2', NOW, { until: NOW + 5 * DAY });
  const lift = NOW + DAY;
  const r = staff.unbanResident(s, 'res:res-2', lift, ME);
  assert.deepEqual(r, { ok: true, ended: 1 });
  const p = by(s, 'res:res-2', lift);
  assert.equal(p.status, 'awaiting', 'the clock is at zero: now it is up to them');
  assert.equal(p.count, 1, 'the strike is still a strike');
  assert.deepEqual([p.items[0].until, p.items[0].lifted.t, p.items[0].lifted.by], [lift, lift, ME]);
  assert.equal(staff.unbanResident(s, 'res:res-2', lift).ok, false, 'nothing left to lift');
  assert.deepEqual(res.resumePause(s, 'res-2', lift), { ok: true });
  assert.equal(by(s, 'res:res-2', lift).status, 'clear');
});

test('an account at three strikes is not unbanned: it is opened, and then it is a folder', () => {
  const s = fresh();
  for (const n of [1, 2, 3]) { const at = NOW + n * DAY; const hold = res.pauseOf(s, 'res-2', at); if (hold && !hold.review) { res.resumePause(s, 'res-2', at); res.acceptGuidelines(s, 'res-2'); } assert.ok(ban(s, 'res:res-2', at, { until: n === 3 ? at + 5 * DAY : at + HOUR }).ok); }
  const later = NOW + 3 * DAY + HOUR;
  assert.equal(by(s, 'res:res-2', later).status, 'review');
  const lift = staff.unbanResident(s, 'res:res-2', later, ME);
  assert.equal(lift.ok, false);
  assert.equal(lift.review, true);
  assert.match(lift.reason, /Open the account/);
  assert.ok(staff.openAccount(s, 'res:res-2', later).ok);
  const p = by(s, 'res:res-2', later);
  assert.deepEqual([p.count, p.folders.length, p.folders[0].items.length, p.items.length], [0, 1, 3, 3]);
  assert.equal(p.status, 'paused', 'the third ban was still running; it runs out on its own');
});

test('search, filter and sort: by name, unit, reason, note and comment; by status; by reason; strikes first, latest first, or by name', () => {
  const s = fresh();
  ban(s, 'res:res-1', NOW - 5 * DAY, { reason: 'hate', note: 'Slurs', until: NOW - 5 * DAY + HOUR });
  ban(s, 'res:res-1', NOW - 3 * DAY, { reason: 'spam', note: 'Ads', until: NOW - 3 * DAY + HOUR });
  ban(s, 'res:res-2', NOW - 1 * DAY, { reason: 'harass', note: 'Lobby chat', until: NOW + 2 * DAY });
  staff.warnResident(s, { who: 'res:res-3', reason: 'privacy', note: 'Posted a plate' }, NOW - 2 * DAY, ME);
  const all = staff.standings(s, NOW);
  const names = (opts) => staff.filterStandings(all, opts).map((p) => p.name);
  assert.deepEqual(names({}), ['Alex Rivera', 'Priya Nair', 'Morgan Ellis'], 'two strikes, then one, then none');
  assert.deepEqual(names({ sort: 'recent' }), ['Priya Nair', 'Morgan Ellis', 'Alex Rivera'], 'whoever has the newest record first');
  assert.deepEqual(names({ sort: 'name' }), ['Alex Rivera', 'Morgan Ellis', 'Priya Nair']);
  assert.deepEqual(names({ q: 'priya' }), ['Priya Nair']);
  assert.deepEqual(names({ q: 'lobby' }), ['Priya Nair'], 'a word of a note');
  assert.deepEqual(names({ q: 'slurs' }), ['Alex Rivera']);
  assert.deepEqual(names({ q: 'plate' }), ['Morgan Ellis']);
  assert.deepEqual(names({ q: 'nobody-matches' }), []);
  assert.deepEqual(names({ status: 'paused' }), ['Priya Nair']);
  assert.deepEqual(names({ status: 'awaiting' }), ['Alex Rivera'], 'its clock ran out and they have not pressed Resume');
  assert.deepEqual(names({ status: 'strikes' }), ['Alex Rivera', 'Priya Nair']);
  assert.deepEqual(names({ status: 'clear' }), ['Morgan Ellis']);
  assert.deepEqual(names({ reason: 'spam' }), ['Alex Rivera']);
  assert.deepEqual(names({ reason: 'privacy' }), ['Morgan Ellis'], 'a warning is a record too');
  assert.deepEqual(names({ status: 'strikes', reason: 'harass' }), ['Priya Nair'], 'filters add up');
  assert.deepEqual(names({ q: 'a', status: 'all', reason: 'all', sort: 'name' }), ['Alex Rivera', 'Morgan Ellis', 'Priya Nair']);
});
