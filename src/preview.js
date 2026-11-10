// Chỉ đổi giao diện: bật/tắt dark qua ?dark (app thật dùng next-themes: class `light`/`dark` trên <html>).
const root = document.documentElement;
// Các dashboard chụp từ app thật ghi lang="vi" nhưng nội dung là tiếng Anh: trình đọc màn hình sẽ đọc sai giọng. Đặt lại đúng ngôn ngữ của nội dung.
if (root.lang === "vi") root.lang = "en";
const setDark = (on) => {
  root.classList.toggle("dark", on);
  root.classList.toggle("light", !on);
};
if (new URLSearchParams(location.search).has("dark")) setDark(true);
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-theme-toggle]")) setDark(!root.classList.contains("dark"));
});

// Nút theme của dashboard (aria-label "Theme: ...") không có data-theme-toggle trong HTML chụp: nối lại.
document.addEventListener("click", (e) => {
  if (e.target.closest('button[aria-label^="Theme:"]')) setDark(!root.classList.contains("dark"));
});

// Cá nhân hóa chọn trong trang Settings (Staff và Client): màu sidebar, theme và màu nhấn đi theo người dùng sang các trang thật.
// Trang Settings ghi `ui-prefs:<portal>` mỗi khi người dùng đổi; chưa đổi gì thì không có khóa này và các trang giữ nguyên diện mạo gốc.
// Trang prototype (nội dung Settings) tự quản lý giao diện của nó; mọi trang còn lại, kể cả khung dashboard bọc Settings của Client, nhận từ đây.
const isPrototypePage = /\/staff\/account-settings\.html$|\/account-settings-content\.html$/.test(location.pathname);
const applyUiPrefs = () => {
  const p = location.pathname.split("/")[1];
  if ((p === "staff" || p === "client") && !isPrototypePage) {
    try {
      const ui = JSON.parse(localStorage.getItem(`ui-prefs:${p}`) || "null");
      const hex = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
      if (ui) {
        const s = root.style;
        if (Array.isArray(ui.sb) && ui.sb.slice(0, 4).every(hex)) {
          const [bg, fg, acc, accent] = ui.sb;
          s.setProperty("--sidebar", bg);
          s.setProperty("--sidebar-foreground", fg);
          s.setProperty("--sidebar-accent", acc);
          s.setProperty("--sidebar-accent-foreground", fg);
          s.setProperty("--sidebar-primary", accent);
          s.setProperty("--sidebar-border", acc);
        }
        if (!new URLSearchParams(location.search).has("dark")) {
          if (ui.theme === "dark") setDark(true);
          else if (ui.theme === "light") setDark(false);
          else if (ui.theme === "system") setDark(matchMedia("(prefers-color-scheme: dark)").matches);
        }
        // Tùy chọn sidebar còn áp dụng được cho sidebar thật: biểu tượng, số đếm nhóm, thẻ tổng quan (CSS theo thuộc tính nằm trong styles.css).
        root.setAttribute("data-sb-icons", ui.icons === false ? "off" : "on");
        root.setAttribute("data-sb-counts", ui.counts === false ? "off" : "on");
        const overview = [...document.querySelectorAll('[data-slot="sidebar-container"] p')].find((e) => e.textContent.trim() === "Portfolio Overview");
        const card = overview && overview.closest('section[data-slot="card"]');
        if (card) card.hidden = ui.cap === false;
        if (hex(ui.accent) && ui.accent.toLowerCase() !== "#2b55f2") { root.style.setProperty("--primary", ui.accent); root.style.setProperty("--sidebar-primary", ui.accent); }
      }
    } catch { /* trang vẫn dùng diện mạo gốc */ }
  }
};
applyUiPrefs();
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
  const setOpen = (open, { restore = true } = {}) => {
    root.toggleAttribute("data-nav-open", open);
    scrim.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) sidebar.querySelector("a,button,input")?.focus({ preventScroll: true });
    else if (restore) toggle.focus({ preventScroll: true });
  };
  toggle.addEventListener("click", () => setOpen(!root.hasAttribute("data-nav-open")));
  scrim.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && root.hasAttribute("data-nav-open")) setOpen(false); });
  sidebar.addEventListener("click", (e) => { if (e.target.closest("a[href]") && !wide.matches) setOpen(false, { restore: false }); });
  wide.addEventListener("change", () => { if (wide.matches) setOpen(false, { restore: false }); });
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
  if (location.pathname.endsWith("/messages.html") || location.pathname.endsWith("/tickets.html")) return;
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
if (["staff", "admin", "client", "resident"].includes(portal) && !location.pathname.endsWith("/messages.html")) {
  const key = `eso-scroll:${location.pathname}`;
  addEventListener("pagehide", () => {
    const el = scroller();
    if (el) sessionStorage.setItem(key, String(el.scrollTop));
  });
  const nav = performance.getEntriesByType("navigation")[0];
  if (nav && nav.type === "back_forward") {
    const top = Number(sessionStorage.getItem(key) || 0);
    if (top) requestAnimationFrame(() => { const el = scroller(); if (el) el.scrollTop = top; });
  }
}
if (["staff", "admin", "client", "resident"].includes(portal) && !location.pathname.endsWith("/messages.html")) {
  const labels = new Set(["Messages", "Messaging & Support"]);
  // Other items that have a real page: Staff Settings and Promotions open the account-settings page (Promotions is a section of it);
  // the Resident Promotions item opens the page that lists what Staff published.
  const pages = {
    staff: { Settings: "/staff/account-settings.html#/workspace", Promotions: "/staff/account-settings.html#/promotions" },
    client: { "Workspace Settings": "/client/account-settings.html#/workspace" },
    resident: { Promotions: "/resident/promotions.html", Social: "/resident/social.html" },
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

// Client: bỏ nhãn "PRO" cạnh Recovery trong sidebar; header hiện đúng người dùng (cùng persona với trang Messages) và menu hồ sơ bấm được.
// Menu hồ sơ trong bản chụp là tĩnh (bấm không ra gì), nên dựng lại bằng đúng các mục của trang Settings.
// Class của menu lấy từ các mẫu đã có trong partials/messages-app.html (đã nằm trong CSS build).
if (portal === "client") {
  for (const b of document.querySelectorAll('[data-slot="sidebar-container"] span')) if (!b.children.length && b.textContent.trim() === "PRO") b.remove();
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
        const q = location.search;
        const base = `/client/account-settings.html${q}`;
        const items = [
          ["Profile settings", `${base}#/settings`],
          ["Messenger & availability", `${base}#/settings/availability`],
          ["My permissions", `${base}#/workspace/access`],
          ["Notification preferences", `${base}#/settings/notifications`],
        ];
        const itemClass = "flex min-h-8 w-full touch-manipulation items-center gap-step-sm rounded-md px-step-sm py-1 text-left text-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:min-h-11";
        const menu = document.createElement("div");
        menu.setAttribute("role", "menu");
        menu.setAttribute("aria-label", "Profile menu");
        menu.hidden = true;
        menu.className = "fixed z-popup flex w-52 flex-col rounded-lg bg-card p-1 text-foreground shadow-lift-md ring-1 ring-foreground/10";
        const head = document.createElement("div");
        head.className = "flex flex-col px-step-sm py-step-sm";
        const n = Object.assign(document.createElement("span"), { textContent: me.name });
        n.className = "truncate text-sm font-medium";
        const r = Object.assign(document.createElement("span"), { textContent: `${me.title} · ${me.org}` });
        r.className = "truncate text-xs text-muted-foreground";
        head.append(n, r);
        menu.append(head);
        for (const [label, href] of items) {
          const a = Object.assign(document.createElement("a"), { href, textContent: label });
          a.setAttribute("role", "menuitem");
          a.className = itemClass;
          a.addEventListener("click", () => { menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); }); // đi tới mục xong thì menu đóng
          menu.append(a);
        }
        const out = Object.assign(document.createElement("button"), { type: "button", textContent: "Sign out" });
        out.setAttribute("role", "menuitem");
        out.className = itemClass;
        out.addEventListener("click", () => {
          const box = document.createElement("div");
          box.className = "fixed inset-x-0 top-step-lg z-toast flex flex-col items-center px-step-lg";
          const t = Object.assign(document.createElement("div"), { textContent: "Signing out is not part of this preview." });
          t.setAttribute("role", "status");
          t.className = "pointer-events-auto flex max-w-md items-center gap-step-md rounded-lg bg-foreground px-step-lg py-step-md text-sm text-background shadow-lift-md";
          box.append(t);
          document.body.append(box);
          setTimeout(() => box.remove(), 3500);
          close();
        });
        menu.append(out);
        document.body.append(menu);
        const close = (focusBack) => { menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); if (focusBack) trigger.focus(); };
        const open = () => {
          const b = trigger.getBoundingClientRect();
          menu.style.top = `${Math.round(b.bottom + 4)}px`;
          menu.style.right = `${Math.max(8, Math.round(innerWidth - b.right))}px`;
          menu.hidden = false;
          trigger.setAttribute("aria-expanded", "true");
          menu.querySelector('[role="menuitem"]').focus();
        };
        trigger.addEventListener("click", (e) => { e.stopPropagation(); if (menu.hidden) open(); else close(); });
        document.addEventListener("click", (e) => { if (!menu.hidden && !menu.contains(e.target)) close(); });
        menu.addEventListener("keydown", (e) => {
          const list = [...menu.querySelectorAll('[role="menuitem"]')];
          const i = list.indexOf(document.activeElement);
          if (e.key === "Escape") { e.preventDefault(); close(true); }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length].focus(); }
        });
      } catch { /* the header stays as captured */ }
    })();
  }
}

