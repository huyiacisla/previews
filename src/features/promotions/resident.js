// Resident Promotions page controller. <body data-portal="resident">.
// All markup and Tailwind classes live in partials/promotions-app.html; this file clones templates, fills text and
// toggles hidden / data-* / aria-*. The data comes from promotions/store.js (what Staff published).

import { initials, PORTALS, pickPersona } from "../messaging/personas.js";
import { PAGE_KEY, readPage, renderPage, themeVars } from "./page.js";
import { activeClaims, allRecords, cancelClaim, categoriesIn, claim, claimStatus, claimDecidedAt, claimSteps, claimTimeline, historyFor, householdClaims, HOUSEHOLD, KEY, listPromotions, lookupCode, readConfig, maskCode, residentState, rewardGroup, rewardInfo, toggleSaved, unitMates } from "./store.js";

const $ = (sel, root = document) => root.querySelector(sel);
const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);
const clear = (el) => {
  while (el.firstChild) el.removeChild(el.firstChild);
};

const portal = document.body.dataset.portal;
// ?as=res-4 opens the page as Jamie, who lives in Alex's unit (a promotion limited per unit counts them once)
const asParam = new URLSearchParams(location.search).get("as");
const me = (portal === "resident" && HOUSEHOLD.find((p) => p.id === asParam)) || pickPersona(portal, asParam);
const info = PORTALS[portal];
const storage = window.localStorage;
// What Staff can target a promotion at: this resident's building and segments.
const viewer = me.unit ? { block: me.unit.block, segments: me.unit.segments } : undefined;

const ui = { query: "", category: "all", openId: null, tags: new Set(), sort: "rec", panel: false };

// The quick filters in the panel next to the search box.
const TAGS = [
  ["new", "New", (p) => p.isNew],
  ["hot", "Hot", (p, hot) => hot.has(p.id)],
  ["limited", "Limited", (p) => p.isLimited],
  ["ending", "Ending soon", (p) => p.daysLeft != null && p.daysLeft <= 7 && !p.full],
  ["free", "Free", (p) => p.isFree],
  ["open", "Still available", (p) => !p.full],
];
// Hot = the top quarter by how many claimed it (and at least 20).
function hotSet(list) {
  const top = [...list].sort((a, b) => b.claimed - a.claimed).slice(0, Math.max(1, Math.ceil(list.length / 4)));
  return new Set(top.filter((p) => p.claimed >= 20).map((p) => p.id));
}
const SORTS = {
  rec: null,
  end: (a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9),
  claimed: (a, b) => b.claimed - a.claimed,
  az: (a, b) => a.title.localeCompare(b.title),
};

/* ------------------------------------------------------------------ header */

$("#me-avatar").textContent = initials(me.name);
$("#me-name").textContent = me.name;
$("#me-role").textContent = me.title;


function toast(text) {
  const el = tpl("t-toast");
  $("[data-text]", el).textContent = text;
  const box = $("#toasts");
  box.appendChild(el);
  // The box is a popover so a toast also shows above the open details dialog (both live in the top layer).
  try {
    if (box.matches(":popover-open")) box.hidePopover();
    box.showPopover();
  } catch {
    /* older browsers: the fixed box still shows */
  }
  setTimeout(() => {
    el.remove();
    if (!box.children.length)
      try {
        box.hidePopover();
      } catch {
        /* already hidden */
      }
  }, 3500);
}

function badge(text, tone = "neutral") {
  const el = tpl("t-badge");
  el.dataset.tone = tone;
  el.textContent = text;
  return el;
}

