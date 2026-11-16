# Kết quả kiểm lại A5 lần 3 (Điều hướng và khung 4 cổng)

Ngày 2026-11-15. Tester độc lập, chạy thật trên `http://a5.localhost:3590` (dev server, dữ liệu ở localStorage), tab riêng, viewport 1440x900 (mô phỏng; 375x812 cho phần ngăn kéo). Nguồn: `03-tieu-chi-A5-navigation-frame.md`, `07-ket-qua-lai-A5.md` (và `04-ket-qua-A5.md` cho dòng 07 không nhắc), `01-quyet-dinh-chu-du-an.md`. Không sửa mã, không commit.

## Tổng hợp

Toàn bộ 199 tiêu chí (dòng không kiểm lại giữ kết quả lượt 2; dòng 07 và 04 gộp theo lượt mới nhất).

| Kết quả | Lượt 2 (sau 07) | Lượt 3 (tệp này) |
|---|---|---|
| Đạt | 135 | 145 |
| Không đạt | 42 | 36 |
| Chưa kiểm được | 22 | 18 |
| Tổng | 199 | 199 |

% Đạt = Đạt ÷ (Tổng − Chưa kiểm được) = 145 ÷ 181 = **80,1%** (lượt 2: 135 ÷ 177 = 76,3%).

Không đạt còn lại theo mức độ: Nghiêm trọng 0, Cao 11, Trung bình 18, Thấp 7.

### Phần A: 64 dòng (42 Không đạt gồm 6 hồi quy lượt 2, và 22 Chưa kiểm được)

| Kết quả sau khi kiểm lại | Số dòng |
|---|---|
| Chuyển sang Đạt | 10 (8 từ Không đạt: F502, F528, F530, F533, F558, F559, S524, X510; 2 từ Chưa kiểm được: X505 mô phỏng, S512 gần đúng) |
| Còn Không đạt | 34 (+2 chuyển từ Chưa kiểm được: F573, S525) = 36 |
| Còn Chưa kiểm được | 18 |
| Tổng | 64 |

**6 hồi quy lượt 2:** F530, F533, F558, F559, X510 đã **sửa xong (Đạt)**; F525 **vẫn Không đạt** (nguyên nhân khác: hai nút Pin trùng nhau, xem dòng F525).

### Phần C: 45 dòng đang Đạt được kiểm lại, cả 45 vẫn Đạt

### Hồi quy mới và phát hiện mới (đọc trước)

1. **"Larger tap targets" làm vỡ thẻ KPI Staff dashboard (Cao).** Bật `ui-prefs:staff` = `{"a11y":{"target":true}}` rồi mở `/staff/dashboard.html`: 4 trong 6 thẻ KPI (Parking Utilization, Available Spaces, Requests, Violations) còn rộng 36 px ở 1440 và 375 px (thẻ khác 163 px hoặc 373 px). Client và Resident không bị. Cũng với tuỳ chọn này, 23 mục menu sidebar vẫn cao 36 px (chỉ nút header lên 44 x 44).
2. **Sửa Help có aria-current làm F510 vẫn hỏng (Cao).** `/client/support.html` và `/resident/tickets.html` giờ có 2 phần tử `aria-current="page"` (mục sidebar và nút Help); tiêu chí đòi đúng 1.
3. **F525: mỗi mục sidebar Staff có 2 nút "Pin <tên> to favorites" chồng nhau.** Nút gốc `sidebar-menu-action` (Tab dừng trước, Enter và Space không làm gì) và nút `.eso-pin` (Tab dừng sau, ghim được). Staff có 45 nút Pin cho 23 mục.
4. **Admin: huy hiệu Messages (4) khớp tiêu đề và dashboard nhưng trang Messages chỉ cho thấy 2 tin chưa đọc (1 hội thoại)**; hội thoại thứ hai (c37, Pending, owner Casey Ng) không nằm ở tab nào.
5. Thẻ tài khoản trong sidebar giữ tên cũ "Mallard Pointe at Riverbend" sau khi đổi Display name property (phần chính của dashboard Staff/Resident đã đổi). Thấp.
6. `/client/support.html` hiện dòng "Staff portal · Operational" trong bảng trạng thái hệ thống (chữ thừa từ Staff, có thể là mục trạng thái). Thấp.
7. Back của trình duyệt không khôi phục cuộn ở Resident (vùng cuộn là DIV, khóa `eso-scroll` = 0) và Admin (cuộn 243 px, về 91 px): xem F573.
8. Nút Theme: `aria-label` vẫn "Theme: light" sau khi chuyển sang tối (như lượt 2). Thấp.

## Cách đo và giới hạn

