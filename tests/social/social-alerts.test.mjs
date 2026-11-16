// Social: what the bell tells each person. Real people through the real stores: a resident replying to another resident's comment, to Staff's, and Staff
// replying to a resident, then what each of them is told and where the bell would take them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureFeed } from '../../src/features/social/seed.js';
import { socialAlerts } from '../../src/features/social/alerts.js';
import { timeline as staffTimeline, addReply as staffReply } from '../../src/features/social/staff-store.js';
import { timeline as residentTimeline, addReply as residentReply } from '../../src/features/social/store.js';

const NOW = Date.parse('2026-11-10T15:00:00');
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const fresh = () => { const s = mem(); ensureFeed(s, NOW); return s; };
const ME = 'Jordan Lee';
const forResident = (s, id) => socialAlerts(residentTimeline(s, id), { staff: false });
const forStaff = (s) => socialAlerts(staffTimeline(s, ME), { staff: true });
const replies = (list) => list.filter((a) => a.meta === 'Replies');

test('a resident is told when another resident answers their comment, and the bell points at that answer', () => {
  const s = fresh();
  const before = replies(forResident(s, 'res-1')).length;
  const a = residentReply(s, 'res-2', 'p1', 'Same question here!', NOW, 'r1'); // Priya Nair answers Alex's comment
  assert.ok(a.ok);
  const list = replies(forResident(s, 'res-1'));
  assert.equal(list.length, before + 1);
  const item = list.find((x) => x.comment === a.reply.id);
  assert.ok(item, 'the answer is in the list');
  assert.match(item.what, /^replied to your comment: “Same question here!”$/);
  assert.equal(item.post, 'p1');
  assert.equal(item.who, 'Priya Nair');
  // the place it points at exists for the person it is told to
  const post = residentTimeline(s, 'res-1').find((p) => p.id === 'p1');
  assert.ok(post.replies.some((r) => r.id === item.comment && r.parentId === 'r1'), 'the comment is in the post, under the one it answers');
});

test('nobody is told about their own words', () => {
  const s = fresh();
  residentReply(s, 'res-1', 'p1', 'Thanks!', NOW, 'r1a');
  assert.ok(replies(forResident(s, 'res-1')).every((a) => a.who !== 'You'));
  assert.ok(!forResident(s, 'res-1').some((a) => /Thanks!/.test(a.what)));
});

test('comments that were already on a post before a resident joined it are never news for them', () => {
  const s = fresh();
  assert.equal(replies(forResident(s, 'res-3')).length, 0, 'a resident who commented nowhere is told about no replies');
  assert.ok(forResident(s, 'res-3').some((a) => a.meta === 'C&A'), 'but announcements still reach them');
  residentReply(s, 'res-3', 'p1', 'Joining in', NOW); // joins now
  assert.equal(replies(forResident(s, 'res-3')).length, 0, 'the older comments stay old');
  const later = residentReply(s, 'res-2', 'p1', 'Welcome!', NOW + 60000);
  const list = replies(forResident(s, 'res-3'));
  assert.equal(list.length, 1);
  assert.equal(list[0].comment, later.reply.id);
  assert.match(list[0].what, /^also replied/);
});

test('Staff are told when a resident answers one of their comments, and when a resident replies to a post of theirs', () => {
  const s = fresh();
  const toStaff = residentReply(s, 'res-1', 'p1', 'Great, thank you Jordan!', NOW, 'r1a'); // r1a is Staff's answer to Alex
  assert.ok(toStaff.ok);
  const item = forStaff(s).find((a) => a.comment === toStaff.reply.id);
  assert.ok(item);
  assert.match(item.what, /^replied to your comment: /);
  assert.equal(item.who, 'Alex Rivera');
  // p1 is Staff's own post: a resident answering a neighbor's comment under it is still news, and says to whom
  const side = residentReply(s, 'res-2', 'p1', 'Me too', NOW + 1000, 'r2'); // Nadia Shah's comment
  const sideItem = forStaff(s).find((a) => a.comment === side.reply.id);
  assert.ok(sideItem);
  assert.match(sideItem.what, /^replied to Nadia Shah: /);
});

