# Kết quả kiểm lại A4 (Notifications, Promotions, Documents, Admin Command Center)

Nguồn: `04-ket-qua-A4.md`, tiêu chí `03-tieu-chi-A4-notif-promo-docs-admin.md`. Origin http://a4.localhost:3590, múi giờ trình duyệt America/Los_Angeles (kiểm lúc khoảng 22:50 ngày 14/11 đến 01:10 ngày 15/11 giờ địa phương). Mã nguồn có thể đã đổi trong lúc kiểm: ghi hành vi thấy gần nhất. Dòng gắn [Chờ quyết] chỉ ghi hành vi hiện tại.

## Tổng hợp

### Phần A: kiểm lại 50 dòng (17 Không đạt + 33 Chưa kiểm được ở lần đo trước)

| Chỉ số | Số dòng |
|---|---|
| Chuyển sang Đạt | 41 (14 từ Không đạt, 27 từ Chưa kiểm được) |
| Còn Không đạt | 3 cũ (D423, S409, S426) |
| Chuyển từ Chưa kiểm được sang Không đạt (lỗi mới thấy) | 3 (S415, S417, S422) |
| Chờ quyết (chỉ ghi hành vi) | 2 (D415, S423) |
| Còn Chưa kiểm được | 1 (S421) |

Tổng Không đạt sau phần A: 6 (D423, S409, S415, S417, S422, S426).

### Phần C: hồi quy 67 dòng (đã tính D408 và D409 là 2 dòng) đang Đạt ở lần đo trước

Đạt: 67. Không đạt: 0. Hồi quy mới: 0. (Các lỗi mới thấy ở phần A là lỗi cũ chưa từng đo được, không phải hồi quy; xem "Phát hiện mới" cuối tệp.)

### Số liệu toàn bộ 215 tiêu chí (dòng không kiểm lại giữ kết quả lần trước)

| Chỉ số | Giá trị |
|---|---|
| Đạt | 206 (165 cũ + 41 chuyển sang) |
| Không đạt | 6 |
| Chờ quyết | 2 |
| Chưa kiểm được | 1 |
| % Đạt = Đạt ÷ (Tổng − Chưa kiểm được) | 206 ÷ 214 = 96,3% |

Ghi chú phương pháp: bằng chứng là giá trị đọc từ DOM/localStorage hoặc hành vi thấy sau thao tác thật. Phím thật (Enter, Space, Tab, Esc, Home/End, mũi tên, `/`) gửi qua công cụ trình duyệt; vị trí focus ban đầu có lúc đặt bằng script. Đồng hồ giả (ghi đè Date của iframe), sửa localStorage, hiển thị trang trong iframe sandbox không script (kiểm U407), stub matchMedia (kiểm reduced-motion) đã được dùng chỗ ghi rõ. Dữ liệu dựng bằng sửa eso-msg-v1, eso-feed, eso-pmc-saved, eso-docs:client.

## Bảng chi tiết phần A (50 dòng cũ Không đạt / Chưa kiểm được)

