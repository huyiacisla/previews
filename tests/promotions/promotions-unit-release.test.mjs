// One per unit: what happens to the unit's hold when the holder cancels, is rejected, or is put back. Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import "../../src/features/promotions/catalog.js";
import { cancelClaim, claim, claimStatus, listPromotions } from "../../src/features/promotions/store.js";
import { decideClaim } from "../../src/features/promotions/decide.js";
import { spotsTaken } from "../../src/features/promotions/audit.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};
const T = (n) => new Date(2026, 10, 16, 9, n);
const deal = (s, viewer) => listPromotions(s, { viewer }).find((p) => !p.full);
const view = (s, who, id) => listPromotions(s, { viewer: who }).find((p) => p.id === id);

test("when the holder of a unit cancels, a person of the same unit can claim, and the first cannot take it back", () => {
  const s = memory();
  const p = deal(s, "res-1");
  assert.ok(claim(s, "res-1", p, T(1)).ok);
  assert.equal(claim(s, "res-4", p, T(2)).ok, false);
  assert.ok(cancelClaim(s, "res-1", p.id, T(3)).ok);
  const j = claim(s, "res-4", view(s, "res-4", p.id), T(4));
  assert.equal(j.ok, true, "the unit is free again after the cancel");
  const a = claim(s, "res-1", view(s, "res-1", p.id), T(5));
  assert.equal(a.ok, false, "the unit holds it again, through Jamie");
  assert.equal(spotsTaken(s, p.id), 1, "one place taken in the log");
});

test("when Staff reject the holder of a unit, the unit is free again and the places are given back once", () => {
  const s = memory();
  const p = deal(s, "res-1");
  const first = claim(s, "res-1", p, T(1));
  assert.ok(first.ok);
  const r = decideClaim(s, { rid: "res-1", promoId: p.id, action: "reject", reason: "Not on the lease", now: T(2).getTime() });
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(spotsTaken(s, p.id), 0);
  const j = claim(s, "res-4", view(s, "res-4", p.id), T(3));
  assert.equal(j.ok, true, "a rejected claim does not hold the unit");
  assert.equal(spotsTaken(s, p.id), 1);
});

test("a verified or redeemed claim cannot be cancelled by the resident, and nothing is given back", () => {
  const s = memory();
  const p = deal(s, "res-1");
  assert.ok(claim(s, "res-1", p, T(1)).ok);
  assert.ok(decideClaim(s, { rid: "res-1", promoId: p.id, action: "verify", now: T(2).getTime() }).ok);
  assert.equal(cancelClaim(s, "res-1", p.id, T(3)).ok, false);
  assert.equal(spotsTaken(s, p.id), 1);

  assert.equal(cancelClaim(s, "res-1", p.id, T(5)).ok, false);
  assert.equal(spotsTaken(s, p.id), 1);
});

test("a rejected resident can claim again, and the log shows claim, reject, give_back, claim", () => {
  const s = memory();
  const p = deal(s, "res-1");
  assert.ok(claim(s, "res-1", p, T(1)).ok);
  assert.ok(decideClaim(s, { rid: "res-1", promoId: p.id, action: "reject", reason: "x", now: T(2).getTime() }).ok);
  const again = claim(s, "res-1", view(s, "res-1", p.id), T(3));
  assert.equal(spotsTaken(s, p.id), again.ok ? 1 : 0);
});
