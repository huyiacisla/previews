# A6. Đưa đúng người, đúng nơi, đúng hỗ trợ (Messages của Resident)

Mục tiêu: bot biết đội ngũ là ai và việc gì thuộc về ai, để khi Resident chọn "Talk to a person" thì chuyển **đúng nơi**:
- **Property team** (Staff của toà nhà): chỗ đỗ, xe, giấy phép, khách, vi phạm, khẩn cấp, quy định, thanh toán đỗ xe.
- **EasySpotOps Support** (Admin của nền tảng): lỗi của ứng dụng, không đăng nhập/không gửi được, thông báo không tới, hiển thị sai, tài khoản, quyền riêng tư dữ liệu.
Khi chính hệ thống Messages bị lỗi và không tạo được tin, Resident vẫn phải có đường liên hệ.

Quy tắc kiểm: không có bằng chứng = "Chưa kiểm được"; % Đạt = Đạt ÷ (tổng − Chưa kiểm được).

| ID | Tiêu chí | Mức |
|---|---|---|
| R601 | "Talk to a person" hỏi Resident cần ai: "Property team" (việc của toà nhà) hoặc "EasySpotOps Support" (lỗi ứng dụng), mỗi lựa chọn có một dòng giải thích ngắn | Cao |
| R602 | Chọn Property team: chat vào hàng chờ Staff, không vào hàng của Admin; Resident chỉ thấy "Property team" | Cao |
| R603 | Chọn EasySpotOps Support: chat vào hàng hỗ trợ của Admin; Staff của toà nhà không thấy; Resident thấy "EasySpotOps Support" | Cao |
| R604 | Gõ câu về chỗ đỗ, xe, khách, vi phạm ("someone is in my spot"): bot đề nghị Property team, không đề nghị Support | Cao |
| R605 | Gõ câu về lỗi ứng dụng ("app crashes", "can't log in", "notification never arrives", "page is blank"): bot đề nghị EasySpotOps Support | Cao |
| R606 | Câu có cả hai ý, hoặc không rõ: bot hỏi lại một câu ngắn thay vì đoán, không bao giờ chọn hộ mà không nói | Trung bình |
| R607 | Khẩn cấp (cháy, thương tích, xe chặn lối thoát) luôn đi Property team, kèm nhắc gọi 911 khi nguy hiểm tức thì; không bao giờ đi Support | Nghiêm trọng |
| R608 | Chọn nhầm nơi: Staff hoặc Admin có thể chuyển cuộc sang nơi đúng, Resident được báo "Moved to …" và không phải kể lại từ đầu (thẻ tóm tắt đi theo) | Trung bình |
| R609 | Thẻ tóm tắt cho người nhận có chủ đề, nơi đã chọn, và những gì Resident đã gõ | Trung bình |
| R610 | Hệ thống Messages không tải được (dữ liệu hỏng, lỗi lưu): Resident thấy màn lỗi có tên lỗi ngắn và nút "Try again" | Cao |
| R611 | Màn lỗi có đường liên hệ không phụ thuộc Messages: số điện thoại văn phòng và địa chỉ email của EasySpotOps Support, bấm được (tel:, mailto:) | Cao |
| R612 | Gửi tin thất bại: tin ở lại trong ô soạn hoặc nằm "Not sent" với nút "Retry"; không mất chữ Resident đã gõ | Cao |
| R613 | Tin chưa gửi được được giữ ở máy và tự gửi lại khi kết nối trở lại; Resident thấy trạng thái | Trung bình |
| R614 | Mọi cổng có "Contact support" ở chân trang hoặc menu hỗ trợ, mở được khi Messages hỏng | Trung bình |
| R615 | Việc chuyển hướng không bị lạm dụng: Resident không nhắn được tới Admin ngoài kênh "EasySpotOps Support"; không nhắn thẳng cá nhân Admin | Cao |
| R616 | Có giới hạn tần suất cho kênh Support (không spam hàng chờ Admin), có thông báo lý do | Trung bình |
| R617 | Văn bản bot đúng tiếng Anh, không lộ tên nhân viên hay tên Admin, không hứa thời gian trả lời nếu không có dữ liệu | Trung bình |
| R618 | 375 px: hai lựa chọn nơi đều ≥ 44 px, đọc được bằng trình đọc màn hình, dùng được bằng bàn phím | Trung bình |
| R619 | Staff và Admin thấy rõ cuộc đến từ đâu (nhãn "Property" hoặc "Platform support") và lọc được theo nhãn | Trung bình |
| R620 | Quyết định chủ dự án: trước đây Resident chỉ nhắn Staff. Cho phép thêm kênh "EasySpotOps Support" chỉ qua bot, không mở nhắn trực tiếp tới Admin | Chờ quyết |

## Kết quả (2026-11-14, sau khi làm)
**Tổng 20: Đạt 20, Không đạt 0, Chưa kiểm được 0. % Đạt = 100%.** (`npm test` 336/336 qua, build qua.)
Bằng chứng: `tests/messaging-routing.test.mjs` (logic) và kiểm trong trình duyệt (Resident, Admin, Staff cùng localStorage).

