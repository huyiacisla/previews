// Behaviours of the Staff header and sidebar that the captured frame does not carry, added to the Client pages.
//
// The Staff design (account-settings prototype) filters its menu while you type, shows a live local time, opens a
// notifications panel, searches pages from the header with Cmd/Ctrl+K or "/", and opens the help page. The frame copied by
// portal-frame.js is a static snapshot, so none of that worked on the Client pages.
//
// This module only ADDS behaviour. It never changes what the frame says or looks like: every number and name below comes
// from the Client dashboard itself (16 unread on Communication, Parking Spots 261 / 25 and Staff 18 / 3 over limit,
// 109 need attention, the menu). Panels draw with the page's own tokens, so light and dark follow the theme.

import { buildAll, readMap, setRead, isRead, counts, latestUnread, badgeText } from "./notifications/store.js";

// Links keep the address's query (?as=… picks the person, ?dark the theme), so a click never changes who is using the preview.
// The frame is the same for every portal; only these few facts differ (which pages exist, where help and notification settings live).
const CFG = { portal: "client", support: "", notifSettings: "", notifPage: "", dest: {}, pages: [] };
const withQuery = (href) => { if (!href.startsWith(`/${CFG.portal}/`)) return href; const [path, hash = ""] = href.split("#"); return `${path}${location.search}${hash ? "#" + hash : ""}`; };
const PORTAL_FACTS = {
  client: { help: "/client/support.html", notifSettings: "/client/settings/notifications.html", dest: { messages: "/client/messages.html", plan: "/client/workspace.html", dashboard: "/client/dashboard.html", support: "/client/support.html" } },
  staff: { help: "/staff/support.html", notifSettings: "/staff/settings/notifications.html", dest: { messages: "/staff/messages.html", tickets: "/staff/tickets.html" } },
  resident: { help: "/resident/tickets.html", notifSettings: "/resident/settings/notifications.html", dest: { messages: "/resident/messages.html", tickets: "/resident/tickets.html", promotions: "/resident/promotions.html", social: "/resident/social.html" } },
};
const FALLBACK_ID = { client: "cli-1", staff: "stf-1", resident: "res-1" };
const NOT_YET = "That page is not part of this preview yet.";

/** Set the portal's facts and read its pages from the sidebar it actually has (so search lists the portal's own menu). */
function configure(portal, sc) {
  const f = PORTAL_FACTS[portal] || PORTAL_FACTS.client;
  CFG.portal = portal;
  CFG.support = withQuery(f.help);
  CFG.notifSettings = withQuery(f.notifSettings);
  CFG.notifPage = withQuery(`/${portal}/notifications.html`);
  CFG.dest = Object.fromEntries(Object.entries(f.dest).map(([k, v]) => [k, withQuery(v)]));
  const pages = [];
  for (const a of sc.querySelectorAll("nav a[data-slot='sidebar-menu-button']")) {
    const label = a.querySelector("span.truncate")?.textContent.trim();
    if (!label) continue;
    const group = a.closest("[data-slot='collapsible']")?.querySelector(":scope > [data-slot='collapsible-trigger'] > span")?.textContent.trim() || "Home";
    pages.push({ label, href: a.getAttribute("href") || "#", group });
  }
  pages.push({ label: "Notifications", href: CFG.notifPage, group: "Communication" });
  if (!pages.some((p) => p.label === "Support")) pages.push({ label: "Support", href: CFG.support, group: "Help" });
  CFG.pages = pages;
}

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private window: the choice lasts until reload */ } },
};

function css(node, styles) { Object.assign(node.style, styles); return node; }
function make(tag, styles, text) { const n = document.createElement(tag); if (styles) css(n, styles); if (text != null) n.textContent = text; return n; }

// A short message that screen readers announce too. One at a time.
let sayTimer;
export function say(text) {
  let box = document.getElementById("frame-say");
  if (!box) {
    box = make("div", { position: "fixed", left: "50%", bottom: "1.5rem", transform: "translateX(-50%)", zIndex: "80", maxWidth: "calc(100vw - 2rem)", padding: "0.625rem 1rem", borderRadius: "0.75rem", background: "var(--foreground)", color: "var(--background)", fontSize: "0.875rem", boxShadow: "0 12px 32px rgb(0 0 0 / 0.2)" });
    box.id = "frame-say";
    box.setAttribute("role", "status");
    document.body.append(box);
  }
  box.textContent = text;
  box.hidden = false;
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => { box.hidden = true; }, 2600);
}

