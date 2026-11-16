// The Notifications page as it is drawn (notifications/view.js): tabs, rows, groups, empty states, counts. No browser needed.

import assert from "node:assert/strict";
import test from "node:test";
import { buildAll } from "../../src/features/notifications/store.js";
import { filtersInUse, isFiltered, linkFor, notificationsView, PAGE } from "../../src/features/notifications/view.js";

test("times follow Settings > Date and time: 24 hours, a time zone, and a zone that does not exist is ignored", () => {
  const all = buildAll(NOW, "client");
  const t12 = notificationsView(all, {}, ui(), NOW, opts).groups[0].items[0];
  const t24 = notificationsView(all, {}, ui(), NOW, { ...opts, time: { h24: true } }).groups[0].items[0];
  assert.match(t12.time, /AM|PM/);
  assert.doesNotMatch(t24.time, /AM|PM/);
  assert.match(t24.time, /^\d\d:\d\d$/);
  const tokyo = notificationsView(all, {}, ui(), NOW, { ...opts, time: { h24: true, tz: "Asia/Tokyo" } }).groups[0].items[0];
  const bad = notificationsView(all, {}, ui(), NOW, { ...opts, time: { h24: true, tz: "Mars/Phobos" } }).groups[0].items[0];
  assert.notEqual(tokyo.time, t24.time);
  assert.ok(bad.time);
});

test("a live chat or post opens the exact chat or post; a sample item opens just its page", () => {
  const dest = { messages: "/staff/messages.html?as=stf-1", social: "/staff/social.html", tickets: "" };
  assert.equal(linkFor({ dest: "messages", live: "messenger", convId: "c_12" }, dest), "/staff/messages.html?as=stf-1#/c/c_12");
  assert.equal(linkFor({ dest: "social", live: "social", post: "p-7" }, dest), "/staff/social.html#/post/p-7");
  assert.equal(linkFor({ dest: "messages" }, dest), "/staff/messages.html?as=stf-1");
  assert.equal(linkFor({ dest: "tickets", live: "messenger", convId: "x" }, dest), "", "no page: no link");
  assert.equal(linkFor({ dest: "nowhere" }, dest), "");
});

const NOW = Date.UTC(2026, 10, 13, 15, 0, 0);
const ui = (over = {}) => ({ q: "", status: "all", cat: "all", prop: "all", sort: "newest", shown: PAGE, ...over });
const opts = { dest: { messages: "/client/messages.html?as=cli-1", plan: "/client/workspace.html" }, multiProp: true };

test('the first screen: summary, three tabs with their counts, 25 rows, the rest behind "Show more"', () => {
  const all = buildAll(NOW, "client");
  const v = notificationsView(all, {}, ui(), NOW, opts);
  assert.equal(v.summary, "109 need attention");
  assert.deepEqual(
    v.tabs.map((t) => [t.id, t.selected]),
    [
      ["all", true],
      ["unread", false],
      ["read", false],
    ],
  );
  assert.equal(v.tabs[0].n, all.length);
  assert.equal(v.tabs[1].n, 109);
  assert.equal(v.tabs[0].aria, `All, ${all.length}`);
  assert.equal(v.rows, PAGE);
  assert.equal(
    v.groups.reduce((n, g) => n + g.items.length, 0),
    PAGE,
  );
  assert.equal(v.count, `Showing ${PAGE} of ${all.length}`);
  assert.equal(v.more.show, true);
  assert.equal(v.more.label, `Show ${PAGE} more (${PAGE} of ${all.length})`);
  assert.equal(v.empty.show, false);
  assert.equal(v.isFiltered, false);
  assert.equal(v.markAll.label, "Mark all as read");
  assert.equal(v.markAll.ids.length, 109);
});

