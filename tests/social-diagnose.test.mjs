import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureFeed } from '../src/social/seed.js';
import { activity, filterActivity, diagnose, summary, reportText, readRaw } from '../src/social/diagnose.js';

const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const seeded = () => { const s = store(); ensureFeed(s); return s; };
const edit = (s, fn) => { const f = JSON.parse(s.getItem('eso-feed')); fn(f); s.setItem('eso-feed', JSON.stringify(f)); };
const failed = (s) => diagnose(s).filter((c) => !c.ok).map((c) => c.id);

test('the sample feed passes every check', () => {
  const s = seeded();
  assert.deepEqual(failed(s), []);
  const r = summary(diagnose(s));
  assert.equal(r.failed, 0);
  assert.ok(r.run >= 8);
});

test('a feed that is not valid JSON is the one error that stops the rest, and the log is empty', () => {
  const s = store(); s.setItem('eso-feed', '{oops');
  assert.equal(readRaw(s).state, 'bad');
  assert.deepEqual(failed(s), ['feed-readable']);
  assert.deepEqual(activity(s), []);
});

test('a property without a feed is not an error', () => {
  const s = store();
  assert.equal(readRaw(s).state, 'none');
  assert.deepEqual(failed(s), []);
});

test('each kind of damage is found, named, and comes with a fix', () => {
  const s = seeded();
  edit(s, (f) => {
    f.posts.push({ id: 'p1', a: 'dana', t: Date.now(), txt: 'twin of p1', aud: 'all' });            // duplicate id
    f.posts.push({ id: 'x1', a: 'dana', t: Date.now(), txt: '', aud: 'all' });                     // no text
    f.posts.push({ id: 'x2', a: 'dana', t: Date.now(), txt: 'a'.repeat(1200), aud: 'all' });        // too long
    f.posts.push({ id: 'x3', a: 'dana', t: Date.now(), txt: 'odd audience', aud: 'vip' });          // unknown audience
    f.posts.push({ id: 'x4', a: 'dana', t: Date.now() + 5 * 86400000, txt: 'from the future' });    // future
    f.posts.forEach((p, i) => { if (i < 5) p.pin = 1; });                                           // five pinned
    f.posts[0].rs = [{ id: 'r9', a: 'kim', t: Date.now(), txt: 'lost', re: 'nope' }];               // answers a reply that is not there
  });
  const ids = failed(s);
  for (const id of ['unique-ids', 'post-fields', 'post-length', 'audience', 'pinned-limit', 'reply-parent', 'times']) assert.ok(ids.includes(id), `${id} should have found something (got ${ids})`);
  for (const c of diagnose(s).filter((x) => !x.ok)) { assert.ok(c.fix.length > 20, `${c.id} needs a fix`); assert.ok(c.found.every((f) => f.where && f.detail)); }
});

test('one fault is reported once: a duplicate id does not also make its replies look older than the post', () => {
  const s = seeded();
  edit(s, (f) => { f.posts.push({ id: 'p1', a: 'dana', t: Date.now(), txt: 'twin of p1', aud: 'all' }); });
  assert.deepEqual(failed(s), ['unique-ids']);
});

test('a staff-only post a resident replied to is an error', () => {
  const s = seeded();
  s.setItem('eso-res-social:res-1', JSON.stringify({ replies: { p3: [{ id: 'rr1', t: Date.now(), txt: 'hello' }] } })); // p3 is for staff
  assert.ok(failed(s).includes('staff-only-private'));
});

test('a resident record that cannot be read is named', () => {
  const s = seeded();
  s.setItem('eso-res-social:res-1', '{{');
  const c = diagnose(s).find((x) => x.id === 'resident-data-readable');
  assert.equal(c.ok, false);
  assert.match(c.found[0].where, /eso-res-social:res-1/);
});

test('the log lists posts, replies and violations newest first, and can be searched', () => {
  const s = seeded();
  edit(s, (f) => { f.vio = [{ id: 'v1', who: 'res:res-1', name: 'Alex Rivera', kind: 'warning', t: Date.now() - 1000, reason: 'spam', note: 'repeated link' }]; });
  const log = activity(s);
  assert.ok(log.some((e) => e.type === 'post') && log.some((e) => e.type === 'reply') && log.some((e) => e.type === 'violation'));
  for (let i = 1; i < log.length; i++) assert.ok(log[i - 1].at >= log[i].at, 'newest first');
  assert.ok(filterActivity(log, { type: 'violation' }).every((e) => e.type === 'violation'));
  assert.equal(filterActivity(log, { q: 'zzzz-none' }).length, 0);
  assert.ok(filterActivity(log, { q: 'Alex' }).length >= 1);
  assert.ok(log.every((e) => e.ref && e.id));
});

test('the report text says what failed, where and how to fix, and says so when all passed', () => {
  const s = seeded();
  assert.match(reportText(diagnose(s), 'Mallard Pointe'), /all \d+ passed/);
  edit(s, (f) => { f.posts.push({ id: 'p1', a: 'dana', t: Date.now(), txt: 'twin', aud: 'all' }); });
  const t = reportText(diagnose(s), 'Mallard Pointe');
  assert.match(t, /Post p1/);
  assert.match(t, /Fix:/);
});