const fmtDate = (iso) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const endText = (p) => (p.end ? `Ends ${fmtDate(p.end)}` : "");
// The card footer, bottom right: "Exp: Nov 3, 2026" (a deal with no end date says so)
const expText = (p) => {
  const d = p.end || p.endShow;
  return d ? `Exp: ${fmtDate(d)}` : "No expiry";
};
const initialsOf = (t) =>
  String(t || "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase() || "?";

function setCover(img, none, cover, visual) {
  if (cover) {
    img.src = cover.src;
    img.alt = cover.alt;
    img.style.objectPosition = `${cover.x}% ${cover.y}%`;
    img.style.transform = `scale(${cover.zoom})`;
  }
  img.hidden = !cover;
  none.hidden = !!cover;
  // No picture: a sample deal shows its colour and symbol, any other the tag icon (the dialog's placeholder is reused, so it is put back each time).
  if (none._icon === undefined) none._icon = none.innerHTML;
  if (!cover && visual) {
    none.style.background = visual.gradient;
    const sym = document.createElement("span");
    sym.setAttribute("aria-hidden", "true");
    sym.style.fontSize = "2.25rem";
    sym.textContent = visual.emoji;
    none.replaceChildren(sym);
  } else {
    none.style.background = "";
    if (none.innerHTML !== none._icon) none.innerHTML = none._icon;
  }
}

/* --------------------------------------------------------------------- list */

// The filter button, its count and the panel (chips for New, Hot, Limited, Ending soon, Free, Still available).
// The Saved icon next to Redeem and My rewards: how many promotions are saved (it grows with every star, like a cart), and a press opens them.
// The red badges on Saved and My rewards count what is NEW since the resident last opened that panel, not how many there are in all (the panel's own heading says that).
// Each is kept for the resident (so a reload, another tab or Staff's Resident view of the same person shows the same number) and goes away when the panel is opened.
const UNSEEN = { saved: `eso_unseen_saved_count:${me.id}`, rewards: `eso_unseen_rewards_count:${me.id}` };
function readUnseen(kind) {
  let v = 0;
  try {
    v = Number(storage.getItem(UNSEEN[kind]));
  } catch {
    /* not remembered */
  }
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}
function setUnseen(kind, n) {
  try {
    storage.setItem(UNSEEN[kind], String(Math.max(0, Math.floor(n))));
  } catch {
    /* not remembered */
  }
  paintUnseen();
}
// +1 for something new; -1 (never below 0, and never a new badge) when it is taken away
const bumpUnseen = (kind, d) => setUnseen(kind, readUnseen(kind) + d);
let savedTotal = 0; // how many are saved in all (the badge counts only the new ones)
function paintUnseen() {
  for (const [kind, id] of [
    ["saved", "#saved-count"],
    ["rewards", "#rewards-count"],
  ]) {
    const n = readUnseen(kind);
    const c = $(id);
    c.hidden = n === 0;
    c.textContent = String(n);
    c.title = n ? `${n} new` : ""; // the number on the corner is what is NEW since the window was last opened; the window's heading says how many there are in total
  }
  const nr = readUnseen("rewards");
  const ns = readUnseen("saved");
  $("#btn-rewards").setAttribute("aria-label", nr ? `My rewards, ${nr} new` : "My rewards");
  $("#btn-saved").setAttribute("aria-label", `Saved promotions, ${savedTotal} in total${ns ? `, ${ns} new` : ""}`);
}

function paintSavedButton(n, on) {
  const b = $("#btn-saved");
  b.hidden = !on;
  b.setAttribute("aria-haspopup", "dialog");
  savedTotal = n;
  paintUnseen();
}

// The page Staff designed (Templates & brand), drawn above the list. It is drawn again only when what it shows changed.
let pageKey = "";
// a block can be hidden on phones or tablets, and the page's titles are smaller there: the page is drawn again when the screen crosses those widths.
// The width is looked at again when the page has loaded and its first frame is drawn too: a page that is opened in a frame which is laid out a moment later (Staff's Resident view,
// a frame not yet on screen) must not keep the look of a phone it was first measured as.
const deviceNow = () => (matchMedia("(max-width: 639px)").matches ? "phone" : matchMedia("(max-width: 1023px)").matches ? "tablet" : "desktop");
let lastDevice = deviceNow();
function syncDevice() {
  const now = deviceNow();
  fitBar();
  if (now === lastDevice) return;
  lastDevice = now;
  pageKey = "";
  render();
}
for (const q of ["(max-width: 639px)", "(max-width: 1023px)"]) matchMedia(q).addEventListener("change", syncDevice);
addEventListener("resize", syncDevice);
addEventListener("load", syncDevice);
requestAnimationFrame(syncDevice);
// The template covers the whole app (see themeVars). Its tokens go in a stylesheet marked !important, so neither the dark/light class nor the portal's own accent
// (which the shell copies into this frame) can bring back the old look; with no template the sheet is removed and the portal's own look returns.
function wearTheme(snap) {
  let el = document.getElementById("pm-theme");
  const t = themeVars(snap);
  $("[data-theme-toggle]")?.toggleAttribute("hidden", !!t);
  if (!t) {
    el?.remove();
    wearInFrame("");
    return;
  }
  if (!el) {
    el = document.createElement("style");
    el.id = "pm-theme";
    document.head.append(el);
  }
  const decl = Object.entries({ ...t.vars, ...t.status }).map(([k, v]) => k + ":" + v + " !important").join(";");
  // the template's heading font goes to every heading of the app, its body font to everything else
  const css = ":root,:root.dark,:root.light{" + decl + ";color-scheme:" + t.scheme + (t.font ? ";font-family:" + t.font : "") + "}" + (t.heading ? "h1,h2,h3{font-family:" + t.heading + "}" : "") + t.extra;
  el.textContent = css;
  wearInFrame(css);
}
// The portal around this page is another document of the same origin: it wears the same theme (its header, badge and buttons). Its shared page search stays as it is.
// A new page loads a new portal document, so nothing here outlives the page.
function wearInFrame(css) {
  try {
    if (window.parent === window) return;
    // only the Resident portal around this page is dressed: in Staff's "Resident view" the page around it is Staff's own, which must keep its own look
    if (!window.parent.location.pathname.startsWith("/resident/")) return;
    const pd = window.parent.document;
    let el = pd.getElementById("pm-theme");
    if (!css) return el?.remove();
    if (!el) {
      el = pd.createElement("style");
      el.id = "pm-theme";
      pd.head.append(el);
    }
    el.textContent = css;
  } catch {
    /* a portal of another origin: left alone */
  }
}
// The top bar always stays, and on a phone it is always the compact one: ONE row of controls (search, filter, Redeem, My rewards, Saved, all the same kind of square icon with its count on the corner;
// the words stay for screen readers and as tooltips) with the category chips as a slim row under it. The same bar at the top and after any scroll, so nothing moves or changes shape when you scroll.
const topBar = $("#toolbar");
const mainEl = $("#main-content");
let folded = null;
function fitBar() {
  const want = matchMedia("(max-width: 639px)").matches;
  if (want === folded) return;
  folded = want;
  topBar.dataset.condensed = String(want);
  topBar.style.marginBottom = "";
}
fitBar();
mainEl.addEventListener("scroll", fitBar, { passive: true });
addEventListener("resize", fitBar);
function scrollToCatalog() {
  // the results are reached with the bar folded on a phone, so leave room for the folded bar (its row of controls and the row of chips) only
  $("#count").style.scrollMarginTop = matchMedia("(max-width: 639px)").matches ? "112px" : `${topBar.offsetHeight + 12}px`;
  $("#count").scrollIntoView({ block: "start", behavior: "smooth" });
}
function pickCategory(key) {
  ui.category = key || "all";
  render();
  scrollToCatalog();
}
function paintPage(all, mine, cfg, hot, cats) {
  const host = $("#page-top");
  const snap = cfg.show ? readPage(storage) : null;
  const key = snap ? `${snap.at}|${all.map((p) => `${p.id}:${p.claimed}`).join(",")}|${[...mine.saved].join(",")}|${ui.category}` : "";
  if (key === pageKey) return;
  pageKey = key;
  wearTheme(snap);
  clear(host);
  const el = snap
    ? renderPage(snap, {
        promos: all,
        cats,
        makeCard: (p) => card(p, mine, cfg, hot),
        toCatalog: scrollToCatalog,
        openDeal: (p) => openDialog(p.id),
        building: (me.unit && me.unit.block) || "",
        pickCategory,
        goLink: (label) => {
          const l = label.toLowerCase();
          const c = cats.find((x) => x.name.toLowerCase().includes(l) || l.includes(x.name.toLowerCase()));
          if (/^(deals?|all|home|shop|store)/.test(l)) pickCategory("all");
          else if (c) pickCategory(c.key);
          else scrollToCatalog();
        },
        redeem: (code) => {
          clear($("#rd-out"));
          $("#rd-input").value = code;
          rdDlg.showModal();
          checkCode(code);
        },
        copy: async (code) => {
          try {
            await navigator.clipboard.writeText(code);
            toast("Code copied");
            return true;
          } catch {
            toast("Could not copy. Select the code and copy it.");
            return false;
          }
        },
      })
    : null;
  host.hidden = !el;
  if (el) host.appendChild(el);
}

function paintRewardsBadge() {
  paintUnseen();
}

function paintFilterPanel(counts) {
  const n = ui.tags.size + (ui.sort !== "rec" ? 1 : 0);
  const btn = $("#btn-filter");
  btn.setAttribute("aria-expanded", String(ui.panel));
  btn.setAttribute("aria-label", n ? `Filters, ${n} active` : "Filters");
  const badgeEl = $("#filter-count");
  badgeEl.hidden = !n;
  badgeEl.textContent = String(n);
  $("#filter-panel").hidden = !ui.panel;
  $("#sort").value = ui.sort;
  $("#filter-clear").hidden = !n;
  const box = $("#tag-filters");
  clear(box);
  for (const [k, label] of TAGS) {
    const b = tpl("t-filter");
    $("[data-label]", b).textContent = label;
    $("[data-count]", b).textContent = String(counts[k]);
    b.setAttribute("aria-pressed", String(ui.tags.has(k)));
    b.addEventListener("click", () => {
      if (ui.tags.has(k)) ui.tags.delete(k);
      else ui.tags.add(k);
      render();
    });
    box.appendChild(b);
  }
}

function render() {
  const cfg = readConfig(storage);
  const mine = residentState(storage, me.id);
  const all = listPromotions(storage, { viewer });
  const cats = categoriesIn(storage, undefined, viewer);
  if (ui.category !== "all" && !cats.some((c) => c.key === ui.category)) ui.category = "all";
  let list = listPromotions(storage, { query: ui.query, category: ui.category, viewer });
  const hot = hotSet(all);
  const counts = Object.fromEntries(TAGS.map(([k, , test]) => [k, list.filter((p) => test(p, hot)).length]));
  for (const k of ui.tags) {
    const test = TAGS.find((t) => t[0] === k)[2];
    list = list.filter((p) => test(p, hot));
  }
  if (SORTS[ui.sort]) list = [...list].sort(SORTS[ui.sort]);
  paintFilterPanel(counts);
  paintRewardsBadge();
  paintPage(all, mine, cfg, hot, cats);
  $("#page-top").hidden = !$("#page-top").childElementCount;
  if (svDlg.open) paintSaved();
  paintSavedButton(all.filter((p) => mine.saved.has(p.id)).length, cfg.save);

  // filter row: All, one per category, Saved
  const filters = $("#filters");
  clear(filters);
  const chip = (label, count, pressed, onClick) => {
    const b = tpl("t-filter");
    $("[data-label]", b).textContent = label;
    $("[data-count]", b).textContent = count == null ? "" : String(count);
    b.setAttribute("aria-pressed", String(pressed));
    b.addEventListener("click", onClick);
    filters.appendChild(b);
  };
  if (all.length) {
    chip("All", all.length, ui.category === "all", () => {
      ui.category = "all";
      render();
      scrollToCatalog();
    });
    for (const c of cats)
      chip(c.name, c.count, ui.category === c.key, () => {
        ui.category = c.key;
        render();
        scrollToCatalog();
      });
  }
  filters.hidden = !filters.childElementCount;

  const grid = $("#grid");
  clear(grid);
  for (const p of list) grid.appendChild(card(p, mine, cfg, hot));
  $("#count").textContent = all.length ? `${list.length} of ${all.length} ${all.length === 1 ? "promotion" : "promotions"}` : "";

  const empty = $("#empty");
  empty.hidden = list.length > 0;
  clear(empty);
  if (!list.length) {
    const e = tpl("t-empty");
    const [title, text] = emptyText(cfg, all.length);
    $("[data-title]", e).textContent = title;
    $("[data-text]", e).textContent = text;
    empty.appendChild(e);
  }
  if (ui.openId) refreshDialog();
}

function emptyText(cfg, total) {
  if (!cfg.show) return ["Promotions are off", "The property team has turned promotions off for now."];
  if (!total) return ["No promotions yet", "Offers from the property team and its partners will show up here as soon as they are published."];
  return ["No matches", "Try another word or pick a different category."];
}

// How many are left (only for a promotion with a total limit): words and a bar, never colour alone. The classes live in the t-stock template.
function stockEl(p) {
  if (!(p.total > 0)) return null;
  const left = p.left ?? Math.max(0, p.total - p.claimed);
  const pct = Math.max(0, Math.min(100, Math.round((left / p.total) * 100)));
  const low = left > 0 && (pct <= 10 || left <= 5);
  const el = tpl("t-stock");
  el.dataset.tone = left === 0 ? "out" : low ? "low" : "ok";
  $("[data-text]", el).textContent = left === 0 ? "Sold out" : low ? `Only ${left} left` : `${left} of ${p.total} left`;
  $("[data-fill]", el).style.width = `${pct}%`;
  return el;
}

// The one tag a card carries on its cover, most important first.
function tagOf(p, hot) {
  if (p.full) return ["Sold out", "danger"];
  if (p.daysLeft != null && p.daysLeft <= 7) return ["Ending soon", "warning"];
  if (hot.has(p.id)) return ["Hot", "danger"];
  if (p.isLimited) return ["Limited", "info"];
  if (p.isNew) return ["New", "success"];
  return null;
}

// "2d 5h left", then "5h 12m left", then "12m 30s left" in the last hour. At zero the list is drawn again (the promotion is gone).
function leftText(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m ${s % 60}s left`;
}
function paintCount(el) {
  const ms = Number(el.dataset.ends) - Date.now();
  if (ms <= 0) {
    el.hidden = true;
    return true;
  }
  $("[data-countdown-text]", el).textContent = leftText(ms);
  return false;
}
let counting = 0;
function startTicker() {
  if (counting) return;
  counting = setInterval(() => {
    let done = false;
    for (const el of document.querySelectorAll("[data-countdown]:not([hidden])")) done = paintCount(el) || done;
    if (done) render();
  }, 1000);
}

function card(p, mine, cfg, hot = new Set()) {
  const li = tpl("t-card");
  li.dataset.promo = p.id;
  if (flashId === String(p.id) && Date.now() < flashUntil) li.setAttribute("data-flash", "");
  setCover($("[data-cover]", li), $("[data-nocover]", li), p.cover, p.visual);
  $("[data-partner]", li).textContent = p.partner && p.partner !== p.title ? p.partner : "";
  const av = $("[data-avatar]", li);
  if (p.partnerLogo) {
    const im = Object.assign(document.createElement("img"), { src: p.partnerLogo, alt: "", className: "size-full bg-white object-contain p-1" });
    av.appendChild(im);
    av.classList.add("bg-white");
  } else {
    av.textContent = initialsOf(p.partner || p.title);
  }
  const open = $("[data-open]", li);
  open.textContent = p.title;
  open.addEventListener("click", () => openDialog(p.id));
  $("[data-stretch]", li).addEventListener("click", () => openDialog(p.id, open));
  $("[data-summary]", li).textContent = p.summary;
  const badges = $("[data-badges]", li);
  badges.appendChild(badge(p.offer, "info"));
  badges.appendChild(badge(p.category.name));
  if (p.audience) badges.appendChild(badge(p.audience, "warning"));
  if (p.full) badges.appendChild(badge("Sold out", "danger"));
  const stock = stockEl(p);
  if (stock) $("[data-stock]", li).appendChild(stock);
  const cnt = $("[data-countdown]", li);
  if (p.endsAt && p.daysLeft != null && p.daysLeft <= 7 && !p.full) {
    cnt.dataset.ends = String(p.endsAt);
    cnt.hidden = false;
    paintCount(cnt);
    startTicker();
  }
  const tag = tagOf(p, hot);
  const tagEl = $("[data-tag]", li);
  tagEl.hidden = !tag;
  if (tag) {
    tagEl.textContent = tag[0];
    tagEl.dataset.tone = tag[1];
  }
  $("[data-coverwrap]", li).dataset.soldout = String(p.full);
  const mateOnCard = p.scope === "unit" && !(mine.claims[p.id] && activeClaims(storage, me.id, p.id).active > 0) ? householdClaims(storage, me.id, p.id)[0] : null;
  if (mateOnCard) badges.appendChild(badge("Claimed by your unit", "success"));
  if (mine.claims[p.id]) {
    const own = activeClaims(storage, me.id, p.id);
    const mineC = mine.claims[p.id];
    const byMe = Array.isArray(mineC.cancelled) && mineC.cancelled.includes(mineC.count);
    badges.appendChild(own.active > 0 ? badge("Claimed by you", "success") : badge(own.locked ? "Closed" : byMe ? "Cancelled" : "Not approved", "warning"));
  }
  $("[data-end]", li).textContent = expText(p);
  $("[data-foot-left]", li).textContent = p.claimed > 0 ? `${p.claimed} ${p.claimed === 1 ? "resident has" : "residents have"} claimed` : ""; // everyone's total, apart from the "Claimed by you / by your unit" badge
  const save = $("[data-save]", li);
  save.hidden = !cfg.save;
  save.dataset.id = p.id;
  paintSave(save, mine.saved.has(p.id), p.title);
  save.addEventListener("click", () => onSave(p));
  return li;
}

function paintSave(btn, on, title) {
  btn.setAttribute("aria-pressed", String(on));
  btn.setAttribute("aria-label", `${on ? "Remove from saved" : "Save"}: ${title}`);
}

function onSave(p) {
  const on = toggleSaved(storage, me.id, p.id);
  if (on === null) return toast("Saving is turned off.");
  toast(on ? "Saved" : "Removed from saved");
  bumpUnseen("saved", on ? 1 : -1);
  render();
  // render() rebuilt the cards; put keyboard focus back on the star that was used (unless the dialog has focus).
  if (!dlg.open) for (const b of document.querySelectorAll("[data-save]")) if (b.dataset.id === p.id) b.focus({ preventScroll: true });
}

/* ------------------------------------------------------------------- details */

const dlg = $("#dlg");
let opener = null;
let dlgShown = false; // the eye on a code that is not usable yet: looking at it, never copying it

function find(id) {
  return listPromotions(storage, { viewer }).find((p) => p.id === id);
}

// `back` is the box the details were opened from ("rewards" or "redeem"): closing the details returns to it instead of leaving the page.
function openDialog(id, from, back) {
  const p = find(id);
  if (!p) return;
  opener = from || document.activeElement; // focus returns here when the details close
  ui.back = back || null;
  ui.openId = id;
  ui.lastId = id;
  dlgShown = false;
  $("#dlg-error").textContent = "";
  refreshDialog();
  if (!dlg.open) dlg.showModal();
  $("#dlg-title").focus({ preventScroll: true });
}

function refreshDialog() {
  const p = find(ui.openId);
  if (!p) {
    closeDialog(true);
    toast("That promotion is no longer available.");
    return;
  }
  const cfg = readConfig(storage);
  const mine = residentState(storage, me.id);
  setCover($("#dlg-cover"), $("#dlg-nocover"), p.cover, p.visual);
  const partner = $("#dlg-partner");
  clear(partner);
  if (p.partnerLogo) {
    const im = Object.assign(document.createElement("img"), { src: p.partnerLogo, alt: "" });
    im.className = "size-6 rounded-md object-cover";
    partner.appendChild(im);
  }
  if (p.partner) partner.appendChild(document.createTextNode(p.partner));
  $("#dlg-title").textContent = p.title;
  const badges = $("#dlg-badges");
  clear(badges);
  badges.appendChild(badge(p.offer, "info"));
  badges.appendChild(badge(p.category.name));
  if (p.audience) badges.appendChild(badge(p.audience, "warning"));
  const stockBox = $("#dlg-stock");
  clear(stockBox);
  const stockLine = stockEl(p);
  if (stockLine) stockBox.appendChild(stockLine);
  $("#dlg-desc").textContent = p.description || p.summary;
  const fine = [endText(p), p.perResident > 1 ? `Up to ${p.perResident} claims per resident.` : "", p.terms && `Terms: ${p.terms}`].filter(Boolean).join(" · ");
  $("#dlg-fine").textContent = fine;

  const claimed = mine.claims[p.id];
  const ownNow = activeClaims(storage, me.id, p.id);
  // a promotion limited per unit: what someone who lives with you claimed is the unit's claim
  const mate = p.scope === "unit" && !(claimed && ownNow.active > 0) ? householdClaims(storage, me.id, p.id)[0] : null;
  const shown = mate ? { code: mate.code } : claimed;
  const box = $("#dlg-claim");
  box.hidden = !(shown && shown.code);
  if (!box.hidden) {
    $("#dlg-claim-label").textContent = mate ? `Already claimed in your unit by ${mate.name}` : p.method === "qr" ? "Show this code at the partner" : "Your code";
    // what the property staff decided about this claim (words, not colour alone)
    const cs = mate ? null : claimStatus(storage, me.id, p.id);
    // The same rule as My rewards. The code of someone else's claim is theirs: the person blocked by the one-per-unit rule is told who got it, not given the code. Your own code is clear
    // (and can be copied) once the property team approved it; while it waits it is masked (MALL***) with an eye, no Copy and a line that says why; a refused or cancelled claim shows none.
    const key = mate ? "" : stateOf(cs);
    const mode = mate ? "none" : key === "verified" || key === "redeemed" ? "clear" : key === "pending" ? "masked" : "none";
    paintCode($("#dlg-code"), $("#dlg-reveal"), shown.code, mode, dlgShown);
    $("#dlg-code").parentElement.hidden = mode === "none";
    $("#dlg-copy").hidden = mode !== "clear";
    $("#dlg-pending").hidden = mode !== "masked";
    const say = {
      pending: "Waiting for the property team to confirm.",
      verified: cs && cs.manual ? `Applied by the property team: ${cs.manual}` : "Confirmed by the property team.",
      redeemed: "Used. Thank you.",
      rejected: cs && /cancelled/i.test(cs.reason || "") ? "You cancelled this claim." : `Not approved by the property team.${cs && cs.reason ? ` ${cs.reason}` : ""}`,
    };
    const line = $("#dlg-claim-status");
    line.textContent = mate ? `One claim per unit: ${mate.name} already claimed this${mate.at ? ` on ${new Date(mate.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}.` : cs ? say[cs.st] : "";
    const askBtn = $("#dlg-ask");
    const ownRow = mate ? null : rewardRows().find((x) => x.id === String(p.id));
    askBtn.textContent = mate ? "Ask the property team about this" : "Ask about this claim";
    askBtn.hidden = !ownRow && !mate;
    askBtn.onclick = () => (mate ? askAboutClaim({ unit: true, id: p.id, title: p.title }) : ownRow && askAboutClaim(ownRow));
    line.dataset.tone = cs && (cs.st === "verified" || cs.st === "redeemed") ? "ok" : cs && cs.st === "rejected" ? "no" : "";
  }
  const btn = $("#dlg-claim-btn");
  // claims Staff rejected do not count: the resident can claim again, unless Staff locked it
  const own = activeClaims(storage, me.id, p.id);
  const done = claimed && own.active >= p.perResident;
  btn.disabled = p.full || own.locked || !!mate || (done && p.method !== "link") || !!ui.holdClaim; // (held for a few seconds after "try again in a moment")
  $("#dlg-claim-text").textContent = p.full
    ? "Sold out"
    : mate
      ? "Claimed by your unit"
      : own.locked
      ? "Closed"
      : p.method === "link"
        ? "Get offer"
        : done
          ? "Claimed by you"
          : own.rejected
            ? "Claim again"
            : p.method === "unique"
              ? "Get my code"
              : "Claim";
  $("#dlg-claim-ext").hidden = p.method !== "link" || p.full;
  const save = $("#dlg-save");
  save.hidden = !cfg.save;
  const on = mine.saved.has(p.id);
  save.setAttribute("aria-pressed", String(on));
  $("#dlg-save-text").textContent = on ? "Saved" : "Save";
}

// The cards are rebuilt after a save or a claim, so the button that opened the details may be gone: find its replacement.
function returnFocus() {
  const target = opener && opener.isConnected ? opener : document.querySelector(`#grid li[data-promo="${ui.lastId}"] [data-open]`);
  if (target) target.focus({ preventScroll: true });
}

function closeDialog(silent) {
  ui.openId = null;
  if (dlg.open) dlg.close();
  if (!silent) returnFocus();
}

$("#dlg-close").addEventListener("click", () => closeDialog());
dlg.addEventListener("click", (e) => {
  if (e.target === dlg) closeDialog();
}); // the backdrop
dlg.addEventListener("close", () => {
  // A "close" event arrives a moment AFTER dlg.close(). If another promotion was opened in the same breath (Saved or My rewards > View, a quick close and open), the window is open
  // again by now and this event is the old one: it must not forget the new promotion (the Claim button then did nothing: the Phase 4 flake) or open a window behind it.
  if (dlg.open) return;
  ui.openId = null;
  const back = ui.back;
  ui.back = null;
  if (back === "rewards") {
    paintRewards();
    rwDlg.showModal();
    $("#rw-title").focus({ preventScroll: true });
  } else if (back === "saved") {
    paintSaved();
    svDlg.showModal();
  } else if (back === "redeem") {
    rdDlg.showModal();
  } else returnFocus();
});

// One press on Claim is handled once: the button is off while it is, and a second press that arrives at once (a double click) is ignored. (claim() ignores it too, so two tabs
// or a stuck key cannot make a second claim of the same press.) The button comes back, in the state the promotion is really in, a moment after.
let claimBusy = false;
let claimHold = 700; // how long the button stays off after a press: longer when the promotion said "try again in a moment"
$("#dlg-claim-btn").addEventListener("click", () => {
  if (inStaffPreview()) {
    toast("In the resident's app this claims the promotion. Nothing is claimed in this preview.");
    return;
  }
  if (claimBusy) return;
  claimBusy = true;
  $("#dlg-claim-btn").disabled = true;
  try {
    const p = find(ui.openId);
    if (!p) {
      // Staff paused, ended or removed it while the details were open: say so, and close them
      closeDialog(true);
      toast("This promotion is no longer available. It was paused or has ended.");
      render();
      return;
    }
    const r = claim(storage, me.id, p); // looks at what is stored now: still running, not paused, a place left
    $("#dlg-error").textContent = r.ok ? "" : r.reason;
    if (!r.ok) {
      // a busy promotion: say it plainly and keep the button off for a few seconds so the resident does not add to the load
      if (r.busy) {
        claimHold = Math.min(Math.max(Number(r.retryMs) || 0, 1500), 5000);
        ui.holdClaim = true; // the button shows it is off, not only ignores the press
      }
      toast(r.reason);
      render(); // the card and the details show what is true now (Sold out, gone)
      return;
    }
    if (p.method === "link" && r.link) window.open(r.link, "_blank", "noopener,noreferrer");
    else toast(r.again ? "You already claimed this" : "Claimed. Your code unlocks after staff approval.");
    if (!r.again) bumpUnseen("rewards", 1);
    render();
  } finally {
    const hold = claimHold;
    claimHold = 700;
    setTimeout(() => {
      claimBusy = false;
      ui.holdClaim = false;
      if (ui.openId) refreshDialog();
    }, hold);
  }
});

$("#dlg-save").addEventListener("click", () => {
  const p = find(ui.openId);
  if (p) onSave(p);
});

$("#dlg-reveal").addEventListener("click", () => {
  dlgShown = !dlgShown;
  refreshDialog();
});

$("#dlg-copy").addEventListener("click", async () => {
  const text = $("#dlg-code").textContent;
  try {
    await navigator.clipboard.writeText(text);
    toast("Code copied");
  } catch {
    toast("Select the code and copy it.");
  }
});

/* ---------------------------------------------------------------- search + live */

// Saved is a panel of its own, like My rewards: the saved promotions with a way to view or remove each.
const svDlg = $("#dlg-saved");
// Pressing a saved promotion's card (the white area, not its Remove or View buttons) takes you to that promotion on the page: the panel closes, the list is shown in full if a search,
// a category or a quick filter was hiding it, and the page scrolls to its card, which is lit for a moment.
let flashId = "";
let flashUntil = 0;
function goToCard(id, from = "saved") {
  svDlg.close();
  if (from === "rewards") {
    rwDlg.close();
    claimDlg.close();
  }
  if (ui.query || ui.category !== "all" || ui.tags.size) {
    ui.query = "";
    $("#search").value = "";
    ui.category = "all";
    ui.tags.clear();
    render();
  }
  const el = $(`#grid [data-promo="${CSS.escape(String(id))}"]`);
  if (!el) {
    openDialog(id, null, from); // not on the page (not in the list right now): its details instead
    return;
  }
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.style.scrollMarginTop = `${topBar.offsetHeight + 16}px`; // clear of the bar that follows
  el.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
  $("[data-open]", el)?.focus({ preventScroll: true });
  // lit for a moment; a card drawn again in that moment (the page is redrawn now and then) is lit too
  flashId = String(id);
  flashUntil = Date.now() + 2200;
  el.setAttribute("data-flash", "");
  setTimeout(() => $(`#grid [data-promo="${CSS.escape(flashId)}"]`)?.removeAttribute("data-flash"), 2200);
}

function paintSaved() {
  const mine = residentState(storage, me.id);
  const rows = listPromotions(storage, { viewer }).filter((p) => mine.saved.has(p.id));
  $("#sv-count").textContent = rows.length ? `${rows.length} in total` : "";
  $("#sv-empty").hidden = rows.length > 0;
  const list = $("#sv-list");
  clear(list);
  for (const p of rows) {
    const li = tpl("t-saved");
    $("[data-title]", li).textContent = p.title;
    $("[data-meta]", li).textContent = [p.partner, p.category && p.category.name].filter(Boolean).join(" · ");
    $("[data-offer]", li).textContent = p.offer || "";
    $("[data-offer]", li).hidden = !p.offer;
    $("[data-end]", li).textContent = expText(p);
    $("[data-unsave]", li).addEventListener("click", () => onSave(p));
    $("[data-view]", li).addEventListener("click", () => {
      svDlg.close();
      openDialog(p.id, null, "saved");
    });
    li.setAttribute("aria-label", `Show ${p.title} on the page`);
    li.addEventListener("click", (e) => {
      if (!e.target.closest("button")) goToCard(p.id);
    });
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target === li) goToCard(p.id);
    });
    list.appendChild(li);
  }
}
$("#btn-saved").addEventListener("click", () => {
  setUnseen("saved", 0);
  paintSaved();
  svDlg.showModal();
  $("#sv-title").focus({ preventScroll: true });
});

