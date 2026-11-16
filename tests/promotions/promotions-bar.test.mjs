// The top bar of the Resident Promotions page: always the same compact bar on a phone, all of it following the scroll, one row from tablet width, My rewards with the person-and-star icon,
// My rewards with Cancelled and Not approved apart, and the list of claims to decide kept inside its own box. Run with: npm test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const html = read("src/partials/promotions-app.html");
const res = read("src/features/promotions/resident.js");

test("on a phone the bar is always the compact one: one row of the same square icons, the chips as a slim row under it, all of it sticky", () => {
  assert.ok(html.includes('id="toolbar" class="sticky top-0'), "the bar follows the scroll");
  assert.ok(res.includes('const want = matchMedia("(max-width: 639px)").matches;') && res.includes("\nfitBar();\n"), "compact from the first paint, not only after a scroll");
  assert.ok(html.includes('#toolbar[data-condensed="true"] #filters { order: 10; flex-basis: 100%; }'), "the chips stay in the bar");
  assert.ok(!html.includes('#toolbar[data-condensed="true"] #filters { display: none'), "the chips are never hidden");
  assert.ok(html.includes('#toolbar[data-condensed="true"] #btn-rewards { position: relative; width: 2rem; padding-inline: 0; }'), "Redeem and My rewards are square like Saved");
  assert.ok(html.includes('#toolbar[data-condensed="true"] #rewards-count { position: absolute;'), "the count sits on the corner like Saved's");
});

test("from tablet width Redeem, My rewards, search, filter and Saved stay on one row, Saved at the end", () => {
  assert.ok(html.includes('<span class="max-lg:sr-only"> a code</span>') && html.includes('<span class="max-lg:sr-only">Saved</span>'), "the words that are not needed drop out before anything wraps");
  assert.ok(html.includes("sm:order-3 sm:min-w-40"), "the search box can be narrower than before");
  assert.ok(html.includes('id="btn-saved"') && html.includes("sm:order-5 group/button relative ml-auto"), "Saved is still the last one of the row");
});

test("My rewards has the person-and-star icon, and each of the three buttons has a tooltip", () => {
  assert.ok(html.includes('<symbol id="i-user-star"'));
  assert.ok(html.includes('<svg aria-hidden="true" fill="currentColor" stroke="none"><use href="#i-user-star"/></svg><span class="lbl">My rewards</span>'));
  for (const t of ['id="btn-redeem" title="Redeem a code"', 'id="btn-rewards" title="My rewards"', 'id="btn-saved" title="Saved promotions"']) assert.ok(html.includes(t), t);
});

test("My rewards separates what the resident cancelled from what the property team did not approve", () => {
  assert.ok(res.includes('["rejected", "Not approved"],\n  ["cancelled", "Cancelled"],'));
  assert.ok(res.includes("const tabOf = (k) => k;"));
});

test("the claims to decide in the chat panel scroll inside a box of their own height", () => {
  const app = read("src/features/messaging/app.js");
  assert.ok(app.includes('decideList.style.maxHeight = "320px";') && app.includes('decideList.setAttribute("aria-label", "Claims to decide");'));
  assert.ok(app.includes("decideList.tabIndex = 0;"), "the box can be scrolled with the keyboard");
});

test("the Resident header has no dropdown arrow beside the avatar: pressing the avatar is enough", () => {
  const frame = read("src/shared/js/portal-frame-extras.js");
  assert.ok(frame.includes('if (portal === "resident") trigger.querySelector(":scope > svg.lucide-chevron-down")?.remove();'));
  assert.ok(frame.includes('trigger.setAttribute("aria-haspopup", "dialog");'), "the button still opens the profile menu and keeps its accessible name");
});
