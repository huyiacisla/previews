# Tóm tắt công việc của phiên

Dự án: `easyspotops` (Vite + Tailwind 4, bản xem trước tĩnh của bốn portal Staff, Admin, Client, Resident; máy chủ dev `http://localhost:3590`).
Ngày: 2026-11-10 đến 2026-11-11. Giao diện sản phẩm chỉ có tiếng Anh; tài liệu này viết bằng tiếng Việt.

**Trạng thái:** mọi thay đổi vẫn **chưa commit** (theo yêu cầu: chỉ commit khi được bảo). Chi tiết từng lỗi và quyết định nằm trong [`issue-log.md`](issue-log.md) (65 mục đánh số). Tài liệu này chỉ gom lại theo chủ đề.

---

## 1. Những gì đã làm cho sản phẩm

### 1.1 Khung dùng chung cho cả ba portal (#28 đến #34, #37 đến #41, #44, #48 đến #53, #58, #59, #61)
- Staff, Client, Resident dùng **một header và một sidebar** dựng từ khung Staff (`src/portal-frame.js`), điền menu, tên, tài khoản theo từng vai trò.
- Hành vi thêm vào khung ở `src/portal-frame-extras.js`: lọc menu, giờ địa phương, chuông có số thật, tìm kiếm Ctrl/Cmd+K, ghim yêu thích, menu hồ sơ (trạng thái, thông báo trạng thái, thời hạn tự hết).
- Messages, Ticket box, Notifications, Settings, Promotions của Resident đều nằm trong khung; Back và mọi lối thoát đưa về trang thật của portal, giữ `?as=`.
- Mỗi trang có **địa chỉ riêng như web** (`/staff/settings/profile`, `/client/workspace/billing`, `/resident/settings/personalize`…), bảng đối chiếu duy nhất ở `staff-routes.js`; địa chỉ cũ tự chuyển.
- Header luôn một dòng ở 640 đến 880 px; nút cảm ứng có vùng chạm 44 px mà không đổi hình dáng; ngăn menu mobile cuộn đủ dài.

### 1.2 Client Workspace (#63)
- Dựng lại quanh **công ty → portfolio → property** (Company, Properties và trang riêng từng property, Parking and enforcement, Resident experience, Team and roles, Plan and billing, Reports and alerts, Security, Data and recovery).
- Mã ở `src/staff/client-workspace.js`. Client là công ty **AMC LLC** (khách hàng trả tiền); Mallard Pointe, Sundale… là property của công ty.

### 1.3 Usage > Capacity (#64, #65)
- Sidebar Client có nhóm **Usage** (dưới Services) với mục **Capacity** (`/client/usage/capacity.html`).
- Trang dịch vụ để thêm: Parking spaces +$5, Resident accounts +$2, Staff members +$10, Document storage +20 GB giá $15 (đã gồm 10 GB), phiếu Add another property $25; có bộ +/−, thanh dùng, **máy tính tổng kết** như Budget planner (hiện tại $50.00, từng dòng thêm, tổng mới, ngân sách tuỳ chọn), hộp "Review & confirm" ghi vào Billing & Plan.
- Quy tắc giá nằm ở `src/capacity/store.js` (10 test). Thẻ Capacity summary ở sidebar dùng số thật và có hàng Storage.

### 1.4 Documents (#64, #65)
- `/client/documents.html`: tab theo loại, lọc property (có biểu tượng phễu), tìm, tài liệu hết hạn lên đầu, tải lên có kiểm tra, xoá có Undo, mức chia sẻ.
- **Thanh dung lượng** (10 GB gồm sẵn, gần đầy từ 90%, đầy thì chặn tải lên và dẫn sang Capacity).
- **Business W-9** là dòng bị khóa trong danh sách (Tax forms); mở bằng **Document secret key** (tự tạo mỗi lần, dùng một lần, hiệu lực ngắn, 5 lần sai thì tạo key mới), có thêm PIN 6 số hoặc mật khẩu do doanh nghiệp đặt. Quy tắc ở `src/documents/store.js` (14 test).

### 1.5 Notifications, Ticket box, Messages (#19 đến #20, #42 đến #47, #49)
- Trang **Notifications** riêng cho cả ba vai trò: tìm kiếm, tab All/Unread/Read, bộ lọc gom trong nút Filters, Mark all as read có Undo, "Showing N of M"; chuông đếm từ dữ liệu thật.
- Ticket box: **Create ticket** (Staff, Client), mã T-xxxx tuần tự, trả lời trong ticket.
- Messages: Hide conversation có Undo và tab Hidden; thông báo trùng chữ thay thế nhau.

