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
- [ ] **Phần 3: Tạo và sửa deal.** Form New promotion (ảnh bìa, logo đối tác, mã tĩnh/duy nhất/QR/link, giới hạn tổng/mỗi người/mỗi unit, hẹn lịch, nháp); Edit details (đổi tiêu đề, giá, mã, danh mục) hiện đúng ở Resident.
- [ ] **Phần 4: Claim.** Alex và Jamie cùng unit, giới hạn theo unit/theo người, hết suất, đã claim, Cancel, claim lại, History; Staff xác nhận/đổi/từ chối ở Claims và Resident thấy đúng trạng thái và giờ.
- [ ] **Phần 5: Vòng đời.** Đóng, gia hạn, tạm tắt/Off live, hẹn lịch, xoá, xuất CSV; ngày thật 16/11/2026, đồng hồ, "Expired on" đúng; sample deal và deal do Staff tạo.
- [ ] **Phần 6: Truy cập và dọn.** Bàn phím, focus, (i), Redeem; vùng bấm; không có hai điều khiển cho một việc; dọn dữ liệu test; ghi tổng kết, hỏi người dùng về push.

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