// Settings của Client: /client/account-settings.html là CHÍNH khung dashboard Client (cùng header, cùng sidebar, nên hai nơi luôn giống nhau),
// phần nội dung được thay bằng trang Settings (account-settings-content.html) nhúng trong một iframe cùng gốc.
// Sidebar là bản dựng thật nên không còn sidebar thứ hai do prototype tự vẽ.
if (portal === "client" && location.pathname.endsWith("/client/account-settings.html")) {
  const main = document.getElementById("main-content");
  const header = document.querySelector("header");
  if (main) {
    document.title = "Workspace settings | Client Portal · client preview";
    // Menu: "Workspace Settings" là mục đang mở, Dashboard thì đi về trang dashboard.
    // Mục đang mở trong bản chụp tô màu bằng class, nên đổi chỗ class giữa hai mục (cùng cấu trúc) thay vì chỉ đổi thuộc tính.
    const links = [...document.querySelectorAll('a[data-slot="sidebar-menu-button"]')];
    const byLabel = (t) => links.find((a) => a.querySelector("span.truncate")?.textContent.trim() === t);
    const current = links.find((a) => a.hasAttribute("aria-current"));
    const settings = byLabel("Workspace Settings");
    if (current && settings && current !== settings) {
      // Mục đang mở có thêm thanh nhấn ở đầu (span aria-hidden); đổi class của mục, ô biểu tượng và nhãn, rồi chuyển thanh nhấn sang mục mới.
      const swap = (x, y) => { if (!x || !y) return; const t = x.getAttribute("class"); x.setAttribute("class", y.getAttribute("class") || ""); y.setAttribute("class", t || ""); };
      swap(current, settings);
      swap(current.querySelector(":scope > span.grid"), settings.querySelector(":scope > span.grid"));
      swap(current.querySelector(":scope > span.truncate"), settings.querySelector(":scope > span.truncate"));
      const bar = current.querySelector(':scope > span[aria-hidden="true"]:not(.grid)');
      if (bar) settings.prepend(bar);
      current.removeAttribute("aria-current");
      current.removeAttribute("data-active");
      settings.setAttribute("aria-current", "page");
      settings.setAttribute("data-active", "");
    }
    const dash = byLabel("Dashboard");
    if (dash) dash.setAttribute("href", `/client/dashboard.html${location.search}`);
    const frame = document.createElement("iframe");
    frame.title = "Workspace settings";
    const q = new URLSearchParams(location.search);
    q.set("embed", "1");
    frame.src = `/client/account-settings-content.html?${q}${location.hash}`;
    frame.style.cssText = "display:block;width:100%;border:0;background:transparent";
    main.replaceChildren(frame);
    main.style.cssText = "padding:0;max-width:none;overflow:hidden";
    const fit = () => { frame.style.height = `${Math.max(320, innerHeight - (header ? header.offsetHeight : 0))}px`; };
    fit();
    addEventListener("resize", fit);
    // Hash của trang khung ↔ hash của nội dung (mục sidebar, nút Back và đường dẫn đều đi đúng chỗ).
    addEventListener("hashchange", () => { try { if (frame.contentWindow.location.hash !== location.hash) frame.contentWindow.location.hash = location.hash; } catch { /* khung chưa tải */ } });
  }
}

// Resident: nhớ lựa chọn của chính cư dân (Settings). Theme đã lưu áp dụng cho mọi trang Resident (trừ khi có ?dark),
// và mục Social trong sidebar ẩn đi khi cư dân tắt Social (hoặc Staff tắt Social cho cả tòa nhà).
if (portal === "resident") {
  (async () => {
    try {
      const [{ pickPersona }, prefs, social] = await Promise.all([
        import("./messaging/personas.js"), import("./settings/prefs.js"), import("./social/store.js"),
      ]);
      const me = pickPersona("resident", new URLSearchParams(location.search).get("as"));
      const saved = prefs.readPrefs(localStorage, me.id);
      root.toggleAttribute("data-contrast", saved.contrast); // Settings > Personalize > Comfort
      root.toggleAttribute("data-reduce-motion", saved.reduceMotion);
      if (!new URLSearchParams(location.search).has("dark")) {
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
