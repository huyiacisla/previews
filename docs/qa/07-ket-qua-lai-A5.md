# Kết quả kiểm lại A5 (Điều hướng và khung 4 cổng)

Ngày 2026-11-15. Tester độc lập, chạy thật trên `http://a5.localhost:3590` (dev server, dữ liệu ở localStorage). Nguồn: `03-tieu-chi-A5-navigation-frame.md`, `04-ket-qua-A5.md`, `01-quyet-dinh-chu-du-an.md`. Tệp này được ghi dần: phần "Tổng hợp" cập nhật ở cuối mỗi nhóm.

## Tổng hợp

### Phần A: 76 dòng trước đây "Không đạt" (49) hoặc "Chưa kiểm được" (27)

| Kết quả sau khi kiểm lại | Số dòng |
|---|---|
| Chuyển sang Đạt | 18 |
| Còn Không đạt | 36 |
| Còn Chưa kiểm được | 22 |
| Tổng | 76 |

Chuyển sang Đạt (18): F509, F531, F560, F572, F580, F597, D507, U513, U528, S528, S534 (từ Không đạt); F515, F538 (mô phỏng), F568 (một phần), F571, F594 (mô phỏng), D512, D515 (từ Chưa kiểm được). Trong 49 dòng Không đạt cũ: 11 đạt, 36 còn Không đạt, 2 chuyển thành Chưa kiểm được (F573 chỉ dựng được ở Staff, S525 mới đo Staff). Trong 27 dòng Chưa kiểm được cũ: 7 đạt, 20 còn Chưa kiểm được. Dòng [Chờ quyết] chỉ ghi hành vi hiện tại.

### Phần C: hồi quy trên 64 dòng trước đây "Đạt"

| Kết quả | Số dòng |
|---|---|
| Vẫn Đạt | 58 |
| Chuyển Không đạt (hồi quy mới) | 6 |
| Tổng | 64 |

Hồi quy mới (6): F530, F533 (tìm kiếm đầu trang mất bộ lọc, xem Phát hiện 1); F558, F559, X510 (bấm chuột thật vào mục Coming soon không ra toast, xem Phát hiện 2); F525 (ghim yêu thích bằng bàn phím không còn). % Đạt của 04 cũ (123/172 = 71,5%) không so trực tiếp được vì lượt này chỉ đo lại 76 + 64 dòng.


## Giới hạn đo (ghi trung thực)

- Công cụ gõ ký tự thật (`type`, phím chữ) KHÔNG chèn chữ vào ô nhập; phím Ctrl+K, Enter, Tab, mũi tên, Esc gửi thật được. Chữ gõ vào ô được mô phỏng bằng đặt giá trị và bắn sự kiện `input`.
- Bấm chuột thật chỉ làm được ở khung hình 800 px (toạ độ = CSS px × 800 ÷ bề rộng viewport).
- Viewport 1440x900 mô phỏng bằng `resize_window`; một số lần bị app tự trả về cỡ gốc, đã đặt lại.
- Hoạt ảnh trễ khi tab không ở phía trước hoặc trong iframe ẩn: các phép đo hoạt ảnh (thu gọn sidebar, vòng focus) chờ ≥ 1,2 s.
- Không có Lighthouse, axe, chặn request, giả lập mạng, `prefers-reduced-motion`.

## PHÁT HIỆN MỚI / HỒI QUY (đọc trước)

1. **Tìm kiếm đầu trang không lọc nữa (hồi quy nặng, cả 4 cổng).** `src/shared/js/portal-frame-extras.js` dòng 447: đoạn `.filter(...).slice(0, 8)` nằm sau dấu `//` của chú thích nên bị bỏ qua. Hệ quả: bảng luôn liệt kê toàn bộ mục (Staff 24, Client 18, Resident 18, Admin 30) với mọi chuỗi gõ ("mes", "zzzz", "Operations" đều cho đủ số dòng), không bao giờ hiện "No pages match.", Enter trên dòng đầu luôn mở Dashboard (tải lại chính trang). Ảnh hưởng F528, F530, F533 (và F531 một phần).
2. **Bấm chuột thật vào mục "Coming soon" không có phản hồi.** Mục chưa có trang là `aria-disabled` + class `pointer-events: none` + mờ 50%, không nhãn thấy được, không tooltip: chuột thật bấm xuyên qua (đã thử Admin "Users": 0 toast). Phím Enter thật trên mục đang focus thì ra toast đúng chữ; `.click()` bằng mã cũng ra toast. Ảnh hưởng F558, F559, F560, X510.
3. Thu gọn sidebar: tên truy cập đã đủ nhưng icon lệch tâm 4 đến 18 px ở cả 4 cổng (U509).
4. Ghim yêu thích: chuột thật ghim đúng, nhưng Enter thật (và `.click()` bằng mã) trên nút Pin không ghim, 1 lần Enter còn ra toast "Coming soon" (F525).
5. Admin: huy hiệu "Messaging & Support" đếm tin chưa đọc (4) thay vì hội thoại (2) sau Reset, và trang Messages không liệt kê ticket Pending chưa đọc ở tab nào (F514).
6. Đã sửa tốt: favicon, `markComingSoon` theo href hiện tại (Admin 23/23), chuông `aria-current` ở trang Notifications, huy hiệu Messages 4 cổng, Ctrl+K mở bảng khi trống, Enter mở trang thật giữ `?as=` và `dark`, mục hiện tại không tải lại, menu hồ sơ ≤ 70%, "Contact support", "User 1" đã bỏ, mục lục có Admin Profile, vòng focus sidebar (Staff), khôi phục cuộn Back/Exit (Staff), `until` không hợp lệ về Available.

## Bảng chi tiết (nhóm 1)