// ---- One floating panel at a time (notifications, search results) ----
let openPanel = null;
function closePanel(restoreFocus = true) {
  if (!openPanel) return;
  const { node, anchor, onClose } = openPanel;
  openPanel = null;
  node.remove();
  anchor?.setAttribute("aria-expanded", "false");
  onClose?.();
  if (restoreFocus) anchor?.focus?.();
}
function place(node, anchor, align) {
  const r = anchor.getBoundingClientRect();
  const w = Math.min(node.offsetWidth || 352, innerWidth - 24);
  const left = align === "start" ? r.left : r.right - w;
  node.style.left = `${Math.max(12, Math.min(left, innerWidth - w - 12))}px`;
  node.style.top = `${Math.round(r.bottom + 8)}px`;
}
function panel(anchor, { label, width = "22rem", align = "end", onClose }) {
  closePanel(false);
  const node = make("div", { position: "fixed", zIndex: "70", width: `min(${width}, calc(100vw - 1.5rem))`, maxHeight: "min(70vh, 32rem)", overflowY: "auto", background: "var(--popover)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: "0.75rem", boxShadow: "0 12px 32px rgb(0 0 0 / 0.18)", fontSize: "0.875rem" });
  node.setAttribute("aria-label", label);
  node.setAttribute("role", "dialog");
  document.body.append(node);
  openPanel = { node, anchor, onClose, align };
  anchor.setAttribute("aria-expanded", "true");
  return node;
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && openPanel && e.target !== openPanel.anchor) closePanel(); });
document.addEventListener("pointerdown", (e) => { if (openPanel && !openPanel.node.contains(e.target) && !openPanel.anchor?.contains(e.target) && e.target !== openPanel.anchor) closePanel(false); }, true);
addEventListener("resize", () => { if (openPanel) place(openPanel.node, openPanel.anchor, openPanel.align); });

function row(tag, title, detail, href) {
  const r = make(tag, { display: "block", minHeight: "2.75rem", padding: "0.625rem 0.75rem", borderRadius: "0.5rem", color: "inherit", textDecoration: "none", cursor: "pointer" });
  r.setAttribute("data-frame-row", "");
  r.append(make("span", { display: "block", fontWeight: "500" }, title));
  if (detail) r.append(make("span", { display: "block", fontSize: "0.75rem", color: "var(--muted-foreground)" }, detail));
  if (href) r.setAttribute("href", href);
  return r;
}

// ---- Sidebar: Filter menu ----
function wireFilter(sc) {
  const input = sc.querySelector('input[aria-label="Filter menu"]');
  const nav = sc.querySelector("nav");
  if (!input || !nav) return;
  const none = make("p", { padding: "0.75rem", fontSize: "0.875rem" }, "No menu items match.");
  none.className = "text-white";
  none.hidden = true;
  none.setAttribute("role", "status");
  nav.after(none);
  const wasHidden = new WeakMap();
  const run = () => {
    const q = input.value.trim().toLowerCase();
    let total = 0;
    for (const g of nav.querySelectorAll('[data-sidebar="group"]')) {
      let n = 0;
      for (const li of g.querySelectorAll('li[data-slot="sidebar-menu-item"]')) {
        const ok = !q || li.textContent.toLowerCase().includes(q);
        li.hidden = !ok;
        if (ok) n += 1;
      }
      g.hidden = Boolean(q) && n === 0;
      total += n;
      // While filtering, groups open so matches are visible; closed groups close again when the filter is cleared.
      const body = g.querySelector('[data-slot="collapsible-content"]');
      if (!body) continue;
      if (q) { if (!wasHidden.has(body)) wasHidden.set(body, body.hidden); body.hidden = false; }
      else if (wasHidden.has(body)) { body.hidden = wasHidden.get(body); wasHidden.delete(body); }
    }
    none.hidden = !(q && total === 0);
  };
  input.addEventListener("input", run);
  input.addEventListener("keydown", (e) => { if (e.key === "Escape" && input.value) { input.value = ""; run(); e.stopPropagation(); } });
}