| ID | Kết quả | Bằng chứng |
|---|---|---|
| R601 | Đạt | Test + trình duyệt: "Talk to a person" hỏi "Who should I pass this to?", hai nút "Property team" và "EasySpotOps Support", mỗi nơi một câu giải thích; chưa gửi cho ai |
| R602 | Đạt | Test: route property vào hàng Staff; Admin không thấy; Resident thấy "Property team" |
| R603 | Đạt | Test + trình duyệt: route platform vào Queue của Admin ("Alex Rivera · Platform support"); Staff list không có; Resident thấy "EasySpotOps Support" và câu trả lời của Admin; không lộ tên Admin |
| R604 | Đạt | Test: "someone parked in the fire lane" là property; "I want to talk to someone about my guest pass" đi thẳng Property |
| R605 | Đạt | Test: "app crashes", "cannot log in", "notifications never arrive", "page is blank" là platform; "I cannot log in, I need to talk to support" đi thẳng Support |
| R606 | Đạt | Test: câu có cả hai ý ("talk to someone about my car app"), "I need a human", "talk to easyspotops team" đều hỏi lại, không đoán |
| R607 | Đạt | Test: smoke, gas leak, someone is hurt đi Property kèm "call 911"; "smoke… the app will not load" vẫn Property; reroute sang Support bị chặn khi khẩn cấp còn mở |
| R608 | Đạt | Test + trình duyệt: nút "Move to Property / Support" trong header; chuyển giữ thẻ tóm tắt, Resident được báo "moved to …"; chỉ nơi đang giữ mới chuyển được |
| R609 | Đạt | Test: thẻ tóm tắt có chủ đề, nơi (route) và các dòng Resident đã gõ |
| R610 | Đạt | Trình duyệt: dữ liệu hỏng có hình dạng hợp lệ gây lỗi thật, hiện "Messages could not load" + "Try again" + Reference (loại lỗi, giờ UTC); khôi phục dữ liệu rồi tải lại thì vào lại bình thường |
| R611 | Đạt | Trình duyệt 375 px: mailto: và tel: bấm được, cao 44 px, không tràn ngang; có dòng 911 và "gọi văn phòng toà nhà" |
| R612 | Đạt | Kết quả A1 (F175, D124): tin lỗi giữ lại với Retry/Discard, không mất chữ; cùng khung soạn tin của Resident. Tin lỗi của Resident còn có link email Support |
| R613 | Đạt | Kết quả A1 (F174): hàng chờ ngoại tuyến gửi lại đủ, đúng thứ tự khi có mạng; hiển thị "Waiting for connection" |
| R614 | Đạt | Trình duyệt: mục "Contact support" (mailto:) trong menu hồ sơ của cả 4 cổng, không đi qua Messages |
| R615 | Đạt | Test: Resident không nhắn trực tiếp Admin (`canMessage`); chỉ qua kênh Support của bot |
| R616 | Đạt | Test: 3 yêu cầu Support một ngày; lần thứ 4 không vào hàng, bot nói rõ và đưa nút Property team |
| R617 | Đạt | Test: lời bot không có tên người; toàn tiếng Anh |
| R618 | Đạt | Trình duyệt 375 px: nút New 44, hai lựa chọn nơi và "Back to topics" cao 44, không tràn ngang |
| R619 | Đạt | Test + trình duyệt: Admin thấy "Platform support", Staff thấy "Property"; lọc `route:platform`, `route:property`, `route:support` |
| R620 | Đạt | Chủ dự án yêu cầu (2026-11-14): kênh EasySpotOps Support chỉ qua bot, không nhắn trực tiếp Admin |

### Bổ sung sau phản hồi của chủ dự án: tên đúng khi kết thúc, và nút quay lại
Lỗi: kết thúc chat chỉ với trợ lý vẫn hiện "Property team"; nút "← Messages" chỉ xuất hiện sau khi mở từ danh sách, không có ngay từ đầu.

| ID | Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|---|
| R621 | Chat chỉ với trợ lý rồi End chat (hoặc hết giờ): tên vẫn là "EasySpotOps Assistant", phụ đề "Ended", không thành ticket, không có thẻ "Status: Open → Closed" | Đạt | Test + trình duyệt 686 px: "EasySpotOps Assistant · Ended", dòng "You ended this chat.", không thẻ trạng thái, không vào Ticket box |
| R622 | Đã chọn Property team rồi End: tên "Property team", dòng "You ended this chat. The ticket is saved in the Ticket box.", ticket nằm trong Ticket box | Đạt | Test + trình duyệt |
| R623 | Đã chọn EasySpotOps Support rồi End: tên "EasySpotOps Support", cùng dòng như R622 | Đạt | Test + trình duyệt |
| R624 | Người của đội đóng ticket: dòng "Property team closed this ticket. It is saved in the Ticket box." hoặc "EasySpotOps Support closed this ticket. …", không bao giờ tên người | Đạt | Test (cả Staff và Admin, kiểm không có tên) |
| R625 | Nút "← Messages" có ngay từ đầu ở mọi chat trên màn hẹp (Resident cũng vậy), bấm về danh sách; không còn nút biểu tượng "Conversations" riêng | Đạt | Trình duyệt 686 px: nút 100×44 hiện ngay khi vào chat trợ lý; bấm về danh sách; mở lại và End vẫn có nút |

