// The matrix of cases around a claim and the conversation about it (Vòng 4, R4-8): double claims, two Staff on one claim, a deal turned off or sold out, whose claim is whose,
// a question after the code was used, a claim made again after a rejection, a resident who cancels while Staff decide, a storage that fails. Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import "../../src/features/promotions/catalog.js";
import { createStore } from "../../src/features/messaging/store.js";
import { createMemoryBus } from "../../src/features/messaging/transport.js";
import { decideClaim } from "../../src/features/promotions/decide.js";
import { activeClaims, cancelClaim, claim, claimStatus, historyFor, KEY, listPromotions } from "../../src/features/promotions/store.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};
const T = (n) => new Date(2026, 10, 16, 9, n);
const dealOf = (s, id, viewer = "res-1") => listPromotions(s, { viewer }).find((p) => p.id === id);
const any = (s, viewer = "res-1") => listPromotions(s, { viewer }).find((p) => !p.full && (p.left == null || p.left > 5));

test("M1 a double tap on Claim is one claim, one code", () => {
  const s = memory();
  const p = any(s);
  const a = claim(s, "res-1", p, T(1));
  const b = claim(s, "res-1", p, T(1));
  assert.ok(a.ok && b.ok);
  assert.equal(b.code, a.code, "the same code");
  assert.equal(activeClaims(s, "res-1", p.id).active, 1);
});

test("M2 Staff A confirms, Staff B rejects at the same time: the second sees the first, and a rejected claim cannot be applied or confirmed from the chat", () => {
  const s = memory();
  const p = any(s);
  claim(s, "res-1", p, T(1));
  assert.ok(decideClaim(s, { rid: "res-1", promoId: p.id, action: "verify", by: "Staff A" }).ok);
  assert.ok(decideClaim(s, { rid: "res-1", promoId: p.id, action: "reject", reason: "Limit reached", by: "Staff B" }).ok, "a confirmed claim can still be rejected");
  assert.equal(claimStatus(s, "res-1", p.id).st, "rejected");
  assert.equal(decideClaim(s, { rid: "res-1", promoId: p.id, action: "apply", reason: "x", by: "Staff A" }).ok, false, "A's late click is refused, with the reason");
  assert.equal(decideClaim(s, { rid: "res-1", promoId: p.id, action: "verify", by: "Staff A" }).ok, false);
});

test("M3 a deal Staff turned off while the claim waits: the claim and its decision still work, the deal is gone from the list", () => {
  const s = memory();
  const p = any(s);
  claim(s, "res-1", p, T(1));
  s.setItem("eso-pm-status", JSON.stringify({ [p.id]: "draft" }));
  assert.ok(!listPromotions(s, { viewer: "res-1" }).some((x) => x.id === p.id), "residents no longer see the deal");
  assert.equal(claimStatus(s, "res-1", p.id).st, "pending", "the claim is still there");
  assert.ok(decideClaim(s, { rid: "res-1", promoId: p.id, action: "apply", reason: "Honoured: it was claimed before it was turned off" }).ok);
  assert.equal(claimStatus(s, "res-1", p.id).manual, "Honoured: it was claimed before it was turned off");
});

test("M4 the last places: the next resident is told it is fully claimed; a resident who cancels gives the place back", () => {
  const s = memory();
  const p = dealOf(s, "parking1");
  assert.equal(p.left, 3);
  for (const id of ["res-2", "res-3", "res-4"]) assert.ok(claim(s, id, dealOf(s, "parking1", id), T(2)).ok, id);
  const full = dealOf(s, "parking1");
  assert.equal(full.full, true);
  const late = claim(s, "res-1", full, T(3));
  assert.equal(late.ok, false);
  assert.ok(/fully claimed/i.test(late.reason));
  assert.ok(cancelClaim(s, "res-2", "parking1", T(4)).ok);
  assert.equal(dealOf(s, "parking1").full, false, "the place is back");
});

test("M5 whose claim is whose: a resident never sees another unit's claims; Staff's history for one resident holds only theirs", () => {
  const s = memory();
  const p = any(s);
  claim(s, "res-1", p, T(1));
  assert.deepEqual(historyFor(s, "res-2", () => p.title), [], "another unit sees nothing");
  assert.ok(historyFor(s, "res-1", () => p.title).length > 0);
  assert.equal(claimStatus(s, "res-2", p.id), null);
});

test("M6 a question after the code was used: the card says Redeemed, and Staff cannot reject or apply it again", () => {
  const s = memory();
  const p = any(s);
  claim(s, "res-1", p, T(1));
  s.setItem(KEY.claimState, JSON.stringify({ [`res-1|${p.id}|1`]: { st: "redeemed", at: 1, rt: 1 } }));
  const store = createStore({ transport: createMemoryBus().connect(), now: () => Date.UTC(2026, 10, 16, 9, 30, 0) });
  store.reset({ empty: true });
  const r = store.askAboutClaim("res-1", { title: p.title, code: "X", status: "Redeemed", claimId: "c", promoId: p.id });
  assert.equal(store.get(r.convId, "res-1").messages.find((m) => m.card).card.status, "Redeemed");
  assert.equal(decideClaim(s, { rid: "res-1", promoId: p.id, action: "reject", reason: "x" }).ok, false);
  assert.equal(decideClaim(s, { rid: "res-1", promoId: p.id, action: "apply", reason: "x" }).ok, false);
});

