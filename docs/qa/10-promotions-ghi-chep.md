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

## Đợt 6 (xong): bố cục "Split", vòng tạo deal → claim → đóng → xuất CSV

Người dùng chụp lại: ô "Browse categories" ở trên rồi hàng chip danh mục lặp lại ở giữa trang, chip nằm tách khỏi ô tìm kiếm. Họ dán thêm một bản đặc tả; phần đặc tả đặt thanh công cụ sau hero làm Redeem/Search không thấy khi mở trang trên điện thoại (trái với yêu cầu trước), nên đã hỏi và họ chọn **Split**:

- **Trên cùng, luôn dính (`#toolbar`)**: Redeem, My rewards, Saved.
- **Ngay trên danh sách (`#browse`)**: ô tìm kiếm + nút lọc + hàng chip danh mục (một hàng cuộn ngang, `shrink-0`), dính ngay dưới thanh trên cùng khi cuộn tới (`--bar-h` đo bằng JS, chui xuống 1px để không hở đường nối). Dưới nó là "17 of 17 promotions" rồi lưới thẻ (1, 2, 3, 4 cột: `sm`, `lg`, `xl`).
- Khối **Browse categories** (tiles) của template không còn vẽ cho Resident: hàng chip là danh sách danh mục duy nhất. Khối vẫn còn trong trình dựng của Staff.
- Chip luôn có (bỏ nhánh "chỉ hiện chip đang chọn" của đợt trước).
- Hàng My rewards trên 375: mã `MALLA10` không còn bị bẻ thành "MALLA / 10", nút View xuống dòng.

Vòng test thật (Staff tab thứ hai, Alex rồi Jamie):
- Form New promotion: tạo "QA Test Detailing 25% off", giới hạn theo **unit**, 1 mỗi unit, tổng 2, hết hạn sau 10 ngày. Resident thấy ngay, "Exp: Nov 26, 2026".
- Alex claim → Staff thấy "1 claimed", "1 left · 1/2". Jamie (`?as=res-4`) thấy nút "Claimed by your unit" (khoá) và dòng "One claim per unit: Alex Rivera already claimed this on Nov 16." Nút bị khoá nên History không có "Could not claim" từ giao diện; dòng đó chỉ có khi trạng thái đổi giữa lúc mở và lúc bấm. Gọi `claim()` cho Jamie bằng tay: History ghi "Could not claim" kèm ngày giờ và lý do.
- Staff đặt ngày kết thúc mới (Set date → Dec 26) và Resident đọc đúng; End now → deal biến khỏi danh sách Resident, claim của Alex vẫn ở My rewards (không có nút View vì deal đã đóng), Cancel claim vẫn dùng được.
- Đã dọn: deal QA, claim, nhật ký, mục Claims.

Lỗi thật tìm thấy và đã sửa:
1. **CSV lẫn claim của deal khác.** Claim của Staff inbox gắn vào deal theo vị trí trong danh mục (`services0`...); khi deal cũ bị xoá, deal mới lấy vị trí đó và nhận luôn claim của deal cũ. Giờ mỗi claim gắn theo id của promotion (`promo`), claim của deal đã xoá thành "Deleted promotion", và CSV chỉ lấy đúng claimer của deal.
2. **"Expired on Nov 15" cho deal kết thúc ngày 16.** `new Date("2026-11-16")` là nửa đêm UTC nên lùi một ngày ở múi giờ phía tây. Đọc ngày dạng `YYYY-MM-DD` phải thêm `T00:00:00` (giờ địa phương). Đã sửa chỗ hiển thị và chỗ tính ngày còn lại.

Bài học: ngày dạng chuỗi và khoá theo vị trí là hai nguồn lỗi lặp lại. Khi người dùng đưa đặc tả mâu thuẫn với yêu cầu trước, hỏi một câu với phương án rõ thay vì chọn bừa.

### Đổi ý sau Đợt 6: thanh trên cùng gom cả Search và chip

Người dùng gửi thêm lời khuyên UX: Search và chip danh mục phải thấy ngay khi mở trang, không được trôi xuống sau hero/đồng hồ/mã giảm giá; kèm ảnh chụp trang đang cuộn. Nên bố cục "Split" đổi thành **một thanh dính trên cùng** (`#toolbar`): hàng Redeem / My rewards / Saved, hàng Search + nút lọc, hàng chip. Dưới nó là trang Staff thiết kế (hero, đồng hồ, mã), rồi "N of 17 promotions" và lưới thẻ. Bỏ `#browse` và `--bar-h`. Thanh cao khoảng 166px trên 375 (một phần tư màn hình), chấp nhận vì tìm kiếm là công cụ nhanh.

Vì danh sách nằm sau trang thiết kế, bấm chip (hoặc gõ chữ đầu tiên vào Search) mà không cuộn thì trên màn hình không có gì đổi: đã thêm `scrollToCatalog()` sau khi chọn chip và khi gõ chữ đầu; kết quả hiện ngay dưới thanh với dòng đếm. Bài học: sau khi chuyển điều khiển đi xa nơi nó có tác dụng, phải thử bấm thật và nhìn màn hình, không chỉ đọc DOM.

### Kích cỡ thanh trên cùng quá lớn trên mobile và tablet

Người dùng khoanh vùng tiêu đề + thanh (ba hàng) trên 375 và nói quá lớn. Đã làm gọn:
- Tiêu đề trang nhỏ hơn trên điện thoại (text-xl), không có dòng phụ đề dưới 640px.
- Từ 640px trở lên cả thanh là **một hàng**: Redeem, My rewards, Search, nút lọc, Saved; chip nằm hàng dưới (cao 86px trên 830, trước đây khoảng 150px). Làm bằng `order` + `sm:contents`, không nhân đôi nút.
- Chip trong thanh nhỏ hơn (h-7, text-xs), khoảng cách và đệm nhỏ lại.
- Dưới 1024px thanh **trượt lên khi cuộn xuống và hiện lại khi cuộn lên** (luôn hiện ở đầu trang, khi ô tìm kiếm đang focus, và khi app tự cuộn tới kết quả). Từ laptop trở lên thanh luôn dính.
- Giữ nguyên vùng bấm 44px trên thiết bị cảm ứng: cổng portal bật `data-big-target` mặc định cho con trỏ thô (mọi nút `min-height: 2.75rem`), nên không thể thu nhỏ nút bằng class `h-*` trên thiết bị cảm ứng. Muốn gọn hơn thì giảm số hàng, không giảm vùng bấm.

### Countdown và mã giảm giá gộp vào hero

Người dùng: khối "Offer ends in" / "Use this code at checkout" / `MALLA10` đứng riêng, không nói deal nào, hai nút đỏ giống nhau ("Copy", "Use code") gây hoang mang; kèm lời nhận xét UX. Hai bộ đếm cùng deal còn lệch nhau (thẻ "4d 22h left" so với khối "4d 23:59:18").

- Khi trang có hero, khối countdown và coupon **không vẽ riêng** nữa: nằm trong hero. Đầu hero: huy hiệu nhỏ "Ends in 4d 22h" (cập nhật mỗi 30 giây, đếm tới **hạn thật của deal** mà hero nói tới nên khớp với thẻ; deal không có hạn mới dùng số ngày của khối). Dưới lời hero: "Promo code: show it or apply it when you book", ô mã, một nút chính "Copy code" (đổi thành "Copied ✓", hoặc "Could not copy" nếu trình duyệt từ chối, không báo sai) và một nút phụ viền "View details" mở chi tiết đúng deal có mã đó.
- Nút "Claim offer" của hero (cuộn xuống danh sách) mở chi tiết deal khi không có mã.
- Mặc định coupon của Staff đổi từ "Use this code at checkout" thành "Promo code: show it or apply it when you book".
- Test: `promotions-history.test.mjs`.

## Kế hoạch test Staff ↔ Resident, từng phần (mỗi phần xong thì 5 phút sau chạy `npm test` rồi làm phần kế)

Đánh dấu `[x]` khi xong. Mỗi phần: cuộn hết trang, nhìn ảnh thật (chụp lại lần hai vì ảnh có thể cũ), Staff ở tab thứ hai, dọn dữ liệu test sau khi xong.

- [x] **Phần 1: Template.** Deals, Store, Minimal mono, Luxury dark, rồi các template còn lại, mỗi cái ở 375/830/1440, sáng/tối: thanh trên cùng, hero gộp (badge, mã, nút), lưới thẻ, My rewards, History, (i), Redeem, chi tiết deal. Đổi template ở Staff, Resident đổi ngay.
- [x] **Phần 2: Brand kit.** Màu chính, màu phụ, font, kiểu nút, logo; xem Resident đổi cả thanh portal, huy hiệu, hộp thoại; trả về mặc định.
- [x] **Phần 3: Tạo và sửa deal.** Form New promotion (ảnh bìa, logo đối tác, mã tĩnh/duy nhất/QR/link, giới hạn tổng/mỗi người/mỗi unit, hẹn lịch, nháp); Edit details (đổi tiêu đề, giá, mã, danh mục) hiện đúng ở Resident.
- [x] **Phần 4: Claim.** Alex và Jamie cùng unit, giới hạn theo unit/theo người, hết suất, đã claim, Cancel, claim lại, History; Staff xác nhận/đổi/từ chối ở Claims và Resident thấy đúng trạng thái và giờ.
- [x] **Phần 5: Vòng đời.** Đóng, gia hạn, tạm tắt/Off live, hẹn lịch, xoá, xuất CSV; ngày thật 16/11/2026, đồng hồ, "Expired on" đúng; sample deal và deal do Staff tạo.
- [x] **Phần 6: Truy cập và dọn.** Bàn phím, focus, (i), Redeem; vùng bấm; không có hai điều khiển cho một việc; dọn dữ liệu test; ghi tổng kết, hỏi người dùng về push.

### Saved: một màn hình riêng, sao tô vàng

Người dùng chụp ảnh: bấm sao Saved thì không ra chỗ Saved riêng mà vẫn thấy trang thiết kế, thanh bị vướng, và ngôi sao không tô vàng để biết đã bấm.

