// The Resident information window with many claims, many tickets, a long list: every list shows two rows and how many there are; the rest opens on request and stays inside a box
// that scrolls. Run with: npm test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FOLD_MAX, FOLD_SHOWN, fold } from "../../src/features/messaging/fold.js";

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

test("fold: two rows are shown while folded", () => assert.equal(FOLD_SHOWN, 2));

test("fold: nothing, one or two rows have no button and nothing is hidden", () => {
  for (const n of [0, 1, 2]) {
    const f = fold(rows(n));
    assert.equal(f.visible.length, n);
    assert.equal(f.total, n);
    assert.equal(f.canFold, false);
    assert.equal(f.open, false);
    assert.equal(f.hidden, 0);
    assert.equal(f.label, "");
  }
});

test("fold: three rows or more show the first two, say how many there are, and offer Show all", () => {
  for (const n of [3, 4, 10, 37, 500]) {
    const f = fold(rows(n));
    assert.deepEqual(f.visible.map((r) => r.id), [1, 2], `first two of ${n}`);
    assert.equal(f.total, n);
    assert.equal(f.canFold, true);
    assert.equal(f.open, false);
    assert.equal(f.hidden, n - 2);
    assert.equal(f.label, `Show all ${n}`);
  }
});

test("fold: open shows every row up to the cap and offers Show fewer", () => {
  const f = fold(rows(7), { open: true });
  assert.equal(f.visible.length, 7);
  assert.equal(f.open, true);
  assert.equal(f.hidden, 0);
  assert.equal(f.label, "Show fewer");
  // the order is kept: newest first stays newest first
  assert.deepEqual(f.visible.map((r) => r.id), [1, 2, 3, 4, 5, 6, 7]);
});

test("fold: a very long list opens to the cap, no more, and says how many are left out", () => {
  assert.equal(FOLD_MAX, 100);
  for (const n of [100, 101, 500, 5000]) {
    const f = fold(rows(n), { open: true });
    assert.equal(f.visible.length, Math.min(n, FOLD_MAX));
    assert.equal(f.hidden, Math.max(0, n - FOLD_MAX));
    assert.equal(f.total, n);
  }
  assert.equal(fold(rows(100), { open: true }).hidden, 0, "exactly the cap: nothing is left out");
  assert.equal(fold(rows(101), { open: true }).hidden, 1);
});

test("fold: opening a list that cannot fold does nothing", () => {
  const f = fold(rows(2), { open: true });
  assert.equal(f.open, false);
  assert.equal(f.label, "");
  assert.equal(f.visible.length, 2);
});

test("fold: broken input is an empty list, never an error", () => {
  for (const bad of [undefined, null, 0, 5, "text", {}, NaN, true]) {
    const f = fold(bad);
    assert.deepEqual(f.visible, []);
    assert.equal(f.total, 0);
    assert.equal(f.canFold, false);
    assert.equal(f.hidden, 0);
  }
  assert.equal(fold(rows(10), { shown: 0 }).visible.length, 2, "a shown count that makes no sense falls back to two");
  assert.equal(fold(rows(10), { shown: -3 }).visible.length, 2);
  assert.equal(fold(rows(10), { shown: "x" }).visible.length, 2);
  assert.equal(fold(rows(10), { shown: 4 }).visible.length, 4, "another count can be asked for");
  assert.equal(fold(rows(300), { open: true, max: 0 }).visible.length, FOLD_MAX, "a cap that makes no sense falls back to the default");
});

test("fold: does not change the list it is given", () => {
  const list = rows(9);
  const copy = JSON.stringify(list);
  fold(list);
  fold(list, { open: true });
  assert.equal(JSON.stringify(list), copy);
});

const msg = read("src/features/messaging/app.js");

test("Resident information: every list in the window is a folded list (claims, history, the unit's people, tickets)", () => {
  assert.ok(msg.includes('import { fold } from "./fold.js";'));
  const w = msg.slice(msg.indexOf("function foldedList"), msg.indexOf("function openAllPromos"));
  for (const key of ['claimList(p, "cur", rid', "claimList(p, `cur-${m.id}`", 'eventList(p, "hist", rid', "eventList(p, `hist-${m.id}`", 'ticketRows(p, "tk-now"', 'ticketRows(p, "tk-past"']) assert.ok(w.includes(key), key);
  // the three list functions draw through foldedList and nothing else
  for (const fn of ["function claimList(", "function eventList(", "function ticketRows("]) {
    const at = msg.indexOf(fn);
    const body = msg.slice(at, msg.indexOf("\n  }\n", at));
    assert.ok(body.includes("foldedList("), fn);
    assert.ok(!body.includes("for (const"), `${fn} does not draw every row itself`);
  }
});

