// The HTML of every page and partial: no attribute glued to the one before it (`hiddenclass="…"`, `data-social-onlyaria-expanded="…"`) and no two utility classes
// glued into one (`max-sm:hiddentouch-manipulation`). Both are easy to make when editing a long line, neither fails a build (the browser just drops the attribute or the
// class, so a hidden thing shows up unstyled), and each one has happened here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []; });
const files = walk('src');

// `x="…"y` : a quoted value followed straight away by a letter (the next attribute with no space). Text between tags is not looked at.
const GLUED_ATTR = /\s[a-zA-Z_:][-\w:.]*="[^"]*"[a-zA-Z]/g;
// A boolean attribute followed straight away by another: `hiddenclass=`, `data-resident-onlyaria-label=`.
const GLUED_BOOL = /\s(?:hidden|disabled|checked|data-[a-z-]+-only|data-lock-(?:hide|show))(?=[a-z]+[-a-z]*=)/g;
// Utility classes that were glued into one token.
const GLUED_CLASS = /(?:max-sm:|sm:|lg:)?(?:hidden|flex|block|grid)(?=touch-manipulation|items-center|justify-|inline-flex|size-\d)/g;

// The tags of the page itself: what a script writes into the page in template strings is not markup yet, so scripts and styles are left out.
const tags = (html) => (html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').match(/<[a-zA-Z][^>]*>/g) || []);

test('no HTML file has an attribute glued to the one before it', () => {
  const bad = [];
  for (const f of files) for (const t of tags(readFileSync(f, 'utf8'))) { const m = t.match(GLUED_ATTR) || t.match(GLUED_BOOL); if (m) bad.push(`${f}: ${m[0].trim()} in ${t.slice(0, 70)}`); }
  assert.deepEqual(bad, []);
});

test('no HTML file has two utility classes glued into one', () => {
  const bad = [];
  for (const f of files) for (const t of tags(readFileSync(f, 'utf8'))) { const cls = (t.match(/\sclass="([^"]*)"/) || [])[1]; if (!cls) continue; for (const tok of cls.split(/\s+/)) if (/^(?:[a-z-]+:)*(?:hidden|flex|block|grid)(?:touch-manipulation|items-|justify-|inline-flex|size-\d)/.test(tok) || /^h-\d+(?:touch|items|inline)/.test(tok)) bad.push(`${f}: ${tok}`); }
  assert.deepEqual(bad, []);
});

test('the check itself catches the mistakes it is for, and passes a good tag', () => {
  const attr = new RegExp(GLUED_ATTR.source);
  const bool = new RegExp(GLUED_BOOL.source);
  assert.equal(attr.test('<div id="a" hidden class="x">'), false);
  assert.equal(bool.test('<div id="a" hidden class="x">'), false);
  assert.equal(attr.test('<div id="a"class="x">'), true, 'a value followed by the next attribute with no space');
  assert.equal(bool.test('<div hiddenclass="x">'), true);
  assert.equal(bool.test('<button data-social-onlyaria-expanded="false">'), true);
  assert.equal(/^(?:[a-z-]+:)*(?:hidden|flex|block|grid)(?:touch-manipulation|items-|justify-|inline-flex|size-\d)/.test('max-sm:hiddentouch-manipulation'), true);
  assert.equal(/^h-\d+(?:touch|items|inline)/.test('h-9touch-manipulation'), true);
});
