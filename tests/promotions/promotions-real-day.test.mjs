// The sample deals must tell the truth about TODAY: a deal that is still shown has not ended, its countdown is real, and one that ended says a day in the past.
// This file does not fix the clock (the other tests do), so it runs on the real date, whatever that is. Run with: npm test

import assert from "node:assert/strict";
import test from "node:test";
import "../../src/features/promotions/catalog.js";
import { listPromotions, todayISO } from "../../src/features/promotions/store.js";

delete globalThis.PM_CLOCK;
const C = globalThis.PM_CATALOG;
const memory = () => ({ getItem: () => null, setItem: () => {} });
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

test("no deal that residents can see has an end date in the past, and every countdown ends in the future", () => {
  const today = todayISO();
  const list = listPromotions(memory(), { today });
  assert.ok(list.length > 10);
  for (const p of list) {
    if (p.endShow) assert.ok(p.endShow >= today, `${p.id} says it ends ${p.endShow}, which is before today (${today})`);
    if (p.endsAt != null) assert.ok(p.endsAt > Date.now(), `${p.id} has a countdown that already ran out`);
    if (p.daysLeft != null) assert.ok(p.daysLeft >= 0, `${p.id} has ${p.daysLeft} days left`);
  }
});

test("a deal that ended says a day in the past, and the labels move with the day", () => {
  const META = C.meta(C.deals());
  const today = iso(C.clock());
  assert.equal(today, todayISO(), "the clock is today");
  for (const m of Object.values(META)) {
    if (m.st === "expired") {
      const d = (m.d[2].match(/^Ended (.+)$/) || [])[1];
      assert.ok(d, `${m.id} says when it ended`);
      assert.ok(new Date(`${d}, ${C.clock().getFullYear()}`) <= new Date(C.clock().getTime() + 36e5), `${m.id} ended on ${d}, which is not after today`);
    }
  }
  // a fixed clock moves every label with it
  globalThis.PM_CLOCK = "2027-03-01";
  const later = C.meta(C.deals());
  const run = Object.values(later).find((m) => m.st === "active" && m.endsDays < 999);
  assert.equal(iso(C.day(run.endsDays)), iso(new Date(2027, 2, 1 + run.endsDays)));
  delete globalThis.PM_CLOCK;
});
