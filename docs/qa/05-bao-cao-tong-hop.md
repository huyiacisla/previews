# Báo cáo tổng hợp QA

## Lượt 3 (2026-11-15): kiểm lại độc lập lần nữa
Tester độc lập chạy lại các dòng còn Không đạt/Chưa kiểm được cộng hồi quy. Chi tiết: `08-ket-qua-lai-A1.md`, `A4`, `A5`, `08-ket-qua-A6-doc-lap.md` (A3 lượt 3 chưa có kết quả khi viết; A2 không chạy lại, giữ lượt 2).

| Nhóm | Tổng | Đạt | Không đạt | Chờ quyết | Chưa kiểm được | % Đạt | Lượt 2 |
|---|---|---|---|---|---|---|---|
| A1 Messages, Ticket box | 218 | 208 | 9 | 0 | 1 | 95,9% | 92,6% |
| A2 Social (giữ lượt 2) | 199 | 183 | 14 | 0 | 2 | 92,9% | 92,9% |
| A3 Settings (kiểm lại 76/103 dòng cần kiểm, 12 dòng hồi quy) | 252 | 172 | 42 | 6 | 32 | 78,2% | 71,6% |
| A4 Notifications, Promotions, Documents, Admin | 215 | 208 | 4 | 2 | 1 | 97,2% | 96,3% |
| A5 Điều hướng, khung | 199 | 145 | 36 | 0 | 18 | 80,1% | 76,3% |
| A6 Định tuyến (kiểm độc lập, 35 dòng) | 35 | 33 | 2 | 0 | 0 | 94,3% | 100% (tự đánh giá, 25 dòng) |
| **Tổng** | **1.118** | **949** | **107** | **8** | **54** | **89,2%** (949 ÷ 1.064) | 86,7% |

Lưu ý: A3 lượt 3 chưa kiểm hết (27 dòng giữ kết quả lượt 2, phần hồi quy mới 12/30 dòng) vì tester bị ngắt giữa chừng; chi tiết `08-ket-qua-lai-A3.md`. Tester A3 **chưa đo lại sau các sửa của đợt này** (Pin trùng, aria-current, Larger tap targets, nút primary focus, toast Settings, khung Admin); cần đo lại F352, D364, S318, S319, U329, U320, X307, D324.

**A3 lượt 3, lỗi còn lại (42 dòng)**: Nghiêm trọng S325 (Phone/Email Property profile lưu 5.000 ký tự; **đã sửa sau lượt đo**: ô cắt ở 30/120/200 ký tự, cả khi đặt bằng mã hay dán; chưa kiểm lại). Cao: F311 (avatar Staff không hiện trong nội dung Messages), F318 (Badge count, In-app New request/Escalation và In-app sound chỉ lưu), F329 (công ty bắt buộc 2-step nhưng công tắc cá nhân không bị ép), U312/U313/U318 (tương phản màu nhấn), F339 (chữ mục sidebar không theo màu chọn), F343 (Rail, Property switcher, Menu style không tác động sidebar Staff: Property switcher không đụng theo quyết định của bạn), S319 (nút "Open navigation" 40×36), F351 (giờ danh sách Messages Staff vẫn 12 giờ), F360 (tắt Social ở Staff chặn luôn Resident), F384, F335, F368, X301, X303, D364, D365, NEW-2 (Staff Promotions trong khung không theo giao diện đã chọn). Trung bình và Thấp: xem `08-ket-qua-lai-A3.md`. 6 dòng Chờ quyết (F322, S330, X304, X313, U317, X319).

**Kiểm độc lập A6 bắt được 2 chỗ tự đánh giá sai**: R607 (khẩn cấp viết bằng lời không tạo khẩn cấp thật) và R624 (Ticket box của Resident lộ tên nhân viên và thẻ Escalation). Cả hai **đã sửa sau lượt đo** (mở rộng regex khẩn cấp và tạo `conv.emergency`; che tên và lọc thẻ Escalation trong `ticketRecord`/`get()`), có test, nhưng chưa có tester độc lập kiểm lại, nên bảng vẫn ghi 33/35.

