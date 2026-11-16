# Kết quả kiểm lại lượt 3: A4 (Notifications, Promotions, Documents, Admin Command Center)

Ngày 2026-11-15. Người kiểm độc lập, không sửa mã, không commit. Chạy thật trên http://a1.localhost:3590 (origin a1, một tab riêng, đã đóng). Dữ liệu chỉ ở localStorage; đã xóa localStorage và sessionStorage của origin a1, viewport về desktop. Nguồn: `07-ket-qua-lai-A4.md` (lượt 2), `03-tieu-chi-A4-notif-promo-docs-admin.md`, `01-quyet-dinh-chu-du-an.md`. Múi giờ trình duyệt America/Los_Angeles, ngày 15/11 khoảng 15:40–16:00 giờ địa phương. Mã nguồn có thể đang được sửa song song: ghi hành vi thấy gần nhất.

Quy tắc: không có bằng chứng = "Chưa kiểm được". % Đạt = Đạt ÷ (Tổng − Chưa kiểm được).

## Tổng hợp

### Phần A: 7 dòng (D423, S409, S426, S415, S417, S422 Không đạt; S421 Chưa kiểm được)

| Kết quả | Số dòng | ID |
|---|---|---|
| Chuyển sang Đạt | 2 | S409, S417 |
| Còn Không đạt | 4 | D423 (một phần: số đếm đã đúng, danh sách người claim chưa), S415, S422, S426 |
| Còn Chưa kiểm được | 1 | S421 |

### Số liệu toàn bộ 215 tiêu chí (dòng không kiểm lại giữ kết quả lượt 2)

| Chỉ số | Giá trị |
|---|---|
| Đạt | 208 (206 cũ + 2 mới) |
| Không đạt | 4 |
| Chờ quyết | 2 (D415, S423; giữ như lượt 2, chỉ ghi hành vi) |
| Chưa kiểm được | 1 (S421) |
| % Đạt = Đạt ÷ (Tổng − Chưa kiểm được) | 208 ÷ 214 = 97,2% (lượt 2: 96,3%) |

### Phần C: hồi quy

54 dòng đang Đạt ở vùng đã đổi (≥ 40): Đạt 54, Không đạt 0, hồi quy mới 0. Cộng thêm kiểm các thay đổi từ lượt 2 (bảng cuối).

### Không đạt còn lại theo mức độ

| ID | Một dòng | Mức độ |
|---|---|---|
| D423 | Số claim và "Fully claimed · 3/3", Sold out đã cộng đúng; nhưng hộp "Claimed by" liệt kê 3 tên mẫu (Sofia Chen, Tom Ruiz, Leo Kim), không phải Resident thật đã claim; tab Claims vẫn 8, "0 in Claims inbox" | Trung bình (tiêu chí gốc Cao; phần số đếm và tồn kho đã sửa) |
| S415 | Hộp Upload trong khung portal: Tab ở phần tử cuối thoát ra trang cha, không bẫy focus | Cao (tiêu chí gốc Cao) |
| S422 | 1.001 promotion: bấm Claim vẽ lại 442–561 ms (>300); đổi chip 712 ms | Trung bình |
| S426 | Gửi khóa rồi Cancel: khóa vẫn nằm trong `#unlock-demo` (ẩn) | Trung bình |

## Bảng chi tiết phần A

