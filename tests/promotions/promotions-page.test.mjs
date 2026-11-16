// The page Staff design in Templates & brand reaches the Resident: Staff publish a snapshot, the Resident app reads and draws it. Run with: npm test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PAGE_KEY, readPage, themeVars } from "../../src/features/promotions/page.js";

const store = (v) => ({ getItem: (k) => (k === PAGE_KEY && v !== undefined ? (typeof v === "string" ? v : JSON.stringify(v)) : null) });
const good = { v: 1, at: 5, off: false, key: "deals", name: "Deals", theme: { accent: "#e11d48" }, blocks: [{ type: "hero", props: { title: "Hi" }, style: {} }] };

test("the Resident draws a page only when Staff published a good one that is switched on", () => {
  assert.equal(readPage(store(good)).key, "deals");
  assert.equal(readPage(store(undefined)), null, "nothing published");
  assert.equal(readPage(store("not json")), null);
  assert.equal(readPage(store({ ...good, off: true })), null, "Stop using hides it");
  assert.equal(readPage(store({ ...good, v: 2 })), null, "a version it does not know");
  assert.equal(readPage(store({ ...good, blocks: [] })), null, "no blocks, no page");
  assert.equal(readPage(store({ ...good, blocks: "x" })), null);
});

test("Staff publish the live template with the brand applied, and the Resident app listens for it", () => {
  const staff = readFileSync(new URL("../../src/staff/account-settings-content.html", import.meta.url), "utf8");
  assert.ok(staff.includes('<script id="pm-page-js">'), "the publisher is on the page");
  assert.ok(staff.includes("k==='eso-pb'||k==='eso-brand'"), "it publishes whenever the builder or the brand kit is saved");
  assert.ok(staff.includes("accent:BK.primary||th.accent"), "the brand colour wins over the template's");
  const res = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(res.includes('import { PAGE_KEY, readPage, renderPage, themeVars } from "./page.js";'));
  assert.ok(res.includes("e.key === PAGE_KEY"), "the open page is redrawn when Staff publish");
  assert.ok(res.includes("paintPage(all, mine, cfg, hot, cats);"));
  const html = readFileSync(new URL("../../src/partials/promotions-app.html", import.meta.url), "utf8");
  assert.ok(/<div id="page-top" hidden[^>]*><\/div>/.test(html));
});

test("the page drawer sets Staff's words as text and takes only picture data URLs and known colours", () => {
  const src = readFileSync(new URL("../../src/features/promotions/page.js", import.meta.url), "utf8");
  assert.ok(!/\.innerHTML\s*=/.test(src), "no innerHTML: a title can never become markup");
  assert.ok(src.includes("/^data:image\\//i.test(v)"), "pictures are data URLs only");
  assert.ok(src.includes("HEX.test(v)"), "colours are checked");
});

test("going back from the details: closing them returns to My rewards or to Redeem, not out of the page", () => {
  const res = readFileSync(new URL("../../src/features/promotions/resident.js", import.meta.url), "utf8");
  assert.ok(res.includes('openDialog(r.id, null, "rewards")'));
  assert.ok(res.includes('openDialog(openId, null, "redeem")'));
  assert.ok(res.includes('if (back === "rewards")'));
});
