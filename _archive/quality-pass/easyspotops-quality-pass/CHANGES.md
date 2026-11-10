# EasySpotOps account settings: quality pass

Nguồn: `14723420-account-settings-10.html` (prototype 1 file, ~1.3 MB). File gốc không bị sửa.

## Gói này gồm gì

| File | Dùng để |
|---|---|
| `account-settings.html` | Bản đã chỉnh, mở thẳng được. Lớp chỉnh sửa nằm trong `<head>`: khối `<style id="qa-quality">` và `<script id="qa-quality-js">`. |
| `qa-quality.css` | Cùng phần CSS, tách riêng để đưa vào bản UI demo mới. |
| `qa-quality.js` | Cùng phần JS, tách riêng. |
| `CHANGES.md` | File này. |

Không có phần nào của mã dựng giao diện gốc bị xóa hay viết lại. Mọi thứ là lớp phủ (override) chèn thêm, xóa lớp phủ là về nguyên trạng.

## Cách đưa vào UI demo nâng cấp

1. Chèn nội dung `qa-quality.css` vào `<style>` (hoặc `<link>`) **sau** CSS của app. Các rule cần thắng đều có `!important`.
2. Chèn `qa-quality.js` vào `<script>` ở `<head>` hoặc sau script app. Chạy được bất kể thứ tự tải (tự chờ `DOMContentLoaded`).
3. Chép thêm 3 dòng `<head>`: `meta description`, `meta theme-color`, `link rel="icon"` (xem `account-settings.html`, dòng 13-15).
4. Selector gắn với prototype này: `#content`, `#toast`, `.dd h6`, `nav.crumb`, `.pzst`, `.psum`, `.psel`, `.pgrid`, `.srow/.row/.prow/.pzrow`. Nếu UI demo mới đổi tên class thì sửa các selector tương ứng.

## Đã sửa

### Truy cập (accessibility)
- Thêm skip link "Skip to main content" và vùng `<main>` (`#content` có `role="main"`).
- Toast có `role="status"` + `aria-live="polite"`.
- Breadcrumb có `aria-label="Breadcrumb"` và `aria-current="page"`.
- 3 ô chọn ở Availability (Reset status after / Set Away when inactive / Who can message me) và ô lọc ở Personalize > Icons trước đây không có nhãn. Giờ lấy nhãn từ tiêu đề dòng, hoặc placeholder.
- Viền focus rõ trên mọi điều khiển (trắng trên sidebar tối). Nút Pin giờ hiện khi focus bàn phím, trước đây chỉ hiện khi rê chuột.
- Thứ tự heading: nhãn H6 của menu avatar bị loại khỏi dàn ý trang; script không cho heading nhảy cấp trong `#content`.
- Tôn trọng `prefers-reduced-motion`.

### Vùng chạm
- Nút Pin 24px -> 32px; tiêu đề nhóm sidebar tối thiểu 32px; nút Hide, breadcrumb và link/nút dưới 24px được nới lên ~28px.
- Công tắc (cao 18-22px) giữ nguyên kiểu dáng vì cách xa nhau, đạt WCAG 2.2 AA theo ngoại lệ khoảng cách.

### Giao diện
- Chữ 11px nâng lên 12px (nhãn, badge, chip, `small`).
- Giá trị dài (vd "Mallard Pointe Management") xuống dòng thay vì bị cắt.
- Nội dung có thêm khoảng đệm dưới (96px) để nút AI không che dòng cuối.
- 1024-1279px: menu con của Settings thu còn 208px để nội dung không chật.
- Bỏ nhãn "Selected section" (lặp tên mục).
- **Bỏ thẻ tóm tắt hồ sơ (`.psum`)**: bốn thẻ Staff name / Availability / Notifications / Theme ở đầu Profile settings (và bản Workspace: Current property, Role...). Theo yêu cầu: trùng với nội dung bên dưới và chiếm ~190px đầu trang. Chỉ ẩn bằng CSS; muốn bỏ hẳn thì xóa khối `<div class="psum">` trong hàm dựng trang.
- Thêm meta description, theme-color, favicon.