test('Staff are told about an answer to their comment even on a post that is not theirs', () => {
  const s = fresh();
  const p5 = staffTimeline(s, ME).find((p) => p.id === 'p5');
  assert.equal(p5.mine, false, 'p5 is a neighbor’s post');
  const mine = staffReply(s, 'p5', 'Thanks for raising this.', {}, NOW);
  assert.ok(mine.ok);
  assert.equal(forStaff(s).filter((a) => a.post === 'p5' && a.meta === 'Replies').length, 0, 'before anyone answers, there is nothing');
  const answer = residentReply(s, 'res-1', 'p5', 'You’re welcome!', NOW + 1000, mine.reply.id);
  assert.ok(answer.ok);
  const item = forStaff(s).find((a) => a.comment === answer.reply.id);
  assert.ok(item, 'the answer to a Staff comment is news');
  assert.match(item.what, /^replied to your comment/);
});

test('Staff are not told about a resident answering a neighbor on somebody else’s post', () => {
  const s = fresh();
  const posts = staffTimeline(s, ME);
  const notMine = posts.find((p) => !p.mine && p.aud !== 'staff' && p.replies.length > 0);
  assert.ok(notMine, 'the sample has a post of another author with a comment');
  const target = notMine.replies[0];
  const r = residentReply(s, 'res-2', notMine.id, 'Agreed', NOW, target.id);
  assert.ok(r.ok, 'a resident can answer a comment on a post they can see');
  assert.ok(!forStaff(s).some((a) => a.comment === r.reply.id));
});

test('a resident is told when Staff answer them, and where', () => {
  const s = fresh();
  const mine = residentReply(s, 'res-2', 'p1', 'Is the roof open?', NOW);
  const answer = staffReply(s, 'p1', 'Yes until 6 AM.', { to: mine.reply.id }, NOW + 5000);
  assert.ok(answer.ok);
  const item = forResident(s, 'res-2').find((a) => a.comment === answer.reply.id);
  assert.ok(item);
  assert.match(item.what, /^replied to your comment: “Yes until 6 AM\.”$/);
  const post = residentTimeline(s, 'res-2').find((p) => p.id === item.post);
  const there = post.replies.find((r) => r.id === item.comment);
  assert.equal(there.parentId, mine.reply.id);
  assert.equal(there.role, 'Staff');
  assert.equal(there.name, 'Property team');
});

test('every alert about a reply points at a comment the person can open', () => {
  const s = fresh();
  residentReply(s, 'res-1', 'p1', 'x', NOW, 'r2');
  residentReply(s, 'res-2', 'p1', 'y', NOW + 1, 'r1');
  staffReply(s, 'p1', 'z', { to: 'r1' }, NOW + 2);
  for (const [who, list, posts] of [
    ['res-1', forResident(s, 'res-1'), residentTimeline(s, 'res-1')],
    ['res-2', forResident(s, 'res-2'), residentTimeline(s, 'res-2')],
    ['staff', forStaff(s), staffTimeline(s, ME)],
  ]) {
    for (const a of replies(list)) {
      const p = posts.find((x) => x.id === a.post);
      assert.ok(p, `${who}: the post of "${a.what}" is there`);
      assert.ok(p.replies.some((r) => r.id === a.comment), `${who}: the comment of "${a.what}" is there`);
    }
  }
});

test('alerts come newest first and each id is unique', () => {
  const s = fresh();
  residentReply(s, 'res-2', 'p1', 'one', NOW, 'r1');
  residentReply(s, 'res-3', 'p1', 'two', NOW + 1000, 'r1');
  const list = forResident(s, 'res-1');
  for (let i = 1; i < list.length; i += 1) assert.ok(list[i - 1].t >= list[i].t);
  assert.equal(new Set(list.map((a) => a.id)).size, list.length);
});
