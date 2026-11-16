// The red badges on Saved and My rewards count what is NEW since the panel was last opened, kept for the resident; the panels' headings say the totals.
// Titles of Staff's page are smaller on a phone and a tablet. Run with: npm test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const res = read("src/features/promotions/resident.js");
const html = read("src/partials/promotions-app.html");

test("the counters are kept per resident, in the keys the portal can share, and never below zero", () => {
  assert.ok(res.includes("eso_unseen_saved_count:${me.id}") && res.includes("eso_unseen_rewards_count:${me.id}"));
  assert.ok(res.includes("Math.max(0, Math.floor(n))"), "never below zero");
  assert.ok(res.includes("c.hidden = n === 0;"), "a zero count has no badge");
  assert.ok(res.includes("if (e.key === UNSEEN.saved || e.key === UNSEEN.rewards) {"), "another tab, or Staff's Resident view of the same person, moves the badge too");
});

test("saving adds one, removing takes one away without a new badge, and opening the panel clears it", () => {
  assert.ok(res.includes('bumpUnseen("saved", on ? 1 : -1);'));
  assert.ok(res.includes('$("#btn-saved").addEventListener("click", () => {\n  setUnseen("saved", 0);'));
});

test("claiming adds one (not when the claim already existed), cancelling takes one away, and opening My rewards clears it", () => {
  assert.ok(res.includes('if (!r.again) bumpUnseen("rewards", 1);'));
  assert.ok(res.includes('if (res.ok) bumpUnseen("rewards", -1);'));
  assert.ok(res.includes('$("#btn-rewards").addEventListener("click", () => {\n  setUnseen("rewards", 0);'));
});

test("the panels say the totals in their headings; no extra toggle was added", () => {
  assert.ok(html.includes('<span id="rw-count" class="text-base font-normal text-muted-foreground tabular-nums"></span>'));
  assert.ok(res.includes('$("#rw-count").textContent = rwHistory || !rewardRows().length ? "" : `${rewardRows().length} in total`;'));
  assert.ok(html.includes('id="sv-count"'), "Saved already says how many");
});

test("a title Staff made large is smaller on a phone (28px at most) and a tablet (40px at most)", () => {
  const page = read("src/features/promotions/page.js");
  assert.ok(page.includes("return mobile ? Math.min(v, 28) : device === \"tablet\" ? Math.min(v, 40) : v;"));
  assert.ok(page.includes('font-size:${tsz(s.ts, "m")}px;line-height:1.2') && page.includes('font-size:${tsz(s.ts, "l")}px;line-height:1.1'), "section and hero titles both use it");
});
