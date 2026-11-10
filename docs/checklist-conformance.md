# Đối chiếu với "Property Messenger UI/UX & Technical Specification"

Nguồn: file PDF checklist do bạn cung cấp (12 trang). Bảng dưới liệt kê từng mục, mức đáp ứng của bản demo hiện tại và nơi cài đặt.
Quy ước chốt trước đó: **logic chạy ở frontend, đủ để demo** (xem `messaging-design.md`). Mục nào cần server thật được ghi rõ là "cần backend".

Ký hiệu: ✅ đã có · 🟡 có một phần / mô phỏng · ❌ chưa làm · 🔌 cần backend (demo chỉ mô phỏng hoặc không làm).

## Khác biệt về tên vai trò (cần bạn xác nhận)

| Spec | Bản demo | Ghi chú |
|---|---|---|
| Resident | Resident | Giống nhau |
| Field Staff / Maintenance và Property Manager | **Staff** (ví dụ "Property Manager", "Parking Coordinator") | Demo gộp hai vai vào Staff |
| Admin / PM (xem mọi thread) | **Admin** = đội hỗ trợ nền tảng EasySpotOps | Admin **không** thấy chat resident; chỉ thấy support, thông báo và chat trực tiếp của mình |
| Owner / Client | Client | Chỉ chat với Staff và Admin, chưa có kênh tài chính |

Hệ quả: "Admin thấy mọi thread" và "Executive Admin" trong spec chưa có tương ứng. Nếu bạn muốn Admin xem toàn bộ ticket của resident, đó là một quyết định về quyền, cần chốt trước khi sửa `canSee`.

## 1. Kiến trúc

| Mục | Mức | Ghi chú |
|---|---|---|
| RBAC chặt, thread theo từng người | ✅ | `store.js`: `CAN_MESSAGE`, `canSee`, `postCheck`; test ngẫu nhiên kiểm ai thấy gì |
| Gắn thread với dữ liệu căn hộ | ✅ | Hàng/đầu thread hiện **Unit**; panel chi tiết cột 3 hiện hợp đồng, công nợ, ghi chú vào nhà (dữ liệu mẫu) |
| WebSocket + long-polling dự phòng | 🔌 | Demo đồng bộ giữa các tab bằng `BroadcastChannel`; `transport.js` là điểm thay |
| Audit log bất biến | 🟡 | Thẻ audit trong thread có; "bất biến thật" cần server |

## 2.1 Vai trò và màu

| Mục | Mức | Ghi chú |
|---|---|---|
| Màu avatar/badge theo vai trò | ✅ | Resident xám (slate), Staff vàng hổ phách, Admin chàm/xanh (info), Client lục (emerald). Dùng **token** `muted`, `warning`, `info`, `success`, không dùng mã hex của spec vì DESIGN.md cấm màu thô |
| Matrix: thông báo chỉ Admin tạo, resident chỉ đọc | ✅ | Thông báo một chiều; "bật bình luận" chưa có |
| Ticket riêng: chỉ resident, nhân sự được giao, quản lý | 🟡 | Resident và Staff được giao/Staff đang xem hàng chờ; Admin không thấy (xem bảng vai trò) |
| Kênh tài chính chỉ cho Owner + Executive Admin | ❌ | Chưa có loại thread này |

## 2.2 Loại thread

| Mục | Mức | Ghi chú |
|---|---|---|
| Direct 1:1 | ✅ | Staff ↔ Client, Staff/Admin → Resident (một chiều tới khi trả lời) |
| Ticket bảo trì, tự tạo khi gửi yêu cầu | 🟡 | Luồng resident → trợ lý → hàng chờ → nhận cuộc là "ticket"; không có form work order riêng |
| Tiêu đề gắn Unit | ✅ | Ví dụ "Unit 05-114 · Vehicle or permit" |
| Thông báo + bảng theo dõi đã đọc ("84% đã xem") | ✅ | Người gửi/Admin thấy "% read (x of y)" và tên người chưa đọc (`get().ack`) |
| Kênh tài chính / dự án vốn, đính kèm hồ sơ | ❌ | Chưa có |

