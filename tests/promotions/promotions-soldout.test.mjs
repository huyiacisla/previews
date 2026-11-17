// A deal with a total limit: the last place goes to one person only, a cancel or reject reopens it, and a unit-mate cannot take a second one. Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import "../../src/features/promotions/catalog.js";
import { cancelClaim, claim, listPromotions } from "../../src/features/promotions/store.js";
import { decideClaim } from "../../src/features/promotions/decide.js";
import { spotsTaken } from "../../src/features/promotions/audit.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};
const T = (n) => new Date(2026, 10, 16, 9, n);
const view = (s, who, id) => listPromotions(s, { viewer: who }).find((p) => p.id === id);

test("the last places of a limited deal: the count on the card is the places left minus what the log holds, through claim, cancel, reject and a full deal", () => {
  const s = memory();
  const id = "parking1";
  const start = view(s, "res-1", id).left; // the sample says 3 are left
  assert.equal(start, 3);
  let n = 0;
  const at = () => T(++n);
  const left = () => view(s, "res-1", id).left;
  const same = (why) => assert.equal(left(), start - spotsTaken(s, id), why);
  for (const who of ["res-1", "res-2", "res-3"]) assert.ok(claim(s, who, view(s, who, id), at()).ok, who);
  assert.equal(left(), 0);
  same("three claims");
  assert.equal(view(s, "res-1", id).full, true);
  const late = claim(s, "res-4", view(s, "res-4", id), at());
  assert.equal(late.ok, false);
  same("a refused claim takes nothing");
  assert.ok(cancelClaim(s, "res-3", id, at()).ok);
  assert.equal(left(), 1);
  same("one cancel");
  assert.ok(decideClaim(s, { rid: "res-2", promoId: id, action: "reject", reason: "x", now: at().getTime() }).ok);
  assert.equal(left(), 2);
  same("one reject");
  assert.equal(claim(s, "res-4", view(s, "res-4", id), at()).ok, false, "Jamie's unit (Alex) already holds a place");
  same("Jamie refused again");
  assert.ok(claim(s, "res-3", view(s, "res-3", id), at()).ok);
  assert.ok(claim(s, "res-2", view(s, "res-2", id), at()).ok);
  assert.equal(left(), 0);
  same("full again");
});

test("a second tab that still shows the deal with places left cannot take a place that is gone (the claim checks the storage, not the page)", () => {
  const s = memory();
  const id = "parking1";
  const staleA = view(s, "res-1", id); // tab of Alex: 3 left
  const staleB = view(s, "res-2", id); // tab of Priya: 3 left
  const staleC = view(s, "res-3", id); // tab of Morgan: 3 left
  assert.equal(staleA.left, 3);
  // three other people... the three tabs are all stale: each claims in turn, the fourth person (Jamie, Alex's unit) is refused by the unit rule
  assert.ok(claim(s, "res-1", staleA, new Date(2026, 10, 16, 9, 1)).ok);
  assert.ok(claim(s, "res-2", staleB, new Date(2026, 10, 16, 9, 2)).ok);
  assert.ok(claim(s, "res-3", staleC, new Date(2026, 10, 16, 9, 3)).ok);
  // everything is claimed now; a stale tab of a person who already claimed, and Jamie's stale tab, take nothing
  const again = claim(s, "res-2", staleB, new Date(2026, 10, 16, 9, 4));
  assert.equal(again.ok, false);
  const mate = claim(s, "res-4", view({ getItem: () => null, setItem() {}, removeItem() {} }, "res-4", id), new Date(2026, 10, 16, 9, 5));
  assert.equal(mate.ok, false, "a tab that was loaded before everything was claimed");
  assert.match(mate.reason, /fully claimed|unit already claimed/);
  assert.equal(spotsTaken(s, id), 3);
  assert.equal(view(s, "res-1", id).left, 0);
});
