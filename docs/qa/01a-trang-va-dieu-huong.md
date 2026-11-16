# Bản đồ hệ thống (Prompt 0) — phần A: Trang và điều hướng

Khảo sát chỉ đọc mã, ngày 2026-11-13. Chưa chạy thử. Do một phiên khảo sát độc lập thực hiện; bản này là bản ghi lại kết quả của phiên đó (phiên khảo sát không được phép ghi tệp).

Số liệu: 82 tệp `.html` dưới `src/` = 8 partial + 17 trang nhúng `*-content.html` + **57 trang mở được**. Build lấy mọi `.html` trừ thư mục `partials` (`vite.config.ts:9-14`, `:48`), nên 17 trang `*-content.html` cũng mở trực tiếp được.

## Quy ước

| Ký hiệu | Nghĩa | Bằng chứng |
|---|---|---|
| **KS** | Stub 1 dòng include `staff/dashboard.html`. Header và sidebar là bản chụp Staff; `preview.js` thay ruột `<main>` bằng một iframe | `preview.js:22`, `:42`, `:558-597` |
| **KC** | Stub include `client/dashboard.html`. Khung chụp của Client bị **thay bằng khung Staff** (fetch `/staff/dashboard.html` lúc chạy), rồi iframe | `preview.js:18`, `:43`; `portal-frame.js:347-373` |
| **KR** | Stub include `resident/home.html`. Như KC, menu lấy từ sidebar chụp của Resident | `preview.js:21`; `portal-frame.js:356-367` |
| **KA** | Stub include `admin/dashboard.html`. Khung Admin chụp giữ nguyên, rồi iframe | `preview.js:553-555`, `:194` |
| **PS** | Bộ script của Settings prototype: script nội tuyến trong `staff/account-settings-content.html` + `account-settings.quality.js` + `account-settings.staff.js` (kéo theo `client-workspace.js`, `dockey-settings.js`) | `staff/account-settings-content.html:18-21` |

Tham số địa chỉ dùng chung: `?as=<personaId>` chọn người (`messaging/personas.js:30-34`), `?dark` (`preview.js:13`), `?embed=1` do khung tự thêm cho iframe (`preview.js:586-588`). Mọi trang nạp `/preview.js` qua `partials/head.html:28`.

## 1. Bảng trang (57 trang)

### Trang chung (2)

| Đường dẫn | Mục đích | Cách dựng | Tệp JS | Kho dữ liệu |
|---|---|---|---|---|
| `/index.html` | Mục lục bản xem thử (11 link, `index.html:12-22`) | Trang riêng | `preview.js` | không |
| `/messages/index.html` | "Messaging hub": lối vào Messages của 4 cổng theo persona, bảng quyền nhắn tin, nút `Reset demo data`, `Start empty` | Trang riêng | `messaging/hub.js` | `eso-msg-v1` (đọc số chưa đọc, `store.reset()` ghi) |

### Staff (13)

| Đường dẫn | Mục đích | Cách dựng | Tệp JS |
|---|---|---|---|
| `/staff/dashboard.html` | Dashboard (bản chụp ~176 KB): KPI, biểu đồ SVG, nút Refresh, nút nổi "AI Work Assistant". Không có `<table>` hay `<form>` | Trang riêng | `preview.js`, `portal-frame-extras.js` |
| `/staff/messages.html` | Messages | KS + iframe `staff/messages-content.html` | xem mục 2 |
| `/staff/tickets.html` | Ticket box | KS + iframe `staff/tickets-content.html` | xem mục 2 |
| `/staff/notifications.html` | Notifications | KS + iframe `staff/notifications-content.html` | xem mục 2 |
| `/staff/workspace.html` | Settings › Workspace | KS + iframe prototype, hash `#/workspace` | PS |
| `/staff/workspace/access.html` | Workspace › Access | cùng iframe, `#/workspace/access` | PS |
| `/staff/settings/profile.html` | Settings (hồ sơ) | `#/settings` | PS |
| `/staff/settings/availability.html` | Messenger & availability | `#/settings/availability` | PS |
| `/staff/settings/notifications.html` | Notification preferences | `#/settings/notifications` | PS |
| `/staff/promotions.html` | Promotions (Staff soạn và đăng) | `#/promotions` | PS |
| `/staff/support.html` | Help Center | `#/support` | PS |
| `/staff/social.html` | Social (bản Staff) | **Trang riêng toàn màn hình**, không có khung cổng: `partials/social-app.html` | `social/resident.js` |
| `/staff/account-settings.html` | Địa chỉ cũ | Stub; `preview.js:24-29` chuyển hướng ngay | `preview.js` |

