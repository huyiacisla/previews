# Kết quả kiểm lại lượt 3: A1 (Messages, Ticket box) và A6 (định tuyến)

Ngày 2026-11-15. Người kiểm độc lập, không sửa mã, không commit. Chạy thật trên http://a1.localhost:3590 (một tab riêng, tối đa 1 tab, đã đóng). Dữ liệu chỉ ở localStorage; đã xóa localStorage và sessionStorage của origin a1, viewport về desktop. Nguồn: `07-ket-qua-lai-A1.md` (lượt 2), `03-tieu-chi-A1-messages-tickets.md`, `06-tieu-chi-A6-dinh-tuyen.md`, `01-quyet-dinh-chu-du-an.md`. Mã nguồn có thể đang được sửa song song: ghi hành vi thấy gần nhất.

Quy tắc: không có bằng chứng = "Chưa kiểm được". % Đạt = Đạt ÷ (Tổng − Chưa kiểm được).

## Tổng hợp

### Phần A: 17 dòng cũ (16 Không đạt + 1 Chưa kiểm được) + R609

| Kết quả | Số dòng | ID |
|---|---|---|
| Chuyển sang Đạt | 7 | X108, X117, X120, X121, X122, S110 (xem ghi chú), S118; kèm R609 (A6) |
| Còn Không đạt | 9 | F150, U102, U104, U105, X109, S119, S123, S132, F199 (F199 là Chờ quyết) |
| Còn Chưa kiểm được | 1 | F140 |

### Số liệu toàn bộ tiêu chí A1 (218 dòng; dòng không kiểm lại giữ kết quả lượt 2)

| Đạt | Không đạt | Chưa kiểm được | Tổng | % Đạt = Đạt ÷ (Tổng − Chưa kiểm được) |
|---|---|---|---|---|
| 208 (201 cũ + 7 mới) | 9 | 1 | 218 | 208 ÷ 217 = 95,9% |

Lượt 2 là 201 ÷ 217 = 92,6%.

A6 (R601–R625, 25 dòng, nằm trong tệp 07): Đạt 24 (R609 chuyển sang Đạt), R620 là Chờ quyết (chỉ ghi hành vi, loại khỏi phép tính), Không đạt 0. % Đạt = 24 ÷ 24 = 100%.

### Phần C: hồi quy

57 dòng đang Đạt ở vùng đã đổi (≥ 40): Đạt 57, Không đạt 0, hồi quy mới 0. Có 3 phát hiện mới (N5–N7, cuối tệp), đều không thuộc dòng tiêu chí đang Đạt.

### Không đạt còn lại theo mức độ

Cao 0; Trung bình 3 (U105, S119, S123); Thấp 6 (F150, U102 xem ghi chú, U104, X109, S132, F199 [Chờ quyết]). Mức độ gốc trong tiêu chí: U102 Cao, F150 Cao, S119 Cao, S123 Cao; mức ghi ở bảng là đánh giá của người kiểm lượt này theo tác động thật (xem từng dòng).

Ghi chú quan trọng:
- S110: giao diện (cách kiểm của tiêu chí: dán/gõ vào ô) cắt đúng: Title announcement gõ 140 ký tự còn 120 (gõ thật); ô tên nhóm maxlength 60, Subject 120 (đọc thuộc tính). Tầng dữ liệu vẫn lỏng (Title 121 lưu nguyên; 5000 ký tự báo mã sai) nên ghi là "Đạt (giao diện)", để chủ dự án quyết nếu muốn bắt buộc cả tầng dữ liệu.
- U102 vẫn như lượt 2: `eso-msg-v1` = `{bad` tự nạp lại dữ liệu mẫu, không báo gì (không trang trắng, không vòng lặp).
- X120/X122: tầng dữ liệu trả `{ok:false, reason:"role"}` (không phải `not_allowed` như chữ tiêu chí). Ý chính (bị từ chối, DB không đổi) đạt nên tính Đạt.

## Bảng chi tiết phần A (17 dòng cũ + R609)

