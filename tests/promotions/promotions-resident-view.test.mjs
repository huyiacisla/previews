// What the Resident app shows of a promotion: how many are left, which are sold out, the tags the filter uses (new, limited, ending soon, free),
// the partner logo and cover Staff set, and the expiry date. Run with: npm test

import assert from "node:assert/strict";
import test from "node:test";
import "../../src/features/promotions/catalog.js";
import { COVERS_KEY, KEY, listPromotions } from "../../src/features/promotions/store.js";

const memory = (seed = {}) => {
  const m = new Map(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), raw: m };
};

const TODAY = "2026-11-16";
const form = (over = {}) => ({
  title: "Bright Smile",
  reward: "Free whitening",
  desc: "With a first cleaning",
  cat: "services",
  otype: "pct",
  oval: "20",
  method: "static",
  code: "BRIGHT20",
  start: "2026-11-10",
  end: "2026-12-31",
  ch: ["In-App"],
  au: "all",
  limR: "1",
  ...over,
});
const rec = (id, x, claims = 0) => ({ id, st: "active", x: form(x), views: 0, claims });
const only = (id, r) => listPromotions(memory({ [KEY.published]: [r] }), { today: TODAY, samples: false }).find((p) => p.id === id);

test("a promotion with a total limit says how many are left, and is sold out at zero", () => {
  const open = only("a", rec("a", { limT: "10" }, 4));
  assert.equal(open.left, 6);
  assert.equal(open.full, false);
  assert.equal(open.isLimited, true);
  const out = only("b", rec("b", { limT: "10" }, 10));
  assert.equal(out.left, 0);
  assert.equal(out.full, true);
  assert.equal(out.isLimited, false, "a sold out one is not 'limited, still available'");
  const none = only("c", rec("c", {}, 99));
  assert.equal(none.left, null, "no limit, no number");
  assert.equal(none.isLimited, false);
});

test("days left, new and free tags come from the dates and the offer", () => {
  const p = only("a", rec("a", { start: "2026-11-15", end: "2026-11-19", otype: "free" }));
  assert.equal(p.daysLeft, 3);
  assert.equal(p.isNew, true, "started yesterday");
  assert.equal(p.isFree, true);
  const old = only("b", rec("b", { start: "2026-09-01", end: "" }));
  assert.equal(old.isNew, false);
  assert.equal(old.daysLeft, null, "no end date, nothing to count");
});

test("the sample deals: three have a limit (23 left, 3 left, sold out) and each says its end date", () => {
  const list = listPromotions(memory(), { today: TODAY });
  const limited = list.filter((p) => p.total > 0);
  assert.deepEqual(limited.map((p) => p.left).sort((a, b) => a - b), [0, 3, 23]);
  assert.equal(list.filter((p) => p.full).length, 1);
  assert.ok(list.some((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.endShow)), "a sample deal says when it ends");
  assert.ok(list.every((p) => p.daysLeft === null || Number.isFinite(p.daysLeft)));
});

test("the logo and the cover Staff set on a sample deal, and a partner name from Edit details, reach the Resident app", () => {
  const png = "data:image/png;base64,AAAA";
  const s = memory({
    [COVERS_KEY]: { "logo:parking0": { src: png }, parking1: { src: png, fx: 20, fy: 30, alt: "Lot" } },
    "eso-pmedits": { parking0: { d: ["Mallard Pointe Valet", "20% off", null, "$96/mo"], partner: "Mallard Group" } },
  });
  const list = listPromotions(s, { today: TODAY });
  const a = list.find((p) => p.id === "parking0");
  assert.equal(a.partnerLogo, png);
  assert.equal(a.partner, "Mallard Group");
  const b = list.find((p) => p.id === "parking1");
  assert.equal(b.cover.src, png);
  assert.equal(b.cover.x, 20);
  assert.equal(b.cover.alt, "Lot");
});

test("only a picture data URL is taken as a logo or cover (a script address is dropped)", () => {
  const s = memory({ [COVERS_KEY]: { "logo:parking0": { src: "javascript:alert(1)" }, parking1: { src: "https://evil.example/x.png" } } });
  const list = listPromotions(s, { today: TODAY });
  assert.equal(list.find((p) => p.id === "parking0").partnerLogo, "");
  assert.equal(list.find((p) => p.id === "parking1").cover.src, "https://evil.example/x.png", "an https picture is allowed, as for Staff's own deals");
});
