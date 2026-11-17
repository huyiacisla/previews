// A resident's record that is there but cannot be read is not an empty record: it may hold claims that Staff also hold. Nothing is written over it (no claim, no cancel, no save),
// the resident is told plainly, and a resident with no record at all (new) claims as usual. Staff's inbox that cannot be read is kept aside before a clean one is made.
// Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import "../../src/features/promotions/catalog.js";
import { cancelClaim, claim, listPromotions, recordUnreadable, residentState, UNREADABLE_MESSAGE } from "../../src/features/promotions/store.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};
const T = (n) => new Date(2026, 10, 16, 9, n);
const KEY = "eso-res-promo:res-1";

test("a record that is missing, empty or a normal object is readable; broken text, an array or a number is not", () => {
  const s = memory();
  assert.equal(recordUnreadable(s, "res-1"), false, "a new resident has no record");
  s.setItem(KEY, "");
  assert.equal(recordUnreadable(s, "res-1"), false);
  s.setItem(KEY, '{"v":1,"saved":[],"claims":{}}');
  assert.equal(recordUnreadable(s, "res-1"), false);
  for (const bad of ["{bad json", "[1,2]", "42", '"text"', "null"]) {
    s.setItem(KEY, bad);
    assert.equal(recordUnreadable(s, "res-1"), true, bad);
  }
});

test("a claim on an unreadable record is refused, says why, and leaves the record exactly as it was", () => {
  const s = memory();
  const [p, q] = listPromotions(s, { viewer: "res-1" }).filter((x) => !x.full);
  assert.ok(claim(s, "res-1", p, T(1)).ok);
  s.setItem(KEY, '{"v":1,"claims":{"parking0":{"count":1,"cod'); // cut off in the middle
  const before = s.getItem(KEY);
  const r = claim(s, "res-1", q, T(5));
  assert.equal(r.ok, false);
  assert.equal(r.reason, UNREADABLE_MESSAGE);
  assert.equal(r.why, "unreadable");
  assert.equal(s.getItem(KEY), before, "the record was not written over");
});

test("a cancel on an unreadable record is refused and changes nothing; a save changes nothing either", () => {
  const s = memory();
  const [p] = listPromotions(s, { viewer: "res-1" }).filter((x) => !x.full);
  assert.ok(claim(s, "res-1", p, T(1)).ok);
  s.setItem(KEY, "{bad json");
  const c = cancelClaim(s, "res-1", p.id, T(2));
  assert.equal(c.ok, false);
  assert.equal(c.reason, UNREADABLE_MESSAGE);
  assert.equal(s.getItem(KEY), "{bad json");
  assert.deepEqual([...residentState(s, "res-1").saved], [], "reading it still gives an empty view, never a crash");
});

test("a resident with no record yet claims as usual", () => {
  const s = memory();
  const [p] = listPromotions(s, { viewer: "res-1" }).filter((x) => !x.full);
  assert.ok(claim(s, "res-2", p, T(1)).ok);
  assert.equal(recordUnreadable(s, "res-2"), false);
});

test("Staff's inbox that cannot be read is kept aside before a clean one is made", () => {
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.ok(staff.includes('let CL;const raw0=localStorage.getItem(K);'));
  assert.ok(staff.includes('if(raw0)try{localStorage.setItem(K+"-unreadable",raw0)}catch(e){}CL=[];sv()'));
});
