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

test("Redeem, My rewards, Saved, Search and the category chips are in one bar pinned at the very top, above whatever page Staff designed", () => {
  const html = readFileSync(new URL("../../src/partials/promotions-app.html", import.meta.url), "utf8");
  const bar = html.indexOf('id="toolbar"');
  const page = html.indexOf('id="page-top"');
  assert.ok(bar > 0 && page > bar, "the bar comes before the designed page");
  assert.match(html.slice(bar - 20, bar + 120), /sticky top-0/);
  for (const id of ["btn-redeem", "btn-rewards", "btn-saved", "search", "btn-filter", "filters"]) {
    const at = html.indexOf(`id="${id}"`);
    assert.ok(at > bar && at < page, `${id} is inside the top bar, found at once when the page opens`);
  }
  assert.ok(!html.includes('id="browse"'), "no second bar lower down");
  assert.ok(html.indexOf('id="count"') > page && html.indexOf('id="count"') < html.indexOf('id="grid"'), "the count and the cards come after the designed page");
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

test("the design of the page holds together: bands edge to edge, one search, one Redeem, the portal around it dressed too", () => {
  const html = readFileSync(new URL("../../src/partials/promotions-app.html", import.meta.url), "utf8");
  const pageAt = html.indexOf('id="page-top"');
  assert.ok(html.slice(html.indexOf('id="toolbar"'), pageAt).includes("max-w-6xl"), "the bar keeps its width in the middle");
  assert.ok(!html.slice(html.lastIndexOf("<main"), pageAt).includes("max-w-6xl\" id=\"page-top\""), "the designed page is not boxed in");
  assert.ok(html.includes("xl:grid-cols-4") && html.includes("sm:grid-cols-2") && html.includes("lg:grid-cols-3"), "2, 3 and 4 columns as the screen grows");
  const page = readFileSync(new URL("../../src/features/promotions/page.js", import.meta.url), "utf8");
  assert.ok(page.includes("padding-inline:${GUTTER}"), "bands run to the edges, their words stay in the middle");
  assert.ok(page.includes('btn("Use code"') && !page.includes('btn("Redeem"'), "the coupon says Use code, so there are not two Redeem buttons");
  assert.match(page, /b\.type === "tiles"\) \{[^}]*continue;/, "the category tiles are not drawn: the chips under the search are the one category list");
  const js = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(js.includes("window.parent.document"), "the portal around the page wears the theme");
  assert.ok(!js.includes("desktopSearch") && !js.includes("pm-shell"), "the portal's shared page search is left alone: it is part of the portal, not of this page");
  assert.ok(js.includes("h1,h2,h3{font-family:"), "the heading font reaches every heading");
  assert.ok(themeVars({ theme: { accent: "#123456" } }).vars["--sidebar-primary"] === "#123456", "the portal's selected item follows the accent");
});

test("the CSV and the Claims inbox follow the promotion a claim was made for, not the list position it once had", () => {
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes('"gone:"+x.promo'), "a claim of a removed promotion no longer lands on the promotion that took its place");
  assert.ok(staff.includes("String(c.promo)===String(m.pmc)"), "the export lists only the claimers of that promotion");
  const res = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(!res.includes("hasTiles"), "the chips are always the category list");
});

test("choosing a category chip or starting a search brings the results into view", () => {
  const js = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok((js.match(/render\(\);\n\s+scrollToCatalog\(\);/g) || []).length >= 2, "All and each category chip scroll to the results");
  assert.ok(js.includes("if (first) scrollToCatalog();"), "the first letters typed in the search do too");
});

test("the top bar is compact: one row from tablet width, and on a phone it folds into one row that keeps following (it never slides away)", () => {
  const html = readFileSync(new URL("../../src/partials/promotions-app.html", import.meta.url), "utf8");
  assert.ok(html.includes("sm:flex-row") && html.includes("sm:order-3") && html.includes("sm:contents"), "Redeem, My rewards, Search, filter and Saved share one row from 640px");
  assert.ok(!html.includes("-translate-y-full"), "the bar does not slide away on a scroll down: the search keeps following");
  assert.ok(html.includes('#toolbar[data-condensed="true"]') && html.includes("#search-wrap") && html.includes(".lbl"), "folded: search, filter and the three buttons as icons in one row");
  assert.ok(html.includes('class="hidden truncate text-sm text-muted-foreground sm:block"'), "no subtitle on a phone");
  const js = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(js.includes("max-width: 639px") && js.includes("marginBottom"), "only on a phone, and a negative margin keeps the page from shifting when it folds");
  assert.ok(!js.includes("keepUntil") && !js.includes("dataset.away"), "no hiding logic is left");
});

