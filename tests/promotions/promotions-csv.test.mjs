// The Staff claims export: built from the keys the app really writes (a resident's own record, Staff's decisions, the audit log), one row per real claim, a clean standard CSV.
// The fixtures here are small and only inside the tests; the app itself reads real storage. Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { claimsCsv, CLAIM_CSV_COLUMNS, collectClaimRows, csvCell, exportClaims } from "../../src/features/promotions/claims-csv.js";
import { decideClaim } from "../../src/features/promotions/decide.js";
import { cancelClaim, claim, KEY, listPromotions } from "../../src/features/promotions/store.js";

// a storage that can be listed, like localStorage
const memory = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
};
const T = (min, sec = 0) => new Date(2026, 10, 16, 9, min, sec);
const deal = (s, pick = (p) => !p.full) => listPromotions(s, { viewer: "res-1" }).find(pick);
const parse = (text) => text.replace(/^﻿/, "").split("\r\n").filter(Boolean).map((l) => l.split(","));

test("with no claims the file is the header alone, nothing is made up", () => {
  const s = memory();
  assert.deepEqual(collectClaimRows(s), []);
  const r = exportClaims(s, T(1));
  assert.equal(r.count, 0);
  assert.equal(r.text, `﻿${CLAIM_CSV_COLUMNS.join(",")}\r\n`);
  assert.equal(CLAIM_CSV_COLUMNS.join(","), "Claim_ID,Unique_Code,Promo_ID,Promo_Title,Resident_ID,Unit,Status,Claimed_At,Decision_By,Updated_At");
  assert.equal(r.filename, "eso-promotions-claims-2026-11-16.csv");
});

test("a real claim is one row with the app's own values; a decision adds who and when", () => {
  const s = memory();
  const p = deal(s);
  const made = claim(s, "res-1", p, T(1));
  assert.ok(made.ok);
  let [row] = collectClaimRows(s);
  assert.deepEqual(
    { ...row, Promo_Title: row.Promo_Title === p.title },
    { Claim_ID: `res-1|${p.id}|1`, Unique_Code: made.code, Promo_ID: p.id, Promo_Title: true, Resident_ID: "res-1", Unit: "02-291", Status: "pending", Claimed_At: T(1).toISOString(), Decision_By: "", Updated_At: T(1).toISOString() },
  );
  assert.ok(decideClaim(s, { rid: "res-1", promoId: p.id, action: "verify", by: "Jordan Lee", now: T(5).getTime() }).ok);
  [row] = collectClaimRows(s);
  assert.deepEqual([row.Status, row.Decision_By, row.Claimed_At, row.Updated_At], ["verified", "Jordan Lee", T(1).toISOString(), T(5).toISOString()]);
});

test("a cancellation is the resident's own; a rejection names who rejected; each claim of a promotion is its own row with its own code", () => {
  const s = memory();
  const p = deal(s);
  assert.ok(claim(s, "res-1", p, T(1)).ok);
  assert.ok(cancelClaim(s, "res-1", p.id, T(2)).ok);
  const second = claim(s, "res-1", p, T(10));
  assert.ok(second.ok && !second.again);
  assert.ok(decideClaim(s, { rid: "res-1", promoId: p.id, action: "reject", reason: "Wrong building", by: "Staff", now: T(12).getTime() }).ok);
  const rows = collectClaimRows(s);
  assert.equal(rows.length, 2);
  const [newest, oldest] = rows;
  assert.deepEqual([newest.Claim_ID, newest.Status, newest.Decision_By, newest.Claimed_At, newest.Updated_At], [`res-1|${p.id}|2`, "rejected", "Staff", T(10).toISOString(), T(12).toISOString()]);
  assert.deepEqual([oldest.Claim_ID, oldest.Status, oldest.Decision_By, oldest.Claimed_At, oldest.Updated_At], [`res-1|${p.id}|1`, "cancelled", "resident:res-1", T(1).toISOString(), T(2).toISOString()]);
});

