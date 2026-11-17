// A claim is checked again, at the moment it is made, against what is stored: a double click is one claim, the last place cannot be taken twice, a promotion that was paused,
// ended or removed while the details were open is refused with a reason, a full deal does not fill the history, every claim and decision is in the audit log with who did it,
// a decision is written in an order that cannot leave the inbox and the resident disagreeing, and broken storage never throws. Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { appendAudit, AUDIT_KEY, readAudit, spotsTaken } from "../../src/features/promotions/audit.js";
import { decideClaim } from "../../src/features/promotions/decide.js";
import { activeClaims, cancelClaim, claim, claimCheck, claimedByResidents, KEY, listPromotions, newUniqueCode, residentState, toggleSaved } from "../../src/features/promotions/store.js";

const memory = (seed = {}) => {
  const m = new Map(Object.entries(seed).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k), raw: m };
};
const T = (min, sec = 0) => new Date(2026, 10, 16, 9, min, sec);
const form = (over = {}) => ({ title: "Valet", reward: "First 3 months", desc: "d", cat: "parking", otype: "pct", oval: "20", method: "static", code: "VALET20", start: "2026-11-01", end: "2027-01-31", ch: ["In-App"], au: "all", limR: "1", ...over });
const rec = (id, st, x, claims = 0) => ({ id, st, x: form(x), views: 0, claims });
const open = (records) => memory({ [KEY.published]: records });
const card = (s, id = "1") => listPromotions(s, { samples: false, today: "2026-11-16" }).find((p) => p.id === id);
const setRecords = (s, records) => s.setItem(KEY.published, JSON.stringify(records));
const log = (s, rid, id) => residentState(s, rid).log.filter((e) => e.p === id);

test("a double click is one claim: two presses of one resident within a moment count once, a real second claim a moment later counts", () => {
  const s = open([rec("1", "active", { limR: "3" })]);
  const p = card(s);
  const a = claim(s, "res-1", p, T(1));
  const b = claim(s, "res-1", p, T(1, 0)); // the second click of the same press
  assert.ok(a.ok && b.ok && b.again === true);
  assert.equal(residentState(s, "res-1").claims["1"].count, 1, "one claim, not two");
  assert.equal(readAudit(s).filter((e) => e.type === "claim").length, 1, "and one line in the log");
  const c = claim(s, "res-1", p, T(2)); // a minute later: the limit is 3, this is a real second claim
  assert.ok(c.ok && !c.again);
  assert.equal(residentState(s, "res-1").claims["1"].count, 2);
});

test("the last place cannot be taken twice: the card said there was one, what is stored says there is none", () => {
  const s = open([rec("1", "active", { limT: "1" })]);
  const stale = card(s); // both tabs drew this card while one place was left
  assert.equal(stale.full, false);
  assert.ok(claim(s, "res-2", card(s), T(1)).ok, "the first resident gets it");
  assert.equal(claimedByResidents(s, "1"), 1);
  const late = claim(s, "res-3", stale, T(2)); // the second one still has the old card
  assert.equal(late.ok, false);
  assert.match(late.reason, /fully claimed/);
  assert.equal(late.why, "full");
  assert.equal(claimedByResidents(s, "1"), 1, "no second claim was stored");
  assert.equal(spotsTaken(s, "1"), 1, "and the log says one place is gone");
});

test("a promotion paused, removed or ended while the details were open is refused with a reason, and nothing is stored", () => {
  const s = open([rec("1", "active"), rec("2", "active", { end: "2026-11-16", etime: "10:00" }), rec("3", "active")]);
  const [p1, p2, p3] = ["1", "2", "3"].map((id) => card(s, id));
  setRecords(s, [rec("1", "draft"), rec("2", "active", { end: "2026-11-16", etime: "10:00" }), rec("3", "removed")]); // Staff paused 1 and removed 3
  const paused = claim(s, "res-1", p1, T(1));
  assert.deepEqual([paused.ok, paused.why], [false, "paused"]);
  assert.match(paused.reason, /paused/);
  const gone = claim(s, "res-1", p3, T(1));
  assert.deepEqual([gone.ok, gone.why], [false, "gone"]);
  assert.match(gone.reason, /no longer available/);
  // 2 ends at 10:00 today: before that it can be claimed, after it the exact time has passed even though the date has not
  const ok = claim(s, "res-1", p2, T(59)); // 09:59
  assert.ok(ok.ok, "one minute before the end");
  const late = claim(s, "res-2", p2, new Date(2026, 10, 16, 10, 1));
  assert.deepEqual([late.ok, late.why], [false, "ended"]);
  assert.match(late.reason, /ended/);
  assert.equal(residentState(s, "res-1").claims["1"], undefined, "nothing was claimed of the paused one");
  assert.equal(readAudit(s).filter((e) => e.type === "claim").length, 1, "only the one real claim is in the log");
  // not started yet, and Promotions switched off for residents
  setRecords(s, [rec("1", "active", { start: "2026-12-01" })]);
  assert.equal(claimCheck(s, "1", T(1)).block.why, "soon");
  s.setItem(KEY.settings, JSON.stringify({ promoShow: false }));
  assert.equal(claimCheck(s, "1", T(1)).block.why, "off");
});