Sau bổ sung: A6 = 25 tiêu chí, Đạt 25, % Đạt = 100%. `npm test` 339/339, build qua.

### Bổ sung: Support xử lý và đóng ticket, mỗi ticket có ID riêng
Tự đóng vai Support (Admin) xử lý yêu cầu từ cả 3 vai: Client, Staff, Resident.

| ID | Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|---|
| R626 | Thread hỗ trợ của Admin có nút Take, Resolve (xác nhận hai bước), Reopen và Ticket box ngay trên header, không chỉ ba ô chọn | Đạt | Trình duyệt: Take → "You took this ticket", trả lời, Resolve → Confirm resolve → "Resolved. It is saved in the Ticket box."; sau đó có Reopen và Ticket box |
| R627 | Đóng xong, ticket được lưu: banner "Saved as T-1083 in the Ticket box." và nút "Open Ticket box" dẫn đúng ticket | Đạt | Trình duyệt: bấm Open Ticket box → `/admin/tickets.html#/t/c29`: T-1083, Resolved, người yêu cầu, người phụ trách, giờ đóng, thời gian xử lý, hội thoại |
| R628 | Dòng đóng ghi tên đội, không tên người: "EasySpotOps Support marked this ticket resolved. It is saved in the Ticket box. Reply to reopen it." | Đạt | Test; Resident thấy "EasySpotOps Support closed this ticket…" |
| R629 | Cả 3 vai nhắn được tới Support và thấy ticket của mình: Client (Messages > New > EasySpotOps Support), Staff (cùng chỗ), Resident (bot > Talk to a person > EasySpotOps Support) | Đạt | Trình duyệt: Client gửi → T-1089, Staff gửi → T-1090 vào Queue của Admin; Resident đã kiểm ở A6 (R603). Admin Take, trả lời, Resolve cả ba: Ticket box của người gửi và của Admin đều "resolved" |
| R630 | Người gửi viết lại thì ticket mở lại cùng ID; Admin cũng Reopen bằng tay được | Đạt | Test |
| R631 | Mỗi ticket có ID riêng (T-xxxx) hiện ở danh sách, header thread, banner, Ticket box; không trùng; chat chỉ với trợ lý không có ID; tìm bằng ID được | Đạt | Test (3 ticket, 3 số; số ở danh sách khớp Ticket box); trình duyệt 375/830/1440: "T-1083 · Cannot export March…" ở header, danh sách Resolved có T-1088/1090/1089/1083/1084, không tràn ngang |

| R632 | Exit không bao giờ kẹt: từ Messages sang Ticket box (và ngược lại) rồi bấm Exit thì về dashboard, không quay qua lại giữa hai trang | Đạt | Test (e2e-flows) + trình duyệt: Ticket box mở từ Messages, Exit → `/admin/dashboard.html?as=adm-1`. Lỗi gốc: hai trang liên kết sang nhau nên Exit đưa về trang kia, vô tận |
| R633 | Ticket box của Admin: dòng có ID, chip "High priority", người yêu cầu + vai trò + "With …/Unassigned"; mở tab Open xếp khẩn cấp/High lên đầu; ticket đã đóng vẫn có "Open in Messages" | Đạt | Trình duyệt 375/830/1440 |
| R634 | Ticket box 375 px: hội thoại không đè lên ô soạn trả lời | Đạt | Đo: dòng cuối của hội thoại không vượt đỉnh ô soạn; lỗi gốc là khung hội thoại bị co lại (overflow) |
| R635 | Header thread của Messages: ID ticket nổi bật (đậm vừa, số đều) đứng đầu dòng phụ | Đạt | Trình duyệt |

Sau bổ sung: A6 = 35 tiêu chí, Đạt 35, % Đạt = 100%.

Giới hạn: số điện thoại và email Support là mẫu (`support@easyspotops.example`, `(916) 555-0100`), cần thay bằng thật. R612/R613 dựa vào kiểm A1 trên cổng Staff, cùng khung soạn tin; chưa kiểm riêng bằng tài khoản Resident.

## Kế hoạch làm (đã làm xong)
1. `bot.js`: thêm "đội ngũ" (Property team, EasySpotOps Support) với phạm vi từng bên, và nhận ra ý định theo từ khoá; "Talk to a person" hỏi chọn nơi khi chưa rõ.
2. `store.js`: cuộc Resident có trường `route` ('property' | 'platform'); 'platform' vào hàng Admin, 'property' vào hàng Staff; chuyển nơi giữ thẻ tóm tắt.
3. `app.js`: lựa chọn nơi, màn lỗi có "Try again" và đường liên hệ ngoài Messages, giữ tin chưa gửi.
4. Test node cho từng điều ở R601–R617; kiểm trình duyệt ở 375 và 1440; thêm kết quả vào báo cáo tổng hợp.