### Bổ sung sau lượt 3 (2026-11-15, tự kiểm; 417 test qua, build qua; chưa có tester độc lập)
Các hạng mục dưới đây **không nằm trong bảng % ở trên** (đó là các phiên bản tiêu chí đã đo ở lượt 3). Chi tiết, nguyên nhân và 28 bài học: `09-social-admin-ghi-chu.md`.
- **Lỗi giật khi kéo thanh cuộn ở Admin > Settings > Personalize** (người dùng báo): đã tái hiện (nhảy từ đầu trang tới 100 hoặc 160 px bị đặt về 0, tới ≥ 300 px bị cắt còn 260). Nguyên nhân: thẻ xem trước tự thu nhỏ khi cuộn, giẫm lên nhau giữa scroll anchoring của trình duyệt, hai bộ điều khiển trạng thái "stuck" không có độ trễ, và một bản sửa cũ đo trang sau khi đã thu nhỏ. Đã sửa; 16/16 điểm nhảy đúng, kéo chậm 0 lần lệch, chiều cao trang không đổi, chuột lăn thật một chiều. **Chưa kiểm bằng kéo thanh cuộn thật** (công cụ không bấm trúng thanh cuộn gốc): người dùng thử lại và báo "đỡ giật rồi" (giảm, chưa chắc hết hẳn: chờ báo còn giật ở đâu, khi nào, bằng chuột hay cảm ứng). Có 4 test nguồn ghim điều kiện.
- **Social Admin mới**: Social management (danh sách property, tìm, lọc, menu ba chấm), Social monitoring (Posts, Activity, Moderation, Checks), nút "Báo cho đội property" gửi qua Messages (đã thử gửi thật tới Staff).
- **System health** (`/admin/health.html`): kiểm tra dữ liệu của Messages (9), Documents (8), Notifications (3) và Social của từng property (11), mỗi lỗi có "ở đâu" và "cách sửa", có Copy report.
- **Vòng đời property** theo quy tắc của chủ dự án: Admin hoặc Client (gỡ khỏi portfolio ở Usage > Capacity) kết thúc một property; người dùng của property bị chặn với "Sorry, you no longer have access."; Social, Promotions và dữ liệu Resident bị niêm phong; property cuối cùng không gỡ được; id property cố định (sửa rủi ro lộ dữ liệu giữa các khách hàng khi id theo thứ tự). Chưa niêm phong Messages (một tài liệu dùng chung với vé hỗ trợ của Admin) và Documents (thuộc công ty); chưa xóa vĩnh viễn (chờ quyết định pháp lý).
- **Bàn phím thật qua các hộp thoại mới** (End property, Report, gỡ property ở Capacity, menu ba chấm): Tab, Shift+Tab, Esc đạt; đã sửa lỗi focus rơi về `<body>` sau Esc.
- **Cấu hình**: các trang và hộp mới đã đo ở 375, 830, 1440, sáng và tối (tràn ngang, vùng chạm, tương phản); lỗi tìm thấy và đã sửa: vùng chạm 20 px của `<summary>`, menu thẻ cuối bị tràn xuống khỏi khung nhìn.
- **Quét giật cuộn ở cả 4 portal** (17 trang, nhảy cuộn từ đầu trang tới nhiều mốc): 0 trang lệch.
- **Promotions Staff và Resident** (người dùng hỏi "đã ổn chưa"): ổn ở luồng chính. Resident trước đây trống vì 27 deal mẫu chỉ có trong trang Staff; giờ cả hai đọc cùng một danh mục (`promotions/catalog.js`), Resident thấy 17 (Live 16 + Sold out 1). Staff đăng thì Resident thấy ngay, nhận mã, Staff tính lượt nhận. Sửa thêm: nút "AI Work Assistant" nổi che mất nút **Publish/Schedule** của hộp "New promotion" ở 675 px (Staff không bấm được bằng chuột); nút nổi giờ chỉ còn biểu tượng và tự ẩn khi có hộp thoại. **Chưa ổn**: D423 (danh sách "Claimed by" là tên mẫu, Claims inbox chưa nhận lượt claim thật), S422 (hiệu năng với 1.001 promotion), NEW-2 (khung Promotions nhúng chưa theo giao diện Personalize), F442 (sửa deal đã đăng chưa có "Update & publish" theo lượt kiểm trước, chưa xác nhận lại).
- **Còn mở**: A3 còn ~27 dòng chưa kiểm lại, tester A3 chưa đo lại sau các sửa gần đây (F352, D364, S318, S319, U329, U320, X307, D324); cần tester độc lập cho toàn bộ phần Social Admin và vòng đời property; `touchmove` không thụ động ở cấp tài liệu (vuốt cạnh trái mở sidebar, kéo sắp xếp) còn nghi làm cuộn cảm ứng bị chặn, chưa đụng.

