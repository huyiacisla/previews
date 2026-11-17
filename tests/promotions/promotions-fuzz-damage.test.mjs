// Stored data that is damaged field by field (null, text, a list, a huge number, an empty object where a normal value should be) in the claim, decision, inbox, audit, load and deal
// records: no function that reads or acts on them throws, the export still gives a file, and acting on a damaged record either works or says no. Seeded. Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import "../../src/features/promotions/catalog.js";
import { readAudit, spotsTaken } from "../../src/features/promotions/audit.js";
import { claimsCsv, collectClaimRows } from "../../src/features/promotions/claims-csv.js";
import { decideClaim } from "../../src/features/promotions/decide.js";
import {
  activeClaims, cancelClaim, categoriesIn, claim, claimDecidedAt, claimedByResidents, claimStatus, claimTimeline, historyFor, householdClaims, listPromotions, lookupCode, residentState,
  MAX_CLAIMS, rewardInfo, toggleSaved, unitBlocks, unitHistory,
} from "../../src/features/promotions/store.js";

const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
};
const ODD = [null, "x", "", 12, -1, 0, 1e308, 8.7e15, [], {}, [1, "a"], { a: 1 }, true, false, "2026-13-45", "NaN", 1.5, -8.7e15];

function build() {
  const s = memory();
  s.setItem("eso-pmclaims", "[]");
  const open = listPromotions(s, { viewer: "res-1" }).filter((p) => !p.full).slice(0, 3);
  let t = Date.UTC(2026, 10, 16, 9, 0, 0);
  for (const res of ["res-1", "res-2", "res-3", "res-4"]) for (const p of open) { t += 5000; claim(s, res, p, new Date(t)); }
  decideClaim(s, { rid: "res-2", promoId: open[0].id, action: "verify", by: "Jordan Lee", byId: "stf-1", now: t });
  decideClaim(s, { rid: "res-3", promoId: open[1].id, action: "reject", reason: "no", by: "Jordan Lee", byId: "stf-1", now: t });
  cancelClaim(s, "res-2", open[1].id, new Date(t + 9000));
  toggleSaved(s, "res-1", open[0].id);
  s.setItem("eso-pm-ends", JSON.stringify({ [open[2].id]: "2026-12-31" }));
  return { s, open };
}

const KEYS = ["eso-res-promo:res-1", "eso-res-promo:res-2", "eso-res-promo:res-3", "eso-res-promo:res-4", "eso-pm-claimstate", "eso-pmclaims", "eso-pm-audit-v1", "eso-pm-load", "eso-pm-ends", "eso-pm-status"];

function mutate(r, text) {
  if (r() < 0.12) return text.slice(0, Math.floor(r() * text.length)); // cut off
  let v;
  try { v = JSON.parse(text); } catch { return text; }
  const paths = [];
  const walk = (o, p) => {
    paths.push(p);
    if (o && typeof o === "object") for (const k of Object.keys(o)) walk(o[k], [...p, k]);
  };
  walk(v, []);
  const p = paths[Math.floor(r() * paths.length)];
  const odd = ODD[Math.floor(r() * ODD.length)];
  if (!p.length) return JSON.stringify(odd);
  let o = v;
  for (const k of p.slice(0, -1)) o = o[k];
  if (r() < 0.2) delete o[p[p.length - 1]];
  else o[p[p.length - 1]] = odd;
  return JSON.stringify(v);
}

