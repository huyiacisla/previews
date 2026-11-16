// Social: the comments of a post as a thread. Answers sit under the comment they answer, "View N replies" counts the real ones, reactions to a comment are
// people (like a post's), and Staff and residents read the same thread.

import assert from "node:assert/strict";
import test from "node:test";
import { KINDS } from "../../src/features/social/reactions.js";
import { ensureFeed } from "../../src/features/social/seed.js";
import { react, addReply as staffReply, timeline } from "../../src/features/social/staff-store.js";
import { react as residentReact, addReply as residentReply, timeline as residentTimeline } from "../../src/features/social/store.js";
import { nest } from "../../src/features/social/threads.js";

const NOW = Date.parse("2026-11-10T15:00:00");
const mem = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), dump: () => Object.fromEntries(m) };
};
const fresh = () => {
  const s = mem();
  ensureFeed(s, NOW);
  return s;
};
const ME = "Jordan Lee";
const staffPost = (s, id) => timeline(s, ME).find((p) => p.id === id);
const resPost = (s, id, who = "res-1") => residentTimeline(s, who).find((p) => p.id === id);
const agree = (r) => {
  for (const k of KINDS) assert.equal(r.reactors.filter((x) => x.kind === k).length, r.reactions[k]);
  assert.equal(r.reactors.length, r.reactionTotal);
};

test("nest: answers under the comment they answer, in time order, with the number of answers under each", () => {
  const list = nest([
    { id: "c2", parent: null, t: 20 },
    { id: "a1", parent: "c1", t: 15 },
    { id: "c1", parent: null, t: 10 },
    { id: "a2", parent: "a1", t: 18 },
    { id: "a3", parent: "c1", t: 30 },
    { id: "lost", parent: "gone", t: 40 },
  ]);
  assert.deepEqual(
    list.map((n) => n.id),
    ["c1", "a1", "a2", "a3", "c2", "lost"],
  );
  assert.deepEqual(
    list.map((n) => n.depth),
    [0, 1, 2, 1, 0, 0],
  );
  assert.equal(list[0].replyCount, 3, "three answers under c1, at any depth");
  assert.equal(list[1].replyCount, 1);
  assert.equal(list[4].replyCount, 0);
  assert.equal(list[5].depth, 0, "an answer whose comment is gone reads as a comment on the post");
  assert.deepEqual(
    nest([
      { id: "x", parent: "y", t: 1 },
      { id: "y", parent: "x", t: 2 },
    ]).length,
    0,
    "a loop in the data is never followed forever",
  );
});

test("Staff and residents read the same thread of a sample post, comment for comment", () => {
  const s = fresh();
  const a = staffPost(s, "p1").replies;
  const b = resPost(s, "p1").replies;
  assert.deepEqual(
    a.map((r) => [r.id, r.depth, r.replyCount]),
    b.map((r) => [r.id, r.depth, r.replyCount]),
  );
  assert.ok(
    a.some((r) => r.depth === 1),
    "the sample has an answer under a comment",
  );
  assert.equal(a.find((r) => r.id === "r1").replyCount, 1);
});

test("a resident answers a comment: the answer sits under it for everyone", () => {
  const s = fresh();
  const ok = residentReply(s, "res-1", "p1", "Thanks, noted!", NOW + 1000, "r2"); // answers Priya's comment
  assert.ok(ok.ok);
  for (const view of [staffPost(s, "p1").replies, resPost(s, "p1").replies, resPost(s, "p1", "res-2").replies]) {
    const i = view.findIndex((r) => r.id === "r2");
    assert.equal(view[i + 1].text, "Thanks, noted!");
    assert.equal(view[i + 1].depth, view[i].depth + 1);
    assert.equal(view[i].replyCount, 1);
  }
  assert.equal(residentReply(s, "res-1", "p1", "x", NOW, "nope").ok, false, "a comment that is not there");
});