test("M7 a claim rejected and then made again: the new claim waits, Staff decide the new one, the old rejection stays in the history", () => {
  const s = memory();
  const p = any(s);
  claim(s, "res-1", p, T(1));
  decideClaim(s, { rid: "res-1", promoId: p.id, action: "reject", reason: "Not a current resident at this unit" });
  assert.ok(claim(s, "res-1", p, T(5)).ok, "the resident may claim again (it was not locked)");
  assert.equal(claimStatus(s, "res-1", p.id).st, "pending", "the new claim waits");
  assert.ok(decideClaim(s, { rid: "res-1", promoId: p.id, action: "verify" }).ok);
  assert.equal(claimStatus(s, "res-1", p.id).st, "verified");
  const labels = historyFor(s, "res-1", () => p.title).map((e) => e.label);
  assert.ok(labels.includes("Rejected") && labels.filter((l) => l === "Claimed").length === 2 && labels.includes("Verified"));
});

test("M8 the resident cancels while Staff decide: Staff are told it was cancelled, nothing is written", () => {
  const s = memory();
  const p = any(s);
  claim(s, "res-1", p, T(1));
  cancelClaim(s, "res-1", p.id, T(2));
  const before = s.getItem(KEY.claimState);
  const r = decideClaim(s, { rid: "res-1", promoId: p.id, action: "verify" });
  assert.equal(r.ok, false);
  assert.ok(/cancelled/i.test(r.reason));
  assert.equal(s.getItem(KEY.claimState), before, "no decision is stored for a cancelled claim");
});

test("M9 the storage fails while saving a decision: Staff are told, the claim keeps its old status", () => {
  const s = memory();
  const p = any(s);
  claim(s, "res-1", p, T(1));
  const failing = { getItem: s.getItem, removeItem: s.removeItem, setItem: () => { throw new Error("quota"); } };
  const r = decideClaim(failing, { rid: "res-1", promoId: p.id, action: "verify" });
  assert.equal(r.ok, false);
  assert.ok(/Could not save/.test(r.reason));
  assert.equal(claimStatus(s, "res-1", p.id).st, "pending");
});

test("M10 the unit rule, from both accounts: Jamie is blocked while Alex's claim stands; Staff rejecting Alex's claim frees the place for Jamie", () => {
  const s = memory();
  const p = any(s);
  assert.ok(claim(s, "res-1", p, T(1)).ok);
  assert.equal(claim(s, "res-4", dealOf(s, p.id, "res-4"), T(2)).ok, false);
  decideClaim(s, { rid: "res-1", promoId: p.id, action: "reject", reason: "Claimed by mistake" });
  assert.ok(claim(s, "res-4", dealOf(s, p.id, "res-4"), T(3)).ok, "a rejected claim gives the place back to the unit");
  assert.equal(claim(s, "res-1", dealOf(s, p.id, "res-1"), T(4)).ok, false, "and now Alex is the one blocked");
});

test("M11 a card with markup in the title stays text: the Context Card is built with text nodes only", async () => {
  const { readFileSync } = await import("node:fs");
  const app = readFileSync(new URL("../../src/features/messaging/app.js", import.meta.url), "utf8");
  const card = app.slice(app.indexOf("function claimCard(card, conv)"), app.indexOf("const askedCard"));
  assert.ok(!card.includes("innerHTML"), "no innerHTML in the card");
  assert.ok(card.includes("dd.textContent = v;"));
});

test("M12 the account blocked by the unit rule can ask the property team: the question names the promotion, never the other person's code or claim", async () => {
  const { readFileSync } = await import("node:fs");
  const store = createStore({ transport: createMemoryBus().connect(), now: () => Date.UTC(2026, 10, 16, 9, 30, 0) });
  store.reset({ empty: true });
  const r = store.askAboutClaim("res-4", { title: "Mallard Pointe Valet", status: "Claimed by your unit", promoId: "parking0", unit: true });
  assert.ok(r.ok);
  const t = store.get(r.convId, "res-4");
  const said = t.messages.find((m) => m.mine && m.card);
  assert.ok(said.text.startsWith("I have a question about a promotion my unit already claimed."));
  assert.equal(said.card.unit, true);
  assert.ok(!said.text.includes("MALLA10") && !said.card.code && !said.card.claimId, "no code, no claim id of the other account");
  assert.equal(t.conv.topic, "Promotions");
  const res = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(res.includes('askBtn.textContent = mate ? "Ask the property team about this" : "Ask about this claim";'));
});
