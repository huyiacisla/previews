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
  const o = msg.slice(msg.indexOf("function fillPromos"), msg.indexOf("function openResidentInfo"));
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
  // the list row stays plain: the link shows only inside the claim detail, and only when another claim of the unit exists
  assert.ok(!staff.includes('(same unit)'));
  assert.ok(!staff.includes('cl-sameu'));
  assert.ok(staff.includes('return m.length?`<div class="cl-same"') || staff.includes('return m.length?\`<div class="cl-same"'));
});

test("Claims inbox: the link to the other claim is a real button, readable in light and dark", () => {
  assert.ok(staff.includes('<button type="button" class="lk" data-clopen2='));
  assert.ok(staff.includes(".cl-same .lk:focus-visible{outline:2px solid var(--ring,#2563eb)}"));
  assert.ok(staff.includes("html.dark .cl-samew{color:#fbbf24}"));
});

test("Resident: a Pending claim says how long it has been waiting (a fact, not a promised time)", () => {
  assert.ok(res.includes("const waitingText = (iso) => {"));
  assert.ok(res.includes("Waiting, just now"));
  assert.ok(res.includes("`Waiting ${Math.round(m / 60)} h`"));
  assert.ok(res.includes("waitingText(r.at)"));
  assert.ok(!/will be (approved|verified) (in|within)/i.test(res));
});

test("Messages: the resident's picture in the chat opens the Resident information window, for Staff only", () => {
  assert.ok(msg.includes("function openResidentInfo(conv)"));
  assert.ok(msg.includes('dlg.id = "res-info"'));
  assert.ok(msg.includes('h.textContent = "Resident information"'));
  assert.ok(msg.includes('["staff", "admin"].includes(me.role) && a.role === "resident" && t.conv.kind === "resident_support"'));
  assert.ok(msg.includes("`Resident information: ${a.name}`"));
  assert.ok(msg.includes('open.style.cssText = "padding:8px;margin:-8px"'), "a 44 px press area around the small picture");
});

test("Resident information: three tabs (Profile, Resident reward, Ticket); reward and ticket each have a current and a history part", () => {
  const w = msg.slice(msg.indexOf("function openResidentInfo"), msg.indexOf("function openAllPromos"));
  for (const label of ['label: "Profile"', 'label: "Resident reward"', 'label: "Ticket"', 'label: "Current claim"', 'label: "History claimed"', 'label: "Current ticket"', 'label: "History ticket"']) assert.ok(w.includes(label), label);
  const t = msg.slice(msg.indexOf("function tabset"), msg.indexOf("const paragraph"));
  for (const a of ['role", "tablist"', 'role", "tabpanel"', "aria-selected", "aria-controls", "ArrowRight", '"Home"', '"End"']) assert.ok(t.includes(a), a);
});

test("Resident information: Profile shows the apartment, Reward shows each claim with its steps and state, Ticket shows the number and stage", () => {
  assert.ok(msg.includes('ctxRow(dl, "Apartment", u.number)'));
  assert.ok(msg.includes("claimSteps(row.key, timeline)"), "the steps of a claim come from the same source as My rewards");
  assert.ok(msg.includes('{ done: "Done: ", current: "Now: ", stop: "Stopped: ", todo: "Next: " }'), "a step's state is also in words, not only a mark");
  assert.ok(msg.includes('group === "active"'), "current claims are the ones that are active");
  assert.ok(msg.includes("historyFor(localStorage, residentId, titleOf)"));
  assert.ok(msg.includes("${k.no}") && msg.includes("${k.topic}"), "ticket number then topic");
  assert.ok(msg.includes("STAGE_LABEL[k.stage]"));
  assert.ok(msg.includes('["open", "in_progress", "waiting_on_resident"].includes(k.stage)'), "current tickets are the unfinished ones; resolved and closed are history");
  const store = read("src/features/messaging/store.js");
  assert.ok(store.includes("const ticketList = Object.values(state.convs)"));
  assert.ok(store.includes("current: c.id === conv.id"));
});

test("Messages: the hover bar of a message (React, Reply, Forward, More) floats and leaves the bubble's width alone", () => {
  const html = read("src/partials/messages-app.html");
  assert.ok(html.includes("sm:absolute sm:right-0 sm:bottom-0"), "incoming bar floats at the end of the row");
  assert.ok(html.includes("sm:absolute sm:bottom-0 sm:left-0"), "outgoing bar floats at the start of the row");
  assert.equal(html.split("sm:max-w-[min(75%,calc(100%_-_11.5rem))]").length - 1, 2, "both bubbles keep room for the bar");
  assert.ok(!html.includes("sm:max-w-3/4"));
});

test("Messages: the name and ticket number at the top of a chat are read in full; the action buttons share the row only when the chat column is wide", () => {
  const html = read("src/partials/messages-app.html");
  assert.ok(html.includes('<div id="thread" hidden class="@container/th flex min-h-0 flex-1 flex-col">'));
  assert.ok(html.includes("@4xl/th:grid-cols-[auto_minmax(0,1fr)_auto_auto]"));
  assert.ok(html.includes("@4xl/th:order-none @4xl/th:col-span-1 @4xl/th:justify-end"));
  assert.ok(!html.includes("sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"), "the screen width no longer decides: the buttons used to take the name's room on a tablet");
});
