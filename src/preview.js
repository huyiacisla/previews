import { lookCss, gestureConfig, onAccent, accentText, PAGE_LIGHT, PAGE_DARK } from "./look-prefs.js";
import { savePrefs } from "./settings/prefs.js";
import { pathForHash, STAFF_ROUTES, RESIDENT_ROUTES, CLIENT_ROUTES, ADMIN_ROUTES } from "./staff-routes.js";
import { guardAccess } from "./access-guard.js";
// A property that has ended takes its Staff and Residents' access with it: their pages show one message and stop here (access-guard.js).
if (guardAccess()) throw new Error("This property has ended: the page shows the sign-out message and builds nothing else.");
// An address typed without the ending (/staff/workspace, /staff/settings/profile) is the page with the ending, so every check below sees one form.
if (/^\/(staff|client|resident|admin|messages)\//.test(location.pathname) && !/\.[a-z0-9]+$/i.test(location.pathname)) history.replaceState(null, "", `${location.pathname.replace(/\/$/, "")}.html${location.search}${location.hash}`);
// Chỉ đổi giao diện: bật/tắt dark qua ?dark (app thật dùng next-themes: class `light`/`dark` trên <html>).
const root = document.documentElement;
// Các dashboard chụp từ app thật ghi lang="vi" nhưng nội dung là tiếng Anh: trình đọc màn hình sẽ đọc sai giọng. Đặt lại đúng ngôn ngữ của nội dung.
if (root.lang === "vi") root.lang = "en";
const setDark = (on) => {
  root.classList.toggle("dark", on);
  root.classList.toggle("light", !on);
};
if (new URLSearchParams(location.search).has("dark")) setDark(true);

// Header và sidebar của mọi trang Client (dashboard, Settings) lấy đúng thiết kế của Staff (xem portal-frame.js), nên một vai trò chỉ có một kiểu.
// Phải chạy trước mọi đoạn bên dưới vì chúng tìm phần tử trong header và sidebar. Ẩn trang một lúc để không thấy khung cũ nháy lên.
// Pages of the Client that are "frame + content in an iframe" (see EMBED below); the content pages are the *-content.html files.
const isClientFrame = /^\/client\/(dashboard|account-settings|notifications|messages|tickets|workspace|support|documents)\.html$|^\/client\/(settings|workspace|usage)\/[a-z]+\.html$/.test(location.pathname);
// Resident pages that take the same frame (header and sidebar from the Staff design, filled with the Resident's own menu), and the
// Staff pages that already have that header but need its behaviours (filter, clock, bell, search, favourites).
const isResidentFrame = /^\/resident\/(home|notifications|messages|tickets|settings|promotions)\.html$|^\/resident\/settings\/[a-z]+\.html$/.test(location.pathname);
const isStaffFrame = /^\/staff\/(dashboard|notifications|messages|tickets|workspace|promotions|support)\.html$|^\/staff\/(settings|workspace)\/[a-z]+\.html$/.test(location.pathname);
// The old address of the Staff settings page (/staff/account-settings.html#/…) leads to the address the page has now (/staff/settings/profile, /staff/workspace…).
if (location.pathname === "/staff/account-settings.html") {
  const h = location.hash || "#/workspace";
  // Social has its own page now (and its own My profile); everything else maps to a path of the settings page.
  if (/^#\/social/.test(h)) location.replace(`/staff/social.html${location.search}${/^#\/social\/me/.test(h) ? "#/me" : ""}`);
  else location.replace(`${pathForHash(h) || "/staff/workspace.html"}${location.search}${pathForHash(h) ? "" : h}`);
}
// Messages and Ticket box are full-page apps (the *-content.html files, and Admin's pages). For Client, Staff and Resident the page you open
// is the portal's own frame with the app inside it (see EMBED below), so those are not "standalone".
// Every page has a tab icon (the browser asked for /favicon.ico and got a 404): a small mark of the app, drawn inline.
if (!document.querySelector('link[rel~="icon"]')) {
  const ico = document.createElement("link");
  ico.rel = "icon";
  ico.type = "image/svg+xml";
  ico.href = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#2563eb"/><path d="M10 23V9h7a4.5 4.5 0 0 1 0 9h-4" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  document.head.append(ico);
}
const standaloneApp = /\/(messages|tickets)(-content)?\.html$/.test(location.pathname) && !/^\/(client|staff|resident|admin)\/(messages|tickets)\.html$/.test(location.pathname);
if (isClientFrame || isResidentFrame || isStaffFrame) {
  root.style.visibility = "hidden";
  const reveal = setTimeout(() => { root.style.visibility = ""; }, 3000); // an toàn: không bao giờ để trang trống
  try {
    const frameOf = location.pathname.split("/")[1]; // client | resident | staff
    const [{ adoptStaffFrame }, { pickPersona, initials }] = await Promise.all([import("./portal-frame.js"), import("./messaging/personas.js")]);
    const me = pickPersona(frameOf, new URLSearchParams(location.search).get("as"));
    // Staff already has the design: its header only needs the sizing mark. Client and Resident are rebuilt from it.
    let adopted;
    if (frameOf === "staff") { document.querySelector("header")?.setAttribute("data-eso-frame", ""); adopted = true; }
    else adopted = await adoptStaffFrame({ me, initials, portal: frameOf });
    if (adopted) (await import("./portal-frame-extras.js")).addFrameBehaviours({ me, portal: frameOf }); // filter, local time, notifications, search, help: the frame was a static snapshot
    // The rebuilt Resident menu comes after the links above were set: its "Dashboard" gets its page too.
    if (adopted && frameOf === "resident") for (const a of document.querySelectorAll('a[data-slot="sidebar-menu-button"]')) if (a.querySelector("span.truncate")?.textContent.trim() === "Dashboard" && a.getAttribute("href") === "#") a.setAttribute("href", `/resident/home.html${location.search}`);
  } catch { /* trang giữ nguyên khung cũ */ }
  clearTimeout(reveal);
  root.style.visibility = "";
}

// The header's theme button remembers the choice, so a reload (and every other page of the portal) keeps it. Staff, Client and Admin keep it with their look
// settings ("ui-prefs:<portal>"); a Resident keeps it with their own preferences (the same place Settings writes it).
const toggleTheme = () => {
  setDark(!root.classList.contains("dark"));
  const theme = root.classList.contains("dark") ? "dark" : "light";
  for (const b of document.querySelectorAll('button[aria-label^="Theme:"]')) b.setAttribute("aria-label", `Theme: ${theme}`); // the name says what is on now, not what it was at load
  const portal = (location.pathname.match(/^\/(staff|client|resident|admin)\//) || [])[1];
  if (!portal) return;
  try {
    if (portal === "resident") savePrefs(localStorage, new URLSearchParams(location.search).get("as") || "res-1", { theme });
    else { const k = `ui-prefs:${portal}`; const cur = JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify({ ...(cur && typeof cur === "object" ? cur : {}), theme })); }
  } catch { /* private window: the choice lasts until reload */ }
};
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-theme-toggle]")) toggleTheme();
});