test("Staff answer a resident’s answer to a comment: it nests two deep", () => {
  const s = fresh();
  const q = residentReply(s, "res-1", "p1", "Question", NOW + 1000, "r2").reply;
  assert.ok(staffReply(s, "p1", "Answer", { to: q.id }, NOW + 2000).ok);
  const list = staffPost(s, "p1").replies;
  const i = list.findIndex((r) => r.id === q.id);
  assert.equal(list[i + 1].text, "Answer");
  assert.equal(list[i + 1].depth, list[i].depth + 1);
  assert.equal(staffPost(s, "p1").replies.find((r) => r.id === "r2").replyCount, 2);
});

test("a comment’s reactions are people: Staff, residents, and the feed’s named ones, counted from the list", () => {
  const s = fresh();
  const base = staffPost(s, "p1").replies.find((r) => r.id === "r2");
  assert.equal(base.reactionTotal, 0, "a number the sample once kept is not counted");
  assert.deepEqual(react(s, "r2", "love"), { ok: true, kind: "love" });
  assert.deepEqual(residentReact(s, "res-1", "r2", "like"), { ok: true, kind: "like" });
  assert.deepEqual(residentReact(s, "res-2", "r2", "wow"), { ok: true, kind: "wow" });
  const r = staffPost(s, "p1").replies.find((x) => x.id === "r2");
  assert.equal(r.reactionTotal, 3);
  assert.deepEqual(r.reactions, { like: 1, love: 1, laugh: 0, wow: 1, sad: 0 });
  assert.equal(r.myReaction, "love");
  assert.deepEqual(
    r.reactors.map((x) => x.name),
    [ME, "Alex Rivera", "Priya Nair"],
  );
  agree(r);
  const seen = resPost(s, "p1").replies.find((x) => x.id === "r2");
  assert.equal(seen.reactionTotal, 3, "a resident sees the same number");
  assert.equal(seen.myReaction, "like");
  assert.equal(seen.reactors[0].name, "You");
  assert.ok(seen.reactors.some((x) => x.name === "Property team" && x.kind === "love"));
  agree(seen);
  // one reaction per person per comment, taken back by giving it again
  assert.deepEqual(residentReact(s, "res-1", "r2", "like"), { ok: true, kind: null });
  assert.equal(staffPost(s, "p1").replies.find((x) => x.id === "r2").reactionTotal, 2);
});

test("a resident cannot react to a comment they cannot see", () => {
  const s = fresh();
  const staffOnly = timeline(s, ME).find((p) => p.aud === "staff");
  const hidden = staffOnly.replies[0];
  assert.ok(hidden, "the sample staff post has a comment");
  assert.equal(residentReact(s, "res-1", hidden.id, "love").ok, false);
  assert.equal(react(s, "nope", "love").ok, false);
});

test('a comment the feed keeps under the resident’s own name reads as theirs: "You", and it counts as their reply', () => {
  const s = fresh();
  const own = resPost(s, "p1").replies.find((r) => r.id === "r1"); // the sample's Alex Rivera is res-1
  assert.equal(own.name, "You");
  assert.equal(own.mine, true);
  assert.equal(own.key, "res:res-1");
  const other = resPost(s, "p1", "res-2").replies.find((r) => r.id === "r1");
  assert.equal(other.name, "Alex Rivera", "another resident reads it under the name");
  assert.equal(other.mine, false);
  // Staff, answering it, sit under it; the resident sees the answer is to their comment
  const answer = resPost(s, "p1").replies.find((r) => r.parentId === "r1");
  assert.ok(answer, "the sample has an answer under the comment");
});

test("comments carry a key for each person, so Follow can name them", () => {
  const s = fresh();
  const r = staffPost(s, "p1").replies.find((x) => x.id === "r2");
  assert.equal(r.key, "priya");
  const alex = staffPost(s, "p1").replies.find((x) => x.id === "r1");
  assert.equal(alex.key, "res:res-1", "Alex Rivera has one key, as a neighbor in the feed and as a resident");
});
