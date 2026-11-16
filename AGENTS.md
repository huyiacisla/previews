# AGENTS.md

Hướng dẫn cho agent AI (Claude Code, Codex, Cursor…) làm việc trong repo này.

Bản xem trước (preview) giao diện 4 portal EasySpotOps: Staff, Admin, Client, Resident. Đội dev sẽ port bản được duyệt sang app thật. Đọc `BRIEF.md` (phạm vi, được/không được), `DESIGN.md` (luật thiết kế; xung đột thì `DESIGN.md` thắng), `docs/qa/issue-log.md` (nhật ký lỗi và quy tắc rút ra; đọc trước khi làm việc mới).

## Lệnh

```bash
npm install
npm run dev          # Vite, http://localhost:3590 (strictPort)
npm run build        # ra dist/ (mọi .html trong src/ là một input, trừ partials/)
npm test             # node --test "tests/**/*.test.mjs"
node --test tests/social/social-reports.test.mjs   # một file
node --test --test-name-pattern="claim" tests/promotions/promotions.test.mjs   # theo tên
SEED=123 npm test    # phát lại fuzz test
npm run lint         # Biome: lint + format + import (chỉ báo)
npm run fix          # Biome tự sửa
```

Hiện có 1 test lỗi sẵn từ trước: `time frame: only what was uploaded within the last N days` (documents). Không do thay đổi gần đây.

## Kiến trúc

- **Trang là HTML tĩnh, ghép bằng include.** `vite.config.ts` có plugin thay `<!--include:partials/x.html-->` bằng nội dung file (tối đa 3 tầng; một tệp nhúng được tự nhúng tệp khác). Trang `src/<portal>/*-content.html` thường chỉ là `<head>` + một partial + một `<script type="module">`; trang `*.html` cùng tên nhúng bản `-content`. Dev server cũng mở URL không đuôi (`/staff/settings/profile`) thành `.html`.
- **Ba tầng trong `src/`:**
  - `<portal>/` (client, staff, admin, resident, messages): các trang. URL = đường dẫn file, không đổi khi refactor.
  - `features/<miền>/` (messaging, social, notifications, promotions, documents, settings, capacity, usage, health): lõi theo miền.
  - `shared/js` + `shared/css`: khung portal (`portal-frame*.js`), `preview.js` (`?dark`, nút Theme, menu mobile), `access-guard`, `back/exit-target`, `*-prefs`, `property-*`; `ui-tokens.css` là NGUỒN token (Tailwind 4), `styles.css` nạp token.
- **Không có backend.** Mỗi miền theo mẫu: `store.js` thuần (không DOM, nhận `storage` là tham số; localStorage ở trình duyệt, đối tượng giả trong test) + giao diện. Messages dùng thêm `transport.js` (bus; `createMemoryBus()` trong test, BroadcastChannel/storage ở trình duyệt) nên 4 portal mở ở 4 tab thấy nhau. Staff, Resident, Client dùng chung dữ liệu qua các khóa localStorage (`eso-*`), nghe sự kiện `storage` để cập nhật trực tiếp.
- **Persona:** `features/messaging/personas.js` (`pickPersona(portal, ?as=)`) là nguồn danh tính cho mọi portal.
- **Tailwind chỉ quét `.html`**, nên mọi class phải nằm trong HTML/partial, không dựng class bằng JS.
- **Trang tương tác = Alpine.js** (xem dưới). Trang đã chuyển: Admin Command Center, Notifications. Phần còn lại là JS thuần clone `<template>`.
- `src/staff/account-settings-content.html` (~1,3 MB) và `src/admin/*-content.html` là bản chụp/nguyên mẫu lớn tự vẽ bằng chuỗi HTML; đừng đọc cả file, tìm theo hàm.

## Quy định riêng của repo

- **Trang mới BẮT BUỘC dùng Alpine.js** (3.17.5, qua `shared/js/alpine.js`: `component(name, factory)` rồi `start()`). Trang cũ giữ nguyên, chỉ chuyển khi sửa lớn. Cách viết: `docs/design/alpine-migration.md` (logic test được để ở module thuần; kho dữ liệu để ngoài component, không đặt vào dữ liệu Alpine vì Proxy; ẩn/hiện bằng `:hidden`, không `x-show`; `x-cloak` trên gốc). Không thêm thư viện nào khác.
- Màu, cỡ chữ, khoảng cách, bo góc: chỉ dùng token trong `ui-tokens.css`; không khai hex/px riêng. Icon SVG inline (Lucide). Không dữ liệu thật/PII, không gọi API.
- Không ghi đè trang gốc khi thử thiết kế: tạo `<trang>.v2.html`. Trang mới: `src/<portal>/<tên>.html` + link ở `src/index.html`.
- Chất lượng tối thiểu: sáng + tối (`?dark`), AA, kiểm 375 / 830 / 1440.
- Một số comment/test nhắc `DOC-xxxx`, `@easyspotops/ui`: tham chiếu nội bộ của repo dev, bỏ qua.

## Biome và test

- Biome 2 là chuẩn định dạng (`biome.json`: 2 space, lineWidth 200, nháy kép; chỉ quét `src/**/*.js`, `tests/**/*.mjs`, `vite.config.ts`; HTML không quét). Một số luật gây nhiễu đã tắt có chủ đích.
- Test chủ yếu là logic thuần qua store + vài flow nhiều bước (`e2e-flows`, `fuzz` có seed). Không có test giao diện/trình duyệt; giao diện kiểm tay, ghi ở `docs/qa/`.
- Một số test (`messaging-ui`, `social-reports`, `promotions-catalog`, `floating-assistant`…) đọc mã nguồn dạng chuỗi. Dùng `has()` từ `tests/has.mjs` (bỏ qua kiểu nháy, khoảng trắng, dấu phẩy) cho test mới kiểu này, vì Biome sẽ định dạng lại mã.
- Test đặt theo miền: `tests/<miền>/`, test chéo ở gốc `tests/`. Import dùng `../../src/...` (trong thư mục con) hoặc `../src/...` (ở gốc).
