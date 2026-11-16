// Staff decide about a claim from the chat (confirm, apply by hand, reject), the resident reads the same decision, the Claims inbox keeps it, and the chat says it in a System Message.
// Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import "../../src/features/promotions/catalog.js";
import { createStore } from "../../src/features/messaging/store.js";
import { createMemoryBus } from "../../src/features/messaging/transport.js";
import { decideClaim, decisionText } from "../../src/features/promotions/decide.js";
import { claim, claimStatus, KEY, listPromotions } from "../../src/features/promotions/store.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};
const T = (n) => new Date(2026, 10, 16, 9, n);
const setup = () => {
  const s = memory();
  const p = listPromotions(s, { viewer: "res-1" }).find((x) => !x.full);
  assert.ok(claim(s, "res-1", p, T(1)).ok);
  return { s, p };
};
const inboxOf = (s) => JSON.parse(s.getItem("eso-pmclaims") || "[]");
const withInbox = (s) => s.setItem("eso-pmclaims", "[]"); // Staff's inbox has been opened once

test("confirm: the claim becomes verified for the resident, once; confirming again changes nothing", () => {
  const { s, p } = setup();
  const r = decideClaim(s, { rid: "res-1", promoId: p.id, action: "verify" });
  assert.ok(r.ok && r.st === "verified");
  assert.equal(claimStatus(s, "res-1", p.id).st, "verified");
  assert.equal(decideClaim(s, { rid: "res-1", promoId: p.id, action: "verify" }).noop, true, "a second Verify is a no-op");
});

test("apply by hand: a reason is required, the resident reads it, the inbox keeps who did it, and it is only done once", () => {
  const { s, p } = setup();
  withInbox(s);
  assert.equal(decideClaim(s, { rid: "res-1", promoId: p.id, action: "apply", reason: "  " }).ok, false, "no reason, no override");
  const r = decideClaim(s, { rid: "res-1", promoId: p.id, action: "apply", reason: "Discount credited to this month's invoice", by: "Jordan Lee", now: 1000 });
  assert.ok(r.ok);
  const cs = claimStatus(s, "res-1", p.id);
  assert.deepEqual([cs.st, cs.manual], ["verified", "Discount credited to this month's invoice"]);
  const rec = inboxOf(s).find((c) => c.rk === `res-1|${p.id}|1`);
  assert.deepEqual([rec.st, rec.manual.by, rec.manual.reason], ["verified", "Jordan Lee", "Discount credited to this month's invoice"]);
  assert.ok(rec.notes.some((n) => n.text.startsWith("Applied by hand (from the chat)")), "the inbox note says it came from the chat");
  assert.equal(decideClaim(s, { rid: "res-1", promoId: p.id, action: "apply", reason: "again" }).noop, true, "no second override");
});

test("reject: a reason is required and is what the resident reads; a used claim cannot be rejected", () => {
  const { s, p } = setup();
  assert.equal(decideClaim(s, { rid: "res-1", promoId: p.id, action: "reject" }).ok, false);
  withInbox(s);
  assert.ok(decideClaim(s, { rid: "res-1", promoId: p.id, action: "reject", reason: "Claim limit reached" }).ok);
  const cs = claimStatus(s, "res-1", p.id);
  assert.deepEqual([cs.st, cs.reason], ["rejected", "Claim limit reached"]);
  assert.equal(inboxOf(s).find((c) => c.rk === `res-1|${p.id}|1`).st, "rejected");
  assert.equal(decideClaim(s, { rid: "res-1", promoId: p.id, action: "verify" }).ok, false, "a rejected claim is moved back to Pending in the inbox first");

  const used = setup();
  const all = JSON.parse(used.s.getItem(KEY.claimState) || "{}");
  all[`res-1|${used.p.id}|1`] = { st: "redeemed", at: 1, rt: 1 };
  used.s.setItem(KEY.claimState, JSON.stringify(all));
  assert.equal(decideClaim(used.s, { rid: "res-1", promoId: used.p.id, action: "reject", reason: "x" }).ok, false);
  assert.equal(decideClaim(used.s, { rid: "res-1", promoId: used.p.id, action: "apply", reason: "x" }).ok, false);
});

test("a decision made before Staff ever opened the inbox is kept for the resident, and the inbox page keeps it when it imports the claim", () => {
  const { s, p } = setup();
  assert.ok(decideClaim(s, { rid: "res-1", promoId: p.id, action: "apply", reason: "Refunded" }).ok);
  assert.equal(claimStatus(s, "res-1", p.id).manual, "Refunded");
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes("{const known=new Set(CL.map(c=>c.rk).filter(Boolean));Object.keys(prev).forEach(k=>{if(!known.has(k)&&prev[k]&&prev[k].st)out[k]=prev[k]})}"), "publishing does not wipe a decision of a claim not imported yet");
});

test("nothing to decide when the resident has no claim or cancelled it", () => {
  const s = memory();
  const p = listPromotions(s, { viewer: "res-1" }).find((x) => !x.full);
  assert.equal(decideClaim(s, { rid: "res-1", promoId: p.id, action: "verify" }).ok, false);
});

test("the chat says it: Override and Reject post a System Message the resident is notified of; only Staff can", () => {
  const store = createStore({ transport: createMemoryBus().connect(), now: () => Date.UTC(2026, 10, 16, 9, 30, 0) });
  store.reset({ empty: true });
  const id = store.askAboutClaim("res-1", { title: "Mallard Pointe Valet", code: "MALLA10", at: "2026-11-16T09:13:00.000Z", status: "Pending" }).convId;
  const text = decisionText("apply", "Mallard Pointe Valet", "Discount credited to this month's invoice");
  assert.ok(text.includes("applied your promotion") && text.includes("by hand"));
  assert.equal(store.noteClaimDecision(id, "res-1", text).ok, false, "a resident cannot post it");
  assert.ok(store.noteClaimDecision(id, "stf-1", text).ok);
  const said = store.get(id, "res-1").messages.filter((m) => m.kind === "system").map((m) => m.text);
  assert.ok(said.some((t) => t.includes("Discount credited")), "the resident reads it in the chat");
  assert.equal(decisionText("verify", "x", ""), null, "a plain confirmation needs no message");
});

test("the details panel decides in two clicks and the inbox follows a decision made elsewhere", () => {
  const app = readFileSync(new URL("../../src/features/messaging/app.js", import.meta.url), "utf8");
  assert.ok(app.includes('button("Confirm claim"') && app.includes('button("Apply by hand"') && app.includes('button("Reject"'));
  assert.ok(app.includes("for (const why of mine === \"apply\" ? APPLY_WHY : REJECT_WHY) box.appendChild(button(why"), "one click opens the reasons, one click picks one");
  assert.ok(app.includes("store.noteClaimDecision(conv.id, me.id, text)"), "the System Message follows the decision");
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes('addEventListener("storage",e=>{if(e.key===K&&e.newValue)'), "the inbox reloads when the chat changed it");
  assert.ok(staff.includes('d.st==="verified"||d.st==="rejected")){c.st=d.st'), "a claim the inbox did not know yet takes over the decision");
});
