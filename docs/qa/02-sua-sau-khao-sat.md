# Sửa sau khảo sát (2026-11-14)

Chỉ những điểm mù mà **đúng/sai đã rõ** và không cần quyết định nghiệp vụ. Mỗi mục có kiểm lại trên trình duyệt hoặc test. Kết quả: 301 test đạt (thêm 4), build qua.

| # | Phát hiện khi khảo sát | Đã làm | Bằng chứng |
|---|---|---|---|
| 1 | Ô tìm kiếm trên header Admin không nối mã nào | Nối cùng bộ tìm kiếm với ba cổng còn lại (Ctrl/Cmd+K, "/"): `portal-frame-extras.js` `addBell` gọi `configure` và `wireSearch` | Gõ "tick" ra "Ticket box → /admin/tickets.html"; Ctrl+K đưa con trỏ vào ô |
| 2 | Mục "Dashboard" ở sidebar của Staff, Resident, Admin là `href="#"`, bấm ra "chưa có trong bản xem thử" | Mục Dashboard trỏ về trang chủ của cổng (cả Resident sau khi dựng lại khung) | `href` kiểm trên Staff, Resident, Admin |
| 3 | `src/index.html` chỉ có 11 link | Liệt kê đủ theo cổng: Staff 9, Client 9, Resident 7, Admin 5, hub | Mở được từ trang mục lục |
| 4 | Documents hiện 7 tài liệu mẫu nhưng sidebar và Capacity thấy rỗng (mẫu chỉ nằm trong bộ nhớ) | Ghi mẫu xuống ngay khi mở trang lần đầu | `eso-docs:client` có 7 mục sau khi mở trang |
| 5 | Tên người không khớp giữa các phần: "Priya Shah" và "Priya Nair", "Marcus Lee" và "Marcus Cole", "Dana Whitfield" là Client nhưng cũng là Staff trong Social | Đổi ba nhân vật mẫu của Social sang tên không trùng ai: Nadia Shah, Victor Lee, Noor Hassan (cả trang nguyên mẫu); cập nhật test | Test: không còn tên cũ; mỗi persona Resident giữ đúng tên của Messages trong Social |
| 6 | Xóa bài Social để sót reply, share, mute, mark của bài đó | Staff xóa bài thì dọn dữ liệu của Staff liên quan; dữ liệu của Resident được dọn lần lưu kế tiếp của chính Resident (Staff không ghi khóa của Resident). **Vi phạm đã ghi vẫn giữ** (là hồ sơ) | Test `survey-fixes` |
| 7 | **Hai Resident trả lời cùng một mili-giây có cùng id**, Staff chỉ thấy một người | Id có hậu tố cho tới khi không trùng (Resident và Staff) | **Lỗi thật tìm thấy khi viết test**: trước sửa, Staff thấy 5 trả lời thay vì 7 |
| 8 | Reset dữ liệu mẫu để sót bản nháp, hàng chờ gửi và trạng thái đã đọc cũ, trong khi số hội thoại và tin bắt đầu lại từ c1, m1 | `clearSideData` chạy cùng "Reset demo data" và "Start empty" (hub và hộp Preview) | Test |
| 9 | Số lượt claim promotion của Resident không tính vào giới hạn tổng ("Fully claimed" không bao giờ đạt) | Trang Resident cộng lượt claim của mọi Resident vào giới hạn | Test: hai claim chạm giới hạn 2, người thứ ba bị từ chối |

## Chưa sửa, vì cần quyết định hoặc ngoài phạm vi

| Điểm | Lý do |
|---|---|
| Staff thấy số claim/view mẫu, không thấy claim thật của Resident | Số đó do trang nguyên mẫu 1,38 MB ghi và đọc; sửa cần viết lại phần Promotions của prototype |
| Hai Staff dùng chung "me" trong Social | Chờ quyết (câu hỏi loại 1, số 5) |
| Ba câu hỏi chặn khác (quyền nhắn Admin → Resident, emergency tới Admin, pause đọc được hay không) | Chờ quyết |
| `settings/resident.js` và `partials/settings-app.html` là mã chết (không trang nào nạp) | Xóa tệp cần bạn đồng ý; chưa xóa |
| Các lỗi giao diện chưa chạy trên trình duyệt thật (ngoài các mục trên) | Chờ Prompt 2 đến 6 |

Lưu ý quy trình: ngay sau khi ghi `src/index.html` mình đã ghi nhầm một tệp rỗng đè lên, khôi phục từ git rồi dựng lại có thêm link. Một lần chạy `git rm --cached` nhầm cũng đã hoàn tác (chỉ chạm chỉ mục, không chạm tệp).