// Nút theme của dashboard (aria-label "Theme: ...") không có data-theme-toggle trong HTML chụp: nối lại.
document.addEventListener("click", (e) => {
  if (e.target.closest('button[aria-label^="Theme:"]')) toggleTheme();
});

// Cá nhân hóa chọn trong trang Settings (Staff và Client): màu sidebar, theme và màu nhấn đi theo người dùng sang các trang thật.
// Trang Settings ghi `ui-prefs:<portal>` mỗi khi người dùng đổi; chưa đổi gì thì không có khóa này và các trang giữ nguyên diện mạo gốc.
// Trang prototype (nội dung Settings) tự quản lý giao diện của nó; mọi trang còn lại, kể cả khung dashboard bọc Settings của Client, nhận từ đây.
const isPrototypePage = /\/staff\/account-settings\.html$|\/account-settings-content\.html$|\/(resident|admin)\/settings-content\.html$/.test(location.pathname);
// A content page shown inside the Client frame (?embed=1 and a parent window): the frame owns the header, the theme and the address.
// Light/dark follows the frame, a link to another page opens in the whole window (not nested in the frame), and the page's own
// address (#/c/…) is mirrored on the frame so a reload comes back to the same place. The Settings prototype does these itself.
const embedded = new URLSearchParams(location.search).has("embed") && parent !== window && !isPrototypePage;
if (embedded) {
  root.setAttribute("data-eso-embed", "");
  try {
    const sync = () => setDark(parent.document.documentElement.classList.contains("dark"));
    new MutationObserver(sync).observe(parent.document.documentElement, { attributes: true, attributeFilter: ["class"] });
    sync();
    // The other way: a page that changes the look itself (Resident Settings > Personalize: theme, contrast, reduced motion) tells the frame,
    // so the header and the page never disagree.
    new MutationObserver(() => {
      const p = parent.document.documentElement;
      p.classList.toggle("dark", root.classList.contains("dark"));
      p.classList.toggle("light", root.classList.contains("light"));
      for (const a of ["data-contrast", "data-reduce-motion", "data-big-target", "data-strong-focus"]) p.toggleAttribute(a, root.hasAttribute(a));
    }).observe(root, { attributes: true, attributeFilter: ["class", "data-contrast", "data-reduce-motion", "data-big-target", "data-strong-focus"] });
  } catch { /* no usable parent */ }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target || a.hasAttribute("download")) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || u.pathname === location.pathname) return;
    e.preventDefault();
    try { parent.location.href = u.href; } catch { location.href = u.href; }
  });
  addEventListener("hashchange", () => { try { if (parent.location.hash !== location.hash) parent.history.replaceState(null, "", parent.location.pathname + parent.location.search + location.hash); } catch { /* no parent */ } });
}

const applyUiPrefs = () => {
  const p = location.pathname.split("/")[1];
  if ((p === "staff" || p === "client" || p === "resident" || p === "admin") && !isPrototypePage) {
    try {
      const ui = JSON.parse(localStorage.getItem(`ui-prefs:${p}`) || "null");
      const hex = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
      // Nút thu gọn ở mép sidebar chỉ có khi người dùng bật "Enable sidebar collapse" (Settings > Personalize > Sidebar) và chỉ trên desktop.
      root.setAttribute("data-sb-collapse", ui && ui.collapse === true ? "on" : "off");
      if (ui) {
        const s = root.style;
        // Chọn lại "Default" (không có màu) thì bỏ màu đã đặt trước đó, không cần tải lại trang.
        const box = document.querySelector('[data-slot="sidebar-container"]');
        const names = ["--surface-inverted", "--surface-inverted-foreground", "--surface-inverted-subtle", "--surface-inverted-accent"];
        if (Array.isArray(ui.sb) && ui.sb.length === 4 && ui.sb.every(hex)) { // exactly four colours: background, text, accent, highlight; anything else keeps the default
          const [bg, fg, acc, accent] = ui.sb;
          s.setProperty("--sidebar", bg);
          s.setProperty("--sidebar-foreground", fg);
          s.setProperty("--sidebar-accent", acc);
          s.setProperty("--sidebar-accent-foreground", fg);
          s.setProperty("--sidebar-primary", accent);
          s.setProperty("--sidebar-border", acc);
          // Sidebar vẽ bằng token "surface-inverted" (không phải "--sidebar"), mà token đó còn dùng ở chỗ khác: chỉ đặt trên chính sidebar.
          if (box) {
            box.style.setProperty(names[0], bg);
            box.style.setProperty(names[1], fg);
            box.style.setProperty(names[2], `color-mix(in oklab, ${fg} 72%, transparent)`);
            box.style.setProperty(names[3], accent);
          }
        } else {
          for (const v of ["--sidebar", "--sidebar-foreground", "--sidebar-accent", "--sidebar-accent-foreground", "--sidebar-primary", "--sidebar-border"]) s.removeProperty(v);
          if (box) for (const n of names) box.style.removeProperty(n);
        }
        if (!new URLSearchParams(location.search).has("dark")) {
          if (ui.theme === "dark") setDark(true);
          else if (ui.theme === "light") setDark(false);
          else if (ui.theme === "system") setDark(matchMedia("(prefers-color-scheme: dark)").matches);
        }
        // Tùy chọn sidebar còn áp dụng được cho sidebar thật: biểu tượng, số đếm nhóm, thẻ tổng quan (CSS theo thuộc tính nằm trong styles.css).
        root.setAttribute("data-sb-icons", ui.icons === false ? "off" : "on");
        root.setAttribute("data-sb-counts", ui.counts === false ? "off" : "on");
        root.setAttribute("data-sb-search", ui.search === false ? "off" : "on");
        root.setAttribute("data-sb-scroll", typeof ui.scroll === "string" ? ui.scroll : "auto-hide");
        // Thẻ "Portfolio Capacity" ở đầu sidebar (thiết kế của Staff): con trực tiếp của khối đầu sidebar.
        // The card has a different heading in each portal (Client: Capacity summary, Staff and Resident: Workspace Capacity, Admin: its Active spaces card): one switch hides it in all four.
        const CARD_HEADINGS = ["Capacity summary", "Workspace Capacity", "Vehicle allowance", "Portfolio Overview", "Active spaces"];
        const cap = [...document.querySelectorAll('[data-slot="sidebar-container"] *')].find((e) => e.children.length === 0 && CARD_HEADINGS.includes(e.textContent.trim()));
        const top = document.querySelector('[data-slot="sidebar-inner"]')?.firstElementChild;
        let card = cap;
        while (card && top && card.parentElement !== top) card = card.parentElement;
        if (card && top) card.hidden = ui.cap === false;
        // Text, buttons, cards, density: one small stylesheet that stays empty until a choice differs from the default (see look-prefs.js).
        let look = document.getElementById("eso-look");
        if (!look) { look = document.createElement("style"); look.id = "eso-look"; document.head.append(look); }
        look.textContent = lookCss(ui);
        root.setAttribute("data-nav-side", ui.gestures && ui.gestures.side === "right" ? "right" : "left");
        // Accessibility (Settings > Accessibility): all four reach every page (styles.css): higher contrast, reduced motion, larger tap targets, a stronger focus ring.
        if (ui.a11y) {
          root.toggleAttribute("data-contrast", !!ui.a11y.contrast);
          root.toggleAttribute("data-reduce-motion", !!ui.a11y.motion);
          // (a choice made in Settings wins; with none, a touch screen gets the 44 px targets: see below)
          root.toggleAttribute("data-big-target", typeof ui.a11y.target === "boolean" ? ui.a11y.target : matchMedia("(pointer: coarse)").matches);
          root.toggleAttribute("data-strong-focus", !!ui.a11y.focus);
        }
        if (hex(ui.accent) && ui.accent.toLowerCase() !== "#2b55f2") {
          root.style.setProperty("--primary", ui.accent);
          root.style.setProperty("--sidebar-primary", ui.accent);
          // text on the accent, and the accent as text, kept readable whatever colour was picked (look-prefs.js)
          root.style.setProperty("--primary-foreground", onAccent(ui.accent));
          root.style.setProperty("--primary-text-l", accentText(ui.accent, PAGE_LIGHT));
          root.style.setProperty("--primary-text-d", accentText(ui.accent, PAGE_DARK));
        } else {
          for (const v of ["--primary-foreground", "--primary-text-l", "--primary-text-d"]) root.style.removeProperty(v);
        }
      }
    } catch { /* trang vẫn dùng diện mạo gốc */ }
  }
};
applyUiPrefs();