## 2.3 Khẩn cấp

| Mục | Mức | Ghi chú |
|---|---|---|
| Bong bóng viền đỏ, nền nhạt, nhấp nháy nhẹ | ✅ | Viền 2px đỏ + nền đỏ nhạt (token `danger`), nhấp nháy bằng opacity, tắt khi chọn giảm chuyển động |
| Banner cố định trên đầu cho quản lý đến khi xác nhận | ✅ | Staff và Admin, `role="alert"`; nút **Acknowledge** |
| Vượt qua giờ yên lặng / chế độ gom | ✅ | Khẩn cấp vẫn tính vào số chưa đọc dù Do Not Disturb hoặc tắt tiếng; vượt giới hạn "một ghi chú tới khi trả lời" |
| SMS dự phòng sau 180 giây | 🟡 | Sau 180 giây chưa xác nhận: thẻ audit "SMS and critical alert sent (simulated)". Gửi SMS và âm thanh push thật 🔌 |
| Resident báo khẩn cấp bỏ qua trợ lý | ✅ | Vào hàng chờ ngay, xếp đầu danh sách |

## 2.4 Phương tiện

| Mục | Mức | Ghi chú |
|---|---|---|
| Nén ảnh trên thiết bị: cạnh ≤1920px, WebP, ~300KB | ✅ | `prepareFile`; trình duyệt không mã hóa WebP thì dùng JPEG |
| Xóa EXIF/GPS | 🟡 | Vẽ lại qua canvas nên mất toàn bộ EXIF, **kể cả mốc thời gian** (spec muốn giữ mốc thời gian chụp; demo dùng giờ gửi) |
| Thẻ tài liệu PDF/DOCX/ảnh, xem trước tương tác | 🟡 | Đính kèm và tải về được; chưa có xem trước nội dung PDF/DOCX |
| Annotate, Sign Document | ❌ | Không làm trong demo |
| Tin nhắn thoại + phiên âm trong 5 giây | ❌ 🔌 | Cần micro, bộ nhận dạng giọng nói phía server |

## 2.5 Vòng đời ticket và audit

| Mục | Mức | Ghi chú |
|---|---|---|
| Chip Open → In progress → Waiting on resident → Resolved → Closed | ✅ | Thanh tiến trình dưới đầu thread (`ticketStage`), Staff đổi In progress ↔ Waiting; resident trả lời thì tự về In progress |
| Thẻ audit trong thread: thay đổi, người thực hiện (ID + tên), ISO | ✅ | Cho trạng thái ticket, ưu tiên, người phụ trách, trạng thái support, xác nhận khẩn cấp, leo thang |
| Bất biến | 🟡 | Không sửa, không xóa, không ẩn được trong demo; bất biến thật 🔌 |

## 2.6 Giao diện desktop 3 cột

| Mục | Mức | Ghi chú |
|---|---|---|
| Cột 1: tìm kiếm, bộ lọc ưu tiên, danh sách có số chưa đọc | ✅ | Tab lọc, tìm kiếm có cấu trúc, số chưa đọc |
| Cột 2: luồng chat, sự kiện hệ thống, composer có đính kèm | ✅ | Composer là văn bản thuần (chưa rich text) |
| Cột 3: panel ngữ cảnh (hồ sơ, hợp đồng, công nợ, hướng dẫn vào nhà, ticket cũ) | ✅ | Panel "Resident and unit" cho Staff/Admin: hồ sơ, căn hộ, thời hạn hợp đồng (còn bao nhiêu ngày, sắp hết hạn trong 60 ngày, đã hết hạn), công nợ (đỏ khi còn nợ), ghi chú vào nhà, 5 ticket gần nhất (bấm để mở nếu có quyền), nút hành động nhanh (nhận cuộc, chờ resident, xác nhận khẩn cấp, cờ quan trọng, ghim, tắt tiếng). Cuộc không có resident hiện danh sách người tham gia. Từ 1280px là cột thứ ba; hẹp hơn là ngăn kéo bên phải. Nút ⓘ trên đầu thread bật/tắt, nhớ lựa chọn, Esc đóng. Dữ liệu mẫu trong `personas.js` (`unit`); app thật đọc hệ thống quản lý tòa nhà 🔌 |
| Co lại theo tablet/mobile | ✅ | Breakpoint 1024px và 640px, một khung ở mobile |