test("Resident information: the Show all button says the number, is a real button with aria-expanded, and an open list scrolls in its own box", () => {
  const w = msg.slice(msg.indexOf("function foldedList"), msg.indexOf("function stepList"));
  assert.ok(w.includes("const f = fold(rows, { open: !!state.open[key] });"));
  assert.ok(w.includes("ul.replaceChildren(...f.visible.map(make));"), "only the rows on show are drawn");
  assert.ok(w.includes('b.setAttribute("aria-expanded", String(f.open));'));
  assert.ok(w.includes("aria-label\", `Show all ${f.total}, ${f.total - f.visible.length} more`"), "the number is also in the button's name");
  assert.ok(w.includes('scroller.style.maxHeight = f.open ? "360px" : "";'));
  assert.ok(w.includes('scroller.style.overflowY = f.open ? "auto" : "";'));
  assert.ok(w.includes("scroller.tabIndex = 0;"), "the scrolling box can be reached with the keyboard");
  assert.ok(w.includes("Showing the newest ${f.visible.length} of ${f.total}."), "a very long list says what it leaves out");
});

test("Resident information: a list stays open when the window is redrawn after a decision, and starts folded when it is opened again", () => {
  assert.ok(msg.includes("const st = keep || { main: 0, reward: 0, ticket: 0, open: {} };"));
  assert.ok(msg.includes("ui.infoState = st;"));
  assert.ok(msg.includes("const rebuild = () => openResidentInfo(conv, st);"), "a redraw reuses the same state");
  assert.ok(msg.includes("openResidentInfo(conv)") && !/openResidentInfo\(conv, \{ main: 0/.test(msg), "the Details button opens a fresh, folded window");
});

test("Resident information: a person's events are read once per drawing, not once per card", () => {
  assert.ok(msg.includes("function timelineOf(residentId)"));
  assert.ok(msg.includes("ui.infoCache = new Map(); // read again each time the window is drawn"));
  const step = msg.slice(msg.indexOf("function stepList"), msg.indexOf("function rewardCard"));
  assert.ok(step.includes("timelineOf(residentId)") && !step.includes("historyFor("), "the steps of a card come from the shared read");
  const ev = msg.slice(msg.indexOf("function eventList"), msg.indexOf("const STAGE_TONE"));
  assert.ok(ev.includes("timelineOf(residentId)") && !ev.includes("historyFor("));
  const overview = msg.slice(msg.indexOf("function promoOverview"), msg.indexOf("// \"Also claimed in this unit by"));
  assert.ok(overview.includes("const recs = allRecords(localStorage);"), "the deals are read once, not once per claim");
  assert.ok(!/titleOf = \(id\) => \{\s*const r = allRecords/.test(overview));
});

test("Resident information: a long deal name or a long reason wraps inside the card and never pushes the badge out", () => {
  assert.ok(msg.includes('name.className = "min-w-0 flex-1 text-sm font-medium wrap-anywhere";'));
  assert.equal(msg.split('name.className = "min-w-0 flex-1 text-sm font-medium wrap-anywhere";').length - 1, 2, "claim cards and history rows");
});

test("Resident information: the tabs carry their numbers (Current claim, History claimed, Current ticket, History ticket)", () => {
  assert.ok(msg.includes("count: current.length + matesCurrent.reduce"));
  assert.ok(msg.includes("count: timelineOf(rid).length + mates.reduce"));
  assert.ok(msg.includes("count: now.length"));
  assert.ok(msg.includes("count: past.length"));
});

test("Resident information: Details is this window for a resident's chat; the side panel is not drawn for it; the Asked about banner opens it at the rewards", () => {
  assert.ok(msg.includes('const cb = button("Details", { variant: "outline", ariaLabel: "Resident information", onClick: () => openResidentInfo(conv) });'));
  assert.ok(msg.includes('if (!data || data.kind === "resident" || !contextOpen()) return hideContext();'));
  assert.ok(msg.includes('openResidentInfo(t.conv, { main: 1, reward: 0, ticket: 0, open: {} })'));
  assert.ok(!msg.includes("onClick: () => setContext(true) })]));"), "the banner no longer opens the side panel");
});

test("Resident information: the person is the one the chat is about, also in a direct chat that has no residentId; the red one-per-unit alert is in Current claim", () => {
  assert.ok(msg.includes("const rid = data.person.id;"));
  assert.ok(!msg.slice(msg.indexOf("function openResidentInfo"), msg.indexOf("function openAllPromos")).includes("conv.residentId"));
  const w = msg.slice(msg.indexOf("function openResidentInfo"), msg.indexOf("function openAllPromos"));
  assert.ok(w.includes("for (const b of unitPromo(rid).blocks)"));
  assert.ok(w.includes('al.setAttribute("role", "alert");'));
  assert.ok(w.includes("Do not pay it twice."));
});

test("Resident information: a claim Staff can still decide is always shown in Current, and the decision controls work only for Staff and Admin in a resident's chat", () => {
  assert.ok(msg.includes('r.group === "active" || decidingNow.some((c) => c.promoId === r.promoId)'));
  assert.ok(msg.includes('["staff", "admin"].includes(me.role) && conv.kind === "resident_support" ? decidable(rid) : []'));
  assert.ok(msg.includes("li.appendChild(decisionBox(conv, d, rebuild))"));
});