// Touch screens (a phone, a tablet): controls are at least 44 px by default ("Larger tap targets" in Settings > Accessibility is on). Someone who turned it OFF
// in Settings keeps it off; the Settings pages and the frames inside a page read the same attribute (they copy it from the page).
try {
  const portal = location.pathname.split("/")[1];
  const saved = JSON.parse(localStorage.getItem(`ui-prefs:${portal}`) || "null");
  const chosen = saved && saved.a11y && typeof saved.a11y.target === "boolean" ? saved.a11y.target : null;
  if (matchMedia("(pointer: coarse)").matches && chosen !== false) root.setAttribute("data-big-target", "");
} catch { /* the page keeps its normal size */ }

// Thu gọn sidebar thành thanh biểu tượng (desktop, khi đã bật trong Settings): nút ở mép sidebar hoặc Ctrl/⌘+B. Nhớ trạng thái giữa các trang.
{
  const p = location.pathname.split("/")[1];
  if ((p === "staff" || p === "client" || p === "resident" || p === "admin") && !isPrototypePage) {
    const key = `ui-sidebar-collapsed:${p}`;
    const wrap = () => document.querySelector('[data-slot="sidebar"]');
    const toggle = () => document.querySelector('[data-slot="sidebar-container"] button[aria-label="Collapse sidebar"], [data-slot="sidebar-container"] button[aria-label="Expand sidebar"]');
    const usable = () => root.getAttribute("data-sb-collapse") === "on" && matchMedia("(min-width: 1024px)").matches;
    const set = (on, remember = true) => {
      const w = wrap();
      if (!w) return;
      w.setAttribute("data-state", on ? "collapsed" : "expanded");
      if (on) w.setAttribute("data-collapsible", "icon"); else w.removeAttribute("data-collapsible");
      toggle()?.setAttribute("aria-label", on ? "Expand sidebar" : "Collapse sidebar");
      if (remember) { try { localStorage.setItem(key, on ? "1" : "0"); } catch { /* storage blocked */ } }
    };
    // Personalize > Sidebar > Layout "Rail": on a desktop the sidebar is an icon rail all the time (the person's own collapse choice is left as it was).
    const rail = () => { try { return JSON.parse(localStorage.getItem(`ui-prefs:${p}`) || "null")?.layout === "B" && matchMedia("(min-width: 1024px)").matches; } catch { return false; } };
    const sync = () => { try { if (rail()) set(true, false); else set(usable() && localStorage.getItem(key) === "1", false); } catch { /* storage blocked */ } };
    document.addEventListener("click", (e) => {
      const b = e.target.closest('button[aria-label="Collapse sidebar"], button[aria-label="Expand sidebar"]');
      if (b && usable()) set(b.getAttribute("aria-label") === "Collapse sidebar");
    });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b" && usable()) { e.preventDefault(); set(wrap()?.getAttribute("data-state") !== "collapsed"); }
    });
    matchMedia("(min-width: 1024px)").addEventListener("change", sync);
    addEventListener("message", (e) => { if (e.origin === location.origin && e.data && e.data.type === "eso-ui-prefs") sync(); });
    sync();
  }
}

// Messages and the Ticket box in a portal frame have their Send button where the floating assistant button is: it is not shown on those two pages.
if (/\/(staff|client|resident|admin)\/(messages|tickets)\.html$/.test(location.pathname)) root.setAttribute("data-no-fab", "");