test("a full deal tried again and again leaves one row in the history, not one per click", () => {
  const s = open([rec("1", "active", { limT: "1" }, 1)]); // already at its limit
  const p = { ...card(s), full: true };
  for (let i = 0; i < 6; i += 1) assert.equal(claim(s, "res-1", p, T(i + 1)).ok, false);
  assert.equal(log(s, "res-1", "1").filter((e) => e.k === "failed").length, 1);
  // a different reason is a new row
  setRecords(s, [rec("1", "draft", { limT: "1" }, 1)]);
  claim(s, "res-1", p, T(10));
  assert.equal(log(s, "res-1", "1").filter((e) => e.k === "failed").length, 2);
});

test("every claim and decision is in the audit log with who, what, when and what happened to the places", () => {
  const s = open([rec("1", "active", { limT: "5" })]);
  s.setItem("eso-pmclaims", "[]");
  const p = card(s);
  const c = claim(s, "res-1", p, T(1));
  assert.deepEqual(
    readAudit(s).map((e) => [e.type, e.spotDelta, e.actor, e.residentId, e.promoId]),
    [["claim", -1, "resident:res-1", "res-1", "1"]],
  );
  assert.equal(readAudit(s)[0].code, c.code);
  assert.equal(readAudit(s)[0].at, T(1).toISOString());
  assert.match(readAudit(s)[0].id, /^a_/);
  assert.ok(decideClaim(s, { rid: "res-1", promoId: "1", action: "verify", by: "Jordan Lee", now: T(2).getTime() }).ok);
  assert.equal(JSON.parse(s.getItem(KEY.claimState))["res-1|1|1"].by, "Jordan Lee", "the decision keeps who made it");
  assert.equal(readAudit(s).at(-1).type, "verify");
  assert.equal(readAudit(s).at(-1).actor, "Jordan Lee");
  // a second resident is rejected: a reject (no change in places) and the place given back
  claim(s, "res-2", card(s), T(3));
  assert.ok(decideClaim(s, { rid: "res-2", promoId: "1", action: "reject", reason: "Not a resident of Building A", by: "Jordan Lee", now: T(4).getTime() }).ok);
  const tail = readAudit(s).slice(-2);
  assert.deepEqual(tail.map((e) => [e.type, e.spotDelta, e.reason]), [["reject", 0, "Not a resident of Building A"], ["give_back", 1, "Rejected: Not a resident of Building A"]]);
  // a resident cancels: a give_back by the resident
  claim(s, "res-3", card(s), T(5));
  assert.ok(cancelClaim(s, "res-3", "1", T(6)).ok);
  const last = readAudit(s).at(-1);
  assert.deepEqual([last.type, last.spotDelta, last.actor], ["give_back", 1, "resident:res-3"]);
  // the places the log says are taken are the places the app counts
  assert.equal(spotsTaken(s, "1"), claimedByResidents(s, "1"));
  assert.equal(spotsTaken(s, "1"), 1, "res-1 holds one, the other two gave theirs back");
});

test("the log only grows, and a damaged log reads as empty and is never thrown on", () => {
  const s = open([]);
  assert.ok(appendAudit(s, { type: "claim", promoId: "1", residentId: "res-1" }).ok);
  assert.ok(appendAudit(s, { type: "verify", promoId: "1", residentId: "res-1", actor: "Staff" }).ok);
  assert.equal(readAudit(s).length, 2);
  assert.equal(JSON.parse(s.getItem(AUDIT_KEY)).v, 1, "tagged with its version");
  for (const bad of ["{oops", "[]", "5", '{"events":"x"}', '{"v":1,"events":[null,5,{"id":"a"}]}']) {
    s.setItem(AUDIT_KEY, bad);
    assert.deepEqual(readAudit(s), [], bad);
  }
  assert.throws(() => appendAudit(s, { type: "nope", promoId: "1" }), /unknown type/);
});