// ---- Redeem a code and My rewards ----
const rdDlg = $("#dlg-redeem");
const rwDlg = $("#dlg-rewards");
for (const d of [rdDlg, rwDlg, svDlg]) {
  $("[data-close]", d).addEventListener("click", () => d.close());
  d.addEventListener("click", (e) => {
    if (e.target === d) d.close(); // the backdrop
  });
}
const longDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function redeemOut(title, text, openId) {
  const out = $("#rd-out");
  clear(out);
  const el = tpl("t-redeem-hit");
  $("[data-title]", el).textContent = title;
  $("[data-text]", el).textContent = text;
  const open = $("[data-open]", el);
  open.hidden = !openId;
  open.addEventListener("click", () => {
    rdDlg.close();
    openDialog(openId, null, "redeem");
  });
  out.appendChild(el);
}

function checkCode(raw) {
  const code = String(raw).trim().toUpperCase();
  if (!code) return redeemOut("Type a code first", "Codes are letters and numbers, like VALET20.", null);
  // a code the resident already holds (a unique code from a claim)
  const mine = residentState(storage, me.id);
  const own = Object.entries(mine.claims).find(([, c]) => String(c.code || "").toUpperCase() === code);
  if (own) {
    const rec = allRecords(storage).find((r) => String(r.id) === own[0]);
    const cs = claimStatus(storage, me.id, own[0]);
    const say = { pending: "Waiting for the property team.", verified: "Confirmed by the property team.", redeemed: "Already used.", rejected: "Not approved." };
    return redeemOut("This is your own code", `${rec ? rec.x.title : "A promotion"}. ${cs ? say[cs.st] : ""} It is in My rewards.`, rec ? own[0] : null);
  }
  const r = lookupCode(storage, code, { viewer });
  const t = r.promo ? r.promo.title : "";
  if (r.state === "none") return redeemOut("We could not find that code", "Check the spelling and try again, or ask the partner for the code.", null);
  if (r.state === "ended") return redeemOut(t, "This promotion has ended.", null);
  if (r.state === "soon") return redeemOut(t, "This promotion has not started yet.", null);
  if (r.state === "audience") return redeemOut(t, "This promotion is not open to your unit.", null);
  if (r.state === "full") return redeemOut(t, "Sold out: every offer has been claimed.", r.promo.id);
  return redeemOut(t, "Valid. Open the promotion to claim your offer.", r.promo.id);
}

