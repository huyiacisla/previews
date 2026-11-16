// R5-3 and R5-4: Staff's Templates tab strip wears the Deals page's look in light and dark, the small counts are readable in dark, Larger tap targets reach the notification links,
// chat bubbles and the Promotions bar, the Property profile website takes only http(s), a pin is never doubled. Run with: npm test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createStore } from "../../src/features/messaging/store.js";
import { createMemoryBus } from "../../src/features/messaging/transport.js";

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const staff = read("src/staff/account-settings-content.html");
const css = read("src/shared/css/styles.css");
const html = read("src/partials/promotions-app.html");

test("R5-3: the Templates pages' tab strip (Library, My creations, Current, Drafts) follows the theme like the Deals page's", () => {
  for (const rule of [
    ".pmdet .pdtabs button.on{background:color-mix(in srgb,var(--primary) 12%,var(--card));color:var(--r31-pfg,var(--primary));box-shadow:none}",
    "html.dark .pmdet .pdtabs{background:var(--muted-c,oklch(.27 0 0))}",
    "html.dark .pmdet .pdtabs button:not(.on),html.dark .pmdet .pdtabs button:not(.on) :is(span,i){color:var(--muted-foreground)!important}",
  ])
    assert.ok(staff.includes(rule), rule.slice(0, 60));
});

test("R5-3: in dark mode the little counts beside the tabs and the Current tag are light enough to read (4.5:1)", () => {
  assert.ok(staff.includes("html.dark .pdc:not(.pdc-p){color:oklch(.85 0 0)}"));
  assert.ok(staff.includes("html.dark.dark body .pdtabs button:not(.on) .pdc:not(.pdc-p){color:oklch(.85 0 0)!important}"));
  assert.ok(staff.includes("html.dark .tpd{color:oklch(.8 .11 266)}"));
});

test("R5-4 (S325): the Property profile fields are cut at 30, 120 or 200 characters and the website must start with http:// or https://", () => {
  assert.ok(staff.includes("maxlength=\"${({phone:30,email:120,website:200}[k]||120)}\""));
  assert.ok(staff.includes("if(lim&&t.value.length>lim)t.value=t.value.slice(0,lim);"), "pasted or set by script is cut too");
  assert.ok(staff.includes('if(WD.website&&!/^https?:\\/\\/[^\\s<>"]+$/i.test(WD.website)){toast("Website must start with http:// or https://");return}'));
  const ok = /^https?:\/\/[^\s<>"]+$/i;
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "ftp://x.y", "//x.y", "https://a b", 'https://a"b']) assert.equal(ok.test(bad), false, bad);
  assert.equal(ok.test("https://mallardpointe.com/about"), true);
});

test("R5-4 (Larger tap targets): notification title links and the chat bubble that opens its actions are 44 px, and so is the Promotions bar", () => {
  assert.ok(css.includes('html[data-big-target] a[data-link]:not([hidden]) { display: inline-flex; align-items: center; min-height: 2.75rem; }'));
  assert.ok(css.includes('html[data-big-target] [data-body][role="button"] { min-height: 2.75rem;'));
  assert.ok(html.includes("html[data-big-target] #toolbar :is(#btn-redeem, #btn-rewards, #btn-saved, #btn-filter, #search, #sort) { min-height: 2.75rem; }"));
});

test("R5-4 (pins): pinning a conversation again and again never lists it twice", () => {
  const bus = createMemoryBus();
  const store = createStore({ transport: bus.connect(), now: () => Date.UTC(2026, 10, 9, 15), config: {} });
  const a = store.startDirect("stf-1", "cli-1", "first");
  for (let i = 0; i < 5; i += 1) store.toggleFlag(a.convId, "stf-1", "pinned");
  store.toggleFlag(a.convId, "stf-1", "pinned");
  const pinned = store.pref("stf-1").pinned;
  assert.equal(new Set(pinned).size, pinned.length, "no duplicates");
  assert.equal(store.listFor("stf-1").filter((r) => r.id === a.convId).length, 1, "the conversation is in the list once");
});

test("R5-4 (notifications): the property team's decisions are news to the resident, their own cancellation is not", async () => {
  const { promoItems } = await import("../../src/features/notifications/live.js");
  const NOW = Date.parse("2026-11-16T12:00:00");
  const m = new Map([
    [
      "eso-pm-claimstate",
      JSON.stringify({
        "res-1|parking0|1": { st: "rejected", reason: "Cancelled by resident", at: NOW - 60000, by: "resident:res-1" },
        "res-1|parking0|2": { st: "rejected", reason: "Wrong building", at: NOW - 50000, by: "Property Manager" },
        "res-1|parking0|3": { st: "redeemed", reason: "", at: NOW - 40000, by: "Property Manager" },
      }),
    ],
  ]);
  const storage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, v) };
  const items = promoItems(storage, "resident", { id: "res-1", name: "Alex Rivera" }, NOW);
  assert.deepEqual(items.map((i) => i.title).sort(), ["Your claim was marked as used", "Your claim was not approved"]);
  assert.ok(items.every((i) => !/Cancelled by resident/.test(i.detail)));
});