// The property's own name (the Display name saved in the property profile) replaces the default one in the text of the Staff and Resident pages.
// The menu is left alone: its account card is not changed here.
{
  const p = location.pathname.split("/")[1];
  if ((p === "staff" || p === "resident") && !isPrototypePage) {
    import("./property-name.js").then(({ propertyName, DEFAULT_PROPERTY }) => {
      let shown = DEFAULT_PROPERTY;
      const run = () => {
        const name = propertyName(localStorage);
        const olds = [...new Set([DEFAULT_PROPERTY, shown])].filter((s) => s !== name);
        if (!olds.length && shown === name) return;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode: (n) => (n.parentElement && !n.parentElement.closest('[data-slot="sidebar-container"], script, style, textarea, #frame-say') && olds.some((o) => n.nodeValue.includes(o)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        for (const n of nodes) for (const o of olds) n.nodeValue = n.nodeValue.split(o).join(name);
        shown = name;
      };
      let timer;
      const later = () => { clearTimeout(timer); timer = setTimeout(run, 150); };
      new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
      addEventListener("storage", (e) => { if (e.key === "eso-prop") later(); });
      later();
    });
  }
}

// A page of the portal that holds another page in a frame (Promotions, Support, Workspace, Settings, Messages…) hands it the same look: dark or light, and the
// accent colour. Settings only passes them on when something in Settings changed; the header's theme button and the saved look reach the frame this way.
if (!isPrototypePage) {
  const syncEmbed = (fr) => {
    try {
      const d = fr.contentDocument;
      if (!d || !d.documentElement) return;
      const dark = root.classList.contains("dark");
      d.documentElement.classList.toggle("dark", dark);
      d.documentElement.classList.toggle("light", !dark);
      const accent = root.style.getPropertyValue("--primary");
      if (accent) d.documentElement.style.setProperty("--primary", accent); else d.documentElement.style.removeProperty("--primary");
      // the text on the accent follows it into the frame, so a light accent does not leave white text on a light button there
      for (const v of ["--primary-foreground", "--primary-text-l", "--primary-text-d"]) {
        const val = root.style.getPropertyValue(v);
        if (val) d.documentElement.style.setProperty(v, val); else d.documentElement.style.removeProperty(v);
      }
    } catch { /* a frame of another origin: left alone */ }
  };
  const syncAll = () => document.querySelectorAll("iframe").forEach(syncEmbed);
  document.addEventListener("load", (e) => {
    if (!e.target || e.target.tagName !== "IFRAME") return;
    syncEmbed(e.target);
    setTimeout(() => syncEmbed(e.target), 500); // the page inside may set its own look a moment after it loads
    setTimeout(() => syncEmbed(e.target), 1500);
  }, true);
  new MutationObserver(syncAll).observe(root, { attributes: true, attributeFilter: ["class", "style"] });
}

// Staff và Resident: header của dashboard chụp ghi "User 5" / "User 1"; Messages và Ticket box đã gọi họ bằng tên người dùng (Jordan Lee,
// Alex Rivera), nên header cũng vậy. Menu hồ sơ là menu của thiết kế (thẻ tên, Status cho Staff, nhóm Account, Sign out).
const portalNow = location.pathname.split("/")[1]; // (`portal`, below, is declared further down)
// Admin: the captured header drew 51 px buttons with 24 px icons and hid the theme button below 768 px, so a phone had a huge bell, a long
// search bar and no way to change the theme. The other portals' headers already have the compact rules (styles.css, header[data-eso-frame]:
// 32 px buttons, 18 px icons, theme button at every width, one row); marking the Admin header gives it the same ones.
if (location.pathname.split("/")[1] === "admin") document.querySelector("header")?.setAttribute("data-eso-frame", "");
// Admin too: the capture says "User 6 · QA", while Messages and the Ticket box call the same person Taylor Brooks.
if ((portalNow === "staff" || portalNow === "resident" || portalNow === "admin") && !standaloneApp && !isPrototypePage) {
  const portal = portalNow;
  const trigger = document.querySelector('header button[aria-label^="Open profile menu"]');
  if (trigger) {
    (async () => {
      try {
        const { pickPersona, initials } = await import("./messaging/personas.js");
        const me = pickPersona(portal, new URLSearchParams(location.search).get("as"));
        for (const s of [...trigger.querySelectorAll("span")].filter((x) => !x.children.length)) {
          const t = s.textContent.trim();
          if (/^User \d+$/.test(t)) s.textContent = me.name;
          else if (/^[A-Z]{2}$/.test(t)) s.textContent = initials(me.name);
        }
        trigger.setAttribute("aria-label", `Open profile menu for ${me.name}`);
        // The Resident greeting of the capture says "Welcome back, QA": greet the person by name.
        if (portal === "resident") for (const h of document.querySelectorAll("main h1, main h2, main p")) if (!h.children.length && /^Welcome back, QA\b/.test(h.textContent.trim())) h.textContent = `Welcome back, ${me.name.split(" ")[0]}`;
        const q = location.search;
        const account = portal === "staff"
          ? [["user", "View profile", `/staff/settings/profile.html${q}`], ["chat", "Messenger & availability", `/staff/settings/availability.html${q}`], ["key", "My permissions", `/staff/workspace/access.html${q}`], ["bell", "Notification preferences", `/staff/settings/notifications.html${q}`], ["user", "My Social", `/staff/social.html${q}#/me`], ["user", "Saved posts", `/staff/social.html${q}#/me`]]
          : portal === "admin"
            ? [["user", "Settings", `/admin/settings.html${q}`], ["chat", "Messaging & Support", `/admin/messages.html${q}`], ["clipboard", "Ticket box", `/admin/tickets.html${q}`], ["bell", "Notifications", `/admin/notifications.html${q}`]]
            : [["user", "Settings", `/resident/settings.html${q}`], ["chat", "Messages", `/resident/messages.html${q}`], ["clipboard", "Ticket box", `/resident/tickets.html${q}`]]; // (a person opens the avatar for their own settings first: Staff's menu has "View profile" too)
        const extras = await import("./portal-frame-extras.js");
        extras.addProfileMenu({ me, initials, portal, account, hasStatus: portal === "staff" });
        if (portal === "admin") extras.addBell({ me, portal }); // the captured Admin bell opened nothing and showed no count
      } catch { /* the header stays as captured */ }
    })();
  }
}

// Admin sidebar: "Social" becomes "Social management" (the list of properties, each with its Social), with "Social monitoring" under it.
if (portalNow === "admin" && !standaloneApp && !isPrototypePage) {
  const parent = [...document.querySelectorAll('a[data-slot="sidebar-menu-button"]')].find((a) => a.querySelector("span.truncate")?.textContent.trim() === "Social");
  const parentLi = parent?.closest("li");
  if (parent && parentLi && !document.querySelector("[data-eso-social-sub]")) {
    const sub = parentLi.cloneNode(true);
    sub.setAttribute("data-eso-social-sub", "");
    const subLink = sub.querySelector('a[data-slot="sidebar-menu-button"]');
    subLink.querySelector("span.truncate").textContent = "Social monitoring";
    subLink.setAttribute("href", `/admin/social-monitoring.html${location.search}`);
    subLink.removeAttribute("aria-current");
    subLink.removeAttribute("data-active");
    subLink.id = "sb-social-monitoring";
    subLink.style.cssText = "margin-left:1.25rem;width:calc(100% - 1.25rem)";
    const icon = subLink.querySelector("svg");
    if (icon) icon.innerHTML = '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>'; // an eye: it only looks
    parentLi.after(sub);
    parent.querySelector("span.truncate").textContent = "Social management";
    parent.setAttribute("href", `/admin/social-management.html${location.search}`);
  }
}

// Admin sidebar: "System health" (the data checks of every module), next to Platform Operations. A copy of that item with its own name, link and icon.
if (portalNow === "admin" && !standaloneApp && !isPrototypePage && !document.getElementById("sb-system-health")) {
  const ops = [...document.querySelectorAll('a[data-slot="sidebar-menu-button"]')].find((a) => /^Platform Operat/.test(a.querySelector("span.truncate")?.textContent.trim() || ""));
  const opsLi = ops?.closest("li");
  if (ops && opsLi) {
    const li = opsLi.cloneNode(true);
    const a = li.querySelector('a[data-slot="sidebar-menu-button"]');
    a.id = "sb-system-health";
    a.querySelector("span.truncate").textContent = "System health";
    a.setAttribute("href", `/admin/health.html${location.search}`);
    a.removeAttribute("aria-current");
    a.removeAttribute("data-active");
    const icon = a.querySelector("svg");
    if (icon) icon.innerHTML = '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>'; // a pulse line
    opsLi.after(li);
  }
}

// Liên kết "#" (trang chưa có trong bản xem thử) ở Staff, Admin và Resident: báo thay vì im lặng. Client làm việc này trong portal-frame-extras.js.
if (["staff", "admin", "resident"].includes(portalNow) && !isPrototypePage) {
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href="#"]');
    if (!a || a.closest(".eso-pm")) return;
    e.preventDefault();
    import("./portal-frame-extras.js").then((m) => m.say("Coming soon: this feature is in development and is not available in the preview yet."));
  });
}