$("#btn-redeem").addEventListener("click", () => {
  clear($("#rd-out"));
  $("#rd-input").value = "";
  rdDlg.showModal();
  $("#rd-input").focus();
});
$("#rd-form").addEventListener("submit", (e) => {
  e.preventDefault();
  checkCode($("#rd-input").value);
});

// Words for each state of a claim: [label, tone, what it means]
const STATUS = {
  pending: ["Pending", "wait", "Waiting for the property team to confirm."],
  verified: ["Verified", "ok", "Confirmed by the property team."],
  redeemed: ["Redeemed", "ok", "Used. Thank you."],
  rejected: ["Not approved", "no", ""],
  cancelled: ["Cancelled", "no", "You cancelled this claim."],
};
// Two views: the codes that can be used now, and the ones that cannot any more (used, not approved, cancelled, expired). The status word stays on every card.
const TABS = [
  ["active", "Active"],
  ["history", "Used / Expired"],
];
let rwTab = "active";
let rwHistory = false;

// The long explanations live behind an (i), in a short window (the page keeps one short line or none).
const INFO = {
  rewards: ["My rewards", ["The offers you claimed.", "Show the code to the partner.", "The property team marks it used."]],
  history: ["History", ["Everything you did here, newest first, with date and time.", "It includes claims that did not go through and claims you cancelled."]],
  redeem: ["Redeem a code", ["Use a code from a partner, a flyer or an email.", "It is checked here, then you can claim the offer."]],
};
const infoDlg = $("#dlg-info");
function openInfo(key) {
  const [title, lines] = INFO[key] || INFO.rewards;
  $("#info-title").textContent = title;
  const ul = $("#info-lines");
  clear(ul);
  for (const l of lines) {
    const li = document.createElement("li");
    li.textContent = l;
    ul.appendChild(li);
  }
  infoDlg.showModal();
  $("#info-title").focus({ preventScroll: true });
}
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("[data-info]");
  if (!b) return;
  openInfo(b.dataset.info === "rewards" && rwHistory ? "history" : b.dataset.info);
});
// Focus stays inside an open box. This page lives in a frame, so without this Tab leaves the box for the portal's header behind it (and Escape then no longer closes it).
document.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const open = [...document.querySelectorAll("dialog[open]")];
  if (!open.length) return;
  const inside = document.activeElement && document.activeElement.closest ? document.activeElement.closest("dialog[open]") : null;
  const box = inside || open[open.length - 1];
  const items = [...box.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && el.getClientRects().length > 0);
  if (!items.length) {
    e.preventDefault();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const at = document.activeElement;
  if (e.shiftKey && (at === first || at === box || !inside)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (at === last || !inside)) {
    e.preventDefault();
    first.focus();
  }
});
infoDlg.addEventListener("click", (e) => {
  if (e.target === infoDlg || e.target.closest("[data-close]")) infoDlg.close();
});
// date and time with the year: the history is a record
const whenFull = (iso) => (iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Time not recorded");
const when = (iso) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
// "Waiting 6 h" / "Waiting 3 days": how long the claim has been waiting for the property team (only what is true; no promised time)
const waitingText = (iso) => {
  const m = Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(m)) return "In progress";
  return m < 1 ? "Waiting, just now" : m < 60 ? `Waiting ${Math.round(m)} min` : m < 2880 ? `Waiting ${Math.round(m / 60)} h` : `Waiting ${Math.round(m / 1440)} days`;
};
const ago = (iso) => {
  const m = Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${Math.round(m)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : when(iso);
};
// the state a claim is in, as a tab key: pending, verified, redeemed, cancelled (the resident's own or Staff's rejection)
function stateOf(cs) {
  if (!cs) return "pending";
  return cs.st === "rejected" ? (cs.cancelled ? "cancelled" : "rejected") : cs.st;
}

function rewardRows() {
  const mine = residentState(storage, me.id);
  const now = new Date();
  return Object.keys(mine.claims)
    .filter((id) => mine.claims[id] && mine.claims[id].code)
    .map((id) => {
      const cs = claimStatus(storage, me.id, id);
      const key = stateOf(cs);
      const info = rewardInfo(storage, id, now); // read from the real records: does the promotion still run, when does it end, what are its terms
      return { id, code: mine.claims[id].code, at: mine.claims[id].at, key, cs, info, ...rewardGroup(key, info) };
    })
    .sort((x, y) => String(y.at || "").localeCompare(String(x.at || "")));
}
// "Expires Dec 6, 2026, 11:59 PM", "Expired Nov 20, 2026", "No end date"
const rewardEndText = (info) => {
  if (!info || info.endsAt === null) return "No end date";
  const d = new Date(info.endsAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  return info.live === "running" ? `Expires ${d}` : info.live === "closed" ? "Ended by the property team" : `Expired ${d}`;
};

function paintHistory() {
  const events = historyFor(storage, me.id, (id) => {
    const r = allRecords(storage).find((x) => String(x.id) === String(id));
    return r ? r.x.title : "";
  });
  const list = $("#rw-history-list");
  clear(list);
  $("#rw-history-empty").hidden = events.length > 0;
  for (const e of events) {
    const li = tpl("t-hist");
    $("[data-title]", li).textContent = e.title;
    const lab = $("[data-label]", li);
    lab.textContent = e.label;
    lab.dataset.tone = e.tone;
    const t = $("[data-when]", li);
    t.textContent = whenFull(e.at);
    if (e.at) t.dateTime = e.at;
    $("[data-text]", li).textContent = e.note;
    list.appendChild(li);
  }
}

// True when this page is Staff's preview inside Staff's portal and not the resident's own app.
function inStaffPreview() {
  try {
    return !window.parent.location.pathname.startsWith("/resident/");
  } catch {
    return true; // a parent we cannot read is not the resident's app
  }
}

// "Ask about this claim": Messages opens on a chat with the property team that says which claim it is about. Staff's own preview of this page sits inside Staff's portal:
// it must not take Staff away to the resident's Messages, so it only says what the button does.
function askAboutClaim(row) {
  if (inStaffPreview()) {
    toast("In the resident's app this opens Messages with this claim attached.");
    return;
  }
  const rec = allRecords(storage).find((x) => String(x.id) === String(row.id));
  // a promotion the unit already claimed (this resident is blocked by the one-per-unit rule): the question carries the promotion, not the other person's code or claim
  if (row.unit) {
    try {
      storage.setItem("eso-ask-claim", JSON.stringify({ rid: me.id, promoId: row.id, claimId: "", title: row.title, code: "", at: "", status: "Claimed by your unit", unit: true }));
    } catch {}
    openMessages();
    return;
  }
  try {
    const n = Number(residentState(storage, me.id).claims[row.id]?.count) || 1;
    // the id Staff see in their Claims inbox: the same claim is found by it on both sides
    const claimId = `r_${me.id}|${row.id}|${n}`.replace(/[^a-zA-Z0-9]/g, "_");
    storage.setItem("eso-ask-claim", JSON.stringify({ rid: me.id, promoId: row.id, claimId, title: rec ? rec.x.title : "Promotion", code: row.code, at: row.at, status: STATUS[row.key][0] }));
  } catch {}
  openMessages();
}

function openMessages() {
  const q = new URLSearchParams(location.search);
  q.delete("embed");
  q.set("ask", "1");
  window.top.location.assign(`/resident/messages.html?${q}`);
}

// A code on a card or in the claim window. mode: "clear" (usable: shown as it is), "masked" (not usable yet: SHJS**** with an eye that shows it, never a Copy) or "none".
function paintCode(codeEl, revealBtn, code, mode, shown) {
  const masked = mode === "masked" && !shown;
  codeEl.textContent = mode === "none" ? "" : masked ? maskCode(code) : code;
  codeEl.dataset.masked = String(masked);
  revealBtn.hidden = mode !== "masked";
  revealBtn.setAttribute("aria-pressed", String(!!shown));
  const label = shown ? "Hide code" : "Show code";
  revealBtn.setAttribute("aria-label", label);
  revealBtn.title = label;
  revealBtn.querySelector("use").setAttribute("href", shown ? "#i-eye-off" : "#i-eye");
}
function bindCode(codeEl, revealBtn, code, mode) {
  let shown = false;
  paintCode(codeEl, revealBtn, code, mode, shown);
  revealBtn.addEventListener("click", () => {
    shown = !shown;
    paintCode(codeEl, revealBtn, code, mode, shown);
  });
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Code copied");
  } catch {
    toast("Could not copy. Select the code and copy it.");
  }
}
function cancelReward(r) {
  if (inStaffPreview()) {
    toast("In the resident's app this cancels the claim. Nothing is cancelled in this preview.");
    return;
  }
  const res = cancelClaim(storage, me.id, r.id);
  if (res.ok) bumpUnseen("rewards", -1);
  toast(res.ok ? "Claim cancelled" : res.reason);
  paintRewards();
  render();
  if (claimDlg.open) claimDlg.close();
}

// The steps of one claim: Claim submitted, Awaiting staff approval, what the property team decided. Opened by View on a card.
const claimDlg = $("#dlg-steps");
let claimId = "";
let claimShown = false;
function openClaim(id) {
  claimId = id;
  claimShown = false;
  paintClaim();
  if (!claimDlg.open) claimDlg.showModal();
  $("#cl-title").focus({ preventScroll: true });
}
function paintClaim() {
  const r = rewardRows().find((x) => x.id === claimId);
  if (!r) {
    claimDlg.close();
    return;
  }
  $("#cl-title").textContent = r.info.title || "Promotion";
  $("#cl-expiry").textContent = rewardEndText(r.info);
  const steps = $("#cl-steps");
  clear(steps);
  for (const st of claimSteps(r.key, claimTimeline(storage, me.id, r.id))) {
    const li = tpl("t-step");
    $("[data-dot]", li).dataset.state = st.state;
    const label = $("[data-label]", li);
    label.textContent = st.label;
    label.dataset.state = st.state;
    $("[data-when]", li).textContent = st.at ? when(st.at) : st.state === "current" ? waitingText(r.at) : "";
    $("[data-text]", li).textContent = st.note;
    if (st.state === "current") li.setAttribute("aria-current", "step");
    steps.appendChild(li);
  }
  const approved = r.key === "verified" || r.key === "redeemed";
  const waiting = r.key === "pending" && r.group === "active";
  $("#cl-ticket").hidden = !(approved || waiting);
  $("#cl-pending").hidden = !waiting;
  $("#cl-copy").hidden = !(approved && r.group === "active");
  paintCode($("#cl-code"), $("#cl-reveal"), r.code, approved ? "clear" : waiting ? "masked" : "none", claimShown);
  $("#cl-terms").hidden = !r.info.terms;
  $("#cl-terms-text").textContent = r.info.terms;
  $("#cl-cancel").hidden = !waiting;
  $("#cl-go").hidden = !find(r.id);
}
$("#cl-reveal").addEventListener("click", () => {
  claimShown = !claimShown;
  paintClaim();
});
$("#cl-copy").addEventListener("click", () => {
  const r = rewardRows().find((x) => x.id === claimId);
  if (r) copyText(r.code);
});
$("#cl-cancel").addEventListener("click", () => {
  const r = rewardRows().find((x) => x.id === claimId);
  if (r) cancelReward(r);
});
$("#cl-ask").addEventListener("click", () => {
  const r = rewardRows().find((x) => x.id === claimId);
  if (r) askAboutClaim(r);
});
$("#cl-go").addEventListener("click", () => goToCard(claimId, "rewards"));
claimDlg.addEventListener("click", (e) => {
  if (e.target === claimDlg || e.target.closest("[data-close]")) claimDlg.close();
});
// what Staff decide, or another tab does, shows in the windows that are open
function repaintOpenWindows() {
  if (rwDlg.open) paintRewards();
  if (claimDlg.open) paintClaim();
}

function paintRewards() {
  $("#rw-history-btn").setAttribute("aria-pressed", String(rwHistory));
  $("#rw-history-label").textContent = rwHistory ? "My rewards" : "History";
  $("#rw-title").textContent = rwHistory ? "History" : "My rewards";
  $("#rw-count").textContent = rwHistory || !rewardRows().length ? "" : `${rewardRows().length} in total`;
  $("#rw-history").hidden = !rwHistory;
  $("#rw-tabs").hidden = rwHistory;
  $("#rw-list").hidden = rwHistory;
  if (rwHistory) {
    $("#rw-empty").hidden = true;
    $("#rw-unit").hidden = true;
    paintHistory();
    return;
  }
  const rows = rewardRows();
  const count = (k) => rows.filter((r) => r.group === k).length;
  const tabs = $("#rw-tabs");
  clear(tabs);
  for (const [k, label] of TABS) {
    const b = tpl("t-filter");
    $("[data-label]", b).textContent = label;
    $("[data-count]", b).textContent = String(count(k));
    b.setAttribute("aria-pressed", String(rwTab === k));
    b.addEventListener("click", () => {
      rwTab = k;
      paintRewards();
    });
    tabs.appendChild(b);
  }
  const list = $("#rw-list");
  clear(list);
  const shown = rows.filter((r) => r.group === rwTab);
  const empty = $("#rw-empty");
  empty.hidden = shown.length > 0;
  empty.textContent = !rows.length
    ? "Nothing claimed yet. Claim an offer and its code shows up here."
    : rwTab === "active"
      ? "No active codes right now. Used and expired ones are under Used / Expired."
      : "Nothing used or expired yet.";
  for (const r of shown) {
    const rec = allRecords(storage).find((x) => String(x.id) === r.id);
    const st = STATUS[r.key];
    const li = tpl("t-reward");
    $("[data-title]", li).textContent = rec ? rec.x.title : "Promotion";
    const badge = $("[data-status]", li);
    // the word says where the reward stands: Pending, Verified, Used, Not approved, Cancelled, Expired
    badge.textContent = r.label;
    badge.dataset.tone = r.label === "Expired" ? "no" : st[1];
    // when it ends (from Staff's published record; nothing is shown that Staff did not write) and when it was claimed
    $("[data-expiry]", li).textContent = rewardEndText(r.info);
    const activeN = activeClaims(storage, me.id, r.id).active;
    $("[data-note]", li).textContent = `${activeN > 1 ? `${activeN} claims, latest ` : "Claimed "}${ago(r.at)}${r.key === "rejected" && r.cs && r.cs.reason ? `. ${r.cs.reason}` : ""}`;
    // The code is clear, and can be copied, only once the property team approved the claim (Verified, or Used). A Pending claim has no code to use yet: its code is masked (SHJS****) with an eye
    // to look at it, no Copy, and a line that says why. A past reward (used, or expired after it was approved) keeps its code small and quiet; one that was never approved, was refused
    // or cancelled shows no code at all.
    const approved = r.key === "verified" || r.key === "redeemed";
    const waiting = r.key === "pending" && r.group === "active";
    $("[data-ticket]", li).hidden = !(approved || waiting);
    $("[data-pending]", li).hidden = !waiting;
    $("[data-code]", li).dataset.past = String(r.group === "history");
    $("[data-copy]", li).hidden = !(approved && r.group === "active");
    bindCode($("[data-code]", li), $("[data-reveal]", li), r.code, approved ? "clear" : waiting ? "masked" : "none");
    $("[data-copy]", li).addEventListener("click", () => copyText(r.code));
    const cancel = $("[data-cancel]", li);
    cancel.hidden = !waiting; // an expired claim has nothing left to cancel
    cancel.addEventListener("click", () => cancelReward(r));
    // the whole card leads back to the promotion it came from (if it still runs); View opens the steps of this claim
    const rec2 = allRecords(storage).find((x) => String(x.id) === r.id);
    const canGo = !!(rec2 && find(r.id));
    li.dataset.go = String(canGo);
    if (canGo) {
      li.tabIndex = 0;
      li.title = "Go to this promotion";
      li.addEventListener("click", (e) => {
        if (!e.target.closest("button, a, output, input, summary")) goToCard(r.id, "rewards");
      });
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target === li) goToCard(r.id, "rewards");
      });
    }
    // View shows the promotion itself, with its code as far as it is usable (the steps when the promotion is not on the page any more); the status word (Pending, Verified...) shows the steps of the claim
    $("[data-view]", li).addEventListener("click", () => {
      if (!canGo) openClaim(r.id);
      else {
        rwDlg.close();
        openDialog(r.id, null, "rewards");
      }
    });
    badge.setAttribute("aria-label", `${r.label}. See the steps of this claim`);
    badge.addEventListener("click", () => openClaim(r.id));
    list.appendChild(li);
  }
  // what the people of this unit claimed (only for a promotion limited per unit): shared with the whole unit
  const ul = $("#rw-unit-list");
  clear(ul);
  const unitRows = [];
  for (const m of unitMates(me.id)) {
    const theirs = residentState(storage, m.id).claims;
    for (const id of Object.keys(theirs)) {
      const rec = allRecords(storage).find((x) => String(x.id) === id);
      if (!rec || rec.x.limS !== "unit" || activeClaims(storage, m.id, id).active < 1) continue;
      unitRows.push({ id, title: rec.x.title, name: m.name, code: theirs[id].code, at: theirs[id].at, cs: claimStatus(storage, m.id, id) });
    }
  }
  $("#rw-unit").hidden = unitRows.length === 0;
  for (const u of unitRows) {
    const li = tpl("t-reward");
    $("[data-title]", li).textContent = u.title;
    const badge = $("[data-status]", li);
    const st = STATUS[stateOf(u.cs)];
    badge.textContent = st[0];
    badge.dataset.tone = st[1];
    badge.disabled = true; // a unit mate's claim has no steps to show here
    $("[data-note]", li).textContent = `${u.name} · ${when(u.at)}`;
    $("[data-ticket]", li).hidden = true; // a unit mate's code stays theirs
    $("[data-pending]", li).hidden = true;
    $("[data-expiry]", li).hidden = true;
    $("[data-cancel]", li).hidden = true;
    const view = $("[data-view]", li);
    view.hidden = !find(u.id);
    view.setAttribute("aria-label", "View this promotion");
    view.addEventListener("click", () => {
      rwDlg.close();
      openDialog(u.id, null, "rewards");
    });
    ul.appendChild(li);
  }
  paintUnseen();
}
$("#rw-history-btn").addEventListener("click", () => {
  rwHistory = !rwHistory;
  paintRewards();
  $("#rw-title").focus({ preventScroll: true });
});
$("#btn-rewards").addEventListener("click", () => {
  setUnseen("rewards", 0);
  rwTab = "active";
  rwHistory = false;
  paintRewards();
  rwDlg.showModal();
  $("#rw-title").focus({ preventScroll: true });
});