- Bấm chuột: `left_click` theo `ref` hoặc toạ độ; mỗi lần bấm đo bằng listener ở pha capture: `isTrusted = true`, đích đúng mục. Bấm theo toạ độ cũng đã thử ở Staff ("Daily Audit") và Admin ("Content").
- Công cụ gõ ký tự (`type`, phím chữ) KHÔNG chèn chữ vào ô nhập (như lượt 2). Chữ tìm kiếm và lọc được đặt bằng `value` + sự kiện `input`; Ctrl+K, Enter, Tab, Esc, mũi tên, "/" là phím thật.
- Không có Lighthouse, axe, chặn request, giả lập mạng, `prefers-reduced-motion`, origin `127.0.0.1`: các dòng cần những thứ đó giữ "Chưa kiểm được".
- Phép đo nhiều trang (cuộn ngang, tiêu đề, h1, tên truy cập, từ giữ chỗ) dùng iframe cùng origin; bấm trong iframe bị tránh vì `preview.js` điều hướng cả trang cha.
- Dev server thỉnh thoảng tải lại trang giữa các lệnh (HMR); phép đo bị cắt đã lặp lại.

## Phần A: 6 HỒI QUY lượt 2 (kiểm lại trước tiên)

| ID | Kết quả mới | Kết quả cũ (lượt 2) | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| F530 | Đạt | Không đạt | 4 cổng: "mes" và "MES" → đúng 1 dòng ("Messages" ở Staff/Client/Resident; "Messaging & Support" ở Admin); Client "Operations" → 5 dòng nhóm (People & Access, Vehicles, Parking, Requests, Violations); Staff "Operations" → 8 dòng nhóm (giới hạn 8) | | Trung bình |
| F533 | Đạt | Không đạt | 4 cổng: "zzzz" → bảng chỉ có chữ "No pages match.", 0 dòng; Enter thật: URL giữ nguyên, 0 toast | | Trung bình |
| F558 | Đạt | Không đạt (chuột thật) | Bấm thật (isTrusted) Staff 17/17 (16 theo `ref`, "Daily Audit" theo toạ độ) và Client 12/12: toast "Coming soon: this feature is in development and is not available in the preview yet." trong ≤ 60 ms, `role="status"`, URL giữ, history +0; `pointer-events: auto` ở mọi mục | | Cao |
| F559 | Đạt | Không đạt (chuột thật) | Resident 12/12 và Admin 23/23 như F558 (+ logo Admin). Toạ độ chuột Admin "Content": toast, focus giữ ở mục | | Cao |
| X510 | Đạt | Không đạt (chuột thật) | 4 cổng: chuột thật bấm mục Coming soon: focus ở mục vừa bấm, toast `role="status"`; Admin: bấm mục trong sidebar đã cuộn, `scrollTop` 852,67 trước và sau | | Trung bình |
| F525 | Không đạt | Không đạt (hồi quy lượt 2) | Chuột thật ghim đúng (F524 vẫn Đạt). Tab thật từ mục "Violations": dừng 1 = nút gốc `data-slot="sidebar-menu-action"` (opacity 1), Enter và Space không ghim (`staff:sb-pins` = null, không toast); dừng 2 = `.eso-pin` (opacity 0 đến khi focus), Enter ghim đúng (`["Violations"]`, toast "Violations added to favorites."). Hai nút cùng tên, cùng toạ độ (192,630,28x28) | Staff dashboard, Tab tới "Pin Violations…" (dừng 1), Enter: không ghim; Tab thêm 1 lần mới ghim được | Trung bình |

## Phần A: 58 dòng còn lại

