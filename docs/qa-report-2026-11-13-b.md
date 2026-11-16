# Báo cáo QA lượt 2, 2026-11-13: Client, Resident, Staff, Admin

Kết quả chung: 289 test tự động đạt (thêm 20 test trong lượt này), `npm run build` qua, 49 trang không có liên kết hỏng và không có lỗi script.

## 1. Đã làm trong lượt này

### Admin portal (làm riêng, theo yêu cầu giữa lượt)

| Việc | Trước | Sau |
|---|---|---|
| Chuông thông báo | Bấm không mở gì, không có số | Mở bảng thông báo, có số chưa đọc; ticket và tin nhắn là số thật, tự cập nhật |
| Trang Notifications | Không có | `/admin/notifications.html`: tìm kiếm, lọc, đã đọc/chưa đọc, giống các cổng khác |
| Settings | Không có | `/admin/settings.html`: My profile, Availability & presence, Notifications, Messages, Sign-in & security, Personalize, Language, Date and time, Accessibility |
| Personalize | Không có | Theme, Accent, Text, Sidebar, Buttons, Cards, Gestures; lưu riêng cho Admin (`admin:eso-proto`, `ui-prefs:admin`) và áp dụng lên các trang Admin |
| Header ở mobile/tablet | Chuông và nút 51 px, ô tìm kiếm dài, không có nút đổi theme | Nút 32 đến 40 px, có nút theme cạnh chuông ở mọi độ rộng, một hàng |
| Sidebar | Settings, Profile, Support là `#` | Mở Settings, My profile, Ticket box |
| Tên ở header | "User 6 · QA" | Taylor Brooks (cùng tên với Messages và Ticket box) |

### Kiểm tra theo 9 mục yêu cầu

| # | Mục | Cách kiểm | Kết quả |
|---|---|---|---|
| 1 | Quy trình và cấu hình | Quét 49 trang; header Admin đo ở 375 và 600; dashboard Admin ở 360 đến 1920 (lượt trước) | Đạt. Chi tiết cấu hình ở `docs/device-sizes.md` |
| 2 | Các phần đã tạo liên kết với nhau | Quét mọi thẻ `<a>` của 49 trang (trang ngoài và khung nhúng), tải thử 67 địa chỉ nội bộ | 0 liên kết hỏng, 0 trang rơi về trang mục lục, 0 lỗi script |
| 3 | Mở link rồi Back về đúng trang | Test `back-target` (Settings, cả Admin) và test mới cho `exit-target` (Messages, Ticket box, Social, Promotions) | Đạt: về đúng trang đã đến từ; mở trực tiếp thì về trang chủ của cổng |
| 4 | Settings đã đủ chưa | Đọc danh sách mục của từng cổng trên trang thật | Staff 10 mục, Client 9, Resident 9, Admin 9 (bảng ở mục 3) |
| 5 | Social: khóa, reply, sửa reply, kiểm duyệt | 113 test Social hiện có (khóa trả lời, sửa và xóa reply, ẩn, gỡ, cảnh cáo, ban, giới hạn strike) | Đạt ở mức logic. Lượt này không bấm lại trên giao diện |
| 6 | Tin nhắn theo cặp và lịch sử ticket | Test mới `tests/e2e-flows.test.mjs` (7 test) | Đạt, xem mục 2 |
| 7 | Sửa lỗi | Xem mục 4 | 5 lỗi đã sửa |
| 8 | Settings và Workspace của Staff và Client | Đọc danh sách trên trang thật | Staff Workspace 7 mục, Client Workspace 12 mục |
| 9 | Ghi chép | Tệp này và `docs/issue-log.md` #112 | Xong |

## 2. Tin nhắn theo cặp và lịch sử ticket