| ID | Kết quả mới | Kết quả cũ | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| D423 | Không đạt (một phần) | Không đạt | Staff `/staff/account-settings-content.html#/promotions`: Create promotion (Title "Recheck Promo A1", limT 3, limR 2, code RECHECK1) > Publish; res-1 bấm Claim: `eso-res-promo:res-1` count 2; res-2 claim: count 1, nút "Fully claimed". Staff: thẻ "Fully claimed · 3/3", "3 claimed", tab Sold out 1 → 2, tồn kho 0 (đã sửa, `tracked()` cộng claim theo id gốc). Nhưng bấm "3 claimed, see who claimed": hộp "3 claimed of 3 · 0 in Claims inbox · 3 earlier (before inbox tracking)" liệt kê Sofia Chen (Unit 5••), Tom Ruiz, Leo Kim (mẫu); tab Claims vẫn 8 | Staff không biết ai thật đã claim (Alex Rivera, Priya Nair không có). Tái hiện: như trên rồi mở "3 claimed, see who claimed" | Trung bình |
| S409 | Đạt | Không đạt | Upload (tên + đuôi ≤120): tên 120 ký tự + file pdf: chặn, "Use 120 characters or fewer, counting the file type."; tên 117: chặn; tên 116 + ".pdf": lưu, `name.length`=120. Hộp W-9: `#w-legalName` maxlength 120; tên 121 ký tự báo "Use 120 characters or fewer." | | |
| S426 | Không đạt | Không đạt | Sau mở khóa thành công: `#unlock-demo` rỗng (đạt), W-9 hiện "Unlocked · Locks again in 4:55". Nhưng Gửi khóa (`#unlock-send`) rồi bấm Cancel (`#unlock-cancel`): hộp đóng, `#unlock-demo` (ẩn) vẫn chứa "Preview only: no email is sent. Your key is FBXB-MFES-DYNJ-E7PU." | Khóa còn trong DOM ẩn sau Cancel. Tái hiện: Unlock to view > Send key > Cancel > đọc `#unlock-demo.textContent` | Trung bình |
| S415 | Không đạt | Không đạt | Trong `/client/documents.html` (iframe): Upload document, Tab thật 11 lần: IF:u-file, u-name, u-category, u-property, u-share, u-expires, upload-cancel, "Add document", sau đó TOP:BUTTON (focus sang nút của trang cha) trong khi hộp vẫn mở. Trên `/client/documents-content.html` đứng riêng (không iframe): focus quay lại u-file sau "Add document", trong hộp (đạt). Enter/Space Remove, Undo, tab ←/→/Home/End (F462) đạt | Tab ra khỏi hộp khi hộp nằm trong khung portal. Tái hiện: /client/documents.html > Upload document > Tab 9 lần | Cao |
| S417 | Đạt | Không đạt | Tab thật trên `/resident/promotions-content.html`: khi focus tiêu đề thẻ "Recheck Promo A1" thẻ (article) có ring `box-shadow` 3 px màu đặc (không còn 50% trong suốt): sáng oklch(0.5461 0.2152 262.88) trên nền trắng, đo ≈ 5:1; tối oklch(0.6729 0.1724 270.54) trên nền oklch(0.205 0 0) = 5,87:1. Search, chip All/Parking/Saved đều có ring 3 px | Lưu ý: nút ngôi sao "Save" khi focus chỉ có ring của cả thẻ (nút không có ring riêng). Chấp nhận (vẫn thấy focus). Admin dashboard, Documents, Notifications Client không đo lại lượt này (đạt ở lượt 2) | |
| S422 | Không đạt | Không đạt | 1.001 bản ghi trong `eso-pmc-saved` (Resident res-1, tab hiển thị): mở 2,5 s, tìm kiếm 61 ms (đã lọc), nhưng bấm Claim khi hiện cả 1.001 thẻ: 442 ms (chặn 432 ms) rồi 561 ms (chặn 551 ms); đổi chip Parking 712 ms (>300). Lượt 2: Claim 874 ms | Mỗi lần vẽ lại >300 ms. Tái hiện: chèn 1000 bản ghi vào `eso-pmc-saved`, Resident mở một thẻ, Claim | Trung bình |
| S421 | Chưa kiểm được | Chưa kiểm được | Không chèn được 1.000 thông báo vào `buildAll` mà không sửa mã (mục live giới hạn 12+8, mẫu ≤117) | | |

## Bảng hồi quy phần C (54 dòng Đạt ở vùng đã đổi)

Cách kiểm: đọc giá trị DOM/localStorage, phím thật cho thao tác focus, chạy trong trang nội dung (`*-content.html`) hoặc iframe ẩn cùng origin để đọc kết quả sau tải lại.

