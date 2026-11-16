// The Resident's History (in My rewards): every claim with its date and time, also the ones that failed or were cancelled; and the template wearing the whole app.
// Run with: npm test

import "./_clock.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import "../../src/features/promotions/catalog.js";
import { themeVars } from "../../src/features/promotions/page.js";
import { cancelClaim, claim, historyFor, KEY, listPromotions } from "../../src/features/promotions/store.js";

const memory = (seed = {}) => {
  const m = new Map(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), raw: m };
};
const ME = "res-1";
const pick = (s) => listPromotions(s, { viewer: ME }).find((p) => !p.full && p.scope !== "unit");
const T = (n) => new Date(2026, 10, 16, 9, n);

test("a claim, its cancellation and the next claim are all in the history, newest first, each with its time", () => {
  const s = memory();
  const p = pick(s);
  assert.ok(claim(s, ME, p, T(1)).ok);
  assert.ok(cancelClaim(s, ME, p.id, T(2)).ok);
  assert.ok(claim(s, ME, p, T(3)).ok);
  const h = historyFor(s, ME, () => p.title);
  assert.deepEqual(h.map((e) => e.label), ["Claimed", "Cancelled", "Claimed"], "the first claim is not lost when the second is made");
  assert.deepEqual(h.map((e) => e.at), [T(3), T(2), T(1)].map((d) => d.toISOString()));
  assert.ok(h.every((e) => e.title === p.title));
});

test("a claim that did not go through is recorded with the reason", () => {
  const s = memory();
  const p = { ...pick(s), full: true };
  const r = claim(s, ME, p, T(5));
  assert.equal(r.ok, false);
  const h = historyFor(s, ME, () => p.title);
  assert.equal(h.length, 1);
  assert.equal(h[0].label, "Could not claim");
  assert.equal(h[0].tone, "no");
  assert.match(h[0].note, /fully claimed/);
  claim(s, ME, p, T(5));
  assert.equal(historyFor(s, ME).length, 1, "the same failure within a minute is not written twice");
});

test("what Staff decide is added with their time, and their record of a cancellation is not shown twice", () => {
  const s = memory();
  const p = pick(s);
  claim(s, ME, p, T(1));
  const n = 1;
  s.setItem(KEY.claimState, JSON.stringify({ [`${ME}|${p.id}|${n}`]: { st: "redeemed", at: T(9).getTime(), vt: T(7).getTime(), rt: T(9).getTime() } }));
  const h = historyFor(s, ME, () => p.title);
  assert.deepEqual(h.map((e) => e.label), ["Redeemed", "Verified", "Claimed"]);
  const s2 = memory();
  claim(s2, ME, p, T(1));
  cancelClaim(s2, ME, p.id, T(2));
  s2.setItem(KEY.claimState, JSON.stringify({ [`${ME}|${p.id}|1`]: { st: "rejected", reason: "Cancelled by resident", at: T(2).getTime() } }));
  assert.deepEqual(historyFor(s2, ME).map((e) => e.label), ["Cancelled", "Claimed"]);
});

test("a claim made before the record existed still shows in the history", () => {
  const s = memory({ [KEY.mine(ME)]: { saved: [], claims: { 7: { count: 1, code: "ABC12", at: T(4).toISOString() } } } });
  const h = historyFor(s, ME, () => "Old deal");
  assert.equal(h.length, 1);
  assert.equal(h[0].title, "Old deal");
  assert.match(h[0].note, /ABC12/);
});

test("the Resident page shows History with the year and time, and long help sits behind an (i)", () => {
  const html = readFileSync(new URL("../../src/partials/promotions-app.html", import.meta.url), "utf8");
  assert.ok(html.includes('id="rw-history-btn"') && html.includes('id="rw-history-list"') && html.includes('id="t-hist"'));
  assert.ok(html.includes('data-info="rewards"') && html.includes('id="dlg-info"'), "the (i) opens a short window");
  assert.ok(!html.includes("The offers you claimed. Show the code"), "the paragraph is gone");
  const js = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(js.includes('year: "numeric"'), "date and time include the year");
});

test("Redeem, My rewards, Saved and Search sit in a bar pinned above whatever page Staff designed", () => {
  const html = readFileSync(new URL("../../src/partials/promotions-app.html", import.meta.url), "utf8");
  const bar = html.indexOf('id="toolbar"');
  const page = html.indexOf('id="page-top"');
  assert.ok(bar > 0 && page > bar, "the bar comes before the designed page");
  for (const id of ["btn-redeem", "btn-rewards", "btn-saved", 'id="search"']) {
    const at = html.indexOf(id.startsWith("id=") ? id : `id="${id}"`);
    assert.ok(at > bar && at < page, `${id} is inside the bar`);
  }
  assert.match(html.slice(bar - 20, bar + 120), /sticky top-0/);
});

test("the template's colours, corners and fonts replace the portal's tokens, so no old look is left", () => {
  assert.equal(themeVars(null), null, "no template: the portal's own look");
  const t = themeVars({ theme: { accent: "#e11d48", bg: "#0b1020", fg: "#f8fafc", alt: "#151b2e", radius: 20, font: { b: "Inter, sans-serif", h: "Georgia, serif" } } });
  assert.equal(t.vars["--background"], "#0b1020");
  assert.equal(t.vars["--primary"], "#e11d48");
  assert.equal(t.vars["--card"], "#151b2e");
  assert.equal(t.scheme, "dark", "a dark canvas turns the form controls dark too");
  assert.equal(t.font, "Inter, sans-serif");
  for (const k of ["--foreground", "--border", "--input", "--muted", "--ring", "--primary-foreground", "--radius"]) assert.ok(t.vars[k], k);
  const bad = themeVars({ theme: { accent: "red;}body{display:none", bg: "javascript:1", font: { b: "x;}" } } });
  assert.equal(bad.vars["--primary"], "#1f2937", "an unchecked colour never reaches the stylesheet");
  assert.equal(bad.font, "");
  const js = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(js.includes("!important") && js.includes('"pm-theme"'));
});