test("a row says what a click on its button does, links only when the page exists, and names the property only when there are several", () => {
  const all = buildAll(NOW, "client");
  const v = notificationsView(all, {}, ui({ shown: 500 }), NOW, opts);
  const rows = v.groups.flatMap((g) => g.items);
  const unread = rows.find((r) => !r.read);
  assert.equal(unread.toggleTitle, "Mark as read");
  assert.equal(unread.toggleIcon, "i-mail-open");
  assert.match(unread.toggleLabel, /^Mark as read: /);
  const read = rows.find((r) => r.read);
  assert.equal(read.toggleTitle, "Mark as unread");
  assert.equal(read.toggleIcon, "i-mail");
  const msg = rows.find((r) => r.cat === "Messages");
  assert.equal(msg.href, "/client/messages.html?as=cli-1", "a message opens Messages and keeps who is signed in");
  const req = rows.find((r) => r.cat === "Requests");
  assert.equal(req.href, "", "a page that is not part of the preview is not a link");
  assert.ok(req.prop, "a Client has several properties: the row names one");
  const one = notificationsView(buildAll(NOW, "staff"), {}, ui({ shown: 500 }), NOW, { multiProp: false });
  assert.ok(
    one.groups.flatMap((g) => g.items).every((r) => r.prop === ""),
    "one property: not repeated on every row",
  );
  assert.ok(
    rows.every((r) => r.icon && r.tone && r.time && r.iso),
    "every row has its icon, colour and time",
  );
});

test("marking something read moves it between the tabs and the summary", () => {
  const all = buildAll(NOW, "client");
  const first = all.find((n) => !n.read);
  const v = notificationsView(all, { [first.id]: true }, ui(), NOW, opts);
  assert.equal(v.summary, "108 need attention");
  assert.equal(v.tabs[1].n, 108);
  assert.ok(!v.markAll.ids.includes(first.id));
  const none = notificationsView(all, Object.fromEntries(all.map((n) => [n.id, true])), ui(), NOW, opts);
  assert.equal(none.summary, "You are all caught up");
  assert.equal(none.markAll.disabled, true);
  assert.equal(none.markAll.title, "Nothing unread here");
});

test('search and filters: chips, the count line, "Mark N as read", and the three empty states', () => {
  const all = buildAll(NOW, "client");
  const f = ui({ cat: "plan", sort: "oldest" });
  assert.deepEqual(filtersInUse(f), [
    { key: "cat", label: "Category: Capacity & plan" },
    { key: "sort", label: "Oldest first" },
  ]);
  assert.equal(isFiltered(f), true);
  assert.equal(isFiltered(ui({ sort: "oldest" })), false, "the sort order alone does not narrow the list");
  const v = notificationsView(all, {}, f, NOW, opts);
  assert.equal(v.filterCount, 2);
  assert.equal(v.filtersLabel, "Filters, 2 in use");
  assert.equal(v.count, "3 results");
  assert.equal(v.markAll.label, "Mark 2 as read");
  assert.equal(v.more.show, false);
  // no match
  const none = notificationsView(all, {}, ui({ q: "zzzz nothing" }), NOW, opts);
  assert.equal(none.empty.show, true);
  assert.equal(none.empty.title, "No notifications match");
  assert.equal(none.empty.icon, "i-search");
  assert.equal(none.empty.clearable, true);
  assert.equal(none.count, "");
  // everything read, Unread tab: good news, not "no match"
  const readAll = Object.fromEntries(all.map((n) => [n.id, true]));
  const caught = notificationsView(all, readAll, ui({ status: "unread" }), NOW, opts);
  assert.equal(caught.empty.title, "You are all caught up");
  assert.equal(caught.empty.icon, "i-check-all");
  // everything read inside one category
  const inView = notificationsView(all, readAll, ui({ status: "unread", cat: "plan" }), NOW, opts);
  assert.equal(inView.empty.title, "Nothing unread in this view");
});

test('"Unread first" groups by state instead of by day', () => {
  const all = buildAll(NOW, "staff");
  const v = notificationsView(all, {}, ui({ sort: "unread", shown: 500 }), NOW, {});
  assert.deepEqual(
    v.groups.map((g) => g.label),
    ["Unread", "Read"],
  );
  assert.ok(v.groups[0].items.every((r) => !r.read));
  assert.ok(v.groups[1].items.every((r) => r.read));
  const byDay = notificationsView(all, {}, ui({ shown: 500 }), NOW, {});
  assert.equal(byDay.groups[0].label, "Today");
});