| ID | Kết quả mới | Kết quả cũ | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| F401 | Đạt | Đạt | Client Notifications: tab Unread 95 = "95 need attention" | | |
| F413 | Đạt | Đạt | `guest pass`, `GUEST PASS`, `pass guest` đều 8; `guest zzzz`, `zzzz` 0 | | |
| F414 | Đạt | Đạt | `zzzz`: "No notifications match" + nút Clear filters | | |
| F415 | Đạt | Đạt | Ô Category có 9 tùy chọn (All + 8), gồm "Capacity & plan" | | |
| F416 | Đạt | Đạt | Category Violations: 25 dòng, chip "Category: Violations", nút "Filters, 1 in use" | | |
| F418 | Đạt | Đạt | Unread first: nhóm "Unread 25..." | | |
| F420 | Đạt | Đạt | Bấm chip: Category về all, chip biến mất, tab All 117 | | |
| F422 | Đạt | Đạt | 25 dòng → "Show 25 more" → 50 dòng, "Showing 50 of 117" | | |
| F424 | Đạt | Đạt | Nút đọc từng dòng: Unread 95 → 94, toast "Marked as read Undo" | | |
| F425 | Đạt | Đạt | Lọc Violations: "Mark 20 as read" | | |
| F426 | Đạt | Đạt | Mark all: Unread 0, toast "94 marked as read Undo"; Undo: 94 | | |
| D401 | Đạt | Đạt | `eso-notif-read:cli-1` là object | | |
| D407 | Đạt | Đạt | Mọi giá trị trong khóa là boolean sau Mark all/Undo | | |
| D403 | Đạt | Đạt | `{{not json` → All 117/Unread 95/Read 22 | | |
| D404 | Đạt | Đạt | `[]`, `null`, `5`, `"x"`, `{"n-requests-0":"yes"}`: đều 117/95/22 | | |
| D405 | Đạt | Đạt | Thêm `{"n-zzz-9":true}`: vẫn 95 | | |
| F460 | Đạt | Đạt | 7 tài liệu mẫu theo thứ tự Towing, Certificate of insurance, Resident welcome letter, Parking rules, Violation notice template, EasySpotOps service agreement, Fire lane map; tab All7/Contracts2/Insurance1/Policies1/Templates2/Maps1/Tax0/Other0 | | |
| F461 | Đạt | Đạt | `cert` 1, `CERT` 1, `CONTRACTS` 2, `riverbend` 3, `whole team` 6, `zzzz` 0 | | |
| F462 | Đạt | Đạt | Phím thật: ArrowRight ×2 All→Insurance, End → Other, Home → All, focus theo | | |
| F464 | Đạt | Đạt | Nhãn "Expired 5 days ago", "Expires today", "Expires in 21 days" | | |
| F465 | Đạt | Đạt | Dismiss expired: `eso-docs-dismissed:client` = {"expired":1,"soon":0} | | |
| F467 | Đạt | Đạt | Từ chối a.exe, a.pdf.exe, a, a.txt với đúng câu "That file type is not accepted. Use pdf, doc, docx, xls, xlsx, png, jpg, jpeg." | | |
| F468 | Đạt | Đạt | 10.485.760 byte nhận; 10.485.761 byte "That file is over 10 MB. Choose a smaller one." | | |
| F469 | Đạt | Đạt | Tên dấu cách "Give the document a name."; 121 ký tự "Use 120 characters or fewer."; `report.pdf` lưu "report.pdf" | | |
| D427 | Đạt | Đạt | Upload "Retest.PDF" 2048 byte: name "Retest.pdf", updated 2026-11-15 (ngày địa phương), size 2048, expires 2026-11-15 | | |
| F472 | Đạt | Đạt | Remove: toast "Removed report.pdf Undo"; Undo trả cùng thứ tự id; xóa rồi chờ 8,5 s: Undo biến mất, bản ghi vẫn mất | | |
| D428 | Đạt | Đạt | Danh sách id sau Undo giống hệt trước | | |
| F474 | Đạt | Đạt | Hộp W-9: trống "Choose the signed W-9."; .docx "Use a pdf, png, jpg, jpeg file."; 11 MB lỗi 10 MB; tên 121 "Use 120 characters or fewer."; ngày tương lai "The signing date cannot be in the future."; tên rỗng "Enter the business name exactly as it is on the form." | | |
| F475 | Đạt | Đạt | Sau Save W-9: hàng "Business W-9" nhãn "Review", "Locked", không nút Remove | | |
| F476 | Đạt | Đạt | Send key: khóa 4 nhóm 4 ký tự không có 0,1,O,I,L; nhập (viết thường, dấu cách): W-9 "Unlocked", "Locks again in 4:55"; `docs-secret:pending` về null | | |
| F477 | Đạt | Đạt | Sai: "4 tries left", "3", "2", "1 try left", lần 5 "Too many tries. That key is dead. A new one can be made in 4:42."; tries lưu 5 | | |
| F478 | Đạt | Đạt | Sửa `docs-secret:pending.expiresAt` về quá khứ, nhập khóa đúng: "That key has expired. Send a new key."; nút Send key disabled "New key in 5:00" | | |
| F479 | Đạt | Đạt | Khóa viết thường có dấu cách mở được; 15 ký tự (khi có khóa): "Enter all 16 characters of the key."; khi không còn khóa: "No key is active. A new one can be made in 4:47." | | |
| D431 | Đạt | Đạt | `docs-secret:pending` có digest, via, madeAt, expiresAt, tries; không khóa 16 ký tự trong localStorage/sessionStorage/cookie/URL | | |
| S425 | Đạt | Đạt | Tìm khóa (hoa/thường, có/không gạch) trong localStorage, sessionStorage, cookie, URL: 0 | | |
| S427 | Đạt | Đạt | 2 lần sai, tải lại, 3 lần sai: lần 5 là "dead"; tries 5 (không reset sau tải lại) | | |
| S403 | Đạt | Đạt | Tên upload `<img src=x onerror=alert(1)>`: 0 alert, 0 `img[src=x]`; hiện nguyên chữ | | |
| D429 | Đạt | Đạt | `eso-docs:client` = `[null,{"id":"x"},5,"a"]`, `[null]`, `not json`: trang mở 7 tài liệu mẫu | | |
| F481 | Đạt | Đạt | Admin: tiêu đề "1 ticket has no owner yet · Sunday, November 15" | | |
| F482 | Đạt | Đạt | Bốn thẻ: "Open tickets 2 / 1 without an owner · oldest 5 h"; "Unread messages 4 / In 2 conversations"; "Emergencies 0 / None open"; "Platform alerts 32 / 0 critical · 32 warnings" | | |
| F483 | Đạt | Đạt | Open tickets → /admin/tickets.html?as=adm-1; Unread messages, Emergencies → /admin/messages.html?as=adm-1; hai nút Open Ticket box/Open Messages đúng | | |
| F485 | Đạt | Đạt | Dòng queue: "T-1083 Cannot export March occupancy report Marcus Cole · Client Open Unassigned 35 min" | | |
| F487 | Đạt | Đạt | "1 from Clients · 1 from Staff · 1 resolved this week" khớp | | |
| F489 | Đạt | Đạt | Dashboard Admin không có emergency của Resident; Emergencies 0 "None open"; không tên Resident ở "Unread messages" | | |
| F491 | Đạt | Đạt | 7 ô: Client accounts 2, Properties 2, People 43, Active spaces 261, Open requests 0, Billing issues 0, Monthly revenue $19 | | |
| F492 | Đạt | Đạt | Health 4 mục → "Show all" (aria-expanded true) → 8 mục → "Show fewer"; không còn "User 1" | | |
| F493 | Đạt | Đạt | 6 dòng "User login user@example.com" Nov 8/9, nhãn Sample data | | |
| X418 | Đạt | Đạt | "Live" ở Support queue và Unread messages; "Sample data" ở các phần còn lại | | |
| D439 | Đạt | Đạt | Thẻ Open tickets 2 = Ticket box "Open 2" | | |
| D440 | Đạt | Đạt | `eso-msg-v1` = `{}` và `not json`: dashboard hiển thị bình thường "Open tickets 2" | | |
| F435 | Đạt | Đạt | Publish trống: "Still needed to publish: …"; 7 lỗi role=alert; focus `#pf-title`; không bản ghi mới | | |
| F457 | Đạt | Đạt | Giới hạn mỗi resident = 2: hộp ghi "Up to 2 claims per resident.", count 2 rồi nút "Claimed" disabled | | |
| F458 | Đạt | Đạt | Tổng 3 (res-1 claim 2, res-2 claim 1): res-2 nút "Fully claimed" disabled | | |
| D419 | Đạt | Đạt | `eso-res-promo:res-1` = {"saved":[],"claims":{id:{count,code,at}}} | | |

