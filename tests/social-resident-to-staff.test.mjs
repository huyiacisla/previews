// Social: what a resident does (reply, like) reaches Staff, and Staff's answer reaches the resident, without the Resident app ever writing Staff's data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureFeed } from '../src/social/seed.js';
import { timeline, addReply, toggleLike } from '../src/social/staff-store.js';
import { timeline as residentTimeline, addReply as residentReply, toggleLike as residentLike } from '../src/social/store.js';

const NOW = Date.parse('2026-11-10T15:00:00');
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), dump: () => Object.fromEntries(m) }; };
const fresh = () => { const s = mem(); ensureFeed(s, NOW); return s; };
const ME = 'Jordan Lee';
const post = (s, id) => timeline(s, ME).find((p) => p.id === id);

test('a resident’s reply shows in the post for Staff, under the name of that resident', () => {
  const s = fresh();
  const before = post(s, 'p1').replies.length;
  assert.ok(residentReply(s, 'res-1', 'p1', 'Is the roof level open too?', NOW).ok);
  const p = post(s, 'p1');
  assert.equal(p.replies.length, before + 1);
  const mine = p.replies.find((r) => r.text === 'Is the roof level open too?');
  assert.equal(mine.name, 'Alex Rivera');
  assert.equal(mine.role, 'Resident');
});

test('Staff answer it: the answer sits under the question, and the resident reads the answer after it', () => {
  const s = fresh();
  const q = residentReply(s, 'res-1', 'p1', 'Is the roof level open too?', NOW).reply;
  const a = addReply(s, 'p1', 'Yes, until 6 AM.', { to: q.id }, NOW + 60000);
  assert.ok(a.ok);
  const list = post(s, 'p1').replies;
  const at = list.findIndex((r) => r.text === 'Is the roof level open too?');
  assert.equal(list[at + 1].text, 'Yes, until 6 AM.');
  assert.equal(list[at + 1].depth, list[at].depth + 1);
  assert.equal(list[at + 1].name, ME);
  // the resident sees the answer, after their own words
  const seen = residentTimeline(s, 'res-1').find((p) => p.id === 'p1').replies;
  const i = seen.findIndex((r) => r.text === 'Is the roof level open too?');
  assert.equal(seen[i].mine, true);
  assert.equal(seen[i + 1].text, 'Yes, until 6 AM.');
});

test('Staff never write into what a resident keeps, and a resident’s words stay in the resident’s own data', () => {
  const s = fresh();
  const q = residentReply(s, 'res-1', 'p1', 'Question', NOW).reply;
  const keptByResident = s.getItem('eso-res-social:res-1');
  addReply(s, 'p1', 'Answer', { to: q.id }, NOW + 1);
  toggleLike(s, 'p1');
  assert.equal(s.getItem('eso-res-social:res-1'), keptByResident);
  const feed = JSON.parse(s.getItem('eso-feed'));
  assert.ok(!JSON.stringify(feed).includes('Question'), 'the resident’s question is not copied into the feed');
  assert.ok(feed.posts.find((p) => p.id === 'p1').rs.some((r) => r.txt === 'Answer' && r.re === q.id));
});

test('a resident’s like counts for Staff, and goes away when they unlike', () => {
  const s = fresh();
  const base = post(s, 'p2').likes;
  assert.equal(residentLike(s, 'res-1', 'p2'), true);
  assert.equal(post(s, 'p2').likes, base + 1);
  assert.equal(post(s, 'p2').liked, false, 'that is not the Staff person’s own like');
  assert.equal(residentLike(s, 'res-1', 'p2'), false);
  assert.equal(post(s, 'p2').likes, base);
});

test('an answer to a comment that does not exist is refused', () => {
  const s = fresh();
  assert.equal(addReply(s, 'p1', 'Hello', { to: 'm404' }, NOW).ok, false);
});

test('a resident also reads the answers Staff wrote under other comments, not only the comments at the top', () => {
  const s = fresh();
  const staffView = post(s, 'p1').replies;
  const residentView = residentTimeline(s, 'res-1').find((p) => p.id === 'p1').replies;
  assert.ok(staffView.some((r) => r.depth > 0), 'the sample has an answer under a comment');
  assert.equal(residentView.length, staffView.length);
});