// ---- Sidebar: favorites (pin a page with its star; pinned pages also list under "Favorites") ----
function wireFavorites(sc) {
  const nav = sc.querySelector("nav");
  const template = nav?.querySelector('[data-slot="collapsible"][data-sidebar="group"]');
  if (!nav || !template) return;
  const labelOf = (li) => li.querySelector("a span.truncate")?.textContent.trim() || "";
  const read = () => { try { const v = JSON.parse(store.get(`${CFG.portal}:sb-pins`) || "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; } };
  let pins = read();
  const enabled = () => { try { return JSON.parse(store.get(`ui-prefs:${CFG.portal}`) || "null")?.favorites !== false; } catch { return true; } };
  const star = (on) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>`;
  const decorate = (li) => {
    const label = labelOf(li);
    li.querySelector(".eso-pin")?.remove();
    if (!label) return;
    const on = pins.includes(label);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "eso-pin";
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", on ? `Unpin ${label} from favorites` : `Pin ${label} to favorites`);
    b.innerHTML = star(on);
    b.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      pins = on ? pins.filter((x) => x !== label) : [...pins, label];
      store.set(`${CFG.portal}:sb-pins`, JSON.stringify(pins));
      render();
      say(on ? `${label} removed from favorites.` : `${label} added to favorites.`);
    });
    li.append(b);
  };
  const render = () => {
    nav.querySelector("[data-eso-favs]")?.remove();
    const originals = [...nav.querySelectorAll('li[data-slot="sidebar-menu-item"]')];
    for (const li of originals) decorate(li);
    const chosen = pins.map((p) => originals.find((li) => labelOf(li) === p)).filter(Boolean);
    if (!chosen.length || !enabled()) return;
    const g = template.cloneNode(true);
    g.setAttribute("data-eso-favs", "");
    g.querySelector('[data-slot="collapsible-trigger"] > span').textContent = "Favorites";
    const count = g.querySelector(".tabular-nums");
    if (count) count.textContent = String(chosen.length);
    g.querySelector('[data-slot="badge"]')?.remove();
    const trigger = g.querySelector('[data-slot="collapsible-trigger"]');
    trigger.setAttribute("aria-expanded", "true");
    g.toggleAttribute("data-open", true);
    const body = g.querySelector('[data-slot="collapsible-content"]');
    body.toggleAttribute("data-open", true);
    body.hidden = false;
    const ul = g.querySelector('ul[data-slot="sidebar-menu"]');
    ul.replaceChildren(...chosen.map((li) => { const c = li.cloneNode(true); c.hidden = false; c.querySelector("a")?.removeAttribute("aria-current"); decorate(c); return c; }));
    const top = nav.querySelector('[data-slot="sidebar-group"]');
    top.after(g);
  };
  render();
  addEventListener("message", (e) => { if (e.origin === location.origin && e.data && e.data.type === "eso-ui-prefs") render(); });
  // Items added after this ran (the Ticket box link is added a moment later) get their star too. The changes render() itself makes are discarded.
  let later;
  const watch = new MutationObserver(() => { clearTimeout(later); later = setTimeout(() => { render(); watch.takeRecords(); }, 60); });
  watch.observe(nav, { childList: true, subtree: true });
  watch.takeRecords();
}

// ---- Sidebar: Local time (Show / Hide, live, remembered) ----
function wireClock(sc) {
  const sec = sc.querySelector('section[aria-label="Local time"]');
  const btn = sec?.querySelector('[data-slot="collapsible-trigger"]');
  if (!sec || !btn) return;
  const time = make("p", { fontSize: "1.125rem", fontWeight: "500", fontVariantNumeric: "tabular-nums" });
  const date = make("p", { fontSize: "0.75rem", opacity: "0.7" });
  const body = make("div", { padding: "0.25rem 0 0" });
  body.className = "text-white";
  body.append(time, date);
  sec.append(body);
  const zone = () => new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value || "";
  const draw = () => {
    const d = new Date();
    time.textContent = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    date.textContent = `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${zone()}`;
  };
  let timer;
  const set = (open, remember = true) => {
    btn.setAttribute("aria-expanded", String(open));
    sec.toggleAttribute("data-open", open);
    sec.toggleAttribute("data-closed", !open);
    body.hidden = !open;
    clearInterval(timer);
    if (open) { draw(); timer = setInterval(draw, 15000); }
    if (remember) store.set(`${CFG.portal}:sb-clock`, open ? "1" : "0");
  };
  btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
  // Until the person has used the button here, the clock starts as chosen in Settings > Personalize > Sidebar.
  const own = store.get(`${CFG.portal}:sb-clock`);
  let chosen = false;
  try { chosen = JSON.parse(store.get(`ui-prefs:${CFG.portal}`) || "null")?.clock === true; } catch { /* default: hidden */ }
  set(own === null ? chosen : own === "1", false);
}

// ---- Header: notifications panel ----
function wireBell(header, me) {
  const bell = header.querySelector('button[aria-label^="Open notifications"]');
  if (!bell) return;
  bell.setAttribute("aria-haspopup", "dialog");
  bell.setAttribute("aria-expanded", "false");
  const personId = me?.id || FALLBACK_ID[CFG.portal];
  const list = () => buildAll(Date.now(), CFG.portal);
  const state = () => readMap(localStorage, personId);
  const unread = () => counts(list(), state()).unread;
  // The count on the bell is the real count of unread notifications (the Notifications page changes it).
  const syncBadge = () => {
    const n = unread();
    bell.setAttribute("aria-label", n > 0 ? `Open notifications. ${n} need attention.` : "Open notifications. You are all caught up.");
    const badge = bell.querySelector('[data-slot="badge"]');
    if (badge) { badge.textContent = badgeText(n); badge.hidden = n <= 0; }
  };
  const DEST = CFG.dest;
  const PAGE = CFG.notifPage;
  const draw = (p) => {
    p.replaceChildren();
    p.className = "eso-np";
    const all = list();
    const map = state();
    const n = counts(all, map).unread;
    const head = document.createElement("div");
    head.className = "eso-np-head";
    const title = document.createElement("div");
    title.innerHTML = "<h2></h2><p></p>";
    title.querySelector("h2").textContent = "Notifications";
    title.querySelector("p").textContent = n > 0 ? `${n} need attention` : "You are all caught up";
    const viewAll = document.createElement("a");
    viewAll.className = "eso-np-link";
    viewAll.href = PAGE;
    viewAll.textContent = "View all";
    head.append(title, viewAll);
    const rows = document.createElement("div");
    const latest = latestUnread(all, map, 4);
    for (const r of latest) {
      // A notification with a page of its own opens it; the others open the Notifications page. Either way it is read.
      const a = document.createElement("a");
      a.className = "eso-np-row";
      a.href = (r.dest && DEST[r.dest]) || PAGE;
      a.innerHTML = `<span class="eso-pm-pi">${ICON[PANEL_ICON[r.cat]]}</span><span class="eso-np-tx"><b></b><small></small></span>`;
      a.querySelector("b").textContent = r.title;
      a.querySelector("small").textContent = r.detail;
      a.addEventListener("click", () => { setRead(localStorage, personId, [r.id], true); emitNotif(); });
      rows.append(a);
    }
    if (!latest.length) {
      const empty = document.createElement("p");
      empty.className = "eso-np-note";
      empty.textContent = "Nothing needs your attention right now.";
      rows.append(empty);
    }
    const foot = document.createElement("div");
    foot.className = "eso-np-foot";
    const settings = document.createElement("a");
    settings.className = "eso-np-row";
    settings.href = CFG.notifSettings;
    settings.innerHTML = `<span class="eso-pm-pi">${ICON.bell}</span><span class="eso-np-tx"><b></b></span>`;
    settings.querySelector("b").textContent = "Notification settings";
    foot.append(settings);
    p.append(head, rows, foot);
  };
  bell.addEventListener("click", () => {
    if (openPanel?.anchor === bell) { closePanel(); return; }
    const p = panel(bell, { label: "Notifications" });
    draw(p);
    place(p, bell, "end");
    p.querySelector(".eso-np-row")?.focus();
  });
  // whenever what is read changes (here, on the Notifications page, or in another tab): the number, and the panel if it is open
  onNotif(() => { syncBadge(); if (openPanel?.anchor === bell) draw(openPanel.node); });
  syncBadge();
}

// ---- Communication group in the sidebar: its badge is the number of unread messages in Notifications ----
function wireNavBadge(sc, me) {
  const trigger = [...sc.querySelectorAll('[data-slot="collapsible-trigger"]')].find((t) => /^Communication/.test(t.textContent.trim()));
  const badge = trigger?.querySelector('[data-slot="badge"]');
  if (!badge) return;
  const sync = () => {
    const map = readMap(localStorage, me?.id || FALLBACK_ID[CFG.portal]);
    const n = buildAll(Date.now(), CFG.portal).filter((x) => x.cat === "messages" && !isRead(x, map)).length;
    badge.textContent = String(n);
    badge.hidden = n === 0;
    badge.setAttribute("aria-label", `${n} unread`);
  };
  onNotif(sync);
  sync();
}

// One place that hears about "read" changes, so the bell and the sidebar always agree.
const notifSubs = [];
const onNotif = (fn) => notifSubs.push(fn);
const emitNotif = () => notifSubs.forEach((fn) => { try { fn(); } catch { /* one listener failing must not stop the others */ } });
let notifListening = false;
function listenForNotifChanges() {
  if (notifListening) return;
  notifListening = true;
  // The Notifications page is another document of this window (or another tab): the browser tells us when it writes.
  addEventListener("storage", (e) => { if (e.key && e.key.startsWith("eso-notif-read:")) emitNotif(); });
}
const PANEL_ICON = { messages: "chat", requests: "clipboard", violations: "alert", parking: "parking", plan: "gauge", properties: "building", reports: "chart", system: "shield" };

// ---- Header: page search (Cmd/Ctrl+K and "/") ----
function wireSearch(header) {
  const input = header.querySelector('input[type="search"]');
  if (!input) return;
  let results = [];
  let at = -1;
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    results = CFG.pages.filter((p) => !q || p.label.toLowerCase().includes(q) || p.group.toLowerCase().includes(q)).slice(0, 8);
    if (openPanel?.anchor !== input) { const p = panel(input, { label: "Search results", width: "26rem", align: "start" }); p.id = "frame-search-results"; p.setAttribute("role", "listbox"); }
    const p = openPanel.node;
    p.replaceChildren();
    at = results.length ? 0 : -1;
    if (!results.length) { p.append(make("p", { padding: "0.75rem" }, "No pages match.")); }
    for (const [i, r] of results.entries()) {
      const a = row("a", r.label, r.group, r.href.startsWith("#") ? null : r.href);
      a.setAttribute("role", "option");
      a.id = `frame-search-${i}`;
      a.setAttribute("aria-selected", String(i === at));
      a.addEventListener("click", (e) => { if (r.href.startsWith("#")) { e.preventDefault(); closePanel(false); say(NOT_YET); } });
      a.addEventListener("pointermove", () => mark(i));
      p.append(a);
    }
    p.style.padding = "0.25rem";
    place(p, input, "start");
    input.setAttribute("aria-controls", "frame-search-results");
    mark(at);
  };
  const mark = (i) => {
    at = i;
    for (const [n, a] of [...(openPanel?.node.querySelectorAll("[role=option]") || [])].entries()) a.setAttribute("aria-selected", String(n === i));
    input.setAttribute("aria-activedescendant", i >= 0 ? `frame-search-${i}` : "");
  };
  input.setAttribute("aria-autocomplete", "list");
  input.addEventListener("input", draw);
  input.addEventListener("focus", draw);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!openPanel) draw(); if (results.length) mark((at + (e.key === "ArrowDown" ? 1 : results.length - 1)) % results.length); }
    else if (e.key === "Enter" && at >= 0 && results[at]) {
      e.preventDefault();
      if (results[at].href.startsWith("#")) { closePanel(false); say(NOT_YET); } else location.href = results[at].href;
    } else if (e.key === "Escape") { closePanel(false); input.blur(); }
  });
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey)) { e.preventDefault(); input.focus(); input.select(); }
  });
}

// Everything that goes to the Support page, and every "#" link that has no page yet.
function wireLinks(header, sc) {
  const go = (e) => { e.preventDefault(); location.href = CFG.support; };
  header.querySelector('button[aria-label="Open EasySpotOps Help Center"]')?.addEventListener("click", go);
  for (const b of sc.querySelectorAll("button")) if (/EasySpotOps Help Center/.test(b.textContent)) b.addEventListener("click", go);
  // The Client's "Capacity summary" card (properties, parking spots, staff seats) opens its own place in the sidebar, Usage > Capacity (not Billing & Plan, and not Workspace Settings).
  for (const b of sc.querySelectorAll("button")) if (/Manage Capacity/.test(b.textContent)) b.addEventListener("click", () => {
    if (location.pathname.startsWith("/client/")) location.href = `/client/usage/capacity.html${location.search}`;
    else say("Plan management is not part of this preview yet.");
  });
  // Any link that has no page yet, in the menu or in the page itself (View, property names, …), says so instead of doing nothing.
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href="#"]');
    if (a && !a.closest(".eso-pm")) { e.preventDefault(); say(NOT_YET); }
  });
}

// ---- Header: profile menu, built like the account-settings prototype's (name card, Status, Account, Sign out) ----
const svg = (d, size = 14, extra = "") => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const ICON = {
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  clock: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  chat: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  key: svg('<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 9.2-9.2M17 6l3 3"/>'),
  bell: svg('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
  gauge: svg('<path d="m12 14 4-4"/><path d="M3.3 17a10 10 0 1 1 17.4 0"/>'),
  clipboard: svg('<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>'),
  alert: svg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  parking: svg('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>'),
  chart: svg('<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>'),
  shield: svg('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>'),
  building: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1"/>'),
  out: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  chevron: svg('<path d="m6 9 6 6 6-6"/>', 16),
  reset: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>', 18),
  check: svg('<path d="m5 12 5 5 9-10"/>', 16),
};
// Status dots take their colour from the theme's status tokens, so light and dark both read.
const STATUS = {
  available: { label: "Available", tone: "success", glyph: '<path d="m7.5 12.5 3 3 6-6.5" stroke="white" stroke-width="2.4" fill="none"/>' },
  busy: { label: "Busy", tone: "danger", glyph: "" },
  dnd: { label: "Do not disturb", tone: "danger", glyph: '<path d="M7.5 12h9" stroke="white" stroke-width="2.6"/>' },
  brb: { label: "Be right back", tone: "warning", glyph: '<path d="M12 7v5.5l3 1.8" stroke="white" stroke-width="2.2" fill="none"/>' },
  away: { label: "Appear away", tone: "warning", glyph: '<path d="M12 7v5.5l3 1.8" stroke="white" stroke-width="2.2" fill="none"/>' },
  offline: { label: "Appear offline", tone: "muted", glyph: "" },
};
const dot = (key, size = 18) => {
  const s = STATUS[key];
  const ring = key === "offline" ? '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="m9 9 6 6M15 9l-6 6" stroke="currentColor" stroke-width="2"/>' : `<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/>${s.glyph}`;
  return `<span class="eso-pm-st eso-pm-st-${s.tone}">${svg(ring, size)}</span>`;
};
const DURATIONS = ["Don't clear", "30 minutes", "1 hour", "4 hours", "Today"];

/** The Client profile menu. `me` is the persona ({ name, title, org }). Replaces the plain menu the captured header had. */
export function addProfileMenu({ me, initials, portal = "client", account = null, hasStatus = true }) {
  const trigger = document.querySelector('header button[aria-label^="Open profile menu"]');
  if (!trigger || trigger.hasAttribute("data-frame-profile")) return;
  trigger.setAttribute("data-frame-profile", "");
  // The Client's header shows the avatar alone: the dropdown arrow and the name and role the Staff header has are taken off, because the menu it opens
  // starts with them. The button keeps its accessible name ("Open profile menu for …") and still opens the menu.
  if (portal === "client") {
    trigger.querySelector(":scope > svg.lucide-chevron-down")?.remove();
    trigger.querySelector(":scope > span:not(.relative)")?.remove();
    trigger.classList.remove("sm:w-48"); // the button is as wide as the avatar, like the buttons beside it; styles.css widens its tappable area on touch screens
  }
  const baseLabel = trigger.getAttribute("aria-label") || "Open profile menu";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", "false");
  const P = `${portal}:`; // what the person chose is kept per portal
  const q = location.search;
  // Account links: [icon name, label, address]. Each portal passes its own; the Client's are the default.
  const links = account || [["user", "View profile", `/client/settings/profile.html${q}`], ["chat", "Messenger & availability", `/client/settings/availability.html${q}`], ["key", "My permissions", `/client/workspace/access.html${q}`], ["bell", "Notification preferences", `/client/settings/notifications.html${q}`]];
  let status = store.get(P + "status");
  if (!STATUS[status]) status = "available";
  let message = store.get(P + "status-msg") || "";
  let duration = DURATIONS.includes(store.get(P + "status-dur")) ? store.get(P + "status-dur") : DURATIONS[0];
  // "Reset after": a status other than Available, or a message, ends at the moment the chosen duration runs out and goes back to Available.
  let until = Number(store.get(P + "status-until") || 0);
  let endTimer;
  const endAt = () => {
    if (status === "available" && !message) return 0;
    if (duration === "Today") { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); }
    const ms = { "30 minutes": 30 * 60000, "1 hour": 3600000, "4 hours": 4 * 3600000 }[duration];
    return ms ? Date.now() + ms : 0;
  };
  const expire = () => {
    status = "available"; message = ""; duration = DURATIONS[0]; until = 0;
    store.set(P + "status", status); store.set(P + "status-msg", ""); store.set(P + "status-dur", duration); store.set(P + "status-until", "0");
    syncHeader();
    if (!menu.hidden) draw();
  };
  const arm = () => {
    clearTimeout(endTimer);
    if (!until) return;
    const left = until - Date.now();
    if (left <= 0) expire(); else endTimer = setTimeout(expire, Math.min(left, 2 ** 31 - 1));
  };
  const setEnd = () => { until = endAt(); store.set(P + "status-until", String(until)); arm(); };

  const menu = document.createElement("div");
  menu.className = "eso-pm";
  // The panel holds headings, a status list and a text field next to the links, so it is a dialog, not a "menu" (which may only hold menu items).
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-label", "Profile menu");
  menu.hidden = true;
  document.body.append(menu);

  const item = (icon, text, small, attrs = {}) => {
    const a = document.createElement(attrs.href ? "a" : "button");
    if (!attrs.href) a.type = "button";
    a.className = "eso-pm-item" + (attrs.danger ? " eso-pm-out" : "");
    if (attrs.href) a.href = attrs.href;
    a.innerHTML = `<span class="eso-pm-pi">${icon}</span><span class="eso-pm-tx"><span></span>${small ? "<small></small>" : ""}</span>`;
    a.querySelector(".eso-pm-tx > span").textContent = text;
    if (small) a.querySelector("small").textContent = small;
    return a;
  };
  // The labels "Status" and "Account" are not headings of the page (they were h6, which made the outline jump from h1 to h6): plain paragraphs.
  const heading = (t) => Object.assign(document.createElement("p"), { textContent: t, className: "eso-pm-h" });

  const draw = () => {
    menu.replaceChildren();
    const card = document.createElement("div");
    card.className = "eso-pm-card";
    card.innerHTML = `<span class="eso-pm-av"></span><div class="eso-pm-who"><b></b><small></small><small></small></div>`;
    card.querySelector(".eso-pm-av").append(document.createTextNode(initials(me.name)));
    if (hasStatus) card.querySelector(".eso-pm-av").insertAdjacentHTML("beforeend", `<span class="eso-pm-avdot">${dot(status)}</span>`);
    const [n, t, o] = card.querySelectorAll(".eso-pm-who > *");
    n.textContent = me.name; t.textContent = me.title; o.textContent = me.org;
    menu.append(card);
    if (hasStatus) menu.append(heading("Status"));

    const wrap = document.createElement("div");
    wrap.className = "eso-pm-stwrap";
    const row = document.createElement("button");
    row.type = "button";
    row.className = "eso-pm-strow";
    row.setAttribute("aria-haspopup", "listbox");
    row.setAttribute("aria-expanded", "false");
    row.innerHTML = `${dot(status)}<span class="eso-pm-lb"><b></b><small></small></span><span class="eso-pm-cv">${ICON.chevron}</span>`;
    row.querySelector("b").textContent = STATUS[status].label;
    const sm = row.querySelector("small");
    if (message) sm.textContent = message; else sm.remove();
    const list = document.createElement("div");
    list.className = "eso-pm-stdd";
    list.hidden = true;
    const opts = document.createElement("div"); // only the options are the listbox; "Reset status" is a plain button after it
    opts.setAttribute("role", "listbox");
    opts.setAttribute("aria-label", "Status");
    list.append(opts);
    for (const [key, s] of Object.entries(STATUS)) {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "option");
      b.setAttribute("aria-selected", String(key === status));
      b.innerHTML = `${dot(key)}<span></span>${key === status ? `<span class="eso-pm-ck">${ICON.check}</span>` : ""}`;
      b.querySelector("span:nth-of-type(2)").textContent = s.label;
      b.addEventListener("click", () => setStatus(key));
      opts.append(b);
    }
    list.append(document.createElement("hr"));
    const reset = document.createElement("button");
    reset.type = "button";
    reset.innerHTML = `${ICON.reset}<span>Reset status</span>`;
    reset.addEventListener("click", () => { message = ""; duration = DURATIONS[0]; store.set(P + "status-msg", ""); store.set(P + "status-dur", duration); setStatus("available"); });
    // (setStatus, below, also stores the moment the status ends)
    list.append(reset);
    row.addEventListener("click", () => { const open = list.hidden; list.hidden = !open; row.setAttribute("aria-expanded", String(open)); });
    wrap.append(row, list);
    if (hasStatus) menu.append(wrap);

    const msg = item(ICON.edit, "Set status message", message ? "" : "", {});
    msg.querySelector(".eso-pm-tx > span").textContent = message ? "Edit status message" : "Set status message";
    const field = document.createElement("form");
    field.className = "eso-pm-field";
    field.hidden = true;
    field.innerHTML = '<input type="text" maxlength="80" aria-label="Status message" placeholder="What are you working on?"><button type="submit">Save</button>';
    const input = field.querySelector("input");
    input.value = message;
    msg.addEventListener("click", () => { field.hidden = !field.hidden; if (!field.hidden) input.focus(); });
    field.addEventListener("submit", (e) => { e.preventDefault(); message = input.value.trim(); store.set(P + "status-msg", message); setEnd(); draw(); menu.querySelector(".eso-pm-strow")?.focus(); });
    field.addEventListener("keydown", (e) => e.stopPropagation());

    const dur = item(ICON.clock, "Duration", `Reset after: ${duration}`, {});
    dur.addEventListener("click", () => { duration = DURATIONS[(DURATIONS.indexOf(duration) + 1) % DURATIONS.length]; store.set(P + "status-dur", duration); setEnd(); dur.querySelector("small").textContent = `Reset after: ${duration}`; });
    if (hasStatus) menu.append(msg, field, dur);
    menu.append(heading("Account"));
    for (const [icon, text, href] of links) {
      const a = item(ICON[icon], text, "", { href });
      a.addEventListener("click", () => close(false));
      menu.append(a);
    }
    menu.append(document.createElement("hr"));
    const out = item(ICON.out, "Sign out", "", { danger: true });
    out.addEventListener("click", () => { close(false); say("Signing out is not part of this preview."); });
    menu.append(out);
  };
  const syncHeader = () => {
    // The status dot on the header avatar follows the chosen status.
    const holder = trigger.querySelector("[data-eso-dot]") || (() => {
      const avatar = trigger.querySelector('[data-slot="avatar"]');
      const d = avatar && [...avatar.parentElement.children].find((c) => c !== avatar && c.querySelector?.("svg, [class*='bg-']") || c !== avatar && c.className?.includes?.("rounded-full"));
      if (d) d.setAttribute("data-eso-dot", "");
      return d;
    })();
    if (holder) holder.innerHTML = dot(status, 14);
    // The dot is a picture; the button's name says the status too, so it is not carried by colour or shape alone.
    trigger.setAttribute("aria-label", `${baseLabel}, ${STATUS[status].label}`);
  };
  const setStatus = (key) => { status = key; store.set(P + "status", key); setEnd(); draw(); syncHeader(); menu.querySelector(".eso-pm-strow")?.focus(); };
  const close = (focusBack = true) => { menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); if (focusBack) trigger.focus(); };
  const open = () => {
    closePanel(false);
    draw();
    const b = trigger.getBoundingClientRect();
    menu.style.top = `${Math.round(b.bottom + 6)}px`;
    menu.style.right = `${Math.max(8, Math.round(innerWidth - b.right))}px`;
    menu.style.maxHeight = `calc(100dvh - ${Math.round(b.bottom + 14)}px)`;
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    menu.querySelector(".eso-pm-strow, .eso-pm-item")?.focus();
  };
  trigger.addEventListener("click", (e) => { e.stopPropagation(); if (menu.hidden) open(); else close(); });
  document.addEventListener("pointerdown", (e) => { if (!menu.hidden && !menu.contains(e.target) && !trigger.contains(e.target)) close(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) close(true); });
  menu.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); const dd = menu.querySelector(".eso-pm-stdd:not([hidden])"); if (dd) { dd.hidden = true; menu.querySelector(".eso-pm-strow").setAttribute("aria-expanded", "false"); menu.querySelector(".eso-pm-strow").focus(); } else close(true); return; }
    if (e.key === "Tab") {
      // The panel sits at the end of the page, so Tab out of it would land somewhere unrelated: it closes and the focus goes back to the button.
      const all = [...menu.querySelectorAll("a, button, input")].filter((x) => x.offsetParent !== null);
      if (e.shiftKey ? document.activeElement === all[0] : document.activeElement === all[all.length - 1]) { e.preventDefault(); close(true); }
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const list = [...menu.querySelectorAll('.eso-pm-card ~ * a, .eso-pm-card ~ * button, .eso-pm-card ~ a, .eso-pm-card ~ button')].filter((x) => x.offsetParent !== null && x.tagName !== "INPUT");
    const i = list.indexOf(document.activeElement);
    e.preventDefault();
    list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length]?.focus();
  });
  if (hasStatus) { syncHeader(); arm(); } // an ended status goes back to Available now; a running one is set to end on time
}

/** Add the missing behaviours to the Client header and sidebar. Safe to call once, after adoptStaffFrame(). */
export function addFrameBehaviours({ me, portal = "client" } = {}) {
  const header = document.querySelector("header");
  const sc = document.querySelector('[data-slot="sidebar-container"]');
  if (!header || !sc) return;
  configure(portal, sc);
  listenForNotifChanges();
  for (const fn of [() => wireNavBadge(sc, me), () => wireFavorites(sc), () => wireFilter(sc), () => wireClock(sc), () => wireBell(header, me), () => wireSearch(header), () => wireLinks(header, sc)]) {
    try { fn(); } catch (err) { console.warn("frame behaviour skipped:", err); } // one failing piece must not stop the others
  }
}
