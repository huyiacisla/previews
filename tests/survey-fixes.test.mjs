// Fixes that came out of the system survey (docs/qa/01a, 01b, 01c): data left behind by a deleted post, claims counted across residents,
// leftovers of a reset, one set of names in Social.

import "./promotions/_clock.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { PERSONAS } from "../src/features/messaging/personas.js";
import { clearSideData } from "../src/features/messaging/transport.js";
import { claim, claimedByResidents, listPromotions, KEY as PKEY } from "../src/features/promotions/store.js";
import { ensureFeed } from "../src/features/social/seed.js";
import { addPost, deletePost, muted, muteThread, timeline as staffTimeline } from "../src/features/social/staff-store.js";
import { addReply as residentReply, residentState, timeline as residentTimeline, share } from "../src/features/social/store.js";

const NOW = Date.parse("2026-11-10T15:00:00");
const mem = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
  };
};
const fresh = () => {
  const s = mem();
  ensureFeed(s, NOW);
  return s;
};

test("deleting a post takes its leftovers out of Staff data; the resident data is cleaned the next time that resident saves", () => {
  const s = fresh();
  const post = addPost(s, { text: "Garage is closed Friday." }, NOW).post;
  assert.ok(residentReply(s, "res-1", post.id, "Thanks for the notice.", NOW + 1000).ok);
  share(s, "res-1", post.id, NOW + 2000);
  muteThread(s, post.id);
  assert.ok(muted(s).threads.includes(String(post.id)));
  assert.ok(residentState(s, "res-1").replies[post.id]);
  assert.ok(deletePost(s, post.id).ok);
  assert.ok(!staffTimeline(s, "Jordan Lee").some((p) => p.id === post.id));
  assert.ok(!muted(s).threads.includes(String(post.id)), "the muted thread goes with the post");
  // the resident's own key is written only by that resident: the next save drops what belonged to the deleted post
  assert.ok(residentReply(s, "res-1", "p1", "A different reply.", NOW + 5000).ok);
  const st = residentState(s, "res-1");
  assert.equal(st.replies[post.id], undefined, "no reply under a deleted post");
  assert.ok(!st.shares.has(String(post.id)), "no share of a deleted post");
  assert.ok(Object.keys(st.replies).includes("p1"), "replies under posts that exist stay");
});

test("Social uses names that are not the names of people of other portals", () => {
  const s = fresh();
  const names = new Set();
  const take = (posts) => {
    for (const p of posts) {
      names.add(p.name);
      for (const r of p.replies) names.add(r.name);
    }
  };
  take(residentTimeline(s, "res-1"));
  take(staffTimeline(s, "Jordan Lee"));
  for (const n of ["Priya Shah", "Marcus Lee", "Dana Whitfield"]) assert.ok(!names.has(n), `${n} no longer appears: it looked like a person of another portal`);
  // a resident persona keeps the name Messages gives them wherever they appear in Social
  for (const p of PERSONAS.filter((x) => x.role === "resident")) assert.ok(residentReply(s, p.id, "p1", `hello from ${p.id}`, NOW + 10).ok);
  const seen = staffTimeline(s, "Jordan Lee")
    .find((p) => p.id === "p1")
    .replies.map((r) => r.name);
  for (const p of PERSONAS.filter((x) => x.role === "resident")) assert.ok(seen.includes(p.name), `${p.name} appears under the name of the persona`);
});

test('"fully claimed" counts what residents claimed in this app, not only the number Staff had recorded', () => {
  const s = mem();
  const rec = {
    id: "pr1",
    st: "active",
    views: 10,
    claims: 0,
    x: {
      title: "Car wash",
      reward: "20% off",
      desc: "Free vacuum with a wash.",
      cat: "carcare",
      partner: "Shine",
      method: "static",
      code: "SHINE20",
      limR: 1,
      limT: 2,
      start: "2026-11-01",
      end: "2026-12-31",
      ch: ["In-App"],
      au: "all",
      terms: "",
    },
  };
  s.setItem(PKEY.published, JSON.stringify([rec]));
  s.setItem(PKEY.settings, JSON.stringify({ promoShow: true, promoSave: true }));
  const list = () => listPromotions(s, { samples: false, today: "2026-11-13" });
  const p = list()[0];
  assert.ok(p, "the promotion is live");
  assert.equal(p.total, 2);
  assert.equal(p.full, false);
  assert.ok(claim(s, "res-1", p).ok);
  assert.equal(claimedByResidents(s, "pr1"), 1);
  assert.equal(list()[0].claimed, 1, "the claim shows in the count");
  assert.ok(claim(s, "res-2", list()[0]).ok);
  assert.equal(list()[0].claimed, 2);
  assert.equal(list()[0].full, true, "two claims reach the limit of two");
  assert.equal(claim(s, "res-3", list()[0]).ok, false, "a third resident is told it is fully claimed");
});

test("a reset also clears what was kept under the old conversation numbers, and nothing else", () => {
  const s = mem();
  s.setItem("eso-msg-draft:res-1:c3", "half a message");
  s.setItem("eso-msg-outbox:stf-1", '[{"cid":"k1"}]');
  s.setItem("eso-notif-read:cli-1", '{"msg-c1-m1":true}');
  s.setItem("eso-msg-v1", "{}");
  s.setItem("ui-prefs:staff", "{}");
  s.setItem("eso-msg-contrast", "1");
  assert.equal(clearSideData(s), 3);
  assert.equal(s.getItem("eso-msg-draft:res-1:c3"), null);
  assert.equal(s.getItem("eso-msg-outbox:stf-1"), null);
  assert.equal(s.getItem("eso-notif-read:cli-1"), null);
  assert.equal(s.getItem("ui-prefs:staff"), "{}", "the person's look is not part of the demo data");
  assert.equal(s.getItem("eso-msg-contrast"), "1");
  assert.equal(clearSideData(s), 0, "nothing left to clear");
});
