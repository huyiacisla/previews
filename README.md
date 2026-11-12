# EasySpotOps — Gói UI Preview

Bản dựng HTML tĩnh giao diện 4 portal (Staff, Admin, Client, Resident) để **thử redesign UI/UX**. Không logic, không API, không đăng nhập; dữ liệu đã ẩn danh. Việc cần làm: xem [BRIEF.md](BRIEF.md).

## Chạy nhanh
Cần Node 20+ (và mạng để tải font Inter).

```bash
npm install
npm run dev      # http://localhost:3590
npm run build    # kiểm tra; ra dist/
```

| Trang | URL |
|---|---|
| Mục lục | `/` |
| Staff | `/staff/dashboard.html` |
| Admin | `/admin/dashboard.html` |
| Client | `/client/dashboard.html` |
| Resident | `/resident/home.html` |
| Messages (hub, nối 4 portal) | `/messages/index.html` |
| Messages từng portal | `/resident/messages.html`, `/staff/messages.html`, `/client/messages.html`, `/admin/messages.html` |
| Ticket box từng portal (mở từ đáy sidebar dashboard) | `/resident/tickets.html`, `/staff/tickets.html`, `/client/tickets.html`, `/admin/tickets.html` |
| Account settings (Settings và Promotions của Staff; bản riêng của Client, không có Social và Promotions) | `/staff/account-settings.html`, `/client/account-settings.html` |
| Client: Workspace Settings (theo công ty, portfolio, property) | `/client/workspace.html`, `/client/workspace/billing.html`, `/client/workspace/parking.html`… |
| Client: Usage > Capacity (nhóm Usage dưới Ticket box trong sidebar) và Management > Documents | `/client/usage/capacity.html`, `/client/documents.html` |
| Resident: Promotions (Staff đã publish), Social (xem và tương tác, không đăng bài, có hộp hướng dẫn cộng đồng), Settings (Profile, Personalize, My property) | `/resident/promotions.html`, `/resident/social.html`, `/resident/settings.html` |

Thêm `?dark` vào URL để xem chế độ tối. Trang Messages hoạt động thật trong trình duyệt (xem [docs/messaging-design.md](docs/messaging-design.md)); chạy `npm test` để kiểm lõi nghiệp vụ.

## Ghi chú cho AI/agent làm việc trong repo này
- **Hạn chế subagent.** Chỉ dùng khi thật sự cần (khảo sát nhiều tệp lớn, đọc tài liệu dài). Việc nhỏ, đã biết tệp, làm trực tiếp. Không chạy nhiều subagent song song cho việc có thể làm tuần tự.
- Bộ skill thiết kế đang dùng: `/design` (gộp `ui-ux-pro-max`, `frontend-design`, `design-taste-frontend`, `web-design-guidelines`). Khi xung đột: ý bạn > `DESIGN.md` > skill.

## Cấu trúc
```text
src/
├─ index.html          mục lục
├─ styles.css          nạp token + font
├─ ui-tokens.css       token/màu/cỡ chữ/theme (Tailwind 4) — NGUỒN token, không khai màu riêng ngoài file này
├─ styles/staff.css    CSS Module trích từ app thật (không sửa tay)
├─ preview.js          bật tối bằng ?dark, nút Theme, ngăn kéo menu mobile, nối mục Messages
├─ messaging/          lõi và giao diện Messages (logic ở FE, đủ demo): store, transport, bot, app…
├─ partials/head.html  <head> dùng chung, chèn bằng <!--include:partials/head.html-->
├─ partials/messages-app.html  khung + mọi <template> của Messages (nơi duy nhất chứa class của trang này)
└─ <portal>/*.html     các trang
├─ promotions/ social/ settings/   lõi (chỉ đọc dữ liệu Staff) và trang của Resident
tests/                 npm test: 82 test (Messages, ẩn/khôi phục, Promotions, Social, Settings của Resident, một test ngẫu nhiên)
docs/                  messaging-design.md (thiết kế, phạm vi demo, hạn chế), checklist-conformance.md (đối chiếu với checklist PDF), account-settings-quality-pass.md, issue-log.md (nhật ký lỗi và góp ý, kèm quy tắc rút ra: đọc trước khi làm việc mới), ux-checklist-conformance.md (đối chiếu với ux-checklist.com cho 4 portal)
DESIGN.md              luật thiết kế (khi xung đột, DESIGN.md thắng)
screenshots/           ảnh tham chiếu sáng/tối của bản hiện tại
```

## Lưu ý
- Trang gốc là **bản chụp** bản thật. Muốn thử thiết kế: sao chép ra `<trang>.v2.html` rồi sửa; không ghi đè trang gốc.
- `DESIGN.md` và comment trong `ui-tokens.css` nhắc `DOC-xxxx`, `@easyspotops/ui`, tên component: là tham chiếu nội bộ của repo dev, **bỏ qua**; chỉ cần các luật thị giác (màu, cỡ chữ, khoảng cách, bo góc).
- Styling bằng class Tailwind + token trong `ui-tokens.css`.
