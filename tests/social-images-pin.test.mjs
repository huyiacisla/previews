// Social: photos on a Staff post (what may be kept and shown), and pinning a post to the top. Real stores, no DOM.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureFeed } from '../src/social/seed.js';
import { safeBg, checkImages, fitSize, photoBg, MAX_IMAGES, MAX_DATA_CHARS } from '../src/social/images.js';
import * as staff from '../src/social/staff-store.js';
import * as res from '../src/social/store.js';

const NOW = Date.parse('2026-11-10T15:00:00');
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const fresh = () => { const s = mem(); ensureFeed(s, NOW); return s; };
const B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const photo = (type = 'jpeg') => photoBg(`data:image/${type};base64,${B64}`);

test('what may be shown: gradients and small photos; never an address, a script or the wrong kind', () => {
  assert.equal(safeBg('linear-gradient(135deg,#334155,#64748b)'), 'linear-gradient(135deg,#334155,#64748b)');
  assert.equal(safeBg(photo('jpeg')), photo('jpeg'));
  assert.equal(safeBg(photo('png')), photo('png'));
  assert.equal(safeBg(photo('webp')), photo('webp'));
  for (const bad of [
    'url(https://example.test/x.jpg) center/cover no-repeat', 'url("javascript:alert(1)") center/cover no-repeat',
    `url("data:image/svg+xml;base64,${B64}") center/cover no-repeat`, `url("data:text/html;base64,${B64}") center/cover no-repeat`,
    `url("data:image/jpeg;base64,${B64}");color:red`, `url("data:image/jpeg;base64,${B64}") center/cover no-repeat; x`, 'red', '', null, 42, undefined,
  ]) assert.equal(safeBg(bad), '', String(bad).slice(0, 50));
  const huge = photoBg(`data:image/jpeg;base64,${'A'.repeat(MAX_DATA_CHARS + 200)}`);
  assert.equal(safeBg(huge), '', 'too large to keep');
});

test('shrinking: the long side at most the limit, the shape kept, never made larger', () => {
  assert.deepEqual(fitSize(4000, 3000, 1280), { w: 1280, h: 960 });
  assert.deepEqual(fitSize(3000, 4000, 1280), { w: 960, h: 1280 });
  assert.deepEqual(fitSize(800, 600, 1280), { w: 800, h: 600 });
  assert.deepEqual(fitSize(0, 0), { w: 0, h: 0 });
  assert.deepEqual(fitSize(10000, 1, 1280), { w: 1280, h: 1 });
});

test('a list of photos: up to four, each valid, with a description (or "Photo")', () => {
  assert.deepEqual(checkImages([]), { ok: true, images: [] });
  assert.deepEqual(checkImages([[photo(), '  A line of cars  '], [photo(), '']]).images.map((i) => i[1]), ['A line of cars', 'Photo']);
  assert.equal(checkImages(Array.from({ length: MAX_IMAGES + 1 }, () => [photo(), ''])).ok, false, 'a fifth is refused');
  assert.equal(checkImages([[photo(), ''], ['url(https://x.test/a.png)', '']]).ok, false, 'one bad photo refuses the list');
  assert.equal(checkImages([[photo(), 'x'.repeat(121)]]).ok, false, 'a description of a sensible length');
  assert.deepEqual(checkImages(undefined), { ok: true, images: [] });
});

test('a post with photos: kept with the post, read by Staff and by residents, photos only is allowed', () => {
  const s = fresh();
  const r = staff.addPost(s, { text: 'New signs on level 2', aud: 'all', images: [[photo(), 'The new sign'], [photo('png'), '']] }, NOW);
  assert.ok(r.ok, r.reason);
  const mineP = staff.timeline(s, 'Jordan Lee').find((p) => p.id === r.post.id);
  assert.deepEqual(mineP.images.map((i) => i.alt), ['The new sign', 'Photo']);
  assert.equal(mineP.images[0].bg, photo());
  const theirs = res.timeline(s, 'res-1', { limit: 50, now: NOW + 1 }).find((p) => p.id === r.post.id);
  assert.equal(theirs.images.length, 2, 'residents see the photos too');
  const only = staff.addPost(s, { text: '', aud: 'all', images: [[photo(), 'A sunset over the garage']] }, NOW + 5);
  assert.ok(only.ok, 'photos only');
  assert.equal(staff.addPost(s, { text: '', aud: 'all', images: [] }, NOW + 9).reason, 'Write something first.', 'no words and no photos');
  assert.equal(staff.addPost(s, { text: 'x', aud: 'all', images: [['url(https://x.test/a.png)', '']] }, NOW + 10).ok, false);
});

