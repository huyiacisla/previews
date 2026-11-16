// Live test, phase 2 and 4: the link between a claim and the people of the same unit (Messages "View all", the Claims inbox), the claim card in the chat that follows
// the claim, and the waiting time a resident reads on a Pending claim. Run with: npm test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const msg = read("src/features/messaging/app.js");
const staff = read("src/staff/account-settings-content.html");
const res = read("src/features/promotions/resident.js");

test("Messages: the Promotions section of the Staff panel has a View all button in its header row that opens a window", () => {
  assert.ok(msg.includes('button("View all"'));
  assert.ok(msg.includes("function openAllPromos(conv, resident)"));
  assert.ok(msg.includes('dlg.id = "promos-all"'));
  assert.ok(msg.includes('dlg.setAttribute("aria-labelledby", "promos-all-title")'));
  assert.ok(msg.includes("dlg.showModal()"));
  assert.ok(msg.includes('dlg.addEventListener("close", () => dlg.remove())'));
});

test("Messages: the window lists the resident's own promotions and then those of each person in the unit, from real storage", () => {
  const w = msg.slice(msg.indexOf("function promoOverview"), msg.indexOf("function openAllPromos"));
  assert.ok(w.includes("residentState(localStorage, residentId)"));
  assert.ok(w.includes('localStorage.getItem("eso-pm-claimstate")'));
  assert.ok(w.includes("householdClaims(localStorage, residentId, id)"));
  const o = msg.slice(msg.indexOf("function openAllPromos"), msg.indexOf("The claims of this resident that wait for Staff"));
  assert.ok(o.includes("unitMates(conv.residentId)"));
  assert.ok(o.includes("Decided by"));
  assert.ok(o.includes("Nothing claimed yet."));
  assert.ok(!/Math\.random|seed\(/.test(o));
});

test("Messages: each promotion row says who else in the unit claimed it", () => {
  assert.ok(msg.includes("Also claimed in this unit by"));
  assert.ok(msg.includes("householdClaims(localStorage, t.conv.residentId, e.promoId)"));
});

test("Messages: the claim card in the chat follows the claim (status), and a resident sees the code masked until it is approved", () => {
  assert.ok(msg.includes('const WORD = { pending: "Pending", verified: "Verified", redeemed: "Used", rejected: "Not approved" }'));
  assert.ok(msg.includes('me.role === "resident" && card.code && !approved ? maskCode(card.code) : card.code'));
  assert.ok(msg.includes('row("Reason", live && live.st === "rejected" && !live.cancelled ? live.reason : "")'));
  assert.ok(msg.includes('msgs.some((m) => m.card) ? localStorage.getItem("eso-pm-claimstate") : 0'));
});

test("Claims inbox: a claim shows the people of the same unit who also claimed the same promotion (real claims, not rejected)", () => {
  assert.ok(staff.includes('function unitMatesOf(c){return CL.filter(x=>x.id!==c.id&&x.rk&&c.rk&&x.deal===c.deal&&x.unit&&c.unit&&x.unit===c.unit&&x.rid!==c.rid&&x.st!=="rejected")}'));
  assert.ok(staff.includes('<div class="cl-same" role="note"><b>Same unit</b>'));
  assert.ok(staff.includes("One per unit: check before you verify, so the unit is not paid twice."));
  assert.ok(staff.includes('data-clopen2="'));
  assert.ok(staff.includes('(same unit)</span>'));
});

test("Claims inbox: the link to the other claim is a real button, readable in light and dark", () => {
  assert.ok(staff.includes('<button type="button" class="lk" data-clopen2='));
  assert.ok(staff.includes(".cl-same .lk:focus-visible{outline:2px solid var(--ring,#2563eb)}"));
  assert.ok(staff.includes("html.dark .cl-samew{color:#fbbf24}"));
  assert.ok(staff.includes("html.dark .cl-sameu{color:#93c5fd}"));
});

test("Resident: a Pending claim says how long it has been waiting (a fact, not a promised time)", () => {
  assert.ok(res.includes("const waitingText = (iso) => {"));
  assert.ok(res.includes("Waiting, just now"));
  assert.ok(res.includes("`Waiting ${Math.round(m / 60)} h`"));
  assert.ok(res.includes("waitingText(r.at)"));
  assert.ok(!/will be (approved|verified) (in|within)/i.test(res));
});