Hồi quy mới (dòng đang Đạt mà nay hỏng): không có.

## Kiểm các thay đổi từ lượt 2 (không phải dòng tiêu chí riêng)

| Thay đổi | Kết quả | Bằng chứng |
|---|---|---|
| Staff cộng claim của Resident vào "claimed" (D423) | Đạt phần số đếm; danh sách người claim chưa đúng | Xem D423 |
| Tên upload kể cả đuôi ≤120 (S409) | Đạt | Xem S409 |
| Khóa W-9 xóa khỏi trang khi Cancel (S426) | Không đạt | Xem S426 |
| Vòng focus thẻ Promotion (S417) | Đạt | Xem S417 |
| Like/React/Share báo lỗi khi lưu thất bại (U207 của Social) | Đạt ở Staff Social; chưa thử Resident Social (bị chặn bởi cổng guidelines phải đọc hết chính sách) | Staff `/staff/social.html`, `Storage.setItem` ném QuotaExceededError: Like (bài có 2 reactions): thanh trạng thái "Could not save your reaction: this browser has no room left to keep it."; Share: "That did not go through. The browser could not save it (storage may be full or …". Giao diện giữ trạng thái cũ ("Like, 2 reactions") |
| Thông báo "Plan limits" và ngưỡng theo số mua ở Capacity | Đạt | Notifications Client có "Plan limits: Your plan covers 800 residents, 10 staff and 300 parking spaces" (khớp quyết định #8). Mua thêm (`eso-capacity:client`): parking +100 → "…400 parking spaces" và "261 / 400 on your plan"; residents +50, staff +5 → "850 residents, 15 staff". Trang Capacity: "Using 261 of 300", "202 of 800", "7 of 10", "9.4 GB of 10 GB". Quan sát: thông báo "Parking Spots near limit" vẫn hiện ở "261 / 400" (65%), ngưỡng gần-đầy không đổi theo số mua (mẫu cố định; Thấp, ghi N8) |
| Notifications giờ theo 12/24 giờ và múi giờ ở Settings | Đạt (đặt `ui-prefs:client`.time, vì trang Settings ở khung riêng; không bấm công tắc ở Settings) | Mặc định 3:51 PM; `{h24:true}` 15:51 và "Nov 15, 2026, 15:51"; `{tz:"Asia/Tokyo"}` 8:51 AM "Nov 16, 2026, 8:51 AM"; cả hai 08:51; tz sai "Not/AZone" bị bỏ qua, giờ thiết bị |
| In-app theo từng sự kiện | Đạt | `client:eso-notif`: cap [in-app tắt] ẩn "Capacity & plan" (117 → 114); msg_dm tắt ẩn Messages (→ 114); chỉ req_new tắt: không đổi (117); cả req_new và req_upd tắt: 81 (−36); sys tắt: 101 (−16); chỉ tắt email (cap [true,false,false]): không đổi |
| Tên property thay chữ mặc định | Đạt cho Staff và Resident Notifications; chưa thay ở Client Notifications, Documents, Admin dashboard | `eso-prop` = {display:"Harbor View Lofts"}: Staff và Resident Notifications không còn "Mallard Pointe at Riverbend" trong chữ hiển thị. Client Notifications (16 lần), Documents (5), Admin dashboard (4), Admin Notifications (3) vẫn ghi tên mặc định (các màn nhiều property của Client/Admin; chưa rõ có chủ ý, ghi N9) |
| Documents dữ liệu hỏng | Đạt | Xem D429 |

## Phát hiện mới ngoài tiêu chí

| Mã | Nội dung | Mức độ |
|---|---|---|
| N8 | Thông báo mẫu "Parking Spots near limit" vẫn nói "near limit" khi đã mua thêm (261 / 400 = 65%) | Thấp |
| N9 | Tên property đã đổi trong Settings chỉ thay ở Notifications của Staff và Resident, không ở Client, Admin, Documents (có thể là chủ ý vì Client/Admin thấy nhiều property) | Thấp, cần chủ dự án xác nhận |
| N10 | Hộp "Claimed by" của Promotion Staff liệt kê tên mẫu, không phải Resident thật (xem D423) | Trung bình |
| N11 | Hộp Upload trong khung portal không bẫy focus (xem S415; N3 lượt 2) | Cao |

Hạn chế: Social của Resident (cổng guidelines), F410/F412/F417/F404 (chuông và 4 portal), F480 (khóa lại sau 5 phút, cần đồng hồ giả) không kiểm lại lượt này nên không đưa vào phần C.
