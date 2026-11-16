// Social: reactions beyond Like. One reaction per person per post, and every count is a list of people: the number and the names always agree.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureFeed } from '../../src/features/social/seed.js';
import { REACTIONS, KINDS, topKinds, describe, feedBy, reactorsOf } from '../../src/features/social/reactions.js';
import { timeline, react, toggleLike } from '../../src/features/social/staff-store.js';
import { timeline as residentTimeline, react as residentReact, toggleLike as residentLike, residentState } from '../../src/features/social/store.js';

const NOW = Date.parse('2026-11-10T15:00:00');
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), dump: () => Object.fromEntries(m) }; };
const fresh = () => { const s = mem(); ensureFeed(s, NOW); return s; };
const ME = 'Jordan Lee';
const post = (s, id) => timeline(s, ME).find((p) => p.id === id);
const rpost = (s, id, who = 'res-1') => residentTimeline(s, who).find((p) => p.id === id);
const agree = (p) => {
  for (const k of KINDS) assert.equal(p.reactors.filter((r) => r.kind === k).length, p.reactions[k], `${p.id} ${k}: the list and the count are the same people`);
  assert.equal(p.reactors.length, p.reactionTotal);
};

test('there are five reactions, Like first, each with a name and a picture', () => {
  assert.deepEqual(KINDS, ['like', 'love', 'laugh', 'wow', 'sad']);
  for (const r of REACTIONS) assert.ok(r.label && r.icon);
});

test('counting is the list: the people in order, a count for each reaction, a total, and readable words', () => {
  const r = reactorsOf([
    { name: 'Zed', role: 'Staff', kind: 'love' }, { name: 'Amy', role: 'Resident', kind: 'like' }, { name: 'Bob', role: 'Resident', kind: 'like' },
    { name: 'Me', role: 'Staff', kind: 'wow', you: true },
  ]);
  assert.deepEqual(r.people.map((p) => p.name), ['Me', 'Amy', 'Bob', 'Zed'], 'you first, then by reaction, then by name');
  assert.deepEqual(r.counts, { like: 2, love: 1, laugh: 0, wow: 1, sad: 0 });
  assert.equal(r.total, 4);
  assert.deepEqual(topKinds(r.counts), ['like', 'love', 'wow']);
  assert.equal(describe(r.counts), '2 likes, 1 love, 1 wow');
  assert.equal(describe({ like: 0, love: 0, laugh: 0, wow: 0, sad: 0 }), '');
});

test('every sample post names its people, and the count is exactly those people (no unnamed ones)', () => {
  const s = fresh();
  for (const p of timeline(s, ME)) { agree(p); assert.ok(p.reactionTotal > 0, `${p.id} has people who reacted`); }
  const p1 = post(s, 'p1');
  assert.equal(p1.reactionTotal, Object.keys(feedBy({ id: 'p1' })).length);
  for (const p of residentTimeline(s, 'res-1')) agree(p);
});

test('a number the feed kept before is not counted: nobody could be named for it', () => {
  const s = fresh();
  const feed = JSON.parse(s.getItem('eso-feed'));
  feed.posts.find((p) => p.id === 'p7').likes = 999;
  feed.posts.find((p) => p.id === 'p7').rx = { love: 40 };
  s.setItem('eso-feed', JSON.stringify(feed));
  assert.equal(post(s, 'p7').reactionTotal, Object.keys(feedBy({ id: 'p7' })).length);
});

test('a post nobody reacted to has none, and its first reaction makes it one', () => {
  const s = fresh();
  const feed = JSON.parse(s.getItem('eso-feed'));
  feed.posts.unshift({ id: 'u1', a: 'me', t: NOW, aud: 'all', src: 'com', txt: 'New', rs: [] });
  s.setItem('eso-feed', JSON.stringify(feed));
  assert.equal(post(s, 'u1').reactionTotal, 0);
  assert.equal(rpost(s, 'u1').reactionTotal, 0);
  residentReact(s, 'res-1', 'u1', 'love');
  assert.equal(post(s, 'u1').reactionTotal, 1);
  assert.equal(post(s, 'u1').reactions.love, 1);
  assert.equal(rpost(s, 'u1').reactionTotal, 1);
});

test('Staff react: one reaction per post, a different one replaces the first, the same one takes it back', () => {
  const s = fresh();
  const before = post(s, 'p2');
  assert.equal(before.myReaction, null);
  assert.deepEqual(react(s, 'p2', 'love'), { ok: true, kind: 'love' });
  assert.equal(post(s, 'p2').myReaction, 'love');
  assert.equal(post(s, 'p2').reactions.love, before.reactions.love + 1);
  assert.equal(post(s, 'p2').reactionTotal, before.reactionTotal + 1);
  assert.equal(post(s, 'p2').liked, false);
  assert.deepEqual(react(s, 'p2', 'like'), { ok: true, kind: 'like' });
  assert.equal(post(s, 'p2').reactions.love, before.reactions.love, 'the first one is gone when another replaces it');
  assert.equal(post(s, 'p2').likes, before.likes + 1);
  assert.equal(post(s, 'p2').liked, true);
  assert.equal(post(s, 'p2').reactionTotal, before.reactionTotal + 1, 'still one reaction from this person');
  assert.deepEqual(react(s, 'p2', 'like'), { ok: true, kind: null });
  assert.equal(post(s, 'p2').reactionTotal, before.reactionTotal);
  agree(post(s, 'p2'));
});

