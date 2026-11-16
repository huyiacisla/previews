// The page Staff designed in "Templates & brand" (and the builder), drawn for the Resident.
// Staff publish a snapshot of the live template in localStorage ("eso-pm-page"): { v, at, off, key, name, brand, theme, blocks }.
// Everything here is plain DOM with inline styles (the colours and fonts are the brand's, not the portal's) and text is only ever set as text:
// a title typed by Staff can never become markup. The cards inside the blocks are the Resident app's own cards (ctx.makeCard).

export const PAGE_KEY = "eso-pm-page";

const SP = { s: 14, m: 24, l: 44 };
const TS = { s: 18, m: 24, l: 34, xl: 44 };
// every band spans the whole width; its content stays within 72rem in the middle, like the toolbar and the list below
const GUTTER = "max(16px, calc((100% - 72rem) / 2 + 24px))";
const HEX = /^#[0-9a-f]{3,8}$/i;
const FONT = /^[\w\s,'"-]+$/;

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
  const card = alt.toLowerCase() === bg.toLowerCase() ? mix(fg, 5, bg) : alt;
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
      "--muted-foreground": mix(fg, 62, bg),
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
      "--radius": `${Math.round(num(th.radius, 0, 32, 14) * 0.8)}px`,
    },
    scheme: ink(bg) === "#ffffff" ? "dark" : "light",
    font: font(th.font && th.font.b),
    heading: font(th.font && th.font.h),
  };
}

/**
 * Draw the page. ctx:
 *  promos        the live promotions, in the order the app lists them
 *  cats          [{ key, name, count }]
 *  makeCard(p)   one of the app's own cards (a <li>)
 *  toCatalog()   scroll to the full list
 *  pickCategory(key | null)
 *  goLink(label) a navbar link
 *  redeem(code)  open the Redeem box with this code
 *  copy(code)    copy a code
 */
export function renderPage(snap, ctx) {
  const th = snap.theme || {};
  const T = {
    accent: color(th.accent, "#1f2937"),
    bg: color(th.bg, "#ffffff"),
    fg: color(th.fg, "#111827"),
    alt: color(th.alt, "#f4f4f5"),
    radius: num(th.radius, 0, 32, 14),
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

  const root = h("div", `background:${T.bg};color:${T.fg};font-family:${T.bf};overflow:hidden`);
  root.dataset.pagePublished = String(snap.at || 0);

  const bgOf = (s) => (s.bg === "alt" ? T.alt : s.bg === "accent" ? T.accent : color(s.bg, T.bg));
  const btn = (label, on, onAccent) => {
    const c = onAccent ? ink(T.accent) : "#fff";
    const base = "font:inherit;font-weight:600;cursor:pointer;padding:10px 20px;min-height:40px;";
    const css =
      T.btn === "outline"
        ? `${base}background:transparent;border:2px solid ${onAccent ? c : T.accent};color:${onAccent ? c : T.accent};border-radius:${T.radius}px`
        : T.btn === "text"
          ? `${base}background:none;border:0;color:${onAccent ? c : T.accent};text-decoration:underline;padding-left:0;padding-right:0`
          : `${base}background:${onAccent ? c : T.accent};border:0;color:${onAccent ? T.accent : ink(T.accent)};border-radius:${T.btn === "pill" ? 999 : Math.round(T.radius / 2)}px`;
    const b = h("button", css, text(label));
    b.type = "button";
    b.addEventListener("click", on);
    return b;
  };
  const title = (t, s, color2) => (t ? h("h2", `margin:0 0 ${SP.s}px;font-family:${T.hf};font-size:${TS[s.ts] || TS.m}px;line-height:1.2;font-weight:700;${color2 ? `color:${color2}` : ""}`, text(t)) : null);
  const photo = (img, shape, ratio = "4/3") => {
    const src = safeImg(img);
    const box = h("div", `flex:1 1 260px;min-height:180px;aspect-ratio:${shape === "circle" ? "1/1" : ratio};max-height:340px;max-width:${shape === "circle" ? "340px" : "100%"};border-radius:${shape === "circle" ? "50%" : T.radius}px;overflow:hidden;background:linear-gradient(135deg,${T.accent},${T.alt});margin:0 auto`);
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
  const pick = (cat) => (cat && cat !== "all" ? ctx.promos.filter((p) => p.category.key === cat) : ctx.promos);

  for (const b of snap.blocks) {
    const s = b.style || {};
    const p = b.props || {};
    if (b.hideMobile && mobile) continue;
    const bg = bgOf(s);
    const fg = bg === T.accent ? ink(T.accent) : bg === T.bg || bg === T.alt ? T.fg : ink(bg);
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
      const hb = light ? T.alt : `linear-gradient(135deg,${T.accent},${color(snap.brand && snap.brand.secondary, T.accent)})`;
      const hc = light ? T.fg : ink(T.accent);
      node = sec(
        "hero",
        p.kicker ? h("p", `margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;opacity:.85`, sub(p.kicker)) : null,
        h("h2", `margin:0 0 10px;font-family:${T.hf};font-size:${TS[s.ts] || TS.l}px;line-height:1.1;font-weight:800`, sub(p.title)),
        p.sub ? h("p", `margin:${s.align === "center" ? "0 auto 18px" : s.align === "right" ? "0 0 18px auto" : "0 0 18px"};max-width:46ch;font-size:16px;line-height:1.5;opacity:.92`, sub(p.sub)) : null,
        p.btn ? btn(p.btn, () => ctx.toCatalog(), !light) : null,
      );
      node.style.background = hb;
      node.style.color = hc;
    } else if (b.type === "split" || b.type === "imgtext") {
      const txt = h("div", "flex:1 1 280px;min-width:0");
      if (b.type === "split") {
        if (p.kicker) txt.append(h("p", "margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;opacity:.75", sub(p.kicker)));
        txt.append(title(sub(p.title), { ts: s.ts || "l" }));
        if (p.sub) txt.append(h("p", "margin:0 0 16px;font-size:16px;line-height:1.5", sub(p.sub)));
        if (p.btn) txt.append(btn(p.btn, () => ctx.toCatalog()));
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
        grid.append(h("figure", `margin:0;padding:16px;border-radius:${T.radius}px;background:${bg === T.alt ? T.bg : T.alt};color:${T.fg}`, h("blockquote", "margin:0 0 8px;font-size:15px;line-height:1.5", `“${text(q).trim()}”`), who ? h("figcaption", "font-size:13px;opacity:.7", text(who).trim()) : null));
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
      node = sec("cta", h("p", `margin:0 0 12px;font-family:${T.hf};font-size:20px;font-weight:700`, sub(p.text)), p.btn ? btn(p.btn, () => ctx.toCatalog(), bg === T.accent) : null);
    } else if (b.type === "spacer") {
      const hh = num(p.h, 4, 160, 32);
      node = h("div", `height:${hh}px;background:${T.bg};display:flex;align-items:center;padding:0 ${SP.m}px`);
      node.dataset.block = "spacer";
      if (p.line) node.append(h("hr", "width:100%;border:0;border-top:1px solid rgba(100,116,139,.35);margin:0"));
    }
    if (node) root.append(node);
  }
  return root.childElementCount ? root : null;
}
