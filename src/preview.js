// Chỉ đổi giao diện: bật/tắt dark qua ?dark (app thật dùng next-themes: class `light`/`dark` trên <html>).
const root = document.documentElement;
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
  for (const a of document.querySelectorAll('a[data-slot="sidebar-menu-button"]')) {
    const label = a.querySelector("span.truncate")?.textContent.trim();
    if (label && labels.has(label)) a.setAttribute("href", `/${portal}/messages.html${location.search}`);
  }
}