| ID | Kết quả mới | Kết quả cũ | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| F140 | Chưa kiểm được | Chưa kiểm được | Chỉ có 8 persona không phải Resident; createGroup 6 thành viên (đã lặp id) ok; id giả bị `not_allowed`. Không dựng được nhóm 12/13 người. Tên 61 ký tự cắt còn 60 (đúng) | | |
| F150 | Không đạt | Không đạt | res-3 có emergency chưa ack (chat c18): menu "More actions" ở thread vẫn có "Pin, Flag, Mute, Hide conversation" (đọc DOM menu thật) | Tiêu chí mong không có mục Hide cho thread emergency; còn mục (lượt 2 ghi: bấm thì bị chặn kèm thông báo, dữ liệu an toàn). Tái hiện: R(res-3) có emergency chưa ack > More actions | Thấp |
| U102 | Không đạt | Không đạt | `eso-msg-v1` = `{bad`, mở `/staff/messages-content.html`: `#view-error` ẩn, danh sách tải lại 9 chat mẫu, giá trị hỏng bị ghi đè, không người dùng nào được báo | Dữ liệu hỏng bị thay âm thầm bằng mẫu, không hiện view-error có nút thử lại. Tái hiện: đặt `eso-msg-v1`=`{bad`, tải trang | Thấp (không mất khả năng dùng; tiêu chí gốc Cao) |
| U104 | Không đạt | Không đạt | 768x1024: sau bấm (i) bảng context-pane x410–762, cao toàn trang, `position:fixed`; ô soạn x188–647 và Send x655–734 nằm dưới bảng: `elementFromPoint` ở giữa ô soạn và nút Send trả `context-body`. 1024x768: bảng x666–1018 phủ nửa Send (ô soạn x564–895). F5 nhớ cờ `eso-msg-context` (1/0) đúng | Màn hẹp: bảng chi tiết che ô soạn và Send khi mở. Tái hiện: Staff 768 px > mở thread > bấm (i) | Thấp |
| U105 | Không đạt | Không đạt | 375 px: `#btn-dnd` 119×44, `aria-pressed` false/true đổi đúng. Tối: tắt 11,39:1 / bật 13,34:1. Sáng, tắt: chữ oklab(0.85) trên nền trắng = 1,57:1 | Chữ nút Do not disturb 1,57:1 ở chế độ sáng. Tái hiện: R1 sáng, nhìn `#btn-dnd` | Trung bình |
| X108 | Đạt | Không đạt [Chờ quyết] | stf-1 Take + Resolve chat res-1: dòng "A member of the property team joined the chat.", "Property team closed this ticket…", thẻ audit "Status: Open → In progress" có actorName "The property team", "Status: In progress → Resolved" cũng "The property team". Chuyển Support: thẻ audit "Route: Property team → EasySpotOps Support" actor "The property team"; Admin xử lý: "EasySpotOps Support" (không lộ Jordan Lee, Sam Okafor, Taylor Brooks, Casey Ng) | | |
| X109 | Không đạt | Không đạt | Phím thật Alt+N ở danh sách: hash đổi sang `#/c/c18` (chat chưa đọc kế tiếp), không hộp thoại "New" nào mở. (Lượt 2: "/" và Ctrl+K focus ô tìm đúng) | Alt+N không mở "New". Tái hiện: Staff nhấn Alt+N | Thấp |
| X117 | Đạt | Không đạt [Chờ quyết] | Cả sáu công tắc nay có tác dụng: (1) SMS: `eso-proto`={emSms:false}, emergency lùi 4 phút, app tự tick sau ≤30 s: "Escalation: None → Critical alert sent (no SMS: switched off in Settings)". (2) Away reply: `eso-status`={s:"away"} + msgAway:true, Resident res-3 gõ thật và Enter: hệ thống chèn "The property team is away right now. Someone will answer as soon as they are back." (3) Sound: msgSound true: `__esoPings` +1 khi có tin mới; false: +0. (4) Receipts: msgReceipts false: tin Resident đã được stf-1 mở vẫn "delivery: sent", `seenBy` null. (5) Typing/(6) Enter: mã đọc `messagePref(portal,'msgTyping'/'msgEnter')` (app.js 1874, 1886); Enter đã đạt ở lượt 2 | | |
| X120 | Đạt | Không đạt (theo quyết định #5) | stf-2 (Sam Okafor, Leasing Agent) với chat có emergency c8 (đã claim, đã acknowledge, gửi tin được): `store.resolve` trả `{ok:false,reason:"role"}`, trạng thái vẫn active. Với chat thường (c60 do stf-2 nhận): resolve `{ok:true}`. stf-1 (Property Manager) resolve chat có emergency c18: `{ok:true}`, closed/resolved_by_staff | | |
| X121 | Đạt | Không đạt (theo quyết định #5) | Giao diện stf-2 mở c8 (emergency): các nút thấy được: Ticket box, Move to Support, Waiting on resident, Hide details... không có "Resolve"; `store.get('c8','stf-2').actions` = ["wait","move:platform"], còn stf-1 ở c18 = ["wait","resolve","move:platform","ack_emergency"]. Chữ báo `reason 'role'` trong app.js:33 là "Your role cannot do that. Ask a Property Manager." (nút ẩn nên chưa bắt gặp trên màn hình) | Chưa thấy câu báo trên giao diện vì nút đã ẩn (tiêu chí cho phép "nút ẩn hoặc báo") | |
| X122 | Đạt | Không đạt (theo quyết định #5) | Console `store.resolve('c8','stf-2')` trả `{ok:false,reason:"role"}`; `DB` không đổi (status active). Tầng dữ liệu cưỡng chế (không chỉ ẩn nút) | Mã lý do là `role`, không phải `not_allowed` như chữ tiêu chí (ý đạt) | |
| S110 | Đạt (giao diện) | Không đạt | Gõ thật 140 ký tự vào `#ann-title`: còn 120. `#new-group-name` maxlength 60, `#new-subject` 120, `#nt-subject` 120 (đọc DOM). Tầng dữ liệu: tên nhóm 61 ký tự cắt còn 60; `startSupport` subject 121: `subject_too_long` (max 120) | Tầng dữ liệu: `broadcast` Title 121 ký tự lưu nguyên 121; chuỗi 5000 ký tự: `createGroup` "name_required", `broadcast` "title_required", `startSupport` "subject_required" (mã báo sai). Tái hiện: console `store.broadcast(adm-1,{title:'T'.repeat(121)})` | Thấp (nếu tính tầng dữ liệu) |
| S118 | Đạt | Không đạt | Phím thật Tab/Enter, theo dõi mỗi 50 ms: (1) Enter trên "Take conversation": assignee stf-1, focus qua BODY rồi vào `#msg-input` sau ~150 ms. (2) Enter trên "Resolve": focus sang "Confirm resolve". (3) Enter trên "Confirm resolve": closed/resolved_by_staff, focus về `#thread-title`. Admin (adm-1) làm Take → `#msg-input`, Resolve → Confirm resolve → `#msg-input`. Ghi chú: Esc trên "Confirm resolve" không làm gì (xác nhận tự quay về "Resolve" sau 4 s); không có hộp thoại để Esc đóng | Esc không hủy xác nhận ngay (chỉ chờ 4 s). Không xem là lỗi vì không có hộp thoại | |
| S119 | Không đạt | Không đạt | Tab thật qua 42 điều khiển, sáng và tối, tắt transition: mọi điều khiển có vòng 3 px (box-shadow) hoặc outline 2 px (Ticket box, Take conversation, Move to Support, nút (i) `#btn-context` nay có outline 2 px solid oklch(0.5461 0.2152 262.88)). Riêng nút "Acknowledge" của thanh cảnh báo emergency (variant primary, ở đầu danh sách) không có vòng: box-shadow spread 0, outline none (cả sáng và tối) | Nút "Acknowledge" (primary) ở thanh emergency không có vòng focus nhìn thấy. Tái hiện: Staff có emergency chưa ack, Tab tới nút | Trung bình |
| S123 | Không đạt | Không đạt | Thread c87 1005 tin (1000 tin nạp vào `eso-msg-v1`): mở thread 1306 ms, luồng chính bị chặn tối đa 1293 ms; gửi 1 tin: tin hiện sau 2962 ms, chặn 1565 ms (xấu hơn lượt 2: 1255 ms). DOM có 1005 phần tử tin (không ảo hóa) | Mở thread >1 s và gửi tin chậm >1 s ở thread 1000 tin. Tái hiện: nạp 1000 tin vào 1 conv, mở, gửi | Trung bình |
| S132 | Không đạt | Không đạt | 375 px cảm ứng: chip reaction "👍2" 47×32 px, `aria-label` "👍 You, Alex Rivera. Tap to remove your reaction." (đúng). Có pseudo `::after` 55×48 (inset -8 -4) nhưng `elementFromPoint` cách chip 3–6 px không trúng nút (vùng chạm mở rộng không có tác dụng) | Chip reaction < 44 px. Tái hiện: 375 px, đo chip | Thấp |
| F199 | Không đạt [Chờ quyết] | Không đạt [Chờ quyết] | adm-2 Announce "Casey notice", adm-1 mở `/admin/messages.html` tab Sent: hiện cả "Taylor notice", "Casey notice (Announcement from Casey Ng)" và "Lot B resurfacing this Saturday" | Tab Sent của Admin lẫn announcement của Admin khác. Chờ quyết (câu 22) nên không tính vào lỗi cần sửa | Thấp |
| R609 | Đạt | Không đạt | Chat c57: res-1 gõ "Someone parked in the fire lane near building 2", chuyển tới Property team; Staff mở: thẻ "Summary from the assistant…" hiện "Topic: General question · Sent to Property team", "Asked: Report a parking violation", "Details: Someone parked in the fire lane near building 2" | | |

## Kiểm các thay đổi từ lượt 2 (không phải dòng tiêu chí riêng)

| Thay đổi | Kết quả | Bằng chứng |
|---|---|---|
| Quyền theo chức vụ: Leasing Agent không đóng được chat có khẩn cấp; Property Manager làm được | Đạt | Xem X120–X122 |
| Focus vào ô soạn sau Take/Resolve bằng bàn phím | Đạt | Xem S118 |
| Vòng focus nút header (Take, Move to Support, Ticket box, (i)) | Đạt, còn 1 lỗi ở nút Acknowledge | Xem S119 |
| Thẻ tóm tắt hiện "Sent to …" | Đạt | Xem R609 |
| Số Messages ở menu Admin | Đạt | Admin dashboard: `store.badgeCount('adm-1')`=12, thanh bên "Messaging & Support" 12, aria "12 unread" (N1 lượt 2 đã sửa) |
| Thẻ trạng thái không lộ tên cho Resident | Đạt | Xem X108; kiểm cả `Route:` và `Status:` |
| Câu trả lời mẫu cho Admin | Đạt | Thread support ở Admin có 6 câu mẫu ("Thanks for flagging this…", "Marking this resolved…") |
| Admin Take / Resolve / Reopen / Ticket box | Đạt | Header ticket: nút Take, Ticket box, Resolve; Take bằng phím thật: assignee adm-1; Resolve + Confirm: status resolved, hiện Reopen; Reopen: status open |
| ID ticket T-xxxx ở danh sách và header | Đạt | Danh sách Queue: "T-1087 · Billing export fails", header "Open · High priority · T-1087 · Billing export fails" |
| Hàng chờ theo ưu tiên, chip "Waiting …" | Đạt | Queue Admin: T-1087 (High, "Waiting under 1 min"), T-1083 (Normal, "Waiting 38 min"), T-1089 (Normal, mới hơn), T-1088 (Low) |
| Exit không kẹt | Đạt | Mở /staff/messages.html, đổi hai thread, bấm Exit trong iframe: về /staff/dashboard.html ngay một lần |
| Ticket box: chip High priority, vai trò người yêu cầu | Đạt | /admin/tickets.html: "T-1087 Billing export fails Open · High priority · Dana Whitfield · Client · With Taylor Brooks"; "Sam Okafor · Staff · Unassigned" |

## Bảng hồi quy phần C (57 dòng Đạt)

Cách kiểm: Reset demo data (`store.reset`), thao tác qua store trong console (hàm giống giao diện gọi) kèm kiểm giao diện thật ở 375 và 1440 px, phím thật cho S117. Với kiểm hết giờ phải tạo store mới sau khi sửa `updatedAt` (store đã cache trạng thái).

| ID | Kết quả mới | Kết quả cũ | Bằng chứng | Lỗi và bước tái hiện | Mức độ |
|---|---|---|---|---|---|
| F101 | Đạt | Đạt | ensureSession res-1: created, status bot, 2 tin | | |
| F102 | Đạt | Đạt | Guest parking > request pass > "helped:yes": closed/resolved_by_assistant, không ticketNo | | |
| F103 | Đạt | Đạt | "asdfgh", "qwerty zzz": bot hỏi lại, status vẫn bot | | |
| F105 | Đạt | Đạt | requestStaff: queued, ticketNo 1086, có summary, stf-1 có dòng | | |
| F106 | Đạt | Đạt | Dòng "A member of the property team joined the chat." | | |
| F107 | Đạt | Đạt | stf-1 claim ok, stf-2 claim "already_taken", đúng 1 dòng joined, stf-2 không thấy chat | | |
| F108 | Đạt | Đạt | Staff trả lời chat queued: assignee stf-1, active; stf-2 không thấy | | |
| F109 | Đạt | Đạt | Resolve: closed/resolved_by_staff; Resident và Staff gửi tiếp: reason "closed" | | |
| F110 | Đạt | Đạt | Resolve chat queued: not_allowed, vẫn queued | | |
| F111 | Đạt | Đạt | rate up ok, down lần hai not_allowed, csat "up" | | |
| F112 | Đạt | Đạt | End chat ở bot, queued, active: cả ba closed/resident_ended | | |
| F113 | Đạt | Đạt | Bot im 16 phút, tick (store mới): closed/timeout | | |
| F114 | Đạt | Đạt | Chat active lùi 12h05: closed/timeout kèm câu "saved in the Ticket box"; queued lùi 3 ngày vẫn queued | | |
| F115 | Đạt | Đạt | Waiting on resident → Resident trả lời: in_progress, waiting false | | |
| F116 | Đạt | Đạt | Staff startDirect res-2: Resident thấy thread | | |
| F117 | Đạt | Đạt | Tin thứ 2 khi chưa trả lời: awaiting_reply; sau khi Resident trả lời gửi được | | |
| F123 | Đạt | Đạt | Admin startDirect res-3; res-3 gửi: one_way | | |
| F125 | Đạt | Đạt | Staff–Client Resolve: ticketNo 1094, resolvedAt có, có trong Ticket box Staff và Client | | |
| F127 | Đạt | Đạt | Client gửi sau Resolve: resolvedAt null, ticketNo giữ | | |
| F128 | Đạt | Đạt | startDirect lần hai dùng lại c25, chỉ 1 thread, Client không có action resolve | | |
| F129 | Đạt | Đạt | startSupport cli-1: kind support, open, ticketNo 1095, Admin có dòng | | |
| F131 | Đạt | Đạt | Admin trả lời: assignee adm-1, pending; Client trả lời: open | | |
| F132 | Đạt | Đạt | Resolved có resolvedAt; Client trả lời: open, cùng ticketNo | | |
| F134 | Đạt | Đạt | Client đổi status/priority: not_allowed | | |
| F145 | Đạt | Đạt | Announce: ack read 0 / total 8 (0%) | | |
| F151 | Đạt | Đạt | Staff gửi "Xin chào 😀": +1 tin, đúng chữ, from stf-1 | | |
| F152 | Đạt | Đạt | Tin 5 dấu cách: "empty"; giao diện: nút Send disabled khi ô trống, gõ + Enter gửi | | |
| F153 | Đạt | Đạt | 2000 ký tự nhận; 2001: too_long | | |
| F154 | Đạt | Đạt | Cùng clientId hai lần: 1 tin (`duplicate:true`) | | |
| D101 | Đạt | Đạt | Cùng bằng chứng F154 | | |
| F157 | Đạt | Đạt | Edit: text và editedAt đổi, số tin giữ | | |
| D108 | Đạt | Đạt | Cùng F157 | | |
| F158 | Đạt | Đạt | Lùi 16 phút: edit và unsend too_late; sửa tin người khác not_allowed | | |
| D109 | Đạt | Đạt | Unsend: deleted true, text rỗng, bản ghi còn | | |
| F160 | Đạt | Đạt | 👍 → ❤️ → ❤️ lần nữa: {👍} → {❤️} → {}; "abc": invalid_emoji | | |
| D110 | Đạt | Đạt | Cùng F160 (mỗi user tối đa 1 emoji) | | |
| F161 | Đạt | Đạt | Reply: replyTo đúng; reply tin đã gỡ: invalid_reply | | |
| D131 | Đạt | Đạt | Cùng F161 | | |
| F167 | Đạt | Đạt | Ẩn tin: chỉ prefs[stf-1].hidden, stf-2 không đổi, tin gốc còn | | |
| D111 | Đạt | Đạt | Cùng F167 | | |
| F168 | Đạt | Đạt | Pin thread: prefs chỉ có stf-1 | | |
| D112 | Đạt | Đạt | Cùng F168 | | |
| D107 | Đạt | Đạt | 9 persona: badgeCount = tổng unread theo dòng (0 lệch) | | |
| U127 | Đạt | Đạt | Badge stf-1 19 → đọc: 17 → đánh dấu chưa đọc: 18 (markUnread chỉ đánh dấu 1 tin; thiết kế như lượt 2) | | |
| D127 | Đạt | Đạt | markUnread chỉ phía stf-1 (prefs stf-2 không có) | | |
| F171 | Đạt | Đạt | res-2 bật DND: badge 7 → 5 | | |
| S112 | Đạt | Đạt | startSupport(res-1), broadcast(stf-1), createGroup(cli-1), claim(cli-1), resolve(cli-1): đều not_allowed | | |
| S113 | Đạt | Đạt | Đính kèm url `javascript:`: bad_attachment | | |
| S114 | Đạt | Đạt | res-1 mở chat c8 của res-2: not_found | | |
| S115 | Đạt | Đạt | adm-1 mở chat Resident: not_found; Ticket box Admin không có | | |
| S116 | Đạt | Đạt | cli-2 mở ticket của cli-1: not_found | | |
| F183 | Đạt | Đạt | stf-1 3+9=12; cli-1 2+0=2; adm-1 3+1=4 (Open + Closed = total) | | |
| F185 | Đạt | Đạt | Tìm "T-1087…": 1 dòng; chuỗi lạ: 0 dòng | | |
| S117 | Đạt | Đạt | 1440 px, phím thật: gõ "keyboard only note" + Enter: +1 tin, focus ở lại `#msg-input` | | |
| U107 | Đạt | Đạt | 375 px: chỉ hiện danh sách, thread thay danh sách, Back 44×44, ô soạn trong khung, scrollWidth 375 | | |
| U110 | Đạt | Đạt | 375 px: Back 44×44; Ticket box, Resolve, Quick replies, Attach, Emoji, Emergency, Send đều cao 44; tab Queue/Mine/Clients/Groups/Support/All/Hidden cao 44 | | |
| U118 | Đạt | Đạt | 375 px: tin 300 chữ "W" liền và 2000 ký tự "Z": scrollWidth 375, bong bóng x32–337 | | |

Hồi quy mới (dòng đang Đạt mà nay hỏng): không có.

## Phát hiện mới ngoài tiêu chí

| Mã | Nội dung | Bằng chứng | Mức độ |
|---|---|---|---|
| N5 | Nút "Acknowledge" (thanh cảnh báo emergency, primary) không có vòng focus (xem S119) | Tab thật, sáng và tối | Trung bình |
| N6 | Gửi tin ở thread 1000 tin chậm hơn lượt 2: 2,96 s (chặn 1,57 s) | Xem S123 | Trung bình |
| N7 | Giao diện Messages không có đường báo câu "Your role cannot do that…" tới Leasing Agent trước khi hành động (nút ẩn). Chấp nhận được theo tiêu chí; ghi để chủ dự án biết người dùng sẽ không biết vì sao thiếu nút Resolve | Xem X121 | Thấp |

N1–N4 của lượt 2 đã được xử lý: N1 (badge Admin) khớp 12/12; N2 (thẻ audit lộ tên) đã che thành "The property team"/"EasySpotOps Support"; N3 và N4 không kiểm lại lượt này.
