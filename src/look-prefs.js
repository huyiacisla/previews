// Turns what a person picks in Settings > Personalize (text, buttons, cards, density) into one small stylesheet for the real pages.
//
// Settings publishes the choices as `ui-prefs:<portal>` (see account-settings.staff.js). Nothing here runs until a choice differs
// from the design's default, so a page nobody personalised looks exactly as it did. Only theme tokens and a few attribute selectors
// are used; every value is checked before it reaches the stylesheet.

const FONTS = {
  inter: 'Inter, ui-sans-serif, system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};
const hex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const num = (v, min, max) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? n : null; };

/** The stylesheet text for these choices ("" when nothing differs from the default). `ui` is the parsed `ui-prefs:<portal>`. */
export function lookCss(ui) {
  const out = [];
  const t = ui && ui.text;
  if (t) {
    if (FONTS[t.font]) out.push(`:root{--font-sans:${FONTS[t.font]}}html,body{font-family:var(--font-sans)}`);
    // The design's text size is the body size (14 px). Pages are drawn in rem, so scaling the root scales the whole page.
    const size = num(t.size, 12, 24);
    if (size && size !== 14) out.push(`html{font-size:${((16 * size) / 14).toFixed(3)}px}`);
    const weight = num(t.weight, 300, 700);
    if (weight && weight !== 400) out.push(`body{font-weight:${Math.round(weight)}}`);
    const lh = num(t.line, 1.2, 2.2);
    if (lh && Math.abs(lh - 1.43) > 0.001) out.push(`html body :is(p,li,dd,td,label){line-height:${lh}!important}`);
    if (hex(t.color)) out.push(`html:root,html.dark:root{--foreground:${t.color}}`);
    if (hex(t.head)) out.push(`html h1,html h2,html h3,html h4{color:${t.head}}`);
  }
  // Primary buttons are the ones without a variant (secondary, ghost and the like keep their look). Colour comes from the accent.
  const b = ui && ui.buttons;
  if (b) {
    // The sidebar and the header have their own look (they are drawn with the sidebar colours), so only the page's buttons change.
    const P = '[data-slot="button"]:not([data-variant]):not([data-slot="sidebar-container"] *):not(header *)';
    if (b.shape === 'pill') out.push(`${P}{border-radius:9999px}`);
    else if (b.shape === 'square') out.push(`${P}{border-radius:0}`);
    if (b.style === 'tonal') out.push(`${P}{background-color:color-mix(in oklab,var(--primary) 14%,var(--card));color:var(--primary)}`);
    else if (b.style === 'outline') out.push(`${P}{background-color:transparent;color:var(--primary);box-shadow:inset 0 0 0 1px var(--primary)}`);
    if (b.size === 'sm') out.push(`${P}{min-height:1.75rem}`);
    else if (b.size === 'lg') out.push(`${P}{min-height:2.5rem;padding-inline:1rem}`);
  }
  const c = ui && ui.cards;
  if (c) {
    // 12 px is the design's default corner; the real cards are 14 px, so only a different choice changes them.
    const r = num(c.radius, 0, 40);
    if (r !== null && r !== 12) out.push(`[data-slot="card"]{border-radius:${Math.round(r)}px}`);
    // Compact trims the spacing steps every page uses to a quarter less.
    if (c.density === 'compact') out.push('html:root{--spacing-step-md:.5625rem;--spacing-step-lg:.75rem;--spacing-step-xl:1.125rem}');
  }
  return out.join('\n');
}

/** Sidebar gesture choices for the off-canvas menu (mobile and tablet), with the design's defaults for anything missing. */
export function gestureConfig(ui) {
  const g = (ui && ui.gestures) || {};
  return {
    on: g.swipe !== false,
    zone: g.zone === 'any' ? 'any' : 'edge',
    // Share of the menu's width that has to be dragged for it to open or close (a quick flick also counts).
    ratio: { low: 0.5, high: 0.2 }[g.sens] || 0.35,
    close: g.close !== false,
    follow: g.fx !== false,
    side: g.side === 'right' ? 'right' : 'left',
  };
}