| ID | Kết quả mới | Kết quả cũ | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| D513 | Không đạt | Không đạt | Sau khi mở 31 trang: có khóa `eso-scroll:/staff/social.html` = 0 và `/resident/social.html` = 0; `/admin/messages.html`, `/admin/tickets.html` không có khóa | Mở `/staff/social.html`, `Object.keys(sessionStorage)` | Thấp |
| F501 | Không đạt | Không đạt | [Chờ quyết] Staff, Client, Resident: logo svg không là link. Admin: `<a href="#">`, bấm thật ra toast Coming soon, URL giữ, không mở dashboard | Admin dashboard, bấm logo | Trung bình |
| F502 | Đạt | Không đạt | 18 trang Client, Resident, Admin (gồm iframe nhúng): chữ nhìn thấy không có "EasySpotOps Staff", "User 1", `\bQS\b`, "staff portal" viết thường; placeholder ô tìm có tên cổng ("Search Client pages…", "Search Resident pages…", "Search Admin pages…", Staff "Search Staff pages…"). Ghi chú: `/client/support.html` có dòng trạng thái "Staff portal · Operational" (chữ hoa, không khớp phép đo đúng nguyên văn) | | Trung bình |
| F504 | Không đạt | Không đạt | Số mục sidebar đếm được: Staff 24 (23 nhãn hiển thị), Client 19, Resident 18, Admin 29 (bản chụp 40/25/38/43) | LABELS.length | Trung bình |
| F510 | Không đạt | Không đạt | Help: Staff support có 1 aria-current (nút Help) nên hết 0; chuông có aria-current ở 4 trang Notifications (1 phần tử). Nhưng nút Help mới thêm aria-current làm `/client/support.html` = 2 ("Support" và "Open EasySpotOps Help Center") và `/resident/tickets.html` = 2 ("Ticket box" và Help); tiêu chí đòi đúng 1, "0 trang có 0 hoặc 2" | Mở `/client/support.html?as=cli-1`, `document.querySelectorAll('[aria-current="page"]').length` = 2 | Cao |
| F514 | Không đạt | Không đạt | Staff 4, Client 2, Resident 1: huy hiệu = số chưa đọc trong trang Messages (đạt). Admin: huy hiệu "Messaging & Support, 4 unread" = tiêu đề "(4)" = dashboard "4 in 2 conversations", nhưng trang `/admin/messages.html` chỉ hiện 1 hội thoại chưa đọc (Marcus Cole, 2 tin) ở Queue; tab Mine, Direct, Resolved, Sent không có hội thoại c37 (ticket "Bulk-approve guest passes", Pending) nên 2 tin chưa đọc còn lại không tìm thấy | Admin: so huy hiệu với trang Messages mọi tab | Cao |
| F528 | Đạt | Không đạt | Ctrl+K thật ở 4 cổng: ô có focus, chữ cũ được chọn (selection 0–3 ở Staff), bảng mở ngay khi ô rỗng với đúng 8 dòng (≤ 8) | | Cao |
| F544 | Không đạt | Không đạt | Chọn Busy: `eso-status` = `{"s":"busy","until":0}`, `staff:status` = null; avatar `aria-label` "…, Busy" | Chọn Busy, `localStorage.getItem('staff:status')` | Trung bình |
| F545 | Không đạt | Không đạt | [Chờ quyết] ô status message `maxLength` = 100 (tiêu chí nói 80) | | Trung bình |
| F553 | Không đạt | Không đạt | [Chờ quyết] Admin: 0 nút Help (header có Theme, chuông, avatar; không có Help); Staff có nút Help ở header | Admin dashboard, tìm `[aria-label*="Help"]` = 0 | Cao |
| F556 | Không đạt | Không đạt | [Chờ quyết] `/admin/messages.html`, `/admin/tickets.html`: 0 `nav`, 0 sidebar, 0 chuông, 0 avatar; header 61 px chỉ có Exit, Preview tools, Theme | | Cao |
| F557 | Không đạt | Không đạt | [Chờ quyết] `/staff/social.html`, `/resident/social.html`: 0 sidebar cổng, 0 chuông, 0 avatar; header 57 px riêng (Exit Social, Search posts, Social pulse, Theme) | | Cao |
| F564 | Không đạt | Không đạt | Admin 2/2 đạt bằng chuột thật: Messages → Exit về `/admin/dashboard.html?as=adm-1`; Messages → bấm "Ticket box" (`/admin/tickets.html#/t/c29`) → Exit về dashboard (không kẹt). Staff, Client, Resident: nút "Exit Messages" trong iframe nhúng bị ẩn (`offsetParent` null), nên 6 trong 8 ca không có điều khiển Exit để thử | Staff `/staff/messages.html`: Exit ẩn | Trung bình |
| F565 | Không đạt | Không đạt | Exit từ Social về dashboard đúng (Staff, Resident, chuột thật; Resident phải qua hộp thoại hướng dẫn "Exit Social"). Resident Promotions, Settings và Staff Promotions, Workspace: 0 nút Back hoặc Exit | Resident home → Promotions: không có Exit | Trung bình |
| F573 | Không đạt | Chưa kiểm được | Cuộn bánh xe thật, bấm Messages ở sidebar, Back: Staff `back_forward`, `scrollTop` 294,67 → 294,67 (đạt); Client 366 → 366 (đạt, cuộn ở `<html>`); Resident: cuộn DIV 464 px → về 0 sau Back, khóa `eso-scroll:/resident/home.html` = 0 (không đạt); Admin: cuộn 243 px → 91 px (lệch 152 px, không đạt) | Resident home, cuộn 5 nấc, bấm Messages, Back, đọc cuộn | Trung bình |
| F583 | Không đạt | Không đạt | `/staff/account-settings.html?as=stf-1#/notifications` → `/staff/workspace.html?as=stf-1#/notifications` (tiêu chí: `/staff/settings/notifications.html`) | | Trung bình |
| F585 | Không đạt | Không đạt | `curl`: `/messages` và `/messages.html` trả mục lục (5.772 byte, "EasySpotOps · UI preview") thay vì hub; `/messages/` mở hub nhưng đổi URL thành `/messages.html` | `curl http://a5.localhost:3590/messages.html` | Trung bình |
| F587 | Không đạt | Không đạt | Staff dashboard: 6 thẻ KPI có số, 0 NaN; chỉ 1 biểu đồ SVG 160x160 (< 200x100) | `#main-content svg` rộng ≥ 200: 0 | Cao |
| S502 | Không đạt | Không đạt | `curl`: `/easyspotops-2026-11-13.zip`, `/.claude/settings.local.json.bak`, `/_archive/`, `/.env`, `/src/shared/js/preview.js.map` đều trả 200 (mục lục `index`, không lộ nội dung tệp thật); `/favicon.ico` 404. `dist/` không có `.map`, `.zip`, `.bak`, `.env` | `curl -I` 5 địa chỉ | Thấp |
| S508 | Không đạt | Không đạt | grep không phân biệt hoa thường "hsts", "unauthenticated", "no authentication", "xác thực" trong `BRIEF.md`, `README.md`, `DESIGN.md`, `docs/*.md` (trừ `docs/qa`): 0 kết quả liên quan | `grep -rniE "hsts\|unauthenticated" BRIEF.md README.md DESIGN.md docs/*.md` | Cao |
| S518 | Không đạt | Không đạt | 4 dashboard (iframe, tải mới, chống cache): 35 đến 38 request (≤ 40) nhưng dung lượng giải nén Staff 2.690 KB, Client 2.138, Resident 2.096, Admin 1.570 (> 1,5 MB); truyền 138 đến 206 KB; DOMContentLoaded 45 đến 112 ms. Máy chủ dev không nén, không gộp | `performance.getEntriesByType('resource')` | Trung bình |
| S524 | Đạt | Không đạt | Mở menu hồ sơ rồi Ctrl+K thật: menu đóng (`aria-expanded=false`), chỉ còn bảng tìm; mở chuông rồi Ctrl+K: chuông đóng, tìm mở; Esc đóng bảng tìm. Luôn tối đa 1 bảng nổi | | Trung bình |
| S525 | Không đạt | Chưa kiểm được | Tab thật + đo `:focus-visible` ở Staff và Client, giao diện sáng và tối (4 lượt): mục sidebar (kể cả mục Coming soon) viền 2 px, 3,45:1 (sáng), 5,84:1 (tối); Theme, chuông, avatar, Help: vòng 2 đến 3 px, 4,77:1 (sáng), 6,48:1 (tối). Nhưng ô lọc menu ("Filter menu") ở cả 2 giao diện và ô tìm đầu trang ở giao diện tối: vòng 3 px là màu primary 50% trong suốt (đo 1,0 đến 1,1:1 so nền; tính tay khoảng 1,7:1) cộng viền đặc 0,67 px: dưới 3:1 và dưới 2 px. Resident, Admin chưa đo | Staff `?dark`, Tab tới ô tìm, đo `box-shadow` của khung bọc | Cao |
| S526 | Không đạt | Không đạt | `header` = 2 ở 4 dashboard và `/admin/notifications.html`, `/admin/settings.html`; `main` = 2 ở Messages, Tickets, Notifications, Documents, Capacity (khung ngoài và iframe); Admin Messages, Tickets: `nav` = 0. Skip link "Skip to main content" có | `document.querySelectorAll('header').length` ở `/staff/dashboard.html` | Trung bình |
| S527 | Không đạt | Không đạt | 31 trang (gồm iframe): `h1` ≠ 1 ở `/staff/promotions.html` (2), `/admin/notifications.html` (2: "Admin Command Center", "Notifications"), `/admin/settings.html` (2); nhảy cấp heading ở `/staff/promotions.html`, `/staff/support.html`, `/client/support.html`. `h1` của 2 trang Support là "Dashboard" | Đếm `h1` ở 3 trang đầu | Trung bình |
| S531 | Không đạt | Không đạt | 320 px: Staff, Client, Resident đạt (0 điều khiển bị cắt, 0 cuộn ngang); Admin: nút "Open profile menu for Taylor Brooks" right = 333 > 320 (cắt 13 px). 640 px: 4 dashboard đạt | `/admin/dashboard.html` ở 320 px | Cao |
| U503 | Không đạt | Không đạt | 1440 px: Resident `home.html` avatar x = 1212, ô tìm rộng 740; `messages`, `tickets`, `settings`, `promotions`, `notifications` avatar x = 1218, ô tìm 746. Staff 1218, Client 1377, Admin 1242 không đổi giữa các trang | Đo avatar ở 2 trang Resident | Cao |
| U505 | Không đạt | Không đạt | `/admin/messages.html`, `/admin/tickets.html`: không sidebar, header 57 đến 61 px; dashboard Admin có sidebar 244 px | | Cao |
| U507 | Không đạt | Không đạt | Nền mục chọn pha trên nền sidebar `oklch(0.2077 …)` = (19,32,71) so (15,23,42): 1,12:1; thanh chỉ báo (38,78,235): 2,87:1 (< 3:1); đếm thanh = 1 | Đo nền mục `aria-current` ở Staff | Trung bình |
| U509 | Không đạt | Không đạt | Thu gọn 80 px: mọi mục có tên truy cập (0 thiếu). Icon lệch tâm so với trục sidebar: Staff −10…+6 px (24/24 > 2 px), Client −10…+6 (19/19), Resident −18…+6 (18/18), Admin −12…+4 (29/29) | Bật `ui-prefs:<cổng>={"collapse":true}`, `ui-sidebar-collapsed:<cổng>=1` | Trung bình |
| U520 | Không đạt | Không đạt | 375 px, phần tử `main p, main li, main td, input` cỡ chữ < 16 px: Staff 25/32, Client 37/50, Resident 41/43, Admin 12/21, Staff Messages 1/12 (12 px, 14 px) | | Trung bình |
| U526 | Không đạt | Không đạt | `/staff/workspace.html` và `/staff/settings/profile.html` cùng "Settings"; `/client/workspace.html` và `/client/settings/profile.html` cùng "Workspace settings"; `/admin/settings.html` và `/admin/settings/profile.html` cùng "Settings"; Admin Messages "(4) Messaging & Support" | `document.title` | Thấp |
| X502 | Không đạt | Không đạt | [Chờ quyết] 375 px, Staff: focus điều khiển cuối của ngăn kéo ("EasySpotOps Help Center", 81 điều khiển), Tab thật ×3 → "Open navigation", "Search staff pages", "Theme" (đều NGOÀI sidebar), ngăn kéo vẫn mở | Mở ngăn kéo, Tab từ điều khiển cuối | Trung bình |
| X504 | Không đạt | Không đạt | [Chờ quyết; Property switcher chủ dự án dặn không đụng: chỉ ghi hành vi, không tính lỗi] Chuột thật bấm "Open Property Hub" và "Show Switch Property": 0 toast, 0 hộp thoại, 0 `aria-disabled`, URL giữ | | Trung bình |
| X511 | Không đạt | Không đạt | [Chờ quyết] Staff dashboard, chuột thật: "Refresh" và "AI Work Assistant": 0 toast, 0 hộp thoại, URL giữ | | Thấp |
| X512 | Không đạt | Không đạt | Client dashboard: "Manage Capacity" mở `/client/usage/capacity.html` (đạt); "AI Operations Assistant": 0 toast, 0 hộp thoại, URL giữ | | Thấp |
| X514 | Không đạt | Không đạt | [Chờ quyết] `/index.html` 32 link; 4 cặp lệch chữ so với tiêu đề trang đích: Staff "Workspace" ("Settings"), Client "Dashboard" ("Portfolio Performance"), Client "Settings" ("Workspace settings"), Admin "Profile" ("Settings"): 28/32 = 87,5% (< 95%) | | Thấp |
| X515 | Không đạt | Không đạt | [Chờ quyết] Help 1 bấm (3 cổng). `h1` của `/staff/support.html` và `/client/support.html` (trong iframe) vẫn là "Dashboard"; Resident "Ticket box· Resident" đạt | | Thấp |
| X505 | Đạt (mô phỏng) | Chưa kiểm được | [Chờ quyết] Không đi qua giao diện Settings: ghi `ui-prefs:staff` = `{"time":{"h24":true}}` đúng như Settings ghi (`account-settings.staff.js:436`) và `staff:sb-clock` = 1: đồng hồ hiện "15:56" (không AM/PM); `h24:false` hiện "3:56 PM" | Ghi khóa, mở `/staff/dashboard.html`, đọc `section[aria-label="Local time"]` | Thấp |
| S512 | Đạt (gần đúng) | Chưa kiểm được | Không dùng được `127.0.0.1`. Thay bằng iframe `sandbox="allow-scripts"` (origin "null", khác origin trang) gửi `postMessage({type:"eso-ui-prefs"},"*")` khi `ui-prefs:staff` đã đổi (`layout:"B"`, `theme:"dark"`): trang không đổi (sidebar 244 px, không dark); cùng origin thì đổi (dark). 4 trình nghe `message` đều kiểm `e.origin === location.origin` | | Trung bình |
| D516 | Chưa kiểm được | Chưa kiểm được | Thử `sandbox` không `allow-same-origin` để chặn storage: trang trắng vì script module không tải được ở origin "null", không phải do storage; không dùng làm bằng chứng | | Trung bình |
| F555 | Chưa kiểm được | Chưa kiểm được | Cần chặn request `/staff/dashboard.html` | | Cao |
| F567 | Chưa kiểm được | Chưa kiểm được | Cần origin `127.0.0.1:3590`, ngoài phạm vi origin a5 | | Trung bình |
| F570 | Chưa kiểm được | Chưa kiểm được | `/staff/workspace.html`, `/client/workspace.html`, `/resident/settings.html`, `/admin/settings.html`, `/staff/promotions.html` (gồm iframe): 0 nút Back hoặc Exit để thử | | Trung bình |
| S513 | Chưa kiểm được | Chưa kiểm được | [Chờ quyết] Không có địa chỉ production | | Trung bình |
| S514, S515, S516, S517, S520 | Chưa kiểm được | Chưa kiểm được | Không có Lighthouse | | Cao/Trung bình |
| S519 | Chưa kiểm được | Chưa kiểm được | Cần Fast 3G và dung lượng nén | | Trung bình |
| S521 | Chưa kiểm được | Chưa kiểm được | Cần giả lập mạng và chặn request | | Cao |
| S530 | Chưa kiểm được | Chưa kiểm được | Không có axe | | Cao |
| S532 | Chưa kiểm được | Chưa kiểm được | Không bật được giả lập `prefers-reduced-motion` | | Trung bình |
| U506 | Chưa kiểm được | Chưa kiểm được | Cần giả lập Slow 4G và quay khung hình | | Trung bình |
| U521 | Chưa kiểm được | Chưa kiểm được | Không có Lighthouse hoặc axe | | Cao |
| U530 | Chưa kiểm được | Chưa kiểm được | Cần chặn `/staff/messages-content.html` | | Trung bình |
| X508 | Chưa kiểm được | Chưa kiểm được | Khung trình duyệt không mở tab mới khi Ctrl+click (giới hạn 1 tab) | | Thấp |

