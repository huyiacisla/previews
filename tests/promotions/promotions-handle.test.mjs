// What Staff can do about a claim from the Claims inbox (apply it by hand with a reason, keep notes only Staff see, open the resident's chat) and what the resident sees of it.
// Run with: npm test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { promoItems } from "../../src/features/notifications/live.js";
import { claimStatus, claimTimeline, historyFor, KEY } from "../../src/features/promotions/store.js";

function memory(seed = {}) {
  const m = new Map(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
}

const at = "2026-11-16T09:28:00.000Z";
const NOW = Date.parse("2026-11-16T10:00:00.000Z");
const seed = (state) =>
  memory({
    [KEY.mine("res-2")]: { saved: [], claims: { moving1: { count: 1, code: "CUBES20", at } }, log: [{ t: at, p: "moving1", k: "claimed", n: 1, note: "Code issued: CUBES20" }] },
    [KEY.claimState]: { "res-2|moving1|1": state },
  });

test("a claim Staff applied by hand tells the resident what was done, in the claim, its history and the notice; a plain Verify keeps its old words", () => {
  const manual = seed({ st: "verified", reason: "", at: NOW - 1000, vt: NOW - 1000, manual: "Discount credited to this month's invoice" });
  assert.equal(claimStatus(manual, "res-2", "moving1").manual, "Discount credited to this month's invoice");
  const line = claimTimeline(manual, "res-2", "moving1").find((e) => e.label === "Verified");
  assert.equal(line.note, "Applied by the property team: Discount credited to this month's invoice");
  const hist = historyFor(manual, "res-2", () => "CubeSmart").find((e) => e.label === "Verified");
  assert.equal(hist.note, line.note);
  const [item] = promoItems(manual, "resident", { id: "res-2" }, NOW);
  assert.ok(item.detail.includes("applied it for you") && item.detail.includes("credited to this month's invoice"));

  const plain = seed({ st: "verified", reason: "", at: NOW - 1000, vt: NOW - 1000 });
  assert.equal(claimStatus(plain, "res-2", "moving1").manual, undefined);
  assert.equal(claimTimeline(plain, "res-2", "moving1").find((e) => e.label === "Verified").note, "The property team confirmed your claim");
  assert.ok(promoItems(plain, "resident", { id: "res-2" }, NOW)[0].detail.includes("confirmed it"));
});

test("a rejected claim never carries an applied-by-hand note", () => {
  const s = seed({ st: "rejected", reason: "Claim limit reached", at: NOW, jt: NOW, manual: "left over" });
  assert.equal(claimStatus(s, "res-2", "moving1").manual, undefined);
});

test("the Claims inbox applies a claim by hand only with a reason, keeps notes away from residents, and opens the resident's chat", () => {
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes('data-clap="${c.id}">Apply by hand</button>'), "the detail has the button, for a claim that is waiting or verified and not yet applied");
  assert.ok(staff.includes('Say what you did so the resident knows.'), "no reason, no apply");
  assert.ok(staff.includes('c.manual={by:"Property team",at:Date.now(),reason:r.slice(0,200)}'));
  assert.ok(staff.includes('{manual:String(c.manual.reason).slice(0,200)}'), "the reason is published to the resident");
  assert.ok(!staff.includes("manual:c.notes") && !/out\[c\.rk\]=\{[^}]*notes/.test(staff), "notes are not part of what the resident can read");
  assert.ok(staff.includes('data-clinadd') && staff.includes("only Staff see these"));
  assert.ok(staff.includes('"/staff/messages.html#/c/"+id') && staff.includes('"No open chat with "+c0.name+"."'), "the resident's open chat, or a plain word when there is none");
  assert.ok(staff.includes("delete c.manual"), "a claim moved back to Pending is no longer applied");
});
