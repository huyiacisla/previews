# Kết quả kiểm lại A1 (Messages, Ticket box) và A6 (định tuyến)

Ngày 2026-11-15. Người kiểm độc lập, không sửa mã, không commit. Chạy thật trên http://a1.localhost:3590 (một tab riêng, dữ liệu chỉ ở localStorage; đã xóa localStorage và sessionStorage của origin a1 khi xong). Mã nguồn có thể đang được sửa song song: kết quả là hành vi thấy gần nhất.

Quy tắc: không có bằng chứng = "Chưa kiểm được". % Đạt = Đạt ÷ (Tổng − Chưa kiểm được).

## Tổng hợp

| Phần | Nội dung | Kết quả |
|---|---|---|
| A | 21 dòng cũ (19 Không đạt + 2 Chưa kiểm được) | Chuyển sang Đạt: 4 (U119, F159, F194 từ Không đạt; S131 từ Chưa kiểm được). Còn Không đạt: 16 (13 cần sửa: F150, U102, U104, U105, X109, X120, X121, X122, S110, S118, S119, S123, S132; 3 ghi là Chờ quyết: F199, X108, X117). Còn Chưa kiểm được: 1 (F140) |
| B | R601–R625 (25 dòng) | Đạt 23, Không đạt 1 (R609), R620 là Chờ quyết (chỉ ghi hành vi, loại khỏi phép tính), Chưa kiểm được 0. % Đạt = 23 ÷ 24 = 95,8% (nếu tính R620 là Đạt như tệp 06: 24 ÷ 25 = 96,0%) |
| C | Hồi quy 59 dòng đang Đạt (≥ 40) | Đạt 59, Không đạt 0, hồi quy mới 0. Có 4 phát hiện mới ngoài tiêu chí (N1–N4, xem cuối tệp), đáng chú ý N1 (huy hiệu Messages ở thanh bên Admin sai: 2 so với 4 thật) |

Không đạt còn lại theo mức độ (phần A + B, không tính Chờ quyết): Cao 4 (U102, X120, X121, X122); Trung bình 4 (U105, S118, S119, S123); Thấp 6 (F150, U104, X109, S110, S132, R609). Chờ quyết: F199 (Thấp), X108 (Thấp), X117 (Cao).

Lưu ý quan trọng: bản sửa "focus sau Take/Resolve" chưa có tác dụng trong trình duyệt (S118). Các hạn chế: không dựng được nhóm 12 người (F140); R618 chưa thử bằng trình đọc màn hình thật; phần C chủ yếu gọi store trong console cho logic, giao diện thật chỉ kiểm ở các dòng ghi rõ.

## Bảng chi tiết

