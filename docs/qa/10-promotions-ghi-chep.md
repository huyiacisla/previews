# Promotions: Staff làm, Resident dùng. Ghi chép từng đợt

Ngày bắt đầu: 2026-11-16. Mỗi đợt làm xong thì ghi vào đây, 5 phút sau làm tiếp và test lại.

Mục tiêu: **Staff tạo được trang promotion riêng, Resident dùng được đúng thứ Staff đăng.** Resident view của Staff phải là chính trang Resident, không phải bản giả.

## Đợt 1 (xong): Resident nhìn thấy đúng thứ Staff đăng

| Việc | Cách làm | Đã thử |
|---|---|---|
| Resident view của Staff | Khung (iframe) chứa `/resident/promotions-content.html`, chọn Phone / Tablet / Desktop | Bật/tắt, đổi cỡ |
| Còn lại bao nhiêu, Sold out | `store.js` có `left`; card có "N of T left", thanh, "Only N left", ribbon Sold out, ảnh xám | 3 deal có hạn mức: 23 còn, 3 còn, hết |
| Thẻ lọc cạnh ô tìm | Nút lọc: New, Hot, Limited, Ending soon, Free, Still available + sắp xếp | Từng thẻ, Clear, đếm |
| Logo thương hiệu | Avatar chữ cái hoặc logo trên mép ảnh bìa; Staff đặt logo/tên đối tác ở Edit details và New promotion | Tạo mới có logo, sửa logo |
| Hạn dùng | "Exp: ngày" góc dưới phải; đồng hồ đếm ngược cho deal còn ≤ 7 ngày | Đếm đúng đến cuối ngày hết hạn |
| Redeem | Hộp "Redeem a code" (hợp lệ / hết hàng / đã kết thúc / chưa bắt đầu / không dành cho unit / không tìm thấy) và "My rewards" | Mã sai, mã đúng, claim, thấy trong My rewards, thấy trong Claims của Staff, có trong CSV |
| Vòng đời deal (Staff) | Hộp Manage: End now, Extend, Export claimers (CSV), Remove (có Undo) | Đóng, gia hạn, xuất, xóa, hoàn tác; Resident đổi theo |
| Ba chấm | Thay nút Exit: Promotions là một phần của cổng, chỉ Social là trang riêng | Mở menu, Saved, Filters |

## Đợt 2 (xong): nhiều người trong một căn hộ, lịch sử nhận

- Giới hạn "mỗi unit" (`limS = unit` ở form Staff) trước đây chỉ có trong form và trong hợp đồng API (`claim_limit_scope`), **app Resident chưa tính**. Giờ `store.js` tính: các claim của mọi người cùng unit cộng chung, vượt giới hạn thì báo "Your unit already claimed this: <tên> claimed it on <ngày>".
- Người cùng unit thấy: huy hiệu "Claimed by your unit", mã chung của unit, nút "Claimed by your unit" (khóa). Claim Staff từ chối thì trả chỗ lại cho unit.
- Người thứ hai trong unit 02-291 là Jamie Rivera (`res-4`), chỉ có trong Promotions (`HOUSEHOLD` ở `store.js`); các test khác của dự án vẫn thấy 3 resident. Mở bằng `?as=res-4`.
- My rewards có lịch sử: ai nhận, giờ nhận, giờ Staff quyết (`claimDecidedAt`), lý do nếu bị từ chối. Cũng hiện claim của người cùng unit.

## Bài học (để khỏi làm sai lại)

1. **Ngày giả phải theo hôm nay.** Dữ liệu mẫu từng tính từ "đồng hồ demo 30/10" nên hôm 16/11 vẫn ghi còn 4 ngày. Giờ mọi ngày của deal mẫu tính từ `PM_CATALOG.clock()` (hôm nay). Test cố định ngày bằng `globalThis.PM_CLOCK`; file `promotions-real-day.test.mjs` chạy trên ngày thật.
2. **Tailwind chỉ quét file HTML** (`@source` trong `ui-tokens.css`). Class viết trong JS không có CSS. Mọi class động phải nằm trong `<template>` của HTML; JS chỉ đặt `data-*`.
3. Sau đợt chuyển thư mục `shared/`, `features/`: đường dẫn `@source` và `<!--include:...-->` phải đổi theo. Hai lỗi này làm trang Resident mất giao diện và trang Staff không tải.
4. Thêm một persona vào `PERSONAS` làm vỡ test của Messages/Social (đếm 3 resident). Người phụ chỉ cho Promotions thì để ở `HOUSEHOLD`.
5. Script chèn mã: file có CRLF thì tìm chuỗi có `\n` sẽ trượt. Chuẩn hóa xuống dòng trước khi tìm.
6. Giữ nguyên quyết định cũ của dự án (nút Resident view từng bị ẩn có chủ đích); hỏi hoặc nói rõ trước khi bật lại.

## Việc kế (làm sau 5 phút, rồi test lại)

- **Templates & brand → trang Resident.** Hiện Resident bỏ qua template/brand Staff chọn. Kế hoạch: Staff công bố một ảnh chụp trang (`eso-pm-page`: template đang dùng, brand kit, các khối), Resident vẽ lại: annbar, hero, split, tiles, grid, carousel, featured, countdown, coupon, imgtext, quotes, map, spacer, faq, cta, navbar; thẻ trong grid là card thật của Resident.
- Test lặp: tạo deal mới bằng form, claim bằng hai người trong một unit, đóng, gia hạn, xuất CSV; ngày thật; sáng/tối; 375/830/1440.
- Chưa push lên `origin/main` (đang chờ).
