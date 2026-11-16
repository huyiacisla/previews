// A promotion's life as Staff run it: close it early, extend it, remove it, and what the Resident app shows at each step. Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import "../../src/features/promotions/catalog.js";
import { isLive, KEY, listPromotions } from "../../src/features/promotions/store.js";

const C = globalThis.PM_CATALOG;
const memory = (seed = {}) => {
  const m = new Map(Object.entries(seed).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)) };
};
const TODAY = "2026-11-16";
const live = (s) => listPromotions(s, { today: TODAY }).map((p) => p.id);
const form = (over = {}) => ({ title: "Bright Smile", reward: "Free whitening", desc: "With a cleaning", cat: "services", otype: "pct", oval: "20", method: "static", code: "BRIGHT20", start: "2026-11-10", end: "2026-12-31", ch: ["In-App"], au: "all", limR: "1", ...over });
const published = (st, x) => memory({ [KEY.published]: [{ id: "p1", st, x: form(x), views: 0, claims: 0 }] });

test("a deal Staff made: live, closed, extended, removed", () => {
  assert.ok(live(published("active")).includes("p1"));
  assert.ok(!live(published("closed")).includes("p1"), "closed: residents no longer see it");
  assert.ok(!live(published("removed")).includes("p1"), "removed: gone for residents too");
  // extend: the end date moves and the status goes back to active
  assert.ok(!live(published("active", { end: "2026-11-15" })).includes("p1"), "past its end date: not shown");
  assert.ok(live(published("active", { end: "2027-01-31" })).includes("p1"), "a later end date shows it again");
  assert.equal(isLive({ st: "closed", x: form() }, TODAY), false);
  assert.equal(isLive({ st: "removed", x: form() }, TODAY), false);
});

test("a sample deal: closed and removed by Staff leave the resident list; an ended one comes back when extended", () => {
  const all = live(memory());
  const id = "parking0";
  assert.ok(all.includes(id));
  assert.ok(!live(memory({ "eso-pm-status": { [id]: "expired" } })).includes(id), "closed by Staff");
  assert.ok(!live(memory({ "eso-pm-status": { [id]: "removed" } })).includes(id), "removed by Staff");
  const ended = Object.values(C.meta(C.deals())).find((m) => m.st === "expired").id;
  assert.ok(!all.includes(ended), "an ended deal is not shown");
  const back = listPromotions(memory({ "eso-pm-status": { [ended]: "active" }, "eso-pm-ends": { [ended]: "2026-12-31" } }), { today: TODAY }).find((p) => p.id === ended);
  assert.ok(back, "extended: it is shown again");
  assert.equal(back.end, "2026-12-31", "with its new end date");
});

test("what Staff close or extend is read safely: only known ids, known statuses and real dates", () => {
  assert.deepEqual(C.readOverrides(memory({ "eso-pm-status": { parking0: "expired", ev3: "removed", x: "removed", pets1: "hack" } })), { parking0: "expired", ev3: "removed" });
  assert.deepEqual(C.readEnds(memory({ "eso-pm-ends": { parking0: "2026-12-31", ev3: "tomorrow", "../a": "2026-01-01", pets1: 5 } })), { parking0: "2026-12-31" });
  assert.deepEqual(C.readEnds(memory({ "eso-pm-ends": "[1]" })), {});
  assert.deepEqual(C.readEnds(memory({ "eso-pm-ends": "nope" })), {});
});

test("an extended sample deal says its new end date to Staff too (demo clock 30 Oct 2026)", () => {
  const m = C.meta(C.deals(), { parking0: "active" }, { parking0: "2026-12-14" }).parking0;
  assert.equal(m.ext, "2026-12-14");
  assert.equal(m.endsDays, 45, "days from the demo clock");
  assert.match(m.d[2], /^Ends Dec 14/);
  const closed = C.meta(C.deals(), { parking0: "expired" }, { parking0: "2026-11-16" }).parking0;
  assert.equal(closed.st, "expired");
  assert.match(closed.d[2], /^Ended Nov 16/);
});