test('a stored post with a bad picture shows without it (never a remote address or a script)', () => {
  const s = fresh();
  const feed = JSON.parse(s.getItem('eso-feed'));
  feed.posts[0].img = [['url(https://x.test/a.png) center/cover no-repeat', 'bad'], [photo(), 'good']];
  s.setItem('eso-feed', JSON.stringify(feed));
  const id = feed.posts[0].id;
  assert.deepEqual(staff.timeline(s, 'Jordan Lee').find((p) => p.id === id).images.map((i) => i.alt), ['good']);
  assert.deepEqual(res.timeline(s, 'res-1', { limit: 50, now: NOW + 1 }).find((p) => p.id === id).images.map((i) => i.alt), ['good']);
});

test('editing a post: photos stay unless a list is given; a list replaces them, an empty one removes them', () => {
  const s = fresh();
  const p = staff.addPost(s, { text: 'With photos', aud: 'all', images: [[photo(), 'a'], [photo(), 'b']] }, NOW).post;
  assert.ok(staff.editPost(s, p.id, { text: 'Changed words', aud: 'all' }, NOW + 1).ok);
  assert.equal(staff.timeline(s, 'Jordan Lee').find((x) => x.id === p.id).images.length, 2, 'left out: kept');
  assert.ok(staff.editPost(s, p.id, { text: 'Changed words', aud: 'all', images: [[photo(), 'only one']] }, NOW + 2).ok);
  assert.deepEqual(staff.timeline(s, 'Jordan Lee').find((x) => x.id === p.id).images.map((i) => i.alt), ['only one']);
  assert.equal(staff.editPost(s, p.id, { text: '', aud: 'all', images: [] }, NOW + 3).reason, 'Write something first.', 'taking the last photo off a post with no words');
  assert.ok(staff.editPost(s, p.id, { text: 'Words only now', aud: 'all', images: [] }, NOW + 4).ok);
  assert.equal(staff.timeline(s, 'Jordan Lee').find((x) => x.id === p.id).images.length, 0);
});

test('a post that does not fit in storage is refused with a reason about the photos', () => {
  const s = fresh();
  const real = s.setItem;
  s.setItem = () => { throw new Error('QuotaExceededError'); };
  const r = staff.addPost(s, { text: 'x', aud: 'all', images: [[photo(), '']] }, NOW);
  s.setItem = real;
  assert.equal(r.ok, false);
  assert.match(r.reason, /not room to keep these photos/);
});

test('pinning: your own posts only, at most three at once, and unpinning always works', () => {
  const s = fresh();
  const pinned = () => staff.timeline(s, 'Jordan Lee').filter((p) => p.pinned).map((p) => p.id);
  assert.deepEqual(pinned(), ['p1'], 'the sample announcement starts pinned');
  const ids = ['a', 'b', 'c'].map((t, i) => staff.addPost(s, { text: `Post ${t}`, aud: 'all' }, NOW + 10 * (i + 1)).post.id);
  assert.ok(staff.pinPost(s, ids[0]).ok);
  assert.ok(staff.pinPost(s, ids[1]).ok);
  const refused = staff.pinPost(s, ids[2]);
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /up to 3 posts/);
  assert.ok(staff.pinPost(s, ids[0]).ok, 'pinning one that is already pinned is not a fourth');
  assert.deepEqual(pinned().sort(), ['p1', ids[0], ids[1]].sort());
  assert.deepEqual(staff.timeline(s, 'Jordan Lee').slice(0, 3).map((p) => p.pinned), [true, true, true], 'pinned first');
  assert.deepEqual(staff.pinPost(s, 'p1', false), { ok: true, pinned: false });
  assert.ok(staff.pinPost(s, ids[2]).ok, 'room again');
  assert.equal(res.timeline(s, 'res-1', { limit: 50, now: NOW + 100 }).find((p) => p.id === 'p1').pinned, false, 'residents see it unpinned');
  assert.equal(staff.pinPost(s, 'p3').reason, 'You can only pin your own posts.');
  assert.equal(staff.pinPost(s, 'nope').reason, 'This post is no longer available.');
});