### 1.6 Resident (#5, #50 đến #52, #54, #55, #60)
- Social là **trang riêng** theo Social Portal thật, mở ra là feed; **chính sách bắt buộc đọc** (modal, cuộn tới cuối, Agree, tick, Confirm), Privacy mode, Pulse, chuông, "View all" mở tấm trong Social.
- Settings dùng đúng trang Settings của Staff nhưng **không có Workspace, Availability, Promotions**; mọi lựa chọn Personalize và Accessibility áp lên mọi trang Resident.
- Promotions của Resident chỉ thấy bài đã xong, đã bắt đầu, chưa hết hạn, đúng đối tượng.

### 1.7 Staff Social (#56, #57)
- `/staff/social.html`, cùng một bộ mã với Resident (`data-portal`), có ô "Start a discussion…", Needs reply, Your announcements, mute thread. Dữ liệu dùng chung với Resident, bài "Staff only" không lọt sang cư dân (có test).

### 1.8 Cá nhân hóa (#11, #26, #36)
- `src/look-prefs.js` biến lựa chọn Text, Buttons, Cards, Gestures, Clock, Favorites thành một stylesheet nhỏ; trang chưa ai tùy chỉnh thì không đổi gì.
- Resident có Higher contrast và Reduce motion.

---

## 2. Rà soát chất lượng

- Quét tự động nhiều đợt (3 cỡ 375/830/1440 × sáng/tối, tràn ngang, vùng bấm, chữ nhỏ, tương phản, tên điều khiển, id trùng), cộng bấm tay mọi liên kết, Back và lối thoát.
- Lỗi lặp lại đáng nhớ: quên **trả focus** sau khi vẽ lại (#13, #23); khối mã chèn trước chỗ khai báo làm `preview.js` dừng giữa chừng (#48); đổi tên tệp dùng chung mà không grep các chỗ nhúng (#59); nút nổi chồng nhau vì mỗi nơi tự đặt vị trí (#58, #62).
- Test: nhật ký ghi **118 test đạt** ở lần chạy gần nhất cho bộ chung (#58 đến #60); trong lượt này chưa chạy lại.
- `npm audit`: 6 cảnh báo ở gói dev (`shadcn`), gói chạy thật 0 lỗ hổng (#17).

---

## 3. Dọn công cụ (đoạn cuối phiên)

- `lean-ctx` v3.10.1: báo cáo `doctor`, dọn cache, **cài lại chỉ cho Claude Code** (gỡ sạch rồi `init --agent claude`), thêm `Remove-Item` vào allowlist. Đã xác nhận `ctx_read`, `ctx_search`, `ctx_tree`, `ctx_shell` hoạt động.
- Đã **xoá penpot, serena, codegraph** khỏi cấu hình MCP (`~/.claude.json`) và **gỡ khỏi máy**: `serena*.exe` trong `~\.local\bin`, thư mục `~\.serena` (33 MB), `~\.codegraph`. Còn lại MCP: `lean-ctx`, `context7` (`gitlab` chờ cấp quyền). Cần mở phiên Claude Code mới để danh sách làm mới.
- Giữ nguyên `uv`, `uvx`, `uvw`, `twitter.exe`.
- Lưu ý bảo mật: `claude mcp list` đã in token penpot ra tab terminal c5. Nên đóng tab đó và đổi token nếu coi là đã lộ.
- Không đụng tới mã nguồn sản phẩm trong đoạn này.

---

## 4. Việc còn mở

**Sản phẩm** (đầy đủ ở mục "Còn mở" của `issue-log.md`):
- Admin chưa dùng chung khung Staff; Admin chưa có Settings.
- Kiểu bố cục sidebar, kiểu menu, kiểu icon chưa sang được dashboard thật; cần quyết định dựng lại hay bỏ lựa chọn.
- Ticket box: chưa đính kèm tệp, chưa Rating cho ticket Support.
- Resident Social chưa có hồ sơ, theo dõi, báo cáo bài. Staff chưa thấy phản hồi và lượt thích của cư dân (cần kênh riêng, hỏi trước).
- Trang Settings của Staff, Client nặng khoảng 1,3 MB mỗi bản.
- Số liệu gói là số mẫu; cần đối chiếu bảng giá thật của Billing & Plan.

**Công cụ** (chưa làm, cần bạn đồng ý):
- Thêm `C:\Users\satth\.local\bin` vào PATH.
- `lean-ctx update` lên bản mới hơn.
- Xoá cấu hình `lean-ctx` còn sót ở CodeBuddy.
- Xoá `.claude/settings.local.json` (hook lean-ctx cục bộ, chưa được theo dõi bởi git).

---

## 5. Ràng buộc đang áp dụng

- Trả lời bằng tiếng Việt; giao diện sản phẩm chỉ tiếng Anh.
- Mọi lỗi hoặc quyết định đều ghi vào `docs/issue-log.md`.
- Không commit khi chưa được yêu cầu.
- Bạn đã từ chối truy cập `staff.easyspotops.com`; không thử lại. Không thao tác trong tab trình duyệt của bạn.
