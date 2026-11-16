// Inside the staff, the job title decides who may moderate Social. The store refuses, so a hidden button is not the only guard.
import test from 'node:test';
import assert from 'node:assert/strict';
import { allowed, notAllowed, STAFF_TITLES } from '../../src/features/social/roles.js';
import { ensureFeed } from '../../src/features/social/seed.js';
import * as staff from '../../src/features/social/staff-store.js';
import * as resident from '../../src/features/social/store.js';

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const NOW = Date.UTC(2026, 10, 9, 10, 0, 0);
const DAY = 86400000;

test('three kinds of staff: the Property Manager may do everything, the Leasing Agent and Front Desk may warn and remove, Maintenance may not moderate', () => {
  assert.deepEqual(STAFF_TITLES, ['Property Manager', 'Leasing Agent', 'Front Desk', 'Maintenance Staff']);
  for (const a of ['warn', 'pause', 'switchOff', 'rules', 'remove']) assert.equal(allowed('Property Manager', a), true, a);
  for (const t of ['Leasing Agent', 'Front Desk']) {
    assert.equal(allowed(t, 'warn'), true);
    assert.equal(allowed(t, 'remove'), true);
    for (const a of ['pause', 'switchOff', 'rules']) assert.equal(allowed(t, a), false, `${t} ${a}`);
  }
  for (const a of ['warn', 'pause', 'switchOff', 'rules', 'remove']) assert.equal(allowed('Maintenance Staff', a), false, a);
  assert.equal(allowed(undefined, 'pause'), true, 'a call with no title is not limited');
  assert.equal(allowed('Something new', 'warn'), true, 'an unknown title gets the Leasing Agent\'s rights');
  assert.equal(allowed('Something new', 'pause'), false);
  assert.match(notAllowed('pause'), /Property Manager/);
});

test('the store refuses what the title does not allow, and records what it does', () => {
  const s = mem();
  ensureFeed(s, Date.UTC(2026, 10, 9, 9, 0, 0));
  const c = resident.addReply(s, 'res-2', 'p1', 'A rude comment', NOW).reply;
  const until = NOW + DAY;
  // a Leasing Agent: a warning yes, a pause or a ban no
  const none = staff.addViolation(s, { comment: c.id, reason: 'hate', note: 'n', kind: 'light', until, byTitle: 'Leasing Agent' }, NOW + 1000);
  assert.equal(none.ok, false);
  assert.match(none.reason, /Property Manager/);
  assert.equal(staff.banResident(s, { who: 'res:res-3', reason: 'hate', note: 'n', until, byTitle: 'Leasing Agent' }, NOW + 1000, 'Sam').ok, false);
  assert.equal(staff.setResidentSocial(s, 'res:res-3', false, 'Leasing Agent').ok, false);
  assert.equal(staff.saveRules(s, { limit: 3, minPauseMin: 15, maxPauseDays: 90, requireNote: false, defaults: staff.rules(s).defaults, byTitle: 'Front Desk' }).ok, false);
  assert.equal(staff.removeComment(s, c.id, NOW + 1000, 'Maintenance Staff').ok, false);
  assert.equal(staff.violations(s, NOW + 2000).length, 0, 'nothing was recorded');
  const warn = staff.addViolation(s, { comment: c.id, reason: 'hate', note: 'n', kind: 'warning', byTitle: 'Leasing Agent' }, NOW + 1000);
  assert.equal(warn.ok, true, 'a warning is allowed');
  // the Property Manager can do all of it
  assert.equal(staff.banResident(s, { who: 'res:res-3', reason: 'hate', note: 'n', until, byTitle: 'Property Manager' }, NOW + 3000, 'Jordan').ok, true);
  assert.equal(staff.setResidentSocial(s, 'res:res-3', false, 'Property Manager').ok, true);
});
