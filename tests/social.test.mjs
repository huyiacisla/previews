// Social as a resident sees it: only posts for everyone, a guidelines gate Staff control, like and reply but never
// posting, and a switch to hide the timeline. Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import * as social from '../src/social/store.js';
import { KEY, DEFAULT_GUIDELINES, socialOn, guidelines, canReply, needsGuidelines, acceptGuidelines, setShow, timeline, toggleLike, addReply, residentState, MAX_REPLY } from '../src/social/store.js';

const memory = (seed = {}) => {
  const m = new Map(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)) };
};
const post = (id, over = {}) => ({ id, a: 'me', t: 1000, aud: 'all', txt: `post ${id}`, likes: 2, rs: [], ...over });
const feed = (...posts) => ({ [KEY.feed]: { posts } });

test('residents never get a way to post', () => {
  const names = Object.keys(social);
  assert.equal(names.some((n) => /^(add|create|publish|submit)?post$/i.test(n) || /(createPost|addPost|publishPost|submitPost)/.test(n)), false);
});

test('only posts for everyone show; staff-only posts, bad data and Staff switching Social off do not', () => {
  const s = memory({ ...feed(post('1'), post('2', { aud: 'staff' }), post('3', { aud: 'residents' }), null, post('4', { a: 'alex' })) });
  assert.deepEqual(timeline(s, 'res-1').map((p) => p.id).sort(), ['1', '3', '4']);
  s.setItem(KEY.social, JSON.stringify({ on: false }));
  assert.equal(socialOn(s), false);
  assert.deepEqual(timeline(s, 'res-1'), []);
});

test('order: pinned first, then newest; neighbors never show a unit number', () => {
  const s = memory(feed(post('old', { t: 1 }), post('new', { t: 9 }), post('pin', { t: 2, pin: 1 }), post('n', { a: 'alex', t: 5 })));
  const t = timeline(s, 'res-1');
  assert.deepEqual(t.map((p) => p.id), ['pin', 'new', 'n', 'old']);
  assert.equal(t.find((p) => p.id === 'n').name, 'Alex Rivera');
  assert.equal(JSON.stringify(t).includes('Unit'), false);
  assert.equal(t.find((p) => p.id === 'new').name, 'Property team');
});

test('guidelines gate: Staff require it, a new version asks again, Staff can turn it off', () => {
  const s = memory({});
  assert.equal(guidelines(s).ver, DEFAULT_GUIDELINES.ver, 'defaults when Staff never changed anything');
  assert.equal(guidelines(s).blocks.length, 6);
  assert.equal(needsGuidelines(s, 'res-1'), true);
  assert.equal(acceptGuidelines(s, 'res-1'), true);
  assert.equal(needsGuidelines(s, 'res-1'), false);
  assert.equal(needsGuidelines(s, 'res-2'), true, 'acceptance is per resident');
  s.setItem(KEY.mod, JSON.stringify({ gl: { ver: 4, accept: true, blocks: [['New rule', 'Be kind.']] } }));
  assert.equal(needsGuidelines(s, 'res-1'), true, 'a new version asks again');
  assert.deepEqual(guidelines(s).blocks, [['New rule', 'Be kind.']]);
  s.setItem(KEY.mod, JSON.stringify({ gl: { ver: 4, accept: false } }));
  assert.equal(needsGuidelines(s, 'res-1'), false, 'Staff turned the requirement off');
});

test('hiding the timeline is the resident’s own switch and is remembered', () => {
  const s = memory(feed(post('1')));
  assert.equal(residentState(s, 'res-1').show, true);
  assert.equal(timeline(s, 'res-1').length, 1);
  setShow(s, 'res-1', false);
  assert.deepEqual(timeline(s, 'res-1'), []);
  assert.equal(timeline(s, 'res-2').length, 1, 'other residents are not affected');
  setShow(s, 'res-1', true);
  assert.equal(timeline(s, 'res-1').length, 1);
});

test('like toggles per resident; hidden posts cannot be liked', () => {
  // A number the feed kept ("likes": 2) is not counted: a like is a person. Nobody liked this post, then one resident did, and everyone sees them.
  const s = memory(feed(post('1', { likes: 2 }), post('2', { aud: 'staff' })));
  assert.equal(timeline(s, 'res-1')[0].likes, 0);
  assert.equal(toggleLike(s, 'res-1', '1'), true);
  assert.equal(timeline(s, 'res-1')[0].likes, 1);
  assert.equal(timeline(s, 'res-1')[0].liked, true);
  assert.equal(timeline(s, 'res-2')[0].likes, 1, 'another resident sees that one person liked it');
  assert.equal(timeline(s, 'res-2')[0].liked, false, 'but it is not their like');
  assert.equal(toggleLike(s, 'res-1', '1'), false);
  assert.equal(timeline(s, 'res-2')[0].likes, 0);
  assert.equal(toggleLike(s, 'res-1', '2'), null, 'staff-only post');
  assert.equal(toggleLike(s, 'res-1', 'nope'), null);
});

test('reply: trimmed, limited, only on visible posts, off when Staff restrict replies; Staff data is untouched', () => {
  const s = memory(feed(post('1', { rs: [{ id: 'r1', a: 'dana', t: 5, txt: 'Hello', likes: 1 }] }), post('2', { aud: 'staff' })));
  const before = s.getItem(KEY.feed);
  const r = addReply(s, 'res-1', '1', '  Thanks!  ', 50);
  assert.equal(r.ok, true);
  assert.equal(r.reply.text, 'Thanks!');
  const replies = timeline(s, 'res-1')[0].replies;
  assert.deepEqual(replies.map((x) => [x.name, x.text]), [['Dana Whitfield', 'Hello'], ['You', 'Thanks!']]);
  assert.deepEqual(timeline(s, 'res-2')[0].replies.map((x) => [x.name, x.mine]), [['Dana Whitfield', false], ['Alex Rivera', false]], 'another resident reads it, by name, and it is not theirs');
  assert.equal(s.getItem(KEY.feed), before, 'the Staff feed is never written to');
  assert.equal(addReply(s, 'res-1', '1', '   ').ok, false);
  assert.equal(addReply(s, 'res-1', '1', 'x'.repeat(MAX_REPLY + 1)).ok, false);
  assert.equal(addReply(s, 'res-1', '2', 'hi').ok, false, 'staff-only post');
  s.setItem(KEY.mod, JSON.stringify({ perms: { reply: 'staff' } }));
  assert.equal(canReply(s), false);
  assert.equal(addReply(s, 'res-1', '1', 'hi').ok, false);
});

test('images: only gradients pass; broken storage is harmless', () => {
  const s = memory(feed(post('1', { img: [['linear-gradient(135deg,#334155,#64748b)', 'Garage'], ['url(javascript:alert(1))', 'bad']] })));
  assert.deepEqual(timeline(s, 'res-1')[0].images.map((i) => i.alt), ['Garage']);
  const broken = { getItem: () => '{nope', setItem: () => { throw new Error('full'); } };
  assert.deepEqual(timeline(broken, 'res-1'), []);
  assert.equal(guidelines(broken).ver, DEFAULT_GUIDELINES.ver);
  assert.equal(setShow(broken, 'res-1', false), false);
});
