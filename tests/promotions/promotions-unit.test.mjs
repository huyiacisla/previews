// One promotion per unit: the sample deals say "One per household" and now are; a person of the unit who is blocked can still write to the property team,
// and Staff see in red which account of the unit already got it. Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import "../../src/features/promotions/catalog.js";
import { byId, PERSONAS } from "../../src/features/messaging/personas.js";
import { createStore } from "../../src/features/messaging/store.js";
import { createMemoryBus } from "../../src/features/messaging/transport.js";
import { claim, listPromotions, unitBlocks, unitHistory } from "../../src/features/promotions/store.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};
const T = (n) => new Date(2026, 10, 16, 9, n);
const deal = (s, viewer) => listPromotions(s, { viewer }).find((p) => !p.full);

test('the sample deals that say "One per household" are limited per unit', () => {
  const s = memory();
  const all = listPromotions(s, { viewer: "res-1" });
  assert.ok(all.length > 0 && all.every((p) => p.scope === "unit"), "every sample deal counts the unit once");
});

test("when Alex has claimed a deal, Jamie (same unit) is blocked with the reason, and Priya (another unit) is not", () => {
  const s = memory();
  const p = deal(s, "res-1");
  assert.ok(claim(s, "res-1", p, T(1)).ok);
  const jamie = claim(s, "res-4", p, T(2));
  assert.equal(jamie.ok, false);
  assert.ok(/Your unit already claimed this: Alex Rivera/.test(jamie.reason));
  assert.equal(claim(s, "res-2", p, T(3)).ok, true, "another unit is not affected");
});

test("Staff see which account of the unit already got it, and what the others of the unit did", () => {
  const s = memory();
  const p = deal(s, "res-1");
  claim(s, "res-1", p, T(1));
  const blocks = unitBlocks(s, "res-4", () => p.title);
  assert.equal(blocks.length, 1);
  assert.deepEqual([blocks[0].title, blocks[0].by], [p.title, "Alex Rivera"]);
  assert.deepEqual(unitBlocks(s, "res-1", () => p.title), [], "the one who has it is not blocked");
  assert.deepEqual(unitBlocks(s, "res-2", () => p.title), [], "another unit has nothing blocking it");
  const mates = unitHistory(s, "res-4", () => p.title);
  assert.deepEqual(mates.map((e) => [e.name, e.label]), [["Alex Rivera", "Claimed"]]);
});

test("Jamie can write to the property team like any resident, and is not in the demo switcher", () => {
  assert.equal(byId["res-4"].name, "Jamie Rivera");
  assert.ok(!PERSONAS.some((p) => p.id === "res-4"), "the switcher keeps its three residents");
  const store = createStore({ transport: createMemoryBus().connect(), now: () => Date.UTC(2026, 10, 16, 9, 30, 0) });
  store.reset({ empty: true });
  const id = store.ensureSession("res-4").convId;
  assert.ok(id);
  const r = store.askAboutClaim("res-4", { title: "Mallard Pointe Valet", code: "MALLA10", at: "2026-11-16T09:13:00.000Z", status: "Claimed by your unit" });
  assert.ok(r.ok);
  assert.ok(store.listFor("stf-1").some((row) => row.id === r.convId), "it reaches the property team's queue");
});

test("the Staff panel says in red, first, that the unit already got it", () => {
  const app = readFileSync(new URL("../../src/features/messaging/app.js", import.meta.url), "utf8");
  assert.ok(app.includes('al.setAttribute("role", "alert");') && app.includes("One per unit: a second claim is blocked. Do not pay it twice."));
  assert.ok(app.includes("through ${b.by}'s account"), "whose account and when");
  assert.ok(app.includes("`Same unit (${u.number})`"), "the claims of the others of the unit");
  assert.ok(app.includes("JSON.stringify([t.conv.id, data, promoEv, unitEv,"), "the panel follows changes of the unit");
});
