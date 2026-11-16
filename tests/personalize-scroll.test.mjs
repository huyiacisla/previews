// Guards for the Personalize scroll bug (dragging the scroll bar snapped back to the top several times).
// The behaviour lives in a browser page, so these read the sources and pin the three things that fixed it. The reason for each is in
// docs/qa/09-social-admin-ghi-chu.md (lessons 23 to 25). If one of these fails, scroll Settings > Personalize by dragging the bar before changing it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/staff/account-settings-content.html', import.meta.url), 'utf8');
const quality = readFileSync(new URL('../src/staff/account-settings.quality.js', import.meta.url), 'utf8');

test('the browser\'s scroll anchoring is off on the page that has the sticky preview', () => {
  assert.match(page, /html:has\(\.pzst\)[^{}]*\{overflow-anchor:none\}/);
});

test('"stuck" is set by one thing only (the scroll check, with a gap between sticking and un-sticking)', () => {
  const sets = page.match(/classList\.(toggle|add|remove)\(["']stuck["']/g) || [];
  assert.equal(sets.length, 2, 'only the scroll check adds and removes it (the observer must not)');
  assert.match(page, /was\?\(scrollY>20&&top<=t\+30\):\(scrollY>40&&top<=t\+10\)/);
  assert.ok(!/IntersectionObserver\(\(\[e\]\)=>el\.classList\.toggle\("stuck"/.test(page));
});

test('the room the card gives up is reserved BEFORE it shrinks, and no second fix measures after the shrink', () => {
  const i = page.indexOf("c.style.marginBottom=(h0+m0)+'px';c.classList.add('stuck')");
  assert.ok(i > 0, 'the margin is set before the class is added');
  assert.ok(!/function pz\(\)\{[^}]*scrollHeight/.test(quality), 'the older fix in account-settings.quality.js measured the shorter page and cut the scroll position');
  assert.ok(!/MutationObserver\(pz\)/.test(quality));
});

test('the card\'s size does not animate (a size that is changing cannot be measured)', () => {
  assert.match(page, /\.pzst\{position:sticky;[^}]*transition:box-shadow \.15s\}/);
  assert.ok(!/\.pzst\{[^}]*transition:padding/.test(page));
});
