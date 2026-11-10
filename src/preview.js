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