## Phần C: 45 dòng đang Đạt, kiểm lại

| ID | Kết quả mới | Kết quả cũ | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| F505 | Đạt | Đạt | Staff 6/6 trang (Dashboard, Messages, Ticket box, Promotions, Social, Settings → `/staff/workspace.html`) tải đúng tiêu đề, có nội dung, mục đúng có `aria-current` | | Nghiêm trọng |
| F506 | Đạt | Đạt | Client 7/7 (Dashboard, Messages, Ticket box, Documents, Capacity, Workspace Settings, Support) như trên | | Nghiêm trọng |
| F507 | Đạt | Đạt | Resident 6/6 (Dashboard, Messages, Ticket box, Promotions, Social, Settings) như trên | | Nghiêm trọng |
| F508 | Đạt | Đạt | Admin 6 mục / 5 đích (Support và Ticket box cùng `/admin/tickets.html`; Profile `/admin/settings/profile.html`) như trên | | Nghiêm trọng |
| F509 | Đạt | Đạt | Staff, chuột thật bấm "Dashboard" 3 lần ở dashboard: cờ `window.__mark` còn, 0 toast, URL giữ (không tải lại) | | Cao |
| F518 | Đạt | Đạt | 375 px Staff (UA cảm ứng): bấm "Open navigation": `aria-expanded=true`, `<html data-nav-open>`, sidebar 320x812 | | Nghiêm trọng |
| X501 | Đạt | Đạt | Esc thật: `data-nav-open` mất, focus về "Open navigation" | | Trung bình |
| U510 | Đạt | Đạt | Mở ngăn kéo: 1 lớp nền mờ `position:fixed`, z ≥ 50, phủ toàn viewport; sidebar nằm trên | | Trung bình |
| F521 | Đạt | Đạt | Staff "Filter menu": "mes" và "MES" → chỉ "Messages"; "Ticket" → "Ticket box"; xoá → 23 mục | | Trung bình |
| F522 | Đạt | Đạt | "zzzz" → 0 mục, dòng "No menu items match."; xoá → 23 mục | | Trung bình |
| F523 | Đạt | Đạt | `<img src=x onerror=alert(1)>`, `.*(`, `\`, 500 ký tự: 0 alert, 0 `img` trong nav, xử lý 1 đến 12 ms | | Cao |
| F531 | Đạt | Đạt | Ctrl+K rồi ArrowDown thật ×9 ở Staff: `aria-activedescendant` 1…7, 0, 1 (vòng đúng); Enter thật trên dòng đầu mở đúng trang ở 4 cổng, giữ `?as=` và `dark` (Client `…messages.html?as=cli-1&dark`) | | Cao |
| F535 | Đạt | Đạt | Admin: Ctrl+K thật: focus ở ô, 8 dòng; "mes" → "Messaging & Support" `href="/admin/messages.html?as=adm-1"`; Enter mở đúng trang | | Cao |
| F536 | Đạt | Đạt | 4 cổng: nhãn chuông, huy hiệu và tóm tắt ở Notifications bằng nhau (Staff 15, Client 95, Resident 33, Admin 4) | | Cao |
| F537 | Đạt | Đạt | Staff: bấm thật dòng đầu trong bảng chuông (15 chưa đọc) → mở `/staff/notifications.html`, nhãn chuông 14 (giảm đúng 1). Không đo được thời gian vì trang chuyển | | Cao |
| F541 | Đạt | Đạt | `/staff/messages.html`: bấm thật Theme: `<html>` và iframe nhúng cùng thành dark, `ui-prefs:staff` = `{"theme":"dark"}`. `aria-label` vẫn "Theme: light" (nhãn không cập nhật) | | Trung bình |
| F543 | Đạt | Đạt | Menu hồ sơ: Staff "Jordan Lee / Property Manager / Mallard Pointe at Riverbend" + Status; Client "Dana Whitfield / Client / AMC LLC" + Status; Resident "Alex Rivera / Unit 02-291"; Admin "Taylor Brooks / Support Lead / EasySpotOps Support" | | Cao |
| F547 | Đạt | Đạt | Staff, Client có "Status"; Resident, Admin không | | Thấp |
| F548 | Đạt | Đạt | Staff 6 link + "Contact support" (`mailto:support@easyspotops.example`), Client 4 link + Contact support; mọi đích fetch 200 | | Cao |
| F549 | Đạt | Đạt | Resident 3 link (Settings, Messages, Ticket box), Admin 4 link (Settings, Messaging & Support, Ticket box, Notifications) + Contact support; fetch 200 | | Cao |
| F551 | Đạt | Đạt | 4/4: "Sign out": toast "Signing out is not part of this preview.", URL giữ, menu `aria-expanded=false` | | Trung bình |
| F552 | Đạt | Đạt | 4/4: số khóa localStorage chênh 0, `eso-msg-v1` không đổi | | Cao |
| F572 | Đạt | Đạt | Staff: cuộn dashboard 294,67 px (tối đa 295) → Social → Exit (chuột thật): `navigation.type` "navigate", `#main-content.scrollTop` = 294,67 | | Cao |
| F574 | Đạt | Đạt | 4/4 mở đúng hội thoại: Staff `#/c/c8` (Priya Nair, "torn at the gate"), Client `#/c/c25` (March review), Resident `#/c/c47` (EasySpotOps Assistant), Admin `#/c/c29` (Marcus Cole) | | Cao |
| F575 | Đạt | Đạt | `/client/tickets.html?as=cli-1&new=1` mở `<dialog>` "Create ticket" | | Cao |
| F577 | Đạt | Đạt | `/resident/messages.html?as=res-2#/c/c47` (link của res-1): 0 chữ "Chat closed after a period of inactivity", avatar "Priya Nair" | | Nghiêm trọng |
| F579 | Đạt | Đạt | Mới đo lại 2/12 ca: Staff `?as=zzz` và `?as=res-1` đều hiện "Jordan Lee" | | Cao |
| F580 | Đạt | Đạt | `?as=<id>&dark`, 4 cổng: mọi `a[href^="/"]` giữ cả `as` và `dark` (Staff 12, Client 11, Resident 9, Admin 21 link; 0 thiếu) | | Cao |
| F588 | Đạt | Đạt | Client: đủ 6 thẻ KPI, 0 NaN, bảng 1 dòng | | Cao |
| F589 | Đạt | Đạt | Client "Capacity summary": Parking 261/300, Residents 202/800, Staff 7/10; Staff "Workspace Capacity": Residents 202/800, Staff Users 7/10, Parking 261/300 | | Cao |
| F590 | Đạt | Đạt | Resident: "Welcome back, Alex" (`res-1`), "Welcome back, Priya" (`res-2`) | | Cao |
| F591 | Đạt | Đạt | Admin: Open tickets 2, Unread messages 2 (sau khi đọc c29), Emergencies 0, Platform alerts 32; 0 NaN | | Cao |
| F596 | Đạt | Đạt | `/index.html` có 32 link, 32/32 trả 200 | | Cao |
| F597 | Đạt | Đạt | Đủ 24 đích sidebar khác nhau ở `/index.html` (gồm `/admin/settings/profile.html`) | | Trung bình |
| D504 | Đạt | Đạt | `staff:sb-pins` = `{bad`, `42`, `[1,{"a":1}]`, `["<img src=x onerror=alert(1)>"]`: 4/4 trang tải, 23 mục, 0 mục yêu thích lạ, 0 `img` | | Cao |
| D506 | Đạt | Đạt | `eso-status` = `hacker`, `<b>`, rỗng: Available, 0 lỗi | | Trung bình |
| D507 | Đạt | Đạt | `eso-status` `{"s":"busy","until":"abc"}` và `until` = -5: Available | | Trung bình |
| D510 | Đạt | Đạt | `ui-prefs:staff` = `{`, `null`, `{"sb":["red;}*{display:none"]}`, `{"text":{"size":9999,"color":"red;}*{display:none"}}`: 4/4 trang bình thường (23 mục, sidebar hiển thị) | | Cao |
| S528 | Đạt | Đạt | 31 trang (gồm iframe nhúng): 0 nút/link/ô nhập nhìn thấy không có tên truy cập (5 ô `aria-hidden`, `tabindex=-1` của bộ chọn ở Client dashboard bị loại) | | Cao |
| U516 | Đạt | Đạt | 4 dashboard × 375, 768, 1440 px: `scrollWidth − innerWidth` ≤ 0 | | Cao |
| U517 | Đạt | Đạt | 31 trang × 375 px và 768 px (gồm iframe nhúng): 62/62 ≤ 0; 1440 px: top-level 31/31 = −6 | | Cao |
| U519 | Đạt | Đạt | Theo đặc tả 24 px: 375 px, Staff: điều khiển header 32 đến 65 x 36, mục sidebar cao 36. Theo tiêu chí gốc 44 px: không đạt (mặc định); với "Larger tap targets" nút header lên 44 x 44 nhưng mục sidebar vẫn 36 px (xem hồi quy mới 1) | | Trung bình |
| U527 | Đạt | Đạt | 31 trang × 375 px (gồm iframe): 0 lần "lorem", "todo", "fixme", "tbd", "undefined", "nan", "null", "[object", "{{" | | Trung bình |
| U528 | Đạt | Đạt | 31/31 trang có `link[rel~=icon]` | | Thấp |
| S534 | Đạt | Đạt | Console 0 lỗi (`onlyErrors` rỗng, bộ đệm tab) suốt phiên; không request `favicon` (favicon là link inline); `GET /favicon.ico` vẫn 404 nhưng trình duyệt không gọi | | Cao |