$("#btn-filter").addEventListener("click", () => {
  ui.panel = !ui.panel;
  render();
});
$("#sort").addEventListener("change", (e) => {
  ui.sort = e.target.value;
  render();
});
$("#filter-clear").addEventListener("click", () => {
  ui.tags.clear();
  ui.sort = "rec";
  render();
});
let timer = 0;
$("#search").addEventListener("input", (e) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const first = !ui.query && !!e.target.value;
    ui.query = e.target.value;
    render();
    // the first letters typed bring the results into view (they sit below the designed page)
    if (first) scrollToCatalog();
  }, 120);
});

// A promotion published, edited or switched off in the Staff tab arrives here.
addEventListener("storage", (e) => {
  queueMicrotask(repaintOpenWindows); // after the page is drawn again: a claim Staff decided changes the open card or steps
  // the badges of Saved and My rewards follow what another tab (or Staff's Resident view of this person) did
  if (e.key === UNSEEN.saved || e.key === UNSEEN.rewards) {
    paintUnseen();
    return;
  }
  // (STATUS_KEY: what Staff turned on or off on a sample deal)
  if (e.key === KEY.claimState) {
    render();
    return;
  } // Staff decided a claim: the open details say so
  if (
    !e.key ||
    e.key === KEY.published ||
    e.key === PAGE_KEY ||
    e.key === KEY.cats ||
    e.key === KEY.settings ||
    e.key === KEY.mine(me.id) ||
    e.key.startsWith("eso-res-promo:") || // another resident's claim (or this resident in another tab) changes how many places are left
    e.key === globalThis.PM_CATALOG.STATUS_KEY ||
    e.key === globalThis.PM_CATALOG.EDITS_KEY ||
    e.key === globalThis.PM_CATALOG.ENDS_KEY // Staff moved a deal's end
  )
    render();
});
// Promotions start and end by date: look again when the tab comes back, and when the day turns while the page stays open.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});
function renderAtMidnight() {
  const n = new Date();
  const next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 5);
  // a timer longer than ~24 days overflows, and one day never does
  setTimeout(() => {
    render();
    renderAtMidnight();
  }, next - n);
}
renderAtMidnight();

render();
