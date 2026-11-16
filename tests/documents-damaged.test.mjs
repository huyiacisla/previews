// A saved list of documents that was edited by hand or damaged must not break the page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateDocs, seed, daysLeft, expiryState } from '../src/documents/store.js';

test('entries that are not documents are dropped instead of throwing', () => {
  assert.deepEqual(migrateDocs([null, { id: 'x' }, 5, 'a', undefined, { id: 1, name: 'n' }]), []);
  const ok = { id: 'd9', name: 'A.pdf', category: 'policy', property: 'all', share: 'team', updated: '2026-01-01', expires: null, size: 1 };
  assert.deepEqual(migrateDocs([null, ok]), [ok]);
  assert.equal(migrateDocs(seed()).length, seed().length, 'the samples stay as they were');
});

test('"today" is the calendar day of the clock it is asked with, in any time zone', () => {
  const now = new Date(2026, 10, 14, 21, 30).getTime(); // 9:30 pm local: UTC may already be the next day
  const d = new Date(now);
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  assert.equal(daysLeft(today, now), 0);
  assert.equal(expiryState(today, now), 'soon');
});

test('the 120-character limit counts the name that is kept, with the file type added', async () => {
  const { validateUpload } = await import('../src/documents/store.js');
  const base = { category: 'policy', property: 'all', share: 'team', expires: '', file: { name: 'x.pdf', size: 1000 } };
  assert.equal(validateUpload({ ...base, name: 'a'.repeat(116) }).ok, true, '116 + ".pdf" is 120');
  const r = validateUpload({ ...base, name: 'a'.repeat(118) });
  assert.equal(r.ok, false);
  assert.match(r.errors.name, /120 characters or fewer/);
});
