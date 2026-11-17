// A mistaken Verify can be taken back: the claim is Pending again, the resident's code is hidden again, the log says so once, and no place is taken or given back.
// Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { appendAudit, AUDIT_TYPES, readAudit, spotsTaken } from "../../src/features/promotions/audit.js";

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const staff = read("src/staff/account-settings-content.html");
const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};

test("the audit log knows an 'unverify' event and it moves no place", () => {
  assert.ok(AUDIT_TYPES.includes("unverify"));
  const s = memory();
  const base = { promoId: "p1", residentId: "res-1", n: 1, actor: "Jordan Lee", actorId: "stf-1" };
  assert.ok(appendAudit(s, { ...base, type: "claim", actor: "resident:res-1", at: new Date(2026, 10, 16, 9, 0) }).ok);
  assert.ok(appendAudit(s, { ...base, type: "verify", at: new Date(2026, 10, 16, 9, 5) }).ok);
  assert.equal(spotsTaken(s, "p1"), 1);
  assert.ok(appendAudit(s, { ...base, type: "unverify", reason: "Verification taken back by Staff: Pending again", at: new Date(2026, 10, 16, 9, 6) }).ok);
  assert.equal(spotsTaken(s, "p1"), 1, "the place is still the resident's");
  const e = readAudit(s).filter((x) => x.type === "unverify");
  assert.equal(e.length, 1);
  assert.equal(e[0].spotDelta, 0);
});

test("Claims inbox: a verified claim that is not yet synced has 'Move back to Pending'; it goes back to Pending and the log gets one event", () => {
  assert.ok(staff.includes('${c.st=="verified"&&!c.sync?`<button class="btn out" data-clunv="${c.id}">Move back to Pending</button>`:""}'));
  assert.ok(staff.includes('if(b=g("data-clunv")){act([b.dataset.clunv],c=>{if(c.st=="verified"){c.st="pending";c.reason="";delete c.vt;delete c.manual}});return}'));
  assert.ok(staff.includes('if(o&&o.st==="verified"&&c.st==="pending")evs.push({type:"unverify"'));
  assert.ok(staff.includes('reason:"Verification taken back by Staff: Pending again"'));
});

test("a used or already synced claim cannot be taken back", () => {
  const at = staff.indexOf("data-clunv=");
  const cond = staff.slice(staff.lastIndexOf("${", at), at);
  assert.ok(cond.includes('c.st=="verified"') && cond.includes("!c.sync"), "only a verified, not synced claim");
  assert.ok(!cond.includes("redeemed"));
});

test("usability: the lock choice of the Reject box says what it does, and the resident reads the reason with its label", () => {
  assert.ok(staff.includes("Do not let the resident claim again (the deal is out)"));
  assert.ok(!staff.includes("Lock: deal is really out"));
  const res = read("src/features/promotions/resident.js");
  assert.ok(res.includes("Not approved by the property team.${cs && cs.reason ? ` Reason: ${cs.reason}` : \"\"}"));
});

test("usability: above the decision buttons Staff see the checks behind the reasons (lease, deal, unit), read from the real records", () => {
  const msg = read("src/features/messaging/app.js");
  assert.ok(msg.includes("function claimChecks(residentId, row, unit) {"));
  assert.ok(msg.includes('Lease active: ends ${fmtDate(unit.leaseEnd)} (${unit.daysLeft} days left)'));
  assert.ok(msg.includes("The deal is not running now (it ended, was paused or removed)"));
  assert.ok(msg.includes("(same unit) also claimed this deal") && msg.includes("No one else in this unit has claimed this deal"));
  assert.ok(msg.includes("listPromotions(localStorage, { viewer: residentId })") && msg.includes("householdClaims(localStorage, residentId, row.promoId)"));
  assert.ok(msg.includes('if (r.key === "pending") li.appendChild(checkList(rid, r, data.unit));'), "shown for a claim that waits, before the buttons");
  assert.ok(msg.includes('word.textContent = c.ok ? "Passed: " : "Needs attention: ";'), "a check is also in words, not only a mark");
});

test("usability: Cancel claim asks first (Keep claim is the default); only the second press cancels", () => {
  const res = read("src/features/promotions/resident.js");
  const html = read("src/partials/promotions-app.html");
  assert.ok(html.includes('<dialog id="dlg-cancel" aria-labelledby="cancel-title" aria-describedby="cancel-text"'));
  assert.ok(html.includes('id="cancel-keep"') && html.includes('id="cancel-yes"') && html.includes("Cancel this claim?"));
  const ask = res.slice(res.indexOf("function cancelReward(r) {"), res.indexOf("function doCancelReward(r) {"));
  assert.ok(ask.includes("cancelDlg.showModal();") && ask.includes('$("#cancel-keep").focus();'), "the safe choice has the focus");
  assert.ok(!ask.includes("cancelClaim(storage"), "pressing Cancel claim only asks");
  assert.ok(ask.includes('if (r) doCancelReward(r);'), "the second press cancels");
  assert.ok(res.slice(res.indexOf("function doCancelReward(r) {")).includes("cancelClaim(storage, me.id, r.id)"));
});