| ID | Kết quả mới | Kết quả cũ | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| F406 | Đạt | Không đạt | res-1 gửi 2 tin vào chat c47; stf-1 bấm mục "Alex Rivera sent 2 messages" trong chuông: URL `/staff/messages.html?as=stf-1#/c/c47`, iframe Messages mở `#/c/c47` đúng thread | | Cao |
| F407 | Đạt | Không đạt | href mục Community là `/staff/social.html?as=stf-1#/post/p1`; bấm: mở trang bài p1 (dialog 1, có chữ "Is the surface lot gated during cleaning?") | | Cao |
| F408 | Đạt | Không đạt | Sau bấm mục chuông, mọi tin của c47 có readBy stf-1 (m48..m54), eso-notif-read:stf-1 = {"msg-c47-m54":true} | | Cao |
| F411 | Đạt | Chưa kiểm được | Client: chuông 5 chưa đọc -> bảng 4 dòng; 4 -> 4 dòng; 1 -> 1 dòng | | Thấp |
| F430 | Đạt | Chưa kiểm được | Staff: 16 chat chưa đọc (13 nhân bản + 3) -> đúng 12 mục tin nhắn (lọc Messages, bấm Show more hết); chat im lặng 5 ngày đã đọc (c299) không có. Social: 12 hoạt động trong 7 ngày -> đúng 8 mục Community. (Dữ liệu dựng bằng sửa eso-msg-v1 và eso-feed) | | Trung bình |
| F442 | Đạt | Không đạt | Staff: Create promotion -> Publish (id 725606211). View deal -> Edit: ô Category disabled, title="Category can’t change after publishing", nút "Update & publish". Đổi Title -> eso-pmc-saved vẫn 1 bản ghi cùng id, title mới; Resident thấy "RT Alpha Promo EDITED" | Chú thích Category nằm ở thuộc tính title (tooltip), không phải chữ hiện sẵn | Cao |
| F443 | Đạt | Chưa kiểm được | Staff Settings > Workspace > "Resident promotions" (nút trong danh sách, #/workspace/residentpromos) có 2 công tắc. Tắt Show: eso-proto.promoShow=false, Resident "Promotions are off". Bật Show + tắt Save: Resident 6 thẻ, 0 ngôi sao, chip Saved biến mất. Xóa eso-proto: hiện lại 6 thẻ + sao + Saved | | Cao |
| F446 | Đạt | Chưa kiểm được | Đồng hồ giả (Date của iframe = 15/11 00:05) + sự kiện visibilitychange: promotion Start 15/11 từ ẩn thành hiện, "7 of 7 promotions" sau ≤300 ms | Dùng đồng hồ giả, sự kiện tổng hợp | Trung bình |
| F447 | Đạt | Chưa kiểm được | [Chờ quyết cho Garage] res-1 (Building A, pet): thấy BldA + SegPet; res-2 (Building B, movein+ev): BldB + SegEV; res-3 (Building A, members): BldA; promotion "Garage" không ai thấy; thẻ có nhãn "Building A", "Pet owners", "EV drivers" | | Cao |
| F450 | Đạt | Chưa kiểm được | Nhãn "20% off", "$25 off", "Free", "Buy one, get one"; badge Claimed (tone success), Fully claimed (tone danger), "Building A"/"Pet owners" (tone warning), "Ends Nov 19, 2026" | | Trung bình |
| F454 | Đạt | Chưa kiểm được | [Chờ quyết: chỉ mã chữ] Claim promotion QR: nhãn "Show this code at the partner", mã "QRCODE9" đúng mã Staff nhập; không thấy hình QR rõ ràng | Hành vi hiện tại: chỉ mã chữ | Trung bình |
| F462 | Đạt | Chưa kiểm được | Tab: All 8 (gồm hàng W-9), Contracts 2, Insurance 1, Policies 1, Templates 2, Maps 1, Tax 1, Other 0. Phím thật: ArrowRight x2 All->Insurance, End -> Other, Home -> All, focus theo | | Trung bình |
| F464 | Đạt | Không đạt | Giờ địa phương 14/11: hết hạn 13/11 "Expired 1 day ago", 14/11 "Expires today", 15/11 "Expires in 1 day", +30 "Expires in 30 days", +31 không nhãn soon. Upload với Expires 14/11: hàng "Expires today" | | Cao |
| F478 | Đạt | Không đạt | Gửi khóa, sửa docs-secret:pending.expiresAt về quá khứ, nhập khóa đúng: "That key has expired. Send a new key."; nút Send key disabled "New key in 4:55" | | Cao |
| F480 | Đạt | Chưa kiểm được | Mở khóa ("Locks again in 4:49"); đồng hồ giả +301 s: hàng về "Locked", toast "W-9 locked", không tải lại. Lock now và tải lại khóa lại: đã thấy ở lần đo cũ | Dùng đồng hồ giả | Cao |
| D414 | Đạt | Chưa kiểm được | Resident res-1 chấp nhận guidelines, Community có 6 mục chưa đọc. Bấm 1 mục trong chuông Social: eso-res-social-seen:res-1 = {"r-p1-r3":true}; Notifications Resident: mục soc-r-p1-r3 thành đã đọc, 5 mục còn lại chưa đọc. Staff: đánh dấu mục Community ghi vào eso-notif-read:stf-1 ({"soc-r-p1-r3":true}), không dùng khóa seen | Mở trang Social một mình không ghi "seen"; chỉ khi bấm mục ở chuông Social | Trung bình |
| D415 | Chờ quyết | Chưa kiểm được | Sau Reset demo data (2 lần bấm xác nhận) và xóa eso-notif-read:*: Admin All 10 (5 chưa đọc), Staff 24 (9), Resident 38 (26), Client 117 (95). Chuẩn 7/18/36/114 chưa chốt; khác biệt là các mục live từ chat mẫu. Chưa thử "Start empty" | Hành vi hiện tại | Thấp |
| D423 | Không đạt | Không đạt | Staff-published promotion limT=3, mỗi người 2: res-1 claim 2, res-2 claim 1 (Resident "Fully claimed"). Staff /staff/promotions.html: thẻ vẫn "3 left · 0/3", "0 claimed", tab Claims 8, Sold out 1 không đổi. Nguyên nhân: Staff dựng id "parking6" cho bản ghi (trường pmc="901"), hàm fromResidents tra claim theo id "parking6" trong khi Resident lưu theo id gốc | Staff đăng promotion, 2 Resident claim, mở Staff: số vẫn 0 | Cao |
| D425 | Đạt | Chưa kiểm được | Claim Unique (RTP-ASDVS), đổi prefix ở Staff thành zzz, tải lại: dialog vẫn RTP-ASDVS, khớp eso-res-promo:res-1 | | Trung bình |
| D426 | Đạt | Chưa kiểm được | Xóa eso-proto: promotion hiện và có sao; công tắc Staff ghi promoShow/promoSave (xem F443) | | Trung bình |
| D427 | Đạt | Không đạt | Upload "Retest.PDF" 2048 byte: name "Retest.pdf", updated "2026-11-14" (ngày địa phương), size 2048, expires 2026-11-14 | | Cao |
| D429 | Đạt | Không đạt | eso-docs:client = `[null,{"id":"x"},5,"a"]` và `[null]`: trang mở 7 tài liệu mẫu, 0 lỗi console | | Cao |
| D440 | Đạt | Không đạt | eso-msg-v1 = `{}` và `not json`: dashboard Admin hiển thị bình thường (tự nạp lại dữ liệu mẫu, "1 ticket has no owner yet"), 0 lỗi console | Dữ liệu cũ bị thay bằng mẫu | Cao |
| D442 | Đạt | Chưa kiểm được | Admin adm-1: trước 5 chuông/5 Unread trang/2 cuộc chat ở thẻ; thêm 3 ticket: chuông 8, trang Unread 8, thẻ "In 5 conversations" (10 tin). Đọc 1 chat ở Messages: chuông 7, thẻ 4 cuộc chat (8 tin) | Ticket dựng bằng nhân bản dữ liệu c29 | Cao |
| U403 | Đạt | Chưa kiểm được | Tin 300 ký tự liền: ở 375 trang không cuộn ngang (363=363), bảng chuông cắt gọn (text-overflow clip, phải 347), "View all" thấy được | | Trung bình |
| U404 | Đạt | Không đạt | 375 cảm ứng: mọi 38 điều khiển tương tác trong trang >=44x44, gồm chip "Category: Violations" 147x44 và Undo 44x44 | | Cao |
| U407 | Đạt | Chưa kiểm được | Hiển thị trang trong iframe sandbox không script: cả 4 portal chỉ có "Notifications need JavaScript. Turn it on in your browser settings and reload this page.", 0 dòng | | Thấp |
| U411 | Đạt | Không đạt | 375: Title 100 ký tự liền, partner 120, short 80: thẻ rộng 331 (<=369), chữ trong khung; partner 5000 ký tự cắt còn 120. Hộp chi tiết dạng sheet cuộn, Close 44x44 ở trên, Claim 44 cao tới được khi cuộn | Chi tiết nhỏ: dòng partner 120 ký tự liền trong hộp chi tiết tràn ngang (cuộn ngang trong hộp) | Trung bình |
| U413 | Đạt | Chưa kiểm được | Thẻ không ảnh: khung biểu tượng tag, img ẩn; nút disabled "Fully claimed" (tương phản 6,23) và "Claimed" đọc được | | Thấp |
| U414 | Đạt | Chưa kiểm được | Sáng: info 5,23, success 4,89, danger 4,55, warning 4,57, neutral 16,4, chip lọc 13,9+, "Ends" 5,56; tối: tối thiểu 6,94; mã 14,3 | | Cao |
| U416 | Đạt | Không đạt | 375 cảm ứng Documents: Filters 44x44, hai nút Dismiss 44x44, 30 điều khiển đều >=44 (trừ liên kết skip 1x1 ẩn) | | Cao |
| U425 | Đạt | Không đạt | Admin Notifications 375: Filters 44x44, search 255x44, tab 44, Mark all 140x44, nút đọc 44x44, không cuộn ngang. 768: không cuộn ngang, 3 category, ô Property rộng 0 | Chưa đo ở 1440 | Trung bình |
| X409 | Đạt | Chưa kiểm được | Phím thật: Enter trên sao -> lưu, focus giữ ở sao (đã dựng lại, nhãn "Remove from saved"); Enter mở hộp, Esc đóng, focus về nút mở | | Trung bình |
| X411 | Đạt | Chưa kiểm được | Phím thật Enter ở nút Add document: không file -> focus #u-file (aria-invalid true, "Choose a file to upload."); tên 121 -> focus #u-name | | Trung bình |
| X412 | Đạt | Chưa kiểm được | Enter trên Remove: bản ghi giảm, focus về main-content, toast có Undo; Tab 21 lần tới Undo, Enter khôi phục | | Trung bình |
| X416 | Đạt | Chưa kiểm được | Hai hộp (i): "10 GB is included... Add 20 GB for $15.00/mo in Capacity", Capacity ghi "+$15.00/mo per 20 GB", "Using 9.4 GB of 10 GB" | Đóng bằng Esc thật chưa thử riêng ở hộp (i) (đóng bằng script) | Thấp |
| S409 | Không đạt | Không đạt | Tên 120 ký tự "NNN..." (không đuôi): hợp lệ nhưng bản ghi lưu 124 ký tự; 121: bị chặn; 116 + ".pdf" lưu 120 | Upload file pdf với tên 120 ký tự: eso-docs:client name dài 124 | Cao |
| S410 | Đạt | Không đạt | Form Staff: pf-title 100, pf-reward 80, pf-desc 500, pf-terms 1000, pf-partner 120 (mới), pf-code 30 (mới), pf-prefix 8; pf-link (url) và pf-oval (giá trị ưu đãi) KHÔNG có maxlength. Bản ghi 5000 ký tự ở partner/code/alt/link: thẻ Resident ở 375 rộng 331, partner cắt còn 120, nạp 46 ms, không cuộn ngang | Lỗi nhỏ mới (xem N1): pf-oval 5000 ký tự -> nhãn ưu đãi rộng 37.254 px, bị cắt trong thẻ; Alt text chưa kiểm ở form | Cao |
| S412 | Đạt | Chưa kiểm được | Phím thật: Enter ở chuông -> focus vào dòng đầu; Tab đi qua 4 dòng rồi "Notification settings" ("View all" nằm trước các dòng, tới được bằng Shift+Tab); Esc đóng, focus về nút chuông | Thứ tự: View all đứng trước dòng | Cao |
| S413 | Đạt | Chưa kiểm được | Phím thật trên /client/notifications.html: `/` focus Search, gõ chữ, Esc xóa, Tab tới Filters, Enter mở (focus vào Category), Tab/ArrowDown đổi bộ lọc, Esc đóng và focus về Filters, ←/→ đổi tab, Space đánh dấu đọc, Enter "Mark all" (focus về tab đang chọn, toast), Tab tới Undo (là phần tử cuối) + Enter hoàn tác, Enter "Show 25 more" (50 dòng, focus vào dòng mới #26), có "Skip to main content" | Undo nằm cuối DOM nên tới Undo bằng Tab phải qua mọi dòng | Cao |
| S414 | Đạt | Chưa kiểm được | Phím thật: gõ tìm "BldA" (1 of 8), Enter mở hộp, Space Claim (count 1, toast), Tab trong hộp ở lại trong hộp, Esc đóng và focus về thẻ; sao lưu bằng Enter | Vị trí focus ban đầu đặt bằng script chứ không Tab từ đầu trang | Cao |
| S415 | Không đạt | Chưa kiểm được | Upload dialog (8 điều khiển): Tab ở "Add document" đi tiếp ra trang cha (Skip to main content), không bẫy focus; khi focus ở trang cha Esc không đóng hộp (hộp mở). Enter/Space Remove/Undo/lỗi focus đạt | Mở Upload document, Tab liên tiếp 10 lần: focus rời hộp sang trang cha (hộp nằm trong iframe) | Cao |
| S416 | Đạt | Chưa kiểm được | Tab theo thứ tự đọc (vị trí dọc không giảm): nút, 2 nút Open, 4 thẻ, 2 dòng queue, All tickets, 2 dòng tin, All messages, Show all 8. Enter ở "Platform alerts": focus vào #adm-health-h, cuộn tới. Giả lập prefers-reduced-motion (stub matchMedia): scrollIntoView gọi với behavior "auto" | Reduced-motion kiểm bằng stub, không bằng cài đặt hệ điều hành | Trung bình |
| S417 | Không đạt | Chưa kiểm được | Admin dashboard, Documents, Notifications Client, Resident Promotions (nút, chip, sao): vòng focus 3 px màu xanh đậm (oklch 0.5461 0.2152 262.9) trên nền sáng, đạt. Riêng nút tiêu đề thẻ Promotion (Resident): chính nút không có vòng, chỉ viền thẻ 3 px ở độ trong suốt 50%: đo canvas 2,14:1 trên nền trắng (2,07:1 trên nền xám) < 3:1 | Resident /promotions.html, Tab tới tiêu đề thẻ: ring thẻ nhạt ~2,1:1 (chỉ đo giao diện sáng; chưa đo tối cho Notifications/Promotions) | Cao |
| S421 | Chưa kiểm được | Chưa kiểm được | Không chèn được 1.000 thông báo vào buildAll mà không sửa mã; mục live bị giới hạn 12+8 | | Trung bình |
| S422 | Không đạt | Chưa kiểm được | 1.008 promotion: mở 0,8 s, tìm kiếm 11 ms, chip 180 ms, mở hộp 175 ms, nhưng bấm Claim vẽ lại 874 ms (>300) | Chèn 1000 bản ghi vào eso-pmc-saved, Resident bấm Claim: 0,87 s | Trung bình |
| S423 | Chờ quyết | Chưa kiểm được | [Chờ quyết: không phân trang] 1.000 tài liệu: mở 0,8 s, tìm 26 ms, đổi tab 163 ms, xóa 925 ms, upload 1,1 s; số tab đúng (All 1000, mỗi loại 143) | Hành vi hiện tại | Trung bình |
| S426 | Không đạt | Không đạt | Sau mở khóa thành công: #unlock-demo rỗng, khóa không còn trong DOM (đạt). Nhưng Gửi khóa rồi Cancel: #unlock-demo (ẩn) vẫn chứa "Your key is SA6A-..." | Send key, bấm Cancel, đọc #unlock-demo.textContent | Trung bình |
| X410 | Đạt | Chưa kiểm được | Resident: chọn chip Pets (1 thẻ), lưu thẻ: chip Pets vẫn chọn, số "1 of 10"; Staff đổi thẻ Pets cuối về draft + visibilitychange: chip Pets biến mất, về "9 of 9 promotions" (All) | Đồng bộ dùng sự kiện visibilitychange tổng hợp | Thấp |
| U422 | Đạt | Chưa kiểm được | Emergency: banner đỏ (nền/chữ oklch hue 30), thẻ Emergencies danger; chưa có chủ: thẻ Open tickets warning (hue 64); tất cả có chủ: info (hue 258), tóm tắt "2 open tickets, all with an owner"; hàng đợi trống: Open tickets và Emergencies success (hue 155), "The Support queue is clear". Tương phản thấp nhất: sáng 4,55, tối 6,37 | Trạng thái dựng bằng sửa eso-msg-v1 | Cao |

## Bảng chi tiết phần C (hồi quy các dòng cũ đang Đạt)

| ID | Kết quả mới | Kết quả cũ | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| F401 | Đạt | Đạt | Client: chuông 93 = tab Unread 93 = "93 need attention"; aria-label "Open notifications. 93 need attention."; h1 "Notifications" | | Cao |
| F404 | Đạt | Đạt | Bấm tiêu đề mục "Parking Spots near limit" (n-plan-0): URL /client/workspace.html?as=cli-1, mục đã đọc, chuông 93 -> 92 | Bấm ở trang Notifications (không ở bảng chuông) | Cao |
| F410 | Đạt | Đạt | 99 chưa đọc: badge "99"; 100: badge "99+", aria-label "100 need attention" | | Trung bình |
| F413 | Đạt | Đạt | `guest pass`, `GUEST PASS`, `pass guest` đều 8 kết quả; `guest zzzz` và `zzzz` 0 | | Cao |
| F414 | Đạt | Đạt | `zzzz`: "No notifications match" + nút Clear filters | | Trung bình |
| F415 | Đạt | Đạt | Client: ô Category có 9 tùy chọn (All + 8) | | Cao |
| F416 | Đạt | Đạt | Category Violations: 25 dòng, chip "Category: Violations", nút "Filters, 1 in use" | | Cao |
| F418 | Đạt | Đạt | Unread first: nhóm "Unread 20", "Read 5"; Oldest first: thời gian tăng dần | | Cao |
| F420 | Đạt | Đạt | Bấm chip Category: chỉ chip đó biến mất, Category về all, các tab giữ số | | Trung bình |
| F422 | Đạt | Đạt | 25 dòng, "Showing 25 of 117", nút "Show 25 more (25 of 117)"; Enter ở nút: 50 dòng, focus vào dòng #26 | | Cao |
| F424 | Đạt | Đạt | Bấm nút tròn: toast "Marked as read Undo", aria-pressed true, Unread 93->92, chuông 92; bấm lại: "Marked as unread", 93 | | Cao |
| F425 | Đạt | Đạt | Không lọc: "Mark all as read"; lọc Violations: "Mark 20 as read" | | Cao |
| F426 | Đạt | Đạt | "Mark all": toast "93 marked as read Undo", chuông "all caught up"; Undo: Unread 93, chuông 93 | | Cao |
| D401 | Đạt | Đạt | eso-notif-read:cli-1 là object {id: boolean} | | Cao |
| D403 | Đạt | Đạt | `{{not json`: trang All 117/Unread 93/Read 24, không mất khóa khác | | Cao |
| D404 | Đạt | Đạt | `[]`, `null`, `5`, `"x"`, `{"n-requests-0":"yes"}`: đều All 117/Unread 93 | | Trung bình |
| D405 | Đạt | Đạt | Thêm `{"n-zzz-9":true}`: Unread vẫn 93 | | Thấp |
| D407 | Đạt | Đạt | Mark all rồi Undo: tab/chuông về 93, giá trị trong khóa đều boolean | | Cao |
| D408 / D409 | Đạt | Đạt | Staff: mở chat c8 ở Messages: huy hiệu Messages ở sidebar 4 -> 3 và chuông 9 -> 8 cùng giảm, mọi tin c8 có readBy stf-1 (huy hiệu sidebar mới hoạt động) | | Cao |
| F460 | Đạt | Đạt | 7 tài liệu mẫu theo thứ tự Towing, Certificate of insurance, Resident welcome letter, Parking rules, Violation notice template, EasySpotOps service agreement, Fire lane map | | Cao |
| F461 | Đạt | Đạt | `cert` 1, `CERT` 1, `CONTRACTS` 2, `riverbend` 3, `whole team` 6, `zzzz` 0 + "No documents match"; số trên tab đổi theo search | | Cao |
| F465 | Đạt | Đạt | Bấm X: khóa eso-docs-dismissed:client = {"expired":1,"soon":0}, thanh ẩn | | Trung bình |
| F467 | Đạt | Đạt | Từ chối a.exe, a.pdf.exe, a, a.txt với đúng câu lỗi; nhận A.PDF, a.jpeg, a.xlsx | | Cao |
| F468 | Đạt | Đạt | 10.485.760 byte nhận; 10.485.761 byte "That file is over 10 MB. Choose a smaller one." | | Cao |
| F469 | Đạt | Đạt | Tên dấu cách "Give the document a name."; 121 ký tự "Use 120 characters or fewer."; `report.pdf` lưu "report.pdf" | | Cao |
| F472 | Đạt | Đạt | Remove: toast "Removed report.pdf Undo", Undo trả cùng thứ tự id; xóa rồi chờ 8 s: Undo biến mất, bản ghi vẫn mất | | Cao |
| D428 | Đạt | Đạt | Danh sách id sau Undo giống hệt trước | | Cao |
| F474 | Đạt | Đạt | Hộp W-9: trống -> "Choose the signed W-9." + phân loại + ngày; .docx "Use a pdf, png, jpg, jpeg file."; 11 MB lỗi 10 MB; tên 121 "Use 120 characters or fewer."; ngày ký tương lai "The signing date cannot be in the future."; tên rỗng "Enter the business name exactly as it is on the form." | Ô tên được điền sẵn "AMC LLC" nên lỗi trống chỉ thấy khi xóa tay | Cao |
| F475 | Đạt | Đạt | Thêm W-9: toast "W-9 added and locked", 1 hàng, nhãn "Review" + "Locked", không có Remove; Replace: "W-9 replaced and locked", vẫn 1 hàng | | Cao |
| F476 | Đạt | Đạt | Send key: khóa 4 nhóm 4 ký tự (không có 0,1,O,I,L); nhập: toast "W-9 unlocked for 5 minutes", "Locks again in 5:00" | | Nghiêm trọng |
| F477 | Đạt | Đạt | Sai: "4 tries left", "3 tries left" (tải lại), "2", "1 try left", lần 5 "Too many tries. That key is dead. A new one can be made in 4:43."; tries lưu 5 | | Nghiêm trọng |
| F479 | Đạt | Đạt | Khóa viết thường có dấu cách mở được; 15 ký tự "Enter all 16 characters of the key."; dùng lại khóa đã dùng: "No key is active. A new one can be made in 4:49." | | Cao |
| D431 | Đạt | Đạt | docs-secret:pending có đúng digest, via, madeAt, expiresAt, tries; không khóa 16 ký tự trong localStorage/sessionStorage/cookie/URL | | Nghiêm trọng |
| S425 | Đạt | Đạt | Tìm khóa (hoa/thường, có/không gạch) trong localStorage, sessionStorage, cookie, URL: 0 kết quả | Không kiểm lại IndexedDB, mạng | Nghiêm trọng |
| S427 | Đạt | Đạt | 2 lần sai, tải lại, 3 lần sai: lần 5 là "dead"; tries không reset sau tải lại | | Cao |
| S403 | Đạt | Đạt | Search, tên upload, tên W-9 = `<img src=x onerror=alert(1)>`: 0 alert, 0 img[src=x]; toast "Added <img src=x onerror=alert(1)>.pdf" và aria-label hiện nguyên chữ | | Nghiêm trọng |
| F481 | Đạt | Đạt | Tiêu đề: "1 emergency needs an answer"; "7 tickets have no owner yet"/"1 ticket has no owner yet"; "2 open tickets, all with an owner"; "The Support queue is clear" | | Cao |
| F482 | Đạt | Đạt | Bốn thẻ: "Open tickets 8 / 7 without an owner · oldest 30 h"; "Unread messages 10 / In 5 conversations" (đã đổi sau thao tác); "Emergencies 0 / None open"; "Platform alerts 32 / 0 critical · 32 warnings" | | Cao |
| F483 | Đạt | Đạt | Thẻ Open tickets -> /admin/tickets.html?as=adm-1; Unread messages, Emergencies -> /admin/messages.html?as=adm-1; Platform alerts -> #adm-health-h (Enter focus tiêu đề); hai nút Open Ticket box/Open Messages đúng | | Cao |
| F484 | Đạt | Đạt | Queue: High 5 h, High 2 h, rồi Normal 10 h, 2 h, 1 h, 2 min; Low 30 h không vào 6 dòng | | Cao |
| F485 | Đạt | Đạt | 8 ticket mở: "Showing 6 of 8 open, most urgent first"; mỗi dòng có số, chủ đề, người gửi + vai, mức, giai đoạn, "Unassigned", thời gian chờ; href #/t/<id> | | Cao |
| F487 | Đạt | Đạt | Dòng phụ "7 from Clients · 1 from Staff · 1 resolved this week" khớp 8 mở (7 Client, 1 Staff) | | Trung bình |
| F489 | Đạt | Đạt | Chat resident_support c8 có emergency chưa ack: dashboard Admin không banner, thẻ Emergencies 0 "None open", không tên Resident ở "Unread messages" | | Nghiêm trọng |
| F491 | Đạt | Đạt | 7 ô: Client accounts 2, Properties 2, People 43, Active spaces 261, Open requests 0, Billing issues 0, Monthly revenue $19; nhãn Sample data | | Thấp |
| F492 | Đạt | Đạt | Health 4 mục (Morgan Ellis, Priya Nair, Casey Nguyen, Alex Rivera), "Show all 8" -> 8 mục "Show fewer" (aria-expanded true) -> 4; không còn "User 1" | | Trung bình |
| F493 | Đạt | Đạt | 6 dòng "User login user@example.com" Nov 8/9, nhãn Sample data | | Thấp |
| X418 | Đạt | Đạt | "Live" ở Support queue và Unread messages; "Sample data" ở 3 phần còn lại | | Thấp |
| D439 | Đạt | Đạt | Thẻ Open tickets 8 = Ticket box "Open 8" ở /admin/tickets.html | | Nghiêm trọng |
| S429 | Đạt | Đạt | Xem F489: không chat resident_support nào ở dashboard Admin | | Nghiêm trọng |

| F434 | Đạt | Đạt | Resident (iframe ẩn) đang mở; ghi bản ghi mới vào eso-pmc-saved: thẻ "SYNC Promo" hiện sau 51 ms, "12 of 12 promotions", không tải lại | | Nghiêm trọng |
| F435 | Đạt | Đạt | Publish trống: "Still needed to publish: Title, Category, Short description, Detailed description, Offer value, Promo code, End date."; 7 lỗi role=alert; focus #pf-title; 0 bản ghi mới | | Cao |
| F436 | Đạt | Đạt | % off: 0, -5, trống "Enter a percentage, e.g. 20."; 101 "A percentage can’t exceed 100."; $ off: 0 "Enter an amount, e.g. 25.", 25 hợp lệ | | Cao |
| F448 | Đạt | Đạt | `sync`/`SYNC` 1; `rt short`, `rt detailed` 3; `VP` 2; chỉ dấu cách ra tất cả; `zzzz` 0 | | Cao |
| F449 | Đạt | Đạt | Chip "All 12", "Parking 12", "Saved 0" | | Trung bình |
| F453 | Đạt | Đạt | Claim Static: toast "Claimed. Your code is below.", hộp "Your code RTCODE1", nhãn "Claimed". Chưa thử lại Copy | | Cao |
| F457 | Đạt | Đạt | Mỗi resident = 2: hộp ghi "Up to 2 claims per resident.", count 2 rồi nút "Claimed" disabled | | Cao |
| F458 | Đạt | Đạt | Tổng 3 (res-1 claim 2, res-2 claim 1): res-2 nút disabled "Fully claimed", thẻ nhãn Fully claimed (tone danger) | | Cao |
| D419 | Đạt | Đạt | eso-res-promo:res-1 = {"saved":[...],"claims":{id:{count,code,at}}} | | Cao |
| D420 | Đạt | Đạt | eso-pmc-saved = `not json`: "No promotions yet"; mảng [null, {id,st}, title rỗng, bản tốt]: 2 thẻ hiện, thẻ title rỗng hiện "Promotion" | | Cao |
| S404 | Đạt | Đạt | Title/partner/terms/summary là chuỗi XSS: hộp chi tiết và thẻ hiện nguyên chữ, 0 alert, 0 img[src=x] | | Nghiêm trọng |
| S405 | Đạt | Đạt | Gõ hai chuỗi XSS vào ô tìm: 0 alert, 0 img[src=x] (khớp bản ghi có chữ đó nên 1 of 1) | | Nghiêm trọng |
| S428 | Đạt | Đạt | cover=`javascript:alert(1)`, plogo=`file:///x`, link=`javascript:alert(1)`: ảnh ẩn (src null), bấm Get offer không gọi window.open, không alert | | Nghiêm trọng |
| F412 | Đạt | Đạt | 4 portal: h1 "Notifications", summary "N need attention" (Client 92, Staff 14, Resident 31, Admin 11) | | Cao |
| F417 | Đạt | Đạt | Chỉ Client có ô Property hiển thị; chọn Mallard: mọi dòng ghi đúng property | | Trung bình |
| F403 | Đạt | Đạt | Chỉ đọc href: View all `/client/notifications.html?as=cli-1`; settings Client/Staff/Resident `/<portal>/settings/notifications.html?as=`, Admin `/admin/settings.html?as=adm-1#/settings/notifications` (chưa bấm) | | Trung bình |
| U401 | Đạt | Đạt | Client Notifications 375: không cuộn ngang (363/363), nút Filters 44x44 có aria-label "Filters", Show more 169x44, 38 điều khiển đều >=44 | Chưa đo lại 768/1440 | Cao |

## Phát hiện mới và ghi chú ngoài bảng

- N1 (Thấp): Staff form Promotions, ô giá trị ưu đãi `pf-oval` và ô `pf-link` không có maxlength; Resident không cắt `oval`. Bản ghi oval 5000 ký tự: nhãn ưu đãi rộng 37.254 px bị cắt trong thẻ (thẻ vẫn rộng 331 ở 375, trang không cuộn ngang).
- N2 (Thấp, từ U411): hộp chi tiết Promotion ở 375, dòng partner 120 ký tự liền tràn ngang trong hộp (cuộn ngang trong hộp).
- N3 (Trung bình, từ S415): hộp thoại Documents nằm trong iframe nên Tab ở phần tử cuối đi ra trang cha; Esc không đóng khi focus ở trang cha.
- N4 (Trung bình, từ S426): khóa W-9 còn trong `#unlock-demo` (ẩn) sau Cancel; chỉ được xóa khi mở khóa thành công.
- N5 (Cao, từ D423): Staff không thấy claim của Resident cho promotion Staff tự đăng. Staff dựng id "parking<N>" cho bản ghi (có trường pmc = id gốc), hàm cộng claim (`fromResidents` trong account-settings-content.html) tra theo id "parking<N>" nhưng Resident lưu theo id gốc.
- N6 (Trung bình, từ S417): vòng focus của thẻ Promotion khi focus tiêu đề thẻ (ring thẻ 50% trong suốt) chỉ 2,1:1.
- Hiệu năng: 1.000 tài liệu, Remove 0,93 s và Upload 1,1 s; 1.008 promotion, Claim vẽ lại 0,87 s (đều >300 ms).
- Sidebar Messages (Staff): huy hiệu đếm chat chưa đọc và giảm cùng chuông khi đọc chat (đã hoạt động).
- Dữ liệu thử đã xóa: localStorage và sessionStorage của origin a4, viewport desktop, tab đã đóng (xem báo cáo cuối).

