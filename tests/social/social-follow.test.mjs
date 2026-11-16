// Social: following and followers, for residents and for Staff. Real stores, no DOM.

import assert from "node:assert/strict";
import test from "node:test";
import { followersOf, isPerson, whoIs } from "../../src/features/social/residents.js";
import { ensureFeed } from "../../src/features/social/seed.js";
import * as staff from "../../src/features/social/staff-store.js";
import * as res from "../../src/features/social/store.js";

const NOW = Date.parse("2026-11-10T15:00:00");
const mem = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const fresh = () => {
  const s = mem();
  ensureFeed(s, NOW);
  return s;
};
const mine = (s, id) => res.residentState(s, id).following;

test("who can be followed: Staff, a neighbor by name, or a resident who logs in; nobody else", () => {
  for (const k of ["me", "dana", "priya", "marcus", "res:res-1", "res:res-3"]) assert.equal(isPerson(k), true, k);
  for (const k of ["", null, undefined, "nobody", "res:res-9", "res:", "__proto__", "constructor", "toString"]) assert.equal(isPerson(k), false, String(k));
  assert.deepEqual(whoIs("priya"), { name: "Nadia Shah", role: "Resident" });
});

test("a resident follows and unfollows: it says what is true now, and is kept under their own key", () => {
  const s = fresh();
  assert.deepEqual(res.follow(s, "res-1", "priya"), { ok: true, following: true });
  assert.deepEqual(mine(s, "res-1"), ["priya"]);
  assert.deepEqual(res.follow(s, "res-1", "me"), { ok: true, following: true }, "the property team");
  assert.deepEqual(res.follow(s, "res-1", "res:res-2"), { ok: true, following: true }, "a neighbor who logs in");
  assert.deepEqual([...mine(s, "res-1")].sort(), ["me", "priya", "res:res-2"]);
  assert.deepEqual(res.follow(s, "res-1", "priya"), { ok: true, following: false }, "again: unfollow");
  assert.deepEqual([...mine(s, "res-1")].sort(), ["me", "res:res-2"]);
  assert.deepEqual(mine(s, "res-2"), [], "nobody else’s list changed");
});

test("a resident cannot follow themselves, nobody who does not exist, or an empty key; nothing is saved", () => {
  const s = fresh();
  const before = s.getItem("eso-res-social:res-1");
  assert.equal(res.follow(s, "res-1", "res:res-1").ok, false, "themselves");
  assert.equal(res.follow(s, "res-1", "").ok, false);
  const ghost = res.follow(s, "res-1", "nobody");
  assert.equal(ghost.ok, false);
  assert.match(ghost.reason, /not available/);
  assert.equal(res.follow(s, "res-1", "res:res-9").ok, false);
  assert.equal(s.getItem("eso-res-social:res-1"), before, "a refused follow leaves no trace");
});

test("a resident’s follows never write Staff’s data (the feed is read, not written)", () => {
  const s = fresh();
  const feed = s.getItem("eso-feed");
  res.follow(s, "res-1", "me");
  res.follow(s, "res-1", "priya");
  res.follow(s, "res-1", "priya");
  assert.equal(s.getItem("eso-feed"), feed);
});

test("followers: a resident who follows Staff shows in Staff’s count and list; unfollowing takes them out", () => {
  const s = fresh();
  const base = staff.profileStats(s, "Jordan Lee").followers;
  res.follow(s, "res-1", "me");
  res.follow(s, "res-3", "me");
  assert.deepEqual(followersOf(s, "me").sort(), ["res:res-1", "res:res-3"]);
  assert.equal(staff.profileStats(s, "Jordan Lee").followers, base + 2);
  res.follow(s, "res-1", "me");
  assert.deepEqual(followersOf(s, "me"), ["res:res-3"]);
  assert.equal(staff.profileStats(s, "Jordan Lee").followers, base + 1);
});

test("followers: residents following each other, and Staff following a resident", () => {
  const s = fresh();
  res.follow(s, "res-1", "res:res-2");
  assert.deepEqual(followersOf(s, "res:res-2"), ["res:res-1"]);
  assert.deepEqual(followersOf(s, "res:res-1"), [], "it is not mutual");
  const had = staff.following(s); // the sample Staff person already follows two people
  assert.deepEqual(staff.follow(s, "res:res-2"), { ok: true, following: true });
  assert.deepEqual(followersOf(s, "res:res-2").sort(), ["me", "res:res-1"], "Staff are a follower too");
  assert.deepEqual(staff.following(s).sort(), [...had, "res:res-2"].sort());
  assert.deepEqual(staff.follow(s, "res:res-2"), { ok: true, following: false });
  assert.deepEqual(followersOf(s, "res:res-2"), ["res:res-1"]);
  assert.deepEqual(staff.following(s).sort(), [...had].sort());
});

test("Staff follow rules: not yourself, not somebody who does not exist, and the list is kept in the feed", () => {
  const s = fresh();
  assert.equal(staff.follow(s, "me").ok, false, "yourself");
  assert.equal(staff.follow(s, "").ok, false);
  assert.match(staff.follow(s, "nobody").reason, /not available/);
  const had = staff.following(s); // the sample Staff person already follows Dana and Kim
  assert.deepEqual(had.sort(), ["dana", "kim"]);
  assert.ok(staff.follow(s, "priya").ok);
  assert.ok(staff.follow(s, "res:res-1").ok);
  assert.deepEqual(staff.following(s).sort(), ["dana", "kim", "priya", "res:res-1"]);
  assert.equal(staff.profileStats(s, "Jordan Lee").following, 4);
});

test('the same person written two ways is followed once (the feed calls Alex "alex"; as a resident he is "res:res-1")', () => {
  const s = fresh();
  assert.deepEqual(res.follow(s, "res-2", "alex"), { ok: true, following: true });
  assert.deepEqual(mine(s, "res-2"), ["res:res-1"], "kept under the one key");
  assert.deepEqual(res.follow(s, "res-2", "res:res-1"), { ok: true, following: false }, "by the other name it is the same person: this unfollows");
  assert.deepEqual(mine(s, "res-2"), []);
  assert.equal(res.follow(s, "res-1", "alex").ok, false, "Alex cannot follow himself under his other name");
  assert.deepEqual(followersOf(s, "alex"), followersOf(s, "res:res-1"));
});

test("what is followed comes back after a reload (it is read from storage, not kept in memory)", () => {
  const s = fresh();
  res.follow(s, "res-2", "me");
  res.follow(s, "res-2", "dana");
  staff.follow(s, "res:res-2");
  assert.deepEqual([...mine(s, "res-2")].sort(), ["dana", "me"]);
  assert.deepEqual(followersOf(s, "me"), ["res:res-2"]);
  assert.deepEqual(followersOf(s, "res:res-2"), ["me"]);
});
