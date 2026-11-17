// The load guard: when too many claims of one promotion arrive at once, the next one is not made and the resident is asked to try again in a moment.
// Nothing is written for a refused claim; another promotion is not affected; after the window it works again. Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import "../../src/features/promotions/catalog.js";
import { BUSY_MESSAGE, claim, KEY, listPromotions, LOAD, loadGate, residentState } from "../../src/features/promotions/store.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k), _m: m };
};
const at = (sec) => new Date(2026, 10, 16, 9, 0, sec);
const resident = (n) => `res-load-${n}`;
const deals = (s) => listPromotions(s, { viewer: resident(0) }).filter((p) => !p.full);

test("the guard counts the claims of one promotion in a short window and then says busy", () => {
  const s = memory();
  for (let i = 0; i < LOAD.limit; i++) assert.equal(loadGate(s, "p1", at(1)).busy, false, `claim ${i + 1} is let through`);
  const busy = loadGate(s, "p1", at(2));
  assert.equal(busy.busy, true);
  assert.ok(busy.retryMs >= 500 && busy.retryMs <= LOAD.windowMs, "it says how long to wait");
  assert.equal(loadGate(s, "p2", at(2)).busy, false, "another promotion is not affected");
  assert.equal(loadGate(s, "p1", new Date(at(1).getTime() + LOAD.windowMs + 1)).busy, false, "after the window it is open again");
});

test("a claim that is refused as busy writes nothing and is not in the resident's history; the others before it are real claims", () => {
  const s = memory();
  const p = deals(s).find((d) => (d.total || 0) === 0 || (d.left || 0) >= LOAD.limit + 2) || deals(s)[0];
  let ok = 0;
  let busyAt = -1;
  for (let i = 0; i < LOAD.limit + 3; i++) {
    const r = claim(s, resident(i + 1), p, at(1 + (i % 5)));
    if (r.ok) ok++;
    else if (r.busy) {
      busyAt = busyAt < 0 ? i : busyAt;
      assert.equal(r.reason, BUSY_MESSAGE);
      assert.ok(r.retryMs > 0);
      const st = residentState(s, resident(i + 1));
      assert.equal(Object.keys(st.claims).length, 0, "no claim was written");
      assert.ok(!st.log.some((e) => e.k === "failed"), "a busy promotion is not the resident's failure");
    } else assert.fail(`unexpected refusal: ${r.reason}`);
  }
  assert.equal(busyAt, LOAD.limit, `the ${LOAD.limit + 1}th claim is the first one asked to wait`);
  assert.equal(ok, LOAD.limit);
});

test("when the wait is over the same resident can claim", () => {
  const s = memory();
  const p = deals(s)[0];
  for (let i = 0; i < LOAD.limit; i++) claim(s, resident(i + 1), p, at(1));
  const late = claim(s, resident(99), p, at(2));
  assert.equal(late.busy, true);
  const later = claim(s, resident(99), p, new Date(at(1).getTime() + LOAD.windowMs + 500));
  assert.equal(later.ok, true, "a moment later it goes through");
});

test("a double press and a claim already made are not a load", () => {
  const s = memory();
  const p = deals(s)[0];
  assert.ok(claim(s, resident(1), p, at(1)).ok);
  for (let i = 0; i < LOAD.limit + 5; i++) assert.equal(claim(s, resident(1), p, at(1)).again, true, "the same press again is the same claim");
  assert.equal(JSON.parse(s.getItem(KEY.load)).a.length, 1, "only the real claim was counted");
});

test("a broken or unsaveable load record never stops a claim", () => {
  const s = memory();
  s.setItem(KEY.load, "{not json");
  assert.equal(loadGate(s, "p1", at(1)).busy, false);
  const broken = { getItem: () => null, setItem: () => { throw new Error("full"); } };
  assert.equal(loadGate(broken, "p1", at(1)).busy, false);
});

test("the resident page says it plainly and keeps the Claim button off for a few seconds", () => {
  const res = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.ok(res.includes("claimHold = Math.min(Math.max(Number(r.retryMs) || 0, 1500), 5000);") && res.includes("ui.holdClaim = true;") && res.includes("ui.holdClaim = false;"));
  assert.ok(res.includes("|| !!ui.holdClaim;"), "the button shows it is off");
  assert.ok(res.includes("toast(r.reason);"));
  assert.ok(res.includes("const hold = claimHold;") && res.includes("}, hold);"));
});
