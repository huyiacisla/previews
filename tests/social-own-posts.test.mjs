// Social (Staff): change or delete a post of your own. Somebody else's post is never yours to change.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureFeed } from '../src/social/seed.js';
import { timeline, addPost, editPost, deletePost, profileStats, MAX_POST } from '../src/social/staff-store.js';
import { timeline as residentTimeline } from '../src/social/store.js';

const NOW = Date.parse('2026-11-10T15:00:00');
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const fresh = () => { const s = mem(); ensureFeed(s, NOW); return s; };
const ME = 'Jordan Lee';
const find = (s, id) => timeline(s, ME).find((p) => p.id === id);

test('your own post can be changed: the words, who sees it, and whether it is an announcement', () => {
  const s = fresh();
  const r = addPost(s, { text: 'Lot B is closed Saturday', aud: 'all' }, NOW);
  assert.ok(r.ok);
  const id = r.post.id;
  assert.equal(find(s, id).kind, 'Community post');
  const e = editPost(s, id, { text: 'Lot B is closed Saturday and Sunday', aud: 'residents', announcement: true }, NOW + 5000);
  assert.ok(e.ok);
  const p = find(s, id);
  assert.equal(p.text, 'Lot B is closed Saturday and Sunday');
  assert.equal(p.aud, 'residents');
  assert.equal(p.kind, 'Announcement');
  assert.equal(p.edited, true);
  assert.equal(p.t, NOW, 'the time it was posted does not move');
  // back to a plain post
  assert.ok(editPost(s, id, { text: 'Lot B is closed Saturday and Sunday', aud: 'all', announcement: false }, NOW + 9000).ok);
  assert.equal(find(s, id).kind, 'Community post');
});

test('a changed post keeps its likes and replies, and is marked edited only once changed', () => {
  const s = fresh();
  const before = find(s, 'p1');
  assert.equal(before.edited, false);
  assert.ok(before.likes > 0 && before.replies.length > 0);
  assert.ok(editPost(s, 'p1', { text: 'Garage cleaning moved to Sunday.', aud: 'all', announcement: true }, NOW).ok);
  const after = find(s, 'p1');
  assert.equal(after.likes, before.likes);
  assert.equal(after.replies.length, before.replies.length);
  assert.equal(after.pinned, before.pinned);
  assert.equal(after.edited, true);
});

test('making a post staff-only takes it away from residents at once', () => {
  const s = fresh();
  const id = addPost(s, { text: 'Parking note', aud: 'all' }, NOW).post.id;
  assert.ok(residentTimeline(s, 'res-1').some((p) => p.id === id));
  assert.ok(editPost(s, id, { text: 'Parking note', aud: 'staff', announcement: false }, NOW + 1).ok);
  assert.ok(!residentTimeline(s, 'res-1').some((p) => p.id === id));
  assert.equal(find(s, id).kind, 'Staff discussion');
});

test('a post written by somebody else cannot be changed or deleted', () => {
  const s = fresh();
  const other = find(s, 'p2');
  assert.equal(other.mine, false);
  assert.equal(editPost(s, 'p2', { text: 'Hijacked', aud: 'all' }, NOW).ok, false);
  assert.equal(deletePost(s, 'p2').ok, false);
  assert.equal(find(s, 'p2').text, other.text);
});

test('a changed post must still meet the rules of a new one', () => {
  const s = fresh();
  const id = addPost(s, { text: 'Hello', aud: 'all' }, NOW).post.id;
  assert.equal(editPost(s, id, { text: '   ', aud: 'all' }, NOW).ok, false);
  assert.equal(editPost(s, id, { text: 'x'.repeat(MAX_POST + 1), aud: 'all' }, NOW).ok, false);
  assert.equal(editPost(s, id, { text: 'Hi', aud: 'nobody' }, NOW).ok, false);
  assert.equal(editPost(s, id, { text: 'Hi', aud: 'staff', announcement: true }, NOW).ok, false);
  assert.equal(find(s, id).text, 'Hello', 'a refused change leaves the post as it was');
  assert.equal(find(s, id).edited, false);
  assert.equal(editPost(s, 'nope', { text: 'Hi', aud: 'all' }, NOW).ok, false);
});

test('deleting your post removes it, its replies and its likes, for residents too', () => {
  const s = fresh();
  const count = profileStats(s, ME).posts;
  assert.ok(residentTimeline(s, 'res-1').some((p) => p.id === 'p1'));
  assert.ok(deletePost(s, 'p1').ok);
  assert.equal(find(s, 'p1'), undefined);
  assert.ok(!residentTimeline(s, 'res-1').some((p) => p.id === 'p1'));
  assert.equal(profileStats(s, ME).posts, count - 1);
  assert.equal(deletePost(s, 'p1').ok, false, 'a second delete finds nothing');
  assert.ok(find(s, 'p2'), 'other posts stay');
});

test('storage that cannot be written says so and changes nothing', () => {
  const s = fresh();
  const broken = { getItem: (k) => s.getItem(k), setItem: () => { throw new Error('full'); } };
  assert.equal(editPost(broken, 'p1', { text: 'New words', aud: 'all', announcement: true }, NOW).ok, false);
  assert.equal(deletePost(broken, 'p1').ok, false);
  assert.ok(find(s, 'p1'));
});
