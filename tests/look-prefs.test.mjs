import test from 'node:test';
import assert from 'node:assert/strict';
import { lookCss, gestureConfig } from '../src/look-prefs.js';

const defaults = {
  text: { font: 'system', size: 14, weight: 400, line: 1.43, color: '', head: '' },
  buttons: { shape: 'rounded', style: 'filled', size: 'md' },
  cards: { radius: 12, density: 'comfortable' },
};

test('look: the design defaults change nothing, so an untouched page looks as it did', () => {
  assert.equal(lookCss(defaults), '');
  assert.equal(lookCss(null), '');
  assert.equal(lookCss({}), '');
});

test('look: text font, size, weight, line spacing and colours', () => {
  const css = lookCss({ text: { font: 'serif', size: 16, weight: 500, line: 1.7, color: '#112233', head: '#445566' } });
  assert.match(css, /--font-sans:Georgia/);
  assert.match(css, /html\{font-size:18\.286px\}/);
  assert.match(css, /font-weight:500/);
  assert.match(css, /line-height:1\.7!important/);
  assert.match(css, /--foreground:#112233/);
  assert.match(css, /h1,html h2,html h3,html h4\{color:#445566\}/);
});

test('look: buttons change only primary buttons, never the sidebar or the header', () => {
  const css = lookCss({ buttons: { shape: 'pill', style: 'tonal', size: 'lg' } });
  assert.match(css, /border-radius:9999px/);
  assert.match(css, /color-mix\(in oklab,var\(--primary\) 14%/);
  assert.match(css, /min-height:2\.5rem/);
  assert.match(css, /:not\(\[data-variant\]\)/);
  assert.match(css, /:not\(\[data-slot="sidebar-container"\] \*\):not\(header \*\)/);
  assert.match(lookCss({ buttons: { shape: 'square', style: 'outline', size: 'sm' } }), /border-radius:0.*box-shadow:inset 0 0 0 1px var\(--primary\).*min-height:1\.75rem/s);
});

test('look: cards take the chosen corner; compact trims the spacing steps', () => {
  assert.match(lookCss({ cards: { radius: 22, density: 'comfortable' } }), /\[data-slot="card"\]\{border-radius:22px\}/);
  assert.match(lookCss({ cards: { radius: 12, density: 'compact' } }), /--spacing-step-lg:\.75rem/);
});

test('look: bad values never reach the stylesheet', () => {
  const css = lookCss({
    text: { font: 'comic};body{display:none', size: 999, weight: 'bold', line: 99, color: 'red;}body{x:y', head: 'url(javascript:1)' },
    buttons: { shape: 'x}', style: '}', size: '}' },
    cards: { radius: 9999, density: '}' },
  });
  assert.equal(css, '');
  assert.ok(!lookCss({ text: { color: '#12345' } }).includes('--foreground'));
});

test('gestures: design defaults, thresholds and the menu side', () => {
  assert.deepEqual(gestureConfig(null), { on: true, zone: 'edge', ratio: 0.35, close: true, follow: true, side: 'left' });
  const g = gestureConfig({ gestures: { swipe: false, zone: 'any', sens: 'high', close: false, fx: false, side: 'right' } });
  assert.deepEqual(g, { on: false, zone: 'any', ratio: 0.2, close: false, follow: false, side: 'right' });
  assert.equal(gestureConfig({ gestures: { sens: 'low' } }).ratio, 0.5);
  assert.equal(gestureConfig({ gestures: { side: 'up' } }).side, 'left');
});