| ID | Kết quả mới | Kết quả cũ | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| F140 | Chưa kiểm được | Chưa kiểm được | Chỉ có 6 persona không phải Resident (tối đa 7 người) nên không dựng nhóm 12/13 người. store.createGroup tên 61 ký tự: bị cắt còn 60 (đúng) | | |
| F150 | Không đạt | Không đạt | res-1 có emergency chưa ack (c47): menu thread vẫn có "Pin, Flag, Mute, Hide conversation"; bấm Hide: toast "An open emergency cannot be hidden. Acknowledge it first." và không có hiddenConvs (dữ liệu an toàn) | Tiêu chí mong không có mục Hide; còn mục nhưng bị chặn có thông báo. Tái hiện: R1 có emergency > More actions | Thấp |
| U102 | Không đạt | Không đạt | localStorage eso-msg-v1 = `{bad`: mở /resident/messages-content.html: không hiện view-error (hidden), tự nạp lại 10 conv mẫu và ghi đè giá trị hỏng, không vòng lặp (không báo cho người dùng). Với dữ liệu hình dạng hợp lệ nhưng sai (convs:{c1:null}) hiện màn "Messages could not load" + Try again | Dữ liệu `{bad` bị thay âm thầm bằng mẫu, không có câu báo. Tái hiện: eso-msg-v1=`{bad`, tải trang. (Theo ghi chú báo cáo 05: chờ quyết định báo lỗi hay nạp lại mẫu) | Cao |
| U105 | Không đạt | Không đạt | 375 px, nút Do not disturb 119×44, aria-pressed đổi false/true. Chế độ tối: 11,39 (tắt). Chế độ sáng: chữ oklab(0.85) trên nền trắng = 1,57:1 ở cả tắt và bật, hai trạng thái giống hệt về mắt | Chữ nút DND tương phản 1,57:1 ở chế độ sáng; bật/tắt không khác nhau bằng mắt. Tái hiện: R1 sáng, nhìn #btn-dnd | Trung bình |
| U119 | Đạt | Không đạt | 375 px: Hide conversation > toast "Hidden. It is under Hidden whenever you want it back." + nút Undo 52×44 (đủ 44); bấm Undo: hiddenConvs trống, tab Hidden biến mất. Toast tồn tại mặc định 4,5 s | | |
| X108 | Không đạt [Chờ quyết] | Không đạt | Hành vi hiện tại: Resident (res-1, chat c58 Staff nhận rồi Resolve) thấy dòng "A member of the property team joined the chat.", "Property team closed this ticket. It is saved in the Ticket box.", tiêu đề "Property team"; Ticket box "Property team" (không còn tên). Nhưng thẻ audit vẫn hiện tên: "Status: Open → In progress Jordan Lee · 11:05 PM", "Status: In progress → Resolved Jordan Lee", và "Route: … Taylor Brooks" (Admin chuyển) | Tên nhân viên còn ở thẻ audit trong thread của Resident. Tái hiện: stf-1 Take + Resolve chat res-1, mở R1. Chờ quyết nên không tính vào lỗi cần sửa | Thấp |
| S110 | Không đạt | Không đạt | UI có maxlength. Tầng dữ liệu: tên nhóm 61 ký tự cắt còn 60 (đúng); Title announcement 121 ký tự lưu nguyên 121; 5000 ký tự: createGroup "name_required", broadcast "title_required", startSupport "subject_required" (mã sai) | Không cắt Title ở 120 và báo sai mã khi quá dài. Tái hiện: console store.broadcast(adm-1,{title:121 ký tự}) | Thấp |
| S118 | Không đạt | Không đạt | Bàn phím thật (Tab/Enter): Enter trên "Take conversation": assignee stf-1 nhưng document.activeElement = BODY (theo dõi mỗi 40 ms trong 900 ms, không bao giờ lấy lại focus); Enter trên Resolve: focus sang "Confirm resolve" (tốt); Enter trên Confirm resolve: closed/resolved_by_staff nhưng focus = BODY. Ô soạn msg-input không bị vô hiệu | Sau Take và sau Confirm resolve focus rơi về body (sửa "focus sau Take/Resolve" chưa có tác dụng). Nguyên nhân có thể: store phát sự kiện đồng bộ nên nút đã bị vẽ lại trước khi `act()` đọc document.activeElement. Tái hiện: Tab tới Take + Enter | Trung bình |
| S119 | Không đạt | Không đạt | Tắt transition rồi duyệt 35 điều khiển, sáng và tối: 32 điều khiển có vòng focus (outline hoặc shadow ≥1,5 px; tương phản tối thiểu 4,77 sáng, 3,06 tối). Nút (i) #btn-context nay có outline 2 px (đã sửa). Còn 2 nút không có vòng (box-shadow spread 0, outline none): "Take conversation" và "Move to Support"; dòng danh sách dùng vạch inset 3 px bên trái | Nút Take conversation và Move to Support (nút trong thread-actions) không có vòng focus nhìn thấy. Tái hiện: Tab tới nút, xem box-shadow | Trung bình |
| S131 | Đạt | Chưa kiểm được | Giao diện không cho nhập chữ tự do vào chủ đề ticket Resident, nên chèn trực tiếp conv.topic = `<img src=x onerror=window.__xss131=1>` vào eso-msg-v1 (c47 của res-1) rồi mở bảng (i) của chat c58 ở Staff: mục "Recent tickets" hiện đúng chuỗi như chữ thuần, 0 phần tử img trong bảng, không chạy script. (Bằng chứng bằng dữ liệu chèn tay) | | |
| S132 | Không đạt | Không đạt | 375 px: chip reaction "👍2" cao 32 px (rộng 47), aria-label "👍 You, Sam Okafor. Tap to remove your reaction.", elementFromPoint cách 20 px bên ngoài không trúng chip (không có vùng chạm mở rộng) | Chip reaction < 44 px. Tái hiện: 375 px, thread có reaction, đo chip | Thấp |
| R601 | Đạt | (mới) | 1440 px: bấm "Talk to a person": bot "Who should I pass this to? The Property team handles parking, vehicles, permits, guests and violations. EasySpotOps Support handles problems with the app itself." kèm nút Property team, EasySpotOps Support, Back to topics; status vẫn "bot" | | |
| R602 | Đạt | (mới) | Bấm Talk to a person > Property team: status queued, route property; stf-1 thấy chat; adm-1 không thấy; Resident thấy tiêu đề "Property team", phụ đề "Waiting for the property team" | | |
| R603 | Đạt | (mới) | Chọn EasySpotOps Support: queued, route platform; Admin Queue dòng "Platform support · Unit 02-291 · General question"; stf-1 không thấy (get và listFor); Resident tiêu đề "EasySpotOps Support", dòng "Your request was sent to EasySpotOps Support." | | |
| R604 | Đạt | (mới) | "someone is in my spot" và "my guest got a violation": bot trả lời theo chủ đề đỗ xe/khách và chỉ đề nghị "Talk to a person" (Property), không có nút Support | | |
| R605 | Đạt | (mới) | "app crashes", "I cannot log in", "notification never arrives", "the page is blank": bot trả lời và đề nghị nút "EasySpotOps Support" | | |
| R606 | Đạt | (mới) | "talk to someone about my car app", "I need a human", "talk to easyspotops team": đều hỏi "Who should I pass this to?", status vẫn bot (không đoán). "car app problem" cũng không đoán (trả menu chủ đề) | | |
| R607 | Đạt | (mới) | "my car is on fire", "there is smoke in the garage", "...blocking the exit and I am bleeding": bot "If anyone is in danger right now, call 911 first. I am sending this to the property team straight away." route property, queued; không đi Support | | |
| R608 | Đạt | (mới) | Admin (adm-1) mở chat c58 queued: nút "Move to Property" > "Confirm: move to Property": route property; Staff thấy, Admin không thấy; Resident thấy "Your request was moved to the property team. They have the summary, so you do not need to repeat yourself."; thẻ summary giữ nguyên. Lưu ý: Admin thấy thêm toast "This conversation is no longer available." sau khi chuyển | | |
| R609 | Không đạt | (mới) | Dữ liệu: conv.summary = {topic, route:"property", asked, details:[câu Resident đã gõ]}. Giao diện Staff (stf-1, chat c114): thẻ "Summary from the assistant, so you do not need to ask again" hiện Topic "General question", Asked "Report a parking violation", Details "Someone parked in the fire lane near building 2" nhưng KHÔNG có dòng nơi đã chọn (Property/Support); nơi chỉ thấy ở dòng danh sách ("Property · Unit 05-114 …") | Thẻ tóm tắt không ghi nơi Resident đã chọn (route có trong dữ liệu nhưng không vẽ trong thẻ). Tái hiện: R1 gõ "Someone parked in the fire lane...", Talk to a person > Property team; S1 mở chat | Thấp |
| R610 | Đạt | (mới) | Dữ liệu hình dạng hợp lệ nhưng sai: màn "Messages could not load" + "Try again" + "Reference: TypeError at 2026-11-15 07:08 UTC". Lưu ý: dòng mô tả ghi "Could not save. Browser storage may be full or blocked." (chữ hơi sai khi lỗi là khi tải) | | |
| R611 | Đạt | (mới) | Màn lỗi có mailto:support@easyspotops.example và tel:+19165550100, dòng "In an emergency, call 911"; 375 px: mailto 209×44, tel 101×44, Try again 79×44, scrollWidth 375 | | |
| R616 | Đạt | (mới) | res-1 chọn EasySpotOps Support 3 lần liên tiếp (3 chat queued); lần 4: không vào hàng, bot "You already have 3 requests with EasySpotOps Support today. They will reply to those first. For anything about the building, I can pass it to the property team." + nút Property team | | |
| R617 | Đạt | (mới) | Lời bot không chứa tên người (đọc các câu trả lời ở trên). Ghi chú: FAQ có câu về thời gian xử lý ("usually reviewed within one business day", "approved the same business day") là nội dung mẫu, không phải hứa thời gian trả lời của đội | | |