test("Claims inbox: a claim the resident cancelled before the inbox knew it comes in as cancelled, and a cancelled claim cannot be moved back to Pending", () => {
  assert.ok(staff.includes('const gone=Array.isArray(c.cancelled)&&c.cancelled.includes(j);'));
  assert.ok(staff.includes('st:gone?"rejected":"pending"') && staff.includes('reason:gone?"Cancelled by resident":""'));
  assert.ok(staff.includes('`<p class="pmc-hint">Cancelled by the resident. There is nothing to decide.</p>`'));
  assert.ok(staff.includes('if(c.st=="rejected"&&!/^Cancelled by resident/.test(c.reason||"")){'), "the reopen handler also refuses it");
});

test("the Modern template's accent keeps white button text at 4.5:1 or more", () => {
  const lum = (h) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const line = staff.split("\n").find((l) => l.includes('modern:{n:"Modern"'));
  const accent = /accent:"(#[0-9a-f]{6})"/i.exec(line)[1];
  assert.ok(1.05 / (lum(accent) + 0.05) >= 4.5, `${accent} with white text`);
});

test("usability: the claim detail has one main action (the others are outlined) and Mark redeemed asks once", () => {
  assert.ok(staff.includes("html body .cl-d .btn.out:not(.danger-t){background:var(--card);color:var(--fg);border:1px solid var(--border);box-shadow:none}"));
  assert.ok(staff.includes('t.textContent=" Press again to mark as used"'));
  assert.ok(staff.includes('b.dataset.ask!=="1"'));
  assert.ok(staff.includes('step(c0,"redeem");return T("Marked redeemed")'), "the second press does it");
  assert.ok(staff.includes('b.setAttribute("aria-live","polite")'), "the changed label is announced");
});

test("usability: a claim still waiting on a deal that has ended says so and where to ask", () => {
  const res = read("src/features/promotions/resident.js");
  assert.ok(res.includes('r.key === "pending" && r.info.live !== "running" ? ". Your claim was made before it ended. Ask the property team if it will still be honored." : ""'));
});

test("accessibility: the person's name above a list of claims is a heading", () => {
  const msg = read("src/features/messaging/app.js");
  assert.ok(msg.includes('const h = document.createElement("h3");') && msg.includes("const subhead = (text) => {"));
  assert.ok(!msg.includes('paragraph(data.person.name, "text-sm font-medium")'));
  assert.ok(msg.includes("p.appendChild(subhead(`Same unit: ${m.name}`));"));
});

test("long text without a space (a reason, a note) wraps inside the resident's windows and Staff's details window instead of overflowing", () => {
  const html = read("src/partials/promotions-app.html");
  for (const id of ["dlg-claim-status", "dlg-error", "cl-expiry"]) {
    const at = html.indexOf(`id="${id}"`);
    assert.ok(html.slice(at, html.indexOf(">", at)).includes("wrap-anywhere"), id);
  }
  assert.ok(html.includes('<p data-note class="text-xs text-muted-foreground wrap-anywhere empty:hidden"></p>'));
  assert.ok(html.includes('<p data-expiry class="text-sm text-foreground wrap-anywhere empty:hidden"></p>'));
  const msg = read("src/features/messaging/app.js");
  assert.ok(msg.includes("p.className = `${cls} wrap-anywhere`;"), "every paragraph of the details window wraps");
  assert.ok(msg.includes('text.className = st.state === "todo" ? "text-muted-foreground wrap-anywhere" : "text-foreground wrap-anywhere";'));
});

test("the Claims inbox takes the stored inbox again before every action and every import, so a page that missed an update never writes an old copy over a newer decision", () => {
  assert.ok(staff.includes('function fresh(){try{const a=JSON.parse(localStorage.getItem(K)||"null");if(Array.isArray(a)&&JSON.stringify(a)!==JSON.stringify(CL))CL=a}catch(e){}}'));
  assert.ok(staff.includes("function fromRes(){\nfresh();let ch=0;"));
  assert.ok(staff.includes('if(!inC)return;let b;fresh();'), "an action starts from the stored inbox");
});

test("Claims inbox: a row that is not on the list any more (searched out, filtered out, decided) is not selected any more, so a bulk action only reaches what Staff see", () => {
  const at = staff.indexOf('function draw(){const r=document.getElementById("pmcl");');
  assert.ok(at > 0);
  const head = staff.slice(at, at + 420);
  assert.ok(head.includes("const on=new Set(list().map(c=>c.id));[...U.sel].forEach(id=>{if(!on.has(id))U.sel.delete(id)})"));
  // the bulk actions read the selection and nothing else
  assert.ok(staff.includes('if(b=g("data-clbv")){const ids=[...U.sel].filter(id=>CL.find(c=>c.id==id&&c.st=="pending"));'));
});

test("My rewards: a long code wraps inside the card instead of pushing it wider (and a code is only ever written as text)", () => {
  const html = read("src/partials/promotions-app.html");
  const tags = html.match(/<[^>]*data-code[^>]*>/g) || [];
  assert.ok(tags.length >= 1);
  for (const t of tags.filter((x) => x.includes("tracking-wider"))) {
    assert.ok(t.includes("min-w-0") && t.includes("wrap-anywhere"), t);
    assert.ok(!t.includes("whitespace-nowrap"), t);
  }
});
