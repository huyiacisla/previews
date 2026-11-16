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

## Đợt 3 (xong): lịch sử nhận như bản cũ của người dùng, icon Saved như giỏ hàng

Lục lại bản My rewards trước đây (trong cửa hàng giả của Staff) và chuyển sang trang Resident thật:

- **Tab trạng thái** có số đếm: All, Pending, Verified, Redeemed, Cancelled.
- **Mỗi claim có dòng thời gian**: Claimed, Verified, Redeemed (hoặc Rejected kèm lý do, hoặc Cancelled), mỗi bước có giờ. Staff công bố thêm giờ xác nhận (`vt`), giờ dùng (`rt`), giờ từ chối (`jt`) trong `eso-pm-claimstate`.
- **Cancel claim** cho claim đang chờ: Resident ghi `cancelled` vào record của mình, Staff đọc và hiện "Cancelled by resident" trong Claims; chỗ trả lại cho người đó và cả unit.
- Mục **Your unit's claims**: claim của người cùng unit (promotion giới hạn theo unit), dùng chung cả unit.
- **Icon Saved** thay cho nút ba chấm: ngôi sao có số đếm như giỏ hàng (lưu 10 thì hiện 10); bấm vào thì chỉ hiện các deal đã lưu, bấm lại thì quay về. Chip "Saved" ở hàng category bỏ.

Test: `promotions-resident-view.test.mjs` có thêm 2 test (lịch sử, hủy).

Lỗi tôi gây ra và đã sửa (để khỏi lặp lại):
- Một lần xóa mã bằng cách cắt từ mốc này đến mốc kia: đoạn đó chứa luôn mã Redeem và My rewards nên mất cả hai. Phải cắt trong phạm vi đúng, rồi chạy trang thật ngay.
- Thuộc tính `data-count` bị dùng cho hai việc (số đếm của chip lọc và đồng hồ đếm ngược) nên đồng hồ đọc nhầm chip. Đồng hồ đổi thành `data-countdown`.

## Đợt 4 (xong): trang Staff thiết kế đến tay Resident, phủ kín cả trang

Staff công bố một ảnh chụp trang (`eso-pm-page`) và Resident vẽ nó (`page.js`, đủ 16 loại block). Người dùng chấm điểm theo hai tiêu chí, ghi lại để khỏi sai nữa:

1. **Theme phải bao quát hết, không chừa nửa nửa.** Trước đây chỉ vùng các block đổi màu, còn thanh trên, ô tìm kiếm, chip lọc, thẻ deal, hộp My rewards/Redeem vẫn là diện mạo cũ. Giờ `themeVars()` đổi chính các token của portal (nền, chữ, thẻ, viền, màu nhấn, góc bo, font) bằng một `<style id="pm-theme">` có `!important`, nên cả trang và các hộp thoại cùng một diện mạo. Phải dùng stylesheet `!important`: shell của portal chép `--primary` vào khung và class `dark` đổi theo, inline style bị xoá/ghi đè. Khi theme có, nút sáng/tối của trang bị ẩn (theme tự quyết).
2. **Dù theme nào, Resident phải tìm thấy Redeem, My rewards, Saved, Search.** Trước đây chúng nằm dưới hero/countdown/coupon nên phải cuộn mới thấy. Giờ chúng ở một thanh `#toolbar` dính trên cùng (sticky) và nằm trước trang thiết kế. Thẻ trong lưới và trang thiết kế có `isolate` để `z-raised` của đồng hồ trên thẻ không đè thanh.

Thêm theo yêu cầu:
- **History trong My rewards** (nút History cạnh dấu X, bấm lại là My rewards): mọi việc Resident đã làm, mới nhất trước, có ngày, giờ và năm: Claimed, Could not claim (kèm lý do), Cancelled, và quyết định của Staff (Verified, Redeemed, Rejected) kèm giờ Staff. Lưu trong record của Resident (`log`, 200 mục mới nhất) nên claim lần hai không làm mất lần một. Claim cũ chưa có `log` thì dựng lại từ claim. Staff ghi "Cancelled by resident" như một lần từ chối: chỉ hiện một lần, là Cancelled.
- Thẻ deal của claim đã huỷ ghi **Cancelled** (trước ghi "Not approved").
- **Chữ giải thích dài thành (i)**: My rewards, History, Redeem có dấu (i) mở hộp ngắn (`#dlg-info`); trang chỉ giữ một dòng ngắn hoặc không giữ gì.
- Đồng hồ đếm ngược của block Countdown đếm tới một thời điểm cố định (`eso-pm-page-clock`), Staff sửa trang không làm nó chạy lại.
- Đóng chi tiết từ My rewards/Redeem quay về đúng hộp đó (`ui.back`).

