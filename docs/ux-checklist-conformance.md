# Đối chiếu với UX Project Checklist (ux-checklist.com)

Nguồn: https://www.ux-checklist.com/ (đọc ngày 2026-11-10). Áp dụng cho cả 4 portal: **Staff, Admin, Client, Resident**.
Ký hiệu: ✅ đạt, 🔧 đã sửa trong đợt này, ⚠️ còn thiếu (kèm cách xử lý), ➖ thuộc quy trình ngoài code (ghi cách làm).

Phạm vi thật của bản này: UI preview tĩnh, logic ở frontend, dữ liệu trong trình duyệt (xem `messaging-design.md`). Các mục về dữ liệu người dùng thật, A/B test và đo lường chỉ lập kế hoạch được, chưa chạy được.

## Research và Plan

| Mục | Trạng thái | Ghi chú |
|---|---|---|
| Competitive analysis | ✅ | Messages tham chiếu Messenger (ghim, ẩn, phản ứng, nhóm) và checklist PDF `checklist-conformance.md` |
| Data analysis | ➖ | Chưa có số liệu thật. Cần đo ở app thật: tỉ lệ cư dân tự giải quyết với trợ lý, thời gian chờ trong hàng, tỉ lệ nhận khuyến mãi |
| User feedback | ➖ | Nhận xét của bạn nằm trong `issue-log.md`; cần thêm phản hồi từ nhân viên thật |
| User stories | ✅ | Bảng ai nhắn ai, vai trò, luật trong `messaging-design.md`; luật Resident trong `issue-log.md` (quy tắc 3) |
| User flows | ✅ | bot → hàng chờ → nhận → đóng → Ticket box; Staff tạo khuyến mãi → Resident lưu và nhận; Staff bật hướng dẫn → Resident đọc mới vào Social |
| Red routes | 🔧 | Xem mục "Red routes" bên dưới; mỗi route đã chạy thử trên trình duyệt |

## Explore, Communicate

| Mục | Trạng thái | Ghi chú |
|---|---|---|
| Brainstorm, wireframe, prototype | ✅ | Chính bản preview này |
| IA (cấu trúc điều hướng) | ✅ | Cùng một mẫu cho mọi trang riêng: nút Back bên trái, tiêu đề, nút theme, người dùng. Sidebar dashboard thêm Ticket box ở nhóm Services; Resident thêm Settings; Staff nối Settings và Promotions; Client nối Workspace Settings |
| IA, **Admin** | ⚠️ | Admin chưa có trang Settings cá nhân. Cách xử lý: dựng bản riêng từ `account-settings` như Client (bỏ Social, Promotions; thêm cấu hình hỗ trợ). Cần bạn xác nhận |
| Language | 🔧 | 4 dashboard chụp ghi `lang="vi"` nhưng nội dung tiếng Anh; nay đặt lại `en` lúc chạy (`preview.js`). Các trang mới là `lang="en"` |
| Language, đa ngôn ngữ | 🔧 | **Quyết định (bạn chốt 2026-11-10): sản phẩm hiện chỉ có tiếng Anh.** Trang Language của Staff và Client trước đây còn mời chọn Tiếng Việt và Español nhưng chúng chỉ đổi vài nhãn trong prototype; nay chỉ còn English (United States). Muốn thêm ngôn ngữ sau này thì cần dịch Messages, Resident và các trang Settings cùng lúc |
| Accessibility | 🔧 | Xem mục riêng bên dưới |
| Sustainable | ⚠️ | JS rất nhẹ (trang lớn nhất ~70 kB), không có ảnh nặng. Nhưng `staff/account-settings.html` nặng 1,3 MB và bản Client nhúng lại cùng file (1,3 MB nữa). Cách xử lý: tách phần dùng chung thành tệp riêng khi làm bản thật |
| Ethical | ✅ | Dữ liệu mẫu ẩn danh; cư dân chỉ thấy phần đã publish và đúng đối tượng; hộp hướng dẫn cộng đồng có điều kiện đồng ý rõ ràng; Do Not Disturb; không có mẫu gây lầm lẫn (không ép bật thông báo, không đếm ngược giả); khẩn cấp luôn xuyên qua DND |
| Inclusive | 🔧 | Cư dân nay có **Higher contrast** và **Reduce motion** (Settings > Personalize > Comfort), áp dụng cho mọi trang Resident. Staff và Client đã có mục Accessibility (tương phản, focus, chuyển động, vùng chạm). Admin chưa có (xem trên) |

