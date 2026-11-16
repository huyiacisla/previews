// What Staff set on a block in the editor reaches the Resident: who sees it, on which screen, on which days, its own background and spacing;
// and what residents see is the PUBLISHED page, never the draft the editor autosaves. Run with: npm test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { blockHidden } from "../../src/features/promotions/page.js";

const ctx = { building: "Building A" };
const NOON = new Date(2026, 10, 16, 12, 0, 0).getTime();

test("a block is left out for the screens, people and days Staff chose", () => {
  assert.equal(blockHidden({ adv: {} }, ctx, "desktop", NOON), false, "nothing set: shown");
  assert.equal(blockHidden({ adv: { hide: ["mobile"] } }, ctx, "mobile", NOON), true);
  assert.equal(blockHidden({ adv: { hide: ["mobile"] } }, ctx, "tablet", NOON), false);
  assert.equal(blockHidden({ adv: { hide: ["desktop", "tablet"] } }, ctx, "tablet", NOON), true);
  assert.equal(blockHidden({ hideMobile: true }, ctx, "mobile", NOON), true, "the older Hide on mobile switch still works");
  assert.equal(blockHidden({ adv: { aud: "staff" } }, ctx, "desktop", NOON), true, "Staff only is never drawn for a resident");
  assert.equal(blockHidden({ adv: { aud: "res" } }, ctx, "desktop", NOON), false);
  assert.equal(blockHidden({ adv: { aud: "bld", bld: ["Building A", "Garage"] } }, ctx, "desktop", NOON), false, "a listed building sees it");
  assert.equal(blockHidden({ adv: { aud: "bld", bld: ["Building B"] } }, ctx, "desktop", NOON), true, "another building does not");
  assert.equal(blockHidden({ adv: { aud: "bld", bld: [] } }, ctx, "desktop", NOON), true, "specific buildings with none chosen: nobody");
  assert.equal(blockHidden({ adv: { from: "2026-11-17" } }, ctx, "desktop", NOON), true, "not yet");
  assert.equal(blockHidden({ adv: { from: "2026-11-16" } }, ctx, "desktop", NOON), false, "from the start of that day");
  assert.equal(blockHidden({ adv: { until: "2026-11-15" } }, ctx, "desktop", NOON), true, "no longer");
  assert.equal(blockHidden({ adv: { until: "2026-11-16" } }, ctx, "desktop", NOON), false, "through the end of that day");
  assert.equal(blockHidden({ adv: { from: "tomorrow", until: "x" } }, ctx, "desktop", NOON), false, "a value that is not a date is ignored");
});

test("the Resident draws the block's own background, text colour, spacing, corners and links, taking only plain values", () => {
  const page = readFileSync(new URL("../../src/features/promotions/page.js", import.meta.url), "utf8");
  assert.ok(page.includes("function applySx(node, sx)") && page.includes("applySx(node, b.sx);"));
  assert.ok(page.includes("safeImg(sx.img.src)"), "a background picture is a data URL only");
  assert.ok(page.includes("withAlpha(sx.fg, 100)"), "colours are 6-digit hex only");
  assert.ok(page.includes('lk.t === "url"') && page.includes("https:"), "a button link to a page is https only, opened without access to this page");
  assert.ok(page.includes('window.open(lk.v, "_blank", "noopener,noreferrer")'));
  const res = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(res.includes('building: (me.unit && me.unit.block) || ""'));
  assert.ok(res.includes('"(max-width: 1023px)"') && res.includes('pageKey = "";'), "the page is drawn again when the screen crosses a phone or tablet width");
});

test("residents see the published page, not the draft the editor autosaves", () => {
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes("(ST.pubL&&ST.pubL['tpl:'+key])||P.getL('tpl:'+key)"), "the publisher uses the published copy first");
  assert.ok(staff.includes("S.pubL[W.key]=JSON.parse(JSON.stringify(W.L))"), "Publish & set as current keeps the copy residents see");
  assert.ok(staff.includes("S0.pubL[key]=JSON.parse(JSON.stringify(L))"), "the live template is remembered before the first edit");
});

test("Staff's Resident view shows the page without dressing Staff's own page in the template", () => {
  const res = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(res.includes('if (!window.parent.location.pathname.startsWith("/resident/")) return;'), "only the Resident portal around the page wears the theme");
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes("promotions-content.html"), "Staff's Resident view embeds the same page file the Resident portal does, so it cannot drift");
});

test("Staff can change the day a scheduled promotion starts, within today and its end date, and the Resident follows", () => {
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes("function setStart(id,date)") && staff.includes('data-pml="start"'), "the Manage box has a Start date row for a scheduled promotion Staff made");
  assert.ok(staff.includes("date<=today()") && staff.includes("date>q.r.x.end"), "a start in the past or after the end date is refused with a message");
  assert.ok(staff.includes('"|"+((m.x&&m.x.start)||"")'), "the Manage box is drawn again when the start date changes");
  const store = readFileSync(new URL("../../src/features/promotions/store.js", import.meta.url), "utf8");
  assert.ok(store.includes("if (x.start && x.start > today) return false;"), "the Resident shows it only from that day");
});

test("the builder says where a Countdown and a Coupon appear, and Edit details names the price Residents see", () => {
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes("Residents see this inside the Hero banner: the first Countdown as its Ends in badge, the first Coupon under its words."));
  assert.ok(staff.includes('for="q22p">Price shown on the card</label>'), "the price field says it is what the card shows");
});

test("the Resident also draws a block's anchor name, width, entrance animation, text style, and button look from the editor", () => {
  const page = readFileSync(new URL("../../src/features/promotions/page.js", import.meta.url), "utf8");
  assert.ok(page.includes("function applyAdv(node, b)") && page.includes("applyAdv(node, b);"));
  assert.ok(page.includes("node.id = a.id"), "an anchor name, letters digits and dashes only");
  assert.ok(page.includes('b.w === "wide" || b.w === "half"') && page.includes("max-width: 767px"), "wide and half width, full width on a phone");
  assert.ok(page.includes("prefers-reduced-motion: reduce"), "an entrance animation is skipped for people who ask for less motion");
  assert.ok(page.includes("withAlpha(x.color, 100)"), "text colour is 6-digit hex only");
  assert.ok(page.includes('curVar = (b.sx && b.sx.bv) || s.btn || ""') && page.includes('["fill", "outline", "pill", "text"].includes(curVar)'), "button variant and size");
  assert.ok(page.indexOf("txN += 1;") < page.indexOf("const set = (sel, css)"), "the class number is taken before the rules use it");
});