### Sửa sau lượt 3 (tự kiểm bằng test 354 qua, build qua, và trình duyệt)
- N3 (Ticket box trong Messages nhúng tải cổng bên trong iframe): `goPage` điều hướng cửa sổ trên cùng; đã kiểm, một iframe, một header.
- S415 (hộp Upload không giữ Tab trong khung portal): vòng Tab thủ công cho mọi `dialog[open]`; đã kiểm.
- S119 (nút primary mất vòng focus: `ring-0` của variant thắng `focus-visible:ring-3`): đã thêm quy tắc focus có độ ưu tiên cao hơn.
- N5 (toast "Property profile saved" sai chỗ): chỉ ghi khi đang ở mục Property profile.
- F525 (hai nút Pin chồng nhau, nút gốc không có handler): gỡ nút `data-favorite-star` của bản chụp; còn một nút Pin cho mỗi mục (23/23), Enter ghim được.
- Hồi quy mới: F510 làm 2 `aria-current` ở Client Support và Resident Ticket box: Help chỉ nhận `aria-current` khi menu không có mục hiện tại; đã kiểm Client Support (1).
- Hồi quy mới: "Larger tap targets" làm thẻ KPI Staff co hẹp (link thẻ bị đổi thành `inline-flex`): chỉ liên kết văn bản thường bị đổi; thẻ KPI giữ 310 px; mục sidebar có `min-height` 44 px khi bật.
- S525 (vòng focus ô lọc menu và ô tìm header < 3:1 ở giao diện tối): thêm outline 2 px màu `--ring` (chưa đo lại tỉ lệ).
- F514 (huy hiệu Admin Messages 4, trang chỉ thấy 2): cuộc support đã gán cho người khác không nằm ở tab nào; thêm tab **All** cho Admin; huy hiệu (5) khớp với tab All (5 chưa đọc).
- F556/U505 (Admin Messages và Ticket box không có sidebar, chuông, avatar): theo quyết định của bạn, hai trang nằm trong khung dashboard Admin như Staff/Client (`admin/messages-content.html`, `tickets-content.html`, route nhúng trong `preview.js`). Đã kiểm 675 px sáng và 1440 px tối: sidebar đúng mục đang mở ("Messaging & Support", "Support"), một iframe, nút "Ticket box" điều hướng đúng; test và build qua. Chưa chạy lại độc lập.
- **Social management và Social monitoring (Admin, mới theo yêu cầu của bạn)**: mục "Social" trong sidebar Admin thành "Social management" (trang danh sách property: tiêu đề, ô tìm, bộ lọc All/With posts/No posts yet/Needs attention, mỗi property một thẻ có nút "Open social"), "Social monitoring" nằm ngay dưới. "Open social" mở trang xem Social của property đó (bài, trả lời, phản ứng, lượt xem, Moderation: vi phạm và tài khoản cần theo dõi), chỉ xem, Admin không đăng hay sửa. Property thêm ở Capacity tự hiện thành thẻ mới (hiện là "No posts yet" vì chưa có feed riêng). Logic thuần ở `src/social/monitor.js` (5 test mới, tổng 359 test qua, build qua); đã kiểm trình duyệt ở 675 px: danh sách, tìm, lọc, mở property thứ hai (trang trống có giải thích), mở Mallard Pointe (9 bài, 11 trả lời, xem được từng trả lời). Chưa kiểm 375/1440 sáng/tối và chưa có tester độc lập.
- **Social monitoring có thêm tab Activity (nhật ký) và Checks (11 kiểm tra dữ liệu kèm cách sửa, nút Copy report)**, để Admin xem hoạt động và tìm lỗi. Đã thử làm hỏng cố ý (id trùng, audience lạ, feed không phải JSON): báo đúng chỗ, không tự ghi đè. Pass "cấu hình" 375/830/1440 sáng-tối đã sửa tab và ô chọn ở điện thoại. 368 test, build qua. Bài học và cách tránh lỗi: `09-social-admin-ghi-chu.md`.
- Nhãn nút Theme theo trạng thái hiện tại (đã kiểm).
- S426 (khóa W-9 còn trong DOM ẩn sau Cancel): đã xóa khi hộp đóng; U105 (tương phản Do not disturb) không tái hiện được, chữ `oklch(0.35)` trên nền trắng.

