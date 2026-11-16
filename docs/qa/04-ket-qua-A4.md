# Kết quả kiểm thử A4: Notifications, Promotions, Documents, Admin Command Center

Ngày chạy 2026-11-14. Người kiểm thử độc lập. Origin http://a4.localhost:3590, tab riêng, dữ liệu localStorage/sessionStorage của origin đã xóa sau khi xong. Tiêu chí: `03-tieu-chi-A4-notif-promo-docs-admin.md`.

## Tổng hợp

| Chỉ số | Giá trị |
|---|---|
| Tổng số tiêu chí | 215 |
| Đạt | 165 |
| Không đạt | 17 |
| Chưa kiểm được | 33 |
| % Đạt = Đạt ÷ (tổng − Chưa kiểm được) | 90.7% |

Ghi chú phương pháp: bằng chứng là giá trị đọc từ DOM/localStorage hoặc hành vi thấy sau thao tác thật qua công cụ trình duyệt. Một số thao tác (phím, upload, mở khóa) dùng sự kiện tổng hợp qua script trên trang thật; chỗ nào chưa kiểm hết các vế của tiêu chí thì ghi rõ "Chưa kiểm" trong cột bằng chứng. Múi giờ trình duyệt là America/Los_Angeles (buổi tối 14/11 khi UTC đã là 15/11), điều này làm lộ lỗi dùng ngày UTC ở Documents.

## Bảng kết quả