function exercise(s, open, label) {
  const calls = {
    list: () => listPromotions(s, { viewer: "res-1" }),
    listOther: () => listPromotions(s, { viewer: "res-3", query: "valet" }),
    cats: () => categoriesIn(s, undefined, "res-1"),
    lookup: () => lookupCode(s, "MALLA10", { viewer: "res-1" }),
    stock: () => claimedByResidents(s, open[0].id),
    info: () => rewardInfo(s, open[0].id),
    audit: () => [readAudit(s), spotsTaken(s, open[0].id)],
    csv: () => claimsCsv(collectClaimRows(s)),
  };
  for (const res of ["res-1", "res-2", "res-3", "res-4"]) {
    calls[`state ${res}`] = () => residentState(s, res);
    for (const p of open) {
      calls[`status ${res} ${p.id}`] = () => claimStatus(s, res, p.id);
      calls[`active ${res} ${p.id}`] = () => activeClaims(s, res, p.id);
      calls[`timeline ${res} ${p.id}`] = () => claimTimeline(s, res, p.id);
      calls[`decidedAt ${res} ${p.id}`] = () => claimDecidedAt(s, res, p.id);
      calls[`household ${res} ${p.id}`] = () => householdClaims(s, res, p.id);
    }
    calls[`history ${res}`] = () => historyFor(s, res, () => "t");
    calls[`blocks ${res}`] = () => unitBlocks(s, res);
    calls[`unitHist ${res}`] = () => unitHistory(s, res);
  }
  const bad = [];
  for (const [name, fn] of Object.entries(calls)) {
    try { fn(); } catch (e) { bad.push(`${name}: ${e && e.message}`); }
  }
  // acting on damaged data: works or says no, never throws
  let t = Date.UTC(2026, 10, 17, 9, 0, 0);
  for (const res of ["res-1", "res-2", "res-3", "res-4"]) {
    for (const p of open) {
      t += 5000;
      for (const [name, fn] of Object.entries({
        claim: () => claim(s, res, listPromotions(s, { viewer: res }).find((x) => x.id === p.id) || p, new Date(t)),
        cancel: () => cancelClaim(s, res, p.id, new Date(t)),
        verify: () => decideClaim(s, { rid: res, promoId: p.id, action: "verify", now: t }),
        reject: () => decideClaim(s, { rid: res, promoId: p.id, action: "reject", reason: "x", now: t }),
        unverify: () => decideClaim(s, { rid: res, promoId: p.id, action: "unverify", now: t }),
        save: () => toggleSaved(s, res, p.id),
      })) {
        try { fn(); } catch (e) { bad.push(`${name} ${res} ${p.id}: ${e && e.message}`); }
      }
    }
  }
  return bad.map((b) => `${label}: ${b}`);
}

test("claim, decision, inbox, audit, load and deal records damaged field by field never make a read or an action throw (250 damaged copies)", () => {
  const all = [];
  for (let seed = 1; seed <= 250; seed++) {
    const r = rng(seed);
    const { s, open } = build();
    const key = KEYS[Math.floor(r() * KEYS.length)];
    const raw = s.getItem(key);
    if (raw === null) continue;
    const times = 1 + Math.floor(r() * 2);
    let damaged = raw;
    for (let k = 0; k < times; k++) damaged = mutate(r, damaged);
    s.setItem(key, damaged);
    const bad = exercise(s, open, `seed ${seed} ${key} -> ${damaged.slice(0, 90)}`);
    all.push(...bad);
  }
  assert.deepEqual(all.slice(0, 12), [], `${all.length} calls threw on damaged data`);
});

test("a claim count of a million or more (a damaged record) is cut, so no list walks to it and the page does not freeze", () => {
  const s = memory();
  const [p] = listPromotions(s, { viewer: "res-1" }).filter((x) => !x.full);
  s.setItem("eso-res-promo:res-1", JSON.stringify({ v: 1, saved: [], claims: { [p.id]: { count: 1e308, code: "X", at: "2026-11-16T09:00:00.000Z" } } }));
  const t0 = Date.now();
  assert.equal(residentState(s, "res-1").claims[p.id].count, MAX_CLAIMS);
  listPromotions(s, { viewer: "res-1" });
  claimedByResidents(s, p.id);
  historyFor(s, "res-1", () => "t");
  claimsCsv(collectClaimRows(s));
  assert.ok(Date.now() - t0 < 2000, "all of it ran at once, not in minutes");
  s.setItem("eso-res-promo:res-1", JSON.stringify({ v: 1, claims: { [p.id]: { count: "9".repeat(30) } } }));
  assert.equal(residentState(s, "res-1").claims[p.id].count, MAX_CLAIMS);
});

test("the Staff inbox import cuts a damaged claim count too", () => {
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.ok(staff.includes("n=c&&Math.min(1000,Math.floor(+c.count))"));
});