| ID | Kết quả mới | Kết quả cũ | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| F501 | Không đạt | Không đạt | [Chờ quyết] Logo svg 32x32 ở 4/4. Staff, Client, Resident: không là link. Admin: `<a href="#">`, bấm ra toast "Coming soon: this feature is in development and is not available in the preview yet." (chữ mới), URL giữ nguyên, không mở dashboard | Admin dashboard, bấm logo sidebar | Trung bình |
| F502 | Không đạt | Không đạt | "User 1" ở Admin đã hết (false); Client, Resident, Admin: 0 "QS", 0 "EasySpotOps Staff/staff portal". Placeholder ô tìm vẫn là "Search…" ở 4 cổng (aria-label đúng: "Search admin pages"…) | `document.querySelector('header input').placeholder` = "Search…" | Trung bình |
| F504 | Không đạt | Không đạt | Số mục: Staff 23, Client 19, Resident 18, Admin 29 (không đổi, bản chụp 40/25/38/43) | LABELS.length | Trung bình |
| F509 | Đạt | Không đạt | 4/4 cổng (iframe 1440 px): bấm mục đang chọn 4 lần: `defaultPrevented`, cờ `window.__m` còn, 0 lần `load`, 0 toast, URL giữ. Staff đo thêm trong tab thật: `navigation.type` vẫn "navigate" từ lần tải đầu, cờ còn | | Cao |
| F510 | Không đạt | Không đạt | Thay đổi: chuông có `aria-current="page"` ở 4 trang Notifications (mỗi trang đúng 1 aria-current, nhưng 0 trong sidebar vì sidebar không có mục Notifications). Client support: mục "Support" có aria-current. Còn `/staff/support.html` (tiêu đề "Help Center"): 0 phần tử aria-current | Mở `/staff/support.html?as=stf-1`, `document.querySelectorAll('[aria-current="page"]').length` = 0 | Cao |
| F514 | Không đạt | Không đạt | Huy hiệu có ở cả 4 cổng, tên truy cập có "N unread" (Client, Admin: nhãn trên link; Staff, Resident: nhãn trên huy hiệu, link không có aria-label). Staff 4 = 4 hội thoại chưa đọc (tab All); Client 2 = 2; Resident 1 = 1. Admin: huy hiệu 2 (dashboard "4 in 2 conversations") nhưng trang Messages chỉ hiện 1 hội thoại chưa đọc ở mọi tab (Queue 1; ticket "Bulk-approve guest passes" đang Pending không nằm tab nào, chỉ mở được bằng `#/c/c37`) | Admin: so huy hiệu 2 với `/admin/messages.html` (Queue 1, Mine/Direct 0) | Cao |
| F515 | Đạt | Chưa kiểm được | 2 iframe cùng persona stf-1: iframe 1 dashboard, iframe 2 Messages; bấm hội thoại chưa đọc ở iframe 2: huy hiệu iframe 1 giảm 4 → 3 sau 94 ms (chuông 14 → 13) | | Trung bình |
| F538 | Đạt (mô phỏng) | Chưa kiểm được | Không gửi tin bằng giao diện được; ghi 1 tin mới (chưa đọc) vào `eso-msg-v1` từ tài liệu khác: chuông 13 → 14 và huy hiệu 3 → 4 sau 12 ms, không tải lại. Là mô phỏng ghi storage, không qua nút Send | | Trung bình |
| F528 | Không đạt | Không đạt | Ctrl+K thật (Admin): ô có focus, bảng mở khi ô rỗng (`#frame-search-results` có, `aria-expanded=true`) — phần này đã sửa. Nhưng số dòng: Admin 30, Staff 24, Client/Resident 18 (> 8) vì lọc hỏng (xem Phát hiện 1) | Ctrl+K rồi `querySelectorAll('#frame-search-results [role=option]').length` | Cao |
| F530 | Không đạt | Đạt | Hồi quy: gõ "mes", "MES", "Operations" đều cho đủ 24/18/18/30 dòng, dòng đầu là "Dashboard" | Xem Phát hiện 1 | Trung bình |
| F531 | Đạt | Không đạt | Mũi tên: ArrowDown thật ×11 → `aria-activedescendant=frame-search-11` (Admin); ArrowUp từ dòng 0 vòng về dòng cuối, ArrowDown vòng đúng (Staff, Client, Resident). Enter thật trên "Messaging & Support": mở `/admin/messages.html?as=adm-1&dark`, vẫn dark. Staff: Enter trên "Messages" mở `/staff/messages.html?as=stf-1&dark`. Mọi dòng có href ở Staff 7, Client 6, Resident 6 đều giữ `as=` và `dark`. Lưu ý: Enter trên dòng "Dashboard" khi đang ở Dashboard tải lại trang | | Cao |
| F532 | Đạt | Đạt | Staff, chọn dòng "Reports" (chỉ số 19), Enter: toast "Coming soon: this feature is in development and is not available in the preview yet.", bảng đóng, URL giữ nguyên | | Cao |
| F533 | Không đạt | Đạt | Hồi quy: gõ "zzzz" vẫn 24/18/18/30 dòng, không bao giờ hiện "No pages match." | Xem Phát hiện 1 | Trung bình |
| F534 | Đạt | Đạt | Mọi href của dòng kết quả là trang của chính cổng (0 link `/staff/`,`/client/`,`/resident/`,`/admin/` sai cổng). Lưu ý: vì lọc hỏng, "Violations" không thu hẹp được | | Trung bình |
| F535 | Đạt | Đạt | Admin: Ctrl+K thật đưa focus vào ô; bảng 30 dòng, 7 dòng có href đúng, giữ `?as=adm-1` | | Cao |
| F544 | Không đạt | Không đạt | 6 mục đúng thứ tự, mặc định Available, `aria-label` avatar đổi theo ("…, Busy" …) 6/6. Lưu khóa `eso-status` = `{"s":"busy","until":0}`, `staff:status` = null | Chọn Busy, `localStorage.getItem('staff:status')` = null | Trung bình |
| F545 | Không đạt | Không đạt | [Chờ quyết] Ô status message `maxLength` = 100 (tiêu chí nói 80) | Đọc `input.maxLength` | Trung bình |
| D507 | Đạt | Không đạt | `eso-status` busy với `until` = 1 (quá khứ), -5, "NaN", "abc", `{a:1}`: cả 5 về Available khi tải và lưu lại `available` (`until` null thì giữ Busy, ngoài 4 dạng của tiêu chí) | | Trung bình |
| F521 | Đạt | Đạt | Staff "Filter menu": "mes" → chỉ "Messages"; xóa → 23 mục | | Trung bình |
| F522 | Đạt | Đạt | "zzzz" → 0 mục, dòng "No menu items match." (`role=status`); xóa → 23 mục; 0 lỗi `error` | | Trung bình |
| F523 | Đạt | Đạt | `<img src=x onerror=alert(1)>`, `.*(`, `\`, 500 ký tự: 0 alert, 0 `img` trong nav, xử lý ≈ 62 ms | | Cao |
| F597 | Đạt | Không đạt | `/index.html` có 32 link, 32/32 mở 200; đủ 24 đích sidebar khác nhau, có `/admin/settings/profile.html` ("Profile") | | Trung bình |
| X514 | Không đạt | Không đạt | [Chờ quyết] 3 cặp lệch: Staff "Workspace" (tiêu đề "Settings"), Client "Dashboard" (tiêu đề "Portfolio Performance"), Client "Settings" (tiêu đề "Workspace settings"): 28/31 = 90% (< 95%). Staff "Help Center" đã khớp | | Thấp |
| U528 | Đạt | Không đạt | 30/30 trang có `link[rel~=icon]` (SVG data URI). Chưa đo `GET /favicon.ico` trong nhóm này | | Thấp |
| S528 | Đạt (đo bằng mã tự viết, không phải axe) | Không đạt | 30 trang (gồm iframe nhúng): 0 nút/link/ô nhập không có tên truy cập (trước: 14). Không chạy axe | | Cao |
| S526 | Không đạt | Không đạt | `header` = 2 ở mọi trang khung (3 ở `/admin/notifications.html`, `/admin/settings.html`); `main` = 2 ở trang có iframe nhúng (Messages, Tickets, Notifications, Documents, Capacity); Admin Messages/Tickets: `nav` = 0. Skip link "Skip to main content" có | `document.querySelectorAll('header').length` ở `/staff/dashboard.html` | Trung bình |
| S527 | Không đạt | Không đạt | `h1` = 2 ở `/staff/promotions.html`, `/admin/notifications.html`, `/admin/settings.html`; nhảy cấp heading ở `/staff/promotions.html`, `/staff/support.html`, `/client/support.html`. `h1` của `/staff/support.html` và `/client/support.html` vẫn là "Dashboard" (sót từ bản chụp) | Đếm `h1` ở 3 trang đầu | Trung bình |
| U526 | Không đạt | Không đạt | `/staff/workspace.html` và `/staff/settings/profile.html` cùng "Settings"; `/client/workspace.html` và `/client/settings/profile.html` cùng "Workspace settings"; Admin Messages "(2) Messaging & Support" | `document.title` | Thấp |
| U509 | Không đạt | Không đạt | Thu gọn 80 px: mọi mục có tên truy cập (0 thiếu; mục có huy hiệu ở Staff, Resident tên từ chữ + "N unread"). Nhưng icon lệch tâm so với trục sidebar: Client −10…+6 px (19/19 > 2 px), Resident −18…+6, Admin −12…+4, Staff −10…+6; link rộng 20 đến 40 px | Bật `ui-prefs:<cổng>={"collapse":true}`, `ui-sidebar-collapsed:<cổng>=1`, chờ 3 s, đo tâm `svg` | Trung bình |
| U505 | Không đạt | Không đạt | Admin Messages, Tickets: vẫn không có sidebar, header 61 px chỉ có Exit, Preview tools, Theme; dashboard có sidebar 244 px | | Cao |
| F556 | Không đạt | Không đạt | [Chờ quyết] Như U505: 0 nav, 0 chuông, 0 avatar ở `/admin/messages.html` | | Cao |
| F557 | Không đạt | Không đạt | [Chờ quyết] `/staff/social.html`, `/resident/social.html`: header 57 px riêng, không sidebar cổng, không chuông/avatar | | Cao |
| F505 | Đạt | Đạt | Staff 6/6 href đúng, HTTP 200, trang tải đúng tiêu đề và có `aria-current` | | Nghiêm trọng |
| F506 | Đạt | Đạt | Client 7/7 như trên | | Nghiêm trọng |
| F507 | Đạt | Đạt | Resident 6/6 như trên | | Nghiêm trọng |
| F508 | Đạt | Đạt | Admin 6/6 (Support và Ticket box cùng `/admin/tickets.html`; Profile `/admin/settings/profile.html`) | | Nghiêm trọng |
| F503 | Đạt | Đạt | Sidebar mỗi cổng có đúng 1 chuỗi LABELS trên mọi trang khung: Staff 8/8 trang, Client 9/9, Resident 6/6, Admin 3/3 | | Cao |
| F537 | Đạt | Đạt | 4/4 cổng: bấm dòng thông báo chưa đọc: N giảm đúng 1 sau 13 đến 17 ms (Staff 15→14, Client 95→94, Resident 32→31, Admin 4→3) | | Cao |
| F536 | Đạt | Đạt | 4/4: nhãn "Open notifications. N need attention." = huy hiệu = tóm tắt ở trang Notifications (Staff 15, Client 95, Resident 32, Admin 4) | | Cao |
| F539 | Đạt | Đạt | Admin: hộp chuông 5 dòng + "View all" (≤ 10), huy hiệu 4 = N | | Cao |

## Bảng chi tiết (nhóm 2: mobile, menu, theme, Help)

| ID | Kết quả mới | Kết quả cũ | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| F518 | Đạt | Đạt | 375 px Staff: sidebar ngoài màn hình khi đóng, nút "Open navigation" `aria-expanded=false`; bấm: `aria-expanded=true`, `data-nav-open` có, sidebar 320x812 (chạy hoạt ảnh) | | Nghiêm trọng |
| F519 | Đạt | Đạt | Staff 375 px: nền mờ (DIV fixed z 50, 375x812) bấm đóng; Esc thật đóng; (chọn mục và kéo rộng đã đạt ở lần trước, không đo lại) | | Cao |
| X501 | Đạt | Đạt | Esc thật: `data-nav-open` mất, `activeElement` = "Open navigation" (Staff; 3 cổng còn lại không đo lại) | | Trung bình |
| X502 | Không đạt | Không đạt | [Chờ quyết] Tab thật từ điều khiển cuối của ngăn kéo ("EasySpotOps Help Center", 81 điều khiển) → focus sang "Open navigation" phía sau nền mờ, ngăn kéo vẫn mở: không có bẫy focus | Mở ngăn kéo 375 px, focus điều khiển cuối, nhấn Tab | Trung bình |
| X503 | Đạt | Đạt | Staff 375 px: gõ "mes" (mô phỏng), Esc lần 1: ô được xóa, ngăn kéo mở; Esc lần 2: đóng | | Thấp |
| U510 | Đạt | Đạt | Nền mờ 375x812, z 50 phủ toàn viewport, sidebar nằm trên | | Trung bình |
| U513 | Đạt | Không đạt | Menu hồ sơ cao tối đa 70% viewport: 375x812 Staff 568 px (70%), Client 566 (70%), Resident 352 (43%), Admin 396 (49%); 1440x900 Staff 630/900 = 70%. `overflow-y:auto`. Bảng chuông 297 đến 350 px (37 đến 43%). Mọi bảng trong khoảng left ≥ 12 và right ≤ 363 | | Trung bình |
| U516 | Đạt | Đạt | 4 dashboard × 375, 768, 1440 px: không cuộn ngang | | Cao |
| U517 | Đạt | Đạt | 30 trang (gồm 4 app toàn màn hình) × 375, 768, 1440 px: 90/90 `scrollWidth − innerWidth ≤ 0` (gồm iframe nhúng) | | Cao |
| U518 | Đạt | Đạt | 320 và 640 px, 4 dashboard: 0 cặp điều khiển header giao nhau (riêng điều khiển bị cắt: xem S531) | | Cao |
| S531 | Không đạt | Không đạt | 640 px: 4 dashboard đạt. 320 px: Staff, Client, Resident đạt, 0 cuộn ngang; Admin: nút avatar "Open profile menu for Taylor Brooks" right = 333 > 320 (cắt 13 px) | `/admin/dashboard.html` ở 320 px, đo avatar | Cao |
| U519 | Đạt | Đạt | Theo đặc tả (≥ 24 px): 375 px, 4 dashboard: điều khiển header nhỏ nhất 32x32 (menu 40x36, tìm 113 đến 145 x 32, chuông, theme 32x36, avatar 33 đến 65 x 36); mục ngăn kéo nhỏ nhất cao 25 px (Admin 32). Theo tiêu chí gốc 44 px: 0 điều khiển đạt | | Trung bình |
| U531 | Đạt | Đạt | Theo đặc tả 24 px: Help ở header 32x36 (1440 px); ở 375 px nút "EasySpotOps Help Center" trong ngăn kéo 274x49. Theo 44 px gốc: nút header không đạt | | Trung bình |
| U520 | Không đạt | Không đạt | 375 px, phần tử `main p, main li, main td, input` cỡ chữ < 16 px: Staff dashboard 25/31, Client 37/49, Resident home 41/42, Admin 12/22, Staff Messages 1/3 (mẫu 12 px, 14 px). Ô tìm của header 16 px ở 4 cổng | Duyệt `main p, main li, main td` ở 375 px, lấy `fontSize` | Trung bình |
| F541 | Đạt | Đạt | `/staff/messages.html`: bấm Theme: `<html>` light → dark, iframe nhúng dark cùng lúc, nền body đổi `lab(96.7…)` → trong suốt. `aria-label` nút vẫn "Theme: light" sau khi chuyển (không cập nhật) | | Trung bình |
| F542 | Đạt | Đạt | `?dark` ở 9 địa chỉ (Staff dashboard, Messages, Social; Client, Resident home, Resident Social; Admin dashboard, Messages, Tickets): `html.dark` và mọi iframe nhúng dark | | Trung bình |
| X509 | Đạt | Đạt | Bấm Theme (Staff): `ui-prefs:staff={"theme":"dark"}`; mở `/staff/tickets.html` không có `dark` trên URL vẫn dark (cả iframe) | | Trung bình |
| U529 | Đạt | Đạt | `?dark`: header `oklch(0.145 0 0)`; 0 phần tử header, sidebar, main, body có nền sáng (độ sáng > 0.8) ở 9 trang | | Trung bình |
| U515 | Đạt | Đạt | Nút Theme có ở header 4 dashboard và 4 app toàn màn hình (đã thấy ở 04; Admin Messages có `[data-theme-toggle]`) | | Trung bình |
| S525 | Chưa kiểm được | Không đạt | Đã sửa ở Staff: Tab thật tới mục sidebar có vòng `outline` solid 2 px (sáng: màu rgb(37,99,235) so nền sidebar 3,45:1; tối: 5,84:1); nút theme, chuông, avatar có vòng 3 px/2 px sau khi hoạt ảnh xong (tối 6,0 đến 6,5:1); ô tìm/ô lọc: viền xanh + vòng 3 px ở khung bọc. Mới đo Staff (sáng, tối); Client, Resident, Admin và đủ 8 lượt chưa đo | | Cao |
| F543 | Đạt | Đạt | Menu hồ sơ ở 4 cổng: Staff "Jordan Lee / Property Manager / Mallard Pointe at Riverbend" + Status; Client "Dana Whitfield / Client / AMC LLC" + Status; Resident "Alex Rivera / Unit 02-291" + Account; Admin "Taylor Brooks / Support Lead / EasySpotOps Support" + Account | | Cao |
| F547 | Đạt | Đạt | Staff, Client có "Status"; Resident, Admin không | | Thấp |
| F548 | Đạt | Đạt | Staff 6 link + "Contact support" (mailto:support@easyspotops.example), Client 4 link + Contact support: mọi link trong trang giữ `as` và `dark`, fetch 200. "My Social" và "Saved posts" cùng `/staff/social.html` | | Cao |
| F549 | Đạt | Đạt | Resident 3 link (Settings, Messages, Ticket box) + Contact support; Admin 4 link (Settings, Messaging & Support, Ticket box, Notifications) + Contact support: 200, giữ `as` và `dark` | | Cao |
| F551 | Đạt | Đạt | 4/4: Sign out: toast "Signing out is not part of this preview.", URL giữ, menu `aria-expanded=false` | | Trung bình |
| F552 | Đạt | Đạt | 4/4: số khóa localStorage chênh 0, `eso-msg-v1` không đổi | | Cao |
| F553 | Không đạt | Không đạt | [Chờ quyết] Staff `/staff/support.html`, Client `/client/support.html`, Resident `/resident/tickets.html`, giữ `?as=`. Admin: 0 nút Help (header và sidebar) | Admin dashboard: `[aria-label*="Help Center"]` = 0 | Cao |
| F554 | Đạt | Đạt | Staff, Client, Resident: bấm Help 5 lần liên tiếp: 1 lần tải trang đích | | Thấp |
| X515 | Không đạt | Không đạt | [Chờ quyết] Help 1 bấm (3 cổng). `h1` của `/staff/support.html` và `/client/support.html` vẫn là "Dashboard" (có `h2` "How can we help?"); Resident "Ticket box· Resident" đạt | | Thấp |
| F558 | Không đạt (chuột thật) | Đạt | Admin 23/23 `.click()` bằng mã: toast "Coming soon: …" sau ≤ 14 ms, URL giữ, history +0, 0 lỗi, focus giữ ở mục, `role=status`; Enter thật trên mục đang focus có toast. Nhưng chuột thật vào "Users" (Admin): 0 toast, vì mục có `pointer-events: none` (class `aria-disabled:pointer-events-none`), mờ 50%, không tooltip, không nhãn thấy được. Staff, Client, Resident chưa lặp từng mục ở lượt này | Admin dashboard, bấm chuột thật vào "Users" ở sidebar: không phản hồi | Cao |
| F559 | Không đạt (chuột thật) | Đạt | Admin 23/23 như F558 (mã và Enter đạt, chuột thật không có toast) | Như F558 | Cao |
| F560 | Đạt | Không đạt | Đã sửa: Admin 23/23 mục `#` có `aria-disabled`, `title="Coming soon"`, `aria-label` "<tên>, coming soon"; mục có trang thật không bị khóa ở 4 cổng (Staff 17, Client 12, Resident 12, Admin 23 mục `#`); toast của logo Admin, khối Favorites (Staff "Reports") và bảng tìm đều dùng chữ "Coming soon: this feature is in development and is not available in the preview yet."; 0 chữ Error/404/undefined. Riêng bấm chuột thật: xem F558, F559 | | Cao |
| X510 | Không đạt (chuột thật) | Đạt | Enter thật: focus giữ ở mục, toast `role=status`. Chuột thật: không toast, focus không vào mục (pointer-events none) | Như F558 | Trung bình |

