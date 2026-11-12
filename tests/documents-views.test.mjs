// Documents (Client): upload date and time, the order and time-frame filters, the settings it reads, and who a document is shared with.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seed, sortDocs, filterDocs, counts, expiryState, validateUpload, validateW9, uploadedMs, hasUploadTime, migrateDocs, normalizeDocPrefs,
  SHARES, SORTS, RANGES, SOON_CHOICES, rangeLabel, sortLabel,
} from '../src/documents/store.js';
import { resolveBudget } from '../src/capacity/store.js';

const NOW = Date.parse('2026-11-10T12:00:00Z');
const ids = (list) => list.map((d) => d.id);

test('each sample document has the moment it was uploaded, date and time', () => {
  for (const d of seed(NOW)) {
    assert.ok(hasUploadTime(d), d.id);
    assert.equal(new Date(d.uploadedAt).getHours() >= 9 && new Date(d.uploadedAt).getHours() <= 17, true);
    assert.equal(new Date(d.uploadedAt).toISOString().slice(0, 10) <= new Date(NOW).toISOString().slice(0, 10), true);
  }
});

test('a new upload and a new W-9 are stamped with the time they were added', () => {
  const up = validateUpload({ file: { name: 'Lease.pdf', size: 1000 }, name: 'Lease', category: 'contract', property: 'all', share: 'admins', expires: '' }, NOW);
  assert.equal(up.doc.uploadedAt, NOW);
  const w9 = validateW9({ file: { name: 'w9.pdf', size: 1000 }, legalName: 'AMC LLC', classification: 'llc', signed: '2026-11-01' }, NOW);
  assert.equal(w9.doc.uploadedAt, NOW);
});

test('without a time (saved by an older version) the date still orders it', () => {
  const old = { id: 'x1', name: 'Old.pdf', updated: '2026-01-05' };
  assert.equal(hasUploadTime(old), false);
  assert.equal(uploadedMs(old), Date.parse('2026-01-05T00:00:00'));
});

test('time frame: only what was uploaded within the last N days', () => {
  const docs = seed(NOW); // uploaded 14, 30, 58, 92, 210, 340 and 400 days ago
  assert.deepEqual(ids(filterDocs(docs, { range: 'any' }, NOW)).length, 7);
  assert.deepEqual(ids(filterDocs(docs, { range: '7' }, NOW)), []);
  assert.deepEqual(ids(filterDocs(docs, { range: '30' }, NOW)).sort(), ['d4', 'd7']);
  assert.deepEqual(ids(filterDocs(docs, { range: '90' }, NOW)).sort(), ['d4', 'd5', 'd7']);
  assert.deepEqual(ids(filterDocs(docs, { range: '365' }, NOW)).sort(), ['d1', 'd2', 'd4', 'd5', 'd6', 'd7']);
});

test('time frame combines with the search, the category and the property', () => {
  const docs = seed(NOW);
  assert.deepEqual(ids(filterDocs(docs, { range: '90', category: 'template' }, NOW)).sort(), ['d5', 'd7']);
  assert.deepEqual(ids(filterDocs(docs, { range: '90', property: 'riverbend' }, NOW)).sort(), ['d4', 'd5', 'd7']); // "all properties" documents show under a property
  assert.deepEqual(ids(filterDocs(docs, { range: '30', q: 'welcome' }, NOW)), ['d7']);
});

test('order: newest, oldest, name, and expires soonest', () => {
  const docs = seed(NOW);
  assert.deepEqual(ids(sortDocs(docs, NOW, 30, 'newest')), ['d7', 'd4', 'd5', 'd1', 'd6', 'd2', 'd3']);
  assert.deepEqual(ids(sortDocs(docs, NOW, 30, 'oldest')), ['d3', 'd2', 'd6', 'd1', 'd5', 'd4', 'd7']);
  assert.deepEqual(sortDocs(docs, NOW, 30, 'name').map((d) => d.name)[0], 'Certificate of insurance.pdf');
  // the expired one leads, then the nearest end date; documents with no end date go last, newest first
  assert.deepEqual(ids(sortDocs(docs, NOW, 30, 'expiry')), ['d3', 'd2', 'd7', 'd4', 'd5', 'd1', 'd6']);
});

