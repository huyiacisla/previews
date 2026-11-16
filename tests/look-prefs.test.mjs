import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lookCss, gestureConfig, onAccent, accentText, contrastRatio, PAGE_LIGHT, PAGE_DARK } from '../src/look-prefs.js';

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
  assert.match(css, /button\.bg-primary/, 'the primary buttons of Social and Messenger too');
  assert.match(css, /:not\(\[data-slot="sidebar-container"\] \*\):not\(header \*\)/);
  assert.match(lookCss({ buttons: { shape: 'square', style: 'outline', size: 'sm' } }), /border-radius:0.*box-shadow:inset 0 0 0 1px var\(--primary-text,var\(--primary\)\).*min-height:1\.75rem/s);
});

test('look: cards take the chosen corner; compact trims the spacing steps', () => {
  const cards = lookCss({ cards: { radius: 22, density: 'comfortable' } });
  assert.match(cards, /\[data-slot="card"\],\.rounded-xl\.bg-card:not\(dialog\)\{border-radius:22px\}/);
  assert.ok(!cards.includes('dialog *'), 'a window keeps its own corners');
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

test('touch screens get 44 px targets by default, a choice made in Settings wins, and the Settings pages and Social carry the same rules', () => {
  const pv = readFileSync(new URL('../src/preview.js', import.meta.url), 'utf8');
  assert.ok(pv.includes('typeof ui.a11y.target === "boolean" ? ui.a11y.target : matchMedia("(pointer: coarse)").matches'), 'with no choice, a touch screen is on');
  assert.ok(pv.includes('if (matchMedia("(pointer: coarse)").matches && chosen !== false) root.setAttribute("data-big-target", "");'), 'only an explicit OFF keeps it off');
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.ok(css.includes(':not([role="tab"]):not([class*="flex-1"]):not([class*="grow"]) { min-width: 2.75rem; }'), 'a short word on a button is 44 wide, but a tab or a flex-1 button keeps its own width (min-width there let a long label run over its neighbour)');
  assert.ok(css.includes('html[data-big-target] #me-link { min-width: 2.75rem;'));
  const q = readFileSync(new URL('../src/staff/account-settings.quality.css', import.meta.url), 'utf8');
  assert.ok(q.includes('html[data-big-target] :is(button, select, textarea, input:is(:not([type])'), 'the Settings pages draw 28 to 40 px controls: raised to 44 here');
  assert.ok(q.includes('html[data-big-target] :is(.stabs a, [role="tab"])'));
  assert.ok(q.includes('html[data-big-target] .sx-sw::before { content: ""; position: absolute; inset: -12px -6px; }'), 'a switch answers a tap over 52 x 46');
});

test('whatever accent is picked, the text on it and the accent as text are readable (WCAG 4.5:1 and better)', () => {
  const hexOf = (h, s, l) => {
    const a = s * Math.min(l, 1 - l);
    const f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  };
  let worstFill = 99;
  let worstText = 99;
  let n = 0;
  for (let h = 0; h < 360; h += 15) {
    for (const s of [0.3, 0.6, 1]) {
      for (const l of [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9]) {
        const c = hexOf(h, s, l);
        n += 1;
        worstFill = Math.min(worstFill, contrastRatio(onAccent(c), c));
        worstText = Math.min(worstText, contrastRatio(accentText(c, PAGE_LIGHT), PAGE_LIGHT), contrastRatio(accentText(c, PAGE_DARK), PAGE_DARK));
      }
    }
  }
  assert.ok(n > 400);
  assert.ok(worstFill >= 4.5, 'text on the accent: worst ' + worstFill);
  assert.ok(worstText >= 5.4, 'the accent as text: worst ' + worstText);
  // the cases people reported: a pale yellow and a lime, white text used to be 1.3:1 and 2:1
  assert.equal(onAccent('#fde68a'), '#000000');
  assert.equal(onAccent('#84cc16'), '#000000');
  assert.equal(onAccent('#1e1b4b'), '#ffffff');
  // an accent that is already readable is left as it is; junk is passed through
  assert.equal(accentText('#1e1b4b', PAGE_LIGHT), '#1e1b4b');
  assert.equal(accentText('red', PAGE_LIGHT), 'red');
  assert.equal(onAccent('nope'), '#000000');
  // tonal and outline buttons use the readable text colour; preview.js sets it for the light and the dark page and hands it to frames
  assert.ok(lookCss({ buttons: { style: 'tonal' } }).includes('color:var(--primary-text,var(--primary))'));
  assert.ok(lookCss({ buttons: { style: 'outline' } }).includes('color:var(--primary-text,var(--primary))'));
  const pv = readFileSync(new URL('../src/preview.js', import.meta.url), 'utf8');
  assert.ok(pv.includes('"--primary-foreground", onAccent(ui.accent)'));
  assert.ok(pv.includes('"--primary-text-d", accentText(ui.accent, PAGE_DARK)'));
  assert.ok(pv.includes('for (const v of ["--primary-foreground", "--primary-text-l", "--primary-text-d"]) {'), 'frames get the same colours');
  assert.match(readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8'), /html\.dark \{ --primary-text: var\(--primary-text-d, var\(--primary\)\); \}/);
});
