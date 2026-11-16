import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../src/documents/store.js';
import { checkDocuments } from '../src/health/documents-checks.js';
import { checkNotifications } from '../src/health/notifications-checks.js';
import { modules, overall } from '../src/health/health.js';

const store = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), keys: () => [...m.keys()] }; };
const withDocs = (mutate) => { const docs = seed(); if (mutate) mutate(docs); return store({ 'eso-docs:client': JSON.stringify(docs) }); };
const failed = (checks) => checks.filter((c) => !c.ok).map((c) => c.id);

test('the sample documents pass every Documents check; no documents yet is not an error', () => {
  const c = checkDocuments(withDocs());
  assert.deepEqual(c.filter((x) => !x.ok).map((x) => `${x.id}: ${x.found.map((f) => f.where + ' ' + f.detail)}`), []);
  assert.ok(c.length >= 6);
  assert.deepEqual(failed(checkDocuments(store())), []);
});

test('each kind of damage in the documents is found, with where and how to fix', () => {
  const s = withDocs((d) => {
    d.push({ ...d[0] });                                                   // same id
    d.push({ id: 'x2', name: 'Odd category.pdf', category: 'secrets', property: 'nowhere', share: 'everyone', updated: '2026-13-45', expires: 'soon', size: 99999999999 });
    d.push(null);                                                          // not a document
  });
  const ids = failed(checkDocuments(s));
  for (const id of ['docs-entries', 'docs-unique', 'docs-known-values', 'docs-size', 'docs-dates']) assert.ok(ids.includes(id), `${id} should find something (got ${ids})`);
  for (const c of checkDocuments(s).filter((x) => !x.ok)) assert.ok(c.fix.length > 20 && c.found.every((f) => f.where && f.detail), c.id);
});

test('a document list that is not valid JSON is the one error that stops the rest; broken secret data is only a warning', () => {
  assert.deepEqual(failed(checkDocuments(store({ 'eso-docs:client': '{oops' }))), ['docs-readable']);
  assert.deepEqual(failed(checkDocuments(store({ 'eso-docs:client': '{"a":1}' }))), ['docs-readable']);
  const s = withDocs(); s.setItem('docs-secret:pending', '{{');
  const bad = checkDocuments(s).find((c) => c.id === 'docs-side-data');
  assert.equal(bad.ok, false);
  assert.equal(bad.severity, 'warning');
});

test('storage over what the plan allows is an error', () => {
  const s = withDocs((d) => { d[0].size = 5e9; });
  assert.ok(failed(checkDocuments(s)).includes('docs-storage'));
});

test('the sample notifications pass every Notifications check', () => {
  const c = checkNotifications(store());
  assert.deepEqual(c.filter((x) => !x.ok).map((x) => `${x.id}: ${x.found.map((f) => f.where + ' ' + f.detail)}`), []);
  assert.equal(c.length, 3);
});

test('read marks and switches that cannot be read are named, per person and per key', () => {
  const s = store({ 'eso-notif-read:res-1': '{{', 'eso-notif-read:stf-1': JSON.stringify({ 'n-msg-0': 'yes' }), 'client:eso-notif': 'nope' });
  const c = checkNotifications(s);
  const marks = c.find((x) => x.id === 'notif-read-marks');
  assert.equal(marks.ok, false);
  assert.equal(marks.found.length, 2);
  assert.match(marks.found.map((f) => f.where).join(), /eso-notif-read:res-1/);
  assert.equal(c.find((x) => x.id === 'notif-switches').ok, false);
});

test('System health lists Documents and Notifications with the other modules', () => {
  const s = withDocs();
  const mods = modules(s);
  assert.ok(['messages', 'documents', 'notifications'].every((id) => mods.some((m) => m.id === id)));
  assert.equal(overall(mods).failedModules, 0);
  s.setItem('eso-docs:client', '{oops');
  assert.deepEqual(modules(s).filter((m) => m.failed).map((m) => m.id), ['documents']);
});