## Bảng chi tiết (nhóm 3: cuộn, Back, Exit)

| ID | Kết quả mới | Kết quả cũ | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| F572 | Đạt | Không đạt | Staff dashboard cuộn tới giới hạn 295 px (cửa sổ 900 px), vào Social, bấm Exit (`/staff/dashboard.html?as=stf-1`): `navigation.type` = "navigate", `#main-content.scrollTop` = 294,67 (khóa `eso-scroll` = 294,67). Chỉ đo Staff | | Cao |
| F573 | Chưa kiểm được (Staff đạt, 3 cổng còn lại không dựng được điều kiện) | Không đạt | Staff: cuộn 295 px, chuột thật bấm Messages, Back: `back_forward`, `scrollTop` = 294,67 sau 2,5 s. Client: vùng cuộn không gán được `scrollTop` bằng mã (HTML/`window` không đổi giá trị), nên chưa dựng được điều kiện; Resident, Admin chưa thử | | Trung bình |
| F571 | Đạt | Chưa kiểm được | Staff, chuột thật: Dashboard → bấm Messages → bấm Ticket box; Back thật lần 1 về Messages, lần 2 về Dashboard (đúng thứ tự, tiêu đề đúng, 0 trang trắng) | | Cao |
| D512 | Đạt | Chưa kiểm được | Khóa `eso-scroll:<đường dẫn>` mỗi đường dẫn một khóa số. Ghi `abc` cho `/staff/dashboard.html` rồi Back: `back_forward`, `scrollTop` = 0, trang hiển thị bình thường (giá trị hỏng bị bỏ qua). Giá trị âm chưa thử | | Thấp |
| D513 | Không đạt | Không đạt | Sau khi mở 30 trang: có `eso-scroll:/staff/social.html` = 0 và `/resident/social.html` = 0 (app toàn màn hình vẫn ghi khóa); `/admin/messages.html`, `/admin/tickets.html` không có khóa | `Object.keys(sessionStorage)` sau khi mở `/staff/social.html` | Thấp |
| F564 | Không đạt | Không đạt | Admin: dashboard → Messaging & Support → Exit về `/admin/dashboard.html?as=adm-1` (đạt). Staff: dashboard → Social → Exit về `/staff/dashboard.html?as=stf-1` (đạt). Messages, Ticket box của Staff, Client, Resident là trang khung: nút "Exit Messages"/"Exit Ticket box" tồn tại trong iframe nhưng ẩn (`offsetParent` null), kịch bản 8 ca không làm được | Staff dashboard → Messages: không có Exit hiển thị | Trung bình |
| F565 | Không đạt | Không đạt | Social (Staff) Exit về dashboard (đạt). Resident Promotions: nút Exit ẩn; Resident Settings: 0 Exit | Resident home → Promotions: không có Exit | Trung bình |
| F568 | Đạt (một phần) | Chưa kiểm được | Admin Messages chỉ có 2 hội thoại mở được (c29, c37): đổi hash 5 lần luân phiên (lịch sử +5), bấm Exit: về `/admin/dashboard.html?as=adm-1`, không về hội thoại trước. Chưa có 5 hội thoại khác nhau | | Cao |
| F570 | Chưa kiểm được | Chưa kiểm được | `/staff/workspace.html`, `/resident/settings.html`, `/staff/promotions.html`: 0 nút Back/Exit để thử | | Trung bình |

