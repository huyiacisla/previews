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
  assert.ok(msg.includes("ui.dlgClosedAt = Date.now()") && msg.includes("dlg.remove();"), "closing removes the window; the Escape that closed it does not also close the Details panel");
  assert.ok(msg.includes("Date.now() - (ui.dlgClosedAt || 0) > 400"));
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

test("Messages: the picture at the top of a resident's chat opens the Resident information window (Staff and Admin only); the small pictures beside the messages do not", () => {
  assert.ok(msg.includes("function openResidentInfo(conv, keep)"));
  assert.ok(msg.includes('dlg.id = "res-info"'));
  assert.ok(msg.includes('h.textContent = "Resident information"'));
  assert.ok(msg.includes('const info = ["staff", "admin"].includes(me.role) && t.conv.kind === "resident_support";'));
  assert.ok(msg.includes("`Resident information: ${row.avatar.name}`"));
  assert.ok(msg.includes('headAvatar.addEventListener("click", openInfo)'));
  assert.ok(msg.includes('e.key === "Enter" || e.key === " "'), "the keyboard opens it too");
  assert.ok(msg.includes('if (last) $("[data-avatar]", el).replaceWith(avatar({ name: a.name, role: a.role === "bot" ? "bot" : a.role, size: "sm" }));'), "the small picture beside a message is a plain picture");
  assert.ok(!msg.includes("data-res-info") && !msg.includes("resInfo"));
});

test("Messages: the composer is one card (text on top, small icons and Send under it) and its buttons look 32 px with a 44 px press area on every screen", () => {
  const html = read("src/partials/messages-app.html");
  assert.ok(html.includes('id="composer-card"'));
  assert.ok(html.includes("focus-within:border-ring focus-within:ring-3"));
  for (const id of ["btn-canned", "btn-attach", "btn-emoji", "btn-emergency", "btn-send"]) {
    const at = html.indexOf(`id="${id}"`);
    const tag = html.slice(at, html.indexOf(">", at));
    assert.ok(tag.includes("after:absolute"), `${id}: a 44 px press area`);
    assert.ok(!tag.includes("pointer-coarse:size-11") && !tag.includes("pointer-coarse:h-11"), `${id}: does not grow on touch`);
  }
  const t = html.slice(html.indexOf('<template id="t-btn">'), html.indexOf("</template>", html.indexOf('<template id="t-btn">')));
  assert.ok(t.includes("after:absolute") && !t.includes("pointer-coarse:h-11"), "the shared Messages button too");
  assert.ok(html.includes('<span class="@max-lg/th:sr-only">Quick replies</span>'), "on a narrow column only the icon shows; the name stays for screen readers");
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

test("Messages: Details in a resident's chat opens the Resident information window, not the side panel; other chats keep the panel", () => {
  assert.ok(msg.includes('if (ctx && ctx.kind === "resident") {'));
  assert.ok(msg.includes('button("Details", { variant: "outline", ariaLabel: "Resident information", onClick: () => openResidentInfo(conv) })'));
  assert.ok(msg.includes('cb.setAttribute("aria-haspopup", "dialog")'));
  assert.ok(msg.includes("} else if (ctx) {"), "a group or support chat still toggles the panel");
  assert.ok(msg.includes('ui.lastKind === "resident_support" && ["staff", "admin"].includes(me.role) ? false'), "the panel no longer opens by itself in a resident's chat");
  assert.ok(msg.includes("ui.ctxForce && ui.ctxForce === ui.convId ? true"), "a claim question still opens it");
});

test("Resident information: Staff decide a waiting claim inside Current claim, and the window redraws on the same tab", () => {
  const w = msg.slice(msg.indexOf("function openResidentInfo"), msg.indexOf("function openAllPromos"));
  assert.ok(w.includes("decisionBox(conv, d, rebuild)"));
  assert.ok(w.includes("decidable(rid)"));
  assert.ok(w.includes("ui.infoRefresh = rebuild") && w.includes("dlg.scrollTop = scroll"));
  for (const k of ["st.main", "st.reward", "st.ticket"]) assert.ok(w.includes(k), k);
  assert.ok(msg.includes("if (ui.infoRefresh) ui.infoRefresh();"), "a decision made in the window shows at once");
  assert.ok(msg.includes("function decisionBox(conv, c, onChange)"));
});

test("Staff's Resident view: Claim and Cancel claim only say what they do in the resident's app; they write nothing (Ask already did)", () => {
  assert.ok(res.includes("function inStaffPreview() {"));
  assert.ok(res.includes('return !window.parent.location.pathname.startsWith("/resident/");'));
  assert.ok(res.includes("return true; // a parent we cannot read is not the resident's app"));
  const claimAt = res.indexOf('$("#dlg-claim-btn").addEventListener("click"');
  const claimHead = res.slice(claimAt, res.indexOf("if (claimBusy) return;", claimAt));
  assert.ok(claimHead.includes("if (inStaffPreview()) {") && claimHead.includes("Nothing is claimed in this preview."), "Claim is guarded before anything is written");
  const cancelAt = res.indexOf("function cancelReward(r) {");
  const cancelHead = res.slice(cancelAt, res.indexOf("cancelClaim(storage", cancelAt));
  assert.ok(cancelHead.includes("if (inStaffPreview()) {") && cancelHead.includes("Nothing is cancelled in this preview."), "Cancel is guarded before anything is written");
  assert.ok(res.includes("if (inStaffPreview()) {\n    toast(\"In the resident's app this opens Messages with this claim attached.\");"), "Ask uses the same check");
});
