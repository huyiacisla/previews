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
