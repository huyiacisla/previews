// The bell's panel (Resident, Staff, Client and Admin alike): "Mark all read" next to "View all" while something is unread, with an envelope icon drawn for this project:
// an open envelope for unread, a closed one for read, an open one with a check for "mark all". Run with: npm test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const frame = read("src/shared/js/portal-frame-extras.js");

test("the bell panel has Mark all read only while something is unread, and it makes everything read and says all is caught up", () => {
  assert.ok(frame.includes("if (n > 0) {\n      const markAll = document.createElement(\"button\");"), "no button when nothing is unread");
  assert.ok(frame.includes('markAll.setAttribute("aria-label", "Mark all read");') && frame.includes('markAll.title = "Mark all read";'), "an icon with a name and a tooltip");
  assert.ok(frame.includes(".filter((r) => !isRead(r, cur))") && frame.includes("emitNotif();"), "every unread notification becomes read and the bell and panel are drawn again");
  assert.ok(frame.includes('title.querySelector("p").textContent = n > 0 ? `${n} need attention` : "You are all caught up";'));
  assert.ok(frame.includes('title.querySelector("p").setAttribute("role", "status");'), "the change is said aloud");
  assert.ok(frame.includes("actions.append(viewAll);"), "View all stays, after it");
});

test("the envelopes are our own drawing: open for unread, closed for read, open with a check for mark all", () => {
  const html = read("src/partials/notifications-app.html");
  for (const id of ["i-mail", "i-mail-open", "i-mail-check"]) assert.ok(html.includes(`<symbol id="${id}"`), id);
  assert.ok(!html.includes("M21.2 8.4c.5.38.8.97.8 1.6v10"), "not the stock open-envelope path");
  assert.ok(html.includes('<use href="#i-mail-check"/></svg><span id="mark-all-label"'), "the page's Mark all as read uses it too");
  assert.ok(read("src/features/notifications/view.js").includes('toggleIcon: read ? "i-mail" : "i-mail-open"'));
  assert.ok(frame.includes("mailCheck: svg('<path d=\"M4 10.5v7A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-7\"/>"));
});