| F159 | Đạt | Không đạt | Staff stf-2 Resolve chat Resident c53 rồi mở lại: menu tin của mình: "Unsend for everyone" disabled, tooltip "This conversation is closed" (Copy text và Delete for me vẫn dùng được) | | |
| F194 | Đạt | Không đạt | Client Ticket box > chọn ticket c71 > Copy link: nội dung sao chép (bắt writeText) = `http://a1.localhost:3590/client/tickets.html?as=cli-1#/t/c71`, toast "Link copied."; mở địa chỉ đó: trang có khung portal (iframe tickets-content ... #/t/c71) hiện đúng T-1087 "Report export fails". "Open in Messages" -> /client/messages.html?as=cli-1#/c/c71 | | |
| F199 | Không đạt [Chờ quyết] | Không đạt | adm-2 Announce "Casey notice" (c73); A1 (adm-1) tab Sent hiện cả "Casey notice – Announcement from Casey Ng" lẫn announcement của chính adm-1. Staff: announcement chỉ ở tab All (đã chấp nhận) | Tab Sent của Admin lẫn announcement của Admin khác. Chờ quyết (câu 22) nên không tính vào lỗi cần sửa | Thấp |
| U104 | Không đạt | Không đạt | 768 px: bảng chi tiết (410–762 px, cao 0–1024, position fixed) phủ lên ô soạn (944–1000) — elementFromPoint tại nút Send (655–734) và giữa ô soạn trả "context-pane". Đã sửa một phần: sau F5 bảng và cờ eso-msg-context ("1") khớp (bảng hiện), bấm (i) lần đầu đóng (cờ "0"), lần hai mở. Ở 1440 px ba khung không chồng (đã đo ở lần trước) | Màn hẹp: bảng chi tiết che ô soạn và nút Send khi đang mở. Tái hiện: Staff 768 px > mở thread > bấm (i) | Thấp |
| X109 | Không đạt | Không đạt | Phím thật: "/" focus #list-search; Ctrl+K focus #list-search (nút "+ unit/status/priority/assignee/tag/route/after/before" hiện). Alt+N: nhảy sang chat chưa đọc kế tiếp (hash đổi sang #/c/c18), không mở hộp New | Alt+N không mở "New". Tái hiện: Staff nhấn Alt+N | Thấp |
| X117 | Không đạt [Chờ quyết] | Không đạt | Có tác dụng: "Show when I have read a message" (Client tắt: tin Staff vẫn "sent" dù readBy có cli-1; bật: "read"), Enter (chưa đổi lại lần này). Không tác dụng: msgAway, msgSound, emSms chỉ xuất hiện trong src/staff/account-settings.staff.js (không mã nào đọc). Thử SMS: eso-proto {emSms:false}; emergency c53 lùi 4 phút, tick: vẫn ghi "Escalation: None → SMS and critical alert sent (simulated)" | Away reply, Sound, SMS emergency chưa nối. Chờ quyết (câu 27) nên không tính vào lỗi cần sửa | Cao |
| X120 | Không đạt (theo quyết định #5) | Không đạt | stf-2 (Sam Okafor, Leasing Agent) với chat Resident c53: acknowledgeEmergency, claim, send, setTicketState(waiting), resolve đều {ok:true}; stf-1 là Property Manager | Quyền Staff không phân theo chức vụ. Tái hiện: store.claim/resolve/acknowledgeEmergency bằng stf-2 | Cao |
| X121 | Không đạt (theo quyết định #5) | Không đạt | Không có thao tác nào bị giới hạn theo chức vụ: không thấy thông báo "Your role cannot do that." (xem X120) | cùng nguyên nhân X120 | Cao |
| X122 | Không đạt (theo quyết định #5) | Không đạt | Như X120: tầng dữ liệu không trả not_allowed theo chức vụ | cùng nguyên nhân X120 | Cao |
| S123 | Không đạt | Không đạt | Thread 1010 tin (1000 tin nạp vào c8): mở thread từ dòng danh sách 1220 ms (>1 s); gửi 1 tin: tin hiện sau 1255 ms, nhịp 10 ms bị chặn 1239 ms (>500 ms); DOM có 1010 phần tử tin (không ảo hóa). Lần trước: 781/755 ms | Mở thread và gửi tin ở thread 1000 tin chặn luồng chính ~1,2 s, mở >1 s. Tái hiện: nạp 1000 tin vào 1 conv, mở, gửi | Trung bình |

| R612 | Đạt | (mới) | Resident (res-1, 375 px) làm đầy localStorage tới QuotaExceeded rồi gửi "Lost pass, need replacement": tin ở lại trong thread, nhãn "Not sent", "Could not save. Browser storage may be full or blocked." + nút Retry, Discard và link "Still not sending? Email EasySpotOps Support" (mailto); DB không thêm tin; Retry khi còn đầy: vẫn lỗi; dọn chỗ rồi Retry: đúng 1 tin trong DB, hộp lỗi biến mất | | |
| R613 | Đạt | (mới) | Resident bật chế độ offline (eso-msg-offline=1) rồi gửi: tin "Waiting for connection", băng "You are offline. Messages will not send until the connection is back.", OUTBOX eso-msg-outbox:res-1 có 1 mục, DB +0; tắt offline: tin vào DB (đủ), OUTBOX bị xóa | | |
| R614 | Đạt | (mới) | Menu hồ sơ ("Open profile menu for …") của cả 4 portal (res-1 messages, stf-1, cli-1, adm-1 dashboard) có "Contact support" = mailto:support@easyspotops.example?subject=Help… (không đi qua Messages) | | |
| R615 | Đạt | (mới) | store.startDirect res-1→adm-1, res-2→adm-2, res-1→stf-1: use_assistant; startSupport bởi res-1: not_allowed; canMessage('resident','admin') false; DB.convs không đổi | | |
| R618 | Đạt | (mới) | 375 px: "Property team" 107×44, "EasySpotOps Support" 152×44, "Back to topics" 106×44 (mọi lựa chọn nhanh cao 44); là button thật tabIndex 0 (dùng được bằng bàn phím, đọc được tên); scrollWidth 375. Chưa thử bằng trình đọc màn hình thật | | |
| R619 | Đạt | (mới) | Admin Queue: dòng "Platform support · Unit 02-291 · General question" (c105); Staff: "Property · Unit 05-114 · …". Lọc route:platform (Admin 2 dòng, Staff 1 = ticket support của chính Staff), route:property (Staff 2 dòng, Admin 0), route:support; chip "route: platform ×" | | |
| R620 | Đạt (theo quyết định, ghi hành vi) [Chờ quyết] | Chờ quyết | Hành vi hiện tại: Resident chỉ tới EasySpotOps Support qua bot (nút lựa chọn nơi); không nhắn trực tiếp Admin (R615) | | |
| R621 | Đạt | (mới) | 375 px: chat chỉ với trợ lý (đã hiện câu hỏi chọn nơi) bấm End chat > Confirm end chat: tiêu đề "EasySpotOps Assistant", phụ đề "Ended", dòng "You ended this chat.", không thẻ "Status: Open → Closed", không ticketNo, không vào Ticket box. Hết giờ (updatedAt lùi 20 phút, tick): closed/timeout, "Chat closed after a period of inactivity.", tiêu đề vẫn "EasySpotOps Assistant", phụ đề "Ended" | | |
| R622 | Đạt | (mới) | Chọn Property team rồi End chat: tiêu đề "Property team", "You ended this chat. The ticket is saved in the Ticket box.", ticketNo 1086, có trong Ticket box res-1 | | |
| R623 | Đạt | (mới) | Chọn EasySpotOps Support rồi End chat: tiêu đề "EasySpotOps Support", cùng dòng, ticketNo 1087, có trong Ticket box. Ghi chú: cả R622 và R623 còn thẻ audit "Status: Open → Closed Alex Rivera" (tên chính Resident) | | |
| R624 | Đạt | (mới) | adm-2 claim + resolve chat route platform: dòng "EasySpotOps Support closed this ticket. It is saved in the Ticket box."; stf-2 làm với route property: "Property team closed this ticket. It is saved in the Ticket box."; hai dòng này không có tên. LƯU Ý: ngay cạnh là thẻ audit "Status: In progress → Resolved <tên>" vẫn hiện tên Admin (Casey Ng) hoặc Staff cho Resident (xem X108) | | |
| R625 | Đạt | (mới) | Resident 375 px: vào chat trợ lý ngay (hash #/c/…): nút Back 44×44 nhãn "Messages" hiện sẵn; bấm: về danh sách, hash được dọn; không có nút "Conversations" riêng (0 nút) | | |

### Phần C: hồi quy trên 59 dòng đang "Đạt" (vùng đã thay đổi)

Cách kiểm: dữ liệu mẫu nạp lại (Reset demo data qua store.reset), thao tác qua store trong console (các hàm giống giao diện gọi), kèm kiểm giao diện thật ở 375 và 1440 px, bàn phím thật. Mã trả lời bot/tạo chat dùng đường đi thật (store.choose, store.send, ensureSession).

| ID | Kết quả mới | Kết quả cũ | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| F101 | Đạt | Đạt | ensureSession res-1: đúng 1 conv bot, 2 tin, 7 lựa chọn nhanh | | |
| F102 | Đạt | Đạt | Guest parking > Request a guest pass > Yes, thanks: closed/resolved_by_assistant, không ticketNo, không vào Staff list hay Ticket box | | |
| F103 | Đạt | Đạt | "asdfgh" lần 1 hỏi lại, lần 2 đề nghị "Talk to a person", status vẫn bot | | |
| F105 | Đạt | Đạt | Talk to a person > Property team: queued, ticketNo 1086, có summary, Staff Queue có dòng | | |
| F106 | Đạt | Đạt | Take: dòng "A member of the property team joined the chat." (Resident không thấy tên ở dòng này) | | |
| F107 | Đạt | Đạt | stf-1 claim ok; stf-2 claim: already_taken; đúng 1 dòng joined; stf-2 không thấy chat | | |
| F108 | Đạt | Đạt | Staff trả lời chat queued không bấm Take: assignee stf-1, active; stf-2 không thấy trong list | | |
| F109 | Đạt | Đạt | Resolve: closed/resolved_by_staff; Resident và Staff gửi tiếp: reason "closed" | | |
| F110 | Đạt | Đạt | Resolve chat queued: not_allowed, status vẫn queued | | |
| F111 | Đạt | Đạt | rate up ok; rate down lần hai not_allowed; csat giữ "up" | | |
| F112 | Đạt | Đạt | End chat ở bot, queued, active: cả ba closed/resident_ended | | |
| F113 | Đạt | Đạt | Bot im lặng 16 phút (updatedAt lùi), tick: closed/timeout | | |
| F114 | Đạt | Đạt | c18 active lùi 12h05, tick: closed/timeout, câu "closed after a period of inactivity… saved in the Ticket box"; queued lùi 3 ngày vẫn queued | | |
| F115 | Đạt | Đạt | Waiting on resident: stage waiting_on_resident; Resident trả lời: in_progress, waiting false | | |
| F116 | Đạt | Đạt | Staff startDirect tới res-2: Resident thấy thread | | |
| F117 | Đạt | Đạt | Tin thứ 2 khi chưa trả lời: awaiting_reply; Resident trả lời, Staff gửi tiếp được | | |
| F123 | Đạt | Đạt | Admin startDirect tới res-3; res-3 gửi: one_way | | |
| F125 | Đạt | Đạt | Staff–Client Resolve: ticketNo 1091 (cũ không đổi), dòng "Jordan Lee marked this resolved. It is saved in the Ticket box. Reply to reopen it."; có trong Ticket box của Staff và Client | | |
| F127 | Đạt | Đạt | Client gửi sau Resolve: resolvedAt null, ticketNo giữ 1091 | | |
| F128 | Đạt | Đạt | startDirect lần hai: dùng lại cùng thread, chỉ 1 conv direct; Client không có action resolve | | |
| F129 | Đạt | Đạt | startSupport cli-1: kind support, open, ticketNo 1092, Admin Queue có dòng | | |
| F131 | Đạt | Đạt | Admin trả lời: assignee adm-1, pending; Client trả lời: open | | |
| F132 | Đạt | Đạt | Resolved có resolvedAt; Client trả lời: open, cùng ticketNo | | |
| F134 | Đạt | Đạt | Client đổi status/priority: not_allowed | | |
| F145 | Đạt | Đạt | Announce "DND test": băng ack read 0 / total 8 (0%) | | |
| F151 | Đạt | Đạt | Staff gửi "Xin chào 😀": +1 tin, text khớp, from stf-1, at trong 5 s | | |
| F152 | Đạt (tầng dữ liệu) | Đạt | Tin 5 dấu cách: store trả "empty". Chưa đo lại nút Send disabled ở giao diện lần này | | |
| F153 | Đạt | Đạt | 2000 ký tự nhận; 2001: too_long (max 2000) | | |
| F154 | Đạt | Đạt | Gửi hai lần cùng clientId: 1 tin trong DB | | |
| D101 | Đạt | Đạt | cùng bằng chứng F154 (mỗi lần gửi +1 tin, không trùng) | | |
| F157 | Đạt | Đạt | Edit: chỉ text và editedAt đổi, số tin giữ nguyên (11 → 11) | | |
| D108 | Đạt | Đạt | cùng bằng chứng F157 | | |
| F158 | Đạt | Đạt | Lùi 16 phút: edit và unsend too_late; sửa tin người khác not_allowed | | |
| D109 | Đạt | Đạt | Unsend trong 15 phút: deleted true, text rỗng, bản ghi còn | | |
| F160 | Đạt | Đạt | 👍 → ❤️ → ❤️ lần nữa: {👍} → {❤️} → {}; "abc": invalid_emoji | | |
| D110 | Đạt | Đạt | cùng bằng chứng F160 (mỗi user tối đa 1 emoji) | | |
| F161 | Đạt | Đạt | Reply: replyTo là id tin cùng thread; reply tin đã gỡ: invalid_reply | | |
| D131 | Đạt | Đạt | cùng bằng chứng F161 | | |
| F167 | Đạt | Đạt | Ẩn tin và ẩn thread: chỉ prefs[stf-1], stf-2 không đổi; tin gốc còn trong DB | | |
| D111 | Đạt | Đạt | cùng bằng chứng F167 | | |
| F168 | Đạt | Đạt | Pin thread: prefs chỉ có stf-1 | | |
| D112 | Đạt | Đạt | cùng bằng chứng F168 | | |
| D107 | Đạt | Đạt | 9 persona: badgeCount = tổng unread theo dòng = tự đếm (res-1 35, res-2 3, res-3 3, stf-1 9, stf-2 3, cli-1 3, cli-2 8, adm-1 7, adm-2 10) | | |
| U127 | Đạt | Đạt | Badge Staff 9 → đọc c130: 8 → đánh dấu chưa đọc: 9 | | |
| D127 | Đạt | Đạt | cùng bằng chứng U127 (markUnread chỉ phía stf-1) | | |
| F171 | Đạt | Đạt | res-2 bật DND: badge 5 → 2, prefs[res-2].dnd true | | |
| S112 | Đạt | Đạt | startSupport(res-1), broadcast(stf-1), createGroup(cli-1), claim(cli-1), resolve(cli-1): đều not_allowed | | |
| S113 | Đạt | Đạt | Đính kèm url https và javascript:: bad_attachment. (data text/html và application/x-msdownload vẫn được store nhận, như ghi chú cũ F166) | | |
| S114 | Đạt | Đạt | res-1 mở chat c8 của res-2: not_found | | |
| S115 | Đạt | Đạt | adm-1 mở chat Resident c8: not_found; Ticket box Admin không có | | |
| S116 | Đạt | Đạt | cli-2 mở ticket c137 của cli-1: not_found | | |
| F183 | Đạt | Đạt | Staff Ticket box sau Reset: tab Open 1, Closed 2, All 3 (trên giao diện, sau khi tôi Resolve c8) và đếm store 2/1/3 trước đó; Open + Closed = All. Ghi chú: dữ liệu mẫu hiện không còn T-1086 của res-1 (c1 là chat bot-only) nên số khác lần trước (3/1/4) | | |
| F184 | Đạt | Đạt | res-1 không có ticket (c1 bot-only); res-2 T-1081; res-3 T-1082; stf-1 T-1081, T-1082, T-1084; cli-1 rỗng; cli-2 T-1083; adm-1 T-1083, T-1084, T-1085 | | |
| F185 | Đạt | Đạt | "T-1081": 1 dòng; "status:open": 1 dòng (chỉ chat đang ở giai đoạn Open); chuỗi lạ: 0 dòng | | |
| F193 | Đạt | Đạt | Export ở Ticket box Staff: tải "T-1082.txt" chứa subject, Status, Requester, Unit, Assigned to, mốc ISO, "Exported by", hội thoại | | |
| S117 | Đạt | Đạt | 1440 px, phím thật: gõ "keyboard only note" + Enter: DB +1 tin, focus ở lại #msg-input. (Ở 375 px mô phỏng cảm ứng, Enter xuống dòng theo thiết kế vì `pointer: coarse`) | | |
| U107 | Đạt | Đạt | 375 px: chỉ hiện danh sách; mở thread thì thread thay danh sách; Back 44×44; ô soạn trong khung nhìn; scrollWidth 375 | | |
| U110 | Đạt | Đạt | 375 px: Back 44×44, Send/nút trong thread cao 44, Take/Move/Waiting/Resolve cao 44 (Resolve 95×44, đo lần đầu); chỉ có tab "All" rộng 40×44 | | |
| U118 | Đạt | Đạt | 375 px: tin 300 chữ "W" liền và đoạn 2000 ký tự: scrollWidth 375, bong bóng nằm trong khung | | |

Hồi quy mới (dòng đang Đạt mà nay hỏng): không có dòng nào trong 59 dòng đã kiểm.

### Phát hiện mới ngoài danh sách tiêu chí (cần theo dõi)

| Mã | Nội dung | Bằng chứng | Mức độ |
|---|---|---|---|
| N1 | Huy hiệu Messages ở thanh bên của cổng Admin không khớp số chưa đọc thật | adm-1: store.badgeCount = 4 (c29 có 2, c37 có 2), tiêu đề Messages "(4)"; thanh bên /admin/dashboard.html ghi "Messaging & Support" 2, aria "2 unread". Resident (1), Staff (3), Client (2) khớp | Trung bình |
| N2 | Resident thấy tên Admin hoặc Staff ở thẻ audit "Status: … → …" | res-1 chat route platform bị adm-2 Resolve: thẻ "Casey Ng"; route property: "Jordan Lee"/"Sam Okafor" (xem X108, R603, R624) | Thấp (đang Chờ quyết với Staff; với Admin trái chữ R603 "không lộ tên Admin") |
| N3 | Sau Admin "Move to Property", Admin thấy toast "This conversation is no longer available." | R608 (cùng lúc toast "Moved to the Property team…" xuất hiện) | Thấp |
| N4 | Màn lỗi tải Messages ghi "Could not save. Browser storage may be full or blocked." cho lỗi khi tải | R610 | Thấp |
