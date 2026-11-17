// A stored time that is cut, text, NaN or out of range must never throw or print "NaN" / "Invalid Date": the chat, the list and the details window keep drawing. Run with: npm test

import assert from "node:assert/strict";
import test from "node:test";
import { dayKey, dayLabel, duration, formatBytes, formatFull, formatTime, groupByDay, isTime, listTime } from "../../src/features/messaging/format.js";

const ODD = [NaN, null, undefined, "abc", "2026-11-16", "", {}, [], Infinity, -Infinity, 8.7e15, -8.7e15, true, new Date("nope")];
const GOOD = [0, 1, 1794800000000, -86400000, 8.64e15, new Date(1794800000000)];
const NOW = Date.UTC(2026, 10, 16, 12);
const bad = /NaN|Invalid|undefined|Infinity|null/;

test("odd values are not times; real ones are", () => {
  for (const v of ODD) assert.equal(isTime(v), false, String(v));
  for (const v of GOOD) assert.equal(isTime(v), true, String(v));
});

test("no formatter throws or prints NaN, Invalid Date, undefined or Infinity for an odd time", () => {
  for (const v of ODD) {
    for (const [name, fn] of Object.entries({ formatTime, formatFull, dayKey, dayLabel: (x) => dayLabel(x, NOW), listTime: (x) => listTime(x, NOW) })) {
      let out;
      assert.doesNotThrow(() => (out = fn(v)), `${name}(${String(v)}) threw`);
      assert.ok(!bad.test(String(out)), `${name}(${String(v)}) printed ${out}`);
    }
    assert.equal(formatTime(v), "");
    assert.equal(listTime(v, NOW), "");
    assert.equal(dayLabel(v, NOW), "Unknown date");
  }
});

test("an odd 'now' falls back to the clock; a message with an odd time still groups and labels", () => {
  assert.doesNotThrow(() => listTime(NOW, NaN));
  assert.doesNotThrow(() => dayLabel(NOW, "x"));
  const groups = groupByDay([{ at: NOW, id: 1 }, { at: NaN, id: 2 }, { at: "abc", id: 3 }, { at: NOW, id: 4 }], NOW);
  assert.ok(groups.length >= 2 && groups.every((g) => g.label && !bad.test(g.label)));
});

test("durations and sizes of odd numbers read as the smallest sensible value", () => {
  for (const v of ODD.filter((x) => !(typeof x === "number" && Number.isFinite(x) && x > 0))) {
    assert.equal(duration(v), "under 1 min", String(v));
    assert.equal(formatBytes(v), "0 B", String(v));
  }
  assert.equal(duration(-5), "under 1 min");
  assert.equal(formatBytes(-1), "0 B");
  assert.equal(duration(3 * 3600000 + 10 * 60000), "3 h 10 min");
  assert.equal(formatBytes(2048), "2 KB");
});

import { readFileSync } from "node:fs";
import { isoOf } from "../../src/features/messaging/format.js";
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("isoOf gives ISO text for a time and nothing for an odd value", () => {
  assert.equal(isoOf(Date.UTC(2026, 10, 16, 9, 0, 0)), "2026-11-16T09:00:00.000Z");
  for (const v of ODD) assert.equal(isoOf(v), "", String(v));
});

test("the chat, the list and the Ticket box draw a stored time through isoOf, never through new Date(...).toISOString() (which throws on a cut time)", () => {
  for (const file of ["src/features/messaging/app.js", "src/features/messaging/tickets.js"]) {
    const src = read(file);
    const raw = src.split("\n").filter((l) => /new Date\((?!\))[^)]*\)\.toISOString\(\)/.test(l) && !/new Date\(\)\.toISOString/.test(l));
    assert.deepEqual(raw, [], `${file} still builds an ISO text from a stored time without a guard`);
  }
  assert.ok(read("src/features/promotions/claims-csv.js").includes("t <= 8.64e15"));
});
