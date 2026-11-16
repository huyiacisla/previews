import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { has } from "../has.mjs";

const app = readFileSync(new URL("../../src/features/messaging/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../../src/partials/messages-app.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../../src/shared/css/styles.css", import.meta.url), "utf8");
const social = readFileSync(new URL("../../src/partials/social-app.html", import.meta.url), "utf8");
const socialJs = readFileSync(new URL("../../src/features/social/resident.js", import.meta.url), "utf8");

test("Support threads on a phone: the three choices fold into one line, Quick replies has a name, Resolve is one tap with Undo", () => {
  assert.ok(has(html, 'id="tools-toggle"') && has(html, 'id="tools-summary"'), "the folded line");
  assert.ok(has(html, "max-sm:data-[collapsed=true]:hidden"), "collapsed on a phone only; from 640 px the three choices stay in view");
  assert.ok(has(app, "$('#tools-summary').textContent = `${word(status)} · ${word(prio)} priority · ${word(asg)}`;"), "the line says what they are now");
  assert.ok(has(html, "<span>Quick replies</span>"), "the quick replies button is a word, not an unlabeled icon");
  assert.ok(has(app, "actions.includes('resolve') && me.role === 'admin' && conv.kind === 'support'"), "one tap for an Admin resolving a Support thread");
  assert.ok(has(app, "action: 'Undo', ms: 8000"), "with an Undo");
  assert.ok(has(app, "act(store.assignSupport(conv.id, me.id, wasAssignee)"), "Undo gives the thread back as it was");
  assert.ok(has(app, "else if (actions.includes('resolve')) box.appendChild(confirmButton("), "other conversations keep the confirm step");
  assert.ok(has(app, "me.role === 'admin' ? 'Support requests from staff and clients appear here."), "the Admin queue says what is in the Admin queue");
});

test("a long note is one short line plus an (i) that opens the whole text", () => {
  assert.ok(has(app, "const NOTE_MAX = 72;"));
  assert.ok(has(app, "if (long) box.appendChild(infoButton(text));"), "every long banner");
  assert.ok(has(html, '<dialog id="info-win"'), "the small window");
  assert.ok(has(app, "$('#info-win').addEventListener('close'"), "focus goes back when it closes");
  assert.ok(has(html, "Emergency: managers are alerted now.</span>") && has(html, 'id="emergency-info"'), "the emergency note is short with its (i)");
  assert.ok(!has(html, "and it gets through Do Not Disturb. Use it for water, fire or gas.</p>"), "the long sentence is only in the window");
  assert.ok(has(social, ">Privacy mode on</p>") && has(social, 'id="privacy-info"'), "Social: the privacy banner is short with its (i)");
  assert.ok(has(socialJs, "openInfo(e.currentTarget, 'Privacy mode'"), "and opens the Social window");
});

test("the frame header rules do not reach the Messages page header (its Back button was 418 px wide, its arrow in the middle of the bar)", () => {
  for (const line of css.split("\n").filter((l) => /^header\[data-eso-frame\]/.test(l))) {
    assert.ok(line.startsWith("header[data-eso-frame]:not([data-id])"), line.slice(0, 80));
  }
});

test("the menu cards on a phone and a tablet are small, and the property card is left alone", () => {
  assert.ok(css.includes('@media (max-width: 1023px) {\n  [data-slot="sidebar-container"] section[data-slot="collapsible"] {'), "Local time and Capacity");
  assert.ok(!/sidebar-container"\] section(?!\[data-slot="collapsible"\]|\[aria-label="Local time"\])[^{]*\{[^}]*padding: 0\.5rem/.test(css), "no rule of this block reaches the property card");
  assert.ok(css.includes('[data-slot="collapsible-trigger"]::after { content: ""; position: absolute; inset: -12px -8px; }'), "a small Hide button keeps a 44 px area");
});

test("Send & resolve for Admin on a Support thread: the message goes first, then Resolve with its Undo; nothing is resolved when nothing was sent", () => {
  assert.ok(has(html, 'id="btn-send-resolve"') && has(html, "Send &amp; resolve"));
  assert.ok(
    has(app, "$('#btn-send-resolve').hidden = !(t.canPost.ok && me.role === 'admin' && t.conv.kind === 'support' && t.conv.status !== 'resolved' && !ui.edit);"),
    "Admin, Support, not resolved",
  );
  assert.ok(has(app, "if (ui.pending.length === before) return;"), "a message too long or a photo still preparing resolves nothing");
  assert.ok(has(app, "toast('The message is still sending, so the thread was not resolved.')"));
  assert.ok(has(app, "function resolveWithUndo(conv)"), "one Resolve for the button and for Send & resolve");
});

test("an audit card shows a date and time people can read, with the exact UTC record for Staff and Admin on hover and for assistive tech", () => {
  assert.ok(has(app, "tm.textContent = formatFull(new Date(m.audit.at).getTime());"));
  assert.ok(has(app, "tm.title = `Recorded ${m.audit.at} (UTC)`"));
  assert.ok(!has(app, "tm.textContent = full ? m.audit.at"), "the raw ISO string is not the text any more");
});

test('the Settings "Unsaved changes" bar is out of the tab order and the accessibility tree until something changes', () => {
  const q = readFileSync(new URL("../../src/staff/account-settings.quality.css", import.meta.url), "utf8");
  assert.ok(q.includes("html body #savebar:not(.o) { visibility: hidden !important;"));
  assert.ok(q.includes("html body #savebar.o { visibility: visible !important;"), "and visible at once when it opens");
});