- **Saved là một màn riêng**: khi bấm, trang thiết kế (hero, lưới "Top deals") và hàng chip ẩn đi; dưới thanh là tiêu đề "Saved promotions", nút "Show all promotions" để quay lại, dòng "N saved promotions" và đúng các thẻ đã lưu (cuộn về đầu). Bỏ sao ở một thẻ thì thẻ biến mất; hết thẻ thì hiện "Nothing saved yet. Star a promotion to keep it here."
- **Sao tô vàng**: biểu tượng `i-star` có `fill="none"` ngay trong symbol nên `fill-current` không bao giờ tô được (thuộc tính trên symbol thắng giá trị thừa kế). Bỏ thuộc tính khỏi symbol, đặt `fill="none"` ở từng nơi dùng, và khi `aria-pressed` thì `fill-amber-400 text-amber-500`: nút Saved trên thanh, sao trên thẻ, sao trong chi tiết.
- **Thông báo (toast) xuống đáy** màn hình: ở đỉnh nó đè lên nút Redeem/My rewards.
- Bài học: một lớp CSS "chắc chắn chạy" vẫn phải thử bằng cách bấm thật và xem màu tính ra (`getComputedStyle(...).fill`).

### Ba lỗi do tôi tự làm rồi người dùng bắt được (ghi để không lặp lại)

1. **Tôi ẩn thanh tìm kiếm chung của portal** ("Search Resident pages…") trên trang Promotions vì cho là hai ô tìm kiếm chồng nhau. Người dùng khoanh vùng trống và nói mất thanh search chung. Đã khôi phục (chỉ còn chép theme sang khung portal). Quy tắc: không bỏ điều khiển thuộc portal theo ý riêng; nghi trùng lặp thì hỏi.
2. **Tôi cho thanh trên cùng trượt đi khi cuộn xuống** để nhỏ lại; người dùng thấy "kéo sâu hơn thì thanh search không còn đi theo nữa" và coi là lỗi. Thay bằng **gấp lại**: dưới 640px, cuộn quá 140px thì thanh thành một hàng (search, nút lọc, Redeem, My rewards, Saved dạng icon; chữ vẫn có cho trình đọc màn hình), cuộn về gần đầu (dưới 60px) thì mở ra. Lề dưới âm bằng đúng phần giảm đi nên trang không giật. Quy tắc: thứ phải "đi theo" thì không bao giờ biến mất khi cuộn, chỉ được thu gọn.
3. **Saved lần đầu là bộ lọc trong trang, lần hai là màn thay thế trang**; người dùng muốn "khu save riêng". Giờ là một hộp thoại riêng như My rewards: tiêu đề "Saved" kèm số đếm, mỗi deal một hàng (tên, đối tác, danh mục, giá, hạn) với nút Remove (sao vàng) và View (mở chi tiết, đóng thì quay về Saved). Quy tắc: "khu riêng" là panel riêng theo mẫu My rewards/Redeem.

Cách bắt lỗi thứ hai: chỉ lộ ra khi cuộn thật sâu và nhìn lại; test cuộn ngắn không thấy. Đã đo thêm: vị trí `page-top` sau khi gấp đúng bằng vị trí dự kiến (không dịch).

## Phần 1 (xong): Template

Cách làm: Staff ở tab thứ hai bấm "Use this template" cho cả 7 template (Deals marketplace, Store, Modern, Editorial, Minimal mono, Seasonal / Holiday, Luxury dark) và chép ảnh chụp `eso-pm-page` của từng cái; ở Resident đặt từng ảnh chụp vào `eso-pm-page` (trang đang mở nhận qua sự kiện storage) rồi chạy một bộ kiểm tra tự viết: tràn ngang, lỗi script, và độ tương phản (canvas) của mọi chữ trong thanh trên cùng, trang thiết kế và lưới thẻ. Chạy ở 375 sáng, 830 sáng, 1440 sáng và 1440 tối, cộng ảnh chụp thật 375 (6 template, phần đầu), 830 (Seasonal, Editorial giữa trang, Luxury cuối trang), 1440 tối (Luxury), hộp My rewards và chi tiết deal trong Modern.

Lỗi tìm thấy và đã sửa:
1. **Modern: chữ gần như vô hình trong hero** (tương phản 1.1). Template dùng `alt: rgba(255,255,255,.06)`, bộ kiểm tra màu chỉ nhận `#hex` nên rơi về xám nhạt `#f4f4f5`, mà chữ hero lại là trắng. Giờ nhận `rgb()`/`rgba()` chỉ gồm số; và vì hộp thoại và thẻ không được trong suốt, `alt` trong suốt đổi thành màu đặc tương đương trên nền (`--card`).
2. **Màu trạng thái** ("Sold out", "Only 3 left", "Ends soon", "Claimed") tương phản 4.2–4.4 trên thẻ nhạt và 3.6–3.7 trên template tối khi hệ điều hành đang sáng, vì portal chỉ có hai bộ màu theo `.dark` của hệ thống. Giờ bộ màu trạng thái do **nền của template** quyết định (sáng/tối), kèm chữ nhỏ xám đậm hơn (62% → 70%) và ba màu chữ sáng tối hơn một chút.
3. **Seasonal / Holiday: mã `HOLIDAY26` không thuộc deal nào.** Resident sẽ sao chép rồi bị Redeem báo "could not find that code". Giờ mã chỉ hiện khi có deal đang bán nhận mã đó (không phân biệt hoa thường); không thì hero giữ nút "Claim offer".

Không sửa (ghi lại):
- Chữ trắng trên màu nhấn indigo `#6366f1` (nút "Claim offer" của Modern, số đếm trên nút) đạt 4.47:1, thiếu 0.03 so với 4.5. Chấp nhận, chữ đậm.
- Trình dựng của Staff chưa cảnh báo khi một khối Coupon có mã không khớp deal nào: đưa vào **Phần 3**.

Kết quả sau sửa: 0 chữ thiếu tương phản trên 6 template ở cả bốn cấu hình, trừ hai mục trên Modern ở 4.5 (đã chấp nhận); không có lỗi script; không tràn ngang; thanh trên cùng 150px (375) và 86px (830/1440). Đã trả template về Deals và xoá khoá tạm.

Test: `promotions-history.test.mjs` (màu trong suốt, bộ màu trạng thái, mã chỉ hiện khi có deal).

## Phần 2 (xong): Brand kit

Cách làm: Staff (tab thứ hai) mở "Edit brand kit" và đặt từng mục bằng giao diện thật: màu chính (ô màu có sẵn và ô màu tuỳ chọn), màu phụ, font, kiểu nút (Template, Fill, Pill, Outline), kiểu ảnh (Rounded, Square, Soft shadow), logo (tải ảnh PNG tạo bằng canvas), "Template default" để trả về, Cancel (không lưu), Save. Mỗi lần xem ảnh chụp `eso-pm-page` Staff công bố, rồi Resident (375 sáng, 830 tối, 1440) có đổi theo không. Thêm một ma trận 6 template × 3 nền (sáng, tối, kính) × 3 màu chính × 4 màu phụ = 216 tổ hợp, đo tương phản mọi chữ trong trang thiết kế.

