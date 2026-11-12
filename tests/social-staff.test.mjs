import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureFeed, seedPosts } from '../src/social/seed.js';
import { timeline, ownAnnouncements, toggleLike, addReply, addPost, applyMute, muteThread, following, AUDIENCES, MAX_POST } from '../src/social/staff-store.js';
import { timeline as residentTimeline } from '../src/social/store.js';

const NOW = Date.parse('2026-11-10T15:00:00');
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const fresh = () => { const s = mem(); ensureFeed(s, NOW); return s; };
const ME = 'Jordan Lee';

test('a browser that never opened the prototype still gets the sample timeline, once', () => {
  const s = mem();
  assert.equal(ensureFeed(s, NOW), true);
  const first = s.getItem('eso-feed');
  assert.equal(ensureFeed(s, NOW + 1000), false, 'an existing timeline is never replaced');
  assert.equal(s.getItem('eso-feed'), first);
  assert.equal(JSON.parse(first).posts.length, seedPosts(NOW).length);
  const broken = { getItem: () => null, setItem: () => { throw new Error('full'); } };
  assert.equal(ensureFeed(broken, NOW), false, 'broken storage is harmless');
});

test('Staff see every post, residents never see the ones for staff', () => {
  const s = fresh();
  const staff = timeline(s, ME);
  assert.equal(staff.length, 9);
  assert.ok(staff.some((p) => p.aud === 'staff'), 'staff-only posts are there');
  const res = residentTimeline(s, 'res-1');
  assert.ok(res.length < staff.length);
  assert.ok(res.every((p) => !staff.find((x) => x.id === p.id && x.aud === 'staff')), 'no staff-only post reaches a resident');
});

test('pinned first, then newest; the person using the app is named by their own name', () => {
  const list = timeline(fresh(), ME);
  assert.equal(list[0].pinned, true);
  const rest = list.slice(1);
  for (let i = 1; i < rest.length; i += 1) assert.ok(rest[i - 1].t >= rest[i].t);
  assert.equal(list.find((p) => p.id === 'p1').name, ME);
  assert.equal(list.find((p) => p.id === 'p1').mine, true);
  assert.equal(list.find((p) => p.id === 'p2').name, 'Dana Whitfield');
  assert.equal(list.find((p) => p.id === 'p5').kind, 'Community post');
  assert.equal(list.find((p) => p.id === 'p3').kind, 'Staff discussion');
});

test('comments are read in order, with the answers under them', () => {
  const p1 = timeline(fresh(), ME).find((p) => p.id === 'p1');
  assert.deepEqual(p1.replies.map((r) => [r.id, r.depth]), [['r1', 0], ['r1a', 1], ['r2', 0], ['r3', 0]]);
  assert.equal(p1.replies.find((r) => r.id === 'r1a').name, ME);
});

test('an answer to a comment sits right under it', () => {
  const s = fresh();
  const r = addReply(s, 'p1', 'Yes, the gate stays open.', { to: 'r3' }, NOW);
  assert.equal(r.ok, true);
  const p1 = timeline(s, ME).find((p) => p.id === 'p1');
  assert.deepEqual(p1.replies.map((x) => x.id).slice(-2), ['r3', `m${NOW}`]);
  assert.equal(p1.replies.at(-1).depth, 1);
});

test('replies are checked: not empty, not too long, only on a post or comment that exists', () => {
  const s = fresh();
  assert.equal(addReply(s, 'p1', '   ').ok, false);
  assert.equal(addReply(s, 'p1', 'x'.repeat(501)).ok, false);
  assert.equal(addReply(s, 'nope', 'hello').ok, false);
  assert.equal(addReply(s, 'p1', 'hello', { to: 'nope' }).ok, false);
  assert.equal(addReply(s, 'p1', 'hello').ok, true);
});

test('liking toggles and keeps the count honest', () => {
  const s = fresh();
  const n = timeline(s, ME).find((p) => p.id === 'p5').likes;
  assert.equal(toggleLike(s, 'p5'), true);
  assert.equal(timeline(s, ME).find((p) => p.id === 'p5').likes, n + 1);
  assert.equal(toggleLike(s, 'p5'), false);
  assert.equal(timeline(s, ME).find((p) => p.id === 'p5').likes, n);
  assert.equal(toggleLike(s, 'nope'), null);
});

test('posting: who may see it, announcements are for residents, and residents see what is for them', () => {
  const s = fresh();
  assert.equal(addPost(s, { text: '' }).ok, false);
  assert.equal(addPost(s, { text: 'x'.repeat(MAX_POST + 1) }).ok, false);
  assert.equal(addPost(s, { text: 'hi', aud: 'everyone' }).ok, false);
  assert.equal(addPost(s, { text: 'hi', aud: 'staff', announcement: true }).ok, false, 'a staff-only announcement makes no sense');
  const staffOnly = addPost(s, { text: 'Night shift: lot B lights are out.', aud: 'staff' }, NOW);
  const notice = addPost(s, { text: 'Pool closes at 8 tonight.', aud: 'all', announcement: true }, NOW + 1000);
  assert.equal(staffOnly.ok && notice.ok, true);
  assert.deepEqual(Object.keys(AUDIENCES), ['all', 'residents', 'staff']);
  const staff = timeline(s, ME);
  assert.equal(staff.length, 11);
  assert.equal(staff.find((p) => p.id === notice.post.id).announcement, true);
  assert.equal(staff.find((p) => p.id === notice.post.id).mine, true);
  const res = residentTimeline(s, 'res-1');
  assert.ok(res.some((p) => p.id === notice.post.id), 'the announcement reaches residents');
  assert.ok(!res.some((p) => p.id === staffOnly.post.id), 'the staff note does not');
  assert.ok(ownAnnouncements(s, ME).some((a) => a.id === notice.post.id));
});

test('mute settings hold posts back, never your own, and a muted thread stays muted', () => {
  const s = fresh();
  const all = timeline(s, ME);
  const m = applyMute(s, all);
  assert.equal(m.hidden, 1, 'the sample mute list holds back the lost-and-found thread');
  assert.ok(!m.shown.some((p) => p.id === 'p7'));
  assert.equal(muteThread(s, 'p5'), true);
  const after = applyMute(s, timeline(s, ME));
  assert.equal(after.hidden, 2);
  assert.ok(after.shown.every((p) => p.id !== 'p5'));
  muteThread(s, 'p1');
  assert.ok(applyMute(s, timeline(s, ME)).shown.some((p) => p.id === 'p1'), 'a thread you started cannot be muted away');
  assert.deepEqual(following(s), ['dana', 'kim']);
});

test('views fill in for a timeline an earlier visit kept without them', () => {
  const s = fresh();
  const raw = JSON.parse(s.getItem('eso-feed'));
  for (const p of raw.posts) delete p.vw;
  s.setItem('eso-feed', JSON.stringify(raw));
  assert.equal(timeline(s, ME).find((p) => p.id === 'p1').views, 523);
  assert.equal(timeline(s, ME).find((p) => p.id === 'p3').views, 0);
});

test('writing back keeps what the prototype keeps in the same record', () => {
  const s = fresh();
  const raw = JSON.parse(s.getItem('eso-feed'));
  raw.follow = ['luis'];
  raw.seen = 4;
  s.setItem('eso-feed', JSON.stringify(raw));
  addPost(s, { text: 'hello' }, NOW);
  const after = JSON.parse(s.getItem('eso-feed'));
  assert.deepEqual(after.follow, ['luis']);
  assert.equal(after.seen, 4);
});