test("residents are found by their keys, so a person the code has never heard of is exported too; the inbox's demo rows are not", () => {
  const s = memory();
  s.setItem("eso-res-promo:ghost-9", JSON.stringify({ saved: [], claims: { zzz: { count: 1, code: "ZZZ-1", at: T(3).toISOString(), who: { name: "Someone", unit: "09-901" } } }, log: [] }));
  s.setItem("eso-pmclaims", JSON.stringify([{ id: "c1001", name: "Demo Person", unit: "02-100", code: "DEMO-1", st: "pending", t: Date.now(), deal: "parking0" }]));
  const rows = collectClaimRows(s);
  assert.deepEqual(rows.map((r) => [r.Resident_ID, r.Claim_ID, r.Unique_Code, r.Unit, r.Promo_Title]), [["ghost-9", "ghost-9|zzz|1", "ZZZ-1", "09-901", ""]], "the unknown promotion has no title, nothing is guessed");
  assert.ok(!claimsCsv(rows).includes("DEMO-1") && !claimsCsv(rows).includes("Demo Person"));
});

test("a record from before the per-claim codes and times existed still exports what is really there and leaves the rest blank", () => {
  const s = memory();
  s.setItem("eso-res-promo:res-7", JSON.stringify({ saved: [], claims: { parking0: { count: 2, code: "MALLA10", at: "2026-11-16T17:13:48.830Z" } } }));
  const rows = collectClaimRows(s);
  assert.deepEqual(rows.map((r) => [r.Claim_ID.split("|")[2], r.Unique_Code, r.Claimed_At, r.Unit, r.Decision_By, r.Status]), [
    ["2", "MALLA10", "2026-11-16T17:13:48.830Z", "", "", "pending"],
    ["1", "MALLA10", "", "", "", "pending"],
  ]);
});

test("broken or wrong-type storage gives fewer rows, never an error", () => {
  const s = memory();
  for (const [k, v] of [
    ["eso-res-promo:a", "{oops"],
    ["eso-res-promo:b", "[]"],
    ["eso-res-promo:c", JSON.stringify({ claims: { x: 5, y: null, z: { count: "many" } } })],
    ["eso-res-promo:", JSON.stringify({ claims: { q: { count: 1, code: "Q" } } })],
    [KEY.claimState, "5"],
    ["eso-pm-audit-v1", '{"events":"x"}'],
  ])
    s.setItem(k, v);
  assert.deepEqual(collectClaimRows(s), []);
  s.setItem("eso-res-promo:d", JSON.stringify({ claims: { p: { count: 1e12, code: "BIG" } } }));
  assert.equal(collectClaimRows(s).length, 1000, "a damaged count is capped");
  assert.deepEqual(collectClaimRows({ getItem: () => null }), [], "a storage that cannot be listed is empty");
});

test("CSV cells: quoted when they must be, a formula is made harmless, the file has a BOM and CRLF line ends", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell(null), "");
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell("two\nlines"), '"two\nlines"');
  assert.equal(csvCell(" padded"), '" padded"');
  for (const bad of ["=SUM(A1)", "+1", "-1", "@cmd", "\tx", "\rx"]) assert.ok(csvCell(bad).replace(/^"/, "").startsWith("'"), JSON.stringify(bad));
  assert.equal(csvCell("2026-11-16T09:01:00.000Z"), "2026-11-16T09:01:00.000Z");
  const text = claimsCsv([{ Claim_ID: "a|b|1", Unique_Code: "=1+1", Promo_ID: "b", Promo_Title: 'The "best", deal', Resident_ID: "a", Unit: "02-291", Status: "pending", Claimed_At: "", Decision_By: "", Updated_At: "" }]);
  assert.ok(text.startsWith("﻿Claim_ID,"));
  const lines = text.split("\r\n");
  assert.equal(lines.length, 3, "header, one row, the closing line end");
  assert.equal(lines[1], `a|b|1,'=1+1,b,"The ""best"", deal",a,02-291,pending,,,`);
  assert.equal(parse(text)[0].length, 10);
});

test("the Staff button exports what is in the storage, not what is on the screen", () => {
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.ok(staff.includes('await import("/features/promotions/claims-csv.js")') && staff.includes("m.exportClaims(localStorage)"));
  assert.ok(staff.includes('data-clcsv aria-label="Export CSV"') && staff.includes('<span class="lb">Export CSV</span>'));
  assert.ok(staff.includes('"No claims to export yet"'), "an empty storage says so");
  assert.ok(!staff.includes('"Claim ID","Promotion","Resident"'), "the old export of the list on screen (with names and demo rows) is gone");
});