| ID | Kết quả | Bằng chứng ngắn | Nếu Không đạt: lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|
| F401 | Đạt | Client 95/95/"95 need attention" (bell=Unread=summary), Staff 9, Resident 26, Admin 5; aria-label "Open notifications. N need attention."; dashboard Client bell 95 |  | Cao |
| F402 | Đạt | Với 99 chưa đọc, bảng chuông có đúng 4 dòng = 4 mục chưa đọc mới nhất ở trang (A-10, Unit 137, Guest spot, B-17) |  | Cao |
| F403 | Đạt | Client: bấm "Notification settings" mở /client/settings/notifications.html (iframe account-settings, #/settings/notifications); Admin: mở /admin/settings.html#/settings/notifications; View all href giữ ?as=; Staff/Resident href /staff | resident/settings/notifications.html?as= (chỉ đọc href, chưa bấm) | Trung bình |
| F404 | Đạt | Mục "Parking Spots near limit" (mục "over limit" không còn) bấm trong chuông mở /client/workspace.html; badge 1 -> "You are all caught up"; LS n-plan-0=true |  | Cao |
| F405 | Đạt | Bấm "New request · Unit 137" trong chuông mở /client/notifications.html, badge 99->98, LS n-requests-1=true; không trang trắng |  | Trung bình |
| F406 | Không đạt | Staff bấm mục "Alex Rivera sent 2 messages" trong chuông -> URL /staff/messages.html?as=stf-1, không có hash #/c/c47 (href của mục cũng không có convId) | Resident res-1 "Talk to a person" -> gửi 2 tin (chat c47); Staff stf-1 mở chuông, bấm mục tin nhắn; URL không chứa #/c/<convId>, không mở sẵn thread | Cao |
| F407 | Không đạt | Staff bấm mục "Victor Lee replied “Is the surface lot gated during cleaning?”" trong chuông -> /staff/social.html?as=stf-1, không có hash/bài nào mở hay nổi bật (chữ "surface lot gated" không có trong trang, 0 dialog, 0 phần tử highlight) | Staff stf-1 mở chuông, bấm mục Community; chỉ vào trang Social chung (mục này là mục sẵn có, không tạo bằng bình luận thật) | Cao |
| F408 | Không đạt | Bấm mục tin nhắn c47 ở chuông chỉ ghi eso-notif-read:stf-1 {"msg-c47-m53":true}; trong eso-msg-v1 các tin m52, m53 của c47 vẫn readBy {} (chat vẫn chưa đọc) | Như F406, rồi đọc eso-msg-v1.msgs.c47[].readBy: không có stf-1 | Cao |
| F409 | Đạt | 0 chưa đọc: badge ẩn, aria-label "Open notifications. You are all caught up."; bảng "You are all caught up" + "Nothing needs your attention right now." |  | Trung bình |
| F410 | Đạt | 100 chưa đọc: badge "99+", aria-label "100 need attention"; 99: badge "99" |  | Trung bình |
| F411 | Chưa kiểm được | Đã thấy 1 chưa đọc -> 1 dòng; 99 -> 4 dòng. Chưa dựng được đúng 4 và 5 chưa đọc |  | Thấp |
| F412 | Đạt | 4 portal: h1 "Notifications", summary "N need attention", có link settings |  | Cao |
| F413 | Đạt | `guest pass`, `GUEST PASS`, `pass guest` cùng 8 id; `guest zzzz` 0 dòng |  | Cao |
| F414 | Đạt | `zzzz`: "No notifications match" + nút Clear filters; đọc hết + tab Unread: "You are all caught up"; Unread + Category: "Nothing unread in this view" |  | Trung bình |
| F415 | Đạt | Client All+8, Staff All+7, Resident All+7, Admin All+3 (Messages, Properties, System) |  | Cao |
| F416 | Đạt | Category Violations: 25 dòng, chip "Category: Violations", nút "Filters, 1 in use" |  | Cao |
| F417 | Đạt | Chỉ Client có ô Property hiển thị khi mở Filters (Staff, Resident, Admin: #f-prop rộng 0); chọn Mallard: 48 dòng đều ghi "Mallard Pointe at Riverbend", mục không có property biến mất |  | Trung bình |
| F418 | Đạt | Newest: ISO giảm dần; Oldest: tăng dần (Nov 2...); Unread first: nhóm "Unread" trước, 25 dòng đầu đều chưa đọc |  | Cao |
| F419 | Đạt | Không lọc All117 = Unread94 + Read23; Category Violations + search "Spot A-1": All1/Unread1/Read0, bấm tab Unread số vẫn All1/Unread1/Read0 |  | Cao |
| F420 | Đạt | Bật Category+Property+Oldest+search+tab Unread: nút "Filters, 3 in use"; bấm chip Category chỉ bỏ Category (property, sort, search, tab giữ); "Clear all filters": cat/prop all, sort newest, q "", tab All, focus về #search |  | Trung bình |
| F421 | Đạt | Nhóm "Today", "Yesterday", "Thursday, Nov 12", ... với số bên phải |  | Trung bình |
| F422 | Đạt | 25 dòng; "Showing 25 of 117"; có lọc "36 results, showing 25"; nút "Show 25 more (25 of 117)" |  | Cao |
| F423 | Đạt | 25->50->75->100->117; lần cuối "Show 17 more (100 of 117)", hết thì ẩn; focus chuyển vào một dòng mới |  | Trung bình |
| F424 | Đạt | Bấm nút tròn: toast "Marked as read" + Undo, aria-pressed true, tab 95->94, bell 94; bấm lại "Marked as unread", về 95 |  | Cao |
| F425 | Đạt | Không lọc: "Mark all as read"; lọc Violations: "Mark 20 as read"; lọc "request" 36 kết quả, "Mark 30 as read" (>25 dòng hiện), sau đó nút disabled title "Nothing unread here" |  | Cao |
| F426 | Đạt | "20 marked as read" + Undo; Undo trả 20 mục về chưa đọc; toast tự mất sau 6.6 s |  | Cao |
| F427 | Đạt | Resident: tiêu đề "Request update · Waitlist request" là thẻ a -> /resident/tickets.html?as=res-1 (đã mở thật); mục không có đích ("Parking pass ready"): thẻ a bị hidden, hiện span thường. (Mục này đã đọc sẵn nên không kiểm lại việc đánh dấu; việc đọc khi bấm xem F404/F405) |  | Cao |
| F428 | Đạt | Resident gửi 2 tin vào c47; Staff thấy đúng 1 mục "Alex Rivera sent 2 messages", detail = tin mới nhất, danh mục Messages |  | Cao |
| F429 | Đạt | Tab A staff notifications, tab B Resident gửi tin: sự kiện storage đến tab A sau 0,27 s, mục đổi "sent 3 messages" -> "sent 4 messages", chuông 14 -> 15 (tin đầu sau khi đã đọc mục), không tải lại (biến window còn nguyên) |  | Cao |
| F430 | Chưa kiểm được | Cần tạo 13 chat và 9 hoạt động Social (Social cần chấp nhận guidelines), quá 4 thao tác |  | Trung bình |
| F431 | Đạt | Staff có 7 mục Community live (id soc-r-..., soc-c-...); Resident có category Community; Client (8 category) và Admin (3 category) không có Community. (Dùng mục Social đã có sẵn, chưa tự tạo bình luận Resident mới) |  | Trung bình |
| F432 | Đạt | Hai tab staff/notifications: "Mark all as read" ở tab B, tab A đổi sang "You are all caught up", Unread0/Read31 sau 0,055 s, không tải lại |  | Cao |
| F433 | Đạt | Thông báo mẫu: "Parking Spots near limit 261 / 300", "Starter covers 800 residents, 10 staff and 300 parking spaces", không có thông báo "over limit"; thẻ sidebar Client 261/300, 202/800, 7/10, 9.4/10 GB; trang Capacity 261 of 300, 202 of 800, 7 of 10; sidebar Staff 202/800, 7/10, 261/300 |  | Cao |
| F434 | Đạt | Staff "Publish" promotion "QA Alpha Promo": eso-pmc-saved có bản ghi st "active"; tab Resident (đang mở) hiện thẻ mới sau 0,016 s, "1 of 1 promotion", không tải lại |  | Nghiêm trọng |
| F435 | Đạt | Publish khi trống: dòng "Still needed to publish: Title, Category, Short description, Detailed description, Offer value, Promo code, End date."; 7 lỗi role=alert riêng ("Add a title residents will recognize." ...); focus vào #pf-title; không có bản ghi mới. (Danh sách thực tế khác bản mô tả: không có Delivery channels/Start date vì đã có mặc định) |  | Cao |
| F436 | Đạt | % off: 0 và -5 và trống "Enter a percentage, e.g. 20."; 101 "A percentage can’t exceed 100."; 100 và 1 hợp lệ; $ off: 0 "Enter an amount, e.g. 25.", 25 hợp lệ |  | Cao |
| F437 | Đạt | End trước Start: "End date must be on or after the start date."; End = Start hợp lệ; Start ngày mai: nút "Schedule", toast "Promotion scheduled", bản ghi st "scheduled", Resident chưa thấy "QA Future" |  | Cao |
| F438 | Đạt | QR để trống mã: "Enter the code residents will use."; Link: `javascript:alert(1)`, `ftp://a.b` và trống đều bị "Enter a full URL starting with https://", không tạo bản ghi; `https://partner.com/offer` được xuất bản (record method "link"); ô prefix có maxLength 8 |  | Nghiêm trọng |
| F439 | Đạt | Tổng 0/mỗi người 1, 5/6, 1/6: "Total limit is lower than the per-resident limit." không tạo bản ghi; tổng trống = "Unlimited"; ô có min 1. Ghi chú: mỗi resident "0" vẫn được lưu (limR "0") |  | Cao |
| F440 | Đạt | Buildings không tick: "Choose at least one building."; Segments: "Choose at least one segment."; bỏ hết kênh: "Choose at least one channel."; không bản ghi mới |  | Trung bình |
| F441 | Đạt | Gõ Title: eso-pmc-draft tự lưu (JSON có title "QA Limits2"); "Save draft" -> toast "Draft saved", bản ghi st "draft"; Resident (4 promotion) không thấy. Chưa kiểm: nút chỉ bật khi có Title, nháp còn sau tải lại |  | Cao |
| F442 | Không đạt | Staff: bấm "View deal" -> "Edit details" (chỉ có Title/Offer/Price/Promo code, nút "Save", không có "Update & publish", không có ô Category để khóa). Đổi Title thành "QA Alpha Promo EDITED" và Save: thẻ Staff đổi tên nhưng bản ghi trong eso-pmc-saved vẫn "QA Alpha Promo" (n=6, không nhân đôi) và Resident vẫn hiện tên cũ (khóa phụ eso-pmedits chỉ Staff đọc) | Staff /staff/promotions.html -> thẻ QA Alpha Promo -> View deal -> Edit details -> đổi Title -> Save; mở /resident/promotions.html: tiêu đề không đổi | Cao |
| F443 | Chưa kiểm được | Không tìm thấy hai công tắc "Show promotions to residents" / "Let residents save promotions" trong /staff/workspace.html (chỉ có tiêu đề "Resident promotions" và mô tả, không có switch trong DOM). Phía Resident: ghi tay eso-proto {promoShow:false} -> "Promotions are off"; {promoShow:true,promoSave:false} -> ngôi sao ẩn (width 0) và chip Saved biến mất; xóa khóa -> hiện lại |  | Cao |
| F444 | Đạt | /resident/promotions.html: h1 "Promotions · Resident", ô "Search promotions…", nhóm "Filter promotions", "4 of 4 promotions", thẻ có partner, tiêu đề, mô tả ngắn, huy hiệu offer |  | Cao |
| F445 | Đạt | Sửa ngày bản ghi: End hôm nay hiện (QA Alpha), Start hôm nay hiện (QA Limits), End hôm qua ẩn, Start ngày mai ẩn, bỏ kênh In-App (chỉ Email/SMS) ẩn; bản nháp và scheduled ẩn |  | Cao |
| F446 | Chưa kiểm được | Không thể đưa đồng hồ/ngày thật qua mốc bắt đầu trong công cụ |  | Trung bình |
| F447 | Chưa kiểm được | Chưa dựng được ánh xạ tòa nhà/phân khúc của res-1/2/3 (cần thêm nhiều bước) |  | Cao |
| F448 | Đạt | `alpha`/`ALPHA` (title), `QA short line`, `detailed description alpha`, `QA Partner`, `parking` đều ra đúng; hai dấu cách ra tất cả (4 of 4); `zzzz` -> "No matches" |  | Cao |
| F449 | Đạt | Chip: All3/Parking3/Saved1 (chỉ category Parking có promotion); "Parking" cho 3 thẻ, "Saved" cho 1 thẻ |  | Trung bình |
| F450 | Chưa kiểm được | Chỉ thấy "$20 off", "$10 off", "Buy one, get one", "Fully claimed", "Claimed", "Ends Nov 19, 2026", category; chưa dựng "% off"/"Free" và nhãn audience |  | Trung bình |
| F451 | Đạt | Hộp (dialog) có partner, tiêu đề, mô tả, "Up to 3 claims per resident." (khi >1), "Terms: ..."; Close và phím Esc thật đều đóng và focus về nút mở thẻ. Chưa thử bấm nền |  | Trung bình |
| F452 | Đạt | Bấm sao: aria-label "Save: ..." -> "Remove from saved: ...", aria-pressed true, toast "Saved", chip "Saved1", danh sách Saved "1 of 4"; bấm lại toast "Removed from saved", label về "Save: ..."; LS saved cập nhật (chưa kiểm tải lại) |  | Cao |
| F453 | Đạt | Static: Claim -> toast "Claimed. Your code is below.", hộp "Your code QACODE1", nút thành "Claimed", thẻ nhãn Claimed. "Copy": clipboard bị chặn trong môi trường nên chỉ thấy toast dự phòng "Select the code and copy it." (không thể kiểm toast "Code copied") |  | Cao |
| F454 | Chưa kiểm được | Chưa tạo promotion phương thức QR |  | Trung bình |
| F455 | Đạt | Unique prefix QAPFX: mã QAPFX-WUY68 (đúng 5 ký tự không có 0,O,1,I,L); claim lại vẫn cùng mã; res-2 mã/claim riêng (LS res-2 không đổi do res-1) |  | Cao |
| F456 | Đạt | Link https://partner.com/offer: window.open("https://partner.com/offer","_blank","noopener,noreferrer"); sửa x.link = `javascript:alert(1)`: bấm "Get offer" với res-2 không gọi window.open, không alert (claim vẫn tính 1 và toast "Claimed...", đúng ghi chú Chờ quyết) |  | Nghiêm trọng |
| F457 | Đạt | Mỗi resident=3: count 2 -> 3, nút "Claimed" disabled, bấm tiếp vẫn 3; limR "0" (QA Limits): sau 1 claim nút disabled, count giữ 1 (0 coi là 1). Trống chưa thử riêng (QA Alpha limR 1) |  | Cao |
| F458 | Đạt | Tổng 1 (QA Link Test): res-1 claim xong, thẻ "Fully claimed", với res-2 nút disabled chữ "Fully claimed" (không bấm được nên không thấy toast "This promotion has been fully claimed."); res-1 vẫn có mã LIM1 trong eso-res-promo:res-1 |  | Cao |
| F459 | Đạt | "Promotions are off", "No promotions yet", "Nothing saved yet / Star a promotion to keep it here.", "No matches"; Staff đổi promotion về draft khi hộp đang mở: hộp đóng, toast "That promotion is no longer available." |  | Trung bình |
| F460 | Đạt | Xóa eso-docs:client, mở /client/documents.html: 7 tài liệu thường theo thứ tự Towing (hết hạn), Certificate of insurance (sắp hết hạn), Resident welcome letter, Parking rules, Violation notice template, EasySpotOps service agreement, Fire lane map (+ hàng W-9) |  | Cao |
| F461 | Đạt | `cert`/`CERT` -> 1 (Certificate), `CONTRACTS` -> 15 (tất cả Contracts), `riverbend` -> 3, `whole team` -> 6, số trên tab đổi theo search (All1,Insurance1...), `zzzz` -> "No documents match" |  | Cao |
| F462 | Chưa kiểm được | Số trên tab khớp (All7, Contracts2, Insurance1, Policies1, Templates2, Maps and plans1, Tax forms0, Other0); chưa thử phím ←, →, Home, End |  | Trung bình |
| F463 | Đạt | Property Mallard: tài liệu "All properties" (Resident welcome letter) vẫn hiện, chip + "Filters, 1 in use"; "Last 30 days" loại Towing (cũ); các sort Expires soonest/Name A-Z/Newest/Oldest đúng thứ tự |  | Cao |
| F464 | Không đạt | Upload với expires: 2026-11-13 -> "Expired 2 days ago" (kỳ vọng 1 ngày trước); 2026-11-14 (hôm nay theo giờ Los Angeles) -> "Expired 1 day ago" (kỳ vọng "Expires today"); 11-15 -> "Expires today"; +30 ngày -> "in 29 days"; +31 -> "in 30 days" (kỳ vọng không soon). Nhãn tính theo ngày UTC (11-15) trong khi giờ địa phương là 11-14 buổi tối | Mở /client/documents.html vào buổi tối giờ Mỹ (UTC đã sang ngày mới), upload tài liệu có Expires = hôm nay: hiện "Expired 1 day ago" | Cao |
| F465 | Đạt | Bấm X "Dismiss the expired documents reminder": toast "Reminder dismissed" + Undo, thanh ẩn, eso-docs-dismissed:client = {"expired":3,"soon":0}; Undo trả {"expired":0,...}; thêm tài liệu hết hạn nữa -> thanh hiện lại "4 documents expired" |  | Trung bình |
| F466 | Đạt | Upload a.pdf 1 MB (tên tự điền "a"): hộp đóng, eso-docs:client có bản ghi mới, hiện ở danh sách sau 2 tài liệu cần chú ý (theo sort "Needs attention first", nên không ở đầu tuyệt đối). Chưa đọc được toast "Added a.pdf" |  | Nghiêm trọng |
| F467 | Đạt | Từ chối: a.exe, a.pdf.exe, a, a.txt với "That file type is not accepted. Use pdf, doc, docx, xls, xlsx, png, jpg, jpeg."; không chọn file: "Choose a file to upload."; nhận: A.PDF, a.jpeg, a.xlsx |  | Cao |
| F468 | Đạt | 10.485.760 byte được nhận; 10.485.761 byte: "That file is over 10 MB. Choose a smaller one.", không thêm bản ghi |  | Cao |
| F469 | Đạt | Tên trống và toàn dấu cách: "Give the document a name."; 121 ký tự: "Use 120 characters or fewer."; 120 ký tự hợp lệ; `report.pdf` lưu "report.pdf" (không thành .pdf.pdf) |  | Cao |
| F470 | Đạt | Expires trống hợp lệ; ngày đã qua được nhận và hiện nhãn "Expired ..."; `2026-02-31` không nhập được vào ô date (trình duyệt trả value rỗng nên bản ghi không có hạn, không có lỗi "Use a valid date.") |  | Trung bình |
| F471 | Đạt | Upload a.pdf hai lần (1 MB và 10 MB): hai bản ghi riêng id u1794721028963 và u1794721046491. (Chưa xóa một để kiểm bản kia còn) |  | Cao |
| F472 | Đạt | Remove "EXP-bad.pdf": số bản ghi -1, nút Undo hiện; Undo trả đúng vị trí và cùng thứ tự id; xóa lại và chờ 8 s: Undo biến mất, bản ghi vẫn mất. Chưa đọc chữ toast "Removed <name>" |  | Cao |
| F473 | Đạt | Điền form rồi Cancel: 0 bản ghi mới, mở lại form trống (tên rỗng, 0 file, share mặc định "admins"); Download: toast "Downloads are not part of this preview." (phím Esc chỉ thử tổng hợp, chưa thử thật) |  | Thấp |
| F474 | Đạt | Dialog "Add W-9": trống -> 4 lỗi ("Choose the signed W-9.", "Enter the business name exactly as it is on the form.", "Choose the tax classification from the form.", "Enter the date it was signed."); .docx "Use a pdf, png, jpg, jpeg file."; 11 MB "That file is over 10 MB. Choose a smaller one."; tên 121 "Use 120 characters or fewer."; ngày 2026-11-16 "The signing date cannot be in the future." |  | Cao |
| F475 | Đạt | Thêm W-9 (ký 2022-01-01): toast "W-9 added and locked", đúng 1 hàng W-9, nhãn "Review" (ký quá 3 năm) và "Locked", hàng khóa chỉ có nút "Unlock to view" (không có Remove); sau mở khóa có "Replace", "Lock now", "Download", vẫn không có Remove. Chưa chạy Replace để thấy toast "W-9 replaced and locked" |  | Cao |
| F476 | Đạt | "Send key" (email): dòng "Preview only... Your key is XXXX-XXXX-XXXX-XXXX" (4 nhóm 4 ký tự), nhập khóa: toast "W-9 unlocked for 5 minutes", hàng "Unlocked", "Locks again in 5:00" (đếm xuống 4:41 sau vài giây) |  | Nghiêm trọng |
| F477 | Đạt | Khóa sai: "That key is not right. 4 tries left." -> "3 tries left." (tải lại) -> "2 tries left." -> "1 try left." -> lần 5 "Too many tries. That key is dead. A new one can be made in 4:38."; nhập khóa đúng sau đó: "No key is active. A new one can be made in 4:37."; tries (pending.tries) giữ 3 sau tải lại, không reset |  | Nghiêm trọng |
| F478 | Không đạt | Nút "Send key" disabled "New key in 5:00" -> 4:29 kể cả sau khi dùng khóa (đúng). Nhưng khi pending.expiresAt đã qua (giả lập bằng sửa docs-secret:pending), nhập khóa đúng cho "No key is active. A new one can be made in 5:00." thay vì "That key has expired. Send a new key." | Gửi khóa, sửa docs-secret:pending.expiresAt về quá khứ, nhập khóa vừa nhận: thông báo là "No key is active..." (không phải "That key has expired. Send a new key.") | Cao |
| F479 | Đạt | Khóa viết thường, bỏ dấu gạch/đổi bằng dấu cách mở khóa được; 15 ký tự: "Enter all 16 characters of the key." (không tốn lượt); dùng lại khóa đã dùng: "No key is active. A new one can be made in 4:29." |  | Cao |
| F480 | Chưa kiểm được | Đã thấy: "Lock now" khóa ngay (toast "W-9 locked"), tải lại khóa lại, nhật ký docs-secret:log giữ đúng 5 mục (6+ lần mở). Chưa chờ hết 5 phút để thấy tự khóa và toast |  | Cao |
| F481 | Đạt | Admin adm-1: emergency "1 emergency needs an answer" / "2 emergencies need an answer"; không emergency, 1 chưa có chủ "1 ticket has no owner yet", 2 "2 tickets have no owner yet"; tất cả đã gán "8 open tickets, all with an owner"; đóng hết "The Support queue is clear" (đúng thứ tự ưu tiên) |  | Cao |
| F482 | Đạt | Bốn thẻ: "Open tickets 2 / 1 without an owner · oldest 6 h" -> "All have an owner · oldest 2 d" -> "Nothing is waiting"; "Unread messages 4 / In 2 conversations" -> "Everything is read"; "Emergencies 0 / None open" -> "1 / Not acknowledged yet"; "Platform alerts 32 / 0 critical · 32 warnings" (Chờ quyết) |  | Cao |
| F483 | Đạt | Thẻ 1 -> /admin/tickets.html?as=adm-1, thẻ 2 -> /admin/messages.html, thẻ 3 -> /admin/messages.html#/c/c910 (emergency cũ nhất) khi có emergency; thẻ 4 click: cuộn/focus vào tiêu đề "Platform health"; hai nút "Open Ticket box"/"Open Messages" đúng; giữ ?as= |  | Cao |
| F484 | Đạt | Queue: High (5 h) trước High (2 h), rồi Normal theo chờ lâu nhất trước (10 h, 1 h, 1 h, 2 min); Low (30 h) xếp sau (nằm ngoài 6 dòng) |  | Cao |
| F485 | Đạt | 8 ticket mở: đúng 6 dòng, "Showing 6 of 8 open, most urgent first"; dòng có số ticket, chủ đề, người gửi, vai (Client/Staff), mức, giai đoạn, người phụ trách/"Unassigned"; bấm dòng T-2005 mở /admin/tickets.html#/t/c905 đúng ticket |  | Cao |
| F486 | Đạt | Chờ: 2 min, 59 min, 60 phút -> "1 h", 47 h -> "47 h", 49 h -> "2 d" ("just now" thấy khi vừa tạo ticket; chưa thấy 30 s riêng) |  | Thấp |
| F487 | Đạt | Dòng phụ "5 from Clients · 3 from Staff · 1 resolved this week" đúng với dữ liệu (8 mở: 5 Client, 3 Staff); "Open 1 Pending 1 Resolved 1" khớp. Chưa kiểm ranh giới 7 ngày |  | Trung bình |
| F488 | Đạt | 10 tin chưa đọc ở 8 chat: đúng 5 dòng, dòng phụ "10 messages in 8 conversations", dòng mở /admin/messages.html#/c/<id>; hết chưa đọc: "Nothing unread" + "You are all caught up" |  | Cao |
| F489 | Đạt | Resident res-1 gửi tin ở chat Staff và bấm "Mark as emergency" (conv c47 có emergency, chưa ack): adm-1 và adm-2: banner ẩn, thẻ "Emergencies 0 / None open", chat resident_support không có trong Unread messages |  | Nghiêm trọng |
| F490 | Đạt | Chat trực tiếp Staff -> adm-1 có emergency: banner "An emergency is waiting for an answer — <tên> · raised 2 min ago" hiện sau 0,033 s; 2 emergency: "2 emergencies are waiting for an answer"; bấm Acknowledge ở Messages: banner cập nhật 0,012 s và biến mất sau cái thứ 2 (≤ 2 s); thẻ và banner dẫn tới emergency cũ nhất |  | Cao |
| F491 | Đạt | 7 ô: Client accounts 2, Properties 2, People 43, Active spaces 261, Open requests 0, Billing issues 0, Monthly revenue $19; nhãn "Sample data"; 0 liên kết trong phần này (Chờ quyết) |  | Thấp |
| F492 | Đạt | Platform health: 4 mục, "Show all 8" (aria-expanded false) -> 8 mục "Show fewer" (true) -> 4 mục; nhãn "Sample data". (Tên mục là Morgan Ellis, Priya Nair..., không phải User 1-4) |  | Trung bình |
| F493 | Đạt | 6 dòng "User login user@example.com" Nov 9 / Nov 8 + nhãn Sample data, không có liên kết |  | Thấp |
| F494 | Đạt | Client gửi ticket "EasySpotOps Support" ở tab khác: dashboard trong 0,02 s: "2 tickets have no owner yet", Open tickets 2 -> 3, thêm dòng T-1087 vào queue, không tải lại. Chưa thử "Resolved" ở tab C và đếm 60 s |  | Cao |
| F495 | Đạt | /admin/notifications.html: có sidebar + header Admin, bell badge 5, "Notification settings" mở /admin/settings.html#/settings/notifications |  | Cao |
| F496 | Đạt | 3 category, không có ô Property hiển thị; "32 platform health warnings" và "People needing space assignment" href /admin/dashboard.html; "New sign-in" không link; ghi chú "Messages and Support tickets are live" (đọc href, chưa bấm hai mục đầu) |  | Trung bình |
| F497 | Đạt | Admin notifications: mục "Dana Whitfield sent you a message" (Messages) chưa đọc, href /admin/messages.html#/c/c56 (có convId); bell 5 -> 6; mở chat ở Messages: readBy có adm-1 |  | Cao |
| F498 | Đạt | adm-1 "Mark all" (11 -> 0): adm-2 vẫn All17/Unread12/Read5 (khóa eso-notif-read:adm-1 riêng); "32 platform health warnings" khớp thẻ Platform alerts 32; "8 approved parkers" khớp 8 mục health |  | Trung bình |
| D401 | Đạt | eso-notif-read:cli-1 = {"n-requests-0":true/false...} JSON object, chỉ id đã đổi |  | Cao |
| D402 | Đạt | res-1 "Mark all" (Unread 32->0): res-2 vẫn All41/Unread29/Read12; chỉ eso-notif-read:res-1 đổi |  | Cao |
| D403 | Đạt | eso-notif-read:cli-1 = `{{not json`: trang All117/Unread93, chuông 93, không lỗi console của app, các khóa khác còn |  | Cao |
| D404 | Đạt | `[]`, `null`, `5`, `"x"`, `{"n-requests-0":"yes"}` đều cho All117/Unread93/Read24 (như không có dữ liệu) |  | Trung bình |
| D405 | Đạt | Thêm `{"n-zzz-9":true}`: Unread 93, chuông 93, không dòng mới |  | Thấp |
| D406 | Đạt | Đọc 1 mục (74), "Mark 29 as read" -> 45 (giảm đúng 29), mục vẫn true, không âm |  | Trung bình |
| D407 | Đạt | Mark all rồi Undo: LS từng id về false, bell 75->95, tab về All25/Unread20/Read5 |  | Cao |
| D408 | Đạt | Client: chuyển đọc/chưa đọc mục tin nhắn ở trang: chuông 93/94/95 = Unread của trang, badge nhóm "Communication" 0/1/2 = số mục tin nhắn chưa đọc, đều khớp (chỉ làm ở 1 tab) |  | Cao |
| D409 | Đạt | Client: mở chat c25 ở Messages (#/c/c25): readBy có cli-1, chuông 95 -> 94, badge Communication 2 -> 1, mục đọc. Ghi chú: Staff sidebar "Messages 1" không đổi suốt các thay đổi và còn "1" khi chuông Staff đã "all caught up" (không rõ nó đếm gì) |  | Cao |
| D410 | Đạt | "Mark as unread" mục tin nhắn: tin cuối của chat c42 mất readBy cli-1/stf-1 (tức chưa đọc), badge Communication 0 -> 1, chuông +1; Staff: c8 tin cuối mất readBy stf-1, chuông +1. (Không kiểm chấm chưa đọc trong danh sách Messages; badge "Messages" của Staff không tăng) |  | Cao |
| D411 | Đạt | Resident "Mark all": các khóa đổi chỉ gồm eso-notif-read:res-1 và eso-msg-v1 (mục tin nhắn); không khóa Social/Promotions/Documents nào đổi. (Chỉ kiểm thao tác Mark all, chưa kiểm riêng lọc) |  | Trung bình |
| D412 | Đạt | Chặn Storage.setItem: bấm đọc 1 mục, trang đổi trong phiên (Unread 15->14, dòng đọc), không lỗi, LS không ghi; tải lại về cũ. Ghi chú: badge chuông vẫn 15 khi trang là 14 |  | Trung bình |
| D413 | Đạt | Mục tin nhắn msg-c47-m53 đã đọc, sau tải lại vẫn "true" |  | Cao |
| D414 | Chưa kiểm được | Chưa chạy mục Social của Resident (cần chấp nhận guidelines) |  | Trung bình |
| D415 | Chưa kiểm được | Chưa bấm "Reset demo data" và xóa mọi eso-notif-read để đếm 7/18/36/114 |  | Thấp |
| D416 | Đạt | Staff: mọi mục danh mục Messages (6) và Community (7) đều có id live (msg-..., soc-...), 0 mục mẫu trùng; mục Messages chỉ đến từ live |  | Trung bình |
| D417 | Đạt | Sau upload và thêm 700 MB: Documents "10.1 GB of 10 GB used", thẻ sidebar Client "Storage 10.1 GB / 10 GB", trang Capacity "Using 10.1 GB of 10 GB" cùng giá trị |  | Cao |
| D418 | Đạt | Resident lưu, bỏ lưu, claim: eso-pmc-saved, eso-pmc-cats, eso-proto giống từng byte so với trước; chỉ eso-res-promo:res-1 đổi |  | Cao |
| D419 | Đạt | eso-res-promo:res-1 = {"saved":[id],"claims":{id:{"count","code","at"}}}; res-2 có khóa riêng không bị ảnh hưởng |  | Cao |
| D420 | Đạt | eso-pmc-saved = `not json` -> "No promotions yet", console 0 lỗi; mảng [null, {id,st}(thiếu x), {title ""}, bản tốt]: 2 phần tử hợp lệ hiện, phần tử title rỗng hiện "Promotion", null/thiếu x bị bỏ |  | Cao |
| D421 | Đạt | Hạn mức 3: count sau các lần claim 2, 3, 3, 3 (lần thừa không tăng) |  | Cao |
| D422 | Đạt | Tổng 3, mỗi resident 2: res-2 claim 2, res-1 claim 1 -> thẻ "Fully claimed", lần claim thứ 2 của res-1 bị disabled, count res-1 giữ 1 |  | Cao |
| D423 | Không đạt | Resident claim hết "QA Total3" (3/3, thẻ Resident "Fully claimed") và claim các promotion khác; Staff /staff/promotions.html vẫn "3 left · 0/3 ... Active 0 claimed" và tab "Claims 8" không đổi | Resident res-1, res-2 claim QA Total3; mở /staff/promotions.html: số claimed/tồn kho không đổi, Staff không biết ai đã claim | Cao |
| D424 | Đạt | Promotion đã lưu bị đổi về draft: chip Saved từ 1 -> 0, danh sách "Nothing saved yet", không lỗi; bật lại active: Saved 1 |  | Trung bình |
| D425 | Chưa kiểm được | Mã Unique lưu cùng claim (QAPFX-WUY68 khớp hiển thị) nhưng chưa đổi prefix ở Staff rồi tải lại |  | Trung bình |
| D426 | Chưa kiểm được | Thiếu khóa eso-proto: promotion hiện và có sao lưu (4 sao). Chưa kiểm được việc công tắc Staff ghi promoShow/promoSave (không thấy công tắc) |  | Trung bình |
| D427 | Không đạt | Upload a.pdf 1 MB: bản ghi có id "u1794721028963", name "a.pdf" (đuôi hạ chữ thường: "A.PDF" -> "A.pdf"), category, property, share, uploadedAt, expires, size 1048576 (đúng byte, không có nội dung); nhưng "updated" = "2026-11-15" trong khi ngày địa phương là 2026-11-14 (dùng ngày UTC) | Upload một file vào buổi tối giờ Mỹ; so trường updated với ngày hôm nay | Cao |
| D428 | Đạt | Xóa: 1 bản ghi ít hơn; Undo: danh sách id giống hệt trước, không nhân đôi |  | Cao |
| D429 | Không đạt | eso-docs:client = `not json` -> 7 tài liệu mẫu (đạt); `{}` -> 7 mẫu (đạt); `[null,{"id":"x"},5,"a"]` -> danh sách rỗng, không có tab, console lỗi "Uncaught TypeError: Cannot read properties of null (reading 'share') at documents/store.js:77 (migrateDocs)" | Đặt eso-docs:client = [null] rồi tải /client/documents.html: trang trống, lỗi console | Cao |
| D430 | Đạt | share "staff" và "residents" hiển thị "Whole team" |  | Thấp |
| D431 | Đạt | docs-secret:pending = {digest (64 hex), via, madeAt, expiresAt, tries}; issued chỉ là mảng digest; không khóa localStorage/sessionStorage nào chứa 16 ký tự khóa (kể cả bỏ gạch, đổi hoa/thường) |  | Nghiêm trọng |
| D432 | Đạt | 20 khóa liên tiếp: đủ 20 khác nhau, mọi khóa khớp bảng chữ (không có 0,O,1,I,L), issued tăng đến 22 (<500; chưa thử giới hạn 500) |  | Cao |
| D433 | Đạt | Sau khi dùng khóa không tạo được khóa mới tới hết window (Send key disabled); nhật ký [{at,by:"Dana Whitfield",how:"email key"}], giữ tối đa 5 mục mới nhất sau 7 lần mở |  | Cao |
| D434 | Đạt | Khóa ghi {expired:3,soon:0} bằng số lúc đóng; thêm tài liệu hết hạn mới làm nhắc hiện lại. Chưa kiểm "về 0 khi hết tài liệu hết hạn" |  | Trung bình |
| D435 | Đạt | Mặc định "9.4 GB of 10 GB used · Almost full"; thêm tài liệu 700 MB: "10.1 GB of 10 GB used · Full", thanh 100%, aria-label "Document storage: 10.1 GB of 10 GB used, full". (Chưa dựng riêng mốc 90%) |  | Trung bình |
| D436 | Đạt | Capacity thêm 1 khối storage + Confirm: Capacity "10.1 GB of 30 GB"; Documents (tab khác) vẫn "of 10 GB" cho đến khi tải lại, sau tải lại "10.1 GB of 30 GB"; sidebar trong cùng tab cũng chỉ đổi sau tải lại (Khoảng cách: không đồng bộ ngay) |  | Cao |
| D437 | Đạt | docs-prefs:client {soonDays:45,share:"x"}: ngưỡng về 30 ("4 documents expire within 30 days"), mặc định Who can see it = "Admins only"; {soonDays:7}: thanh đổi ngay "1 document expires within 7 days" không tải lại |  | Thấp |
| D438 | Đạt | Mở dashboard, bấm Show all, bấm thẻ Platform alerts, chờ 6 s: không khóa localStorage nào đổi (chưa chờ đủ 5 phút) |  | Cao |
| D439 | Đạt | Open tickets 3 = Ticket box "Open 3" tại /admin/tickets.html; Unread messages 4 = badge Messages "(4)"; khớp sau thay đổi từ tab khác |  | Nghiêm trọng |
| D440 | Không đạt | eso-msg-v1 = `not json`: dashboard tự nạp lại dữ liệu mẫu (hiển thị, ghi đè dữ liệu). eso-msg-v1 = `{}`: dashboard trống (headline/thẻ rỗng), console "TypeError: Cannot convert undefined or null to object at Object.ticketBox (store.js:1316)" và "Cannot read properties of null (reading 'headline')" | Đặt localStorage eso-msg-v1 = {} rồi mở /admin/dashboard.html: trang trống, lỗi console | Cao |
| D441 | Đạt | "Active spaces 261" ≤ 300; Client sidebar, Staff sidebar và Capacity cùng 800 / 10 / 300; không nơi nào ghi giới hạn khác (Chờ quyết cho 32 warnings và $19) |  | Trung bình |
| D442 | Chưa kiểm được | Chưa ghi nhận số chuông/trang/thẻ trước và sau khi tạo đúng 3 ticket (chỉ kiểm D439: khớp sau 1 ticket thật) |  | Cao |
| U401 | Đạt | 375: không cuộn ngang (scrollWidth 375), nút Filters 41x44 có aria-label "Filters" (chỉ biểu tượng); 830: không cuộn ngang (innerSW=CW 818); 1440: max-w-4xl 896 px căn giữa (left 144 trong khung 1184) |  | Cao |
| U402 | Đạt | 375 (cảm ứng): bảng chuông rộng 351 ≤ 375-24, left 12; mỗi dòng thông báo cao 53 px (≥44); (View all cao 28 px nhưng không phải dòng thông báo). Chưa kiểm cuộn trong bảng khi dài |  | Trung bình |
| U403 | Chưa kiểm được | Chưa tạo thông báo tiêu đề 300 ký tự |  | Trung bình |
| U404 | Không đạt | 375 (cảm ứng): Search 264x44, tab 44, Mark all 140x44, nút đọc 44x44, "Filters" 41x44, "Show more" 44, nhưng chip lọc "Category: Violations" 147x32 (cao 32) và nút Undo 36x44 (rộng 36) | Mở /client/notifications.html ở 375 cảm ứng, chọn Category Violations: chip cao 32 px; đánh dấu 1 mục: nút "Undo" rộng 36 px (<44) | Cao |
| U405 | Đạt | Tỉ lệ tương phản đo bằng canvas (foreground vs nền tổng hợp), sáng: title/detail/time 5,22, category 10,7, nhóm ngày 5,56, summary 5,13; tối: title 15,88, detail/time 6,41, category 10,53, nhóm 6,94, summary 7,66, tab chọn 5,38. Chưa đo chip, toast |  | Cao |
| U406 | Đạt | Dòng chưa đọc: chấm tròn hiển thị, class font-medium, nhãn "Unread: " trong DOM (sr-only) |  | Trung bình |
| U407 | Chưa kiểm được | Không tắt được JavaScript trong công cụ; chỉ thấy có <noscript> chứa "Notifications need JavaScript. Turn it on in yo..." |  | Thấp |
| U408 | Đạt | 375: toast ở đáy (top 667, bottom 735 trong 751), rộng 369, nút Undo trong khung nhìn, aria-live="polite". Chưa xem ở 1440 |  | Trung bình |
| U409 | Đạt | Trạng thái rỗng "No notifications match" có biểu tượng, tiêu đề, mô tả (tương phản 17,2/6,9); nút Mark all disabled opacity 0,5 (ước tính chữ vẫn >3:1) |  | Thấp |
| U410 | Đạt | Lưới 5 thẻ: 375 -> 1 cột 337 px; 830 -> 2 cột 382 px; 1440 -> 3 cột 357 px; không cuộn ngang, không thẻ bị cắt (chỉ dựng 5 thẻ, không đủ 6) |  | Cao |
| U411 | Không đạt | Title 100 ký tự (2 từ 50 ký tự không có dấu cách) + short 80 + partner 120 + mô tả 500 + terms 1000: ở 375 lưới 1 cột rộng 696 px (>375), thẻ bị cắt bên phải, trang không cuộn ngang vì overflow-x hidden. Hộp chi tiết ở 375 dạng bottom sheet cuộn được, nút Close thấy | Thêm promotion có Title 100 ký tự liền (không dấu cách) hoặc từ dài; mở Resident ở 375: thẻ rộng 696 px | Trung bình |
| U412 | Đạt | Hộp ở 375: Close 44x44, Claim 58x44, Save 77x44, sao 44x44, chip 44; nền mờ (backdrop 0,4); Esc đóng. Chưa kiểm "thẻ phía sau không cuộn" |  | Trung bình |
| U413 | Chưa kiểm được | Chưa dựng promotion không ảnh bìa/disabled ở nhiều trạng thái (chỉ thấy khung thay thế biểu tượng tag khi không có ảnh) |  | Thấp |
| U414 | Chưa kiểm được | Chưa đo tương phản huy hiệu Resident |  | Cao |
| U415 | Đạt | 375: tên 124 ký tự cắt bằng dấu ba chấm (h3 rộng 261, scrollWidth 1560), nút trong khung, không cuộn ngang trang (369), thanh tab cuộn ngang (scrollWidth 809 > 337). Chưa kiểm "tab đang chọn luôn trong tầm nhìn" |  | Cao |
| U416 | Không đạt | 375: Download 153x44, Remove 153x44, X nhắc 44x44, Upload 90x44, tab 44 cao, nhưng nút "Filters" 41x44 (rộng 41 < 44) | Mở /client/documents.html ở 375 cảm ứng, đo nút Filters: 41x44 | Cao |
| U417 | Đạt | "· Almost full" và "· Full" nằm trong chữ; aria-label của thanh nêu cùng thông tin ("...used, full"). Chưa đo tương phản |  | Trung bình |
| U418 | Đạt | 375: hộp Upload (369x617) và Unlock (369x591) vừa khung, nút Cancel/Add document/Unlock cao 44, lỗi "Choose a file to upload." kèm aria-invalid="true". Chưa mở hộp W-9 ở 375, chưa giả lập bàn phím ảo |  | Trung bình |
| U419 | Đạt | Tương phản: sáng "Expired" 4,55, "Expires in" 4,57, thanh nhắc 4,55/4,57, meta 5,56; tối 8,58/9,57/6,94 (đều ≥ 4,5) |  | Cao |
| U420 | Đạt | 375: lưới thẻ 2 cột (166 px), 830: 2 cột, 1440: 4 cột; không cuộn ngang; hai nút Open Ticket box / Open Messages 143x44 và 142x44 |  | Cao |
| U421 | Đạt | Subject 120 ký tự liền ở 375: dòng queue 343x88 (≥44), không tràn phải. Chưa thử tên người gửi 80 ký tự |  | Trung bình |
| U422 | Chưa kiểm được | Đã thấy chữ ghi chú và banner theo từng trạng thái, chưa đọc màu tone (danger/warning/info/success) |  | Cao |
| U423 | Đạt | Queue trống: "The Support queue is clear" + "New requests from Staff and Clients appear here the moment they are sent."; tin: "Nothing unread" + "You are all caught up" + "Every conversation has been read." |  | Thấp |
| U424 | Đạt | Tương phản: nhãn "Live" sáng 4,89/tối 9,47, "Sample data" 16,4/14,5, thẻ nhãn/ghi chú 5,56 sáng và 6,94 tối, số 15,5/17,2; "Show all 8" cao 44 (rộng 85) ở 375 |  | Trung bình |
| U425 | Không đạt | /admin/notifications.html ở 375: không cuộn ngang (369), chỉ 3 category (Messages, Properties, System), không ô Property, search 264x44, tab 44, Mark all 140x44, mục 44x44, nhưng nút "Filters" 41x44 (rộng 41 < 44). Chưa mở ở 830/1440 | Mở /admin/notifications.html ở 375 cảm ứng, đo nút Filters: 41x44 | Trung bình |
| X401 | Đạt | Đánh dấu dòng thứ 5 bằng nút: focus vẫn ở nút của chính dòng đó (không về đầu trang, scrollY 0) |  | Trung bình |
| X402 | Đạt | Sau "Mark all as read" focus ở tab "All" đang chọn (aria-selected true); toast trong vùng aria-live="polite" ("94 marked as read Undo") |  | Trung bình |
| X403 | Đạt | Bấm mục trong chuông -> /client/workspace.html; Back 1 lần về /client/dashboard.html, bell đã giảm, không vòng lặp |  | Trung bình |
| X404 | Đạt | (Phím tổng hợp qua dispatchEvent) `/` đưa focus vào #search; Esc trong ô tìm xóa chữ; ←/→ đổi tab 0->1->2->1; Esc trong Filters đóng và focus về #filters-btn |  | Trung bình |
| X405 | Đạt | Tooltip/title "Mark as read" khi chưa đọc, "Mark as unread" khi đã đọc; aria-label "Mark as read: <tên mục>"; toàn bộ chữ tiếng Anh |  | Thấp |
| X406 | Đạt | Client: tắt "New violation In-app" trong Notification settings (lưu ở client:eso-notif): trang 117 -> 92 dòng (mất 25 dòng Violations), chuông 93 -> 73; tắt hết In-app: 53 dòng, chuông 43. Ghi chú lỗi nhỏ: tắt riêng "Escalation In-app" không làm biến mất 25 thông báo "Violation escalated" (chúng bị công tắc "New violation" điều khiển) |  | Cao |
| X407 | Đạt | Staff Publish khi thiếu: lỗi cạnh ô (role=alert), có dòng "Still needed to publish: ...", focus vào #pf-title (ô lỗi đầu). Chưa kiểm "nhập xong lỗi tự biến mất" |  | Cao |
| X408 | Đạt | Claim: toast "Claimed. Your code is below.", mã nổi bật trong hộp "Your code"; Copy khi clipboard bị chặn: toast "Select the code and copy it." |  | Trung bình |
| X409 | Chưa kiểm được | Chưa thao tác bằng bàn phím thật ở sao/hộp |  | Trung bình |
| X410 | Chưa kiểm được | Chưa dựng |  | Thấp |
| X411 | Chưa kiểm được | Thấy tên tự điền theo tên file bỏ đuôi ("a" từ a.pdf) và lỗi aria-invalid; chưa kiểm focus vào ô lỗi đầu |  | Trung bình |
| X412 | Chưa kiểm được | Chưa thao tác bàn phím thật |  | Trung bình |
| X413 | Đạt | Đóng thanh nhắc hết hạn: focus sang nút X của thanh còn lại ("Dismiss the expiring documents reminder") |  | Thấp |
| X414 | Đạt | Hộp "Unlock the business W-9": "A new key goes to d•••••••••••••@amcllc.example.", "Capitals and dashes do not matter.", nút "New key in 5:00", lỗi nêu số lần thử còn lại, nút Cancel |  | Trung bình |
| X415 | Đạt | Hết chỗ: lỗi "Your document storage (10 GB) has no room for this file. Add storage in Capacity (+20 GB for $15.00/mo), then upload it again."; nút "Add storage" href /client/usage/capacity.html#storage |  | Cao |
| X416 | Chưa kiểm được | Chưa mở hộp (i) |  | Thấp |
| X417 | Đạt | Thẻ, dòng queue, dòng tin, hai nút đều là thẻ a có href; ba phần Sample data không có liên kết nào |  | Trung bình |
| X418 | Đạt | "Support queue" và "Unread messages" có nhãn "Live"; Platform at a glance, Platform health, Recent activity có nhãn "Sample data" |  | Thấp |
| X419 | Đạt | Dashboard không có nút nhận ticket/gán/xác nhận tại chỗ; chỉ liên kết sang Ticket box/Messages (Chờ quyết) |  | Thấp |
| X420 | Đạt | Bấm dòng queue -> /admin/tickets.html#/t/c905; Back -> trang "Admin Command Center" dashboard (persona adm-1) |  | Trung bình |
| S401 | Đạt | Cả 4 portal gõ `<script>alert(1)</script>` và `<img src=x onerror=alert(1)>` vào ô tìm: 0 alert, 0 img[src=x]; Client/Resident/Admin "No notifications match"; Staff trùng với tin nhắn chứa đúng chuỗi đó nên hiện 1 dòng dạng chữ |  | Nghiêm trọng |
| S402 | Đạt | 2 tin `<img src=x onerror=alert(1)>` và `<script>alert(1)</script>`: trang Staff và bảng chuông hiện nguyên chữ, 0 img[src=x], hook alert không bị gọi |  | Nghiêm trọng |
| S403 | Đạt | XSS: Search (2 chuỗi), Name khi upload và Business name W-9 (`<img src=x onerror=alert(1)>`): 0 alert, 0 img[src=x]; hàng W-9 mở khóa hiện chuỗi nguyên văn "<img src=x onerror=alert(1)>". Chưa kiểm aria-label Remove với tên XSS |  | Nghiêm trọng |
| S404 | Đạt | Staff nhập hai chuỗi XSS vào Title, Short, Description, Terms, Partner rồi Publish: Staff list và Resident (thẻ, hộp, chip) hiện nguyên chữ, 0 alert, 0 img[src=x]. Chưa thử Alt text, New category |  | Nghiêm trọng |
| S405 | Đạt | Gõ hai chuỗi XSS: 0 alert, "0 of 4 promotions", 0 img[src=x] (chữ "No matches" thấy với `zzzz`) |  | Nghiêm trọng |
| S406 | Đạt | Client gửi ticket Subject `<img src=x onerror=alert(1)>`, Message `<script>alert(1)</script>`: dashboard (dòng queue, aria-label, dòng tin), Admin Notifications: hiện nguyên chữ, 0 alert, 0 img[src=x] |  | Nghiêm trọng |
| S407 | Đạt | `?as=<script>alert(1)</script>` và `?as=res-1` -> persona mặc định Taylor Brooks (adm-1), không dữ liệu Resident, không alert; `#/t/<img ...>` ở /admin/tickets.html không alert, 0 img |  | Cao |
| S408 | Đạt | Dán 5.000 ký tự vào ô tìm: Notifications (5-6 ms), Promotions (1 ms), Documents (5 ms): không treo, không vỡ bố cục, hiện trạng thái rỗng |  | Trung bình |
| S409 | Không đạt | Tên 121 ký tự bị chặn "Use 120 characters or fewer."; tên 120 ký tự được nhận nhưng bản ghi lưu thành 124 ký tự (tên + ".pdf"), vượt 120. (Business name W-9 121 ký tự cũng bị chặn; chưa dán 5.000 ký tự thật) | Upload file pdf với tên 120 ký tự: eso-docs:client có name dài 124 | Cao |
| S410 | Không đạt | maxLength: Title 100, Short 80, Description 500, Terms 1000 (đúng); Partner và Promo code không có maxlength: dán 5000 ký tự vào Partner, Publish -> bản ghi lưu 5000 ký tự, thẻ Resident rộng 38344 px (mọi thẻ), nội dung bị cắt (overflow-x hidden) | Staff form: Partner dán 5000 chữ "P" + Publish; mở /resident/promotions.html: lưới thẻ rộng 38.344 px, thẻ không đọc được | Cao |
| S411 | Đạt | Ticket Subject 120 ký tự liền (maxlength 120) + Message 2000 (maxlength 2000): dashboard dòng T-3000 không tràn (375 và 1440), không cuộn ngang, nạp ≤ 2 s. (Ô chỉ nhận tối đa 120/2000 nên không dán 5.000 thật) |  | Cao |
| S412 | Chưa kiểm được | Chưa thao tác Tab thật ở chuông |  | Cao |
| S413 | Chưa kiểm được | Chưa thao tác chỉ bàn phím toàn trang |  | Cao |
| S414 | Chưa kiểm được | Chỉ kiểm Esc thật; chưa kiểm toàn bộ bằng bàn phím |  | Cao |
| S415 | Chưa kiểm được | Chưa thao tác bàn phím thật |  | Cao |
| S416 | Chưa kiểm được | Thẻ Platform alerts: click đưa focus vào "Platform health" (đạt); chưa kiểm thứ tự Tab và prefers-reduced-motion |  | Trung bình |
| S417 | Chưa kiểm được | Chưa đo vòng focus ở bốn khu vực |  | Cao |
| S418 | Đạt | Notifications: nhãn "Search notifications", "Category", "Sort by", role=tablist/tab/aria-selected, #summary và #count role=status, aria-live polite; Documents: 171 phần tử tương tác đều có tên, 4 dialog có aria-labelledby, 8 tab, 4 vùng status; Admin Notifications: 0 phần tử hiển thị thiếu tên (chỉ nút #more đang ẩn). Chưa quét Promotions Resident, Admin dashboard |  | Cao |
| S419 | Đạt | Mô phỏng zoom 200% ở 768 (khung 384): /client/notifications.html, /resident/promotions.html, /client/documents.html, /admin/dashboard.html: không cuộn ngang, 0 nút/liên kết ngoài khung, bảng Filters nằm trong khung (74-338). Chưa thử 720 px |  | Cao |
| S420 | Đạt | 384: /admin/dashboard.html không cuộn ngang, 0 điều khiển ngoài khung; /client/documents.html không cuộn ngang, hộp Upload rộng 378 nút trong khung |  | Cao |
| S421 | Chưa kiểm được | Không thể chèn 1.000 thông báo vào buildAll từ công cụ |  | Trung bình |
| S422 | Chưa kiểm được | Chưa chèn 1.000 promotion |  | Trung bình |
| S423 | Chưa kiểm được | Chưa chèn 1.000 tài liệu |  | Trung bình |
| S424 | Đạt | 1.009 ticket mở: dashboard sẵn sàng < 2,5 s (DOMContentLoaded 115 ms), đúng 6 dòng queue và 5 dòng tin, "Open tickets 1009". Chưa đo ≤ 100 ms mỗi lần cập nhật |  | Trung bình |
| S425 | Đạt | Sau gửi, nhập sai, nhập đúng, hết hạn: tìm khóa (hoa/thường, có/không gạch) trong localStorage, sessionStorage, cookie, URL: 0 kết quả; IndexedDB không có DB; console không có; mạng: không request URL chứa khóa. Chỉ có digest SHA-256 trong pending/issued |  | Nghiêm trọng |
| S426 | Không đạt | Sau khi mở khóa thành công và đóng hộp, #unlock-demo (hidden) vẫn chứa "Preview only: no email is sent. Your key is A8RU-BZH5-KJ2D-6S4T." trong DOM | Gửi khóa, nhập khóa để mở; đọc d.querySelector('#unlock-demo').textContent: còn nguyên khóa | Trung bình |
| S427 | Đạt | 2 lần sai, tải lại, 3 lần sai: lần 5 "Too many tries... dead"; nhập đúng sau đó bị từ chối (state ở localStorage nên dùng chung mọi tab; chưa thử mở tab thứ hai) |  | Cao |
| S428 | Đạt | Sửa bản ghi cover=`javascript:alert(1)`, plogo=`file:///x`, link=`javascript:alert(1)`: ảnh bị bỏ (img hidden, src null), không alert, không mở cửa sổ; link https dùng noopener,noreferrer |  | Nghiêm trọng |
| S429 | Đạt | Admin adm-1 và adm-2: dashboard, Notifications và danh sách chưa đọc không có chat/tin/emergency resident_support (Alex Rivera/Priya/Morgan Ellis không có trong Messages/Notifications của Admin). Chưa mở trang Messages Admin |  | Nghiêm trọng |
| S430 | Đạt | Với dữ liệu bình thường các trang Notifications (4 portal), Resident Promotions, Documents, Admin dashboard không phát sinh lỗi console của ứng dụng; các lỗi duy nhất là do chủ động đặt dữ liệu hỏng (D429 documents/store.js:77, D440 messaging/store.js:1316) và lỗi do script kiểm thử |  | Trung bình |