test("a decision is written inbox first, resident second, log last, and a failure puts everything back", () => {
  const make = () => {
    const s = open([rec("1", "active", { limT: "5" })]);
    s.setItem("eso-pmclaims", JSON.stringify([]));
    claim(s, "res-1", card(s), T(1));
    return s;
  };
  for (const failing of ["eso-pmclaims", KEY.claimState, AUDIT_KEY]) {
    const s = make();
    const before = { inbox: s.getItem("eso-pmclaims"), state: s.getItem(KEY.claimState), audit: s.getItem(AUDIT_KEY) };
    const real = s.setItem;
    s.setItem = (k, v) => {
      if (k === failing) throw new Error("QuotaExceededError");
      real(k, v);
    };
    const r = decideClaim(s, { rid: "res-1", promoId: "1", action: "reject", reason: "No", by: "Staff", now: T(2).getTime() });
    assert.equal(r.ok, false, `${failing} failed`);
    s.setItem = real;
    assert.deepEqual({ inbox: s.getItem("eso-pmclaims"), state: s.getItem(KEY.claimState), audit: s.getItem(AUDIT_KEY) }, before, `nothing changed when ${failing} could not be written`);
  }
  const s = make();
  const r = decideClaim(s, { rid: "res-1", promoId: "1", action: "reject", reason: "No", by: "Staff", now: T(2).getTime() });
  assert.ok(r.ok);
  assert.equal(JSON.parse(s.getItem("eso-pmclaims"))[0].st, "rejected", "the inbox says what the resident reads");
  assert.equal(JSON.parse(s.getItem(KEY.claimState))["res-1|1|1"].st, "rejected");
});

test("a claim that cannot be saved leaves no line in the audit log", () => {
  const s = open([rec("1", "active")]);
  const real = s.setItem;
  s.setItem = (k, v) => {
    if (k === KEY.mine("res-1")) throw new Error("QuotaExceededError");
    real(k, v);
  };
  const r = claim(s, "res-1", card(s), T(1));
  assert.equal(r.ok, false);
  assert.match(r.reason, /Could not save/);
  s.setItem = real;
  assert.deepEqual(readAudit(s), []);
});

test("a saved star that the browser would not store stays as it was", () => {
  const s = open([rec("1", "active")]);
  assert.equal(toggleSaved(s, "res-1", "1"), true);
  const real = s.setItem;
  s.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  assert.equal(toggleSaved(s, "res-1", "1"), true, "the page is told it is still saved");
  s.setItem = real;
  assert.equal(residentState(s, "res-1").saved.has("1"), true);
});

test("codes: random, one for each claim, and never one that was used before", () => {
  const s = open([rec("1", "active", { method: "unique", prefix: "res", code: "", limR: "3" })]);
  const p = card(s);
  const a = claim(s, "res-1", p, T(1)).code;
  const b = claim(s, "res-1", p, T(2)).code;
  const c = claim(s, "res-2", p, T(3)).code;
  assert.equal(new Set([a, b, c]).size, 3);
  for (const code of [a, b, c]) assert.match(code, /^RES-[A-Z2-9]{6}$/);
  const other = open([rec("1", "active", { method: "unique", prefix: "res", code: "", limR: "3" })]);
  assert.notEqual(claim(other, "res-1", card(other), T(1)).code, a, "the same resident and promotion elsewhere do not give the same code");
  assert.deepEqual(JSON.parse(s.getItem(KEY.mine("res-1"))).claims["1"].codes, { 1: a, 2: b });
  const fresh = newUniqueCode(s, "RES");
  assert.ok(![a, b, c].includes(fresh));
});