## Bảng chi tiết (nhóm 4: deep link, ?as, địa chỉ, dashboard, hub)

| ID | Kết quả mới | Kết quả cũ | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| F574 | Đạt | Đạt | 4/4 mở đúng hội thoại: Staff `#/c/c8` (Priya Nair, "torn at the gate"), Client `#/c/c25` (March review), Resident `#/c/c47` (EasySpotOps Assistant), Admin `#/c/c29` (Marcus Cole) | | Cao |
| F575 | Đạt | Đạt | `/staff/tickets.html#/t/c18` hiện T-1082; `/client/tickets.html?new=1` mở `<dialog>` "Create ticket" | | Cao |
| F576 | Đạt | Đạt | `#/c/zzz` (hiện "Select a conversation"), `#/t/zzz` (2.232 ký tự, danh sách), `/staff/social.html#/post/zzz` (1.601 ký tự), `/staff/workspace.html#/zzz` (giữ chỗ): 4/4 có nội dung. Chưa đọc Console iframe | | Cao |
| F577 | Đạt | Đạt | Link `#/c/c47` và `#/c/c1` của res-1 mở bằng `?as=res-2`: 0 chữ "Chat closed after a period of inactivity" của res-1; mở bằng `stf-1`, `cli-1`: 0 nội dung hội thoại đó | | Nghiêm trọng |
| F579 | Đạt | Đạt | `?as=zzz`, `?as=` (rỗng), `?as=<id cổng khác>`: Staff → Jordan Lee, Client → Dana Whitfield, Resident → Alex Rivera, Admin → Taylor Brooks; `?as=stf-2` → Sam Okafor | | Cao |
| F580 | Đạt | Không đạt | `?as=<id>&dark`, 4 cổng: mọi `a[href^="/"]` (sidebar, chuông, menu hồ sơ, Help; Staff 12, Client 11, Resident 9, Admin 20) giữ cả `as` và `dark`; dòng kết quả tìm cũng giữ (xem F531). 0 thiếu | | Cao |
| F582 | Đạt | Đạt | Staff `#/notifications`, `#/social/me` và Client không hash: `/staff/account-settings.html` → `/staff/workspace.html?as=stf-1…`, `/client/account-settings.html` → `/client/workspace.html?as=cli-1` (hiện nội dung sau khoảng 8 s lần đầu), còn `?as=` | | Cao |
| F583 | Không đạt | Không đạt | `/staff/account-settings.html?as=stf-1#/notifications` → `/staff/workspace.html?as=stf-1#/notifications` (tiêu chí: `/staff/settings/notifications.html`); `#/social/me` → `/staff/social.html?as=stf-1#/me` (đúng) | Mở địa chỉ đầu | Trung bình |
| F584 | Đạt | Đạt | Đo lại `/client/usage/capacity?as=cli-1` → `/client/usage/capacity.html?as=cli-1`, nội dung đúng; 4 địa chỉ còn lại chưa đo lại | | Cao |
| F585 | Không đạt | Không đạt | `/staff/` và `/messages/` 200; `/messages` và `/messages.html` trả mục lục `index` (tiêu đề "EasySpotOps · UI preview") thay vì hub ("Messaging hub") | `fetch('/messages.html')` | Trung bình |
| F586 | Đạt | Đạt | [Chờ quyết] `/staff/khong-co`, `/zzz.html`: HTTP 200, trả mục lục (có link) | | Trung bình |
| F587 | Không đạt | Không đạt | Staff dashboard: 6 thẻ KPI có số, 0 NaN; chỉ 1 biểu đồ SVG 160x160 (< 200x100) | `#main-content svg` rộng ≥ 200: 0 | Cao |
| F588 | Đạt | Đạt | Client: 6 thẻ KPI (Total Revenue $0, Parking Revenue $0, Revenue Leakage $0, Outstanding Balance —, Parking Utilization 66%, Properties at Risk 1); bảng 11 cột × 1 dòng 11 ô; 0 NaN | | Cao |
| F589 | Đạt | Đạt | Client "Capacity summary" và `/client/usage/capacity.html`: Properties 1/1, Parking 261/300, Residents 202/800, Staff 7/10; Staff "Workspace Capacity": Residents 202/800, Staff Users 7/10 | | Cao |
| F590 | Đạt | Đạt | `/resident/home.html`: 13 thẻ, "Welcome back, Alex" (`res-1`), "Welcome back, Priya" (`res-2`) | | Cao |
| F591 | Đạt | Đạt | Admin: Open tickets 2, Unread messages (0 sau khi đã đọc, 4 sau Reset), Emergencies 0, Platform alerts 32; 0 NaN | | Cao |
| F592 | Đạt | Đạt | Open tickets 2 = 2 dòng Support queue (T-1083, T-1085); Support queue ≤ 6 dòng | | Cao |
| F593 | Đạt | Đạt | "Open Ticket box" → `/admin/tickets.html`; "Open Messages" → `/admin/messages.html`; dòng queue → `/admin/tickets.html#/t/c29`, `#/t/c37`; ô Platform alerts → `#adm-health-h`. Đọc `href`, chưa bấm từng link | | Cao |
| F594 | Đạt (mô phỏng) | Chưa kiểm được | Gắn `emergency` (chưa xác nhận) vào hội thoại c8 của res-2 bằng ghi `eso-msg-v1`: Staff Messages hiện "Emergency: Priya Nair, under 1 min ago"; ô Emergencies của Admin vẫn 0 "None open", 0 băng Emergency. Không tạo qua giao diện Resident | | Cao |
| F595 | Đạt | Đạt | Hub "Start empty" (xác nhận "Click again to confirm", thông báo "All conversations were cleared."): Admin Open tickets 0 "Nothing is waiting", Unread 0 "Everything is read", Emergencies 0 "None open", "queue is clear" và "Nothing unread"; 0 NaN; huy hiệu Messages 0 ở 4 cổng | | Trung bình |
| F599 | Đạt | Đạt | [Chờ quyết] "Reset demo data" và "Start empty" đều cần bấm lần hai ("Click again to confirm"), rồi hiện "Demo data was reset." / "All conversations were cleared."; huy hiệu sidebar, chuông, dashboard về trạng thái mới | | Cao |
| D514 | Đạt (một phần) | Đạt | Sau Reset: chuông = tóm tắt "N need attention" ở 4 persona (Staff 15, Client 95, Resident 32, Admin 5), huy hiệu Messages Staff 4, Client 2, Resident 1, Admin 4. Sau Start empty: huy hiệu Messages 0 ở 4 cổng, chuông Staff 11, Client 93, Resident 31, Admin 3 (chưa đối chiếu lại tóm tắt) | | Cao |
| D517 | Đạt | Đạt | [Chờ quyết] "Reset demo data" giữ nguyên `ui-prefs:staff`, `ui-sidebar-collapsed:staff`, `staff:sb-pins`, `eso-status` | | Trung bình |
| U523 | Đạt | Đạt | Staff dashboard 1440: 1 `recharts-responsive-container`, SVG 160x160, 3 `path`; (375 px không đo lại) | | Cao |