### Mục Social trong sidebar không theo cài đặt
- Triệu chứng: với "Show Social in sidebar" tắt, mục Social bị ẩn ở Dashboard nhưng **hiện lại sau khi bấm Community & Announcements** (hoặc mục khác).
- Nguyên nhân (có sẵn trong file gốc, đã kiểm tra trên bản chưa chỉnh): `apply()` của app ghi đè `document.body.className`, xóa class `soc-nosb` / `soc-off`; hàm `applySocial()` (nằm trong closure riêng) chỉ chạy lại ở vài sự kiện. Nên mục Social hiện hay ẩn tùy lần dựng giao diện gần nhất.
- Sửa: `qa-quality.js` đọc cài đặt đã lưu (`localStorage["eso-social"]`) và áp lại đúng hai class đó sau mỗi lần class bị ghi đè (hàm `soc()`, cùng quy tắc `applySocial`: `soc-off = !on`, `soc-nosb = !sidebar || !on`). Giờ mục Social **chỉ** theo Settings > Social, không phụ thuộc bấm Community & Announcements.
- Giao diện Social vẽ vào `#feedroot` (còn `#content` bị ẩn), nên skip link và `role="main"` giờ trỏ tới `#feedroot` khi đang ở Social.

### Lỗi giật khi cuộn (Personalize)
- Nguyên nhân: thẻ "Your design" là `position:sticky`; khi dính, script gốc gắn `.stuck` và thẻ co từ 277px xuống 101px. Chiều cao trang giảm ~176px, trình duyệt kéo lại vị trí cuộn, thẻ bung ra, lặp vòng.
- Sửa: khi thẻ co, bù `margin-bottom` bằng đúng phần chiều cao mất đi, tổng chiều cao trang giữ nguyên. (Hàm `pz()` trong `qa-quality.js`.)

## Đã kiểm tra

- Desktop 1440px, tablet 768px, mobile 390px (layout mobile chọn theo thiết bị lúc tải trang, cần tải lại khi đổi cỡ).
- 8 trang con Settings (Profile, Availability, Notifications, Security, Personalize, Language, Date and time, Social) và 15 route Social/Workspace/Personalize con: không lỗi console, không cuộn ngang, không thiếu tên nút hay `alt`.
- Chế độ tối: không có lỗi tương phản thật.

## Chưa kiểm tra / còn lại

- **Lỗi giật chưa thử bằng cuộn thật** (môi trường kiểm tra không phát sự kiện cuộn). Đã xác nhận bằng cách gắn class `stuck` thủ công: tổng chiều cao trang chênh dưới 1px (trước đó 176px). Cần cuộn thử trên trình duyệt thật.
- Sau đợt sửa cuối chỉ đo lại ở 1440px; 390px và 768px đạt ở các lượt trước.
- Chưa thử bằng bàn phím thủ công (mới kiểm tra bằng script).
- `web-design-guidelines` (Vercel) chưa chạy vì cần tải bộ quy tắc từ GitHub.

## Settings > Social: đã kiểm tra theo thiết kế

- "Show Social in sidebar" tắt: Social biến khỏi sidebar, Community & Announcements vẫn còn, `#/social` vẫn vào được bằng URL. Đúng mô tả.
- "Use Social" tắt (có hộp xác nhận "Turn off Social?"): Social biến khỏi sidebar, `#/social` hiện "Social is turned off" kèm nút "Turn on Social", toast "Social turned off"; Community & Announcements và Promotions vẫn chạy. Đúng mô tả.
- **Lệch với mô tả:** dòng "When hidden, Social is still reachable from search or its URL" chưa đúng ở phần "search". Khi Social bị ẩn, ô tìm kiếm đầu trang trả "No results for "social"" và "Search menu" của sidebar cũng không hiện Social (CSS `body.soc-nosb #sb a[data-p="Social"]{display:none!important}`). Chỉ vào được bằng URL. Cần chọn: sửa dòng mô tả, hoặc cho tìm kiếm tìm ra Social.

## Là khoảng trống của prototype, không phải lỗi mã

- (Đã đính chính) Module Social **có** trong bản này: giao diện vẽ vào `#feedroot`, không phải `#content`. Nhận định trước đó "Social chưa có" là sai vì chỉ đọc `#content`; các route `#/social/*` chưa được kiểm tra lại bằng `#feedroot`.
- Các link sidebar (Dashboard, Messages, Social...) là `href="#"`, chưa dẫn đi đâu. Dashboard chỉ là "Placeholder".
- Một số chữ 11px còn lại nằm trong khung xem trước (mini mockup ở Personalize), giữ nguyên vì là hình minh họa.
