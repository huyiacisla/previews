# Đối chiếu với "Bộ prompt kiểm thử chuyên gia — HTML + Database"

Ngày 2026-11-13. Tài liệu gốc: 9 prompt chạy theo thứ tự 0 → 8 (khảo sát, tiêu chí, năm lượt kiểm chuyên sâu, tổng hợp và cổng, hồi quy).

## Kết luận ngắn

Việc kiểm thử đã làm tới nay **chưa đúng quy trình này**. Đã có nhiều kiểm tra thật và nhiều lỗi đã sửa, nhưng thiếu hai thứ quy trình coi là bắt buộc: **bản đồ hệ thống đã được duyệt (Prompt 0)** và **bảng tiêu chí Đạt/Không đạt (Prompt 1)**. Không có tiêu chí thì theo đúng tài liệu là "không chấm được Đạt/Không đạt", nên mọi câu "đã ổn" trước đây chỉ là nhận định, chưa phải kết quả chấm.

## Từng bước

| Bước | Tài liệu yêu cầu | Hiện trạng | Đúng quy trình? |
|---|---|---|---|
| Prompt 0 — Khảo sát | Đọc toàn bộ mã và cấu trúc dữ liệu, lập bảng trang, bảng dữ liệu, luồng, CRUD, điểm mù, câu hỏi. Chủ dự án duyệt | Chưa có bản đồ nào bằng văn bản. Hiểu biết về hệ thống nằm rải trong `docs/issue-log.md` và mã | **Chưa.** Đang làm ở lượt này: `docs/qa/01-ban-do-he-thong.md` |
| Prompt 1 — Tiêu chí | Bảng tiêu chí có ID (F, D, U, X, S), trả lời được Có/Không, có cách kiểm, có mức độ | Chưa có. Có 297 test tự động nhưng chúng không được đánh số theo tiêu chí và không phủ đủ 6 nhóm cho mỗi tính năng | **Chưa** |
| Prompt 2 — Chức năng | Mở trình duyệt thật, chạy từng tiêu chí F, thử phá (bấm 2 lần, Refresh/Back, 2 tab, 5.000 ký tự, mạng chậm) | Đã bấm thật một số luồng (Messages, Ticket box, Social, Admin, Notifications). Phần lớn còn lại kiểm bằng test ở tầng dữ liệu. Chưa thử 5.000 ký tự trên giao diện, mạng chậm, mất mạng | **Một phần**, không theo tiêu chí |
| Prompt 3 — Database | Sáu lớp: thiết kế, CRUD, chất lượng dữ liệu, đồng thời, bền vững, sao lưu | Dữ liệu là `localStorage`, **không phải database thật** (tài liệu yêu cầu ghi rõ điều này). Có test cho quyền, trùng số ticket, hai tab ghi cùng lúc. Chưa có kiểm tra sao lưu/khôi phục, chưa có "query" chạy định kỳ | **Một phần** |
| Prompt 4 — UI | Chụp **mỗi** trang ở 375, 768, 1440; chấm 7 mục; cho điểm 1–10 | Đã đo tràn ngang 45 trang × 7 độ rộng và tương phản chữ sáng/tối. Chỉ chụp một số trang; mốc tablet dùng 830 chứ không phải 768; chưa chấm cỡ chữ thân ≥ 16 px trên mobile, vùng bấm ≥ 44 px, trạng thái hover/focus/disabled, favicon | **Một phần** |
| Prompt 5 — UX | Đóng vai 3 người dùng, chấm 10 nguyên tắc Nielsen /40, top 5 vấn đề | Chưa làm | **Chưa** |
| Prompt 6 — Bảo mật, hiệu năng, accessibility | Thử chèn mã độc vào ô nhập, Lighthouse từng trang, 1.000 dòng, bàn phím, phóng 200% | Chưa thử chèn mã độc, chưa chạy Lighthouse, chưa thử 1.000 dòng, chưa thử phóng 200%. Bàn phím mới thử ở vài chỗ | **Chưa** |
| Prompt 7 — Cổng | Gộp lỗi, áp ngưỡng (0 Nghiêm trọng, ≥ 95% F và D, ≥ 85% tổng, "Chưa kiểm được" ≤ 5%) | Chưa có | **Chưa** |
| Prompt 8 — Hồi quy | Test lại lỗi đã sửa bằng đúng bước tái hiện cũ, cộng mọi tiêu chí Nghiêm trọng và Cao | Mỗi lỗi sửa xong có kiểm lại, nhưng không theo bảng so sánh vòng trước/vòng này | **Một phần** |

## Ba quy tắc vàng

| Quy tắc | Hiện trạng |
|---|---|
| Dùng phiên AI **mới** để test, tránh tự chấm bài mình | **Vi phạm.** Tới nay cùng một phiên vừa làm vừa kiểm. Từ Prompt 0 trở đi, việc khảo sát và kiểm thử được giao cho các phiên độc lập chưa thấy quá trình làm |
| Chạy **thật** (mở trình duyệt, đọc dữ liệu), không suy đoán từ mã | **Một phần.** Nhiều kết luận trước đây dựa trên test tầng dữ liệu hoặc đo tự động |
| Không bằng chứng = "Chưa kiểm được", không bao giờ là Đạt | **Một phần.** Các báo cáo trước có ghi phần chưa kiểm, nhưng không có bảng ba giá trị |

## Việc tiếp theo, đúng thứ tự của tài liệu

1. **Prompt 0**: hoàn thành bản đồ hệ thống. **Bạn duyệt mục "Luồng người dùng" và "Câu hỏi"** rồi mới sang bước sau.
2. **Prompt 1**: sinh bảng tiêu chí từ bản đồ đã duyệt. Bạn xóa, thêm, chốt.
3. **Prompt 2–6**: mỗi prompt một phiên riêng, chạy trên trình duyệt thật, chấm ba giá trị.
4. **Prompt 7**: áp cổng. Sửa lỗi theo mức độ.
5. **Prompt 8**: hồi quy cho tới khi qua cổng.

Phần chuyển sang Alpine.js tạm dừng ở 2/10 trang cho tới khi qua cổng, vì đổi mã trong lúc đang chấm sẽ làm kết quả chấm mất giá trị.