test("a countdown and a coupon are part of the hero: one offer, a small Ends-in badge, one main Copy code button and a quiet View details", () => {
  const page = readFileSync(new URL("../../src/features/promotions/page.js", import.meta.url), "utf8");
  assert.ok(page.includes("b === cdBlock || b === cpBlock"), "they are not drawn as separate sections when the page has a hero");
  assert.ok(page.includes("Ends in ${d}d ${hh}h") && page.includes('"Copy code"') && page.includes('"View details"'));
  assert.ok(page.includes("spot.endsAt > 0"), "the badge counts to the real end of the deal the hero speaks of, so it agrees with the card");
  assert.ok(page.includes("Promo code: show it or apply it when you book") && !page.includes("Use this code at checkout"));
  assert.ok(page.includes('ok === false ? "Could not copy"'), "it never says Copied when the browser refused");
  const res = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(res.includes("openDeal: (p) => openDialog(p.id)") && res.includes("return false;"));
});

test("Saved is a panel of its own, like My rewards, and a saved star is filled gold", () => {
  const html = readFileSync(new URL("../../src/partials/promotions-app.html", import.meta.url), "utf8");
  assert.ok(!/<symbol id="i-star"[^>]*fill="none"/.test(html), "the star symbol leaves its fill to the page, so a saved star can be filled");
  assert.ok((html.match(/fill-amber-400/g) || []).length >= 3, "the Saved button, the card star and the details star are gold when pressed");
  assert.ok(html.includes('<dialog id="dlg-saved"') && html.includes('id="sv-list"') && html.includes('id="t-saved"'), "the saved promotions have a panel with a row each");
  assert.ok(html.includes("data-unsave") && html.includes("data-view"), "each row can be removed or viewed");
  assert.ok(!html.includes('id="saved-head"') && !html.includes('id="saved-back"'), "not a filter of the list on the page");
  const js = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(js.includes('svDlg.showModal()') && js.includes('back === "saved"'), "it opens as a panel, and closing the details returns to it");
  assert.ok(!js.includes("savedOnly"), "no in-page Saved mode is left");
  assert.ok(html.includes("top-auto bottom-step-lg"), "messages appear at the bottom, not over the bar");
});

test("every template is readable: a translucent 'alt' is understood, boxes are solid, status colours follow the canvas, a code nobody takes is not shown", () => {
  const glass = themeVars({ theme: { accent: "#6366f1", bg: "#0b1020", fg: "#f8fafc", alt: "rgba(255,255,255,.06)" } });
  assert.match(glass.vars["--card"], /^color-mix\(/, "a translucent alt becomes a solid card colour: a box that opens over the page is not see-through");
  assert.equal(glass.scheme, "dark");
  assert.equal(glass.status["--danger-text"], "oklch(0.82 0.1 28)", "a dark canvas gets the dark status colours, even when the system is light");
  const light = themeVars({ theme: { accent: "#111111", bg: "#ffffff", fg: "#111827", alt: "#f4f4f5" } });
  assert.equal(light.status["--warning-bg"], "oklch(0.9761 0.022 80.69)");
  assert.equal(light.vars["--card"], "#f4f4f5");
  assert.match(light.vars["--muted-foreground"], /70%/, "small grey text keeps enough contrast on a tinted card");
  const bad = themeVars({ theme: { accent: "rgb(1,2,3);}x{", bg: "rgba(0,0,0,9)", alt: "rgba(0,0,0,.5);color:red" } });
  assert.equal(bad.vars["--primary"], "#1f2937", "only plain numbers inside rgb() and rgba() pass the colour check");
  const page = readFileSync(new URL("../../src/features/promotions/page.js", import.meta.url), "utf8");
  assert.ok(page.includes("code && codeDeal ? promoCode("), "the promo code is shown only when a live deal takes it");
});