// Settings của Client nằm trong khung dashboard thật (xem mountSettingsShell bên dưới): khi người dùng đổi màu sidebar, theme hoặc màu nhấn
// trong nội dung nhúng, sidebar thật đổi theo ngay.
addEventListener("message", (e) => { if (e.origin === location.origin && e.data && e.data.type === "eso-ui-prefs") applyUiPrefs(); });

// Ngăn kéo điều hướng (mobile/tablet): nút "Open navigation" mở sidebar có sẵn trong HTML dưới dạng off-canvas.
// Đóng bằng: bấm nền mờ, Esc, chọn một mục, hoặc khi màn hình rộng ra >= 1024px. Trả focus về nút đã mở.
(() => {
  const toggle = document.querySelector('button[aria-label="Open navigation"]');
  const sidebar = document.querySelector('[data-slot="sidebar-container"]');
  if (!toggle || !sidebar) return;
  const scrim = document.createElement("div");
  scrim.setAttribute("data-nav-scrim", "");
  scrim.hidden = true;
  document.body.appendChild(scrim);
  toggle.setAttribute("aria-expanded", "false");
  const wide = matchMedia("(min-width: 1024px)");
  const setOpen = (open, { restore = true, focus = true } = {}) => {
    root.toggleAttribute("data-nav-open", open);
    scrim.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) { if (focus) sidebar.querySelector("a,button,input")?.focus({ preventScroll: true }); }
    else if (restore) toggle.focus({ preventScroll: true });
  };
  toggle.addEventListener("click", () => setOpen(!root.hasAttribute("data-nav-open")));
  scrim.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && root.hasAttribute("data-nav-open")) setOpen(false); });
  sidebar.addEventListener("click", (e) => { if (e.target.closest("a[href]") && !wide.matches) setOpen(false, { restore: false }); });
  wide.addEventListener("change", () => { if (wide.matches) setOpen(false, { restore: false }); });

  // Swipe to open and close the menu (Settings > Personalize > Gestures & navigation). Only for Staff and Client pages whose person has
  // saved a Personalize choice; every other page has no swipe, as before. Vertical scrolling never starts a gesture.
  const pp = location.pathname.split("/")[1];
  const config = () => {
    // (The Resident's Settings has the same Gestures page, so the choices there must do something too: they used to be saved and ignored.)
    if (pp !== "staff" && pp !== "client" && pp !== "resident" && pp !== "admin") return null;
    try { const ui = JSON.parse(localStorage.getItem(`ui-prefs:${pp}`) || "null"); return ui ? gestureConfig(ui) : null; } catch { return null; }
  };
  let drag = null;
  const place = (x) => { sidebar.style.animation = "none"; sidebar.style.transform = `translateX(${Math.round(x)}px)`; };
  const finish = (commit) => {
    const d = drag;
    drag = null;
    if (!d || !d.engaged) return;
    sidebar.style.animation = "";
    sidebar.style.transform = "";
    setOpen(d.open ? !commit : commit, { restore: false, focus: false });
  };
  document.addEventListener("touchstart", (e) => {
    const cfg = config();
    if (!cfg || !cfg.on || wide.matches || e.touches.length !== 1) return;
    const t = e.touches[0];
    const open = root.hasAttribute("data-nav-open");
    if (open && !cfg.close) return;
    if (!open && (cfg.side === "right" ? innerWidth - t.clientX : t.clientX) > (cfg.zone === "any" ? innerWidth * 0.5 : 24)) return;
    drag = { x: t.clientX, y: t.clientY, at: Date.now(), open, cfg, engaged: false, dx: 0 };
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (!drag) return;
    const t = e.touches[0];
    const dx = t.clientX - drag.x;
    const dy = t.clientY - drag.y;
    const towardOpen = drag.cfg.side === "right" ? -dx : dx; // positive moves the menu further in
    if (!drag.engaged) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; } // a scroll, not a swipe
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (drag.open ? towardOpen > 0 : towardOpen < 0) { drag = null; return; } // wrong way
      drag.engaged = true;
      if (!drag.open) setOpen(true, { restore: false, focus: false });
    }
    drag.dx = towardOpen;
    if (drag.cfg.follow) {
      const w = sidebar.offsetWidth || 320;
      const sign = drag.cfg.side === "right" ? 1 : -1; // the closed position is -w on the left, +w on the right
      const shown = Math.min(w, Math.max(0, (drag.open ? w : 0) + towardOpen)); // how much of the menu is in view
      place(sign * (w - shown));
    }
  }, { passive: true });
  document.addEventListener("touchend", () => {
    if (!drag) return;
    const w = sidebar.offsetWidth || 320;
    const moved = Math.abs(drag.dx);
    const fast = moved / Math.max(1, Date.now() - drag.at) > 0.5; // a quick flick counts
    finish(moved >= w * drag.cfg.ratio || fast);
  });
  document.addEventListener("touchcancel", () => finish(false));
})();

// Nhóm thu gọn (Communication, Operations, Hide/Show…): HTML chụp là bản tĩnh nên bấm không có phản ứng.
// Nối lại: đổi aria-expanded, data-open (Base UI) và ẩn/hiện phần nội dung kế bên.
document.addEventListener("click", (e) => {
  const trigger = e.target.closest('[data-slot="collapsible-trigger"]');
  if (!trigger) return;
  const box = trigger.closest('[data-slot="collapsible"]');
  const panel = box?.querySelector(':scope > [data-slot="collapsible-content"]');
  if (!box || !panel) return;
  const open = trigger.getAttribute("aria-expanded") !== "true";
  trigger.setAttribute("aria-expanded", String(open));
  for (const el of [box, panel]) el.toggleAttribute("data-open", open);
  trigger.toggleAttribute("data-panel-open", open);
  panel.hidden = !open;
});