### Client (24)

| Đường dẫn | Mục đích | Cách dựng | Tệp JS |
|---|---|---|---|
| `/client/dashboard.html` | "Portfolio Performance" (bản chụp): KPI, bảng "Property Performance" (1 `<table>`), nút nổi "AI Operations Assistant" | Trang riêng; khung bị thay bằng khung Staff | `preview.js`, `portal-frame.js`, `property-filter.js` |
| `/client/messages.html` | Messages | KC + iframe | xem mục 2 |
| `/client/tickets.html` | Ticket box (nhận `?new=1` từ Support) | KC + iframe | xem mục 2 |
| `/client/notifications.html` | Notifications | KC + iframe | xem mục 2 |
| `/client/documents.html` | Documents | KC + iframe `client/documents-content.html` | `documents/app.js` |
| `/client/usage/capacity.html` | Usage › Capacity | KC + iframe `client/usage-content.html` | `usage/app.js` |
| `/client/workspace.html` và 12 trang `/client/workspace/*.html` (company, properties, property, parking, residents, access, billing, reports, security, docs, dockey, data) | Workspace settings và từng mục | KC + iframe prototype bản Client, hash theo `staff-routes.js:28-46` | PS + `client-workspace.js` |
| `/client/settings/profile.html`, `availability.html`, `notifications.html` | Settings | cùng iframe | PS |
| `/client/support.html` | Support; "Submit a ticket" và "My tickets" mở `/client/tickets.html` | cùng iframe, `#/support` | PS |
| `/client/account-settings.html` | Địa chỉ cũ | Stub; `preview.js:516-519` chuyển hướng | `preview.js` |

### Resident (11)

| Đường dẫn | Mục đích | Cách dựng | Tệp JS |
|---|---|---|---|
| `/resident/home.html` | Trang chủ cư dân (bản chụp); các link "View all …" đều `href="#"` | Trang riêng; khung thay bằng khung Staff với menu Resident | `preview.js`, `portal-frame.js` |
| `/resident/messages.html`, `tickets.html`, `notifications.html`, `promotions.html` | Messages, Ticket box, Notifications, Promotions | KR + iframe | xem mục 2 |
| `/resident/settings.html` và `/resident/settings/{profile,notifications,personalize,property}.html` | Settings | KR + iframe `resident/settings-content.html`, hash theo `staff-routes.js:19-25` | PS |
| `/resident/social.html` | Social (bản Resident), có cổng "Community guidelines" | **Trang riêng toàn màn hình** | `social/resident.js` |

### Admin (7)

| Đường dẫn | Mục đích | Cách dựng | Tệp JS |
|---|---|---|---|
| `/admin/dashboard.html` | "Admin Command Center" | Bản chụp Admin + `partials/admin-dashboard.html`; `admin/dashboard.js` thay ruột `<main>` (Alpine) | `admin/dashboard.js`, `admin/overview.js`, `alpine.js` |
| `/admin/messages.html` | Messaging & Support | **Trang riêng toàn màn hình** (không khung Admin) | `messaging/app.js` |
| `/admin/tickets.html` | Ticket box | **Trang riêng toàn màn hình** | `messaging/tickets.js` |
| `/admin/notifications.html` | Notifications | KA + iframe | xem mục 2 |
| `/admin/settings.html`, `/admin/settings/profile.html`, `/admin/settings/personalize.html` | Settings | KA + iframe `admin/settings-content.html` | PS |

## 2. Trang nhúng (`*-content.html`, 17 tệp)