### Còn Không đạt sau lượt 3 và chưa sửa
- **Cao, cần thiết kế/quyết định**: F553 (Admin không có nút Help), F556/U505 (Admin Messages/Tickets không có sidebar, chuông, avatar), F557 (Social Staff/Resident không có khung cổng), F587 (dashboard Staff chỉ có 1 biểu đồ), S508 (tài liệu không ghi `?as` là công cụ xem thử không xác thực), S531 (Admin ở 320 px avatar bị cắt 13 px), U503 (avatar Resident nhảy 6 px giữa home và trang khác).
- **Trung bình**: F501, F504, F544, F545 (maxLength 100, tiêu chí 80), F564/F565 (Exit ẩn trong trang khung, Promotions/Settings không có Exit), F573 (Resident, Admin không khôi phục cuộn), F583, F585, S518, S526/S527 (nhiều header/main/h1), U507 (nền mục chọn 1,12:1), U509 (icon thu gọn lệch tâm), U520 (chữ dưới 16 px ở 375), X502 (ngăn kéo mobile không bẫy focus); X504 là Property switcher (không đụng, theo quyết định của bạn).
- **Thấp**: D513, S502, U526, X511, X512, X514, X515; A1: U104, S123, S132, F150, X109; A4: D423 (danh sách "Claimed by" còn tên mẫu), S422; A6 độc lập: N7, N10, N11, N13.
- **Hồi quy nhỏ mới (thấp)**: thẻ tài khoản sidebar giữ tên property cũ sau khi đổi Display name (không đụng, theo quyết định của bạn); `/client/support.html` có dòng "Staff portal · Operational"; `aria-label` nút Theme vẫn "Theme: light" sau khi chuyển tối.
- A5 còn 18 dòng Chưa kiểm được vì thiếu công cụ (Lighthouse/axe, chặn request, giả lập mạng, origin 127.0.0.1).

## Lượt 2 (2026-11-15): kiểm lại sau khi sửa
Mỗi nhóm được kiểm lại bởi một tester độc lập: mọi dòng trước đó "Không đạt" hoặc "Chưa kiểm được", cộng hồi quy trên 36–68 dòng đang "Đạt". Chi tiết: `07-ket-qua-lai-A1.md` … `A5.md`. Dòng không kiểm lại giữ kết quả lượt 1. A6 đo sau khi làm.

| Nhóm | Tổng | Đạt | Không đạt | Chờ quyết | Chưa kiểm được | % Đạt | Lượt 1 |
|---|---|---|---|---|---|---|---|
| A1 Messages, Ticket box | 218 | 201 | 16 | 0 | 1 | 92,6% | 91,2% |
| A2 Social | 199 | 183 | 14 | 0 | 2 | 92,9% | 83,7% |
| A3 Settings | 252 | 146 | 52 | 5 | 49 | 71,9% | 69,2% |
| A4 Notifications, Promotions, Documents, Admin | 215 | 206 | 6 | 2 | 1 | 96,3% | 90,7% |
| A5 Điều hướng, khung | 199 | 135 | 42 | 0 | 22 | 76,3% | 71,5% |
| A6 Định tuyến đúng người, đúng nơi | 25 | 25 | 0 | 0 | 0 | 100% | (mới) |
| **Tổng** | **1.108** | **896** | **130** | **7** | **75** | **86,7%** (896 ÷ 1.033) | 82,9% |

