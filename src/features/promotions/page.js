// The page Staff designed in "Templates & brand" (and the builder), drawn for the Resident.
// Staff publish a snapshot of the live template in localStorage ("eso-pm-page"): { v, at, off, key, name, brand, theme, blocks }.
// Everything here is plain DOM with inline styles (the colours and fonts are the brand's, not the portal's) and text is only ever set as text:
// a title typed by Staff can never become markup. The cards inside the blocks are the Resident app's own cards (ctx.makeCard).

export const PAGE_KEY = "eso-pm-page";

const SP = { s: 14, m: 24, l: 44 };
const TS = { s: 18, m: 24, l: 34, xl: 44 };
// every band spans the whole width; its content stays within 72rem in the middle, like the toolbar and the list below
const GUTTER = "max(16px, calc((100% - 72rem) / 2 + 24px))";
const HEX = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d{1,3})\s*)?\))$/i;
const FONT = /^[\w\s,'"-]+$/;

// The portal's status colours (ui-tokens.css, :root and .dark), for a template whose canvas is not the same as the system's light or dark.
const STATUS_LIGHT = {
  "--success-text": "oklch(0.48 0.125 155.44)",
  "--success-bg": "oklch(0.971 0.0165 156.92)",
  "--warning-text": "oklch(0.5 0.12 64.52)",
  "--warning-bg": "oklch(0.9761 0.022 80.69)",
  "--info-text": "oklch(0.4882 0.125 258)",
  "--info-bg": "oklch(0.9319 0.026 256)",
  "--danger-text": "oklch(0.52 0.16 30.57)",
  "--danger-bg": "oklch(0.9683 0.0157 32.01)",
};
const STATUS_DARK = {
  "--success-text": "oklch(0.85 0.12 157)",
  "--success-bg": "oklch(0.28 0.065 157)",
  "--warning-text": "oklch(0.87 0.12 82)",
  "--warning-bg": "oklch(0.29 0.065 72)",
  "--info-text": "oklch(0.82 0.075 258)",
  "--info-bg": "oklch(0.28 0.06 258)",
  "--danger-text": "oklch(0.82 0.1 28)",
  "--danger-bg": "oklch(0.27 0.09 27)",
};

/** The published snapshot, checked. Returns null when there is none, it is switched off, or it is not a page this app understands. */
export function readPage(storage) {
  let raw = null;
  try {
    raw = JSON.parse(storage.getItem(PAGE_KEY));
  } catch {
    raw = null;
  }
  if (!raw || raw.v !== 1 || raw.off || !Array.isArray(raw.blocks) || !raw.blocks.length) return null;
  return raw;
}

const color = (v, fallback) => (typeof v === "string" && HEX.test(v) ? v : fallback);
const num = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : d);
const text = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
const lines = (v) => text(v).split("\n").map((l) => l.trim()).filter(Boolean);
const safeImg = (v) => (typeof v === "string" && /^data:image\//i.test(v) ? v : "");

// white or near-black, whichever reads on this background
function ink(bg) {
  const m = /^#([0-9a-f]{6})$/i.exec(bg || "");
  if (!m) return "#111827";
  const n = parseInt(m[1], 16);
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.6 ? "#111827" : "#ffffff";
}

// "Ends in 4d 23h": a small badge. It counts to the end of the deal the hero speaks of (its real end date); only a deal without one falls back to the block's own days.
function endsBadge(block, spot, light) {
  const bp = block.props || {};
  const end = spot && spot.endsAt > 0 ? spot.endsAt : Number(bp.endsAt) > 0 ? Number(bp.endsAt) : null;
  if (!end) return null;
  const el = h("span", `display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;border:1px solid currentColor;${light ? "" : "background:rgba(255,255,255,.18);"}`);
  el.setAttribute("role", "timer");
  const paint = () => {
    const s = Math.floor((end - Date.now()) / 1000);
    if (s <= 0) {
      el.textContent = "Ended";
      return false;
    }
    const d = Math.floor(s / 86400);
    const hh = Math.floor((s % 86400) / 3600);
    const mm = Math.floor((s % 3600) / 60);
    el.textContent = d > 0 ? `Ends in ${d}d ${hh}h` : hh > 0 ? `Ends in ${hh}h ${mm}m` : `Ends in ${mm}m`;
    el.title = `Ends ${new Date(end).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`;
    return true;
  };
  paint();
  const timer = setInterval(() => {
    if (!el.isConnected || !paint()) clearInterval(timer);
  }, 30000);
  return el;
}

// The promo code under the hero's words: what it is, one main button (Copy code, with "Copied" as feedback) and one quiet one (View details).
function promoCode(code, light, accent, fg, copy, open) {
  const wrap = h("div", "margin:0 0 4px");
  wrap.append(h("p", "margin:0 0 8px;font-size:13px;font-weight:600;opacity:.9", "Promo code: show it or apply it when you book"));
  const row = h("div", "display:flex;flex-wrap:wrap;align-items:center;gap:10px");
  row.append(h("strong", "font-family:ui-monospace,Menlo,Consolas,monospace;font-size:20px;letter-spacing:.08em;padding:6px 12px;border:2px dashed currentColor;border-radius:8px", code));
  const base = "font:inherit;font-weight:600;cursor:pointer;padding:8px 16px;min-height:40px;border-radius:999px;";
  const main = h("button", `${base}border:2px solid transparent;${light ? `background:${accent};color:${ink(accent)}` : `background:${fg};color:${accent}`}`, "Copy code");
  main.type = "button";
  main.dataset.copy = "";
  const view = h("button", `${base}background:transparent;border:2px solid currentColor;color:inherit`, "View details");
  view.type = "button";
  main.addEventListener("click", async () => {
    const ok = await copy();
    main.textContent = ok === false ? "Could not copy" : "Copied \u2713";
    setTimeout(() => (main.textContent = "Copy code"), 2000);
  });
  view.addEventListener("click", open);
  row.append(main, view);
  wrap.append(row);
  wrap.dataset.promoCode = "";
  return wrap;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Is this block left out for this resident, right now, on this screen? The editor's Advanced tab sets: devices it is hidden on (adv.hide), who sees it
 * (adv.aud: all, res, bld with adv.bld, staff), and the days it shows (adv.from, adv.until).
 */
export function blockHidden(b, ctx, device, now = Date.now()) {
  const a = (b && b.adv) || {};
  if (b.hideMobile && device === "mobile") return true;
  if (Array.isArray(a.hide) && a.hide.includes(device)) return true;
  if (a.aud === "staff") return true;
  if (a.aud === "bld" && !(Array.isArray(a.bld) && a.bld.includes(ctx.building))) return true;
  if (typeof a.from === "string" && DAY.test(a.from) && now < new Date(`${a.from}T00:00:00`).getTime()) return true;
  if (typeof a.until === "string" && DAY.test(a.until) && now > new Date(`${a.until}T23:59:59`).getTime()) return true;
  return false;
}

// "#rrggbb" and an opacity of 0 to 100 as rgba(): only plain 6-digit colours are taken
function withAlpha(hex, pct) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "";
  const n = parseInt(m[1], 16);
  const a = Math.min(100, Math.max(0, Number.isFinite(+pct) ? +pct : 100)) / 100;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** The editor's Style tab for one block: its own background (colour, gradient, picture), text colour, spacing, corners, alignment. */
function applySx(node, sx) {
  if (!sx || typeof sx !== "object") return;
  let solid = "";
  if (sx.fill === "color" && withAlpha(sx.color, sx.alpha)) {
    node.style.background = withAlpha(sx.color, sx.alpha);
    if ((sx.alpha ?? 100) >= 60) solid = sx.color;
  } else if (sx.fill === "grad" && sx.grad && withAlpha(sx.grad.a, 100) && withAlpha(sx.grad.b, 100)) {
    const g = sx.grad;
    node.style.background = `linear-gradient(${num(g.ang, 0, 360, 135)}deg,${withAlpha(g.a, g.aa)} 0%,${withAlpha(g.b, g.ba)} 100%)`;
    solid = g.a;
  } else if (sx.fill === "img" && sx.img && safeImg(sx.img.src)) {
    const i = sx.img;
    const tint = withAlpha(i.tint, i.ta ?? 40);
    node.style.background = `${tint ? `linear-gradient(${tint},${tint}),` : ""}url('${i.src}') ${num(i.px, 0, 100, 50)}% ${num(i.py, 0, 100, 50)}%/cover no-repeat`;
  }
  // the text colour: the one Staff chose, or white or near-black to read on the colour they chose
  if (withAlpha(sx.fg, 100)) node.style.color = sx.fg;
  else if (solid) node.style.color = ink(solid);
  if (sx.pt !== undefined && sx.pt !== "" && Number.isFinite(+sx.pt)) node.style.paddingTop = `${num(sx.pt, 0, 240, 0)}px`;
  if (sx.pb !== undefined && sx.pb !== "" && Number.isFinite(+sx.pb)) node.style.paddingBottom = `${num(sx.pb, 0, 240, 0)}px`;
  if (sx.rad !== undefined && sx.rad !== "" && Number.isFinite(+sx.rad)) {
    node.style.borderRadius = `${num(sx.rad, 0, 64, 0)}px`;
    node.style.overflow = "hidden";
  }
  if (["left", "center", "right"].includes(sx.al)) node.style.textAlign = sx.al;
}

function h(tag, css, ...kids) {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  for (const k of kids) if (k != null) e.append(k);
  return e;
}

/**
 * The whole app wears the template, not only the blocks: the portal's own colour tokens are replaced by the template's (canvas, ink, cards, accent, corners, fonts),
 * so the header, Redeem / My rewards / Saved / Search, the filters, the cards and the boxes that open all look like the page Staff designed. Nothing of the old look is left.
 * Returns { vars, scheme, font } for the app to set on <html>, or null for the portal's own look.
 */
export function themeVars(snap) {
  if (!snap) return null;
  const th = snap.theme || {};
  const bg = color(th.bg, "#ffffff");
  const fg = color(th.fg, "#111827");
  const alt = color(th.alt, "#f4f4f5");
  const accent = color(th.accent, "#1f2937");
  const mix = (a, pct, b) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;
  // a card and a box that opens over the page must not be see-through: a translucent "alt" (glass) becomes the solid colour it looks like on the canvas
  const card = /^rgba/i.test(alt) || alt.toLowerCase() === bg.toLowerCase() ? mix(fg, 7, bg) : alt;
  const muted = mix(fg, 8, bg);
  const font = (v) => (FONT.test(text(v)) ? v : "");
  return {
    vars: {
      "--background": bg,
      "--foreground": fg,
      "--card": card,
      "--card-foreground": fg,
      "--popover": bg,
      "--popover-foreground": fg,
      "--muted": muted,
      "--muted-foreground": mix(fg, 70, bg),
      "--secondary": muted,
      "--secondary-foreground": fg,
      "--accent": mix(accent, 14, bg),
      "--accent-foreground": fg,
      "--border": mix(fg, 16, bg),
      "--input": mix(fg, 32, bg),
      "--primary": accent,
      "--primary-foreground": ink(accent),
      "--ring": accent,
      "--sidebar-primary": accent,
      "--sidebar-primary-foreground": ink(accent),
      "--sidebar-ring": accent,
      "--radius": `${snap.brand && snap.brand.img === "square" ? 0 : Math.round(num(th.radius, 0, 32, 14) * 0.8)}px`,
    },
    scheme: ink(bg) === "#ffffff" ? "dark" : "light",
    status: ink(bg) === "#ffffff" ? STATUS_DARK : STATUS_LIGHT,
    font: font(th.font && th.font.b),
    heading: font(th.font && th.font.h),
    extra: snap.brand && snap.brand.img === "shadow" ? "#grid article{box-shadow:0 10px 28px rgba(0,0,0,.22)}" : "",
  };
}

/**
 * Draw the page. ctx:
 *  promos        the live promotions, in the order the app lists them
 *  cats          [{ key, name, count }]
 *  makeCard(p)   one of the app's own cards (a <li>)
 *  toCatalog()   scroll to the full list
 *  openDeal(p)   open the details of one promotion
 *  building      the resident's building (for blocks shown to specific buildings)
 *  pickCategory(key | null)
 *  goLink(label) a navbar link
 *  redeem(code)  open the Redeem box with this code
 *  copy(code)    copy a code (resolves false when the browser refused)
 */
export function renderPage(snap, ctx) {
  const th = snap.theme || {};
  const T = {
    accent: color(th.accent, "#1f2937"),
    bg: color(th.bg, "#ffffff"),
    fg: color(th.fg, "#111827"),
    alt: color(snap.brand && snap.brand.secondary, "") || color(th.alt, "#f4f4f5"),
    img: snap.brand && ["rounded", "square", "shadow"].includes(snap.brand.img) ? snap.brand.img : "rounded",
    radius: (snap.brand && snap.brand.img === "square") ? 0 : num(th.radius, 0, 32, 14),
    btn: ["pill", "rect", "fill", "outline", "text"].includes(th.btn) ? th.btn : "pill",
    hf: FONT.test(text(th.font && th.font.h)) ? th.font.h : "inherit",
    bf: FONT.test(text(th.font && th.font.b)) ? th.font.b : "inherit",
  };
  // The tokens Staff type in a block ({{brand}} {{offer}} {{code}} {{price}} {{cat}}) speak of one deal, as in the builder: the deal a Featured block names, else the first one.
  const featured = snap.blocks.find((x) => x.type === "featured");
  const spot = ctx.promos.find((p) => featured && p.id === (featured.props || {}).deal) || ctx.promos[0] || null;
  const withCode = ctx.promos.find((p) => p.code);
  const TOK = {
    brand: spot ? spot.title : "",
    offer: spot ? spot.summary || spot.title : "",
    price: spot ? spot.offer : "",
    cat: spot ? spot.category.name : "",
    code: withCode ? withCode.code : "",
  };
  const sub = (s) => text(s).replace(/\{\{(\w+)\}\}/g, (_, k) => TOK[k] ?? "");
  const mobile = typeof matchMedia === "function" && matchMedia("(max-width: 639px)").matches;
  const device = mobile ? "mobile" : typeof matchMedia === "function" && matchMedia("(max-width: 1023px)").matches ? "tablet" : "desktop";

  const root = h("div", `background:${T.bg};color:${T.fg};font-family:${T.bf};overflow:hidden`);
  root.dataset.pagePublished = String(snap.at || 0);

  // text on a section background of the brand's choosing: the page's own text colour, or white or near-black when the background is a plain colour
  T.onAlt = /^#[0-9a-f]{6}$/i.test(T.alt) ? ink(T.alt) : T.fg;
  const imgShadow = T.img === "shadow" ? ";box-shadow:0 12px 32px rgba(0,0,0,.28)" : "";
  const bgOf = (s) => (s.bg === "alt" ? T.alt : s.bg === "accent" ? T.accent : color(s.bg, T.bg));
  // A text or outline button is drawn in the brand colour. When that colour does not read on the section it sits on (gold on cream, green on near-black), the page's own readable ink is used instead.
  const hex6 = (v) => /^#[0-9a-f]{6}$/i.test(v);
  const rl = (v) => {
    const n = parseInt(v.slice(1), 16);
    const g = (x) => ((x /= 255) <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return 0.2126 * g((n >> 16) & 255) + 0.7152 * g((n >> 8) & 255) + 0.0722 * g(n & 255);
  };
  const cr = (a, b) => (Math.max(rl(a), rl(b)) + 0.05) / (Math.min(rl(a), rl(b)) + 0.05);
  let curBg = T.bg;
  const accentOn = () => {
    const b = hex6(curBg) ? curBg : hex6(T.bg) ? T.bg : null;
    return !b || !hex6(T.accent) || cr(T.accent, b) >= 4.5 ? T.accent : ink(b);
  };
  const btn = (label, on, onAccent) => {
    const c = onAccent ? ink(T.accent) : "#fff";
    const ac = accentOn();
    const base = "font:inherit;font-weight:600;cursor:pointer;padding:10px 20px;min-height:40px;";
    const css =
      T.btn === "outline"
        ? `${base}background:transparent;border:2px solid ${onAccent ? c : ac};color:${onAccent ? c : ac};border-radius:${T.radius}px`
        : T.btn === "text"
          ? `${base}background:none;border:0;color:${onAccent ? c : ac};text-decoration:underline;padding-left:0;padding-right:0`
          : `${base}background:${onAccent ? c : T.accent};border:0;color:${onAccent ? T.accent : ink(T.accent)};border-radius:${T.btn === "pill" ? 999 : Math.round(T.radius / 2)}px`;
    const b = h("button", css, text(label));
    b.type = "button";
    b.addEventListener("click", on);
    return b;
  };
  const title = (t, s, color2) => (t ? h("h2", `margin:0 0 ${SP.s}px;font-family:${T.hf};font-size:${TS[s.ts] || TS.m}px;line-height:1.2;font-weight:700;${color2 ? `color:${color2}` : ""}`, text(t)) : null);
  const photo = (img, shape, ratio = "4/3") => {
    const src = safeImg(img);
    const box = h("div", `flex:1 1 260px;min-height:180px;aspect-ratio:${shape === "circle" ? "1/1" : ratio};max-height:340px;max-width:${shape === "circle" ? "340px" : "100%"};border-radius:${shape === "circle" ? "50%" : T.radius}px;overflow:hidden;background:linear-gradient(135deg,${T.accent},${T.alt});margin:0 auto${imgShadow}`);
    if (src) {
      const i = h("img", "width:100%;height:100%;object-fit:cover");
      i.src = src;
      i.alt = "";
      box.append(i);
    }
    return box;
  };
  const cards = (list, wrap) => {
    // the cards keep the app's own colours: the block's text colour is the brand's, and must not reach into them
    const ul = h("ul", `${wrap.css};color:var(--foreground,#111827)`);
    ul.setAttribute("role", "list");
    for (const p of list) {
      const li = ctx.makeCard(p);
      if (wrap.item) li.style.cssText += wrap.item;
      ul.append(li);
    }
    return ul;
  };
  // A countdown and a coupon say nothing alone ("which offer?"): when the page has a hero, they are part of it: an "Ends in" badge in its header and the promo code under its words.
  const heroBlock = snap.blocks.find((x) => x && x.type === "hero");
  const cdBlock = heroBlock ? snap.blocks.find((x) => x && x.type === "countdown") : null;
  const cpBlock = heroBlock ? snap.blocks.find((x) => x && x.type === "coupon" && sub(((x.props || {}).code))) : null;
  // where a button goes: what Staff set in the editor (an https page, or one promotion), else what the block does by itself
  const go = (lk, fallback) => {
    if (!lk || typeof lk !== "object" || !lk.t || lk.t === "none") return fallback;
    if (lk.t === "url" && typeof lk.v === "string" && /^https:\/\/[^\s]+$/i.test(lk.v)) return () => window.open(lk.v, "_blank", "noopener,noreferrer");
    if (lk.t === "promo") {
      const target = ctx.promos.find((x) => String(x.id) === String(lk.v));
      return target ? () => ctx.openDeal(target) : fallback;
    }
    return fallback;
  };
  const pick = (cat) => (cat && cat !== "all" ? ctx.promos.filter((p) => p.category.key === cat) : ctx.promos);

  for (const b of snap.blocks) {
    const s = b.style || {};
    const p = b.props || {};
    if (blockHidden(b, ctx, device)) continue;
    if (b === cdBlock || b === cpBlock) continue; // drawn inside the hero
    const bg = bgOf(s);
    curBg = bg;
    const fg = bg === T.accent ? ink(T.accent) : bg === T.bg ? T.fg : bg === T.alt ? T.onAlt : ink(bg);
    const sec = (type, ...kids) => {
      const e = h("section", `background:${bg};color:${fg};padding:${mobile ? Math.round((SP[s.pad] || SP.m) * 0.75) : SP[s.pad] || SP.m}px 0;padding-inline:${GUTTER};text-align:${["left", "center", "right"].includes(s.align) ? s.align : "left"}`);
      e.dataset.block = type;
      e.append(...kids.filter(Boolean));
      return e;
    };
    let node = null;

    if (b.type === "annbar") {
      node = sec("annbar", h("p", "margin:0;font-size:14px;font-weight:600", sub(p.text)));
      node.style.paddingTop = node.style.paddingBottom = "10px";
      node.style.textAlign = "center";
    } else if (b.type === "navbar") {
      const row = h("div", "display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;justify-content:space-between");
      const brand = h("div", `display:flex;align-items:center;gap:10px;font-family:${T.hf};font-weight:700;font-size:18px`);
      const logo = safeImg(snap.brand && snap.brand.logo);
      if (logo) {
        const i = h("img", "height:28px;width:auto;max-width:96px;object-fit:contain");
        i.src = logo;
        i.alt = "";
        brand.append(i);
      }
      brand.append(text(p.brand));
      const links = h("nav", "display:flex;flex-wrap:wrap;gap:4px 16px");
      links.setAttribute("aria-label", "Page links");
      for (const l of text(p.links).split(",").map((x) => x.trim()).filter(Boolean)) {
        const a = h("button", `font:inherit;font-size:14px;background:none;border:0;color:inherit;cursor:pointer;padding:6px 0;min-height:32px`, l);
        a.type = "button";
        a.addEventListener("click", () => ctx.goLink(l));
        links.append(a);
      }
      row.append(brand, links);
      node = sec("navbar", row);
      node.style.paddingTop = node.style.paddingBottom = "14px";
    } else if (b.type === "hero") {
      const light = p.tone === "light";
      curBg = light ? T.alt : T.accent; // the hero paints its own background
      // the gradient stays within the accent (a darker or lighter shade of it) so the text on it always reads
      const hb = light ? T.alt : `linear-gradient(135deg,${T.accent},color-mix(in srgb, ${T.accent} 72%, ${ink(T.accent) === "#ffffff" ? "#000" : "#fff"}))`;
      const hc = light ? T.onAlt : ink(T.accent);
      const code = cpBlock ? sub((cpBlock.props || {}).code) : "";
      // a code is shown only when a live deal takes it (a sample code nobody accepts would be copied and then refused in Redeem)
      const codeDeal = code ? ctx.promos.find((x) => String(x.code || "").toLowerCase() === code.toLowerCase()) : null;
      const open = () => (codeDeal || spot ? ctx.openDeal(codeDeal || spot) : ctx.toCatalog());
      const badge = cdBlock ? endsBadge(cdBlock, spot, light) : null;
      const head = h("div", "display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:8px 12px");
      head.append(p.kicker ? h("p", `margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;opacity:.85`, sub(p.kicker)) : h("span"));
      if (badge) head.append(badge);
      const strip = code && codeDeal ? promoCode(code, light, T.accent, hc, () => ctx.copy(code), open) : null;
      node = sec(
        "hero",
        p.kicker || badge ? head : null,
        h("h2", `margin:0 0 10px;font-family:${T.hf};font-size:${TS[s.ts] || TS.l}px;line-height:1.1;font-weight:800`, sub(p.title)),
        p.sub ? h("p", `margin:${s.align === "center" ? "0 auto 18px" : s.align === "right" ? "0 0 18px auto" : "0 0 18px"};max-width:46ch;font-size:16px;line-height:1.5;opacity:.92`, sub(p.sub)) : null,
        strip,
        !strip && p.btn ? btn(p.btn, go(p.lk, open), !light) : null,
      );
      node.style.background = hb;
      node.style.color = hc;
    } else if (b.type === "split" || b.type === "imgtext") {
      const txt = h("div", "flex:1 1 280px;min-width:0");
      if (b.type === "split") {
        if (p.kicker) txt.append(h("p", "margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;opacity:.75", sub(p.kicker)));
        txt.append(title(sub(p.title), { ts: s.ts || "l" }));
        if (p.sub) txt.append(h("p", "margin:0 0 16px;font-size:16px;line-height:1.5", sub(p.sub)));
        if (p.btn) txt.append(btn(p.btn, go(p.lk, () => ctx.toCatalog())));
      } else {
        txt.append(title(sub(p.title), s));
        txt.append(h("p", "margin:0;font-size:16px;line-height:1.6", sub(p.text)));
      }
      const row = h("div", `display:flex;flex-wrap:wrap;align-items:center;gap:24px;flex-direction:${p.flip ? "row-reverse" : "row"}`, txt, photo(p.img, p.shape));
      node = sec(b.type, row);
    } else if (b.type === "tiles") {
      // not drawn: the chips under the search bar already are the category list
      continue;
    } else if (b.type === "grid") {
      const list = pick(p.cat).slice(0, num(p.count, 1, 12, 4));
      if (!list.length) continue;
      const cols = num(p.cols, 1, 5, 3);
      // on a phone a long grid would be a very long page: more than two cards slide sideways instead
      const wrap =
        mobile && list.length > 2
          ? { css: "list-style:none;margin:0;padding:0 0 8px;display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x proximity", item: ";flex:0 0 min(290px,82%);scroll-snap-align:start" }
          : { css: `list-style:none;margin:0;padding:0;display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(min(100%,max(230px,calc(${(100 / cols).toFixed(2)}% - 16px))),1fr))` };
      node = sec("grid", title(sub(p.title), s), cards(list, wrap));
    } else if (b.type === "carousel") {
      const list = pick(p.cat).slice(0, num(p.count, 1, 12, 6));
      if (!list.length) continue;
      node = sec("carousel", title(sub(p.title), s), cards(list, { css: "list-style:none;margin:0;padding:0 0 8px;display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x proximity", item: ";flex:0 0 min(290px,82%);scroll-snap-align:start" }));
    } else if (b.type === "featured") {
      const one = ctx.promos.find((x) => x.id === p.deal) || ctx.promos[0];
      if (!one) continue;
      node = sec("featured", title(sub(p.title), s), cards([one], { css: "list-style:none;margin:0;padding:0;max-width:440px", item: s.align === "center" ? ";margin:0 auto" : "" }));
    } else if (b.type === "countdown") {
      const end = Number(p.endsAt) > 0 ? Number(p.endsAt) : (Number(snap.at) || Date.now()) + num(p.days, 0, 365, 5) * 864e5;
      const out = h("p", `margin:0;font-family:${T.hf};font-size:34px;font-weight:800;font-variant-numeric:tabular-nums;color:${bg === T.accent ? "inherit" : T.accent}`);
      out.setAttribute("role", "timer");
      const paint = () => {
        const ms = end - Date.now();
        if (ms <= 0) {
          out.textContent = "This offer has ended";
          return false;
        }
        const t = Math.floor(ms / 1000);
        const d = Math.floor(t / 86400);
        const hh = String(Math.floor((t % 86400) / 3600)).padStart(2, "0");
        const mm = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
        const ss = String(t % 60).padStart(2, "0");
        out.textContent = `${d > 0 ? `${d}d ` : ""}${hh}:${mm}:${ss}`;
        return true;
      };
      paint();
      const timer = setInterval(() => {
        if (!out.isConnected || !paint()) clearInterval(timer);
      }, 1000);
      node = sec("countdown", title(sub(p.title), s), out);
    } else if (b.type === "coupon") {
      const code = sub(p.code);
      if (!code) continue;
      const box = h("div", `display:inline-flex;flex-wrap:wrap;align-items:center;gap:12px;padding:12px 16px;border:2px dashed ${bg === T.accent ? "currentColor" : T.accent};border-radius:${T.radius}px`);
      box.append(h("strong", "font-family:ui-monospace,Menlo,Consolas,monospace;font-size:22px;letter-spacing:.08em", code));
      box.append(btn("Copy", () => ctx.copy(code)), btn("Use code", () => ctx.redeem(code)));
      node = sec("coupon", title(sub(p.title), s), box, p.note ? h("p", "margin:10px 0 0;font-size:13px;opacity:.75", sub(p.note)) : null);
    } else if (b.type === "quotes") {
      const grid = h("div", "display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px");
      for (const l of lines(p.items)) {
        const [q, who] = l.split("|");
        grid.append(h("figure", `margin:0;padding:16px;border-radius:${T.radius}px;background:${bg === T.alt ? T.bg : T.alt};color:${bg === T.alt ? T.fg : T.onAlt}`, h("blockquote", "margin:0 0 8px;font-size:15px;line-height:1.5", `“${text(q).trim()}”`), who ? h("figcaption", "font-size:13px;opacity:.7", text(who).trim()) : null));
      }
      node = sec("quotes", title(sub(p.title), s), grid);
    } else if (b.type === "faq") {
      const wrap = h("div", "display:flex;flex-direction:column;gap:8px");
      for (const l of lines(p.items)) {
        const [q, a] = l.split("|");
        const d = h("details", `padding:12px 16px;border:1px solid rgba(100,116,139,.35);border-radius:${T.radius}px`, h("summary", "cursor:pointer;font-weight:600", text(q).trim()), h("p", "margin:8px 0 0;line-height:1.5", text(a).trim()));
        wrap.append(d);
      }
      node = sec("faq", title(sub(p.title), s), wrap);
    } else if (b.type === "map") {
      node = sec("map", title(sub(p.title), s), h("p", "margin:0;font-size:15px;line-height:1.5", text(p.address)));
    } else if (b.type === "cta") {
      node = sec("cta", h("p", `margin:0 0 12px;font-family:${T.hf};font-size:20px;font-weight:700`, sub(p.text)), p.btn ? btn(p.btn, go(p.lk, () => ctx.toCatalog()), bg === T.accent) : null);
    } else if (b.type === "spacer") {
      const hh = num(p.h, 4, 160, 32);
      node = h("div", `height:${hh}px;background:${T.bg};display:flex;align-items:center;padding:0 ${SP.m}px`);
      node.dataset.block = "spacer";
      if (p.line) node.append(h("hr", "width:100%;border:0;border-top:1px solid rgba(100,116,139,.35);margin:0"));
    }
    if (node) {
      applySx(node, b.sx);
      root.append(node);
    }
  }
  return root.childElementCount ? root : null;
}