test('the default order is still "needs attention first"', () => {
  assert.deepEqual(ids(sortDocs(seed(NOW), NOW)).slice(0, 2), ['d3', 'd2']);
  assert.deepEqual(ids(sortDocs(seed(NOW), NOW, 30, 'attention')).slice(0, 2), ['d3', 'd2']);
});

test('every order and time frame has a label', () => {
  for (const [id] of SORTS) assert.notEqual(sortLabel(id), id);
  for (const [id] of RANGES) assert.notEqual(rangeLabel(id), id);
});

test('"expiring soon" follows the number of days chosen in Workspace settings', () => {
  assert.equal(expiryState('2026-12-01', NOW, 30), 'soon'); // 21 days away
  assert.equal(expiryState('2026-12-01', NOW, 14), 'ok');
  assert.equal(expiryState('2026-12-01', NOW, 60), 'soon');
  assert.equal(counts(seed(NOW), NOW, 14).soon, 0);
  assert.equal(counts(seed(NOW), NOW, 30).soon, 1);
  assert.equal(counts(seed(NOW), NOW, 14).expired, 1); // an expired one is expired whatever the setting
  assert.deepEqual(SOON_CHOICES, [7, 14, 30, 60, 90]);
});

test('the Documents preferences fall back to the defaults for anything missing or odd', () => {
  assert.deepEqual(normalizeDocPrefs(null), { soonDays: 30, share: 'admins', storageWarn: true });
  assert.deepEqual(normalizeDocPrefs({ soonDays: 14, share: 'team', storageWarn: false }), { soonDays: 14, share: 'team', storageWarn: false });
  assert.deepEqual(normalizeDocPrefs({ soonDays: 45, share: 'residents', storageWarn: 'no' }), { soonDays: 30, share: 'admins', storageWarn: true });
});

test('Client documents are for the company only: admins, or the whole team', () => {
  assert.deepEqual(SHARES.map(([id]) => id), ['admins', 'team']);
  const ok = { file: { name: 'Lease.pdf', size: 1000 }, name: 'Lease', category: 'contract', property: 'all', expires: '' };
  assert.ok(validateUpload({ ...ok, share: 'team' }, NOW).ok);
  assert.ok(validateUpload({ ...ok, share: 'staff' }, NOW).errors.share);
  assert.ok(validateUpload({ ...ok, share: 'residents' }, NOW).errors.share);
  for (const d of seed(NOW)) assert.ok(['admins', 'team'].includes(d.share), d.id);
});

test('a list saved by an older version is brought up to date, and nothing else is changed', () => {
  const saved = [
    { id: 'd2', name: 'Certificate of insurance.pdf', share: 'staff', updated: '2026-01-05' },
    { id: 'd4', name: 'Parking rules.pdf', share: 'residents', updated: '2026-02-01' },
    { id: 'u123', name: 'Mine.pdf', share: 'admins', updated: '2026-03-01' },
    { id: 'd1', name: 'EasySpotOps service agreement.pdf', share: 'admins', updated: '2026-04-01', uploadedAt: 1 },
  ];
  const out = migrateDocs(saved);
  assert.deepEqual(out.map((d) => d.share), ['team', 'team', 'admins', 'admins']);
  assert.ok(hasUploadTime(out[0])); // a sample document gets its time of day
  assert.equal(hasUploadTime(out[2]), false); // one the person added keeps its date only
  assert.equal(out[3], saved[3]); // already current: the same object
});

test('the add-on budget: what was typed on the Capacity page wins, else the Workspace default, else no cap', () => {
  assert.equal(resolveBudget(150, { budget: 100 }), 150);
  assert.equal(resolveBudget(0, { budget: 100 }), 0);
  assert.equal(resolveBudget('none', { budget: 100 }), null); // cleared on purpose
  assert.equal(resolveBudget(null, { budget: 100 }), 100);
  assert.equal(resolveBudget(null, { budget: null }), null);
  assert.equal(resolveBudget(null, null), null);
  assert.equal(resolveBudget('abc', { budget: -5 }), null);
});
