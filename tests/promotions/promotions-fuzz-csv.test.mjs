// The claims export with awkward text (commas, quotes, line breaks, formula starters, spaces at the ends, emoji, right-to-left text, long text): what a spreadsheet reads back is
// the text that was written (a formula starter is made harmless by a leading quote), every row keeps its columns, and nothing in a cell can start a formula. Seeded. Run with: npm test

import assert from "node:assert/strict";
import test from "node:test";
import { CLAIM_CSV_COLUMNS, claimsCsv, csvCell } from "../../src/features/promotions/claims-csv.js";

const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const PARTS = ["a", "Z", "0", " ", "  ", ",", '"', "'", "\n", "\r\n", "\r", "\t", "=", "+", "-", "@", "=1+1", '=HYPERLINK("http://x","y")', "é", "ß", "\u{1F600}", "مرحبا", "שלום", "​", " ", ";", "|", "\\", "x".repeat(50)];

// a small CSV reader that follows RFC 4180: quoted cells, doubled quotes, line breaks inside quotes
function parse(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\r" && text[i + 1] === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

test("any text written to a cell is read back as the same text (a formula starter gets a leading quote), in 3000 random cells", () => {
  const r = rng(7);
  for (let i = 0; i < 3000; i++) {
    const n = 1 + Math.floor(r() * 6);
    let s = "";
    for (let k = 0; k < n; k++) s += PARTS[Math.floor(r() * PARTS.length)];
    const expected = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    const rows = parse(`${csvCell(s)}\r\n`);
    assert.equal(rows.length, 1, `one row for ${JSON.stringify(s)}`);
    assert.equal(rows[0].length, 1, `one cell for ${JSON.stringify(s)}`);
    assert.equal(rows[0][0], expected, `round trip of ${JSON.stringify(s)}`);
    // nothing a spreadsheet would run as a formula
    assert.ok(!/^[=+\-@]/.test(rows[0][0]) && !/^[\t\r]/.test(rows[0][0]), `a cell starts a formula: ${JSON.stringify(s)}`);
  }
});

test("a whole export with awkward names and reasons keeps every row and every column, in 200 random files", () => {
  const r = rng(99);
  const word = () => {
    let s = "";
    const n = 1 + Math.floor(r() * 5);
    for (let k = 0; k < n; k++) s += PARTS[Math.floor(r() * PARTS.length)];
    return s;
  };
  for (let f = 0; f < 200; f++) {
    const rows = [];
    const count = Math.floor(r() * 6);
    for (let i = 0; i < count; i++) {
      const row = {};
      for (const col of CLAIM_CSV_COLUMNS) row[col] = word();
      rows.push(row);
    }
    const out = claimsCsv(rows);
    assert.ok(out.startsWith("﻿"), "the file starts with a byte-order mark so a spreadsheet reads Unicode");
    const parsed = parse(out.slice(1));
    assert.equal(parsed.length, count + 1, `one header and ${count} rows (file ${f})`);
    for (const p of parsed) assert.equal(p.length, CLAIM_CSV_COLUMNS.length, `every row has ${CLAIM_CSV_COLUMNS.length} columns (file ${f}): ${JSON.stringify(p).slice(0, 120)}`);
    assert.deepEqual(parsed[0], CLAIM_CSV_COLUMNS, "the header is the columns");
    rows.forEach((row, i) => {
      CLAIM_CSV_COLUMNS.forEach((col, k) => {
        const v = row[col];
        const want = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
        assert.equal(parsed[i + 1][k], want, `cell ${col} of row ${i} (file ${f})`);
      });
    });
  }
});
