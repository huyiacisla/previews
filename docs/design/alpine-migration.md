# Chuyển sang Alpine.js

Quyết định ngày 2026-11-13: dự án dùng **Alpine.js** (bản 3.17.5) và chuyển dần **tất cả** các trang, mỗi lần một trang.
Đây là ngoại lệ có chủ đích với `BRIEF.md` (dòng "không thêm thư viện, framework, JS").

## Cách viết một trang bằng Alpine

1. **Cấu trúc và class nằm trong HTML** (thư mục `src/partials`). Tailwind chỉ quét tệp `.html`, và chỉ thị của Alpine (`x-for`, `x-text`, `x-show`, `:class`, `@click`) cũng là HTML, nên đọc một tệp là thấy cả trang. Không dựng phần tử bằng JavaScript, không còn `<template id>` để sao chép bằng tay.
2. **Logic test được thì ở tệp thuần** (không DOM): kho dữ liệu, phép tính, câu chữ, thứ tự, đường dẫn. Ví dụ `admin/overview.js` có `adminOverview` (số liệu) và `adminView` (những gì trang vẽ). `node --test` không cần Alpine.
3. **Component chỉ nối hai phần**: đọc kho, giữ kết quả cho partial đọc, đọc lại khi kho đổi. Ví dụ `admin/dashboard.js`.
4. **Kho dữ liệu để ngoài component** (biến của module), không đặt vào dữ liệu của Alpine: Alpine bọc mọi thứ trong dữ liệu bằng Proxy, làm chậm và có thể làm hỏng kho.
5. **Một Alpine cho mỗi trang**, khởi động một lần qua `src/shared/js/alpine.js` (`component(name, factory)` rồi `start()`), sau khi trang đã đăng ký component và đặt gốc vào đúng chỗ.
6. **`x-cloak`** trên gốc của component để không nháy khuôn rỗng (`styles.css` có quy tắc ẩn).
7. **Ẩn hiện bằng `:hidden="!(điều kiện)"`, không dùng `x-show`.** `x-show` chờ một khung hình rồi mới ẩn hay hiện: trong tab chạy nền nó trễ, và việc chuyển tiêu điểm ngay sau khi mở (ví dụ mở bảng Filters rồi đưa con trỏ vào ô đầu tiên) rơi vào phần tử còn đang ẩn. `:hidden` đổi ngay trong cùng lượt, và preflight của Tailwind đã cho `[hidden]` thắng mọi class `flex`/`grid`.
8. Giữ nguyên các yêu cầu cũ: token của thiết kế, `aria-*`, bàn phím, vùng chạm, "cấu hình" 375 / 830 / 1440 sáng và tối.

## Mỗi trang chuyển xong phải có

- Test logic chạy trong Node cho phần "những gì trang vẽ".
- Mở trên trình duyệt: không lỗi console, số liệu đúng, cập nhật trực tiếp, cấu hình ba cỡ.
- Một dòng trong `docs/qa/issue-log.md` và cập nhật bảng dưới đây.

## Thứ tự và trạng thái

| # | Trang | Tệp điều khiển hiện tại | Số dòng | Trạng thái |
|---|---|---|---|---|
| 1 | Admin Command Center | `admin/dashboard.js` | 60 | **Xong** (2026-11-13) |
| 2 | Notifications (Client, Staff, Resident, Admin) | `notifications/app.js` (170) và `notifications/view.js` (97, thuần) | 317 → 267 | **Xong** (2026-11-13) |
| 3 | Promotions của Resident | `promotions/resident.js` | 266 | Chưa |
| 4 | Ticket box (4 cổng) | `messaging/tickets.js` | 509 | Chưa |
| 5 | Documents của Client | `documents/app.js` | 505 | Chưa |
| 6 | Chuông, tìm kiếm, menu hồ sơ của khung | `portal-frame-extras.js` | 685 | Chưa |
| 7 | Messages (4 cổng) | `messaging/app.js` | 2.351 | Chưa. Lớn nhất về hành vi: chia thành danh sách, luồng tin, ô soạn, bảng chi tiết |
| 8 | Social (Staff và Resident) | `social/resident.js` | 2.516 | Chưa. Lớn nhất về số dòng: chia theo màn hình |
| 9 | Settings dùng chung | `staff/account-settings-content.html` (1,3 MB) và `account-settings.staff.js` | 637 | Chưa. Trang nguyên mẫu tự vẽ bằng chuỗi HTML; cần quyết định viết lại hay giữ |
| 10 | `preview.js` (dựng khung, ngăn kéo, cử chỉ) | `preview.js` | 633 | Chưa. Phần lớn là nối bản chụp tĩnh, ít lợi ích khi chuyển |

Thứ tự đi từ nhỏ và mới đến lớn và cũ, để cách viết ổn định trước khi đụng tới Messages và Social.

## Không chuyển

- Các tệp logic thuần (`messaging/store.js`, `social/*-store.js`, `notifications/store.js`, `admin/overview.js`…): không có DOM, giữ nguyên.
- Các bản chụp dashboard (`*/dashboard.html`, `resident/home.html`): là HTML tĩnh của ứng dụng thật.