Ghi chú về cách tính: các dòng "Chờ quyết" vẫn nằm trong mẫu số; lượt 1 gồm A6 là 82,9%.
- **Hồi quy**: A1 0 mới (59/59 Đạt), A2 0 (68/68), A4 0 (67/67), A3 0 trên dòng Đạt cũ (34/36, 2 chưa chạy lại), A5 có **6 hồi quy** (đã tính vào Không đạt của A5 ở bảng trên).
- Sáu hồi quy của A5 là lỗi do chính các sửa của lượt 1 gây ra: tìm kiếm đầu trang mất bộ lọc (F530, F533), mục "Coming soon" không nhận chuột (F558, F559, X510), ghim yêu thích bằng Enter (F525). **Đã sửa sau lượt đo** và tự kiểm (bộ lọc: ô trống 8, "docum" 1, vô nghĩa "No pages match."; Enter ghim lưu đúng; mục "Coming soon" `pointer-events: auto`), nhưng chưa có tester độc lập kiểm lại.
- A3 vẫn còn 49 dòng chưa kiểm được (phần lớn: cần Lighthouse/axe, giả lập mạng, phóng 200%, hai origin, hoặc chưa kịp chạy), nên % của A3 chưa phản ánh hết.

### Đã sửa sau lượt đo thứ hai (tự kiểm bằng test hoặc trình duyệt; 341 test qua, build qua)
Quyền Messages theo chức vụ (X120–X122); focus sau Take/Resolve (S118) và vòng focus nút header (S119); thẻ tóm tắt hiện nơi nhận (R609); số Messages ở menu Admin (N1); thẻ trạng thái không lộ tên cho Resident (N2); không toast thừa sau khi chuyển nơi (N3); chữ màn lỗi (N4); D423 (Staff cộng claim), S409 (đuôi file tính vào 120), S426 (khóa W-9 xóa khi Cancel), S417 (vòng focus thẻ Promotion), U207 (báo lỗi khi lưu thất bại); F296 (mục Social ẩn khỏi sidebar Staff khi tắt); F502 (placeholder ô tìm có tên cổng), F510 (Help có aria-current), S524 (Ctrl+K đóng menu hồ sơ); S325/S329 (giá trị dài bị cắt khi đặt bằng mã/dán); D332 (múi giờ hỏng không làm trắng trang); S312 (chấm màu Accent có aria-pressed); chữ "Resident/Admin/Staff/Client account" ở trang Settings.
NEW-1 (Settings > Social trắng): không tái hiện qua hàng "Social" (mở đúng `#/settings/socialmaster`); chỉ xảy ra khi gõ tay địa chỉ sai `#/settings/social/…`.