test('Like still works the way it did: toggleLike, and a feed that only knows lk', () => {
  const s = fresh();
  const n = post(s, 'p3').likes;
  assert.equal(toggleLike(s, 'p3'), true);
  assert.equal(post(s, 'p3').likes, n + 1);
  assert.equal(toggleLike(s, 'p3'), false);
  assert.equal(toggleLike(s, 'nope'), null);
  const feed = JSON.parse(s.getItem('eso-feed'));
  feed.posts.find((p) => p.id === 'p3').lk = 1; // kept by an earlier version: a Like, no `mr`
  s.setItem('eso-feed', JSON.stringify(feed));
  assert.equal(post(s, 'p3').myReaction, 'like');
  agree(post(s, 'p3'));
});

test('a bad reaction or a missing post changes nothing', () => {
  const s = fresh();
  const raw = s.getItem('eso-feed');
  assert.equal(react(s, 'p1', 'angry').ok, false);
  assert.equal(react(s, 'nope', 'love').ok, false);
  assert.equal(s.getItem('eso-feed'), raw);
  assert.equal(residentReact(s, 'res-1', 'p1', 'angry').ok, false);
});

test('Resident react: the same rules, kept in the resident’s own data, and a Like stays where Like always was', () => {
  const s = fresh();
  const before = rpost(s, 'p2');
  assert.deepEqual(residentReact(s, 'res-1', 'p2', 'laugh'), { ok: true, kind: 'laugh' });
  assert.equal(rpost(s, 'p2').myReaction, 'laugh');
  assert.equal(rpost(s, 'p2').reactions.laugh, before.reactions.laugh + 1);
  assert.deepEqual(residentState(s, 'res-1').reacts, { p2: 'laugh' });
  assert.equal(residentState(s, 'res-1').liked.has('p2'), false);
  assert.deepEqual(residentReact(s, 'res-1', 'p2', 'like'), { ok: true, kind: 'like' });
  assert.equal(residentState(s, 'res-1').liked.has('p2'), true);
  assert.deepEqual(residentState(s, 'res-1').reacts, {}, 'a Like replaces the other reaction');
  assert.equal(residentLike(s, 'res-1', 'p2'), false, 'the old toggle takes the Like back');
  assert.equal(rpost(s, 'p2').reactionTotal, before.reactionTotal);
  agree(rpost(s, 'p2'));
});

test('a resident cannot react to a post they cannot see; their reaction never changes the feed', () => {
  const s = fresh();
  const staffOnly = timeline(s, ME).find((p) => p.aud === 'staff');
  assert.equal(residentReact(s, 'res-1', staffOnly.id, 'love').ok, false);
  const feed = s.getItem('eso-feed');
  residentReact(s, 'res-1', 'p2', 'love');
  assert.equal(s.getItem('eso-feed'), feed);
});

test('Staff, and the other residents, count what a resident gave, by name; the resident is “You” to themselves', () => {
  const s = fresh();
  const before = post(s, 'p2');
  const b1 = rpost(s, 'p2', 'res-1');
  const b2 = rpost(s, 'p2', 'res-2');
  residentReact(s, 'res-1', 'p2', 'wow');
  residentReact(s, 'res-2', 'p2', 'like');
  const after = post(s, 'p2');
  assert.equal(after.reactions.wow, before.reactions.wow + 1);
  assert.equal(after.likes, before.likes + 1);
  assert.equal(after.reactionTotal, before.reactionTotal + 2);
  assert.equal(after.myReaction, null, 'not the Staff person’s own');
  assert.ok(after.reactors.some((r) => r.name === 'Alex Rivera' && r.kind === 'wow' && r.role === 'Resident'));
  assert.ok(after.reactors.some((r) => r.name === 'Priya Nair' && r.kind === 'like'));
  // the two residents see the same total, each with themselves as You
  const a1 = rpost(s, 'p2', 'res-1');
  const a2 = rpost(s, 'p2', 'res-2');
  assert.equal(a1.reactionTotal, b1.reactionTotal + 2);
  assert.equal(a2.reactionTotal, b2.reactionTotal + 2);
  assert.equal(a1.reactionTotal, after.reactionTotal, 'Staff and residents see the same number');
  assert.equal(a1.reactors[0].name, 'You');
  assert.equal(a1.reactors[0].kind, 'wow');
  assert.ok(a1.reactors.some((r) => r.name === 'Priya Nair' && r.kind === 'like'));
  assert.ok(!a1.reactors.some((r) => r.name === 'Alex Rivera'));
  agree(after); agree(a1); agree(a2);
});

test('the property team’s own reaction shows to residents as the Property team', () => {
  const s = fresh();
  react(s, 'p2', 'sad');
  const p = rpost(s, 'p2');
  assert.ok(p.reactors.some((r) => r.name === 'Property team' && r.kind === 'sad' && r.role === 'Staff'));
  agree(p);
});
