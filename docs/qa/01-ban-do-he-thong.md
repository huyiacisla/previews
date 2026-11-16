# Bản đồ hệ thống (Prompt 0): tổng hợp

Ngày 2026-11-14. Ba phiên khảo sát độc lập, chỉ đọc mã, chưa chạy thử. Bản đầy đủ có trích dẫn `path:line`:

| Phần | Tệp | Nội dung |
|---|---|---|
| A | `01a-trang-va-dieu-huong.md` | 57 trang, 17 trang nhúng, khung dùng chung, mục sidebar nối hay chưa nối |
| B | `01b-du-lieu-va-crud.md` | Khoảng 35 khóa lưu trữ của mã và 45 khóa của prototype, dữ liệu mẫu, bản đồ CRUD, toàn vẹn |
| C | `01c-luong-va-diem-mu.md` | 67 luồng người dùng, 192 quy tắc nghiệp vụ, điểm mù, câu hỏi |

Số liệu lớn nhất của phần C: 67 luồng (Messages 21, Social 19, Settings 6, Điều hướng 7, Ticket box 5, còn lại 9), 192 quy tắc, trong đó **7 nhóm quy tắc chỉ có giao diện chặn, tầng dữ liệu không kiểm** (cổng Community guidelines, loại tệp đính kèm, trả lời trong Ticket box, form Promotion của Staff, W-9, trường Workspace của Client, phân quyền mục Settings).

**Đây KHÔNG phải database thật**: dữ liệu nằm trong `localStorage` của trình duyệt. Tiêu chí về "database" ở các prompt sau được hiểu là lớp lưu trữ này.

## Phần đã sửa sau khảo sát

Xem `02-sua-sau-khao-sat.md`.

## Câu hỏi cần chủ dự án quyết

Chia hai loại. Loại 1 chặn việc viết tiêu chí. Loại 2 không chặn: tiêu chí sẽ ghi "theo hành vi hiện tại" và đánh dấu để quyết sau.

### Loại 1. Chặn tiêu chí

1. **Phạm vi:** bốn nhóm này có tính vào cổng Đạt/Không đạt không?
   - Trang nguyên mẫu Settings (1,38 MB, ~45 khóa lưu riêng, chưa khảo sát chi tiết).
   - Trang `*-content.html` mở trực tiếp.
   - Các mục sidebar chưa có trang (Admin 24, Staff 17, Client 12, Resident 12).
   - Các nút trong bản chụp chưa có hành vi ("AI Work Assistant", "Refresh", "Date range"…).
2. **Mục sidebar chưa có trang** nên (a) báo "chưa có trong bản xem thử" như hiện tại, hay (b) tính là lỗi?
3. **Quyền nhắn:** Admin được gửi một tin cho mỗi Resident rồi bị khóa vĩnh viễn (Resident không trả lời được). Đây là thiết kế hay lỗi?
4. **Emergency của Resident** có phải tới Admin không? Hiện chỉ Staff thấy.
5. **Staff dùng chung danh tính "Property team"** trong Social (Jordan và Sam chung bài viết, follow, mute). Chủ ý của bản xem thử hay giới hạn?
6. **Resident bị pause Social:** chữ trong giao diện Staff nói "vẫn đọc được", mã chặn hoàn toàn. Hành vi nào đúng?
7. **Resident bị khóa Social vẫn dùng Messenger:** giữ vậy hay khóa luôn? (Câu hỏi từ báo cáo trước.)
8. **Số liệu mẫu** lệch nhau (Parking 261/25 và 261/500, Staff 18/3 và 0/0, "32 warnings" và 8 mục, "$19 revenue"): số nào là chuẩn?

### Loại 2. Không chặn

Danh sách đầy đủ ở `01c`, mục 4: Messages và Ticket box 27 câu, Social 34, Notifications 9, Promotions 11, Documents và Capacity 13, Admin 9, Settings và khung 20. Các nhóm đáng chú ý nhất:

- Ticket box có cần Status/Assign/Priority không, hay giữ ở Messages.
- Staff có cần trả lại hoặc chuyển chat đã nhận không.
- Notifications: bấm vào có cần mở đúng cuộc chat/bài viết không (hiện về trang gốc).
- Promotions: claim của Resident có phải vào hộp Claims của Staff và trừ tồn kho không.
- Settings: cài đặt Messages (Enter để gửi, read receipts, typing, away reply…) có cần Messenger tuân theo không (hiện không).
- Trạng thái hiện diện có hai kho riêng không đọc nhau (`eso-status` và `<portal>:status*`): cần một nguồn.