| Tệp | Trang ngoài | Partial và script | Thành phần chính |
|---|---|---|---|
| `{staff,client,resident}/messages-content.html` | `/<cổng>/messages.html` | `partials/messages-app.html`, `messaging/boot.js` → `app.js` | Danh sách hội thoại (search, chips, tabs), luồng tin, `<form id="composer">`, panel Details, dialog `dlg-new`, `dlg-forward`, `dlg-members`, `dlg-announce`, `dlg-image`, `dlg-preview` |
| `{staff,client,resident}/tickets-content.html` | `/<cổng>/tickets.html` | `partials/tickets-app.html`, `messaging/tickets.js` | Danh sách, chi tiết, `<form id="reply-form">`, dialog `dlg-new-ticket`. Tạo ticket chỉ Staff và Client (`tickets.js:38`) |
| `{staff,client,resident,admin}/notifications-content.html` | `/<cổng>/notifications.html` | `partials/notifications-app.html` (Alpine), `notifications/app.js` + `view.js` | Tóm tắt, "Mark all", search, panel lọc (3 `<select>`), tabs, danh sách, toast có Undo |
| `resident/promotions-content.html` | `/resident/promotions.html` | `partials/promotions-app.html`, `promotions/resident.js` | Search, lọc danh mục, lưới thẻ, dialog chi tiết (claim, copy code, save) |
| `client/documents-content.html` (41 KB, tự chứa) | `/client/documents.html` | `documents/app.js` | Thẻ "Document storage", search, tabs, danh sách; dialog `dlg-upload`, `dlg-unlock`, `dlg-w9` |
| `client/usage-content.html` (20 KB, tự chứa) | `/client/usage/capacity.html` | `usage/app.js` | Stepper tài nguyên, form "Add another property", Summary, dialog `dlg-review` |
| `staff/account-settings-content.html` (1,38 MB, 7.907 dòng, ~70 script nội tuyến) | 7 trang Staff | PS | Settings prototype (SPA theo hash). Sidebar và header riêng bị ẩn khi `html.embed` |
| `client/account-settings-content.html`, `resident/settings-content.html`, `admin/settings-content.html` | 17 trang Client, 5 Resident, 3 Admin | Mỗi tệp là 1 dòng include tệp prototype | Bản theo cổng (`account-settings.staff.js`) |

Partial `settings-app.html` **không trang nào include**.

## 3. Khung dùng chung

| Cổng | Header | Sidebar |
|---|---|---|
| Staff | Bản chụp Staff | Bản chụp Staff |
| Client | Nhập từ `/staff/dashboard.html` lúc chạy, đổi chữ và tên | Nhập từ Staff, dựng lại theo `CLIENT_MENU` (`portal-frame.js:21-31`) |
| Resident | Nhập từ Staff | Nhập từ Staff; nhóm và mục đọc từ sidebar chụp của Resident |
| Admin | Bản chụp Admin | Bản chụp Admin. **Không** có các hành vi khung của ba cổng kia (lọc menu, ghim, đồng hồ, tìm kiếm) |

Nếu fetch khung Staff thất bại, Client và Resident giữ khung chụp cũ (`portal-frame.js:353,372`).

### Mục sidebar: nối trang thật và `href="#"`

Mọi mục trong bốn bản chụp đều là `href="#"` (Staff 40, Client 25, Resident 38, Admin 43). Việc nối do `preview.js:459-477` làm theo nhãn. Bấm mục `#` hiện "That page is not part of this preview yet."

| Cổng | Nối trang thật | Vẫn là `#` |
|---|---|---|
| Staff | Messages, Promotions, Social, Settings, Ticket box | Dashboard (trên chính dashboard), Daily Audit, Community & Announcements, Requests, Residents, Vehicles, Parking Inventory, Parking Assignments, Access & Passes, Smart Map, Rules, Violations, Staff & Access, Calendar, Activity, Audit Log, Reports, Plan & Capacity |
| Client | Dashboard, Messages, Documents, Workspace Settings, Support, Ticket box, Capacity | Properties, Reports, People & Access, Vehicles, Parking, Requests, Violations, Calendar, Activity, Staff & Access, Billing & Plan, Recovery |
| Resident | Messages, Promotions, Social, Ticket box, Settings | Dashboard (trên home), My Parking, Vehicles, Requests, Violations, Access & Passes, Payments, Documents, Community, Calendar, Activities, Updates, Feedback |
| Admin | Messaging & Support, Support, Settings, Profile, Ticket box | Dashboard (trên dashboard), Clients, Properties, People, Users, Parking Spaces, Property Requests, Access Requests, Change Requests, Platform Operations, Social, Takeovers, Announcements, Alerts, Activity Log, Security Events, Feedback, Billing Reconciliation, COO, Email Templates, Content, Privacy Requests, Budget, Company Profile |

### Header theo cổng