## Bảng chi tiết (nhóm 5: yêu thích, hồ sơ chất lượng, bảo mật, các dòng không đo được)

| ID | Kết quả mới | Kết quả cũ | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| F524 | Đạt | Đạt | Staff: chuột thật bấm sao "Pin Promotions to favorites": toast "Promotions added to favorites.", `staff:sb-pins` = ["Messages","Promotions"]; nhãn thành "Unpin …", khối "Favorites" ở đầu sidebar | | Trung bình |
| F525 | Không đạt | Đạt | Ghim giữ ở 8/8 trang Staff (khối Favorites "Messages/Promotions/Reports"), 0 ở Client (đạt). Nhưng ghim bằng bàn phím không còn: focus nút "Pin Violations to favorites", Enter thật: sự kiện click tin cậy có, `staff:sb-pins` không đổi; trong 1 lần thử Enter ra toast "Coming soon" thay vì ghim. Chuột thật ghim được. (`.click()` bằng mã cũng không ghim) | Staff dashboard, focus nút Pin của mục bất kỳ, nhấn Enter, đọc `staff:sb-pins` | Trung bình |
| F526 | Đạt | Đạt | Ghim "Reports" (chuột thật), bấm mục trong khối Favorites (`href="#"`, `aria-disabled`): toast "Coming soon: …" (chữ mới, không còn "That page is not part…"), URL giữ nguyên. Bấm bằng `.click()` | | Trung bình |
| S502 | Không đạt | Không đạt | Dev server trả HTTP 200 và trang mục lục (5.734 byte, `<title>` "EasySpotOps · UI preview") cho `/_archive/` và `/src/shared/js/preview.js.map`; `/favicon.ico` = 404. `dist/` không có `.map`, `.zip`, `.bak`, `.env`. Không thăm dò `/.env`, `.claude/*.bak`, `.zip` lần này (công cụ từ chối thăm dò đường dẫn nhạy cảm) | `fetch('/_archive/')`: status 200 | Thấp |
| S508 | Không đạt | Không đạt | grep không phân biệt hoa thường "hsts", "không xác thực", "unauthenticated", "no authentication" trong `BRIEF.md`, `README.md`, `DESIGN.md`, `docs/*.md`: 0 kết quả | `grep -rniE "hsts|unauthenticated" BRIEF.md README.md DESIGN.md docs/*.md` | Cao |
| S518 | Không đạt | Không đạt | Staff dashboard (tải mới, cache 304): 47 request (> 40), dung lượng giải nén 4.271 KB (> 1,5 MB), truyền 24 KB; DOMContentLoaded 62 ms. Chỉ đo Staff; máy chủ dev, không nén | `performance.getEntriesByType('resource')` | Trung bình |
| S524 | Không đạt | Không đạt | Bấm ngoài đóng được (kết quả cũ). Mở menu hồ sơ rồi Ctrl+K thật: cả "Profile menu" và "Search results" cùng `display:block` (2 bảng) | Staff dashboard: mở hồ sơ, nhấn Ctrl+K | Trung bình |
| X504 | Không đạt | Không đạt | [Chờ quyết] Staff: bấm "Show Switch Property": 0 toast, 0 hộp thoại, không `aria-disabled`, URL giữ (im lặng). "Open Property Hub" không tìm thấy theo chữ ở lượt này | | Trung bình |
| X511 | Không đạt | Không đạt | [Chờ quyết] Staff dashboard: "Refresh" và "AI Work Assistant": 0 toast, 0 hộp thoại, URL giữ | | Thấp |
| X512 | Không đạt | Không đạt | Client dashboard: "AI Operations Assistant": 0 toast, 0 hộp thoại, URL giữ. ("Manage Capacity" là `button` không `href`, chưa bấm lại) | | Thấp |
| U503 | Không đạt | Không đạt | Resident (tab thật): `/resident/home.html` avatar x = 1212, ô tìm rộng 740; `/resident/messages.html` avatar x = 1218, ô tìm 746 (nhảy 6 px). `scrollbar-gutter: stable` đã có trên `<html>` nhưng vùng cuộn là DIV bên trong. Staff 1218, Client 1377, Admin 1242 không đổi giữa các trang | Đo avatar ở 2 trang Resident | Cao |
| U507 | Không đạt | Không đạt | Nền mục chọn trộn trên nền sidebar `oklch(0.2077 …)`: Staff 1,13:1, Client 1,27:1 (< 3:1). Thanh chỉ báo `span.w-1` (123,147,255): 6,34:1, đếm = 1 | Đo nền mục `aria-current` | Trung bình |
| U527 | Đạt | Đạt | 30 trang (gồm iframe nhúng) × 9 từ ("lorem", "TODO", "FIXME", "TBD", "undefined", "NaN", "null", "[object", "{{"; NaN/TODO/FIXME/TBD khớp theo từ nguyên): 0 lần | | Trung bình |
| S534 | Đạt | Không đạt | 4 dashboard (Staff, Client tối, Resident, Admin tối) tải thẳng: Console 0 lỗi (`onlyErrors` rỗng); không có request `favicon` (favicon là `link` SVG data URI). Danh sách mạng chỉ xem 60 request cuối (0 lỗi 4xx/5xx trong đó); `GET /favicon.ico` vẫn 404 nhưng trình duyệt không gọi | | Cao |
| D515 | Đạt | Chưa kiểm được | Khóa thật là `eso-notif-read:<id>` (xuất hiện sau khi đọc 1 thông báo, vd. `{"n-parking-0":true}`). Ghi `[1,2]`, `"abc"`, `null`, `{"x":1}`, `{bad` cho res-1: chuông về 32 (tính lại từ đầu), trang vẫn tải; res-2 giữ 29 trước và sau | | Trung bình |
| S532 | Chưa kiểm được | Chưa kiểm được | Không bật được giả lập. Có thấy trong `styles.css` quy tắc `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: 0.01ms !important; … transition … } }` (9 khối `prefers-reduced-motion`), nhưng chưa đo thời lượng thực | | Trung bình |
| U521 | Chưa kiểm được | Chưa kiểm được | Không có Lighthouse hoặc axe. Thử bộ đo tự viết (chữ so nền, ghép alpha) cho 4 dashboard × 2 giao diện cho kết quả không đáng tin (giả dương do nền gradient/lớp trong suốt), không dùng làm bằng chứng | | Cao |
| X508 | Chưa kiểm được | Chưa kiểm được | Mục có trang là thẻ `<a href>` thật (`target` rỗng); `dispatchEvent(click, ctrlKey)` không bị `preventDefault`. Ctrl+click thật bằng công cụ vẫn điều hướng cùng tab, không mở tab mới (khung trình duyệt này không hỗ trợ) | | Thấp |
| F555 | Chưa kiểm được | Chưa kiểm được | Cần chặn request `/staff/dashboard.html`; công cụ không có | | Cao |
| U530 | Chưa kiểm được | Chưa kiểm được | Cần chặn `/staff/messages-content.html` | | Trung bình |
| S521 | Chưa kiểm được | Chưa kiểm được | Cần giả lập mạng và chặn request | | Cao |
| U506 | Chưa kiểm được | Chưa kiểm được | Cần giả lập Slow 4G và quay khung hình | | Trung bình |
| D516 | Chưa kiểm được | Chưa kiểm được | Cần chặn dữ liệu trang của trình duyệt | | Trung bình |
| F567 | Chưa kiểm được | Chưa kiểm được | Cần origin thứ hai (`127.0.0.1:3590`), ngoài phạm vi origin a5 | | Trung bình |
| S512 | Chưa kiểm được | Chưa kiểm được | Cần gửi `postMessage` từ origin khác | | Trung bình |
| S513 | Chưa kiểm được | Chưa kiểm được | [Chờ quyết] Không có địa chỉ production | | Trung bình |
| S514, S515, S516, S517, S520 | Chưa kiểm được | Chưa kiểm được | Không có Lighthouse trong môi trường | | Cao/Trung bình |
| S519 | Chưa kiểm được | Chưa kiểm được | Cần Fast 3G và dung lượng nén | | Trung bình |
| S530 | Chưa kiểm được | Chưa kiểm được | Không có axe (bảng tìm là `listbox` có `option`, menu hồ sơ là `role="dialog"` có `aria-label` đã thấy) | | Cao |
| X505 | Chưa kiểm được | Chưa kiểm được | [Chờ quyết] Cần đổi 12/24 giờ trong Settings (hơn 4 thao tác) | | Thấp |
