# Brief giao việc UI/UX

## Mục tiêu
Đề xuất giao diện mới (đẹp hơn, rõ hơn, dễ dùng hơn) cho dashboard 4 portal, dưới dạng HTML trong gói này. Đội dev sẽ port bản được duyệt sang app thật.

## Phạm vi
| Portal | Trang | Ghi chú |
|---|---|---|
| Staff | `staff/dashboard.html` | |
| Admin | `admin/dashboard.html` | |
| Client | `client/dashboard.html` | |
| Resident | `resident/home.html` | ưu tiên mobile |

Thêm trang mới được (tạo `src/<portal>/<tên>.html`, thêm link ở `src/index.html`).

## Được / Không được
| Được | Không được |
|---|---|
| Sửa HTML + class Tailwind; tạo `*.v2.html` | Ghi đè trang gốc |
| Dùng token trong `src/ui-tokens.css` (màu, cỡ chữ, spacing, radius) | Tự khai màu/cỡ chữ hex/px riêng |
| Đề xuất token mới: ghi rõ lý do trong ghi chú | Thêm thư viện, framework, JS (ngoài `preview.js`) |
| Dùng icon dạng SVG inline (bộ Lucide) | Dùng dữ liệu thật/PII, gọi API |

> Ngoại lệ đã quyết (2026-11-13): dự án dùng **Alpine.js** cho phần tương tác và chuyển dần các trang sang nó. Cách viết và thứ tự ở `docs/alpine-migration.md`. Không thêm thư viện nào khác.

## Yêu cầu chất lượng
- Có đủ **sáng + tối** (`?dark`); chữ đạt tương phản AA.
- Kiểm **mobile 375px** và desktop ≥1280px.
- Có trạng thái focus, hover, rỗng, lỗi, đang tải cho thành phần tương tác.
- Đọc `DESIGN.md` trước khi làm; xung đột ⇒ `DESIGN.md` thắng.

## Bàn giao lại
Một file zip gồm:
1. Thư mục `src/` đã sửa (kèm `*.v2.html`).
2. Ảnh trước/sau, sáng + tối, desktop + mobile (`handoff-out/`).
3. `NOTES.md`: danh sách thay đổi, lý do, token mới đề xuất, điểm còn băn khoăn.

## Nghiệm thu
- [ ] `npm run build` qua, không lỗi console
- [ ] Sáng + tối, 375px + desktop đều ổn
- [ ] Không màu/cỡ chữ ngoài token (hoặc đã ghi đề xuất token)
- [ ] Không PII, không JS mới
- [ ] Có ảnh trước/sau + NOTES.md

Đầu mối: _(điền tên/email người giao việc)_ · Hạn: _(điền)_