| Thành phần | Staff | Client | Resident | Admin |
|---|---|---|---|---|
| Nút mở menu (mobile) | có | có | có | có |
| Ô tìm kiếm trang | có (Ctrl/Cmd+K, "/") | có | có | **Có ô trong HTML chụp nhưng không có mã nào nối** |
| Nút Help Center | → `/staff/support.html` | → `/client/support.html` | → `/resident/tickets.html` | không có |
| Nút Theme | có | có | có | có |
| Chuông | có | có | có | có (`addBell`) |
| Menu hồ sơ | Có Status; 6 link | Có Status; 4 link | Không Status; Settings, Messages, Ticket box | Không Status; Settings, Messaging & Support, Ticket box, Notifications |
| "Sign out" | chỉ hiện thông báo | như Staff | như Staff | như Staff |

Các app toàn màn hình (Messages, Ticket box, Social, Promotions) có header riêng: link **Exit** (`exit-target.js`), nút **Back** chỉ lùi bên trong app, nút đổi theme.

## 4. Điểm mù về trang

1. `partials/settings-app.html` và `settings/resident.js` (209 dòng) không còn trang nào dùng.
2. Hai stub chỉ để chuyển hướng: `/staff/account-settings.html`, `/client/account-settings.html`. Không link nào trỏ tới chúng.
3. 32 stub (7 Staff, 17 Client, 5 Resident, 3 Admin) mở cùng một tệp prototype 1,38 MB, chỉ khác hash ban đầu.
4. Phần của prototype không có đường dẫn riêng thì nằm dưới đường dẫn hiện tại kèm hash. Ví dụ Admin dùng `/admin/settings.html#/settings/notifications`, trong khi Resident có `/resident/settings/notifications.html`.
5. Trang không có link trực tiếp nào: 11 trang `/client/workspace/*.html` (trừ `access`), `/resident/settings/profile.html`, `/resident/settings/personalize.html`, `/admin/settings/personalize.html`, và 17 trang `*-content.html` khi mở trực tiếp.
6. `src/index.html` chỉ liệt kê 11 link: thiếu Ticket box, Notifications, Social, Documents, Capacity, Support, Settings của Client, Resident, Admin. `BRIEF.md:14` ghi trang mới phải thêm link ở đây.
7. Link trùng đích: Admin "Support" và "Ticket box" cùng tới `/admin/tickets.html`; menu hồ sơ Staff "My Social" và "Saved posts" cùng tới `/staff/social.html#/me`.
8. Mục "Dashboard" là `#` trên chính trang chủ của Staff, Resident, Admin: bấm ra thông báo "not part of this preview yet".
9. Địa chỉ không đuôi mà không có tệp tương ứng (`/staff/settings`, `/client/usage`…) rơi về trang mục lục (suy từ cấu hình Vite, chưa chạy). Trong bản build, địa chỉ không đuôi không được xử lý.
10. Phần tĩnh trong bản chụp không có mã nối: ô search của Admin; "Open Property Hub", "Show Switch Property" của Staff; nút nổi "AI Work Assistant", "AI Operations Assistant", "Notifications alt+T"; nút "Refresh"; nút trong thẻ Capacity của Resident.
11. Menu của prototype có "Import Center" và "Updates & Recovery" mà sidebar chụp của Staff không có (chỉ thấy khi mở trang prototype trực tiếp).
12. Tệp lạ: `src/resident/promotions.html` và `src/resident/settings.html` có BOM ở đầu. Ngoài `src/`: `.claude/settings.local.json.bak`, `easyspotops-2026-11-13.zip`, thư mục `docs/archive/`, `dist/`.
13. Client và Resident phụ thuộc tệp Staff lúc chạy: mọi trang khung của hai cổng fetch `/staff/dashboard.html`.

## 5. Câu hỏi của phiên khảo sát

1. `partials/settings-app.html` + `settings/resident.js` có phải bản Settings cũ của Resident đã bị thay và chỉ còn sót lại?
2. Mở trực tiếp các trang `*-content.html` có phải lối vào hợp lệ cần kiểm thử, hay chỉ là ruột iframe?
3. Ô search trên header Admin: cố ý để tĩnh, hay Admin cũng phải có tìm kiếm và Help như ba cổng kia?
4. Admin: "Support" và "Ticket box" cùng một trang là chủ ý? Mục "Social" của Admin để `#` là chủ ý?
5. Địa chỉ không đuôi (`/staff/workspace`) có phải lối vào chính thức?
6. Danh sách phần (hash) của prototype chỉ suy từ `staff-routes.js`; có thể còn phần khác chưa liệt kê.
7. `/client/tickets.html?new=1`: thấy nơi đặt tham số, chưa xác minh nơi đọc.
8. Các tệp ngoài `src/` (`docs/archive/`, zip, `dist/`) có thuộc phạm vi bản đồ không?