test("broken or wrong-type storage reads as empty and nothing throws", () => {
  const bad = ["{oops", "[]", "5", '"x"', "null", '{"claims":[],"saved":5,"log":"x"}', '{"claims":{"1":5,"2":null,"3":{"count":"two","cancelled":"x"}},"saved":[null,{},"9"],"log":[1,null,{"k":"claimed"}]}'];
  for (const text of bad) {
    const s = open([rec("1", "active")]);
    s.setItem(KEY.mine("res-1"), text);
    s.setItem(KEY.claimState, text);
    s.setItem(KEY.published, text === "null" ? text : JSON.stringify([rec("1", "active")]));
    const st = residentState(s, "res-1");
    assert.ok(st.saved instanceof Set && st.log.every((e) => e && typeof e === "object"), text);
    for (const c of Object.values(st.claims)) assert.ok(Number.isInteger(c.count) && c.count >= 0, text);
    assert.doesNotThrow(() => activeClaims(s, "res-1", "1"), text);
    assert.doesNotThrow(() => claimedByResidents(s, "1"), text);
    assert.doesNotThrow(() => listPromotions(s, { samples: false, today: "2026-11-16" }), text);
    assert.doesNotThrow(() => claim(s, "res-1", { id: "1" }, T(1)), text);
  }
});

test("a resident's record is written with its version, and a record without one still reads", () => {
  const s = open([rec("1", "active")]);
  s.setItem(KEY.mine("res-1"), JSON.stringify({ saved: ["1"], claims: { 1: { count: 1, code: "VALET20", at: T(1).toISOString() } } })); // the first shape, no version
  assert.equal(residentState(s, "res-1").claims["1"].count, 1);
  assert.equal(toggleSaved(s, "res-1", "1"), false);
  assert.equal(JSON.parse(s.getItem(KEY.mine("res-1"))).v, 1);
  assert.equal(residentState(s, "res-1").claims["1"].count, 1, "nothing was lost by the rewrite");
});

test("the pages agree: Resident refreshes on any resident's claim and on a moved end, the claim button is guarded, Staff records who decided", () => {
  const res = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(res.includes('e.key.startsWith("eso-res-promo:")'), "another resident's claim");
  assert.ok(res.includes("e.key === globalThis.PM_CATALOG.ENDS_KEY"), "Staff moved a deal's end");
  assert.ok(res.includes("if (claimBusy) return;\n  claimBusy = true;\n  $(\"#dlg-claim-btn\").disabled = true;"), "one press, one claim");
  assert.ok(res.includes('toast("This promotion is no longer available. It was paused or has ended.");'), "a deal that is gone says so");
  assert.ok(res.includes("toast(r.reason);"), "a refused claim says why");
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes('const actor=()=>STAFF_ME?STAFF_ME.name:window._wsRole!="staff"?"Property Manager":"Staff";') && staff.includes('const actorId=()=>STAFF_ME?STAFF_ME.id:"";'), "the decider is the signed-in staff member");
  assert.ok(staff.includes('"eso-pm-audit-v1"') && staff.includes('by:o&&o.st===c.st&&o.by?o.by:(/^Cancelled by resident/.test(c.reason||"")&&c.rid?"resident:"+c.rid:actor())'), "Staff's decisions carry who made them and go into the same log");
  assert.ok(staff.includes('(c.codes&&typeof c.codes==="object"?c.codes[j]:"")||c.code'), "each claim of the inbox has the code it was given");
});

test("claim, cancel, claim again: the cancelled claim stays cancelled on the record and does not count again, with or without Staff's inbox", () => {
  const s = open([rec("1", "active", { limR: "1", limT: "5" })]);
  assert.ok(claim(s, "res-1", card(s), T(1)).ok);
  assert.ok(cancelClaim(s, "res-1", "1", T(2)).ok);
  assert.equal(activeClaims(s, "res-1", "1").active, 0, "cancelled: nothing counts");
  const again = claim(s, "res-1", card(s), T(5));
  assert.ok(again.ok && !again.again, "a real new claim");
  const r = residentState(s, "res-1").claims["1"];
  assert.deepEqual([r.count, r.cancelled], [2, [1]], "the first claim is still marked cancelled");
  assert.equal(activeClaims(s, "res-1", "1").active, 1, "one claim counts, the new one");
  assert.equal(claimedByResidents(s, "1"), 1, "one place is taken, not two");
  assert.deepEqual(readAudit(s).map((e) => [e.type, e.spotDelta]), [["claim", -1], ["give_back", 1], ["claim", -1]]);
  assert.equal(spotsTaken(s, "1"), 1);
});

test("an old close event must not forget the promotion that was opened right after (the Phase 4 flake: Claim did nothing)", () => {
  const res = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  const at = res.indexOf('dlg.addEventListener("close", () => {');
  assert.ok(at > 0 && res.slice(at, at + 700).includes("if (dlg.open) return;\n  ui.openId = null;"), "a close event that arrives while the window is open again is ignored");
});