### Công tắc Settings đã nối thật (sau lượt đo thứ hai; test 344 qua, build qua)
- **Thông báo In-app (F318, F319, F384):** Direct message tắt thì các chat thật rời chuông và trang Notifications; Community post, Near plan limit, Updates & recovery tắt thì nhóm tương ứng rời đi; Request và Violation chỉ rời khi tắt hết các sự kiện của nhóm.
- **Count badges (F341):** tắt thì số chưa đọc trên mục Messages và nhóm Communication biến mất (tên đọc cho trình đọc màn hình vẫn kèm số). Đã kiểm trình duyệt.
- **Menu search:** tắt thì ô lọc menu ở sidebar biến mất ở 4 cổng. Đã kiểm trình duyệt.
- **Date and time (F350, F351):** đồng hồ sidebar và giờ trong Notifications theo 12/24 giờ và múi giờ đã chọn (múi giờ hỏng bị bỏ qua). Có test; chưa mở giao diện để xem đồng hồ.
- **Away reply (F326):** khi trạng thái Staff là Away hoặc Be right back và công tắc bật, Resident nhắn nhận một dòng "The property team is away right now…" (không quá một lần mỗi 30 phút). Có test; chưa kiểm trên giao diện.
- **Text me if not acknowledged (F327):** tắt thì khẩn cấp vẫn báo động nhưng không ghi "SMS sent". Có test.
- **Sound for new messages:** có tiếng bíp ngắn khi có tin mới từ nơi khác; tắt thì im. Đã kiểm trình duyệt (bật 1, tắt 0); người dùng có thể không nghe nếu trình duyệt chặn âm thanh trước khi dùng trang.
- **Sidebar (F343):** Layout "Rail" làm sidebar thật thành thanh biểu tượng 80 px trên desktop (đã đo: 244 → 80 px); Scrollbar Hidden/Slim/Transparent/Visible đổi thanh cuộn của menu (đã đo Hidden và Slim). Menu search và Count badges ở trên. Chưa nối: Layout "Floating" và "Tab bar", "Menu style", "Property switcher" (mặc định tắt ở Staff và Resident nên bật công tắc sẽ ẩn thẻ tài khoản; cần bạn quyết).
- **Larger tap targets (F352):** thêm liên kết đứng riêng (dòng của danh sách, "View all"), công tắc, checkbox, radio và nút chuông. Đo ở 375 px trên dashboard và Notifications Staff: chỉ còn "Skip to main content" (ẩn ngoài màn hình cho đến khi nhận focus).
- **Resident experience (F372, F378):** Client Workspace > Residents tác động lên Resident: Social timeline, Promotions, Ticket box tắt thì mục menu của Resident biến mất, và Social/Promotions ở tầng dữ liệu cũng tắt; "Show Managed by" bật thì trang Property của Resident ghi "Managed by <tên công ty>.", tắt thì không; "Assistant answers first" tắt thì chat mới bắt đầu bằng câu hỏi "Who should I pass your message to?". Đã kiểm trình duyệt (menu và dòng Managed by) và có test; chưa kiểm chat bằng giao diện.
- **2-step (F329, D316):** công ty bật "Require 2-step" thì trang 2-step cá nhân của Staff và Client ghi "Your company requires 2-step verification. Until you turn it on…"; 2-step của Staff không còn lộ sang Admin hay Resident (mỗi cổng có khóa riêng). Đã kiểm trình duyệt.
- **Avatar (F311):** ảnh đã lưu ở Settings hiện ở header, ô soạn và hồ sơ của Social, và ở header Messages (bài và bình luận của chính mình). Đã kiểm trình duyệt.
- **Property và ngân sách (F374, F375, D357, D358, D359):** một nguồn là Capacity. Workspace > Properties ghi đúng số và liệt kê property thêm ở Capacity; Seats ghi "7 of 20" sau khi mua 10 seat; sidebar "2 / 2"; thông báo "Plan limits" theo số đã mua; ngân sách là một khóa chung, xóa trống nghĩa là không giới hạn.
- **Tên property (F367):** tên nhập ở hồ sơ property (`eso-prop.display`) thay chữ mặc định ở dashboard Staff, Resident My property và dữ liệu Messages. Thẻ tài khoản ở sidebar và Property switcher không đụng. Đã kiểm trình duyệt (dashboard, Resident) và dữ liệu persona (Messages).
- **Support của Admin:** Take, Resolve, Reopen, Ticket box ngay trên header; ID ticket (T-xxxx) mọi nơi; ticket lưu vào Ticket box khi đóng; hàng chờ theo ưu tiên và thời gian chờ; Exit không còn kẹt giữa Messages và Ticket box; Ticket box của Admin có chip High priority, vai trò người yêu cầu và không còn đè ô soạn ở 375 px. Chi tiết: `06-tieu-chi-A6-dinh-tuyen.md` (R626–R635).
Chưa nối: Layout Floating và Tab bar, Menu style, Property switcher (theo quyết định của bạn: không đụng). Chưa chạy lại vòng kiểm A3 sau các nối trên.

### Còn lại, cần bạn quyết hoặc làm sau
- **Chờ quyết / thiết kế**: khung cổng cho Admin Messages/Ticket box và Social (F556, F557, U505), nút Help của Admin, F504 (số mục menu), F587 (1 biểu đồ), U507/U520 (tương phản, cỡ chữ), ngăn kéo mobile không bẫy focus, U102 (dữ liệu hỏng: báo lỗi hay tự nạp lại).
- **Công tắc chỉ lưu, chưa có tác dụng** (A3): Away reply, SMS emergency, Badge/In-app của Direct message và New request, Near plan limit, Count badges, bố cục Sidebar, đồng hồ theo múi giờ/24 giờ, "Resident experience", cwMfa, tên property, số property giữa Workspace/Capacity, ngân sách.
- **Giới hạn ký tự còn thiếu**: Property profile, Billing (S325/S329 đã cắt khi lưu; cần kiểm lại độc lập).
- **A3 chữ nhấn**: 14/28 tổ hợp màu nhấn dưới 4,5:1 (U312, U313, U318).
- A1: S123 (thread 1.000 tin chậm), U105, S132; A2: F277 (chỗ gán chức vụ trong Settings), F287 (mute từ khóa, bài), U214, X202, X212.