## Tính năng mới đã đổi từ lượt 2 (kiểm thêm, không thuộc 199 dòng)

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Sidebar Layout "Rail" (`ui-prefs.layout = "B"`) | Đạt | Desktop: sidebar 80 px (baseline 244 px) |
| Count badges tắt (`counts:false`) | Đạt | Huy hiệu Messages và Ticket box `display:none` (Staff) |
| Menu search tắt (`search:false`) | Đạt | "Filter menu" ẩn |
| Scrollbar (`scroll:"hidden"`) | Đạt | `scrollbar-width: none` ở vùng cuộn sidebar |
| Larger tap targets | Không đạt | Nút header 44x44 nhưng mục sidebar 36 px; làm vỡ thẻ KPI Staff dashboard (xem hồi quy mới 1) |
| Mục Social của Staff ẩn khi tắt | Đạt | `eso-social` = `{"on":false}` hoặc `{"sidebar":false}`: mục Social ẩn |
| Mục Social/Promotions/Ticket box của Resident ẩn khi Client tắt | Đạt | `client:eso-proto` = `{cwSocial:false,cwPromos:false,cwTickets:false}`: cả 3 mục ẩn |
| Tên property thay chữ mặc định | Đạt một phần | `eso-prop.display` = "Harbor View Lofts": phần chính Staff và Resident đổi; thẻ tài khoản sidebar giữ tên cũ; khóa hỏng về mặc định |
| Ctrl+K đóng menu hồ sơ | Đạt | Xem S524 |
| Exit Messages ↔ Ticket box về dashboard | Đạt (Admin) | Xem F564; Staff, Client, Resident không có Exit hiển thị trong trang khung |
| Placeholder ô tìm có tên cổng | Đạt | Xem F502 |

## Dọn dẹp

Đã xóa localStorage và sessionStorage của `a5.localhost:3590`, trả viewport về desktop, đóng tab kiểm thử (tab-5). Không sửa mã, không commit, không xóa tệp của dự án.
