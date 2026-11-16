# Quyết định của chủ dự án (trả lời tám câu chặn của bản đồ)

Ngày 2026-11-14. Đây là **đặc tả** mà bảng tiêu chí Đạt/Không đạt (Prompt 1) bám theo. Chỗ nào build hiện tại khác đặc tả thì ghi là "khoảng cách", sẽ được kiểm ở Prompt 2 đến 6 rồi sửa ở bước 5.

| # | Câu hỏi | Quyết định | Hệ quả cho tiêu chí | Build hiện tại |
|---|---|---|---|---|
| 1 | Phạm vi | Trang sidebar và trang chưa có: **hiện tại nhìn ổn, không phải trọng tâm**. Trọng tâm là **Settings**: có Social không, cài đặt Social có đủ chức năng (mute Social, tắt/mở Social…), Personalize có đủ để đổi cho dễ nhìn, tùy người tùy kiểu, và **có liên kết sang các phần khác không** (cài đặt có tác dụng thật ở trang khác) | Nhóm tiêu chí Settings, Social settings và Personalize được viết nhiều nhất và mức độ Cao. Mỗi cài đặt có tiêu chí "đổi ở đây thì trang X đổi theo" | Chưa biết đủ hay thiếu: phải kiểm |
| 2 | Mục sidebar chưa có trang | **Chọn (a): "Chưa có trong bản xem thử"** là trạng thái chấp nhận được. Phải: không 404, không trang trắng, không vòng lặp, không lỗi hệ thống; có thông báo rõ ("tính năng đang phát triển, chưa khả dụng trong bản xem thử") hoặc nhãn "Sắp ra mắt" cạnh mục và vô hiệu hóa bấm | Tiêu chí: bấm mục chưa có trang thì ra thông báo rõ, không rời trang, không lỗi console. Mục chưa có trang **không** tính là lỗi. 404, trang trắng, vòng lặp tải thì tính là lỗi Cao | Hiện: thông báo "That page is not part of this preview yet." bằng tiếng Anh. Chưa có nhãn "Sắp ra mắt" cạnh mục |
| 3 | Admin gửi Resident một tin rồi bị khóa | **Là lỗi**, không phải thiết kế (chủ dự án: "99% đây là lỗi") | Tiêu chí: Admin gửi được nhiều tin cho cùng một Resident mà không bị khóa gì cả; không bao giờ có trạng thái khóa vĩnh viễn mà người dùng không có cách thoát | **Khoảng cách**: hiện sau tin đầu Admin bị chặn tới khi Resident trả lời, mà Resident không trả lời được. Bị khóa vĩnh viễn |
| 4 | Emergency của Resident có tới Admin không | **Không.** Emergency (xe, bãi đỗ, đổi chỗ) đi tới **Staff (property manager)**. Chỉ khi là **lỗi phần mềm** thì mới gửi ticket hỗ trợ lên Admin | Tiêu chí: emergency của Resident hiện cho Staff; **không** hiện ở Admin. Có đường gửi ticket lỗi phần mềm tới Admin (qua Staff hoặc Client) | Khớp: chỉ Staff thấy emergency. Cần kiểm đường ticket lỗi phần mềm |
| 5 | Hai Staff dùng chung "Property team" | Nhìn từ ngoài: **chủ ý, đúng**. Resident chỉ thấy một đại diện "Property team", dù ai trả lời. Bên trong: **phải phân biệt chức vụ và quyền**: Property Manager (quyền cao nhất: duyệt chi phí, khiếu nại cao, cấu hình), Leasing Agent hoặc Front Desk (yêu cầu thông thường, hỏi đáp lịch và tiện ích), Maintenance Staff (ticket sửa chữa thiết bị, điện nước) | Tiêu chí: Resident không thấy tên riêng của từng nhân viên trong Social. Có tiêu chí vai trò bên trong: quyền theo chức vụ | **Khoảng cách (lớn)**: hiện hai Staff có quyền ngang nhau; chưa có ba chức vụ |
| 6 | Resident bị pause Social: đọc được hay bị chặn hoàn toàn | **Mặc định: vẫn đọc được, không bình luận/phản hồi/react/share** (cách mềm). **Chặn hoàn toàn chỉ dùng cho ngoại lệ nghiêm trọng** (phát tán mã độc, lừa đảo, tấn công hệ thống; lăng mạ, đe dọa, quấy rối nghiêm trọng nhân viên cần cô lập) | Tiêu chí: pause thường thì Resident đọc được bảng tin, không viết được. Có cách chặn hoàn toàn cho ngoại lệ, tách khỏi pause thường | **Khoảng cách**: hiện mọi pause đều chặn hoàn toàn, và chữ trong giao diện Staff lại nói "vẫn đọc được" |
| 7 | Resident bị khóa Social có dùng Messenger không | **Có.** Messages và Social **tách biệt**; khóa Social không ảnh hưởng Messages | Tiêu chí: Resident bị pause hoặc chặn ở Social vẫn nhắn Staff bình thường | Khớp (hai hệ độc lập) |
| 8 | Số liệu mẫu lệch nhau | **Gói chuẩn**: Resident **/800**, Staff **/10**, Parking **tối thiểu /300**. Chưa trả lời: "32 warnings" hay 8 mục, "$19 revenue" | Tiêu chí: mọi nơi hiện giới hạn gói (thẻ Capacity, thông báo, trang Capacity, Workspace) phải nhất quán với 800 / 10 / ≥300. Hai số chưa quyết: ghi "chờ quyết", không chấm | **Khoảng cách**: hiện Parking 261/500 (Capacity) và 261/25 (thông báo), Staff 0/0 và 18/3, không có hạn mức Resident |

## Điều chưa được trả lời

- "32 platform warnings" hay 8 mục trong Platform health.
- "$19 monthly revenue" có khớp các gói không.
- Câu hỏi Loại 2 (27 + 34 + 9 + 11 + 13 + 9 + 20): tiêu chí ghi "theo hành vi hiện tại, chờ quyết".

## Lưu ý khi đọc câu trả lời

Tin nhắn trả lời có hai lần đánh số lệch nhau (số 3 là ví dụ cho lựa chọn (b) của câu 2, số 4 và 5 tương ứng câu "Admin gửi một tin rồi bị khóa"). Bảng trên đọc theo thứ tự câu hỏi gốc. Nếu có chỗ hiểu sai, nói lại để sửa.