// Ticket box: mục cuối của nhóm "Services" trong sidebar, mở /<portal>/tickets.html, kèm số ticket đang mở.
// Portal chưa có nhóm "Services" (Client, Admin, Resident) thì tạo nhóm đó bằng cách nhân bản một nhóm có sẵn.
// Nhân bản đúng các mục menu có sẵn nên dùng lại class của bản chụp; chỉ đổi biểu tượng, nhãn, đường dẫn và số.
(async () => {
  const portalName = location.pathname.split("/")[1];
  if (!["staff", "admin", "client", "resident"].includes(portalName)) return;
  if (standaloneApp) return;
  const triggerOf = (g) => g.querySelector(':scope > [data-slot="collapsible-trigger"]');
  const groups = [...document.querySelectorAll('[data-slot="collapsible"][data-sidebar="group"]')].filter(triggerOf);
  if (!groups.length) return;
  let services = groups.find((g) => /^Services/.test(triggerOf(g).textContent.trim()));
  const created = !services;
  if (!services) {
    // Tạo nhóm "Services": nhân bản nhóm cuối cùng, bỏ hết mục, đặt trước nhóm cuối (Settings/System/Account).
    const model = groups[groups.length - 1];
    services = model.cloneNode(true);
    services.setAttribute("data-key", "Services");
    services.removeAttribute("data-id");
    const trig = triggerOf(services);
    trig.firstElementChild.textContent = "Services";
    const items = services.querySelector('ul[data-slot="sidebar-menu"]');
    while (items.children.length > 1) items.lastElementChild.remove();
    (groups.length > 1 ? groups[groups.length - 1] : model).before(services);
    const tail = trig.querySelector(".tabular-nums");
    if (tail) tail.textContent = "0";
  }
  const list = services.querySelector('ul[data-slot="sidebar-menu"]');
  // Mục mẫu: mục cuối của nhóm (cùng kiểu thụt lề, đường nối, biểu tượng, nhãn).
  const li = list.lastElementChild.cloneNode(true);
  li.querySelectorAll('[data-slot="sidebar-menu-action"]').forEach((x) => x.remove()); // nút ghim sao
  const a = li.querySelector('a[data-slot="sidebar-menu-button"]');
  if (!a) return;
  a.removeAttribute("aria-current");
  a.removeAttribute("data-active");
  a.setAttribute("href", `/${portalName}/tickets.html${location.search}`);
  const icon = a.querySelector("span");
  icon.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v2"></path><path d="M13 17v2"></path><path d="M13 11v2"></path></svg>';
  const label = [...a.children].find((c) => c !== icon);
  if (label) label.textContent = "Ticket box";
  a.querySelectorAll('[data-slot="badge"]').forEach((x) => x.remove());
  const count = document.createElement("span");
  count.setAttribute("data-slot", "badge");
  count.className = "inline shrink-0 items-center justify-center rounded-full bg-primary px-step-sm py-0.5 text-xs font-normal whitespace-nowrap text-primary-foreground";
  count.hidden = true;
  a.appendChild(count);
  if (created) list.replaceChildren(); // nhóm mới chỉ chứa Ticket box, không giữ mục của nhóm đã nhân bản
  list.appendChild(li);
  if (portalName === "resident") {
    // Resident không có mục Settings trong sidebar chụp: thêm "Settings" ngay sau Ticket box (Profile, Personalize, My property).
    const set = li.cloneNode(true);
    const sa = set.querySelector('a[data-slot="sidebar-menu-button"]');
    sa.setAttribute("href", `/resident/settings.html${location.search}`);
    sa.querySelector("span").innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    [...sa.children].find((c) => c !== sa.querySelector("span")).textContent = "Settings";
    sa.querySelectorAll('[data-slot="badge"]').forEach((x) => x.remove());
    sa.removeAttribute("aria-label");
    list.appendChild(set);
  }
  // Số mục của nhóm (ví dụ "Services 4") tăng thêm một.
  const tally = triggerOf(services).querySelector(".tabular-nums");
  if (tally && /^\d+$/.test(tally.textContent.trim())) tally.textContent = String(Number(tally.textContent) + 1);
  // Client: "Usage", a group of its own under Services (Ticket box) and above Settings. Its Capacity page is where the plan's three limits
  // (properties, parking spots, staff seats) are explained; "Manage Capacity" on the Capacity summary card opens it.
  if (portalName === "client") {
    const usage = services.cloneNode(true);
    usage.setAttribute("data-key", "Usage");
    usage.removeAttribute("data-id");
    triggerOf(usage).firstElementChild.textContent = "Usage";
    const uTally = triggerOf(usage).querySelector(".tabular-nums");
    if (uTally) uTally.textContent = "1";
    const uList = usage.querySelector('ul[data-slot="sidebar-menu"]');
    const uItem = uList.lastElementChild.cloneNode(true);
    const ua = uItem.querySelector('a[data-slot="sidebar-menu-button"]');
    ua.querySelectorAll('[data-slot="badge"]').forEach((x) => x.remove());
    ua.removeAttribute("aria-label");
    ua.setAttribute("href", `/client/usage/capacity.html${location.search}`);
    ua.querySelector("span").innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true"><path d="m12 14 4-4"></path><path d="M3.34 19a10 10 0 1 1 17.32 0"></path></svg>';
    [...ua.children].find((c) => c !== ua.querySelector("span")).textContent = "Capacity";
    uList.replaceChildren(uItem);
    services.after(usage);
  }
  try {
    const [{ createStore }, { createTransport }, { pickPersona }] = await Promise.all([
      import("./messaging/store.js"), import("./messaging/transport.js"), import("./messaging/personas.js"),
    ]);
    const me = pickPersona(portalName, new URLSearchParams(location.search).get("as"));
    const store = createStore({ transport: createTransport() });
    const refresh = () => {
      const n = store.ticketCounts(me.id).open;
      count.textContent = String(n);
      count.hidden = !n;
      a.setAttribute("aria-label", n ? `Ticket box, ${n} open` : "Ticket box");
    };
    refresh();
    store.subscribe(refresh);
  } catch { /* the link still works without the count */ }
})();

// Messages (ngoại lệ có chủ đích so với BRIEF, xem docs/messaging-design.md):
// sidebar chụp từ app thật để mọi mục là href="#". Nối mục Messages tới trang Messages riêng của portal,
// không sửa HTML gốc. Là thẻ <a> thật nên mở tab mới, chuột giữa và nút Back của trình duyệt đều hoạt động.
const portal = location.pathname.split("/")[1];