test("the decider is the staff member's name and id: kept in the decision, in the audit log and in the export", () => {
  const s = memory();
  const p = deal(s);
  assert.ok(claim(s, "res-1", p, T(1)).ok);
  assert.ok(decideClaim(s, { rid: "res-1", promoId: p.id, action: "verify", by: "Jordan Lee", byId: "stf-1", now: T(5).getTime() }).ok);
  assert.deepEqual([JSON.parse(s.getItem(KEY.claimState))[`res-1|${p.id}|1`].by, JSON.parse(s.getItem(KEY.claimState))[`res-1|${p.id}|1`].byId], ["Jordan Lee", "stf-1"]);
  const verify = JSON.parse(s.getItem("eso-pm-audit-v1")).events.find((e) => e.type === "verify");
  assert.deepEqual([verify.actor, verify.actorId, verify.at], ["Jordan Lee", "stf-1", T(5).toISOString()]);
  assert.equal(collectClaimRows(s)[0].Decision_By, "Jordan Lee (stf-1)");
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.ok(staff.includes("byId:actorId()") && staff.includes("actorId:rec.byId"), "Staff's own Verify records the id too");
  assert.ok(readFileSync(new URL("../../src/features/messaging/app.js", import.meta.url), "utf8").includes("by: me.name, byId: me.id"), "and so does a decision made from the chat");
});

test("the Verify and Reject icon buttons of a claim row are 44 px on a phone or touch screen", () => {
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.ok(staff.includes("@media(pointer:coarse),(max-width:639px){.cl-ib{width:44px;height:44px}}"));
  assert.ok(staff.includes('class="cl-ib ok" data-clv="${c.id}" aria-label="Verify" title="Verify"'), "the button has a name");
});

test("the Staff Claims inbox holds only real claims: no demo generator, old demo rows are dropped, the lists never make up names", () => {
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.ok(!staff.includes("function seed(){const ids=Object.keys(META)"), "the demo generator is gone");
  assert.ok(!staff.includes("CL=seed()"), "a missing inbox starts empty");
  assert.ok(staff.includes("if(!Array.isArray(CL)){CL=[];sv()}") && staff.includes("CL=CL.filter(c=>c&&c.rk);"), "rows without a claim key (the old demo rows) are dropped when the inbox loads");
  assert.ok(staff.includes("const syn=[],rows=rows0;"), "the Claimed by list adds no invented earlier claimants");
  assert.ok(staff.includes("filter(c=>c.deal==id):[],"), "the Viewed by list adds no invented viewers");
  assert.ok(staff.includes('"Who viewed is not recorded."'));
});

test("Staff see who claimed: the unit is cut to its first character until the eye beside it is pressed (inbox row, claim detail, lookup, Claimed by list), then the whole unit and the resident id show", () => {
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.ok(staff.includes('const mask=c=>U.rev.has(c.id)?"Unit "+c.unit:"Unit "+String(c.unit||"").slice(0,1)+"••";'));
  assert.ok(staff.includes("const eyeBtn=c=>") && staff.includes('data-cleye="${c.id}" aria-pressed="${on}"'), "an eye with a name and a pressed state");
  assert.ok(staff.includes("<span>${mask(c)}${eyeBtn(c)} · ${ago(c.t)}</span>"), "on the inbox row");
  assert.ok(staff.includes('<span>${mask(c)}${c.rid?" · "+(U.rev.has(c.id)?H(c.rid):"•••"):""}${eyeBtn(c)}</span>'), "in the claim detail, beside the unit line, with the resident id");
  assert.ok(staff.includes("<span>${mask(c)}${eyeBtn(c)}</span><br>"), "in the Redeem lookup");
  assert.ok(staff.includes('data-pweye aria-pressed="false"'), "in the Claimed by list");
  assert.ok(staff.includes('if(b=g("data-cleye")){e.stopPropagation();'), "pressing the eye does not open the claim");
  assert.ok(staff.includes(".cl-eye::after{content:\"\";position:absolute;inset:-10px}"), "24 px icon, 44 px to press");
  assert.ok(!staff.includes("units are masked") && !staff.includes("Unit masked by resident privacy"));
  assert.ok(/CLAIM_CSV_COLUMNS/.test(readFileSync(new URL("../../src/features/promotions/claims-csv.js", import.meta.url), "utf8")) && collectClaimRows(memory()).length === 0, "the CSV export keeps the whole unit (it is the sync file)");
});
