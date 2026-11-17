// Random sequences of what residents and Staff do (claim, cancel, confirm, apply by hand, reject, take a confirm back), with the same rules checked after every step:
// the places taken in the audit log equal the claims that really hold a place, a place is given back once per claim, a unit never holds more than its limit, what the resident reads
// is what the model says, and nothing throws. Seeded, so a failure repeats. Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import "../../src/features/promotions/catalog.js";
import { readAudit, spotsTaken } from "../../src/features/promotions/audit.js";
import { decideClaim } from "../../src/features/promotions/decide.js";
import { cancelClaim, claim, claimStatus, householdClaims, listPromotions, residentState } from "../../src/features/promotions/store.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};
const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const RES = ["res-1", "res-2", "res-3", "res-4"]; // the residents the app knows (stock is counted for them); res-1 and res-4 share a unit
const pick = (r, a) => a[Math.floor(r() * a.length)];

function run(seed, steps = 70) {
  const r = rng(seed);
  const s = memory();
  s.setItem("eso-pmclaims", "[]"); // Staff's inbox has been opened once
  // five open deals, the ones with the fewest places left first (so the last place is fought over)
  const open = listPromotions(s, { viewer: "res-1" }).filter((p) => !p.full);
  const promos = [...open.filter((p) => p.left != null).sort((a, b) => a.left - b.left).slice(0, 3), ...open.filter((p) => p.left == null).slice(0, 2)];
  s.__left = new Map(promos.map((p) => [p.id, p.left]));
  const log = [];
  let t = Date.UTC(2026, 10, 16, 9, 0, 0);
  const model = new Map(); // "res|promo|n" -> "pending" | "verified" | "redeemed" | "rejected" | "cancelled"
  const newest = (res, id) => residentState(s, res).claims[id];
  for (let i = 0; i < steps; i++) {
    t += 2000 + Math.floor(r() * 4000); // never inside the double-press window
    const res = pick(r, RES);
    const p = pick(r, promos);
    const op = pick(r, ["claim", "claim", "cancel", "verify", "apply", "reject", "unverify"]);
    log.push(`${op} ${res} ${p.id}`);
    try {
      if (op === "claim") {
        const before = newest(res, p.id);
        const out = claim(s, res, p, new Date(t));
        const after = newest(res, p.id);
        if (out.ok && !out.again && after && (!before || after.count > before.count)) model.set(`${res}|${p.id}|${after.count}`, "pending");
      } else if (op === "cancel") {
        const c = newest(res, p.id);
        const out = cancelClaim(s, res, p.id, new Date(t));
        if (out.ok && c) model.set(`${res}|${p.id}|${c.count}`, "cancelled");
      } else {
        const c = newest(res, p.id);
        const action = op === "apply" ? "apply" : op;
        const out = decideClaim(s, { rid: res, promoId: p.id, action, reason: "because", by: "Jordan Lee", byId: "stf-1", now: t });
        if (out.ok && !out.noop && c) {
          const key = `${res}|${p.id}|${c.count}`;
          model.set(key, { verify: "verified", apply: "verified", reject: "rejected", unverify: "pending" }[action]);
        }
      }
    } catch (e) {
      assert.fail(`seed ${seed} step ${i} (${op} ${res} ${p.id}) threw: ${e && e.stack}\n${log.join("\n")}`);
    }
    check(seed, i, s, promos, model, log);
  }
}

function check(seed, i, s, promos, model, log) {
  const where = () => `seed ${seed} step ${i}\n${log.slice(-12).join("\n")}`;
  const audit = readAudit(s);
  for (const p of promos) {
    // the places held: every claim that is neither cancelled nor rejected
    let held = 0;
    for (const res of RES) {
      const c = residentState(s, res).claims[p.id];
      if (!c) continue;
      for (let n = 1; n <= c.count; n++) {
        const m = model.get(`${res}|${p.id}|${n}`);
        if (m !== "cancelled" && m !== "rejected") held++;
      }
    }
    if (s.__left.get(p.id) != null) assert.ok(held <= s.__left.get(p.id), `${p.id} holds ${held} places but only ${s.__left.get(p.id)} were left (sold more than it has): ${where()}`);
    assert.equal(spotsTaken(s, p.id), held, `places taken in the audit log (${spotsTaken(s, p.id)}) differ from the claims that hold one (${held}) for ${p.id}: ${where()}`);
    // a unit never holds more than its limit
    if (p.scope === "unit") {
      const unit = [...RES].filter((x) => x === "res-1" || x === "res-4");
      let activeInUnit = 0;
      for (const res of unit) {
        const c = residentState(s, res).claims[p.id];
        if (!c) continue;
        for (let n = 1; n <= c.count; n++) {
          const m = model.get(`${res}|${p.id}|${n}`);
          if (m !== "cancelled" && m !== "rejected") activeInUnit++;
        }
      }
      assert.ok(activeInUnit <= p.perResident, `the unit holds ${activeInUnit} claims of ${p.id}, the limit is ${p.perResident}: ${where()}`);
    }
  }
  // a place is given back once per claim, never for a claim that was not made
  const gave = new Map();
  const made = new Set();
  for (const e of audit) {
    const k = `${e.residentId}|${e.promoId}|${e.n}`;
    if (e.type === "claim") made.add(k);
    if (e.type === "give_back") gave.set(k, (gave.get(k) || 0) + 1);
  }
  for (const [k, n] of gave) {
    assert.ok(n <= 1, `claim ${k} gave its place back ${n} times: ${where()}`);
    assert.ok(made.has(k), `claim ${k} gave back a place it never took: ${where()}`);
  }
  // what the resident reads is what the model says for the newest claim
  for (const [k, m] of model) {
    const [res, id, n] = k.split("|");
    const c = residentState(s, res).claims[id];
    if (!c || c.count !== Number(n)) continue;
    const cs = claimStatus(s, res, id);
    const read = cs.cancelled ? "cancelled" : cs.st;
    assert.equal(read, m, `the resident reads "${read}" for ${k} but it should be "${m}": ${where()}`);
  }
  // the unit mates are the other people of the unit, never the resident
  for (const res of RES) for (const p of promos) assert.ok(householdClaims(s, res, p.id).every((x) => x.id !== res), `a resident is their own unit mate: ${where()}`);
}

test("random claim, cancel, confirm, apply, reject and take-back sequences keep places, units and what residents read consistent (120 sequences)", () => {
  for (let seed = 1; seed <= 120; seed++) run(seed, 80);
});