// Các dashboard cuộn trong vùng <main> riêng nên trình duyệt không tự khôi phục vị trí cuộn khi bấm Back.
// Nhớ vị trí lúc rời trang và đặt lại khi quay về (chỉ khi là điều hướng Back/Forward).
const scroller = () => document.getElementById("main-content");
if (["staff", "admin", "client", "resident"].includes(portal) && !standaloneApp) {
  const key = `eso-scroll:${location.pathname}`;
  addEventListener("pagehide", () => {
    const el = scroller();
    if (el) sessionStorage.setItem(key, String(el.scrollTop));
  });
  const nav = performance.getEntriesByType("navigation")[0];
  // Back/Forward, or "Exit" from a page of its own (Messages, Social, Ticket box…) to the dashboard it was opened from: the dashboard comes back where it was left.
  let fromOwnPage = false;
  try { fromOwnPage = /\/(dashboard|home)\.html$/.test(location.pathname) && new URL(document.referrer).origin === location.origin && /\/(messages|social|tickets|support|notifications|promotions)\.html$/.test(new URL(document.referrer).pathname); } catch { /* no referrer */ }
  // The page fills in after it loads (charts, cards), and the frame may replace the scrolling area while it builds: keep putting the position back
  // for up to 3 seconds (not stopping at the first success), and stop as soon as the person scrolls.
  const restore = () => {
    const top = Number(sessionStorage.getItem(key) || 0);
    if (!top) return;
    let tries = 0;
    let touched = false;
    const stop = () => { touched = true; };
    for (const ev of ["wheel", "touchstart", "keydown", "pointerdown"]) addEventListener(ev, stop, { once: true, passive: true });
    const put = () => {
      if (touched) return;
      const el = scroller();
      if (el && Math.abs(el.scrollTop - top) >= 2) el.scrollTop = top;
      if (++tries < 30) setTimeout(put, 100);
    };
    setTimeout(put, 0); // not requestAnimationFrame: a page in a hidden tab never gets one
  };
  if (nav && (nav.type === "back_forward" || (nav.type === "navigate" && fromOwnPage))) restore();
  addEventListener("pageshow", (e) => { if (e.persisted) restore(); }); // coming back from the browser's page cache runs no script again
}
if (["staff", "admin", "client", "resident"].includes(portal) && !standaloneApp) {
  const labels = new Set(["Messages", "Messaging & Support"]);
  // Other items that have a real page: Staff Settings and Promotions open the account-settings page (Promotions is a section of it);
  // the Resident Promotions item opens the page that lists what Staff published.
  const pages = {
    // "Dashboard" is the page's own home: on the dashboard itself it used to be a dead "#" that answered "not part of this preview yet".
    staff: { Dashboard: "/staff/dashboard.html", Settings: "/staff/workspace.html", Promotions: "/staff/promotions.html", Social: "/staff/social.html" },
    client: { Dashboard: "/client/dashboard.html", "Workspace Settings": "/client/workspace.html", Support: "/client/support.html", Documents: "/client/documents.html" },
    resident: { Dashboard: "/resident/home.html", Promotions: "/resident/promotions.html", Social: "/resident/social.html" },
    admin: { Dashboard: "/admin/dashboard.html", Support: "/admin/tickets.html", Settings: "/admin/settings.html", Profile: "/admin/settings/profile.html" }, // the Support inbox of the Admin portal is the Ticket box
  }[portal] || {};
  for (const a of document.querySelectorAll('a[data-slot="sidebar-menu-button"]')) {
    const label = a.querySelector("span.truncate")?.textContent.trim();
    if (label && labels.has(label)) a.setAttribute("href", `/${portal}/messages.html${location.search}`);
    else if (label && pages[label]) {
      const [path, hash = ""] = pages[label].split("#");
      a.setAttribute("href", `${path}${location.search}${hash ? "#" + hash : ""}`);
    }
  }
}

// The Property filter on a dashboard is a picture of a select: it opens no list, and a person could type into it ("All Properties dsds").
// A select is not typed into, so it is read-only (the design's own read-only look comes with it).
for (const i of document.querySelectorAll('main input[role="combobox"]')) i.readOnly = true;
// The Client's Property filter also opens a list of the company's properties (property-filter.js).
if (document.querySelector('main input[role="combobox"][aria-label="Property"]')) (await import("./property-filter.js")).wirePropertyFilter();

// Client: bỏ nhãn "PRO" cạnh Recovery trong sidebar; header hiện đúng người dùng (cùng persona với trang Messages) và menu hồ sơ bấm được.
// Menu hồ sơ trong bản chụp là tĩnh (bấm không ra gì), nên dựng lại bằng đúng các mục của trang Settings.
// Class của menu lấy từ các mẫu đã có trong partials/messages-app.html (đã nằm trong CSS build).
if (portal === "client") {
  for (const b of document.querySelectorAll('[data-slot="sidebar-container"] span')) if (!b.children.length && b.textContent.trim() === "PRO") b.remove();
  // The label above the page title names the account. A Client is a company (AMC LLC) with several properties; Mallard Pointe is one of them.
  for (const p of document.querySelectorAll("main p, header p")) if (!p.children.length && p.textContent.trim() === "Mallard Pointe Management") p.textContent = "AMC LLC";
  const trigger = document.querySelector('header button[aria-label^="Open profile menu"]');
  if (trigger) {
    (async () => {
      try {
        const { pickPersona, initials } = await import("./messaging/personas.js");
        const me = pickPersona("client", new URLSearchParams(location.search).get("as"));
        const spans = [...trigger.querySelectorAll("span")].filter((s) => !s.children.length);
        for (const s of spans) {
          const t = s.textContent.trim();
          if (t === "User 7") s.textContent = me.name;
          else if (t === "Client") s.textContent = me.title;
          else if (t === "QC") s.textContent = initials(me.name);
        }
        trigger.setAttribute("aria-label", `Open profile menu for ${me.name}`);
        // The menu is the one from the account-settings design (name card, Status, Account, Sign out); see portal-frame-extras.js.
        (await import("./portal-frame-extras.js")).addProfileMenu({ me, initials });
      } catch { /* the header stays as captured */ }
    })();
  }
}

// Settings, Workspace and Support of the Client: each has an address of its own (/client/settings/profile, /client/workspace, /client/support… see
// staff-routes.js) and is the Client dashboard's frame (same header, same sidebar) with the settings page inside it, built like the Staff ones (EMBED below).
// The old address /client/account-settings.html#/… leads to the new one.
if (location.pathname === "/client/account-settings.html") {
  const h = location.hash || "#/workspace";
  location.replace(`${pathForHash(h, "client") || "/client/workspace.html"}${location.search}${pathForHash(h, "client") ? "" : h}`);
}

