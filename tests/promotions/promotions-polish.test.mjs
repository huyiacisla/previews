// Polish: a window keeps the page behind it still, icon buttons are 40 px on a phone, the numbers say what they count (new on the corner, in total in the heading),
// "Claimed" says who claimed, and "Mark all read" confirms. Run with: npm test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const html = read("src/partials/promotions-app.html");
const res = read("src/features/promotions/resident.js");
const css = read("src/shared/css/styles.css");
const frame = read("src/shared/js/portal-frame-extras.js");

test("an open window keeps the page behind it still", () => {
  assert.ok(html.includes("body:has(dialog[open]) #main-content { overflow: hidden; }"), "the Promotions page scroller");
  assert.ok(css.includes("html:has(dialog[open]) { overflow: hidden; }"), "every page");
  assert.ok(css.includes("dialog { overscroll-behavior: contain; }") && html.includes("dialog { overscroll-behavior: contain; }"), "a touch on the backdrop does not chain to the page");
});

test("on a phone the icon buttons of the bar and the windows are at least 40 px", () => {
  const phone = html.slice(html.indexOf("@media (max-width: 639px)"), html.indexOf("body:has(dialog[open])"));
  assert.ok(phone.includes("#toolbar #btn-redeem, #toolbar #btn-rewards, #toolbar #btn-saved, #toolbar #btn-filter, #toolbar #search"), "bar controls");
  assert.ok(phone.includes("dialog button, dialog input, dialog select { min-height: 2.75rem; }"), "window controls");
  assert.ok(/#btn-filter, #toolbar #btn-saved, #toolbar #btn-redeem, #toolbar #btn-rewards, \[data-theme-toggle\], dialog \[data-close\], #dlg-close \{ min-width: 2.75rem; \}/.test(phone), "square icon buttons");
  assert.ok(phone.includes("#btn-rewards { position: relative; width: 2.5rem; padding-inline: 0; }"), "Redeem and My rewards in the compact bar");
});

test("the corner badge says new, the heading says in total, and the button's name says both", () => {
  assert.ok(res.includes("c.title = n ? `${n} new` : \"\";"));
  assert.ok(res.includes('"#btn-rewards").setAttribute("aria-label", nr ? `My rewards, ${nr} new` : "My rewards")'));
  assert.ok(res.includes("`Saved promotions, ${savedTotal} in total${ns ? `, ${ns} new` : \"\"}`"));
  assert.ok(res.includes("`${rewardRows().length} in total`") && res.includes("`${rows.length} in total`"), "both headings");
});

test('"Claimed" says by whom: you, your unit, or how many residents', () => {
  assert.ok(res.includes('badge("Claimed by you", "success")') && res.includes('badge("Claimed by your unit", "success")'));
  assert.ok(res.includes('? "Claimed by you"'), "the button");
  assert.ok(res.includes('"resident has" : "residents have"} claimed'), "the card's total is about everyone");
  assert.ok(!res.includes('badge("Claimed", "success")'));
});

test("Mark all read confirms for the eyes and is silent for the ears (the heading already speaks)", () => {
  assert.ok(frame.includes('done.className = "eso-np-toast";') && frame.includes('done.setAttribute("aria-hidden", "true");'));
  assert.ok(frame.includes("marked as read") && frame.includes("head.after(done);") && frame.includes("setTimeout(() => done.remove(), 2200);"));
  assert.ok(css.includes(".eso-np-toast {") && css.includes("@keyframes eso-np-toast") && css.includes("@media (prefers-reduced-motion: reduce) { .eso-np-toast { animation: none; } }"));
});

test("the page looks at its width again when it has loaded and on every resize, and draws again only when it crossed a phone, tablet or desktop line", () => {
  assert.ok(res.includes('const deviceNow = () => (matchMedia("(max-width: 639px)").matches ? "phone" : matchMedia("(max-width: 1023px)").matches ? "tablet" : "desktop");'));
  assert.ok(res.includes("if (now === lastDevice) return;"), "no redraw (no jitter) while it stays in one size");
  for (const hook of ['addEventListener("resize", syncDevice);', 'addEventListener("load", syncDevice);', "requestAnimationFrame(syncDevice);"]) assert.ok(res.includes(hook), hook);
  assert.ok(res.includes('matchMedia(q).addEventListener("change", syncDevice)'));
});

test("a template's colours include the secondary text colour, so a promotion's description is readable on a light template in dark mode", () => {
  const page = read("src/features/promotions/page.js");
  assert.ok(page.includes('"--foreground-secondary": mix(fg, 82, bg),'));
  assert.ok(html.includes("text-foreground-secondary"), "the description uses it");
});

test("on a phone and a tablet the reward cards are smaller to look at and still 44 px to press (an invisible area around each button)", () => {
  const block = html.slice(html.indexOf("@media (max-width: 1023px) {\n        #dlg-rewards, #dlg-steps { max-width"), html.indexOf('/* On a touch screen with "Larger tap targets" on'));
  assert.ok(block.includes("#rw-list > li { padding: 0.5rem 0.625rem; gap: 0.25rem; font-size: 0.8125rem; }"), "less padding");
  assert.ok(block.includes("#rw-list [data-code], #cl-code { font-size: 0.9375rem; line-height: 1.25rem; letter-spacing: 0.04em; }"), "a smaller code");
  assert.ok(block.includes("height: 2rem; min-height: 0;"), "buttons 36 px tall");
  assert.ok(block.includes("#rw-list button:not([data-status])::after, #dlg-steps button:not([data-close])::after { content: \"\"; position: absolute; inset: -0.375rem -0.125rem; }"), "32 + 6 + 6 = 44 px to press");
});

test("the status word on a reward card is a small badge with a 44 px press area", () => {
  assert.ok(html.includes("#rw-list button[data-status] { position: relative; height: 1.25rem; min-height: 0; padding-inline: 0.5rem; }"));
  assert.ok(html.includes('#rw-list button[data-status]::after { content: ""; position: absolute; inset: -0.75rem -0.25rem; }'), "20 + 12 + 12 = 44 px");
});

test("the close button of the deal window stays in the corner of its picture (the compact rule made every button of the window relative)", () => {
  assert.ok(html.includes("#dlg button#dlg-close { position: absolute; width: 2rem; min-width: 0; padding-inline: 0; }"));
});