Cách test lần này (theo lời người dùng: test mà không kéo xuống xem thì không phải test thật): cuộn hết trang, nhìn ảnh chụp thật, ở 375/830/1440, sáng và tối, ngày thật 16/11/2026. Test DOM một mình không bắt được: chữ tối trên nền tối, lưới 1 cột, trang quá dài, đồng hồ chạy lại, hàng nút bị gãy dòng, thanh công cụ bị thẻ đè.

Test: `promotions-history.test.mjs` (7 test: lịch sử, lý do thất bại, quyết định Staff, claim cũ, (i), thanh dính, theme), `promotions-page.test.mjs`. `npm test`: 483 test, 482 qua, 1 lỗi cũ (menu cards của messaging-ui, không thuộc Promotions).

Bài học thêm:
- Một tính năng "áp dụng được" chỉ khi không còn dấu vết cũ: kiểm tra từng chỗ Resident phải tìm thấy (Redeem, My rewards, Saved, Search), không chỉ vùng mới vẽ.
- Thanh công cụ dính: kiểm tra thứ tự chồng lớp với `z-raised` (60) của thẻ; không dùng `z-[N]` tuỳ ý.
- Regex trong test viết bằng sed làm mất `/` đóng; sửa test bằng Edit, không bằng sed.

## Việc kế

- Test hình ảnh tiếp ở 1440 và 375 thật (khung trình duyệt đổi chiều rộng thì kích cỡ giả lập bị xoá): trang đã có theme tối (nền #0b1020) trên Resident, hộp My rewards và History ở chế độ tối.
- Test lặp: tạo deal bằng form New promotion, claim bằng Alex (res-1) và Jamie (`?as=res-4`) cùng unit để xem History có dòng "Could not claim"; đóng, gia hạn, xuất CSV.
- Hỏi người dùng: có push các commit trong máy lên `origin/main` chưa.

## Đợt 5 (xong): sửa lỗi thiết kế của theme, thử vòng Staff → Resident thật

Người dùng hỏi "theme này có vấn đề thiết kế không?" sau khi thấy ảnh. Lỗi thật tôi thấy và đã sửa:

1. **Hai ô tìm kiếm chồng nhau** ("Search Resident pages…" của portal trên "Search promotions…"). Trang Promotions giờ ẩn ô tìm kiếm trang của portal (`pm-shell`, chỉ trong tài liệu portal đang mở, sang trang khác thì mất).
2. **Khung portal bên ngoài còn màu cũ** (huy hiệu 34 màu xanh, nút). Cùng một stylesheet theme `pm-theme` giờ cũng được đặt vào tài liệu portal bao ngoài (cùng origin), kèm `--sidebar-primary` nên mục đang chọn của sidebar theo màu nhấn. Sidebar vẫn giữ nền tối của portal.
3. **Hai nút Redeem**: nút ở khối mã giảm giá đổi thành "Use code" (điền sẵn mã vào hộp Redeem).
4. **Hero lệch nền, như một hộp trong trang**: các dải của trang Staff chạy hết chiều ngang (`padding-inline:max(16px, calc((100% - 72rem)/2 + 24px))`), nội dung nằm giữa như thanh công cụ và danh sách. `#page-top` nằm ngoài khung `max-w-6xl`.
5. **Ô danh mục (tile) và chip lọc nói hai điều khác nhau**: tile của danh mục đang xem được đánh dấu (`aria-pressed`, viền màu nhấn), bấm lại để bỏ lọc.
6. Font tiêu đề của template áp cho mọi h1/h2/h3 của app và portal; font nội dung áp cho phần còn lại.

Test vòng thật: mở Staff ở tab khác, bấm "Use this template" (Minimal mono, Luxury dark, Deals) và lưu Brand kit (màu #1f5d4c) bằng giao diện; trang Resident đang mở đổi ngay không cần tải lại (đen/vuông/mono, tối/vàng/serif, xanh). Đã trả brand và template về mặc định sau khi test (`eso-brand` primary/btn rỗng, template Deals).

Bẫy gặp lần này:
- Ghi thẳng `eso-brand` vào localStorage không đổi trang: publisher đọc `P.BK` trong bộ nhớ của trang Staff, chỉ giao diện Brand kit mới cập nhật nó. Test bằng giao diện thật.
- Màu brand luôn thắng màu template: dữ liệu test của tôi (primary xanh lá) làm cả app xanh sau khi đổi template. Phải trả lại sau khi test.
- Cuộn trong tab giả lập: đổi độ rộng khung trình duyệt làm mất kích cỡ giả lập, đặt lại trước mỗi ảnh.
- `z-raised` (60) của đồng hồ trên thẻ cao hơn thanh dính; giải bằng `isolate` ở lưới, không dùng `z-[N]`.