---

# Báo cáo tổng hợp QA (2026-11-14, lượt 1)

Công thức: % Đạt = Đạt ÷ (Tổng − Chưa kiểm được). Dòng không có bằng chứng ghi "Chưa kiểm được", không bao giờ ghi "Đạt".
Số đo bên dưới là **trước** các lần sửa ghi ở cuối báo cáo; chưa chạy lại toàn bộ 1.083 tiêu chí sau khi sửa.

| Nhóm | Tổng | Đạt | Không đạt | Chưa kiểm được | % Đạt |
|---|---|---|---|---|---|
| A1 Messages, Ticket box | 218 | 197 | 19 | 2 | 91,2% |
| A2 Social | 199 | 164 | 32 | 3 | 83,7% |
| A3 Settings, Personalize, Workspace | 252 | 92 | 41 | 119 | 69,2% |
| A4 Notifications, Promotions, Documents, Admin | 215 | 165 | 17 | 33 | 90,7% |
| A5 Điều hướng, khung | 199 | 123 | 49 | 27 | 71,5% |
| **Tổng** | **1.083** | **741** | **158** | **184** | **82,4%** (741 ÷ 899) |

| A6 Định tuyến đúng người, đúng nơi (mới, đo sau khi làm) | 25 | 25 | 0 | 0 | 100% |

Chi tiết A6: `06-tieu-chi-A6-dinh-tuyen.md`. Tổng gồm A6: 1.108 tiêu chí, Đạt 766, Không đạt 158, Chưa kiểm được 184; % Đạt = 766 ÷ 924 = 82,9% (A1–A5 vẫn là số đo trước các sửa).

Chi tiết từng dòng: `04-ket-qua-A1.md` … `04-ket-qua-A5.md`.

## Đã sửa sau khi đo (đã kiểm bằng test hoặc trình duyệt, 324 test qua, build qua)
- Sidebar: mục có trang thật không còn bị khoá "Coming soon"; Admin đánh dấu đủ 23 mục; mục thu gọn có tên; mục đang đứng không tải lại; vòng focus.
- Thông báo: link mở đúng chat/bài; số chưa đọc ở mục Messages (4 portal); chuông `aria-current`; vùng chạm 44px.
- Tìm kiếm đầu trang: Ctrl+K mở bảng khi trống; Enter mở trang thật; giữ `?as`/`dark`.
- Messages: Resident có nút **New** và tự chuyển cho property team khi gõ "talk to the team"; read receipts; Unsend bị khoá khi chat đóng; focus sau Take/Resolve; Resident không thấy tên nhân viên (Resolve, Ticket box); khôi phục dữ liệu hỏng.
- Social: "Who can reply" có tác dụng.
- Documents: ngày theo múi giờ người dùng; khoá W-9 hết hạn; dữ liệu hỏng; khoá không còn trong DOM; link Copy ticket.
- Promotions: giới hạn độ dài, thẻ không tràn; Staff cộng lượt nhận của Resident.
- Khác: vị trí cuộn khi Back/Exit; favicon; trạng thái `until` hỏng; Admin "User 1".

## Chưa sửa, cần quyết định hoặc làm sau
- Quyền Messages theo chức vụ (X120–X122); công tắc Away reply, Sound, SMS (X117).
- U102 (dữ liệu hỏng: báo lỗi hay nạp lại mẫu); F442 (Staff sửa deal, không có "Update & publish").
- Các mục "Chờ quyết" của A5: Admin Messages/Ticket box và Social không có khung cổng, nút Help của Admin, ngăn kéo mobile không bẫy focus, nút im lặng (Refresh, AI Assistant).
- F504 (số mục menu ít hơn bản chụp), F587 (1 biểu đồ), U507/U520 (tương phản, cỡ chữ dưới 16px).
- A3 còn 119 tiêu chí chưa kiểm được: cần một vòng kiểm thật nữa cho Settings.