## 2.7 Mobile

| Mục | Mức | Ghi chú |
|---|---|---|
| Nút chính trong vùng ngón cái (35% dưới) | 🟡 | Gửi, đính kèm, emoji, khẩn cấp ở đáy; đổi trạng thái ticket ở đầu thread |
| Bottom sheet thay popup giữa màn hình | 🟡 | Mọi hộp thoại thành bottom sheet dưới 640px; chưa có bộ chọn đính kèm/ưu tiên riêng |
| Chế độ tương phản cao ngoài trời | ✅ | Công tắc trong Preview tools hoặc `?contrast`, nhớ theo thiết bị |

## 2.8 Tìm kiếm

| Mục | Mức | Ghi chú |
|---|---|---|
| Truy vấn có cấu trúc `unit:304 status:open priority:high "water leak"` | ✅ | `query.js`: `unit`, `status`, `priority`, `assignee`, `tag`, `after`, `before`, cụm trong ngoặc kép; có test |
| Bộ lọc theo Unit, Người phụ trách, Ngày, Tag | ✅ | Nút "+ unit" … thêm bộ lọc, chip bỏ được từng bộ lọc |
| Ô tìm trên thanh điều hướng toàn cục | 🟡 | Có trong trang Messages (Ctrl/Cmd+K); chưa gắn lên thanh trên cùng của dashboard |
| Tag phân loại Plumbing/Electrical/HVAC/Lease | 🟡 | Dùng chủ đề của trợ lý (Vehicle or permit…), chưa có danh mục bảo trì |

## 2.9 Ngoại tuyến

| Mục | Mức | Ghi chú |
|---|---|---|
| Hiển thị lạc quan: 50% độ mờ + đồng hồ | ✅ | Trạng thái "Waiting for connection" |
| Hàng đợi IndexedDB | 🟡 | Dùng `localStorage` thay IndexedDB (giữ qua tải lại trang); bản thật nên dùng IndexedDB |
| Gửi lại 1s, 2s, 4s, 8s, tối đa 30s khi có mạng | ✅ | Lùi theo cấp số nhân 1, 2, 4, 8, 16, rồi mỗi 30 giây; gửi ngay khi mạng quay lại |
| Service worker theo dõi kết nối | ❌ 🔌 | Demo dùng hẹn giờ và sự kiện `online` trong trang |

## 2.10 Truy cập

| Mục | Mức | Ghi chú |
|---|---|---|
| Tương phản 4.5:1 | 🟡 | Kiểm tay nhiều trạng thái ở các lượt trước; chưa chạy lại tự động cho toàn bộ trạng thái mới |
| `aria-live` polite cho tin thường, assertive cho khẩn cấp | ✅ | Nhật ký tin là `role="log"`; banner khẩn cấp `role="alert"` |
| Bàn phím và bẫy focus trong hộp thoại | ✅ | Hộp thoại gốc `showModal()` tự bẫy focus |
| Alt+N, Ctrl/Cmd+K, Esc | ✅ | Alt+N mở thread chưa đọc tiếp theo (khẩn cấp, quan trọng, mới nhất); Ctrl/Cmd+K tới ô tìm; Esc đóng menu và hộp thoại |

## 3. Mã CSS mẫu

Không dán nguyên văn: dự án dùng token và class Tailwind theo DESIGN.md (không hex thô, không `100vh` cố định). Khung cột chính giống tinh thần mẫu (danh sách 22rem, chat co giãn, breakpoint 1024px và 640px).

## Việc đề xuất làm tiếp (theo giá trị cho demo)

1. Kênh tài chính / dự án vốn cho Client và quản lý (loại thread mới và quyền riêng).
2. Quyết định về vai trò Admin: có xem mọi ticket resident không.
3. Xem trước PDF/DOCX trong thread.
4. Tin nhắn thoại có phiên âm (cần micro; phiên âm giả lập).