| Cặp | Chạy đúng | Có thành ticket không |
|---|---|---|
| Resident ↔ Staff | Trợ lý trả lời trước; cư dân xin gặp người thì vào hàng chờ; Staff đầu tiên trả lời là người nhận; hai chiều thấy tin của nhau | **Có.** Thành ticket từ lúc vào hàng chờ; sau khi Resolve vẫn nằm trong Ticket box của cả cư dân và Staff, kèm toàn bộ cuộc trò chuyện; cư dân chấm điểm được một lần |
| Trợ lý tự trả lời xong | Cư dân kết thúc mà không cần người | **Không** (đúng thiết kế: không làm phiền Staff) |
| Staff ↔ Client | Nhắn trực tiếp hai chiều, cùng hai người chỉ có một luồng | **Có, từ lượt sau (issue-log #114).** Staff bấm Resolve khi hỗ trợ xong: cuộc trò chuyện được cấp số ticket và lưu trong Ticket box của cả Staff và Client đó; Client trả lời tiếp thì mở lại, giữ nguyên số. Chưa bấm Resolve thì vẫn chỉ là trò chuyện |
| Client ↔ Admin | Client mở yêu cầu Support; Admin trả lời thì thành người phụ trách | **Có.** Resolved vẫn giữ trong Ticket box của Client và mọi Admin; trả lời tiếp thì mở lại |
| Staff ↔ Admin | Staff nhắn cho Admin thì tự thành ticket Support | **Có**, như Client |
| Bị cấm | Resident không nhắn được Client hay Admin; Client không nhắn được Resident hay Client khác | Kho dữ liệu từ chối, không chỉ ẩn nút |

**Cần bạn quyết:** trò chuyện Staff ↔ Client không thành ticket. Nếu bạn muốn một cuộc Staff ↔ Client "hỗ trợ xong" cũng lưu thành lịch sử ticket thì cần thêm nút "Mark as resolved" cho loại trò chuyện này.

## 3. Danh sách Settings theo cổng (đọc từ trang thật)

- **Staff, Settings:** My profile, Availability & presence, Notifications, Messages, Sign-in & security, Personalize, Language, Date and time, Accessibility, Social.
- **Staff, Workspace:** Permissions, Assigned properties, Security, Property profile, Promotion design, Social, Resident promotions.
- **Client, Settings:** My profile, Availability & presence, Notifications, Messages, Sign-in & security, Personalize, Language, Date and time, Accessibility.
- **Client, Workspace:** Company, Properties, Mallard Pointe at Riverbend, Parking and enforcement, Resident experience, Team and roles, Invoices and payment, Reports and alerts, Security, Documents, Document secret key, Data and recovery.
- **Resident, Settings:** My profile, My property, Notifications, Messages, Sign-in & security, Personalize, Language, Date and time, Accessibility.
- **Admin, Settings:** My profile, Availability & presence, Notifications, Messages, Sign-in & security, Personalize, Language, Date and time, Accessibility.

## 4. Lỗi đã sửa trong lượt này

1. Chuông của Admin không mở gì và không có số.
2. Admin không có trang Notifications.
3. Admin không có Settings, Personalize, cử chỉ, chỉnh sidebar.
4. Header Admin ở màn hình hẹp: chuông quá to, ô tìm kiếm quá dài, mất nút theme.
5. Sidebar Admin: Settings, Profile, Support không dẫn đi đâu.

## 4b. Cập nhật sau lượt "tiếp tục làm"

**Social, kiểm duyệt bấm trên giao diện (hai tab, Resident Alex Rivera và Staff Jordan Lee):**

| Bước | Kết quả |
|---|---|
| Resident mở bài, xem bình luận của mình | Menu chỉ có "Edit comment" và "Delete comment"; không thấy nút kiểm duyệt của Staff |
| Resident sửa bình luận | Lưu được, hiện nhãn "Edited" và chữ mới |
| Staff mở cùng bài | Thấy bình luận đã sửa; menu có Follow, Hide comment, Remove comment, Add violation |
| Staff bấm Add violation, chọn Harassment và Pause | Hộp thoại tự điền ngày giờ hết hạn (24 giờ), ghi chú, ô "gỡ bình luận"; lưu xong báo "Alex Rivera is paused until Nov 14, 2026, 6:30 PM" |
| Resident mở lại Social | Màn hình khóa: đồng hồ đếm ngược, lý do, "Strike 1 of 3", ghi chú của Staff; không đọc, không trả lời được; kho dữ liệu cũng từ chối reply |
| Staff gỡ khóa | Resident thấy "The clock has reached zero" và nút "Resume Social"; bấm xong vào lại bảng tin và trả lời được |

Chưa bấm trên giao diện: tắt trả lời cho cả tòa nhà (đã có test logic), Hide comment, Remove comment riêng lẻ, cảnh cáo không khóa.

**Settings nháy mục của Staff:** đã sửa. Trang của Client, Resident và Admin giữ nội dung ẩn đến khi đổi xong nhãn (có giới hạn an toàn 3 giây).

**Admin, cấu hình:** 7 trang (Dashboard, Notifications, Settings, Personalize, My profile, Messages, Ticket box) ở 375, 830, 1440: không tràn ngang, không có nút nhỏ hơn 24 px, nút theme có ở mọi độ rộng.

## 5. Còn mở

| Mục | Mức | Ghi chú |
|---|---|---|
| Các mục sidebar chưa có trang | Thông tin | Admin 24 mục (Clients, Properties, People…), Staff 18, Client 12, Resident 13. Bấm vào hiện "That page is not part of this preview yet." |
| Social: phần chưa bấm trên giao diện | Thấp | Tắt trả lời cho cả tòa nhà, Hide comment, Remove comment riêng lẻ, cảnh cáo không khóa (đều có test logic) |
| Resident bị ban Social vẫn dùng Messenger | Cần quyết định | Mục J của báo cáo trước |
| Chưa đi từng trang bằng tay | Thông tin | Lượt này kiểm bằng quét tự động và test; chưa mở tay từng trang trong 49 trang |
