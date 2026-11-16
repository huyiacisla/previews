// Social, the Violations rules Staff can set (strikes before review, shortest and longest pause, a note on every violation, the first action for each reason),
// and that the Staff app and the resident app both obey them.

import assert from "node:assert/strict";
import test from "node:test";
import { ensureFeed } from "../../src/features/social/seed.js";
import * as staff from "../../src/features/social/staff-store.js";
import * as res from "../../src/features/social/store.js";

const NOW = Date.parse("2026-11-10T15:00:00");
const HOUR = 3600000;
const DAY = 24 * HOUR;
const mem = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const fresh = () => {
  const s = mem();
  ensureFeed(s, NOW);
  return s;
};
const ME = "Jordan Lee";
const by = (s, who, now = NOW) => staff.standings(s, now).find((p) => p.who === who);
const ban = (s, who, at, extra = {}) => staff.banResident(s, { who, reason: "harass", note: "Direct", until: at + HOUR, ...extra }, at, ME);
const set = (s, over = {}) => staff.saveRules(s, { limit: 3, minPauseMin: 15, maxPauseDays: 90, requireNote: false, defaults: staff.rules(s).defaults, ...over }, ME, NOW);

test("the default rules are in force until Staff save others, and a bad set is refused whole", () => {
  const s = fresh();
  const d = staff.rules(s);
  assert.deepEqual([d.limit, d.minPauseMin, d.maxPauseDays, d.requireNote, d.t], [3, 15, 90, false, 0]);
  assert.deepEqual(d.defaults.hate, { kind: "pause", hours: 72 });
  assert.deepEqual(d.defaults.spam, { kind: "warning", hours: 0 });
  const bads = [
    { limit: 1 },
    { limit: 11 },
    { limit: 2.5 },
    { minPauseMin: 2 },
    { maxPauseDays: 0 },
    { maxPauseDays: 400 },
    { minPauseMin: 1440, maxPauseDays: 1, defaults: { ...d.defaults, hate: { kind: "pause", hours: 12 } } },
    { defaults: { ...d.defaults, hate: { kind: "pause", hours: 0 } } },
    { defaults: { ...d.defaults, hate: { kind: "pause", hours: 90 * 24 + 1 } } },
    { defaults: { ...d.defaults, hate: { kind: "nope" } } },
  ];
  for (const bad of bads) assert.equal(set(s, bad).ok, false, JSON.stringify(bad));
  assert.equal(staff.rules(s).t, 0, "a refused set changes nothing");
  assert.ok(set(s, { limit: 2, minPauseMin: 60, maxPauseDays: 30, requireNote: true }).ok);
  assert.deepEqual([staff.rules(s).limit, staff.rules(s).by, staff.rules(s).t], [2, ME, NOW]);
  assert.equal(staff.resetRules(s).rules.limit, 3);
  assert.equal(staff.rules(s).t, 0);
});

test("a hand-edited or broken set of rules in storage falls back to safe values", () => {
  const s = fresh();
  const feed = JSON.parse(s.getItem("eso-feed"));
  feed.rules = { limit: 99, minPauseMin: -4, maxPauseDays: "lots", requireNote: "yes", defaults: { hate: { kind: "pause", hours: 99999 }, spam: 7 } };
  s.setItem("eso-feed", JSON.stringify(feed));
  const r = staff.rules(s);
  assert.deepEqual([r.limit, r.minPauseMin, r.maxPauseDays, r.requireNote], [10, 5, 90, false]);
  assert.equal(r.defaults.hate.hours, 90 * 24);
  assert.equal(r.defaults.spam.kind, "warning");
});

test("a refused set says which value is wrong, so the form can mark that field", () => {
  const s = fresh();
  const d = staff.rules(s).defaults;
  const why = (over) => set(s, over).field;
  assert.equal(why({ limit: 11 }), "limit");
  assert.equal(why({ limit: 7 }), undefined, "3, 5, 7 and any number from 2 to 10 are allowed");
  assert.equal(why({ limit: 10 }), undefined);
  assert.equal(why({ minPauseMin: 1 }), "minPauseMin");
  assert.equal(why({ maxPauseDays: 999 }), "maxPauseDays");
  assert.equal(why({ defaults: { ...d, harass: { kind: "pause", hours: 0 } } }), "hours:harass");
  assert.equal(why({ defaults: { ...d, spam: { kind: "x" } } }), "kind:spam");
  assert.equal(why({}), undefined, "a good set names nothing");
});

test("the pause limits and the note rule apply to every ban and warning", () => {
  const s = fresh();
  set(s, { minPauseMin: 60, maxPauseDays: 7, requireNote: true });
  assert.equal(staff.banResident(s, { who: "res:res-1", reason: "hate", note: "a note", until: NOW + 30 * 60000 }, NOW).ok, false, "shorter than the shortest");
  assert.equal(staff.banResident(s, { who: "res:res-1", reason: "hate", note: "a note", until: NOW + 8 * DAY }, NOW).ok, false, "longer than the longest");
  assert.equal(staff.banResident(s, { who: "res:res-1", reason: "hate", note: "", until: NOW + DAY }, NOW).reason, "Add a short note: every violation needs one.");
  assert.equal(staff.warnResident(s, { who: "res:res-1", reason: "spam" }, NOW).ok, false, "a warning needs the note too");
  assert.ok(staff.banResident(s, { who: "res:res-1", reason: "hate", note: "a note", until: NOW + DAY }, NOW).ok);
});

test("the strike limit closes the account for review, for Staff and for the resident alike", () => {
  const s = fresh();
  set(s, { limit: 2 });
  assert.equal(res.strikeLimit(s), 2);
  ban(s, "res:res-1", NOW - 3 * DAY);
  assert.equal(by(s, "res:res-1").status, "awaiting");
  ban(s, "res:res-1", NOW - 2 * DAY);
  const p = by(s, "res:res-1");
  assert.deepEqual([p.status, p.count, p.limit], ["review", 2, 2], "two strikes close it");
  assert.equal(res.pauseOf(s, "res-1", NOW).review, true);
  assert.match(res.addReply(s, "res-1", "p1", "hi", NOW).reason, /reached 2 strikes/);
  assert.equal(staff.accountsUnderReview(s).length, 1);
  const opened = staff.openAccount(s, "res:res-1", NOW);
  assert.ok(opened.ok);
  assert.equal(opened.folder.strikes.length, 2, "two strikes sealed, not three");
  assert.deepEqual([by(s, "res:res-1").count, by(s, "res:res-1").folders.length], [0, 1]);
});

test("raising the limit reopens an account that was only at the old limit", () => {
  const t = fresh();
  for (const d of [5, 4, 3]) ban(t, "res:res-2", NOW - d * DAY);
  assert.equal(by(t, "res:res-2").status, "review");
  set(t, { limit: 4 });
  assert.notEqual(by(t, "res:res-2").status, "review");
});