### Accessibility, từng điểm
- Skip link, một `h1`, `main` có `tabindex=-1`: ✅ ở mọi trang riêng (kiểm tự động 18 trang).
- Tên cho mọi nút, ô nhập: ✅ (quét 375/768/1440 sáng/tối).
- Focus nhìn thấy, trả focus sau khi dựng lại danh sách và sau khi đóng hộp thoại: ✅ (lỗi #13, #23).
- Hộp thoại dùng `<dialog>` (khóa focus, Esc); hộp hướng dẫn không đóng được bằng Esc khi là cổng bắt buộc: ✅.
- Tương phản chữ (4,5:1) và vùng chạm (>=32px cảm ứng 44px): ✅ trên các trang mới.
- `prefers-reduced-motion` toàn cục + công tắc riêng của cư dân: ✅ 🔧.
- Không bật JavaScript: 🔧 5 trang động (Messages, Ticket box, Promotions, Social, Settings của Resident) nay có thông báo `<noscript>` thay vì trang trắng.
- Trình đọc màn hình: nhãn `aria-label` có tên đối tượng ("Restore conversation with Jordan Lee"); `aria-live` cho tin mới ✅. Chưa thử với trình đọc màn hình thật ⚠️.

## Create

| Mục | Trạng thái | Ghi chú |
|---|---|---|
| UI elements | ✅ | Chỉ token có tên (`DESIGN.md`), nút và huy hiệu theo mẫu chung, một khối xanh đặc mỗi màn hình (lỗi #21) |
| Gestures | ✅ | Ngăn kéo sidebar bằng vuốt trên mobile (có sẵn); mọi thao tác có nút thay thế; không thao tác nào chỉ có cử chỉ. Chưa hỗ trợ kéo thả ⚠️ (không cần) |
| Responsiveness | ✅ | 375, 768, 1440; sáng và tối; không tràn ngang |

## Give feedback

| Mục | Trạng thái | Ghi chú |
|---|---|---|
| Waiting times | ✅ | Messages có khung chờ (skeleton, chỉ hiện sau 200 ms). Các trang còn lại đọc dữ liệu tức thì nên không cần |
| Errors | ✅ | Lý do cụ thể ("An open emergency cannot be hidden. Acknowledge it first."), lỗi ngay cạnh ô nhập (số điện thoại), `role=alert`; mất kết nối có banner; lưu thất bại có thông báo |
| Completed actions | ✅ | Mọi hành động có thông báo và, khi đảo ngược được, có Undo (ẩn hội thoại, xóa cho tôi). Thông báo trùng chữ không chồng lên nhau (lỗi #20) |

## Finalise, Delight

| Mục | Trạng thái | Ghi chú |
|---|---|---|
| Layout | ✅ | Một nhịp: tiêu đề, thanh công cụ, nội dung; thẻ bo `xl`, bóng `lift-xs` |
| Images và icons | ✅ | Icon SVG cùng bộ, `aria-hidden` khi chỉ trang trí; ảnh bìa khuyến mãi có alt do Staff nhập (Staff bắt buộc nhập alt khi có ảnh) |
| Font và thứ bậc màu | ✅ | Thang chữ 11/12/14/16/18/20/24, trọng lượng <=500 dưới 18px |
| Micro copy | ✅ | Câu chữ cụ thể, một hành động một tên (Hide, Hidden, Restore; Save, Saved) |
| Micro interactions | ✅ | Thích, lưu, ghim có trạng thái `aria-pressed` và đổi tức thì |
| Transitions | ✅ | Chỉ màu, độ mờ, transform; tắt được |

## Analyse

| Mục | Trạng thái | Ghi chú |
|---|---|---|
| KPI setup | ➖ | Đề xuất: (Resident) tỉ lệ tự giải quyết với trợ lý; (Staff) thời gian từ vào hàng chờ đến nhận, thời gian xử lý; (Admin) thời gian phản hồi Support; (Client) số báo cáo mở mỗi tuần; (Promotions) lượt xem, lượt lưu, lượt nhận. Hiện chưa ghi sự kiện đo lường |
| A/B test | ➖ | Ứng viên: chữ nút "Talk to a person" trong luồng trợ lý; vị trí nút Hide; có hiện số trong tab Hidden hay không |
| Test | 🔧 | 82 test logic; quét trình duyệt tay mỗi đợt (`issue-log.md`); chưa có kiểm thử với người dùng thật ⚠️ |

## Red routes (đường đi cốt lõi, đã chạy thử)

| Portal | Red route | Kết quả |
|---|---|---|
| Resident | Hỏi trợ lý, nhờ người, xem trạng thái, đọc lại ở Ticket box | ✅ |
| Resident | Mở Promotions, lưu, nhận mã, copy mã | ✅ |
| Resident | Mở Social lần đầu: đọc hướng dẫn, đồng ý, thích, trả lời, ẩn Social | ✅ |
| Resident | Settings: đổi số điện thoại, theme, Higher contrast, Reduce motion; My property | ✅ |
| Staff | Nhận chat từ hàng chờ, trả lời, đóng; khẩn cấp: ghi nhận | ✅ |
| Staff | Tạo và publish khuyến mãi; bật/tắt hiện cho cư dân | ✅ |
| Client | Nhắn Staff hoặc Support, ẩn và khôi phục hội thoại | ✅ |
| Client | Settings: đổi màu sidebar rồi bấm Dashboard (màu đi theo) | ✅ (kiểu bố cục sidebar chưa: xem `issue-log.md`, Còn mở) |
| Admin | Nhận yêu cầu Support, đổi trạng thái, gửi thông báo toàn hệ thống | ✅ logic có test (open, pending, resolved; chỉ Admin gửi thông báo); trên trình duyệt đã mở được hàng chờ, thread và hộp Announce. Chưa chạy tay hết các nút đổi trạng thái ⚠️ |

## Việc còn mở sau đối chiếu
1. Admin chưa có trang Settings (cần bạn xác nhận hướng).
2. Thử với trình đọc màn hình thật và với 3 đến 5 người dùng thật trên mỗi vai trò.
3. Khi có backend: ghi sự kiện đo lường theo bảng KPI.
