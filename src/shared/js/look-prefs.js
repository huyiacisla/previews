// Turns what a person picks in Settings > Personalize (text, buttons, cards, density) into one small stylesheet for the real pages.
//
// Settings publishes the choices as `ui-prefs:<portal>` (see account-settings.staff.js). Nothing here runs until a choice differs
// from the design's default, so a page nobody personalised looks exactly as it did. Only theme tokens and a few attribute selectors
// are used; every value is checked before it reaches the stylesheet.

const FONTS = {
  inter: "Inter, ui-sans-serif, system-ui, sans-serif",
  serif: 'Georgia, "Times New Roman", serif',
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};
const hex = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/* ---- readable accent colours (WCAG 2.x relative luminance) ---------------------------------------------------------------------------------
   An accent the person picks (Settings > Personalize) is used as a button fill with text on it, and as text on the page (tonal and outline buttons).
   A light accent (yellow, lime) made white text unreadable, and a dark one made it too faint on the dark page. So the text on the fill is whichever of
   white or near-black has more contrast (at least 4.58:1 whatever the accent; pure black, because near-black falls to 4.4), and the accent used as TEXT is moved toward black on a light
   page or toward white on a dark one until it reaches 4.8:1, keeping its hue. */
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) =>
  `#${c
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
const lum = (c) => {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrastRatio(a, b) {
  const x = lum(rgb(a));
  const y = lum(rgb(b));
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** The text colour for something filled with this accent: white or near-black, whichever reads better. */
export function onAccent(accent) {
  return hex(accent) && contrastRatio("#ffffff", accent) >= contrastRatio("#000000", accent) ? "#ffffff" : "#000000";
}
/** The accent as text on this page background: the accent itself when it is readable, otherwise moved toward black (light page) or white (dark page). */
export function accentText(accent, page, min = 5.5) {
  // 5.5 on the plain page: a tonal button sits on a tint of the accent, which costs about 0.9
  if (!hex(accent) || !hex(page)) return accent;
  const toward = lum(rgb(page)) > 0.4 ? [0, 0, 0] : [255, 255, 255];
  let c = rgb(accent);
  for (let i = 0; i < 40 && contrastRatio(toHex(c), page) < min; i += 1) c = c.map((v, k) => v + (toward[k] - v) * 0.08);
  return toHex(c);
}
export const PAGE_LIGHT = "#ffffff";
export const PAGE_DARK = "#171717";
const num = (v, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

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
    // The pages drawn with the design's own button (`data-slot="button"`) and the pages of this project (Social, Messenger), whose primary buttons are a
    // `button` with the primary background: both change, so a choice made in Settings reaches every page, not only the dashboard.
    const P = ':is([data-slot="button"]:not([data-variant]),button.bg-primary):not([data-slot="sidebar-container"] *):not(header *)';
    if (b.shape === "pill") out.push(`${P}{border-radius:9999px}`);
    else if (b.shape === "square") out.push(`${P}{border-radius:0}`);
    // (the accent used as text is --primary-text: the accent made readable on the page, see accentText; it falls back to the accent itself)
    if (b.style === "tonal") out.push(`${P}{background-color:color-mix(in oklab,var(--primary) 14%,var(--card));color:var(--primary-text,var(--primary))}`);
    else if (b.style === "outline") out.push(`${P}{background-color:transparent;color:var(--primary-text,var(--primary));box-shadow:inset 0 0 0 1px var(--primary-text,var(--primary))}`);
    if (b.size === "sm") out.push(`${P}{min-height:1.75rem}`);
    else if (b.size === "lg") out.push(`${P}{min-height:2.5rem;padding-inline:1rem}`);
  }
  const c = ui && ui.cards;
  if (c) {
    // 12 px is the design's default corner; the real cards are 14 px, so only a different choice changes them.
    const r = num(c.radius, 0, 40);
    // (The pages of this project draw a card as a rounded box on the card background; a window keeps its own shape, which is square on a phone.)
    if (r !== null && r !== 12) out.push(`[data-slot="card"],.rounded-xl.bg-card:not(dialog){border-radius:${Math.round(r)}px}`);
    // Compact trims the spacing steps every page uses to a quarter less.
    if (c.density === "compact") out.push("html:root{--spacing-step-md:.5625rem;--spacing-step-lg:.75rem;--spacing-step-xl:1.125rem}");
  }
  return out.join("\n");
}

/** Sidebar gesture choices for the off-canvas menu (mobile and tablet), with the design's defaults for anything missing. */
export function gestureConfig(ui) {
  const g = (ui && ui.gestures) || {};
  return {
    on: g.swipe !== false,
    zone: g.zone === "any" ? "any" : "edge",
    // Share of the menu's width that has to be dragged for it to open or close (a quick flick also counts).
    ratio: { low: 0.5, high: 0.2 }[g.sens] || 0.35,
    close: g.close !== false,
    follow: g.fx !== false,
    side: g.side === "right" ? "right" : "left",
  };
}