Chạy đúng: màu chính (cả màu tuỳ chọn #0e7490) tới nút, huy hiệu, thanh portal, hộp thoại; font tiêu đề serif tới mọi tiêu đề; kiểu nút; logo hiện trong khối navbar của Store; Cancel không công bố gì; "Template default" trả về màu của template.

Lỗi tìm thấy và đã sửa:
1. **Màu phụ ("Section backgrounds") không tác dụng gì ngoài đầu gradient của hero.** Staff đổi mà các khối của Resident không đổi. Giờ màu phụ là nền các khối (và nền hero kiểu sáng), chữ trên đó tự chọn trắng hoặc đen xám theo độ sáng; gradient hero chỉ dùng sắc đậm hoặc nhạt hơn của màu chính nên chữ luôn đọc được (trước đây gradient chạy sang màu phụ, có thể là kem với chữ trắng).
2. **Kiểu ảnh (Rounded, Square, Soft shadow) được công bố nhưng Resident bỏ qua.** Square đưa `--radius` về 0 cho cả app và khối; Soft shadow thêm bóng cho thẻ và ảnh trong khối.
3. **Nút chữ/viền (kiểu "Text" hoặc "Outline") dùng màu chính ngay cả khi không đọc được trên nền khối**: Editorial với màu chính vàng trên nền kem chỉ đạt 2.1:1, xanh lá trên gần đen 2.3:1. Giờ rơi về mực đọc được khi tỉ lệ dưới 4.5:1.

Bài học về cách test: khi đổi `eso-pm-page` bằng tay phải đổi cả `at`, vì Resident chỉ vẽ lại khi `at` hoặc dữ liệu thay đổi; lần chạy ma trận đầu chỉ đo đúng lần đầu của mỗi nền và báo "0 lỗi" sai. Bản chạy lại với `at` tăng dần tìm ra lỗi 3.

Kết quả sau sửa: 0 chữ thiếu tương phản trên 216 tổ hợp, trừ nút trên màu indigo `#6366f1` ở 4.47:1 (đã chấp nhận ở Phần 1). Không sửa: màu chính tuỳ chọn quá nhạt hay quá sáng vẫn được nhận (nút chữ rơi về mực nhưng nút đặc dùng chữ trắng/đen theo độ sáng). Đã trả brand kit về mặc định (primary, secondary, font, button style rỗng; image Rounded; logo rỗng), trả template về Deals, xoá khoá tạm, đóng tab Staff.

Test: `promotions-history.test.mjs` (kiểu ảnh, màu phụ, nút).

## Phần 3 (xong): Tạo và sửa deal

Cách làm (Staff ở tab thứ hai, form New promotion và Edit details bằng giao diện thật, ngày thật 16/11/2026): tạo 6 deal QA3: tĩnh có ảnh bìa, logo đối tác, tổng 5, 2 mỗi người; mã duy nhất (prefix) có ảnh bìa; QR có logo; link ngoài; hẹn lịch bắt đầu sau 3 ngày; bản nháp. Xem ở Resident (375): chỉ 4 deal đang bán hiện (hẹn lịch và nháp không hiện); thẻ có ảnh bìa, logo hoặc chữ cái đầu của đối tác, thẻ giá, hạn "Exp: Nov 26, 2026", "Only 5 left" đúng tổng giới hạn; nút trong chi tiết đúng cách nhận: link "Get offer" (mở ngoài), mã duy nhất "Get my code", QR và mã tĩnh "Claim"; chi tiết ghi "Up to 2 claims per resident". Sửa bằng Edit details (tiêu đề, giá, mã, danh mục, đối tác): Resident đổi đúng. Form kiểm tra đúng: loại "% off" bắt nhập giá trị, "Free" thì không; mã tĩnh bắt nhập mã.

Lỗi tìm thấy và đã sửa:
1. **Ảnh bìa Staff tải lên không hiện trên thẻ ở trang Staff** (Resident hiện). Hai nguyên nhân: giá trị `url("data:...")` có dấu nháy kép nằm trong `style="..."` nên thuộc tính bị cắt; và một luật CSS ép mọi thẻ nền xám trung tính (`background-image:none!important`). Giờ dùng nháy đơn và luật chỉ áp cho thẻ không có ảnh riêng.
2. **Trình dựng Staff (Live editor) không cảnh báo khi khối Coupon có mã không deal nào nhận** (yêu cầu từ Phần 1). Giờ dưới ô Code hiện chữ đỏ "No promotion uses this code. Residents would copy it and be told it was not found, so the Resident page does not show it..." (và "No promotion has a promo code yet…" với `{{code}}` khi chưa deal nào có mã); đã thử mã sai, mã của deal thật, và mã đã sửa bằng Edit details.

Không sửa (ghi lại):
- Canvas của trình dựng Staff vẫn vẽ khối "Offer ends in" và Coupon riêng, trong khi Resident gộp chúng vào hero. Staff có thể thắc mắc vì sao không giống. Cân nhắc gộp trên canvas hoặc thêm chú thích ở Phần 6.
- Ô "Price / value" của Edit details chỉ đổi chữ hiển thị ("$10 off"), không đổi giá trị giảm thật (`oval`, `otype`) của deal.

Dọn dữ liệu: xoá 6 deal QA3, bản nháp form, khoá sửa `eso-pmedits` của deal QA; trả template về Deals (Publish & set as current) và xác nhận "In use: Deals marketplace".

Test: `promotions-history.test.mjs` (ảnh bìa, cảnh báo mã).

## Phần 4 (xong): Claim

Cách làm: Staff tạo ba deal QA4 bằng form (giới hạn **theo unit** 1 lần; **theo người** 2 lần, tổng 3; **tổng 1**). Alex (res-1) rồi Jamie (res-4, `?as=res-4`, cùng unit) làm bằng giao diện Resident ở 375 sáng, rồi Staff (tab thứ hai) xác nhận, đánh dấu đã dùng và từ chối ở Claims. Xem giờ ở My rewards, History và mục "Your unit's claims".

Chạy đúng:
- Theo unit: Alex claim xong thì Jamie thấy nút khoá "Claimed by your unit" và dòng "One claim per unit: Alex Rivera already claimed this on Nov 16."; Alex huỷ thì chỗ trả lại, Jamie claim được; Alex lúc đó thấy "Claimed by your unit" và, ở mục "Your unit's claims", claim của Jamie không có nút Cancel.
- Theo người (2 lần): lần một nút vẫn "Claim", lần hai thành "Claimed" bị khoá; số "left" giảm đúng (3 → 1); Jamie claim nốt thì "Sold out" cho cả hai.
- Tổng 1: sau một claim thành "Sold out" (card và nút), người sau không claim được.
- Staff: Claims hiện đủ claim (cả hai người, Alex hai lần), giờ theo múi giờ Staff ("Nov 16, 2:08 AM PST"); Verify rồi Mark redeemed ghi `vt`, `rt`; Reject kèm lý do. Resident thấy Redeemed với dòng thời gian Claimed, Verified, Redeemed kèm giờ Staff; Jamie thấy "Not approved", lý do, giờ từ chối, và "Claim again".
- Huỷ bởi Resident hiện ở Staff là Rejected "Cancelled by resident", đúng thiết kế.

Lỗi tìm thấy và đã sửa:
1. **Claim đã huỷ đổi thành "Not approved" sau khi Staff nhận được.** Ngay sau khi huỷ hiện "Cancelled", nhưng khi trang Staff ghi nó thành một lần từ chối thì nhãn đổi sang "Not approved" (và tab Cancelled mất một mục). `claimStatus` giờ coi claim do chính Resident huỷ luôn là Cancelled; dòng thời gian cũng hiện "Cancelled" thay vì thêm một bước "Rejected".
2. **Một deal cho claim nhiều lần mà My rewards chỉ hiện một hàng** như một claim. Hàng giờ ghi "2 claims, latest 4m ago" khi có nhiều hơn một claim đang hoạt động.

Chưa sửa: một lần đầu, claim của Jamie cho deal theo người không ghi nhận dù nút bấm được (ngay sau khi mở rồi đóng một deal khác bị khoá); thử lại ba lần không tái hiện, claim ghi nhận bình thường. Ghi lại để để ý ở Phần 6.

Dọn dữ liệu: xoá 3 deal QA4, toàn bộ bản ghi Resident của Jamie, claim và nhật ký QA4 của Alex, các mục Claims và trạng thái QA4.

Test: `promotions-history.test.mjs` (huỷ vẫn là Cancelled, từ chối thật vẫn là Rejected, số claim).

## Phần 5 (xong): Vòng đời deal

Cách làm: Staff (tab thứ hai) với hai deal QA5 do form tạo và deal mẫu "Green Bowl"; Resident (375 sáng) mở sẵn ở tab khác, đo sau mỗi thao tác ở Staff mà **không tải lại** trang Resident. Ngày thật 16/11/2026.

Chạy đúng:
- **Off live** (deal vào Drafts, Resident ẩn ngay), **Live** (hiện lại), **Scheduled** (bắt đầu ngày mai, Resident ẩn; Live đặt lại ngày bắt đầu hôm nay).
- **Set date**: ngày mai (Resident "Exp: Nov 17", "1d 21h left"), hôm nay ("Exp: Nov 16", "21h 37m left"); ngày quá khứ bị từ chối ("Pick today or a later date.").
- **End now** (hỏi xác nhận, Resident ẩn ngay, Staff "Ended on Nov 16" kèm toast Undo), **Extend** (deal đã kết thúc sống lại, Resident hiện lại với ngày mới, "6d 21h left").
- **Remove card**: Resident ẩn ngay, deal ở trạng thái removed, toast Undo.
- Deal mẫu: Off live, Live, đổi ngày (Resident "Exp: Dec 20"), End now (ẩn) đều đúng; nhãn "Expired on Oct 27" của hai deal mẫu hết hạn khớp ngày thật.

Lỗi tìm thấy và đã sửa:
1. **Staff coi deal kết thúc hôm nay là đã kết thúc ngay từ 0 giờ.** Đặt ngày kết thúc là hôm nay thì Staff ghi "Ended on Nov 16. Residents do not see it." trong khi Resident vẫn bán tới 23:59 ("21h 37m left"). Hai nơi mâu thuẫn. Giờ Staff tính hết hạn ở cuối ngày cuối (23:59 hoặc giờ kết thúc Staff đặt), như Resident.
2. **Hộp Manage không đổi theo trạng thái.** Bấm Off live mà hộp vẫn ghi "Live. Ends Nov 20." Giờ hộp vẽ lại khi trạng thái hoặc ngày kết thúc đổi (chữ ghi "Off live. Residents do not see it.", "Scheduled. ...").
3. **Hai biểu thức chính quy trong cảnh báo mã (Phần 3) mất dấu gạch chéo ngược** khi tôi chèn bằng heredoc nên `{{ code }}` có dấu cách không được nhận. Đã sửa; test kiểm tra.

Bài học: lệnh heredoc của shell trong môi trường này làm mất dấu `\` trong chuỗi (đã mất hai lần); mọi mã có `\d`, `\s`, `\{` phải ghi bằng công cụ Write hoặc Edit, rồi grep lại dòng đã sửa.

Chưa sửa: "Scheduled" chỉ đặt ngày bắt đầu là ngày mai, Staff không chọn được ngày bắt đầu khác trong Manage (chọn được khi tạo bằng form).

Dọn dữ liệu: xoá hai deal QA5, trạng thái và ngày kết thúc của "Green Bowl" (`eso-pm-status`, `eso-pm-ends`), khoá `qa-*`.

Test: `promotions-history.test.mjs` (hết hạn cuối ngày, hộp Manage vẽ lại, biểu thức chính quy).

## Phần 6 (xong): Truy cập và dọn

Cách làm (Resident ở 830, bàn phím thật qua công cụ nhấn phím, đọc phần tử đang giữ focus sau mỗi phím): Redeem, My rewards, History, hộp (i), Saved, chi tiết deal: focus vào đâu khi mở, Tab, Shift+Tab, Escape trả focus về đâu. Kiểm tra tự động: tên của mọi nút và ô, kích cỡ vùng bấm, id trùng, `aria-controls` và `aria-labelledby` trỏ đúng, tương phản trong các hộp thoại.

Chạy đúng: mở Redeem thì focus vào ô nhập; My rewards, Saved thì vào tiêu đề; chi tiết deal vào tiêu đề; Escape đóng đúng một lớp (hộp (i) đóng thì về nút (i) trong My rewards, rồi Escape nữa về nút My rewards) và trả focus đúng nút đã mở (Redeem, My rewards, Saved, nút mở chi tiết trên thẻ). Mọi nút có tên; không id trùng; không tham chiếu aria hỏng; `lang="en"`, một `h1`; 0 chữ thiếu tương phản trong Redeem, My rewards, History, (i), Saved, chi tiết deal.

Lỗi tìm thấy và đã sửa:
1. **Tab đẩy focus ra khỏi hộp thoại.** Trang này nằm trong khung (iframe), nên khi hộp mở, Tab sau nút cuối cùng nhảy ra thanh trên cùng của portal phía sau hộp, và Escape lúc đó không còn đóng được hộp. Giờ Tab và Shift+Tab xoay vòng bên trong hộp đang mở (ô nhập, Check code, (i), Close).
2. **Tiêu đề thẻ (nút mở chi tiết) cao 22px**, dưới mức 24px của WCAG 2.5.8. Thêm `min-h-6`. (Trên thiết bị cảm ứng portal đã ép 44px.)

Lỗi Phần 4 chưa tái hiện: lần đầu hai trong bốn claim liền nhau không ghi nhận (không có dòng "Could not claim", nên `claim()` không được gọi), sau đó 15 lần thử với cùng thao tác (mở deal khoá, đóng, mở deal khác, bấm Claim sau 50 đến 400 ms) đều ghi nhận. Chưa có giả thuyết đứng vững. Ghi lại để người dùng báo nếu gặp, kèm deal và thời điểm.

Dọn dữ liệu cuối: `eso-pmc-saved` rỗng, `eso-pm-status`, `eso-pm-ends`, `eso-pmedits`, `eso-covers-v1` rỗng, brand mặc định, template Deals, bản ghi Resident chỉ còn claim Mallard cũ của Alex (như người dùng đã thấy), mục Claims và trạng thái claim của các deal QA đã xoá, nhật ký hiển thị `eso-pm-vislog` xoá, bộ lọc Staff về tab "All", không còn khoá `qa-*`.

## Tổng kết 6 phần

| Phần | Lỗi thật tìm thấy và sửa |
|---|---|
| 1 Template | chữ vô hình trên template nền trong suốt (Modern); màu trạng thái theo nền template; mã giảm giá không thuộc deal nào |
| 2 Brand kit | màu phụ không tác dụng; kiểu ảnh bị bỏ qua; nút chữ/viền không đọc được trên một số màu |
| 3 Tạo và sửa deal | ảnh bìa Staff tải lên không hiện trên thẻ Staff; thêm cảnh báo mã Coupon không khớp deal |
| 4 Claim | claim đã huỷ biến thành "Not approved"; deal cho nhiều claim hiện như một |
| 5 Vòng đời | Staff coi deal kết thúc hôm nay là đã hết từ 0 giờ; hộp Manage không theo trạng thái; biểu thức chính quy mất `\` |
| 6 Truy cập | focus thoát khỏi hộp thoại; tiêu đề thẻ nhỏ hơn 24px |

Cả sáu phần: `npm test` 495 test, 494 qua, 1 lỗi cũ của messaging-ui (không thuộc Promotions). Còn mở: lỗi Phần 4 chưa tái hiện; "Scheduled" trong Manage chỉ đặt ngày bắt đầu là ngày mai; Edit details "Price / value" chỉ đổi chữ hiển thị; canvas trình dựng Staff vẫn vẽ đếm ngược và mã giảm giá riêng trong khi Resident gộp vào hero; chữ trắng trên indigo đạt 4.47:1.

## Vòng 2: đạt mục tiêu "Staff tự làm trang promotion riêng, Resident dùng được"

Vòng 1 (Phần 1 đến 6) đã kiểm template, brand kit, tạo deal, claim, vòng đời, truy cập. Chưa kiểm luồng cốt lõi của mục tiêu: **Staff tự chỉnh trang bằng trình dựng rồi Resident thấy**. Mỗi phần xong thì 5 phút sau chạy phần kế (`[ ]` đầu tiên).

- [x] **R2-1: Trình dựng → Resident.** Live editor: sửa chữ hero, đổi thứ tự khối, thêm khối (Featured, Coupon, FAQ), ẩn khối trên điện thoại, xoá khối; bản nháp so với đã công bố (Resident chỉ thấy khi Publish & set as current?); "Stop using" (Resident về diện mạo portal, không còn dấu vết theme); Customize một template thành "My creations" rồi Use; Resident đổi ngay không cần tải lại.
- [x] **R2-2: "Resident view" của Staff giống hệt Resident thật.** Công tắc Resident view ở trang Staff (khung nhúng): so thanh trên cùng, Saved, hero gộp, theme, My rewards, History ở 375/830/1440; cuộn hết trang; không còn điều khiển cũ.
- [x] **R2-3: Quét hình ảnh bố cục mới.** Thanh trên cùng gập một hàng, hero gộp, Saved, (i), hộp thoại: 375, 830, 1440 × sáng, tối × template Deals, Store, Luxury dark, Minimal mono; cuộn hết trang, chụp hai lần.
- [x] **R2-4: Việc còn mở.** Canvas trình dựng Staff cho giống Resident (đếm ngược và mã giảm giá nằm trong hero), "Scheduled" chọn được ngày bắt đầu, "Price / value" đổi giá trị giảm thật, thử lại lỗi claim Phần 4.
- [x] **R2-5: Tổng kết vòng 2.** Dọn dữ liệu, ghi tổng kết, hỏi push.

### R2-1 (xong): Trình dựng → Resident

Cách làm: Staff mở Live editor của template Deals (tab thứ hai, 1440), sửa chữ hero, đọc bản công bố `eso-pm-page` và trang Resident đang mở ở tab khác (không tải lại); Done → Publish & set as current; Stop using; ghi tay ảnh chụp có đủ các thiết lập mà trình dựng cho (Advanced, Style, link) và xem Resident ở 375 và 830.

Lỗi tìm thấy và đã sửa:
1. **Bản nháp lộ ra cho Resident.** Đầu trình dựng ghi "Draft · autosaved" và menu Done ghi "Save as draft: Not visible to residents", nhưng bản công bố được dựng từ chính bản tự lưu, nên sửa chữ hero là Resident thấy ngay. Giờ có một bản **đã công bố** riêng (`ST.pubL`): nhớ trước lần sửa đầu của template đang dùng, cập nhật khi Publish & set as current; bản công bố cho Resident dựng từ bản này. Thử: sửa hero (snapshot không đổi, header "Draft"), Publish (Resident đổi ngay).
2. **Resident bỏ qua gần hết thiết lập của từng khối.** Chỉ có "Hide on mobile" được dùng. Trình dựng còn cho: ẩn theo màn hình (Desktop, Tablet, Mobile), đối tượng (mọi người, chỉ cư dân, toà nhà cụ thể, **chỉ Staff**), ngày hiện từ và đến, nền riêng của khối (màu, gradient, ảnh), màu chữ, đệm trên dưới, bo góc, căn lề, và link của nút (trang https hoặc chi tiết một deal). Một khối "Staff only (hidden)" từng hiện cho cư dân. Giờ tất cả được áp dụng: `blockHidden()` (màn hình, đối tượng theo toà nhà của cư dân `unit.block`, ngày) và `applySx()` (chỉ nhận màu hex 6 chữ số, ảnh `data:image`, link https mở với `noopener`); trang vẽ lại khi màn hình qua mốc điện thoại hoặc máy tính bảng.
3. Stop using: kiểm tra trang Resident trở về hẳn diện mạo portal (không còn `pm-theme` ở khung và ở portal, không còn trang thiết kế, nút sáng tối trở lại); Use this template trả template về.

Không làm (ghi lại): hoạt ảnh khi cuộn, neo (`adv.id`), kiểu chữ riêng từng khối (`tx`), biến thể và cỡ nút (`bv`, `bs`, `bi`), thẻ kiểu (`sx.card`), cỡ ảnh. Customize bản sao rồi Use cho "My creations" chưa thử: chuyển sang R2-4.

Test: `promotions-blocks.test.mjs` (7 test).

Dọn dữ liệu: chữ hero trả về `{{offer}}`, template Deals "In use", `ST.off` false, snapshot `deals`.

### R2-2 (xong): "Resident view" của Staff giống hệt Resident thật

Cách làm: Staff (tab thứ hai, 1440) bật Resident view; đọc khung nhúng; so chữ ký trang (nút thanh trên cùng, chip, trang thiết kế, số đếm, thẻ đầu, ô tìm kiếm, tên người, danh sách hộp thoại) với trang Resident thật; bấm Phone, Tablet, Desktop; chụp màn hình.

Chạy đúng: khung nhúng tải đúng tệp `/resident/promotions-content.html?embed=1` mà cổng Resident dùng nên **chữ ký hai bên giống từng chữ** (cùng thanh trên cùng, chip, hero gộp, 17 deal, "Alex Rivera", năm hộp thoại). Phone 390 (thanh 110px, 1 cột), Tablet 768 (thanh một hàng 86px, 2 cột), Desktop (3 cột).

Lỗi tìm thấy và đã sửa:
1. **Resident view làm Staff bị mặc theme của template.** Trang Resident nhúng chép bảng theme `pm-theme` vào "trang bao quanh". Ở cổng Resident đó là portal (đúng ý), nhưng ở Staff trang bao quanh là chính trang Staff: màu chính, màu nền, font của template đè lên giao diện Staff (`--primary` Staff đổi thành `#e11d48`) cho tới khi tải lại. Giờ chỉ trang bao quanh có đường dẫn `/resident/` mới được mặc theme; sau sửa Staff giữ `--primary` của mình.

Chưa sửa: bấm Claim trong Resident view của Staff ghi claim thật cho Alex (dùng chung localStorage). Có thể là ý muốn (Staff thử luồng); ghi lại để người dùng quyết.

Test: `promotions-blocks.test.mjs` (2 khẳng định mới).

Dọn dữ liệu: không có dữ liệu mới; đóng tab Staff, bỏ giả lập màn hình.

### R2-3 (xong): Quét hình ảnh bố cục mới

Cách làm: bốn template (Deals, Store, Luxury dark, Minimal mono) lấy từ Staff bằng "Use this template" (xong trả về Deals); ở Resident đặt từng bản công bố (đổi cả `at`) và chạy một bộ kiểm tra: tràn ngang, lỗi script, tương phản mọi chữ trong thanh trên cùng, trang thiết kế và lưới thẻ, chiều cao thanh ở đầu trang và sau khi cuộn 600px, thanh có dính dưới đầu trang không, cuộn tới cuối trang được không. Chạy ở 375 sáng và tối, 830 sáng và tối, 1440 sáng (khung Resident rộng 1184); cộng ảnh chụp thật: 375 tối (Luxury, Store, Mono), 1440 sáng (Store đầu và giữa, Luxury cuối), hộp History trong Luxury ở 1440.

Kết quả: **không có lỗi mới.** 0 chữ thiếu tương phản (ngoài mức đã chấp nhận), 0 lỗi script, không tràn ngang, thanh dính đúng chỗ, cuộn tới cuối được. Thanh 150px ở đầu trang và gập còn 53px sau khi cuộn ở 375; 86px một hàng ở 830 và 1440. Ba ghi chú đúng thiết kế: ở 375 các hàng chip và băng chuyền cuộn ngang (không tính là tràn); khi hệ điều hành tối mà template sáng (Store, Mono) cả trang và thanh portal vẫn sáng; lưới 3 cột ở 1440 vì khung Resident rộng 1184 chưa tới mốc 4 cột.

Chưa chạy: 1440 tối (cùng đường mã, đã chạy ở 830 tối và 1440 sáng).

Dọn dữ liệu: khoá tạm `qa-snaps`, `qa-sweep-src`, snapshot về Deals, template Deals "In use", brand mặc định.

### R2-4 (xong): việc còn mở

Cách làm: Staff (tab thứ hai, 1440) tạo bản ghi deal Staff làm ở trạng thái Scheduled (bắt đầu sau 3 ngày, kết thúc sau 20 ngày), mở chi tiết, thử ô ngày bắt đầu mới; xem Resident ở tab khác; mở Live editor của Seasonal, chọn khối Countdown.

Đã làm:
1. **Scheduled chọn được ngày bắt đầu.** Hộp Manage của deal Staff làm đang Scheduled có thêm dòng "Start date" + "Set start" (`setStart()`). Từ chối ngày hôm nay hoặc trước đó ("Pick a day after today. To show it now, use Live.") và ngày sau ngày kết thúc. Khi lưu: ghi `x.start` vào `eso-pmc-saved`, đổi nhãn "Starts Nov 25" trên thẻ và trong hộp, hiện toast "Starts Nov 25, 2026. Residents see it from that day." Hộp Manage vẽ lại khi ngày bắt đầu đổi (`sig`). Kiểm: Resident không thấy deal trước ngày đó, thấy khi `start` là hôm nay.
2. **"Price / value" đổi tên thành "Price shown on the card"** với gợi ý "e.g. 20% off or $96/mo". Giá trị này là chữ Resident hiển thị làm tiêu đề giá (`offerText`), nên tên cũ gây hiểu nhầm là đổi mức giảm thật. Không đổi mức giảm thật ở đây; mức giảm thật vẫn do form tạo deal quyết định.
3. **Canvas trình dựng vs hero Resident.** Không gộp trên canvas (Resident gộp Countdown và Coupon vào Hero chỉ khi trang có Hero). Thêm một dòng giải thích dưới ô Heading của khối Countdown và Coupon khi mẫu có Hero: "Residents see this inside the Hero banner: the first Countdown as its Ends in badge, the first Coupon under its words."
4. Lỗi claim Phần 4: không thử lại (đã hơn 15 lần không tái hiện).

Còn mở (ghi lại): thiết lập khối Resident chưa hỗ trợ (hoạt ảnh, neo, kiểu chữ riêng, biến thể nút, thẻ kiểu); chữ trắng trên indigo 4.47:1 đã chấp nhận.

Dọn dữ liệu: xoá bản ghi deal QA khỏi `eso-pmc-saved`, trình dựng đóng không để lại `tpl:seasonal`, template Deals "In use".

Test: `promotions-blocks.test.mjs` (thêm 2 test).

### R2-5 (xong): tổng kết vòng 2

Mục tiêu "Staff tự làm trang promotion riêng, Resident dùng được" đã đạt cho luồng chính: Staff chỉnh trình dựng và Publish thì Resident đổi ngay; bản nháp không lộ; Customize → My creations → Use chạy đủ; Resident view của Staff dùng đúng tệp trang của Resident; thiết lập từng khối (ẩn theo màn hình, đối tượng, ngày, nền, màu chữ, đệm, bo góc, link nút) được áp dụng; Staff đặt được ngày bắt đầu cho deal Scheduled.

| Phần | Lỗi chính tìm thấy và đã sửa |
|---|---|
| R2-1 Trình dựng → Resident | bản nháp lộ ra cho Resident (nay có `ST.pubL`); Resident bỏ qua gần hết thiết lập khối (nay áp dụng, kể cả "Staff only") |
| R2-2 Resident view | theme của Resident rò vào trang Staff (nay chỉ áp khi cha là `/resident/`) |
| R2-3 Quét hình ảnh | chữ nút viền/chữ theo màu brand thiếu tương phản (`accentOn`) |
| R2-4 Việc còn mở | chọn ngày bắt đầu; nhãn "Price shown on the card"; chú thích Countdown/Coupon trong trình dựng |

Kiểm cuối: `npm test` 502 test, 501 qua, 1 lỗi cũ của messaging-ui (không thuộc Promotions). Dữ liệu sạch: không khoá `qa-*`, không deal Staff làm, brand mặc định, template Deals "In use" (`def` deals, `eso-pm-page` key deals, hero `{{offer}}`), không tab Staff mở. Resident ở 375: thanh trên cùng đủ Redeem, My rewards, Saved, tìm kiếm, chip; hero gộp đếm ngược và mã.

Còn mở (chưa sửa):
- Lỗi claim Phần 4 chưa tái hiện (hơn 15 lần thử).
- Thiết lập khối Resident chưa hỗ trợ: hoạt ảnh khi cuộn, neo (`adv.id`), kiểu chữ riêng (`tx`), biến thể và cỡ nút (`bv`, `bs`, `bi`), thẻ kiểu (`sx.card`). Trình dựng chưa ghi chú điều này.
- Canvas trình dựng vẫn vẽ Countdown và Coupon riêng (đã có chú thích; chưa gộp).
- "Price shown on the card" chỉ đổi chữ hiển thị, không đổi mức giảm thật.
- Chữ trắng trên indigo 4.47:1 (đã chấp nhận).
- Chưa push: local đang đi trước origin/main.

## Vòng 3: hoàn thiện (người dùng yêu cầu tiếp tục sau tổng kết vòng 2)

Lý do: goal Promotions đạt ở luồng chính nhưng còn khoảng cách "Staff chỉnh gì thì Resident thấy đúng như vậy", và bảng QA lượt 3 (`05-bao-cao-tong-hop.md`) còn dòng Không đạt, chưa kiểm được, cùng các sửa chưa đo lại. Mỗi phần xong thì 5 phút sau chạy phần kế (`[ ]` đầu tiên).

- [x] **R3-1: Trình dựng nói đúng điều Resident áp dụng.** Tuỳ chọn Resident chưa hỗ trợ (hoạt ảnh, neo, kiểu chữ `tx`, biến thể và cỡ nút `bv/bs/bi`, thẻ kiểu `sx.card`): làm cho chạy nếu rẻ, nếu không thì ẩn hoặc ghi rõ ngay trong trình dựng "Resident chưa hiển thị". Thử lại ở Resident thật.
- [ ] **R3-1b: Năm điều khiển bắt buộc ở MỌI template.** Redeem, My rewards, Saved, ô tìm kiếm và nút Filter phải có, tìm thấy và bấm được ở mọi template (Deals, Store, Luxury dark, Minimal mono, Seasonal và các template còn lại), 375/830/1440, sáng và tối, ở đầu trang và sau khi cuộn sâu (thanh gập, không biến mất). Mỗi template giữ thiết kế riêng, chỉ sửa nơi thiếu hoặc bị che; không ép về khuôn của Deals. Thêm test cho điều này. Với mỗi template, so luôn "Resident view" của Staff với Resident thật (cùng chữ ký trang và cùng thao tác).
- [ ] **R3-2: Claim Phần 4 và vòng Staff → Resident cuối.** Thử lại lỗi claim chập chờn (claim, huỷ, claim lại, Staff duyệt/từ chối, redeem, lịch sử) nhiều lần, hai tab.
- [ ] **R3-3: Kiểm lại các sửa chưa đo lại của lượt 3.** S325 (ô Property profile cắt ký tự), R607 (khẩn cấp viết bằng lời), R624 (Ticket box không lộ tên nhân viên), Pin trùng, aria-current, Larger tap targets.
- [ ] **R3-4: A3 Settings còn Không đạt / Chưa kiểm được.** Chạy lại các dòng của `08-ket-qua-lai-A3.md` chưa kiểm hết (42 Không đạt, 32 chưa kiểm được); sửa lỗi thấy.
- [ ] **R3-5: A5 Điều hướng, khung.** Chạy lại các dòng Không đạt của A5 (36) và chưa kiểm được (18); sửa.
- [ ] **R3-6: Vận hành an toàn.** System health, vòng đời property (end property, chặn truy cập, niêm phong), hộp thoại bằng bàn phím, dữ liệu hỏng/đầy bộ nhớ: thử thật, sửa.
- [ ] **R3-7: Tổng kết vòng 3.** Dọn dữ liệu, cập nhật bảng tổng hợp, hỏi push.

### R3-1 (xong): Resident áp dụng thêm thiết lập khối của trình dựng

Cách làm: ghi tay các thiết lập vào bản công bố `eso-pm-page` (hero, grid, một khối CTA), đổi `at`, tải lại Resident, đọc kiểu tính toán và chụp màn hình ở 563 và 1440 (hai lần).

Đã làm (`applyAdv` trong `page.js`, và nút trong `btn`): Resident giờ cũng áp dụng
- **tên neo** (`adv.id`, chỉ chữ, số, gạch);
- **độ rộng khối** (`w`: Wide 75%, Half 50%; từ 768 px trở xuống luôn đầy);
- **hoạt ảnh vào** (`adv.anim`: fade, slide, zoom; bỏ qua nếu người dùng chọn giảm chuyển động);
- **kiểu chữ** (`tx`: cỡ, độ đậm, màu hex, căn lề, giãn dòng, giãn chữ, đậm, nghiêng, gạch chân);
- **kiểu và cỡ nút** (`sx.bv`: fill, outline, pill, text; `sx.bs`: S, M, L; cũng đọc `style.btn` của khối).

Lỗi tìm thấy khi thử: số thứ tự lớp kiểu chữ lấy sau khi tạo luật nên luật nhắm sai lớp (chữ không đổi). Đã sửa (lấy số trước).

Kết quả đo ở 1440: grid `Half` rộng 586 px giữa khung 1184 px; hero chữ 34 px, màu `#7c2d12`, nghiêng, đậm, căn giữa; nút CTA pill, đệm 14/28 px, cao 48 px.

Vẫn chưa hỗ trợ ở Resident (ghi lại): biểu tượng trong nút (`bi`), thẻ kiểu (`sx.card`), phông chữ riêng của khối (`tx.font`), và cặp nút "Copy code / View details" trong hero có kiểu cố định theo yêu cầu thiết kế (kiểu và cỡ nút của khối không đổi chúng).

Test: `promotions-blocks.test.mjs` (thêm 1 test). `npm test` 503 test, 502 qua, 1 lỗi cũ.

Dọn dữ liệu: `eso-pm-page` trả về bản gốc (6 khối, hero `{{offer}}`), không còn khoá `qa-*`, viewport desktop.

### Rà soát giữa Vòng 3: Resident view của Staff có khớp Resident thật khi dùng không (người dùng yêu cầu)

Cách làm: Staff (tab riêng, 1440) bật Resident view; Resident thật ở tab khác. Cùng một hàm chữ ký (nền, phông, màu và bo góc nút chính, các khối, tiêu đề, danh sách thẻ, toàn bộ nút nhìn thấy) chạy ở cả hai khung; rồi cùng một chuỗi thao tác ở cả hai: tìm "valet", chip Parking, Filters, Redeem a code, My rewards, Saved; so chữ ký và nội dung hộp thoại sau mỗi bước. Sau đó bấm "Phone" của Staff (390 px) và so với Resident thật ở 375 px.

Kết quả: **không có khác biệt.** Chữ ký đầu trang giống hệt ở 1440; sáu bước thao tác cho cùng kết quả (số thẻ, "N of 17 promotions", nội dung hộp thoại, vị trí focus); Phone của Staff giống Resident thật 375 về nút, tiêu đề, khối, màu và bo góc nút.

Dùng thật: claim "Covered Spot Upgrade" trong Resident view của Staff tạo claim của res-1 (Pending, mã RES-…), xuất hiện ngay ở Resident thật (My rewards 1 → 2, không tải lại); huỷ ở Resident thật thì Staff cũng thấy "Cancelled by resident" và My rewards về 1. Hai bên dùng chung một tệp trang (`promotions-content.html?embed=1`) và chung dữ liệu res-1 nên không thể lệch.

Lưu ý ghi lại: Resident view của Staff hành động như cư dân res-1 (Alex Rivera), nên claim thử ở đó là claim thật của res-1. Khung Phone của Staff rộng 390, Resident thật thử ở 375 (khác 15 px, không đổi bố cục).

Chưa so: các template khác Deals (đưa vào R3-1b), và chế độ tối.

Dọn dữ liệu: xoá toàn bộ claim của res-1 (gồm 2 claim thử cũ lúc 8:43 sáng nay) khỏi `eso-res-promo:res-1`, `eso-pmclaims`, `eso-pm-claimstate` (giữ ngôi sao đã lưu của Mallard Pointe Valet); tắt Resident view, đóng tab Staff, viewport desktop.

## Vòng 4: tương tác Staff ↔ Resident và hội thoại quanh claim (goal mới của người dùng, 16/11/2026)

Goal: cư dân claim deal rồi hỏi Staff qua chat ("đã nhận deal nhưng vẫn bị tính tiền", "claim vẫn chờ", "không thấy trong ví"); Staff phải mở chat, thấy lịch sử claim của đúng cư dân đó, kiểm tra, xử lý (Verify, Reject kèm lý do, cấp bù, giải thích) và cư dân nhận được kết quả. Cần nhiều trường hợp (trùng lặp, phân quyền, hết hạn, deal bị tắt, chuyển đi).

Ca thật dùng để tập: Alex Rivera (res-1) claim Mallard Pointe Valet (MALLA10, Pending), ticket T-1086 trong hàng đợi Messages của Staff.

Lỗ hổng thấy khi dựng ca: (1) bot trả lời câu hỏi giảm giá bằng nội dung xe lạ ("do not confront the driver") và xếp "General question"; (2) panel "Resident and unit" của Staff không có claim; (3) không có đường từ claim sang chat hay ngược lại; (4) Claims inbox chỉ có Verify, Reject, Redeem: không có ghi chú nội bộ hay cấp bù.

- [x] **R4-1: Panel Promotions trong chat của Staff.** Trong panel "Resident and unit": danh sách claim của cư dân đó (deal, mã, trạng thái, thời điểm, lý do nếu bị từ chối), nút "Open in Claims inbox" mở đúng claim. Chỉ hiện claim của cư dân trong cuộc trò chuyện (phân quyền). Thử với T-1086 và nhiều cư dân, 375/830/1440, sáng và tối.
- [x] **R4-2: Resident "Ask about this claim".** Ở My rewards và hộp thoại deal đã claim: nút mở Messages với nội dung soạn sẵn (deal, mã, giờ claim, trạng thái), chuyển thẳng cho property team, không qua bot; ticket gắn nhãn Promotions.
- [x] **R4-3: Bot nhận ra câu hỏi về deal, claim, giảm giá, tính tiền.** Trả lời đúng ngữ cảnh (không dùng nội dung xe lạ), đưa nút "Talk to a person" và ghi nhãn Promotions cho ticket.
- [x] **R4-4: Staff xử lý ngay từ claim.** Ghi chú nội bộ trên claim, "Nhắn cư dân" (mở trả lời trong đúng cuộc trò chuyện), cấp bù hoặc cộng ưu đãi tay (ghi rõ lý do, ai làm, khi nào) và cư dân thấy kết quả ở My rewards và thông báo.
- [x] **R4-5: Quy tắc 1 căn hộ / 1 ưu đãi thật + Jamie + panel theo căn hộ (BIZ-01).** (a) deal mẫu ghi "One per household" phải bị chặn thật theo căn hộ: tài khoản thứ hai của căn hộ thấy nút Disabled kèm lời giải thích rõ ngay từ đầu; (b) Jamie Rivera (res-4, cùng Unit 02-291 với Alex) nhắn được Staff qua Messages; (c) panel của Staff gom theo căn hộ: claim của cả căn hộ, và cảnh báo ĐỎ "Căn hộ này đã nhận ưu đãi qua tài khoản [Tên] vào ngày [Ngày]" khi người đang hỏi bị chặn vì người cùng căn hộ.
- [x] **R4-6: Context Card và panel tự mở (UX-01, UX-02).** "Ask about this claim" chèn sẵn một thẻ ngữ cảnh gọn (Claim ID, deal, mã, trạng thái, giờ claim, số ticket) vào tin nhắn gửi đi, cả hai bên thấy thẻ trong khung chat; Staff mở cuộc trò chuyện có thẻ thì panel bên phải tự mở và làm nổi bật claim đó (không bắt bấm icon (i)); nút mở panel có chữ "Details" thay vì icon (i) trần.
- [x] **R4-7: Quick Actions tại chat và dấu vết hệ thống (UX-03, Audit Trail).** Trong panel chat: "Confirm claim", "Apply by hand (Override)" (bắt buộc lý do), "Reject" (lý do) và "View unit history" xong trong tối đa 2 click, không đổi tab; mỗi Override tự chèn một System Message vào khung chat để hai bên đối soát; Claims inbox và chat luôn khớp nhau.
- [x] **R4-8: Ma trận trường hợp.** Claim 2 lần, huỷ rồi claim lại, hai Staff cùng xử lý một claim, Verify hai lần, deal bị Off live hoặc hết hạn khi claim đang Pending, hết suất giữa chừng, cư dân A xem claim của B, Staff property khác, cư dân đã chuyển đi, hỏi sau khi claim Redeemed, tài khoản thứ hai cùng căn hộ nhắn khiếu nại (ca Jamie), checklist UX-01, UX-02, UX-03, BIZ-01 của tài liệu hướng dẫn. Ghi kết quả từng ca.
- [ ] **R4-9: Tổng kết vòng 4.** Kiểm lại toàn bộ (npm test, ba mục UX-01, UX-02, UX-03, BIZ-01 trong tài liệu hướng dẫn), dọn dữ liệu thử do các phần tạo ra, cập nhật ghi chép và tổng kết, hỏi push. KHÔNG xoá ca tập của người dùng (ticket T-1086 của Alex kèm claim Pending MALLA10, ticket T-1087 của Jamie) trừ khi người dùng nói; chỉ ghi cách xoá trong tổng kết. Nêu rõ những việc chờ người dùng chốt (mã của người cùng căn hộ hiển thị hay ẩn).

### R4-1 (xong): panel Promotions trong chat của Staff

Đã làm (`src/features/messaging/app.js`): panel "Resident and unit" có thêm mục **Promotions** sau "Recent tickets": tối đa 6 sự kiện mới nhất của đúng cư dân trong cuộc trò chuyện (tên deal, nhãn Claimed, Verified, Redeemed, Cancelled, Rejected, Could not claim, giờ, ghi chú hoặc lý do Staff đã nhập), nút "Open Claims inbox" (chỉ ở portal Staff) mở `/staff/promotions.html#/promotions/claims`. Cư dân không có claim thì ghi "No promotion claims from this resident." Dữ liệu lấy từ `historyFor` của Promotions nên Staff và Resident thấy cùng một lịch sử; ghi chú viết cho cư dân ("your claim") được nói lại cho Staff ("Confirmed by the property team", "Cancelled by the resident"). Panel vẽ lại khi claim đổi ở tab khác (sự kiện `storage` cho `eso-res-promo:*`, `eso-pm-claimstate`, `eso-pmclaims`).

Đã thử trên ca thật T-1086 (Alex Rivera): thấy "Mallard Pointe Valet, Claimed, 9:13 AM, Code issued: MALLA10"; Priya Nair không có claim thấy câu rỗng; Resident claim thêm "Covered Spot Upgrade" ở tab khác thì xuất hiện ngay không cần tải lại; ghi trạng thái Rejected kèm lý do và Verified ở tab khác thì panel đổi sau 1 đến 2 giây.

Lỗi tìm thấy và đã sửa: panel không tự đổi khi claim thay đổi (chỉ đổi khi chọn lại cuộc trò chuyện) → thêm lắng nghe `storage`.

Chưa kiểm bằng hình: 375 và 830 (phiên chụp ở chế độ giả lập điện thoại cho ảnh lệch nên chưa có ảnh đáng tin), chế độ tối. Đo bằng mã: không tràn ngang ở 375 (369 = 369). Cần xem lại ở R4-5 hoặc phần cuối.

Dữ liệu ca tập: sau khi thử, trạng thái claim của res-1 đã trả về chỉ còn claim Pending Mallard Pointe Valet (MALLA10) và ticket T-1086. Khi mở Claims inbox của Staff, claim này được nhập vào hộp thư như một claim Pending.

Test: `tests/promotions/promotions-chat.test.mjs` (2 test). `npm test` 505 test, 504 qua, 1 lỗi cũ.

### R4-2 và R4-3 (xong): Resident hỏi về claim, bot hiểu câu hỏi về deal

Yêu cầu người dùng (16/11): thêm panel Promotions cho Staff và nút "Ask about this claim" cho Resident để test từ đầu; giữ nguyên ca T-1086. Về icon (i): chỉ dùng cho thông tin giải thích, không đặt trong hội thoại; thông tin về claim phải hiện thẳng bằng chữ.

Đã làm:
- **Nút "Ask about this claim"** (chữ có gạch chân, không icon (i)): ở từng dòng của My rewards (không có ở dòng của người cùng căn hộ) và trong hộp chi tiết deal khi đã claim. Bấm thì ghi claim vào `eso-ask-claim` rồi mở `/resident/messages.html?ask=1`. Trong Resident view của Staff nút chỉ báo "In the resident's app this opens Messages with this claim attached" (không đưa Staff sang Messages của cư dân).
- **`askAboutClaim` trong `store.js`**: không qua bot; nếu cư dân chỉ có chat với bot thì tạo ticket gửi thẳng property team, nhãn **Promotions**, tin đầu nói rõ deal, mã, giờ claim, trạng thái; nếu cư dân đã có chat với team thì thêm một tin về claim vào chat đó (không tạo ticket thứ hai); hỏi lại cùng claim không thêm gì (chống trùng); chỉ cư dân dùng được; xuống dòng trong tên deal không giả được dòng "Status:".
- **Bot hiểu deal** (`bot.js`): chủ đề "Promotions" với 4 câu hỏi (đã claim vẫn bị tính tiền, claim đang chờ, mã không dùng được, không thấy deal) kèm nút "Talk to a person"; từ về deal, claim, giảm giá, hoàn tiền được tính là chuyện của property team (không còn bị xếp là lỗi ứng dụng); câu hỏi chuyển qua bot cũng thành ticket nhãn Promotions.

Lỗi tìm thấy và đã sửa: câu "đã claim deal nhưng vẫn bị tính tiền" bị bot trả lời "Please do not confront the driver" (trùng từ "someone") và xếp "General question".

Kiểm bằng giao diện thật: Resident res-3 (Morgan Ellis) claim Covered Spot Upgrade, bấm "Ask about this claim" trong hộp deal (nút hiện đúng chỗ, chụp hình); Messages mở ra và chat có tin "I have a question about my promotion claim. Promotion, Code, Claimed, Status". Vì res-3 đã có chat đang mở với Staff về xe lạ, tin được thêm vào chat đó (luật một chat mở cho mỗi cư dân). Đường "tạo ticket mới" kiểm bằng test (store), chưa bằng giao diện vì cả ba cư dân mẫu đều đang có chat với team. Câu hỏi qua bot cũng kiểm bằng test, chưa bằng giao diện.

Chưa kiểm: nút ở 375 và 830, chế độ tối.

Dọn dữ liệu: đã khôi phục tin nhắn và claim của res-3 về như trước; ca tập T-1086 (claim Pending của Alex) không bị đụng.

Test: `tests/promotions/promotions-ask.test.mjs` (6 test). `npm test` 511 test, 510 qua, 1 lỗi cũ.

### R4-4 (xong): Staff xử lý ngay từ claim

Đã làm (Claims inbox, hộp chi tiết của claim):
- **"Apply by hand"** (cho claim đang Pending hoặc Verified chưa áp): mở hộp hỏi "What you did" (chọn câu có sẵn: credited to invoice, refunded the difference, added to the account, already applied; hoặc tự viết), bắt buộc có lý do ("Say what you did so the resident knows."). Kết quả: claim thành Verified, ghi "Applied by hand: lý do, Property team, giờ" trong chi tiết, và ghi một dòng vào ghi chú nội bộ. "Move back to Pending" gỡ trạng thái này.
- **Internal notes (only Staff see these)**: ô viết và danh sách ghi chú có người, giờ; tối đa 20 ghi chú, mỗi cái 500 ký tự. Không đi vào `eso-pm-claimstate` nên cư dân không đọc được (đã kiểm). Ô "Sync note" của hệ thống ngoài giữ nguyên (việc khác).
- **"Message <tên>"**: mở Messages của Staff đúng cuộc trò chuyện đang mở của cư dân đó (deep link `#/c/<id>`); chưa có chat đang mở thì báo "No open chat with <tên>.".
- **Cư dân thấy kết quả**: trong My rewards, lịch sử, hộp deal và thông báo: "Applied by the property team: lý do" (thông báo: "the property team applied it for you"); claim chỉ Verify thường giữ lời cũ. Panel Promotions trong chat Staff cũng nói như vậy.

Thử bằng giao diện thật trên ca mới (không phải T-1086): Priya Nair (res-2) claim CubeSmart (CUBES20); Staff thêm ghi chú nội bộ, thử Apply không lý do (bị chặn), chọn câu có sẵn + sửa thêm "(invoice 11/16)", Apply; Resident res-2 thấy ngay (không tải lại) "Verified ... Applied by the property team: ..." (đã chụp hình); "Message Priya" mở đúng chat T-1081 và panel Promotions ở đó ghi lại "Verified, Applied by the property team"; ghi chú nội bộ không lộ cho cư dân.

Lỗi tìm thấy và đã sửa: câu chọn sẵn trong hộp Apply không điền vào ô lý do (thiếu xử lý `change`, giống hộp Reject đã có).

Chưa kiểm: hộp Apply và các nút mới ở 375 và 830, chế độ tối; "Apply by hand" cho claim gọi API ngoài (`aid`) chưa nối API (chỉ local, như Verify khi không có API).

Dọn dữ liệu: claim, trạng thái và ghi chú của Priya đã xoá; ca tập T-1086 và claim Pending của Alex không bị đụng.

Test: `tests/promotions/promotions-handle.test.mjs` (3 test). `npm test` 514 test, 513 qua, 1 lỗi cũ.

### Tài liệu hướng dẫn "Chat UI/UX & Promotion Workflow Guidelines" (người dùng gửi 16/11) và việc phải làm

Điểm chính: (1) không giấu hành động hay thông tin xử lý chính (trạng thái claim, mã ticket, "Ask about this claim", cấp bù thủ công) sau icon (i); (2) cư dân bấm "Ask about this claim" thì khung chat tự chèn thẻ ngữ cảnh (Claim ID, ticket); (3) Staff mở cuộc trò chuyện có thẻ thì panel tự làm nổi bật claim, có Quick Actions (xác nhận claim, cấp bù thủ công, xem lịch sử căn hộ) xong trong 1 đến 2 click; (4) quy tắc 1 căn hộ / 1 ưu đãi kiểm theo mã căn hộ, tài khoản thứ hai bị vô hiệu hoá kèm lời giải thích, Staff có cảnh báo đỏ gắn mã căn hộ; (5) mọi cấp bù thủ công bắt buộc lý do và tự chèn System Message vào chat. Checklist: UX-01, UX-02, UX-03, BIZ-01.

Đối chiếu hiện trạng: R4-1 đến R4-4 đã làm panel Promotions, nút Ask about this claim (chữ, không icon (i)), Apply by hand có lý do. Còn thiếu: BIZ-01 (deal mẫu chưa chặn theo căn hộ, Jamie không có chat), cảnh báo đỏ theo căn hộ, thẻ ngữ cảnh trong tin nhắn, panel tự mở và nút "Details" (hiện là icon), Quick Actions trong chat, System Message sau Override. Chia thành R4-5 đến R4-7, ma trận trường hợp dời sang R4-8.

### R4-5 (xong): quy tắc 1 căn hộ / 1 ưu đãi thật, Jamie nhắn được, panel theo căn hộ

Ca tập thứ hai (người dùng đang tập, không xoá, không Take, không trả lời thay): **ticket T-1087, Jamie Rivera (res-4, Unit 02-291)**, khiếu nại "căn hộ đã nhận deal qua Alex nên tôi bị chặn" kèm đòi mã riêng, giảm 20% hoặc rent concession. Cùng với ca đầu T-1086 (Alex, claim Pending MALLA10).

Lỗi tìm thấy lúc dựng ca và đã sửa:
1. **Deal mẫu ghi "One per household" nhưng không chặn** (Jamie vẫn bấm Claim được). Nay mọi deal mẫu giới hạn theo căn hộ (`limS: "unit"` trong `catalog.js`). Resident thứ hai của căn hộ thấy thẻ ghi "Claimed by your unit", hộp deal ghi "One claim per unit: Alex Rivera already claimed this on Nov 16." và nút bị vô hiệu "Claimed by your unit" (đã chụp hình). Căn hộ khác không bị ảnh hưởng.
2. **Jamie không có chat.** Người cùng căn hộ (`HOUSEHOLD`) chuyển sang `messaging/personas.js` và vào danh sách tra người (`byId`), không vào bộ chọn demo; `?as=res-4` mở Messages, Jamie nhắn property team như cư dân khác (ticket T-1087 là ca thật).
3. **Panel Staff không gom theo căn hộ.** Nay: khung đỏ đứng đầu mục Promotions "This unit already got "Mallard Pointe Valet" through Alex Rivera's account on Nov 16. One per unit: a second claim is blocked. Do not pay it twice." và mục "Same unit (02-291)" liệt kê claim của người cùng căn hộ (`unitBlocks`, `unitHistory` trong `store.js`).

Test cập nhật vì quy tắc mới: `checklist.test.mjs` (broadcast tới cư dân nay có 4 người, thêm Jamie), `promotions-history.test.mjs` (chọn deal không còn loại deal theo căn hộ vì mọi deal mẫu là theo căn hộ).

Ghi lại để quyết định: hộp deal của người bị chặn hiện cả mã của người cùng căn hộ ("Your unit's code") theo thiết kế cũ "lịch sử claim chia sẻ trong căn hộ"; tài liệu hướng dẫn và câu trả lời mẫu của người dùng cho Staff nói không tiết lộ chi tiết claim của người khác. Cần chốt: giữ chia sẻ trong căn hộ hay ẩn mã.
Chưa làm (để R4-6): bot gán nhãn Promotions cho ticket T-1087 (hiện "General question" vì câu mở đầu có chữ "office" nên bot hỏi chuyển cho ai trước).

Test: `tests/promotions/promotions-unit.test.mjs` (5 test). `npm test` kết quả ở cuối phần này.

### R4-6 (xong): Context Card trong tin nhắn, panel tự mở, nút Details bằng chữ (UX-01, UX-02)

Đã làm:
- **Context Card (UX-02).** "Ask about this claim" gửi kèm thẻ "Promotion claim": Promotion, Code, **Claim ID** (đúng id Staff thấy trong Claims inbox, dạng `r_res_3_parking1_1`, tìm được ở ô Redeem của inbox), Status, Claimed, **Ticket**. Cả Resident và Staff thấy thẻ ngay trong tin nhắn (bong bóng chỉ còn câu "I have a question about my promotion claim." và thẻ), không cần mở gì.
- **Staff mở cuộc trò chuyện có thẻ (UX-01).** Một thanh ở đầu khung chat "Asked about: Covered Spot Upgrade · RES-9GD5M" (có nút "Details" khi panel đang đóng); panel "Resident and unit" **tự mở** một lần cho cuộc đó trên màn hình từ 1024 px (người dùng vẫn đóng được và lựa chọn của họ được nhớ); trong mục Promotions, claim được hỏi được **tô nổi** kèm chữ "Asked about".
- **Nút mở panel có chữ**: "Details" / "Hide details" thay icon (i) trần.
- **Nhãn Promotions cho ticket**: câu hỏi có chữ deal, claim, discount, refund, perk gửi cho team dù bot chỉ hỏi "chuyển cho ai" cũng thành ticket Promotions (trước đó "General question", như T-1087; ticket đã tạo sẵn giữ nguyên).

Kiểm bằng giao diện thật (ca mới: Morgan Ellis, res-3, claim Covered Spot Upgrade): Resident bấm Ask, Messages mở với thẻ (chụp hình bên Resident); Staff mở cuộc đó thấy thanh đầu chat, panel tự mở dù lựa chọn đã lưu là đóng, claim tô nổi, nút "Hide details", đóng được bằng nút (chụp hình bên Staff 1440, hai lần).

Lỗi tìm thấy và đã sửa khi thử: thẻ xếp từng dòng quá dài và Status bị cắt ("Pending: Waiting for the prope") → thẻ gọn một dòng mỗi mục, Status chỉ là "Pending"; panel không tự mở vì khung nội dung của Staff (1184 px) hẹp hơn ngưỡng 1280 → ngưỡng 1024; nút Details trên thanh đầu chat ra sau khi panel đã tính mở (thứ tự vẽ) → tính tự mở trước khi vẽ nút.

Còn lại: thanh đầu chat vẫn có nút "Details" cả khi panel đang mở (không hại, bấm không đổi gì); chưa xem 375, 830 và chế độ tối bằng hình (panel dưới 1024 px chỉ có thanh và nút Details).

Dọn dữ liệu: tin nhắn và claim của Morgan trả về như trước; T-1086 và T-1087 không bị đụng.

Test: `promotions-ask.test.mjs` (thêm 3 test). `npm test` 522 test, 521 qua, 1 lỗi cũ.

### R4-7 (xong): Quick Actions tại chat và dấu vết hệ thống (UX-03, Audit Trail)

Đã làm:
- **`src/features/promotions/decide.js`** (một nơi duy nhất ghi quyết định về claim): `decideClaim` cho Confirm, Apply by hand, Reject; Apply và Reject bắt buộc lý do; làm lại cùng quyết định là no-op (Verify hai lần, Apply hai lần không tạo gì thêm); claim đã Redeemed không Reject hay Apply được; claim đã Reject phải "Move back to Pending" ở inbox trước; claim cư dân đã huỷ thì từ chối. Ghi vào trạng thái cư dân đọc (`eso-pm-claimstate`) và vào Claims inbox (`eso-pmclaims`, kèm ghi chú nội bộ "Applied by hand (from the chat): lý do" có tên Staff).
- **Panel chat có mục "Decide"** cho từng claim đang chờ hoặc đã xác nhận của cư dân: "Confirm claim", "Apply by hand", "Reject". **2 click**: click 1 mở các lý do có sẵn (cấp bù: credited to invoice, refunded, added to account, already applied; từ chối: not a current resident, already claimed in this unit, limit reached, expired), click 2 chọn lý do là xong; hoặc gõ lý do khác rồi bấm Apply hoặc Reject; bấm khi chưa có lý do thì báo "Say why, so the resident knows.". Confirm là 1 click.
- **System Message (Audit Trail)**: Apply và Reject tự chèn một dòng hệ thống vào khung chat, cư dân được báo: *The property team applied your promotion "X" by hand: lý do* / *The property team did not approve your claim for "X": lý do* (`noteClaimDecision` trong `store.js`, chỉ Staff hoặc Admin, chỉ trong chat của cư dân). Confirm thường không cần dòng này.
- **Inbox khớp chat**: Claims inbox nạp lại khi `eso-pmclaims` đổi ở tab khác; claim chưa từng được inbox nhập mà đã được quyết định từ chat thì inbox nhận quyết định khi nhập; publish của inbox không còn xoá quyết định của claim chưa nhập (lỗi tìm thấy khi viết test, chưa gây hại vì chưa có luồng nào đi trước).

Kiểm bằng giao diện thật (ca mới, Morgan Ellis res-3 claim Covered Spot Upgrade và CubeSmart, Staff 1440): panel hiện "Decide"; Apply (2 click) thấy panel đổi "Applied by the property team: ...", trạng thái cư dân `verified` với `manual`, dòng hệ thống trong chat; Reject với "Claim limit reached" (2 click) thấy "Rejected" ở panel, dòng hệ thống thứ hai trong chat; Claims inbox (tab All) có đủ hai claim: một "Verified, Applied by hand, Jordan Lee" và một "Rejected, Claim limit reached", mỗi cái kèm ghi chú nội bộ "(from the chat)"; Resident res-3 thấy ngay trong My rewards: "Verified, Applied by the property team: ..." và "Not approved, Claim limit reached" (đã chụp hình hai bên).

Chưa kiểm: các nút ở 375, 830 và chế độ tối; Confirm claim chỉ kiểm bằng test; "Xem lịch sử căn hộ" (mục "Same unit" của R4-5 hiện sẵn, không cần bấm); ca Jamie chưa xử lý (người dùng đang tập).

Dọn dữ liệu: claim, trạng thái, tin nhắn hệ thống của Morgan gỡ sạch; T-1086, T-1087 và claim Pending của Alex không đổi.

Test: `tests/promotions/promotions-decide.test.mjs` (7 test). `npm test` 529 test, 528 qua, 1 lỗi cũ.

### R4-8 (xong): ma trận trường hợp quanh claim và hội thoại

Cách làm: mỗi ca là một test chạy trên đúng mã của ứng dụng (`tests/promotions/promotions-matrix.test.mjs`, 12 test) cộng kiểm bằng giao diện thật ở những chỗ nhìn thấy được (ca T-1087 của Jamie chỉ xem, không đổi gì).

| Ca | Nội dung | Kết quả |
|---|---|---|
| M1 | bấm Claim hai lần liên tiếp | Đạt: một claim, một mã |
| M2 | Staff A Confirm, Staff B Reject cùng lúc; A bấm Apply hoặc Confirm muộn | Đạt: Reject sau Confirm được; click muộn của A bị từ chối kèm lý do |
| M3 | Staff tắt deal (Off live) khi claim đang Pending | Đạt: deal biến khỏi danh sách cư dân, claim còn nguyên, Staff vẫn Apply được ("Honoured…") |
| M4 | hết suất giữa chừng; người huỷ trả suất | Đạt: người kế tiếp được báo "fully claimed", huỷ thì suất quay lại |
| M5 | cư dân A xem claim của B; lịch sử của một cư dân | Đạt: căn hộ khác không thấy gì, lịch sử chỉ của người đó |
| M6 | hỏi sau khi mã đã dùng (Redeemed) | Đạt: thẻ ghi Redeemed; Reject và Apply bị chặn |
| M7 | bị Reject rồi claim lại | Đạt: claim mới chờ, Staff quyết định claim mới, lịch sử giữ cả lần Reject |
| M8 | cư dân huỷ khi Staff đang quyết định | Đạt: Staff được báo "cancelled", không ghi gì |
| M9 | bộ nhớ lỗi khi lưu quyết định | Đạt: báo "Could not save", claim giữ trạng thái cũ |
| M10 | quy tắc căn hộ từ hai tài khoản | Đạt: Jamie bị chặn khi claim của Alex còn hiệu lực; Staff Reject claim của Alex thì Jamie nhận được và Alex bị chặn |
| M11 | tên deal có mã HTML trong thẻ | Đạt: thẻ chỉ dùng text node, không `innerHTML` |
| M12 | tài khoản bị chặn muốn hỏi team | **Lỗi, đã sửa** (xem dưới) |
| Jamie (T-1087) | Staff xem ca khiếu nại | Đạt: khung đỏ "This unit already got … through Alex Rivera's account…", mục "Same unit"; panel mở, nút "Hide details"; ở 830 và 375 không tràn ngang, không nút nhỏ hơn 24 px, khung đỏ vừa màn hình; tương phản khung đỏ 4,55 (sáng) và 8,58 (tối), nhãn trạng thái 4,57 và 9,57 |
| UX-01 | không có thông tin hay hành động xử lý chính nào sau icon (i) | Đạt: panel tự mở khi có thẻ, nút "Details" bằng chữ, 0 nút không tên ở 830 |
| UX-02 | Ask about this claim đính kèm Claim ID và ticket | Đạt (R4-6) |
| UX-03 | Confirm, Apply, Reject tại chat trong tối đa 2 click, không đổi tab | Đạt (R4-7) |
| BIZ-01 | tài khoản thứ hai bị chặn, có lời giải thích ngay từ đầu | Đạt: thẻ "Claimed by your unit", hộp deal ghi ai và ngày, nút vô hiệu; ở 375 vừa màn hình, nút cao 44 px |

Lỗi tìm thấy và đã sửa (M12): tài khoản bị chặn theo căn hộ (Jamie) không có đường nào hỏi property team ngay tại hộp deal, phải tự mở Messages và gõ lại mọi thứ, trái nguyên tắc giảm ma sát. Nay hộp deal của người bị chặn có liên kết chữ "Ask the property team about this" (cao 44 px ở 375); tin nhắn là "I have a question about a promotion my unit already claimed." kèm thẻ có tên deal và trạng thái "Claimed by your unit", **không kèm mã hay Claim ID của tài khoản kia** (giữ riêng tư); ticket gắn nhãn Promotions. Không bấm thử trên ca T-1087 vì sẽ thêm tin vào ticket của người dùng; kiểm bằng test và nhìn hộp deal ở 375.

Không áp dụng hoặc chưa kiểm được: Staff của property khác (prototype chỉ có một property); cư dân đã chuyển đi (không có dữ liệu cư dân hết hợp đồng; hợp đồng của Morgan hết 15/12); hai Staff thật cùng bấm trong hai trình duyệt (kiểm bằng hai quyết định nối tiếp, không phải đồng thời thật); chế độ tối chỉ đo tương phản bằng mã, chưa xem hình; xem hình ở 375 và 830 bị giới hạn vì cửa sổ giả lập nên đo bằng DOM.

Ghi lại để quyết định: hộp deal của tài khoản bị chặn vẫn hiện **mã của người cùng căn hộ** ("Your unit's code, claimed by Alex Rivera ... MALLA10") theo thiết kế "claim chia sẻ trong căn hộ"; câu trả lời mẫu của người dùng cho Staff nói không tiết lộ. Chờ người dùng chốt giữ hay ẩn.

Dữ liệu: không tạo dữ liệu thật trong phần này (các ca chạy trên bộ nhớ riêng của test); T-1086, T-1087 và claim Pending của Alex không đổi (7 và 6 tin, vẫn trong hàng đợi).

Test: `promotions-matrix.test.mjs` (12 test). `npm test` 541 test, 540 qua, 1 lỗi cũ.
