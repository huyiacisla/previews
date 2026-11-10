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
├─ preview.js          bật tối bằng ?dark
├─ partials/head.html  <head> dùng chung, chèn bằng <!--include:partials/head.html-->
└─ <portal>/*.html     các trang
DESIGN.md              luật thiết kế (khi xung đột, DESIGN.md thắng)
screenshots/           ảnh tham chiếu sáng/tối của bản hiện tại
```

## Lưu ý
- Trang gốc là **bản chụp** bản thật. Muốn thử thiết kế: sao chép ra `<trang>.v2.html` rồi sửa; không ghi đè trang gốc.
- `DESIGN.md` và comment trong `ui-tokens.css` nhắc `DOC-xxxx`, `@easyspotops/ui`, tên component: là tham chiếu nội bộ của repo dev, **bỏ qua**; chỉ cần các luật thị giác (màu, cỡ chữ, khoảng cách, bo góc).
- Styling bằng class Tailwind + token trong `ui-tokens.css`.
