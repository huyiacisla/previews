// When the audit log is full the oldest entries are dropped, but what they did to the spots is added up in `base`, so the places taken stay right. Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { appendAudit, AUDIT_KEY, readAudit, readBase, spotsTaken } from "../../src/features/promotions/audit.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};
const ev = (type, promoId, n, i) => ({ type, promoId, residentId: "res-1", n, actor: "resident:res-1", at: new Date(Date.UTC(2026, 10, 16, 9, 0, 0) + i * 1000) });

test("after the log is cut at 5000 entries the places taken are the same as before the cut", () => {
  const s = memory();
  const mk = (type, promoId, n, i) => ({ id: `a_${i}`, type, promoId, residentId: "res-1", n, actor: "resident:res-1", reason: "", spotDelta: type === "claim" ? -1 : type === "give_back" ? 1 : 0, at: new Date(Date.UTC(2026, 10, 16, 9, 0, 0) + i * 1000).toISOString() });
  // a log that is nearly full: three places of p1 taken at the very start (the oldest), then pairs of p2 claims and give-backs, then one p2 place held
  const events = [mk("claim", "p1", 1, 0), mk("claim", "p1", 2, 1), mk("claim", "p1", 3, 2)];
  let i = 3;
  while (events.length < 4996) {
    events.push(mk("claim", "p2", i, i), mk("give_back", "p2", i, i + 1));
    i += 2;
  }
  events.push(mk("claim", "p2", 99999, i++));
  s.setItem(AUDIT_KEY, JSON.stringify({ v: 1, events }));
  assert.equal(spotsTaken(s, "p1"), 3);
  assert.equal(spotsTaken(s, "p2"), 1);
  // ten more entries: the oldest are dropped
  for (let k = 0; k < 5; k++) assert.ok(appendAudit(s, ev("claim", "p2", 100000 + k, 10000 + k * 2), ev("give_back", "p2", 100000 + k, 10001 + k * 2)).ok);
  assert.ok(readAudit(s).length <= 5000, "the log is cut");
  assert.equal(readAudit(s).filter((e) => e.promoId === "p1").length, 0, "the old p1 entries are gone");
  assert.equal(spotsTaken(s, "p1"), 3, "but its three places are still counted");
  assert.equal(spotsTaken(s, "p2"), 1, "and p2 holds exactly one");
  assert.equal(readBase(s).p1, -3);
});

test("a log with no cut has no base; a damaged base is ignored", () => {
  const s = memory();
  appendAudit(s, ev("claim", "p1", 1, 0));
  assert.deepEqual(readBase(s), {});
  const doc = JSON.parse(s.getItem(AUDIT_KEY));
  doc.base = { p1: "x", p2: null, p3: [1], ok: 2 };
  s.setItem(AUDIT_KEY, JSON.stringify(doc));
  assert.deepEqual(readBase(s), { ok: 2 });
  s.setItem(AUDIT_KEY, "{not json");
  assert.deepEqual(readBase(s), {});
});

test("Staff's inbox keeps and extends the same base when it writes the log", () => {
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  assert.ok(staff.includes('cut=ev.length>5000?ev.slice(0,ev.length-5000):[];cut.forEach(x=>{base[x.promoId]=(base[x.promoId]||0)+(+x.spotDelta||0)})'));
  assert.ok(staff.includes('JSON.stringify({v:1,events:ev.slice(-5000),...(Object.keys(base).length?{base}:{})})'));
});