// Notifications, Messages và Ticket box của Client: cùng khung dashboard Client (cùng header, cùng sidebar, nên chỉ có một kiểu),
// nội dung là trang *-content.html nhúng trong iframe cùng gốc, giống cách trang Settings được dựng ở trên.
// `active` là mục sidebar được tô; null thì không mục nào được tô.
const EMBED = {
  "/client/notifications.html": { title: "Notifications", src: "/client/notifications-content.html", active: null },
  "/client/messages.html": { title: "Messages", src: "/client/messages-content.html", active: "Messages" },
  "/client/tickets.html": { title: "Ticket box", src: "/client/tickets-content.html", active: "Ticket box" },
  "/client/documents.html": { title: "Documents", src: "/client/documents-content.html", active: "Documents" },
  "/client/usage/capacity.html": { title: "Capacity", src: "/client/usage-content.html", active: "Capacity" },
  "/staff/notifications.html": { title: "Notifications", src: "/staff/notifications-content.html", active: null },
  "/resident/notifications.html": { title: "Notifications", src: "/resident/notifications-content.html", active: null },
  "/staff/messages.html": { title: "Messages", src: "/staff/messages-content.html", active: "Messages" },
  "/staff/tickets.html": { title: "Ticket box", src: "/staff/tickets-content.html", active: "Ticket box" },
  // Staff Settings, Workspace, Promotions and Help Center: each has an address of its own (see staff-routes.js) and shows the settings page inside the frame.
  ...Object.fromEntries(STAFF_ROUTES.map(([hash, path]) => [path, {
    title: hash === "#/promotions" ? "Promotions" : hash === "#/support" ? "Help Center" : "Settings",
    src: "/staff/account-settings-content.html",
    hash,
    active: hash === "#/promotions" ? "Promotions" : hash === "#/support" ? null : "Settings",
  }])),
  // Client Settings, Workspace and Support.
  ...Object.fromEntries(CLIENT_ROUTES.map(([hash, path]) => [path, {
    title: hash === "#/support" ? "Support" : "Workspace settings",
    src: "/client/account-settings-content.html",
    hash,
    active: hash === "#/support" ? "Support" : "Workspace Settings",
  }])),
  // Resident Settings: the same page as Staff's, without Workspace. Its sections have addresses like /resident/settings/personalize.
  ...Object.fromEntries(RESIDENT_ROUTES.map(([hash, path]) => [path, { title: "Settings", src: "/resident/settings-content.html", hash, active: "Settings" }])),
  "/resident/promotions.html": { title: "Promotions", src: "/resident/promotions-content.html", active: "Promotions" },
  "/resident/messages.html": { title: "Messages", src: "/resident/messages-content.html", active: "Messages" },
  "/resident/tickets.html": { title: "Ticket box", src: "/resident/tickets-content.html", active: "Ticket box" },
  // Admin: Notifications, Messaging & Support, the Ticket box (the "Support" menu item) and Settings all sit inside the Admin frame (its own sidebar and header).
  "/admin/notifications.html": { title: "Notifications", src: "/admin/notifications-content.html", active: null },
  "/admin/messages.html": { title: "Messaging & Support", src: "/admin/messages-content.html", active: "Messaging & Support" },
  "/admin/tickets.html": { title: "Ticket box", src: "/admin/tickets-content.html", active: "Support" },
  "/admin/health.html": { title: "System health", src: "/admin/health-content.html", active: "System health" },
  "/admin/social-management.html": { title: "Social management", src: "/admin/social-management-content.html", active: "Social management" },
  "/admin/social-monitoring.html": { title: "Social monitoring", src: "/admin/social-monitoring-content.html", active: "Social monitoring" },
  ...Object.fromEntries(ADMIN_ROUTES.map(([hash, path]) => [path, { title: "Settings", src: "/admin/settings-content.html", hash, active: "Settings" }])),
};
if (!EMBED[location.pathname]) root.removeAttribute("data-eso-wait");
if (EMBED[location.pathname]) {
  const page = EMBED[location.pathname];
  const main = document.getElementById("main-content");
  const header = document.querySelector("header");
  if (main) {
    const label = { client: "Client", staff: "Staff", resident: "Resident", admin: "Admin" }[portal];
    document.title = `${page.title} | ${label} Portal · ${portal} preview`;
    // Mục đang mở của bản chụp là Dashboard: chuyển dấu sang mục của trang này (đổi class giữa hai mục), hoặc bỏ dấu nếu không có mục nào
    // (đổi class với một bản sao của mục không mở).
    const links = [...document.querySelectorAll('a[data-slot="sidebar-menu-button"]')];
    const current = links.find((a) => a.hasAttribute("aria-current"));
    const target = page.active && links.find((a) => a.querySelector("span.truncate")?.textContent.trim() === page.active);
    const spare = target || links.find((a) => a !== current && !a.hasAttribute("aria-current") && a.querySelector(":scope > span.grid"));
    if (current && spare && current !== spare) {
      const other = target ? spare : spare.cloneNode(true);
      const swap = (x, y) => { if (!x || !y) return; const t = x.getAttribute("class"); x.setAttribute("class", y.getAttribute("class") || ""); y.setAttribute("class", t || ""); };
      swap(current, other);
      swap(current.querySelector(":scope > span.grid"), other.querySelector(":scope > span.grid"));
      swap(current.querySelector(":scope > span.truncate"), other.querySelector(":scope > span.truncate"));
      const bar = current.querySelector(':scope > span[aria-hidden="true"]:not(.grid)');
      if (target && bar) other.prepend(bar); else bar?.remove();
      current.removeAttribute("aria-current");
      current.removeAttribute("data-active");
      if (target) { other.setAttribute("aria-current", "page"); other.setAttribute("data-active", ""); }
      current.setAttribute("href", `/${portal}/${portal === "resident" ? "home" : "dashboard"}.html${location.search}`);
    }
    const frame = document.createElement("iframe");
    frame.title = page.title;
    const q = new URLSearchParams(location.search);
    q.set("embed", "1");
    frame.src = `${page.src}?${q}${location.hash || page.hash || ""}`;
    frame.style.cssText = "display:block;width:100%;border:0;background:transparent";
    main.replaceChildren(frame);
    frame.addEventListener("load", () => root.removeAttribute("data-eso-wait")); // (partials/head.html keeps the middle of the page empty until now)
    main.style.cssText = "padding:0;max-width:none;overflow:hidden";
    if (page.hash) root.setAttribute("data-eso-settings", ""); // styles.css lifts the floating assistant above the Settings search bar on small screens
    const fit = () => { frame.style.height = `${Math.max(320, innerHeight - (header ? header.offsetHeight : 0))}px`; };
    fit();
    addEventListener("resize", fit);
  }
}

// Resident: nhớ lựa chọn của chính cư dân (Settings). Theme đã lưu áp dụng cho mọi trang Resident (trừ khi có ?dark),
// và mục Social trong sidebar ẩn đi khi cư dân tắt Social (hoặc Staff tắt Social cho cả tòa nhà).
if (portal === "resident" && !isPrototypePage) {
  (async () => {
    try {
      const [{ pickPersona }, prefs, social] = await Promise.all([
        import("./messaging/personas.js"), import("./settings/prefs.js"), import("./social/store.js"),
      ]);
      const me = pickPersona("resident", new URLSearchParams(location.search).get("as"));
      const saved = prefs.readPrefs(localStorage, me.id);
      // The Settings page (Personalize, Accessibility) writes "ui-prefs:resident" and applyUiPrefs() applies it; the older per-resident choices
      // only count until that page has been used.
      let ui = null;
      try { ui = JSON.parse(localStorage.getItem("ui-prefs:resident") || "null"); } catch { /* none */ }
      if (!ui || !ui.a11y) {
        root.toggleAttribute("data-contrast", saved.contrast);
        root.toggleAttribute("data-reduce-motion", saved.reduceMotion);
      }
      if (!new URLSearchParams(location.search).has("dark") && !(ui && ui.theme)) {
        const sys = matchMedia("(prefers-color-scheme: dark)");
        const theme = prefs.readPrefs(localStorage, me.id).theme;
        if (theme !== "system" || sys.matches) setDark(prefs.isDark(theme, sys.matches));
      }
      const sync = () => {
        const hidden = !social.socialOn(localStorage) || !social.residentState(localStorage, me.id).show;
        for (const a of document.querySelectorAll('a[data-slot="sidebar-menu-button"]')) {
          if (a.querySelector("span.truncate")?.textContent.trim() === "Social") (a.closest("li") || a).hidden = hidden;
        }
      };
      sync();
      addEventListener("storage", sync);
    } catch { /* the sidebar still works without these */ }
  })();
}
