# Bản đồ hệ thống (Prompt 0) — phần C: Luồng người dùng, quy tắc nghiệp vụ, điểm mù
Khảo sát chỉ đọc mã, ngày 2026-11-13. Chưa chạy thử.

## 0. Phạm vi và cách đọc tài liệu này

- Không mở trình duyệt, không chạy test, không sửa mã. Mọi nhận định lấy từ mã; chỗ nào là suy ra từ mã mà chưa kiểm trên trình duyệt thì có ghi "suy ra từ mã".
- Messages và Ticket box: đọc trực tiếp toàn bộ `src/features/messaging/store.js`, `tickets.js`, `bot.js`, `query.js`, `transport.js`, `personas.js` và phần lớn `app.js`. Chưa đọc kỹ `app.js` dòng 120-230 (widget nhỏ), 1220-1336 (vẽ chữ, ảnh, reaction, trích dẫn), 1900-1985 (bảng emoji, dòng "đang gõ").
- Social, Notifications, Promotions, Documents, Capacity, Admin, Settings, khung portal và điều hướng: do ba lượt khảo sát phụ đọc; số dòng trong các phần đó chưa được đối chiếu lại từng dòng.
- `src/staff/account-settings-content.html` (1,3 MB) và các dashboard chụp chỉ được tìm kiếm và đọc theo đoạn.
- Mọi test trong `tests/` chạy bằng `node --test` trên store và logic thuần. Không file test nào import `messaging/app.js`, `messaging/tickets.js`, `social/resident.js`, `preview.js` hay dùng DOM.

Viết tắt đường dẫn (tính từ gốc dự án):

| Viết tắt | File |
|---|---|
| MS | `src/features/messaging/store.js` |
| MA | `src/features/messaging/app.js` |
| MT | `src/features/messaging/tickets.js` |
| SR | `src/features/social/resident.js` |
| SS | `src/features/social/store.js` |
| SF | `src/features/social/staff-store.js` |
| SM | `src/features/social/moderation.js` |
| SH | `src/partials/social-app.html` |
| PROTO | `src/staff/account-settings-content.html` |
| STAFFJS | `src/staff/account-settings.staff.js` |
| PREVIEW | `src/shared/js/preview.js` |
| FRAME | `src/shared/js/portal-frame.js` |
| EXTRAS | `src/shared/js/portal-frame-extras.js` |
| CW | `src/staff/client-workspace.js` |
| DK | `src/staff/dockey-settings.js` |
| ROUTES | `src/shared/js/staff-routes.js` |

Persona demo (`src/features/messaging/personas.js:11-22`): Resident `res-1` Alex Rivera, `res-2` Priya Nair, `res-3` Morgan Ellis; Staff `stf-1` Jordan Lee, `stf-2` Sam Okafor; Client `cli-1` Dana Whitfield, `cli-2` Marcus Cole; Admin `adm-1` Taylor Brooks, `adm-2` Casey Ng. `pickPersona(role, asId)` chỉ nhận `?as=` khi id đúng vai (`personas.js:29-33`).

---

## 1. Luồng người dùng

Tổng cộng 67 luồng. Số luồng mỗi portal tham gia:

| Portal | Messages | Ticket box | Social | Notifications | Promotions | Documents/Capacity | Settings | Admin | Điều hướng | Tổng |
|---|---|---|---|---|---|---|---|---|---|---|
| Resident | 14 | 2 | 14 | 3 | 1 | 0 | 2 | 0 | 7 | 43 |
| Staff | 17 | 4 | 18 | 3 | 1 | 0 | 2 | 0 | 7 | 52 |
| Client | 11 | 4 | 0 | 3 | 0 | 3 | 3 | 0 | 7 | 31 |
| Admin | 14 | 4 | 0 | 3 | 0 | 0 | 2 | 1 | 6 | 30 |

### 1.1 Messages (`/<portal>/messages.html`, `src/features/messaging/app.js`)

Dữ liệu: một tài liệu JSON ở khóa `eso-msg-v1`, đồng bộ giữa các tab bằng BroadcastChannel và sự kiện `storage`, ghi theo compare-and-set trên `rev` (`src/features/messaging/transport.js:30, 118-138`). Presence và typing ở khóa `eso-msg-v1:live` (`transport.js:68`).

**M1. Resident ↔ Staff qua trợ lý (Resident, Staff)**
1. Resident mở Messages → `boot()` gọi `store.ensureSession` (MA:2286-2289 → MS:418-427): dùng lại phiên đang mở hoặc tạo phiên `resident_support` trạng thái `bot` với hai câu chào (`newBotSession`, MS:398-405; `greeting`, `bot.js:53-58`).
2. Resident chạm lựa chọn nhanh → `choose` (MA:1594-1602 → MS:430-443 → `bot.js onChoice`, `bot.js:92-108`); hoặc gõ câu hỏi → `send` (MA:1714-1740 → `deliver` MA:1645-1673 → MS:446-496 → `bot.js onText`, `bot.js:113-131`).
3. "Talk to a person" (nút đầu thread, MA:765 → `requestStaff` MA:784-791 → MS:528-535) hoặc lựa chọn `staff:request` / `helped:no` (`bot.js:104`) → `queue()` (MS:356-363): trạng thái `queued`, cấp số ticket, tạo `summary`, thông báo hệ thống "Your request was sent to the property team…".
4. Staff thấy trong tab Queue (MA:56; tag `queue` ở MS:1206), mở thread thấy thẻ tóm tắt (MA:1121-1131).
5. Staff bấm "Take conversation" → `claim` (MA:764 → MS:538-547 → `takeChat` MS:375-382), hoặc trả lời luôn: tin đầu tiên tự nhận chat (`postCheck` trả `takes`, MS:277; MS:459). Resident nhận dòng "… from the property team joined the chat."
6. Trao đổi hai chiều → `send` (MS:446-496).
7. Staff "Resolve" → "Confirm resolve" (MA:769 → `resolve` MS:550-559 → `closeResident` MS:344-354): trạng thái `closed`, `closeReason: 'resolved_by_staff'`.
8. Resident thấy khối chấm điểm "Helpful / Not helpful" → `rate` (MA:1183-1189 → MS:627-634).
9. Cả hai thấy băng "Saved as T-… in the Ticket box" với nút "Open Ticket box" → `/<portal>/tickets.html?as=<id>#/t/<convId>` (MA:969-971).
10. Resident muốn hỏi tiếp: "Start a new conversation" → `startResidentSession` (MA:998, 793-797) tạo phiên trợ lý mới.

**M2. Trợ lý tự giải quyết (Resident)**
Chọn chủ đề → `topicMenu` (`bot.js:60-76`) → chọn câu hỏi → `answer` (`bot.js:78-90`) → "Yes, thanks" → `outcome: 'resolved'` (`bot.js:101-103`) → `closeResident(..., 'bot', 'resolved_by_assistant', …)` (MS:370). Chat này không có `queuedAt` nên không vào Ticket box (MS:1271). Staff không được báo trong suốt giai đoạn `bot` (`notifies`, MS:63-68; `canSee`, MS:253).

**M3. Resident kết thúc chat, hoặc chat tự đóng (Resident, Staff)**
- "End chat" → "Confirm end chat" → `endChat` (MA:770 → MS:578-585), được ở cả `bot`, `queued`, `active`.
- `tick()` đóng chat `bot` im lặng quá 15 phút và chat `active` im lặng quá 12 giờ (MS:24-25, 1074-1096). `tick` chỉ được gọi ở MA:2283, MA:2339 (mỗi 30 giây) và MS:421.

**M4. Staff đổi giai đoạn ticket (Staff)**
"Waiting on resident" / "Back to in progress" → `setTicketState` (MA:767-768, 916-917 → MS:613-625). Resident trả lời thì tự về "In progress" (MS:488-491). Thanh giai đoạn Open → In progress → Waiting on resident → Resolved → Closed (`renderStage`, MA:946-962; `ticketStage`, MS:48-53). Mỗi bước ghi một thẻ audit (MS:335-342).

**M5. Staff chủ động nhắn Resident (Staff, Resident)**
"New" → chọn Resident → `startDirect` (MA:2009-2076 → MS:637-666): tạo `direct` với `outreach: true`. Staff chỉ gửi được một tin cho tới khi Resident trả lời (`awaiting_reply`, MS:288-291; ghi chú ở ô soạn MA:1001). Resident trả lời → `residentReplied = true` (MS:492). Giới hạn 2 thread chưa trả lời trong 24 giờ cho mỗi Resident (MS:652-653).

**M6. Staff ↔ Client, và Resolve thành ticket (Staff, Client)**
1. Staff hoặc Client "New" → chọn người → `startDirect` (MS:637-666). Thread dùng lại nếu đã có (MS:647).
2. Trao đổi → `send`.
3. Staff "Resolve" → `resolve` nhánh `isStaffClient` (MS:562-571): cấp số ticket lần đầu, ghi audit, `resolvedAt`, dòng "… It is saved in the Ticket box. Reply to reopen it."
4. Hai người thấy ticket trong Ticket box (`_ticketAccess`, MS:1276).
5. Bất kỳ ai gửi tin mới → `reopenDirect` (MS:311-316, 477, 662): mở lại, giữ số cũ.

**M7. Client hoặc Staff → Support (Client, Staff, Admin)**
1. "New" → "EasySpotOps Support" (`recipients`, MS:1172-1173) → nhập Subject + Message → `startSupport` (MA:2070 → MS:680-687 → `_startSupportIn` MS:668-677). Nếu gọi `startDirect` tới Admin thì cũng thành support thread với subject "Message to Support" (MS:646).
2. Admin thấy trong tab Queue (tag `queue`, MS:1218).
3. Admin trả lời → `supportEffects` (MS:387-396): tự gán assignee nếu trống, `open` → `pending`.
4. Người yêu cầu trả lời → về `open`, xóa `resolvedAt` (MS:392-395).
5. Admin đặt "Resolved" → `_setSupportStatus` (MS:689-699): dòng "… marked this resolved. Reply to reopen it."
6. Băng "Saved as T-… in the Ticket box" (MA:970-971).

**M8. Admin xử lý support thread (Admin)**
Ba ô chọn Status / Priority / Assignee chỉ hiện với Admin trên thread `support` (`threadTools`, MA:799-817) → `setSupportStatus` (MS:701-707), `setPriority` (MS:722-733), `assignSupport` (MS:709-720). Mỗi thay đổi ghi audit.

**M9. Admin ↔ Admin, Admin → Staff hoặc Client (Admin, Staff, Client)**
Admin "New" → chọn người → `startDirect` tạo `direct` thường (MS:645-664; ma trận MS:19). Staff hoặc Client trả lời được trong thread đó (`canMessage(staff|client, admin)`, MS:286). Staff/Client tự mở mới tới Admin thì luôn thành support (M7).

**M10. Admin → Resident: ghi chú một chiều (Admin, Resident)**
Admin "New" → chọn Resident → `startDirect` (`outreach: true`). Resident không trả lời được (`one_way`, MS:285); ô soạn hiện "This is a one-way message from Support…" kèm nút "Ask the property team" mở phiên trợ lý (MA:1002-1005).

**M11. Group (Staff, Admin tạo; Client tham gia)**
1. "New" → chế độ "group" (chỉ hiện khi `groupCandidates` có người, MA:2013-2014; MS:1336-1340) → tên, chọn thành viên, tin đầu tùy chọn → `createGroup` (MA:2056-2064 → MS:739-760).
2. Nút số thành viên → `openMembers` (MA:2079-2106): danh sách, ai online.
3. "Add" → `addMember` (MA:2107-2113 → MS:762-775). "Leave" → `leaveGroup` (MA:2114-2121 → MS:777-787).
4. Biên nhận đọc theo người: "Seen by …" (MA:1514-1521; MS:1356).

**M12. Announcement (Admin gửi; mọi vai nhận)**
"Announce" (chỉ Admin, MA:243) → `openAnnounce` (MA:2127-2154): Title, Message, Everyone hoặc từng vai → `broadcast` (MA:2156-2168 → MS:790-807). Người nhận chỉ đọc (`read_only`, MS:297-298; MA:1006). Tác giả thấy băng "N% read (x of y). Not yet read: …" (MA:972-975; MS:1374-1380).

**M13. Emergency (Resident, Staff, Admin)**
1. Nút "Mark as emergency" ở ô soạn (hiện khi được post, vai resident/staff/admin, thread `resident_support` hoặc `direct`; MA:1020-1021, 1776) → gửi với `emergency: true` (MA:1727 → MS:472-484).
2. Từ Resident đang ở giai đoạn `bot`: bỏ qua trợ lý, vào hàng chờ ngay (MS:484).
3. Staff/Admin thấy băng đỏ trên cùng (`renderEmergencyBanner`, MA:927-943; `emergencies`, MS:603-610), dòng đứng đầu danh sách (MS:1238; MA:414).
4. "Acknowledge" → `acknowledgeEmergency` (MA:766, 915, 940 → MS:588-600): ghi audit, báo Resident "The property team has seen your emergency report."
5. Quá 180 giây chưa xác nhận: `tick` ghi `smsAt` và audit "SMS and critical alert sent (simulated)" (MS:36, 1077-1087).

**M14. Thao tác trên từng tin (mọi vai)**
- React: 6 emoji nhanh (`src/features/messaging/emoji.js:4`) → `react` (MA:1343-1359 → MS:840-857).
- Reply: `setReply` (MA:1361, 1781-1785) → gửi kèm `replyTo` (MS:467-471); bấm trích dẫn nhảy tới tin gốc (MA:1321-1338).
- Forward (không có cho Resident): `openForward` (MA:1363, 1461-1491) → `forward` (MS:499-518); danh sách đích từ `forwardTargets` (MS:521-525).
- Edit: menu "Edit message" → `startEdit` → `saveEdit` → `edit` (MA:1371-1374, 1676-1712 → MS:883-901); hiện "Edited".
- Unsend: "Unsend for everyone" → "Tap again to unsend" → `unsend` (MA:1375-1378, 1417-1422 → MS:860-880); thread giữ "This message was removed".
- Delete for me: `hideMessage` có Undo (MA:1379-1383 → MS:904-918); khôi phục ở tab Hidden (`unhideMessage`, MS:921-931).
- Copy text (MA:1370).

**M15. Đính kèm (mọi vai)**
Nút kẹp giấy, dán, hoặc kéo thả (MA:1885-1896) → `addFiles` (MA:1863-1882) → `prepareFile` (MA:1830-1861): ảnh được vẽ lại, thu về cạnh dài 1920 px, nhắm 300 KB, WebP hoặc JPEG; file khác phải là PDF/DOCX/TXT/CSV → gửi → `normalizeAttachments` (MS:230-243).

**M16. Ghim, đánh dấu, tắt tiếng, ẩn (mọi vai)**
Menu ba chấm ở dòng danh sách, ở đầu thread và trong bảng chi tiết (`fillFlagMenu`, MA:695-709; MA:918-921) → `toggleFlag` (MS:993-1006) cho `pinned`, `important`, `muted`; "Hide conversation" → `hideConversation` có Undo (MA:551-556 → MS:938-948). Tab "Hidden (N)" liệt kê conversation và tin đã ẩn, nút Restore (MA:508-548 → `unhideConversation` MS:951-963, `unhideMessage`).

**M17. Tìm kiếm (mọi vai)**
Ô tìm ở danh sách (MA:629): lọc dòng và tìm trong nội dung tin (`store.search`, MS:1009-1033; `renderHits`, MA:583-604; bấm kết quả nhảy tới tin, `jumpTo` MA:606-619). Bộ lọc có cấu trúc `unit: status: priority: assignee: tag: after: before:` (`src/features/messaging/query.js:13`; nút "+ key" và chip, MA:559-580). Phím tắt Ctrl/⌘+K, "/", Alt+N (MA:2312-2349).

**M18. Gửi khi mất mạng, nháp, đang gõ, online, đã đọc (mọi vai)**
- Tin gửi lúc offline nằm chờ, lưu ở `eso-msg-outbox:<id>`, thử lại 1, 2, 4, 8, 16 rồi 30 giây (MA:1614-1643); tin lỗi có "Retry" / "Discard" (MA:1579-1588).
- Nháp theo conversation: `eso-msg-draft:<id>:<conv>` (MA:118, 1759).
- `setTyping`, `touchPresence`, `goOffline` (MA:1757, 1984, 2340-2342 → MS:1037-1063).
- `markRead` khi thread đang hiển thị (MA:333, 2259 → MS:809-824).

**M19. Do not disturb (Resident)**
Nút `#btn-dnd` chỉ hiện với Resident (MA:244) → `setPref({dnd})` (MA:2232-2236 → MS:1065-1070). Ảnh hưởng `badgeCount` và `alertsFor` (MS:1128, 1148).

**M20. Bảng chi tiết bên phải (Staff, Admin)**
Nút (i) → `renderContext` (MA:859-922) từ `contextFor` (MS:1246-1264): với Resident hiện Unit, Location, Lease, Lease status, Unit entry notes, 5 ticket gần nhất; còn lại hiện danh sách người. Lựa chọn mở/đóng lưu ở `eso-msg-context` (MA:820-828).

**M21. Hộp "Preview tools" (mọi vai)**
Nút Preview → `openPreview` (MA:2170-2196): đổi persona cùng vai (tải lại với `?as=`), link sang Messages của portal khác, "simulate offline" (`sessionStorage eso-msg-offline`), high contrast (`eso-msg-contrast`), "Reset demo data" và "Start empty" (bấm hai lần; `store.reset`, MS:1098-1105).

### 1.2 Ticket box (`/<portal>/tickets.html`, `src/features/messaging/tickets.js`)

**T1. Tạo ticket (Staff, Client)**
"Create ticket" (ẩn với Resident và Admin, MT:38, 456) → hộp thoại Subject, Category (6 loại, MS:42), Priority, Description → `startSupport` (MT:459-482 → MS:680-687) → toast "Created T-…. Support will reply in this ticket." `?new=1` mở sẵn hộp thoại (MT:505).

**T2. Danh sách (mọi vai)**
Tab Open / Closed / All kèm số (MT:125-153); tìm kiếm và bộ lọc như Messages (`ticketBox(userId, query)`, MS:1303-1313; chip MT:155-165). Mỗi vai thấy gì: `_ticketAccess` (MS:1269-1278).

**T3. Trả lời trong ticket (Staff, Client, Admin)**
Chỉ với ticket loại `support` mà người xem mở được thread (`renderReply`, MT:405-415) → `store.send` (MT:421-439). Trả lời ticket đã Resolved thì mở lại (`supportEffects`, MS:392-395).

**T4. Export, Copy link, Open in Messages (mọi vai)**
- "Export" tải `T-xxxx.txt` (MT:253-286, 330).
- "Copy link" chép `…/tickets.html?as=<id>#/t/<convId>` (MT:331-334).
- "Open in Messages" khi ticket còn mở và người xem thấy được thread → `/<portal>/messages.html?as=<id>#/c/<convId>` (MT:335).
- File đính kèm trong bản ghi tải được qua link data URL (MT:379-392).

**T5. Status, assign, priority (Admin)**
Không có điều khiển nào trong Ticket box. Admin đổi ở Messages (M8); Ticket box chỉ hiển thị kết quả (MT:308-326) và các thẻ audit (MT:348-356).

### 1.3 Social (`/resident/social.html`, `/staff/social.html`, `src/features/social/resident.js`)

Bối cảnh: một controller cho cả hai portal, khác nhau ở `data-portal` (`src/resident/social.html:7-9`, `src/staff/social.html:7-9`; SR:30, 35-42). Lần mở đầu `ensureFeed` tạo `eso-feed` với 9 bài mẫu (`src/features/social/seed.js:27-33`). Resident chỉ ghi `eso-res-social:<id>` (SS:100-102); Staff ghi `eso-feed` (SF:42-44) và `eso-social.muted` (SF:166, 179). `eso-mod` và `eso-social.on` chỉ được đọc ở đây (SS:55-79); nơi ghi là PROTO. Mọi persona Staff dùng chung danh tính `"me"` (SF:7); Resident thấy `"me"` là "Property team" (SS:42).

**S1. Cổng Community guidelines (Resident)**
Mở trang → `render` (SR:134) → `gated` (SR:147; `needsGuidelines`, SS:154-157) → dialog `#gate` không đóng được bằng Esc (SR:189-192, 330-331) → "Read policy" → cuộn hết (`checkEnd`, SR:1123-1126) → "Agree" (SR:1142-1146) → tick ô đồng ý (SR:1160) → "Confirm" → `acceptGuidelines` (SR:1161-1168 → SS:159-163) ghi `accepted = ver`. "Exit Social" → `exitTarget` (SR:1159). Hỏi lại khi có version mới (SR:1154) hoặc sau `resumePause` (SS:131). Staff không có cổng; có trang chỉ đọc `#/guidelines` (SR:2431-2442).

**S2. Tạo bài (Staff)**
`#composer-open` → `openCompose` (SR:1633, 1649-1650) → dialog `#compose` (SH:186-218): chữ, "Add photos" (`shrinkPhoto`, SR:1601-1632), "Who can see it", "Post as an announcement" → submit (SR:1656-1673) → `addPost` (SF:521-533) ghi `eso-feed.posts`. Resident không có composer và không có hàm đăng bài (SS:3).

**S3. Sửa, xóa, ghim bài của mình (Staff)**
Menu bài: Edit → `editPost` (SR:1634-1646 → SF:537-558); Delete → dialog `#del` → `deletePost` (SR:1678-1690 → SF:576-583); Pin/Unpin → `pinPost` (SR:990-1000 → SF:564-573).

**S4. Comment và reply thread (Resident, Staff)**
Mở thread (`openThread`, SR:874-889) → gõ, Enter gửi (SR:902-929) → Resident `addReply` (SS:331-348) ghi `eso-res-social:<id>.replies[postId]`; Staff `addReply` (SF:255-281) ghi `eso-feed`. "Reply" trên một comment đặt `thread.to` (SR:812-820). Xếp luồng bằng `nest` (`src/features/social/threads.js:8-32`), thụt tối đa 2 cấp (SR:767).

**S5. Sửa, xóa, ẩn comment (Resident, Staff)**
Edit: `editReply` (SS:361-374) / `editComment` (SF:304-315). Delete sau `askConfirm`: `deleteReply` (SS:377-385) / `deleteComment` (SF:318-324). Hide comment của người khác cho riêng mình: `hideComment` (SS:388-395 / SF:327-336), "Show" để hiện lại (SR:802-807).

**S6. Staff gỡ comment (Staff)**
`data-cm="remove"` → `askConfirm` → `removeComment` (SR:626-631 → SF:339-347) ghi `eso-feed.removed[commentId]`. Tác giả thấy "Your comment was removed by the property team." (SR:799-801).

**S7. React (Resident, Staff)**
Chạm Like, hoặc giữ 450 ms / rê chuột / Arrow Up để mở 5 lựa chọn (SR:337-338, 394-421) → `react` (SS:281-295 / SF:212-234). Xem ai react: `openReactors` (SR:449-501).

**S8. Share, Copy link, Save (Resident, Staff)**
Share bật/tắt về hồ sơ mình: `share` (SS:298-307 / SF:237-246). Copy link: `copyLink` (SR:323-326). Save ghi thẳng `eso-social-saved:<id>` (SR:297-298, 1017-1028).

**S9. Follow (Resident, Staff)**
Theo dõi người, không phải bài. Điểm vào: dialog reactions, menu bài, menu comment, dialog Followers/Following (SR:467, 963-975, 569-573, 1836-1859) → `follow` (SS:310-320 / SF:190-200). Tác dụng: tab "Following" (SR:176) và con số trên hồ sơ.

**S10. Hồ sơ và Activity (Resident, Staff)**
`#/me` → `pageProfile` (SR:1919-2005), chỉ hồ sơ của chính mình. `#/activity` → `pageActivity` (SR:2009-2035), tối đa 40 dòng.

**S11. Hide Social (Resident), Mute thread (Staff)**
Resident: `setShow(false)` (SR:1172-1176 → SS:166-170); bật lại bằng "Show Social" (SR:205) hoặc ở Settings (STAFFJS:441). Staff: "Mute this thread" → `muteThread` (SR:980-982 → SF:174-180); gỡ ở Moderation (SR:2485 → SF:160-167).

**S12. Violation → pause → Resume (Staff, Resident)**
1. Staff: trên comment của Resident chọn "violate" → `openViolation` (SR:632, 674-720): Reason (6 loại, SM:13-20), hành động mặc định theo Rules (SR:658-670), "Warning only" hoặc "Pause their activity", ngày giờ và preset 1/3/7/30 ngày (SH:308-311), note, "Also remove the comment" → `addViolation` (SR:726-740 → SF:352-374) ghi `eso-feed.vio[]`.
2. Hoặc Ban/Warn trực tiếp ở trang Violations → `banResident` / `warnResident` (SR:2328-2329 → SF:456-475).
3. Resident: `pauseOf` (SS:117-119 → `holdIn`, SM:187-196) → trang bị khóa, chỉ còn Exit và nút theme (SR:146-156) → thông báo `t-pause` với đồng hồ (SR:1341-1383).
4. Đồng hồ về 0: hiện "Resume Social" (SR:1365-1371) → `resumePause` (SS:123-133) ghi `resumed[]` và `accepted = 0` → dialog "Your pause has ended" (SR:1412-1443) → `ackNotice` (SS:105-111) → cổng guidelines mở lại.
5. Warning: không khóa gì; dialog "A warning from the property team" hiện một lần (SR:1425-1426).

**S13. Unban, strike, review, Open account (Staff, Resident)**
Unban → `unbanResident` (SR:2330-2336 → SF:479-487); Resident vẫn phải bấm Resume. Đủ `limit` strike → `review: true`, không đồng hồ, không Resume (SM:191; SS:126; SR:1373-1381). Staff "Open account" → `openAccount` (SR:2337-2343 → SF:391-399) ghi `eso-feed.folders[]`. Resident xem `#/violations` → `pageViolations` (SR:2096-2186).

**S14. Violation rules (Staff)**
Violations → tab "Rules" → `rulesForm` (SR:2366-2429) → "Save rules" → `saveRules` (SF:495-501; kiểm bằng `checkRules`, SM:64-81); "Reset to defaults" → `resetRules` (SF:504-508).

**S15. Trang Moderation và Violations (Staff)**
`#/moderation` → `pageModeration` (SR:2444-2491): "Reported posts", "Accounts waiting for you", "Muted by you". Trang Violations của Staff: `pageViolationsStaff` (SR:2228-2363), dữ liệu từ `standings` và `filterStandings` (SF:422-453).

**S16. Alerts và chuông (Resident, Staff)**
`socialAlerts` (`src/features/social/alerts.js:12-41`): Resident được báo announcement, reply vào comment của mình, comment viết sau khi mình đã comment; Staff được báo reply của Resident và bài của Resident. Chuông trong Social: `socialNotifs` cộng `noticeAlerts` (SR:1292-1296, 1461-1489); trạng thái đã xem ở `eso-res-social-seen:<id>` (SR:1284-1290). Ngoài Social: `socialItems` (`src/features/notifications/live.js:30-48`).

**S17. Deep link `#/post/<id>` (Resident, Staff)**
`postRoute` (SR:28) → `openPost` (SR:1737-1745) qua double click, menu "Open post" hoặc link. Bài không tồn tại → "This post is not available" (SR:208-211). Đang pause thì hash bị xóa (SR:153). Back: `leavePost` (SR:1746-1755); `syncRoute` (SR:1768-1776).

**S18. Đường dữ liệu Resident → Staff (Resident, Staff)**
Comment của Resident nằm ở key riêng (SS:341-346) → Staff đọc qua `residentActivity` (`src/features/social/residents.js:13-32`; SF:62-64) → Staff trả lời vào `eso-feed` với `re` (SF:270-273) → Resident thấy lại dưới comment của mình (SS:185) và nhận alert (`alerts.js:36-38`).

**S19. Tìm kiếm, tab, Privacy mode, Pulse (Resident, Staff)**
Search (SR:90-101, 181), tabs (SR:175-179, 221-223), Privacy mode (SR:1180-1248), Pulse (SR:1534-1557), rail (SR:226-257). Đồng bộ giữa tab bằng `storage` và `visibilitychange` (SR:2496-2513).

### 1.4 Notifications

**N1. Bảng chuông (mọi portal)**
Nối ở `wireBell` (EXTRAS:275-352) cho Client, Resident, Staff (PREVIEW:33-44) và `addBell` cho Admin (EXTRAS:35-54; PREVIEW:220). Bấm chuông → `draw` (EXTRAS:296-341): tối đa 4 mục chưa đọc (`latestUnread`, `src/features/notifications/store.js:176`), "View all", "Notification settings". Bấm một mục → đi tới `DEST[r.dest]` hoặc trang Notifications (EXTRAS:319) và `setRead` ghi `eso-notif-read:<id>` (EXTRAS:323). Badge: `syncBadge` (EXTRAS:288-293). Trang Social và hai trang độc lập của Admin (Messages, Ticket box) không có chuông này (PREVIEW:21-22, 32).

**N2. Trang Notifications (mọi portal)**
`/<portal>/notifications.html` → iframe `…/notifications-content.html?embed=1` (PREVIEW:525-554) → `src/features/notifications/app.js`: tab All / Unread / Read (`setTab`, app.js:98-101), tìm kiếm (app.js:56-65), Filters (Category; Property chỉ với Client; Sort) (`src/partials/notifications-app.html:62-86`), bấm tiêu đề → `open` → `change` (app.js:69-86), nút đọc/chưa đọc có Undo (app.js:76-83, 150-162), "Mark all as read" (app.js:88-94), "Show N more" (app.js:136-140). Đích theo portal: bảng ở `app.js:19-24`.

**N3. Nguồn live (mọi portal)**
Messenger: `messengerItems` (`live.js:22-27`) từ `store.alertsFor` (MS:1140-1164). Social (chỉ Staff, Resident): `socialItems` (`live.js:30-48`). Cập nhật qua `storage` và `live.onChange` (app.js:59-60; `live.js:68-70`). "Mark as unread" trên mục tin nhắn gọi `store.markUnread` (`live.js:76` → MS:827-837).

### 1.5 Promotions

**P1. Staff tạo, publish, sửa (Staff)**
`/staff/promotions.html` → iframe PROTO `#/promotions` (ROUTES:14; PREVIEW:535-540) → "Create promotion" (PROTO:2175, 6216-6251): form Basics, Offer, Claiming, Schedule, Audience, Terms; nháp tự lưu `eso-pmc-draft` (PROTO:6223) → "Save draft" hoặc "Publish / Schedule / Update & publish" → `submit` (PROTO:6234-6239) ghi `eso-pmc-saved`, category mới vào `eso-pmc-cats` (PROTO:6168). Sửa: "Edit" trong hộp analytics (PROTO:6248, 6258). Hai công tắc "Show promotions to residents" và "Let residents save promotions" (STAFFJS:101-103, 178-179) lưu trong `eso-proto`.

**P2. Resident xem, lưu, claim (Resident)**
`/resident/promotions.html` → iframe `promotions-content.html` → `src/features/promotions/resident.js`: `render` (resident.js:65-108) gọi `listPromotions` (`src/features/promotions/store.js:110-119`) → tìm kiếm, chip category và "Saved" (resident.js:86-90, 253-257) → mở chi tiết (resident.js:163-212) → Save → `toggleSaved` (store.js:140-147) → Claim → `claim` (resident.js:230-239 → store.js:163-174), ghi `eso-res-promo:<id>` → "Copy" mã (resident.js:246-249). Không có bước redeem ở trang Resident.

### 1.6 Documents và Capacity (Client)

**D1. Documents: upload, lọc, xóa**
`/client/documents.html` → iframe → `src/features/documents/app.js`. Đọc `eso-docs:client` hoặc `seed()` (app.js:34). "Upload document" → `validateUpload` (`src/features/documents/store.js:142-166`) → lưu metadata. Tab theo category (app.js:68-82), lọc Property / Uploaded / Sort (app.js:219-241), tìm kiếm (app.js:258). Xóa có Undo 7 giây (app.js:300-306, 56-65). Băng nhắc hết hạn, nút X ghi `eso-docs-dismissed:client` (app.js:85-95, 475-484). Thanh dung lượng (app.js:179-189).

**D2. Business W-9 và khóa bí mật**
"Add"/"Replace" → `openW9Form` → `validateW9` (app.js:320-342; store.js:309-331) → khóa ngay. "Unlock" → "Send key" → `sendKey` (app.js:380-394) ghi `docs-secret:issued|pending|window`; khóa hiện ngay trên màn hình → nhập khóa → `checkPending` (app.js:415-416; store.js:224-233) → mở 5 phút, ghi `docs-secret:log` (app.js:428-430) → tự khóa lại (app.js:199-204).

**D3. Usage > Capacity**
`/client/usage/capacity.html` → iframe `usage-content.html` → `src/features/usage/app.js`: stepper 4 tài nguyên (app.js:35-91), "Add another property" (app.js:118-135; `validateProperty`, `src/features/capacity/store.js:67-80`), Budget ghi `eso-capacity-budget:client` (app.js:138-146), tóm tắt (app.js:149-172), "Review & confirm" → "Confirm and add to Billing & Plan" → `applyCart` ghi `eso-capacity:client` (app.js:180-214). Đọc lại ở Documents (documents/app.js:177) và thẻ Capacity ở sidebar (FRAME:13-16, 108, 143-149).

### 1.7 Settings và Personalize

Một trang Settings (PROTO) cho cả bốn portal; các trang vỏ chỉ include dashboard, PREVIEW thay `<main>` bằng iframe (PREVIEW:524-598). Shim ở PROTO:3 đổi tên khóa: Client tách mọi `eso-*` (trừ `eso-msg*`) thành `client:eso-*`; Resident và Admin chỉ tách `eso-proto*`.

Cơ chế lưu chung: mọi công tắc lưu ngay vào `eso-proto` qua `save()` và toast "Saved" (PROTO:358, 708, 737-745); STAFFJS bọc `save()` để ghi `ui-prefs:<portal>` và gửi `postMessage` cho khung (STAFFJS:419-443). Không có Save/Cancel, trừ các chỗ nêu dưới.

**ST1. Staff** (ROUTES:8-16)
- Tab Profile: My profile (ảnh đại diện lưu `eso-avatar`, PROTO:1209-1238), Availability & presence (`eso-status`, PROTO:1081-1165), Notifications (`eso-notif`, PROTO:1527-1552), Messages (`S.msgEnter, msgSound, msgReceipts, msgTyping, msgAway, emSms`, STAFFJS:89-95), Sign-in & security (`eso-mfa`, `eso-sec`), Personalize, Language (chỉ English, STAFFJS:63-66), Date and time (PROTO:697-705), Accessibility (STAFFJS:96-100), Social (PROTO:2726).
- Tab Workspace: Permissions, Assigned properties, Security (chỉ đọc, PROTO:959-967); Property profile có thanh Save/Discard, lưu `eso-prop` (PROTO:810-812); "View as Manager / Staff" (PROTO:467, 475, 813); Promotion design, Social, Resident promotions (STAFFJS:101-103, 179).

**ST2. Client** (ROUTES:27-45)
- Tab Profile như Staff, bỏ Social và "Sidebar icons" (STAFFJS:118-129).
- Tab Workspace thay bằng `clientWorkspaceTree` (STAFFJS:133; CW:178-202): Company, Properties, Mallard Pointe at Riverbend, Parking and enforcement, Resident experience, Team and roles, Invoices and payment, Reports and alerts, Security, Documents, Document secret key, Data and recovery (CW:57-153). Lưu `client:eso-proto`; `mirrorPrefs` ghi thêm `docs-prefs:client` và `capacity-prefs:client` (CW:214-219), được Documents và Capacity đọc (`src/features/documents/app.js:37-38`; `src/features/usage/app.js:19-20`).

**ST3. Resident** (ROUTES:19-25)
My profile: Phone và "Best way to reach me" có nút "Save changes", lưu `eso-res-pref:<id>` (STAFFJS:211-243; `src/features/settings/prefs.js:34-41`). My property: "Show Social" → `setShow` (STAFFJS:287-293, 441), PREVIEW ẩn mục Social ở sidebar (PREVIEW:623-630). Notifications (`rn*`, STAFFJS:244-249), Messages, Sign-in & security, Personalize, Language, Date and time, Accessibility. Không có Workspace, Availability.

**ST4. Admin** (ROUTES:48-52)
My profile (`adminProfile`, STAFFJS:251-274; cùng khóa `eso-res-pref:<adm-id>`), Availability, Notifications (`an*`, STAFFJS:275-280), Messages, Security, Personalize, Language, Date and time, Accessibility. Không có Workspace.

**ST5. Personalize (mọi portal)**
Lựa chọn: Theme, Accent, Text & headings, Sidebar, Buttons, Cards, Gestures (PROTO:545-553, 716-736). Client, Resident, Admin bị cắt bớt phần Sidebar (`trimSidebar`, STAFFJS:186-202). Áp dụng: trong iframe bằng `apply()` (PROTO:361-362); trên trang thật bằng `applyUiPrefs()` khi tải và khi nhận `message` (PREVIEW:93-156, 238); CSS sinh bởi `lookCss` (`src/shared/js/look-prefs.js:16-54`), thao tác vuốt bởi `gestureConfig` (`look-prefs.js:57-69`). "Reset to defaults" (PROTO:738) và `data-act="defaults"` (PROTO:803). `ui-prefs` lưu theo portal, không theo persona.

**ST6. Document secret key trong Settings (Client)**
Chọn nơi nhận khóa, "Generate key", "Lock this section" bằng PIN hoặc password, "Recent openings" (DK:53-60, 175-223, 256-313, 332). Khóa: `docs-secret:{log,issued,via,guard,tries,pending,window}` (DK:15).

Giá trị đã lưu được đọc ở đâu:

| Khóa | Nơi đọc ngoài PROTO |
|---|---|
| `ui-prefs:<portal>` | PREVIEW:93-155, 268-272; EXTRAS:185, 270 |
| `eso-proto` (Staff) | `src/features/promotions/store.js:13, 34` (chỉ `promoShow`, `promoSave`) |
| `eso-res-social:<id>` | PREVIEW:624; `src/features/social/store.js` |
| `docs-prefs:client`, `capacity-prefs:client` | Documents, Capacity |
| `eso-res-pref:<id>` | PREVIEW:609-622 (chỉ theme, contrast, reduceMotion kiểu cũ) |
| `eso-status`, `eso-notif`, `eso-avatar`, `eso-mfa`, `eso-sec`, `eso-prop` | Không có |

### 1.8 Admin Command Center

**A1. `/admin/dashboard.html` (Admin)**
`src/admin/dashboard.js:16-58` thay toàn bộ `<main>` của bản chụp bằng component `adminDashboard`; dữ liệu từ `adminOverview` và `adminView` (`src/admin/overview.js:50-67, 91-130`), làm mới qua `store.subscribe` và mỗi 60 giây (dashboard.js:38-39). Chỉ đọc `eso-msg-v1`.

| Phần | Nguồn | Đích |
|---|---|---|
| Headline | `o.headline` (overview.js:59-65) | "Open Ticket box", "Open Messages" (dashboard.js:20) |
| Băng Emergency | `store.emergencies` (overview.js:53) | `messages.html#/c/<id>` của emergency cũ nhất (overview.js:126) |
| Tile Open tickets | `supportQueue` (overview.js:20-41) | Ticket box |
| Tile Unread messages | `badgeCount`, `alertsFor` (overview.js:44-47) | Messages |
| Tile Emergencies | `store.emergencies` | `#/c/<id>` hoặc Messages (overview.js:101) |
| Tile Platform alerts | mẫu `HEALTH` | cuộn tới `#adm-health-h` (dashboard.js:49-54) |
| Support queue (Live) | tối đa 6 dòng (overview.js:104-123) | `tickets.html#/t/<id>` |
| Unread messages (Live) | tối đa 5 dòng (overview.js:124) | `messages.html#/c/<id>` |
| Platform at a glance, Platform health, Recent activity | mẫu `PLATFORM`, `HEALTH`, `ACTIVITY` (overview.js:134-166) | không có link; Health có "Show all N" |

### 1.9 Điều hướng

**NV1. Trang đầu và chọn persona (mọi portal)**
`src/index.html:12-22` là 11 link tĩnh. Chọn persona ở Hub `src/messages/index.html` (`src/features/messaging/hub.js:22-46`, kèm "Reset demo data" và "Start empty", hub.js:51-70) hoặc hộp Preview trong Messages (M21). `?as=` được nối vào mọi link (PREVIEW:372, 390, 415, 471-474, 582; EXTRAS:21) và truyền cho iframe cùng `embed=1` (PREVIEW:586-588).

**NV2. Sidebar và header trong khung (mọi portal)**
Mọi mục sidebar của bản chụp là `href="#"`; PREVIEW nối lại một số mục (PREVIEW:459-476) và thêm "Ticket box" kèm số ticket mở (PREVIEW:341-437), "Settings" cho Resident (PREVIEW:386-397), "Usage > Capacity" cho Client (PREVIEW:403-421). Mục còn `#` → toast "That page is not part of this preview yet." (PREVIEW:227-234; EXTRAS:55, 443-446). Header của Staff, Client, Resident (`addFrameBehaviours`, EXTRAS:676-685): tìm trang (EXTRAS:384-430), chuông, Help Center (EXTRAS:433-436), lọc menu, favorites, đồng hồ, menu hồ sơ có Status cho Staff và Client (EXTRAS:487-673). Admin chỉ có menu hồ sơ và chuông (PREVIEW:219-220). Property filter của Client: `src/shared/js/property-filter.js:13-95`.

**NV3. Exit (mọi portal)**
`exitTarget(own, home)` (`src/shared/js/exit-target.js:11-19`): về trang đã đến từ đó nếu cùng origin và không phải chính trang này; nếu không thì về trang chủ portal, giữ `as` và `dark`, bỏ `embed`. Gọi ở MA:268, MT:97, SR:57, SR:1159, `src/features/promotions/resident.js:30`.

**NV4. Back (mọi portal)**
- Settings: `backTarget` (`src/shared/js/back-target.js:20-27`, gọi ở STAFFJS:502-511) trả `'history'` khi chưa di chuyển trong Settings và referrer là trang cùng portal; còn lại `'crumb'`.
- Messages và Ticket box: nút Back chỉ hiện khi có bước lùi bên trong trang (mobile từ thread về danh sách, hoặc `history.state.depth > 0`) (MA:250-267; MT:85-96).

**NV5. Deep link (mọi portal)**
- `#/c/<id>`: sinh ở MA:279, 2295; MT:335; `src/admin/overview.js:101, 124, 126`. Phân tích ở MA:272; `boot` bỏ qua nếu người xem không thấy conversation (MA:2284-2285).
- `#/t/<id>`: sinh ở MA:971; MT:105, 332, 503; `overview.js:113`. Phân tích ở MT:99; bỏ qua nếu không có quyền (MT:501).
- `#/post/<id>`: sinh ở SR:324, 1740; phân tích ở SR:28.
- `?new=1`: MT:505.
- Hash của Settings đổi qua lại với path bằng `pathForHash` (ROUTES:57-61).

**NV6. Ngăn kéo mobile, thu gọn sidebar (mọi portal)**
Dưới 1024 px: nút "Open navigation", nền mờ, Esc (PREVIEW:242-263), vuốt mở/đóng (PREVIEW:265-320). Desktop: thu gọn bằng nút hoặc Ctrl/⌘+B, lưu `ui-sidebar-collapsed:<portal>` (PREVIEW:159-186).

**NV7. Support và Resident home (Staff, Client, Resident)**
- Staff `/staff/support.html` → PROTO `#/support` (PREVIEW:535-540; PROTO:6932 trở đi): bài viết, "Submit a ticket" và "My tickets" dùng kho riêng `eso-sup` (PROTO:6933, 6941-6942), "Escalate to property team", "AI Work Assistant", "System status".
- Client `/client/support.html`: cùng trang, nhưng "Submit a ticket" và "My tickets" mở `/client/tickets.html` (kèm `?new=1`) (STAFFJS:401-405, 487-497).
- Resident home (`src/resident/home.html`): "Request Spot", "View Available Spots", "Manage vehicles" đều `href="#"`. Nút Help Center của Resident mở `/resident/tickets.html` (EXTRAS:25).

---

## 2. Quy tắc nghiệp vụ mà mã thực thi

Tổng cộng 192 quy tắc: Messages và Ticket box 43, Social 50, Notifications 15, Promotions 14, Documents 18, Capacity 11, Admin 9, Settings và khung 32. Cột "Store" là nơi thực thi trong tầng dữ liệu; cột "Chỉ UI" là nơi chỉ có giao diện chặn hoặc ẩn.

### 2.1 Messages và Ticket box

| # | Quy tắc | Store | Chỉ UI |
|---|---|---|---|
| 1 | Ai nhắn ai: resident → staff; staff → resident, client, admin; client → staff, admin; admin → mọi vai | MS:15-21, 286, 645 | — |
| 2 | Resident không tự mở chat với ai; chỉ qua trợ lý (`use_assistant`) | MS:644, 1169 | ẩn "New" MA:241-242 |
| 3 | Staff hoặc Client nhắn Admin luôn thành support thread | MS:646, 1172-1173 | — |
| 4 | Resident chỉ viết cho Staff; ghi chú từ Admin là một chiều (`one_way`) | MS:285 | MA:1002-1005 |
| 5 | Outreach tới Resident: một tin cho tới khi Resident trả lời (`awaiting_reply`); emergency được bỏ qua | MS:288-291 | MA:1001 |
| 6 | Tối đa `outreachMax: 2` thread chưa trả lời mỗi Resident trong `outreachWindowMs` 24 giờ, tính mọi người gửi (`rate_limited`) | MS:26-27, 652-653 | — |
| 7 | Tin tối đa `maxLen: 2000` ký tự; không rỗng (trừ khi có đính kèm) | MS:28, 321, 450-451 | MA:1723 (số 2000 viết cứng), đếm từ 1600 MA:1764 |
| 8 | Đính kèm: tối đa 4 mỗi tin, mỗi tệp 450 KB, phải là data URL, ảnh phải `data:image/`, tên cắt 80 ký tự | MS:30-31, 230-243 | loại tệp PDF/DOCX/TXT/CSV MA:1858; nén ảnh MA:1824-1852 |
| 9 | Ai thấy conversation: resident chat thì Resident chủ và Staff khi `queued` hoặc là assignee (không thấy khi `bot`), Admin không bao giờ; direct/group thì thành viên; support thì mọi Admin và người yêu cầu; announcement thì tác giả và audience | MS:249-265 | — |
| 10 | Ai được viết: chat đã `closed` thì không; Staff chỉ khi `queued` hoặc là assignee của chat `active`; announcement chỉ đọc | MS:268-302 | MA:985-1008 |
| 11 | Nhận chat: chỉ Staff, chỉ khi `queued`, một người thắng; tin trả lời đầu tiên cũng là nhận | MS:277, 459, 538-547 | — |
| 12 | Resolve: resident chat chỉ Staff assignee khi `active`; support chỉ Admin; direct Staff+Client chỉ Staff trong thread và phải có ít nhất một tin; loại khác bị từ chối | MS:550-575, 690 | nút theo `actions` MS:1359-1371 |
| 13 | Mở lại: tin mới trong direct đã resolved mở lại và giữ số ticket; người yêu cầu viết vào support thì về `open`; Admin viết thì tự gán và `open` → `pending` | MS:311-316, 387-396 | — |
| 14 | Mỗi Resident chỉ một phiên mở; chat đã `closed` không mở lại, phải tạo phiên mới | MS:273, 423 | MA:996-999 |
| 15 | End chat: Resident chủ, khi `bot`, `queued` hoặc `active` | MS:578-585 | — |
| 16 | Chấm điểm: Resident chủ, chat đã `closed`, có assignee, chưa chấm; một lần | MS:627-634 | — |
| 17 | Giai đoạn ticket: `bot`/`queued` = Open; `active` = In progress hoặc Waiting on resident; đóng bởi Staff = Resolved, còn lại Closed. Chỉ Staff assignee đổi In progress ↔ Waiting | MS:48-53, 613-625 | — |
| 18 | Tự đóng: chat `bot` im lặng 15 phút (`botIdleMs`), chat `active` im lặng 12 giờ (`activeIdleMs`); chat `queued` không tự đóng | MS:24-25, 1076, 1088-1093 | — |
| 19 | Trợ lý: chỉ chuyển cho người thật khi Resident chọn "Talk to a person" hoặc "No, talk to a person"; hai lần không hiểu hoặc câu dài hơn 160 ký tự thì đề nghị | `src/features/messaging/bot.js:104, 124-129` | — |
| 20 | Số ticket: support khi tạo; resident chat khi vào hàng chờ; direct Staff+Client khi resolve lần đầu; bắt đầu sau 1080 | MS:44, 357, 566, 672 | — |
| 21 | Tạo support: chỉ Staff hoặc Client; subject bắt buộc, tối đa 120; priority `low|normal|high` (sai thì `normal`); category thuộc `TICKET_CATEGORIES` (sai thì rỗng) | MS:42, 668-687 | MT:463-471 |
| 22 | Đổi status, priority, assignee của support: mọi Admin; assignee phải là Admin | MS:689-733 | MA:801 |
| 23 | Group: chỉ Staff hoặc Admin tạo; thành viên là Staff, Client, Admin; 3 đến 12 người; tên bắt buộc, cắt 60; thêm người chỉ Staff/Admin trong nhóm; không rời được khi còn 2 người | MS:739-787 | MA:2097-2104 |
| 24 | Announcement: chỉ Admin; title và text bắt buộc; audience `everyone` hoặc danh sách vai; không ai trả lời | MS:790-807, 297-298 | MA:243 |
| 25 | Emergency: chỉ resident/staff/admin, chỉ trong resident chat hoặc direct; bỏ qua trợ lý; chỉ Staff/Admin xác nhận; 180 giây chưa xác nhận thì ghi "SMS (simulated)"; xuyên qua DND và mute; không ẩn được | MS:36, 474, 484, 588-600, 943, 1077-1087, 1126, 1147-1148 | MA:1020 |
| 26 | Reaction: mỗi người một emoji mỗi tin; trùng thì gỡ, khác thì thay; phải là emoji thật | MS:840-857 | 6 emoji nhanh `emoji.js:4` |
| 27 | Reply: chỉ trích tin cùng conversation, không trích tin đã gỡ hay tin hệ thống | MS:467-471 | — |
| 28 | Forward: Resident không được; đích phải viết được; không forward vào chat đang `queued` | MS:499-518 | MA:1363 |
| 29 | Unsend: tin của mình, trong `unsendMs` 15 phút, không trong resident chat đã đóng; xóa chữ, đính kèm, reaction | MS:32, 860-880 | mục menu mờ kèm lý do MA:1375-1378 |
| 30 | Edit: tin chữ của mình, không phải lựa chọn nhanh, trong `editMs` 15 phút, không trong chat đã đóng; không giữ bản cũ | MS:33, 883-901 | MA:1371-1374 |
| 31 | Delete for me và Hide conversation: chỉ ảnh hưởng người làm, không giới hạn thời gian; conversation ẩn tự hiện lại khi có hoạt động mới | MS:904-969 | — |
| 32 | Pin, important, mute là riêng từng người; chat mute không cộng vào badge; thứ tự danh sách: pin, rồi emergency, rồi mới nhất | MS:993-1006, 1127, 1238 | — |
| 33 | Do not disturb chỉ chặn announcement và outreach chưa trả lời | MS:1128, 1148 | nút chỉ cho Resident MA:244 |
| 34 | Staff không bị báo bởi phần trợ lý của chat (tin bot, lựa chọn nhanh); Resident được báo tin bot và dòng hệ thống có `notify` | MS:63-68 | — |
| 35 | Tìm kiếm: từ 2 ký tự, chỉ conversation thấy được, bỏ tin đã gỡ, tin hệ thống, tin và chat đã ẩn; Staff không tìm trong tin bot; tối đa 30 kết quả | MS:1009-1033 | — |
| 36 | "Read" khi mọi người khác đã đọc; group báo "partial" kèm tên | MS:223-227, 1356 | — |
| 37 | Online trong 45 giây (`presenceMs`), đang gõ trong 5 giây (`typingMs`) | MS:34-35, 1043-1063 | — |
| 38 | Gửi lại an toàn theo `clientId`; ghi compare-and-set, thử tối đa 6 lần | MS:460-463; `transport.js:118-138` | — |
| 39 | Ticket box: Resident thấy ticket của mình (đã vào hàng chờ); Staff thấy mọi resident ticket, support của mình và ticket Staff+Client của mình; Admin thấy mọi support; Client thấy support và ticket Staff+Client của mình | MS:1269-1278 | — |
| 40 | Trả lời trong Ticket box chỉ với ticket support | — | MT:407 |
| 41 | Tạo ticket trong Ticket box: chỉ Staff, Client | MS:669 | MT:38, 456 |
| 42 | Thẻ audit không sửa được, không thành dòng xem trước, không tính chưa đọc; Staff/Admin thấy id và giờ ISO, Resident/Client thấy tên và giờ | MS:335-342 | MA:1159-1162; MT:352-354 |
| 43 | Bảng chi tiết chỉ cho Staff và Admin; 5 ticket gần nhất của Resident | MS:1249, 1257 | MA:747 |

### 2.2 Social

| # | Quy tắc | Store | Chỉ UI |
|---|---|---|---|
| 1 | Bài tối đa `MAX_POST = 1000` | SF:30, 513 | `maxlength` SH:190 |
| 2 | Bài chỉ có ảnh vẫn hợp lệ; không chữ và không ảnh thì từ chối | SF:512 | — |
| 3 | Audience `all / residents / staff` | SF:29, 514 | SH:203-207 |
| 4 | Announcement không được Staff only | SF:515 | SR:1653-1654 |
| 5 | Chỉ sửa, xóa, ghim bài `a === 'me'` | SF:541, 568, 580 | SR:984-991 |
| 6 | Tối đa `MAX_PINNED = 3` bài ghim trong cả feed | SF:560, 569-570 | — |
| 7 | Không có thời hạn sửa bài | — | — |
| 8 | Tối đa `MAX_IMAGES = 4` ảnh | `src/features/social/images.js:7, 38` | SR:1597, 1624-1625 |
| 9 | Mô tả ảnh tối đa `MAX_ALT = 120`, rỗng thành "Photo" | `images.js:8, 42-44` | SH:901 |
| 10 | Ảnh lưu được: gradient hoặc data URL jpeg/png/webp, dài tối đa `MAX_DATA_CHARS + 64` | `images.js:13-14, 20-24` | — |
| 11 | Loại file nhận: jpeg, png, webp | — | SR:1602; SH:194 |
| 12 | Nén: cạnh dài 1280/960/720, chất lượng 0.82/0.7/0.58 tới khi ≤ `MAX_DATA_CHARS = 420000` | — | SR:1605-1617 |
| 13 | Hết chỗ localStorage thì báo "There is not room to keep these photos…" | SF:532, 557 | — |
| 14 | Comment tối đa `MAX_REPLY = 500` | SS:328, 340, 366; SF:31, 258, 307 | SH:828, 886 |
| 15 | Comment không rỗng | SS:339; SF:257 | — |
| 16 | Resident bị tắt reply khi `eso-mod.perms.reply` khác `all` | SS:75-79, 332 | SR:534, 866-869 |
| 17 | Resident chỉ comment bài mình thấy (audience `all`/`residents`) | SS:233, 335-336 | — |
| 18 | Chỉ trả lời comment còn `state === 'ok'` | SS:337; SF:263, 275 | — |
| 19 | Chỉ sửa, xóa comment của mình | SS:351-385; SF:310, 321 | — |
| 20 | Không sửa comment đã bị Staff gỡ | SS:370; SF:311 | — |
| 21 | Resident không xóa lần hai, không xóa comment đã bị gỡ | SS:380-382 | — |
| 22 | Chỉ ẩn comment của người khác | — | `canHide` SS:214, SF:84 |
| 23 | 5 reaction: Like, Love, Haha, Wow, Sad | `src/features/social/reactions.js:10-16` | SH:238-242 |
| 24 | Mỗi người một reaction mỗi bài hoặc comment | SS:289-293; SF:223-232 | — |
| 25 | Resident chỉ react, share bài mình thấy | SS:286, 301 | — |
| 26 | Số đếm là số người có tên | `reactions.js:8, 65-70` | — |
| 27 | Share là bật/tắt | SS:304-305; SF:242-243 | — |
| 28 | Không tự follow; chỉ follow người Social biết | SS:312-313; SF:193-194 | — |
| 29 | `alex` là `res:res-1` | `reactions.js:56-57` | — |
| 30 | Guidelines bắt buộc khi `gl.accept !== false` và `accepted < ver` | SS:69, 154-157 | — |
| 31 | Phải cuộn hết, Agree, tick, Confirm | — | SR:1100-1168 |
| 32 | Chặn thao tác trước khi chấp nhận guidelines | không kiểm trong `timeline/react/share/addReply/follow` | SR:147, 157, 187, 1708 |
| 33 | Lý do vi phạm: `hate, harass, privacy, parking, spam, other` | SM:13-20, 96 | — |
| 34 | Note bắt buộc ≥ 3 ký tự khi `other` hoặc `requireNote`; tối đa `MAX_NOTE = 300` | SM:27, 98-100 | SH:317 |
| 35 | Loại: `warning` hoặc `pause` | SM:21-24, 101 | — |
| 36 | Thời lượng pause từ `minPauseMin` đến `maxPauseDays` | SM:102-108 | làm tròn 15 phút SR:667, 715 |
| 37 | Rules mặc định: `limit 3, minPauseMin 15, maxPauseDays 90`; hate pause 72 giờ; harass, privacy pause 24 giờ; còn lại warning | SM:34-40 | — |
| 38 | Biên Rules: `limit [2,5]`, `minPauseMin [5,1440]`, `maxPauseDays [1,365]` | SM:33, 41-81 | SR:2371 |
| 39 | Violation trên comment: chỉ comment của Resident, không phải của mình, một lần mỗi comment | SF:356-358 | — |
| 40 | Ban, Warn trực tiếp: chỉ Resident có persona | SF:458-459 | — |
| 41 | Strike chỉ tính `pause`; không hết hạn | SM:154-167 | — |
| 42 | Đủ `limit` strike: tài khoản chờ review, Resume bị từ chối | SM:190-191; SS:126 | SR:1373-1381 |
| 43 | Pause không tự hết: phải bấm Resume và đọc lại guidelines | SM:192-195; SS:127-131 | — |
| 44 | Nhiều pause: cái kết thúc muộn nhất được tính | SM:194 | — |
| 45 | Unban chỉ khi có ban đang chạy và chưa tới limit | SF:481-485 | SR:2330 |
| 46 | Open account chỉ khi ≥ limit; niêm `limit` strike cũ nhất | SF:393-397 | SR:2337 |
| 47 | Đổi limit áp dụng ngay cho hold hiện tại | SF:492-494 | — |
| 48 | Notice chỉ ack được khi pause không còn chạy | SS:107 | — |
| 49 | Lý do gỡ comment chỉ tác giả thấy | SS:212 | — |
| 50 | Resident đang pause: `timeline` rỗng; `react/share/addReply/editReply` bị từ chối; vẫn `deleteReply` và `follow` được | SS:227, 283-284, 299-300, 310-320, 333-334, 362-363, 376-385 | UI khóa hết SR:148-156, 1708 |

### 2.3 Notifications

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| 1 | Danh mục theo portal `ROLE_CATEGORIES` | `src/features/notifications/store.js:26-32` |
| 2 | Chỉ Client có lọc Property | store.js:33; UI app.js:52 |
| 3 | Số mẫu chưa đọc: Client 109, Staff 7, Resident 33, Admin 3 | store.js:40-115 |
| 4 | Mục live thay mục mẫu (`REPLACED_BY_LIVE`) | store.js:120-129 |
| 5 | Trạng thái đọc theo persona `eso-notif-read:<id>` | store.js:35, 149-164 |
| 6 | Lựa chọn người dùng thắng; đọc nguồn thì mục live thành đã đọc | store.js:156 |
| 7 | Tìm kiếm: mọi từ phải có trong title, detail, property hoặc category | store.js:181-196 |
| 8 | Trang 25 dòng (`PAGE = 25`) | `src/features/notifications/view.js:5` |
| 9 | Chuông liệt kê 4 mục | store.js:176; EXTRAS:314 |
| 10 | Badge "99+" khi trên 99 | store.js:220 |
| 11 | Tin nhắn: một mục mỗi conversation có tin mới hoặc có tin trong 3 ngày, tối đa 12 | MS:1140, 1153, 1163 |
| 12 | Social: 7 ngày, tối đa 8 (`SOCIAL_LIMIT`) | `live.js:17-18, 37-38` |
| 13 | Ai được báo gì trong Social | `src/features/social/alerts.js:18-38` |
| 14 | Toast 7000 ms khi có Undo, 3500 ms khi không | UI app.js:154 |
| 15 | Persona dự phòng cho chuông: `cli-1, stf-1, res-1, adm-1` | UI EXTRAS:28, 280 |

### 2.4 Promotions

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| 1 | Hiện khi không phải draft, `start <= today <= end`, kênh có "In-App" | `src/features/promotions/store.js:57-64` |
| 2 | Tắt `promoShow` thì danh sách rỗng; tắt `promoSave` thì không lưu được | store.js:32-35, 111, 141 |
| 3 | Audience: all, buildings (`viewer.block`), segments | store.js:101-107 |
| 4 | Mỗi Resident tối đa `limR` lần (ít nhất 1) | store.js:87, 168-170 |
| 5 | Hết tổng (`claims >= total`) thì từ chối | store.js:72, 90, 164 |
| 6 | Mã unique: 5 ký tự, tất định theo `residentId|id`, dạng `<PREFIX>-XXXXX` | store.js:150-157 |
| 7 | Link chỉ `http(s)`; ảnh chỉ `data:image/` hoặc `http(s)` | store.js:67, 71 |
| 8 | Resident không ghi vào dữ liệu Staff | store.js:10-11 |
| 9 | Category có sẵn `BUILTIN` | store.js:15 |
| 10 | Title ≤ 100, Short description ≤ 80, Description ≤ 500, Terms ≤ 1000, Prefix ≤ 8 | chỉ UI PROTO:6192-6194, 6202, 6213 |
| 11 | Trường bắt buộc khi publish (`errs`) | chỉ UI PROTO:6175-6179 |
| 12 | Ảnh ≤ 5 MB, `image/*`; bìa 1200 px, logo 160 px | chỉ UI PROTO:6249, 6277-6278 |
| 13 | Không đổi category sau khi lưu | chỉ UI PROTO:6195 |
| 14 | Tòa nhà `Building A, Building B, Garage`; phân khúc members, movein, pet, ev | chỉ UI PROTO:6158 |

### 2.5 Documents

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| 1 | Loại file `pdf, doc, docx, xls, xlsx, png, jpg, jpeg` | `src/features/documents/store.js:34, 148` |
| 2 | Tối đa 10 MB (`MAX_BYTES`) | store.js:35, 149 |
| 3 | Tên bắt buộc, ≤ 120 | store.js:151-153 |
| 4 | Category, property, share thuộc danh sách; `expires` dạng `YYYY-MM-DD` | store.js:154-157 |
| 5 | Hết chỗ lưu thì từ chối upload | chỉ UI `src/features/documents/app.js:191-194, 462` |
| 6 | "Sắp hết hạn" 30 ngày; lựa chọn 7/14/30/60/90 | store.js:36-38, 96-102 |
| 7 | Sắp xếp mặc định: expired, soon, mới nhất | store.js:105-121 |
| 8 | Lọc Property: tài liệu "All properties" luôn hiện | store.js:130 |
| 9 | Quyền xem `admins`, `team`; giá trị cũ chuyển thành `team` | store.js:26-29, 75-82 |
| 10 | W-9: `pdf, png, jpg, jpeg`; tên pháp lý ≤ 120; ngày ký không ở tương lai | store.js:24, 309-331 |
| 11 | Chỉ một W-9 | chỉ UI app.js:339 |
| 12 | W-9 không xóa được | chỉ UI app.js:301 |
| 13 | W-9 quá 3 năm gắn "review" | store.js:25, 302-306 |
| 14 | Khóa bí mật: 16 ký tự, sống 5 phút, 5 lần thử, dùng một lần, chỉ lưu digest SHA-256 | store.js:174-179, 192-233 |
| 15 | Một khóa sống tại một thời điểm | UI app.js:356, 364, 381; store.js:219 |
| 16 | Mở khóa 5 phút, chỉ giữ trong bộ nhớ | store.js:178; UI app.js:42, 430 |
| 17 | Nhật ký mở W-9 giữ 5 lần gần nhất | store.js:236 |
| 18 | PIN 6 số, password 8–64, PBKDF2 120000 vòng, sai 5 lần chờ 5 phút (chỉ dùng ở Settings) | store.js:244-296; DK |

### 2.6 Capacity

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| 1 | Gói `Starter`, $50 định kỳ | `src/features/capacity/store.js:6` |
| 2 | Parking: $5/unit, gồm 500, đang dùng 261, tối đa 5000 | store.js:11 |
| 3 | Residents: $2, gồm 0, tối đa 5000 | store.js:12 |
| 4 | Staff: $10, gồm 0, tối đa 200 | store.js:13 |
| 5 | Storage: $15 mỗi 20 GB, gồm 10 GB, đang dùng 9,4 GB, tối đa 20 block | store.js:7, 14 |
| 6 | Property thêm: $25/tháng; unit 1–5000; tên ≤ 80; địa chỉ ≤ 120; bắt buộc authorize | store.js:16, 67-80 |
| 7 | Làm sạch dữ liệu lưu: số nguyên `0..max`, tối đa 50 property | store.js:19-27 |
| 8 | Budget `^\d{1,5}(\.\d{1,2})?$`; vượt thì khóa Review | UI `src/features/usage/app.js:142, 169` |
| 9 | Thứ tự budget: giá trị trên trang, mặc định Workspace, không giới hạn | store.js:99-104 |
| 10 | Authorize trong hộp Review bắt buộc khi giỏ có mục không phải property | chỉ UI usage/app.js:193, 203 |
| 11 | Storage "near" từ 0,9; "full" khi `used >= limit` | store.js:83-88 |

### 2.7 Admin Command Center

| # | Quy tắc | Nơi thực thi |
|---|---|---|
| 1 | Thứ tự hàng đợi: emergency, high, normal, low; cùng hạng thì chờ lâu nhất trước | `src/admin/overview.js:12, 25` |
| 2 | "high" đếm cả emergency; `unassigned` là không có assignee; `mine` so theo `me.name` | overview.js:31-33 |
| 3 | "Resolved this week" là đóng trong 7 ngày | overview.js:38 |
| 4 | Headline theo thứ tự: emergency, ticket chưa có chủ, ticket mở, hàng đợi trống | overview.js:59-65 |
| 5 | Tối đa 6 dòng ticket, 5 dòng tin | overview.js:80-81 |
| 6 | Cách ghi thời gian chờ | overview.js:70-75 |
| 7 | Màu tile: warning khi có ticket chưa có chủ; danger khi có emergency hoặc critical | overview.js:97-102 |
| 8 | Component chỉ chạy trên trang dashboard | `src/admin/dashboard.js:16` |
| 9 | Health hiện 4 mục đầu | chỉ UI `src/partials/admin-dashboard.html:179, 187-188` |

### 2.8 Settings, khung và điều hướng

1. Shim lưu trữ theo portal (PROTO:3).
2. `?as` chỉ có hiệu lực khi id đúng vai (`personas.js:29-33`).
3. Phân quyền mục Settings theo vai ở tầng UI (STAFFJS:118-180).
4. Chặn hash theo vai: Client (STAFFJS:578); Resident, Admin (STAFFJS:590-595).
5. Bảng địa chỉ và `pathForHash` (ROUTES:8-61).
6. Số điện thoại: regex `^[+\d][\d\s().-]*$`, 7–15 chữ số (`src/features/settings/prefs.js:26-32, 39`; UI STAFFJS:239-241).
7. `savePrefs`: theme `light|dark|system`; contact `app|email|text` (prefs.js:6-7, 34-41).
8. Client Workspace `FIELD_ERRORS`: email, domain, url, money; chỉ UI (CW:205-210, 282-292); `mirrorPrefs` kiểm lại budget (CW:217-218).
9. Ảnh đại diện: JPG/PNG/WebP, tối đa 5 MB (PROTO:1227-1228).
10. Màu chữ phải là `#rrggbb` (PROTO:744).
11. Cỡ chữ tùy chọn 12–24 (PROTO:748-754).
12. `lookCss` chỉ nhận giá trị hợp lệ (`src/shared/js/look-prefs.js:7-13, 22-29, 50`).
13. Chỉ nút primary đổi theo Buttons (look-prefs.js:38).
14. Màu sidebar cần đủ 4 hex; accent chỉ áp khi khác `#2b55f2`; theme đã lưu bị bỏ qua khi có `?dark` (PREVIEW:106, 125, 151).
15. Resident: lựa chọn cũ trong `eso-res-pref` chỉ dùng khi `ui-prefs:resident` chưa có (PREVIEW:614-622).
16. `gestureConfig`: low 0.5, high 0.2, mặc định 0.35 (look-prefs.js:57-69).
17. Vuốt: mép 24 px hoặc nửa màn hình; nhanh trên 0.5 px/ms; ngưỡng 10 px; chỉ dưới 1024 px (PREVIEW:285-317).
18. Thu gọn sidebar chỉ khi `ui.collapse === true` và từ 1024 px (PREVIEW:100, 165).
19. Status ở menu hồ sơ: 6 trạng thái, 5 thời hạn, lời nhắn tối đa 80 ký tự, hết hạn về Available (EXTRAS:471-530, 609).
20. Favorites lưu `<portal>:sb-pins`; ẩn khi `ui.favorites === false` (EXTRAS:183-212).
21. Đồng hồ `<portal>:sb-clock`, vẽ lại mỗi 15 giây (EXTRAS:263-271).
22. Chuông đếm số chưa đọc thật, đồng bộ qua `storage` (EXTRAS:284-293, 379).
23. Quy tắc Back của Settings; hash lúc vào chốt trong 500 ms đầu (`src/shared/js/back-target.js:20-27`; STAFFJS:504).
24. Quy tắc Exit (`src/shared/js/exit-target.js:11-19`).
25. Chuyển hướng địa chỉ cũ (PREVIEW:24-29, 516-519).
26. Mặc định Client: `showProp:false, sbClock:false, capOpen:true`, di trú một lần (STAFFJS:563-575).
27. `S.resSocial` đồng bộ với `eso-res-social:<id>` (STAFFJS:441, 444).
28. Ngôn ngữ chỉ English (STAFFJS:63-66).
29. Mục Document secret key tự khóa sau 10 phút và khi rời mục (DK:28, 296).
30. Hằng số khóa, PIN, password (`src/features/documents/store.js:176-178, 244-249`; DK:186).
31. Một khóa sống tại một thời điểm trong Settings (DK:144-152).
32. Màn hình chờ tối đa 3000 ms (`src/partials/head.html:20`; PREVIEW:35).

---

## 3. Điểm mù

### 3.1 Messages và Ticket box

1. **Admin chỉ gửi được đúng một tin cho mỗi Resident.** Thread Admin → Resident là outreach (MS:649, 656); sau tin đầu, `postCheck` trả `awaiting_reply` cho tới khi Resident trả lời (MS:288-291), nhưng Resident không bao giờ trả lời được (`one_way`, MS:285). Thread cũ được dùng lại (MS:647). Ô soạn ghi "You can write again once they reply" (MA:1001). Chỉ emergency vượt qua. Suy ra từ mã; test `messaging.test.mjs:252` chỉ kiểm chiều một chiều.
2. **Emergency của Resident không tới Admin.** Admin không thấy resident chat (MS:254), nên `emergencies(adminId)` chỉ gồm emergency trong direct mà Admin tham gia (MS:603-610). Tile "Emergencies" trên Admin dashboard dùng chính hàm này.
3. **Tự đóng chat và leo thang emergency phụ thuộc có trang Messages đang mở.** `tick()` chỉ được gọi ở MA:2283, MA:2339 và MS:421. Ticket box, chuông, Admin dashboard không gọi.
4. **Leo thang emergency là mô phỏng**: chỉ ghi `smsAt` và thẻ audit "SMS and critical alert sent (simulated)" (MS:1085-1086; MA:937). Không có bước nào sau đó.
5. **"Mark as unread" không có trong Messages.** `store.markUnread` (MS:827) chỉ được gọi từ trang Notifications (`src/features/notifications/live.js:76`).
6. **Ticket box không có điều khiển Status, Assign, Priority.** Chỉ Admin đổi được, và chỉ trong Messages (MA:799-817).
7. **Ticket box: resident ticket và ticket Staff+Client chỉ đọc.** Form trả lời chỉ hiện cho loại `support` (MT:407). Form này không có đính kèm, không kiểm offline, không truyền `clientId` (MT:427).
8. **Client và Staff không tự đóng được support ticket của mình**; chỉ Admin (MS:690). Client không có nút Resolve trong chat với Staff (MS:563).
9. **Hành động do store tính nhưng UI không dùng**: `status:open|pending|resolved` và `assign_me` trong `get().actions` (MS:1367-1368); MA không đọc.
10. **Mã không dùng**: `CONFIG.sendLatencyMs` (MS:29); `store.counts` (MS:1384) không được gọi trong `src`; `isEmptyQuery` được import mà không dùng (MA:5).
11. **Tab không phủ hết loại chat.** Staff không có tab cho chat với Resident (tag `residents`), chat do Admin mở (tag `other`) và announcement (tag `announcements`): chỉ thấy ở "All" (MA:56; MS:1210, 1229). Tab "Sent" của Admin chứa mọi announcement Admin thấy, kể cả của Admin khác (MA:58). Group của Admin nằm trong tab "Direct" (MS:1227). Tag `current`/`history` của Resident không tab nào dùng (MA:55; MS:1204).
12. **Chat đóng khi chưa có Staff nhận biến mất khỏi Messages của mọi Staff** (`canSee` cần `queued` hoặc là assignee, MS:253) nhưng còn trong Ticket box (MS:1272).
13. **Không có chuyển giao chat.** Sau khi một Staff nhận, Staff khác không thấy và không có hàm trả lại hay gán lại (không có trong MS).
14. **Client không báo được emergency**; group và support cũng không (MS:474; MA:1020).
15. **Trợ lý: chú thích lệch với mã.** `bot.js:4-5` ghi "two unanswered questions hands the chat to staff"; mã chỉ đưa ra lựa chọn (`bot.js:124-129`). Các câu trả lời có `handoff: true` cũng chỉ đổi lựa chọn (`bot.js:83-84`).
16. **Nội dung trợ lý là mẫu** (`bot.js:2`) và chỉ tới các trang không có trong preview: My Parking, Vehicles, Access & Passes, Violations (`bot.js:13-44`).
17. **Giới hạn loại file đính kèm chỉ ở UI** (MA:1858); store nhận mọi data URL dưới 450 KB (MS:237-239). SVG và GIF không được nén (MA:1832, 1854).
18. **Số 2000 viết cứng ở UI** (MA:1723, 1764) thay vì `store.config.maxLen`.
19. **Chấm điểm**: toast "Thanks for the feedback." hiện kể cả khi `rate` thất bại (MA:1186-1187). Staff không thấy điểm trong Messages; chỉ có ở Ticket box (MT:324) và file export.
20. **Group**: không đổi tên, không xóa thành viên, người tạo không có quyền riêng; tạo cần 3 người nhưng nhóm tồn tại được với 2 (MS:750, 782).
21. **Announcement**: không có sửa, thu hồi hay hết hạn ngoài cửa sổ Edit/Unsend 15 phút chung.
22. **Unsend và Edit không để lại nội dung cũ**: bản ghi ticket chỉ hiện "This message was removed." (MS:869-875; MT:249).
23. **Hộp Preview là công cụ demo** ("Only in this preview", `src/partials/messages-app.html:361`); "Reset demo data" xóa dữ liệu nhắn tin của mọi persona (MS:1098-1105). "Simulate offline" là cờ `sessionStorage` (MA:117).
24. **Cài đặt Messages trong Settings không có tác dụng**: `msgEnter, msgSound, msgReceipts, msgTyping, msgAway, emSms` (STAFFJS:49) không được `src/messaging` đọc. Do not disturb của Messages là cài đặt riêng (MS:1071).
25. **Hai hệ ticket ở Staff**: Help Center dùng `eso-sup` (PROTO:6933), Ticket box dùng kho Messenger.
26. **Test**: 42 test ở `tests/messaging.test.mjs`, 12 ở `checklist.test.mjs`, 9 ở `e2e-flows.test.mjs`, 6 ở `hidden.test.mjs`, 6 ở `ticket-create.test.mjs`, 1 random walk ở `fuzz.test.mjs`; tất cả ở mức store. Không test nào chạm: MA, MT, `hub.js` (render, tab, menu, hộp thoại New/Announce/Members/Forward, ô soạn, outbox offline, nháp, nén ảnh `prepareFile`, phím tắt, deep link, Back/Exit trong trang, export `.txt`, Copy link, bảng chi tiết, băng emergency). Ở mức store, không thấy test cho tin thứ hai của Admin tới Resident.

### 3.2 Social

**Nút chỉ toast hoặc không có gì phía sau**
1. "Change cover photo" → toast "Cover photo upload is not part of this preview." (SH:734; SR:1944).
2. "Edit profile" (Staff) → toast "Editing your Social profile is part of Settings in this preview." (SH:741).
3. Staff card "Edit" → toast (SR:1950); Show/Hide chỉ là biến trong bộ nhớ (SR:1700, 1951).
4. "Reported posts" ở Moderation luôn in "Nothing to review right now." (SR:2446-2447). Không có nút Report nào trong Social.
5. "Share" trên comment chỉ copy link của bài (SR:823).
6. `copyLink` luôn toast "Link copied" kể cả khi clipboard lỗi (SR:323-326, 1945). Link `#/me` mở hồ sơ của người mở link (SR:1703).
7. Poll: bài mẫu `p2` có dữ liệu poll (`src/features/social/seed.js:15`) nhưng chỉ vẽ huy hiệu (SR:1033).
8. Views: chỉ đọc `p.vw` hoặc `SAMPLE_VIEWS` (SF:28, 135); không mã nào tăng lượt xem.
9. Privacy mode ghi log vào `eso-res-privacy-log:<id>` (SR:1194-1200) nhưng không nơi nào đọc.
10. Tên và avatar không bấm được: không xem được hồ sơ người khác.
11. Mute theo người và từ khóa: không có UI thêm; mặc định đã mute sẵn `people:['marcus'], kw:['parking ticket'], threads:['p7']` (SF:143). Mute không áp vào rail, chuông, Pulse (SR:162-172).
12. Gỡ comment thường: hộp xác nhận nói "The person who wrote it is told it was removed." (SR:627) nhưng không có alert nào và không ghi lý do (SF:345).
13. Mục Social trên trang Notifications không mở đúng bài: `post` được mang theo (`live.js:45`) nhưng href chỉ là trang Social (`src/features/notifications/view.js:48`).
14. Trạng thái đã đọc ở chuông Social của Staff không được `live.js` dùng (`live.js:73`).
15. Staff không có cách gỡ **bài** của Resident hay ghi violation lên bài; chỉ có cho comment.
16. Resident không đăng được bài (SS:3) dù feed mẫu có bài của cư dân (`p5`, `p7`).

**Markup và mã chết**
17. Template `t-vio-row` (SH:779) không được dùng.
18. `#rx-more` luôn `hidden` (SR:474).
19. `TABS`: hai nhánh của toán tử ba ngôi giống hệt nhau (SR:221-223).
20. Export chỉ test dùng: `store.toggleLike` (SS:323), `staffStore.toggleLike` (SF:249), `staffStore.profileStats` (SF:170). `MIN_PAUSE_MS`, `MAX_PAUSE_DAYS` (SM:25-26) không được import.
21. Trường ghi ra nhưng không đọc: `likes, lk, rp` khi `addPost` (SF:528); `likes: 0` trên reply (SS:343; SF:262); `nr` (SF:7, 269); `seen, rpv` trong seed (`seed.js:30`).
22. Nhánh gần như không tới được từ UI: `deleteReply` khi pause (SS:376), các toast lý do pause, `writeOff()` nhánh pause (SR:535), vì trang đã bị khóa (SR:152-156).

**Chữ lệch với hành vi**
23. Hint cho Staff: "They can read Social, but cannot comment…" (SM:23; SR:707). Thực tế Resident bị chặn đọc hoàn toàn (SS:227).
24. "They can comment, reply, react and share again on <ngày>" (SR:653). Thực tế phải bấm Resume và chấp nhận lại guidelines.
25. SH:643-644 "Until then the feed can be read…". Thực tế không đọc được (SR:157).
26. SR:1299-1300 "Social opens by itself" trái với SR:1364.
27. Placeholder "Search posts and neighbors…" (SH:99): chỉ lọc theo tên tác giả và nội dung bài (SR:181).

**Lệch dữ liệu giữa hai phía**
28. Announcement: Staff tính `ann || src === 'ann'` (SF:47), Resident chỉ `!!p.ann` (SS:259). Bài mẫu `p8` vì thế là Announcement với Staff nhưng là Discussion với Resident (`seed.js:21`).
29. Tab "Community & Announcements" chứa khác nhau ở hai phía (SR:177-178).
30. Xóa bài không dọn reply, reaction, share, saved của Resident ở key riêng (SF:581).
31. Bảng tên người lặp ở ba file (SS:41-44; SF:23-26; `src/features/social/residents.js:46-49`). "Dana Whitfield" là Client ở `personas.js:18` nhưng là Staff trong Social (SF:24).

**Test**
32. 12 file `tests/social*.test.mjs` (113 test) đều ở mức store. Không test nào cho handler DOM của SR. Ở mức store không thấy test cho: `staffStore.share`, `staffStore.unmute`, `follow` khi đang pause, dữ liệu mồ côi sau khi xóa bài, Staff `deleteComment` lần hai, Ban tài khoản đang review, lệch `ann`/`src:'ann'`.

### 3.3 Notifications

1. Mục `dest: null` không có đích: toàn bộ mục mẫu của Staff; requests, violations, parking, reports của Client; parking, billing, system của Resident; phần lớn của Admin (`src/features/notifications/store.js:46-113`). Trong chuông chúng dẫn về trang Notifications (EXTRAS:319).
2. Không deep-link: mục tin nhắn có `convId`, mục Social có `post` (`live.js:25, 45`), nhưng href chỉ là trang gốc (`view.js:48`; EXTRAS:319).
3. Chuông và trang xử lý khác nhau: bấm mục trong chuông chỉ `setRead` (EXTRAS:323); trang còn gọi `live.markRead` đánh dấu đã đọc cả cuộc chat (app.js:71).
4. Con số 109 / 7 / 33 không phải số chuông hiện: mục mẫu `messages` (và `community`) luôn bị thay bằng dữ liệu live (store.js:120-129).
5. `unreadCount` (store.js:173) không được import ở đâu trong `src`.
6. Khóa đích `staff.tickets` và `admin.tickets` không mục nào dùng (app.js:21, 23; EXTRAS:24, 27).
7. `PANEL_ICON` thiếu `promotions` và `billing` (EXTRAS:381).
8. Số liệu mẫu lệch nhau: "Parking Spots over limit 261 / 25", "Staff over limit 18 / 3" (store.js:63-64) so với Capacity 261 / 500 và 0 / 0 (`src/features/capacity/store.js:11, 13`); "32 platform health warnings" (store.js:109) so với 8 mục `HEALTH` (`overview.js:147, 154`); 7 thông báo promotion mẫu của Resident không gắn promotion nào (store.js:97).
9. Không có xóa, ẩn, snooze; không có thông báo sinh từ Promotions, Documents, Capacity.
10. Công tắc trong Notification settings (`eso-notif`, `rn*`, `an*`) không được `src/notifications` đọc.
11. Violation và warning của Social không đi vào trang Notifications hay chuông ngoài Social.
12. Test: 13 + 5 + 11 test ở `tests/notifications*.test.mjs`, mức logic thuần. Không test `notifications/app.js`, `browserLive`, `wireBell`, `addBell`, bảng đích.

### 3.4 Promotions

1. Hai hệ tách rời: PROTO có "Resident view", "My rewards", hộp Claims, tồn kho (khóa `eso-pmclaims`, `eso-pmst`, `eso-pm-saved`, `eso-pmf`; PROTO:2123, 2133, 6383, 6646). Trang Resident thật chỉ đọc `eso-pmc-saved`, `eso-pmc-cats`, `eso-proto`. Claim của Resident thật (`eso-res-promo:<id>`) không hiện ở hộp Claims của Staff.
2. Giới hạn tổng không có hiệu lực qua UI: `claims` trong `eso-pmc-saved` chỉ được ghi ở PROTO:6238 và giữ giá trị cũ; `claim()` không tăng nó. Badge "Fully claimed" không đạt được qua UI.
3. "Limit applies to: Each unit" (PROTO:6204) không được store đọc.
4. Giờ bắt đầu, kết thúc (PROTO:6206) bị bỏ qua; `isLive` chỉ so ngày.
5. Kênh Email, SMS không làm gì; bỏ In-App thì promotion ẩn hẳn (store.js:62).
6. Views, Claims, CTR, Redemption của Staff (PROTO:6242-6246) không nhận dữ liệu từ Resident thật.
7. Deal mẫu của Staff (`const DEALS`, PROTO:2090) không nằm trong `eso-pmc-saved`; trang Resident rỗng cho tới khi Staff tạo mới.
8. Phương thức QR chỉ hiện mã chữ (`src/features/promotions/resident.js:199`).
9. Phương thức link: mỗi lần bấm "Get offer" tính một lượt claim kể cả khi cửa sổ bị chặn (store.js:171).
10. Không có hủy claim, lịch sử claim, redeem, "My rewards" ở Resident thật. Không có "End", "Delete" ở Staff.
11. Tắt `promoShow`: mục "Promotions" ở sidebar Resident vẫn hiện (PREVIEW:623-628).
12. Audience "Garage" không khớp persona nào (`personas.js:13-15`).
13. Nhánh API `pmApi` (PROTO:6225-6236) chỉ chạy khi có `window.ESO_STAFF_CLAIMS_API`; không nơi nào gán.
14. Test: 9 test ở `tests/promotions.test.mjs` cho store. Không test `promotions/resident.js`, không test PROTO.

### 3.5 Documents và Capacity

1. Download chỉ toast "Downloads are not part of this preview." (`src/features/documents/app.js:299`), kể cả W-9 đã mở khóa. Chỉ lưu metadata.
2. Không có thư mục, đổi tên, sửa metadata, thay file, link chia sẻ.
3. "Who can see it" chỉ là nhãn; không kiểm vai trò.
4. Người dùng gán cứng `ME = { name: 'Dana Whitfield', … }` (app.js:30); không theo `?as=`. `eso-docs:client` dùng chung.
5. Gửi khóa là mô phỏng: khóa hiện ngay trong hộp thoại (app.js:389).
6. 9,4 GB "đã dùng" là hằng số (`src/features/capacity/store.js:14`). Khi `eso-docs:client` chưa tồn tại, Usage và sidebar không cộng 7 tài liệu seed còn trang Documents có cộng (`usage/app.js:56`; FRAME:15; `documents/app.js:34, 177`).
7. `KEY_VIA`, `canMakeKey` (`documents/store.js:172, 218`) không dùng trong UI.
8. Capacity: không tính tiền, không checkout ("Preview only…", `src/client/usage-content.html:188`); không giảm hay hủy được (`applyCart` chỉ cộng, store.js:59-64).
9. "Added to Billing & Plan": mục "Billing & Plan" là `href="#"` (FRAME:27).
10. Thẻ Capacity ở sidebar chỉ đọc một lần lúc dựng khung (FRAME:108); trang Usage không nghe `storage`.
11. Trần số lượng: nút "+" so với giỏ hiện tại (`usage/app.js:66`), `applyCart` chặn tổng (store.js:61); băng "done" in số tính trước khi chặn (usage/app.js:204, 211).
12. Câu chữ mâu thuẫn về thời điểm tính tiền (`usage-content.html:80, 124, 185`; usage/app.js:211); hộp Review không có dòng thuế hay proration (usage/app.js:183-191).
13. Test: 15 + 13 test Documents, 9 test Capacity, mức store. Không test `documents/app.js`, `usage/app.js`.

### 3.6 Admin Command Center

1. "Platform at a glance", "Platform health", "Recent activity" là dữ liệu mẫu cố định (`overview.js:134-166`), không link, không hành động.
2. Chú thích `overview.js:134` nói mỗi mục `PLATFORM` có trường `to`; không mục nào có.
3. Số mẫu lệch: `HEALTH.warning: 32` so với 8 mục; "Monthly revenue $19" so với gói $50; "Open requests 0" so với 30 thông báo yêu cầu mẫu của Client; ngày cố định "Nov 9 / Nov 8" (`overview.js:140-165`).
4. "N messages in M conversations" có thể lệch: `conversations` đếm từ `alertsFor` (tối đa 12), `unread` từ `badgeCount` (overview.js:45-46).
5. Nội dung `<main>` của bản chụp (nút "Refresh", "Switch to compact view"…) bị thay hết (`dashboard.js:58`).
6. Dashboard chỉ đọc: không gán ticket, không trả lời, không xác nhận emergency tại chỗ. Băng Emergency chỉ dẫn tới emergency cũ nhất (`overview.js:101, 126`).
7. Phần lớn mục sidebar Admin chỉ toast (PREVIEW:227-233). Ô "Search admin pages" không được nối; Admin không có lọc menu, favorites, đồng hồ, Help Center (PREVIEW:33-44, 194-220).
8. Admin Messages và Ticket box là trang độc lập: không sidebar, không chuông (PREVIEW:32).
9. Không phân quyền giữa `adm-1` (Support Lead) và `adm-2` (Support Agent).
10. Test: 10 + 4 test, mức logic. Không test `dashboard.js`, partial, nối sidebar và chuông.

### 3.7 Settings, khung, điều hướng

**Không làm gì, hoặc chỉ toast**
1. Mục sidebar không có trang (toast "That page is not part of this preview yet."):
   - Staff: Daily Audit, Community & Announcements, Requests, Residents, Vehicles, Parking Inventory, Parking Assignments, Access & Passes, Smart Map, Rules, Violations, Staff & Access, Calendar, Activity, Audit Log, Reports, Plan & Capacity.
   - Client (FRAME:23-29): Properties, Reports, People & Access, Vehicles, Parking, Requests, Violations, Calendar, Activity, Staff & Access, Billing & Plan, Recovery.
   - Resident: My Parking, Vehicles, Requests, Violations, Access & Passes, Payments, Documents, Community, Calendar, Activities, Updates, Feedback.
   - Admin: mọi mục trừ Messaging & Support, Support, Settings, Profile, Ticket box.
2. Mục "Dashboard" trên chính trang dashboard của Staff, Admin, Resident vẫn là `href="#"` nên bấm ra toast (PREVIEW:227-234, 582). Suy ra từ mã.
3. Toast "chưa có": "Plan management is not part of this preview yet." (EXTRAS:440); "Signing out is not part of this preview." (EXTRAS:627); trong PROTO có "(mock)", "(existing)", "Needs a new backend endpoint — not available yet" (PROTO:796), "Prototype only — nothing happens." (PROTO:802).
4. Nút trong bản chụp không tìm thấy handler: Staff "AI Work Assistant", "Open Property Hub", "Refresh"; Client "AI Operations Assistant", "Date range", "Rows per page", "Show options", "Capacity over limit – view details", "Open menu for Mallard Pointe at Riverbend", ô "Search properties by name"; Resident "Learn More", "Dismiss".
5. Nút capacity ở sidebar Resident đổi chữ thành "Manage vehicles" (FRAME:282-284) nên không khớp `wireLinks` (EXTRAS:438): không có handler. Suy ra từ mã.
6. Menu hồ sơ Staff: "My Social" và "Saved posts" cùng trỏ `/staff/social.html#/me` (PREVIEW:214).
7. Property filter của Client: lựa chọn không lưu, không đổi số liệu nào (`src/shared/js/property-filter.js:6, 73-80`).
8. Client Workspace: "Export portfolio data" chỉ toast (CW:220-222); "Single sign-on", "Recent activity", "Card on file" là dòng mẫu (CW:123, 146-148); văn bản chỉ tới "Staff & Access", "Recovery", "Billing & Plan" đều là `#`.
9. `src/index.html` không link tới Social, Tickets, Notifications, Settings, Documents, Capacity.

**Đã lưu nhưng không nơi nào đọc**
10. `eso-notif` của Staff/Client; `rn*` của Resident; `an*` của Admin.
11. Hai kho trạng thái tách rời: Settings > Availability ghi `eso-status` (PROTO:1082-1084); menu hồ sơ ghi `<portal>:status*` (EXTRAS:505-530). Không bên nào đọc bên kia, không bên nào được Messenger đọc. Danh sách thời hạn khác nhau (PROTO:1078 so với EXTRAS:484); giới hạn lời nhắn 280 (PROTO:1099), 100 (PROTO:1521), 80 (EXTRAS:609).
12. `eso-avatar`: ảnh chỉ hiện trong PROTO; header thật luôn hiện chữ viết tắt. Do shim, `eso-avatar`, `eso-status`, `eso-notif`, `eso-mfa`, `eso-sec`, `eso-sup` dùng chung giữa Staff, Resident, Admin.
13. Date and time: `tz, tzAuto, tzLoc, tfmt, dfmt, wstart` không tới trang thật; đồng hồ sidebar dùng múi giờ trình duyệt, 12 giờ `en-US` (EXTRAS:250-254).
14. Personalize của Staff: Layout, Menu style, Scrollbar, Menu search, Property switcher, Sidebar icons có lưu nhưng không nằm trong `ui-prefs` (STAFFJS:420-431).
15. Client: `cwName` ("Shown in the portal header", CW:59), `cwSocial, cwPromos, cwTickets, cwBotFirst`, mặc định parking, `cwMfa, cwSession, cwDomain, cwRetain…` không có nơi đọc ngoài CW.
16. `phone`, `contact` trong `eso-res-pref`: chỉ trang Settings đọc lại.
17. Nút theme ở header không lưu (PREVIEW:50-57).
18. Personalize không đồng bộ giữa các tab: không có listener `storage` cho `ui-prefs:*`.

**Không nhất quán**
19. Cỡ chữ: UI gắn "Default" cho 15 px (PROTO:746-748), `DEF.asize` là 14 và `lookCss` coi 14 là gốc.
20. Line spacing: nút "Default" là 1.5 (PROTO:724), gốc là 1.43 (`look-prefs.js:28`).
21. Sensitivity "High": chữ ghi 25% (PROTO:736), mã dùng 0.2 (`look-prefs.js:64`).
22. Số liệu mẫu Client lệch nhau: "1 of 2 properties" (STAFFJS:319, 398); "Parking 261 / 25", "Staff 18 / 3" (STAFFJS:376); `USAGE` 261/500 và 0/0 (CW:19-23).
23. Mặc định sáng/tối: Resident theo thiết bị (`prefs.js:16`; PREVIEW:618-621); Staff, Client, Admin luôn sáng.

**Mã chết hoặc không tới được**
24. `src/partials/settings-app.html` và `src/features/settings/resident.js`: không HTML nào nạp. Không còn mã sống nào ghi `theme, contrast, reduceMotion` vào `eso-res-pref`.
25. `hashForPath` (ROUTES:65-69): chỉ test dùng.
26. `src/staff/account-settings.html`, `src/client/account-settings.html`: chỉ còn là điểm chuyển hướng.
27. Nút `account`, `about` của cây PROTO bị loại (PROTO:528, 561, 951, 971); trang `acct()` không còn đường vào.
28. Biến không dùng trong FRAME: `icons` (FRAME:247-248, 339), `body` (FRAME:285, 292).
29. `cleanUrls` chỉ có ở máy chủ dev (`vite.config.ts:29-39`); bản build không có quy tắc viết lại URL.
30. Chú thích `src/shared/js/back-target.js:14` ghi portal là `'staff' | 'client' | 'resident'`, thiếu admin dù admin có dùng.

**Test**
31. `prefs.test.mjs` (4), `look-prefs.test.mjs` (6), `back-target.test.mjs` (6), `html-attributes.test.mjs` (3), `e2e-flows.test.mjs:191` (`exitTarget`). Không test nào import `preview.js`, `portal-frame.js`, `portal-frame-extras.js`, `property-filter.js`, `account-settings.staff.js`, `client-workspace.js`, phần UI của `dockey-settings.js`, shim ở PROTO:3, plugin trong `vite.config.ts`, `messaging/hub.js`, hay logic trong PROTO.

---

## 4. Câu hỏi cho chủ dự án

### 4.1 Messages và Ticket box
1. Admin có được gửi nhiều hơn một tin cho cùng một Resident không? Hiện sau tin đầu là bị khóa vĩnh viễn (MS:285, 288-291).
2. Resident nhận ghi chú của Admin rồi bấm "Ask the property team" thì mở phiên trợ lý mới, không gắn với ghi chú. Đúng ý chưa?
3. Emergency của Resident có phải tới Admin không? Hiện chỉ Staff thấy.
4. Client có được báo emergency không? Trong group và support thread thì sao?
5. Sau 180 giây chưa xác nhận: "SMS" gửi cho ai, và bước tiếp theo là gì? Hiện chỉ ghi một thẻ audit.
6. Thời hạn tự đóng 15 phút (trợ lý) và 12 giờ (chat với Staff) có đúng không? Chat đang chờ trong Queue không bao giờ tự đóng: có chủ ý không?
7. Giới hạn 2 thread chưa trả lời trong 24 giờ tính gộp Staff và Admin: đúng không? Hết 24 giờ mà Resident chưa trả lời thì thread cũ vẫn bị khóa: đúng không?
8. Staff có cần trả lại hoặc chuyển chat đã nhận cho người khác không? Staff khác có cần thấy chat đang do đồng nghiệp xử lý không?
9. Mọi Staff thấy toàn bộ Queue. Bản thật có chia theo property hay ca không?
10. Resident chat đã đóng thì không mở lại được (phải tạo ticket mới), trong khi Support và chat Staff+Client mở lại cùng số. Có chủ ý không?
11. Chấm điểm chỉ có Helpful / Not helpful, một lần, chỉ khi có Staff tham gia. Đủ chưa? Staff có cần thấy điểm ngay trong Messages không?
12. Chat Staff+Client: chỉ Staff bấm Resolve, ticket không có priority hay category. Client có cần tự đóng không?
13. Support: bất kỳ Admin nào cũng đổi được status, priority, assignee của ticket do Admin khác giữ; người yêu cầu không tự đóng được. Đúng ý chưa?
14. Tạo support từ "New" trong Messages không chọn được priority, category; tạo từ Ticket box thì có. Có cần thống nhất không?
15. Ticket box có cần điều khiển Status / Assign / Priority không, hay giữ ở Messages?
16. Resident ticket và ticket Staff+Client trong Ticket box chỉ đọc. Có cần trả lời ngay tại đó không?
17. Staff thấy (chỉ đọc) mọi resident ticket của Staff khác. Đúng phạm vi không?
18. Export là `.txt`, đính kèm chỉ ghi tên. Có cần định dạng khác không? "Copy link" kèm `?as=<id>`: bản thật link xử lý thế nào với người không có quyền?
19. Edit và Unsend trong 15 phút, không giữ nội dung cũ. Có cần lưu vết cho kiểm toán không?
20. Group: có cần đổi tên, xóa thành viên, quyền riêng cho người tạo không? Nhóm có được tồn tại với 2 người không?
21. Announcement: có cần sửa, thu hồi, hết hạn không? Staff có cần tab Announcements không?
22. Staff có cần tab riêng cho chat với Resident và chat do Admin mở không? Tab "Sent" của Admin có nên chứa announcement của Admin khác không?
23. Do not disturb chỉ có cho Resident và chỉ chặn announcement cùng outreach. Có mở rộng cho vai khác không, và có nối với Availability / Quiet hours trong Settings không?
24. Đính kèm: 4 tệp, 450 KB, ảnh và PDF/DOCX/TXT/CSV. Giới hạn thật là gì, và loại file có cần kiểm ở tầng dữ liệu không?
25. Trợ lý: sau hai lần không hiểu thì tự chuyển cho Staff (như chú thích) hay chỉ đề nghị (như mã)? Nội dung FAQ thật lấy từ đâu?
26. Messages có cần "Mark as unread" không?
27. Các công tắc Messages trong Settings (Enter để gửi, âm thanh, read receipts, typing, away reply, SMS emergency) có cần Messenger tuân theo không?

### 4.2 Social
1. Resident có được đăng bài không? Feed mẫu có bài của cư dân và guidelines nhắc "one post per item per week" (SS:34), nhưng mã cấm.
2. Tab "Community & Announcements" phải chứa gì ở mỗi phía?
3. Bài có `src:'ann'` mà không có `ann` có phải announcement với Resident không?
4. Poll có nằm trong phạm vi không? Ai tạo, ai bỏ phiếu?
5. Lượt xem được đếm thế nào, và Resident có thấy không?
6. Có luồng Report không? Ai report, report bài hay comment, hàng chờ lấy từ đâu?
7. Staff có được gỡ bài của người khác không? Có violation trên bài không?
8. Khi pause, Resident vẫn đọc được Social (như chữ ở SM:23) hay bị chặn hoàn toàn (như mã)?
9. Khi pause, Resident có được follow, xóa comment của mình, xem trang Violations không?
10. Strike có hết hạn theo thời gian không?
11. Tài khoản đang review có được nhận thêm Ban không? Strike thứ 4 xử lý ra sao?
12. Hạ `limit` làm tài khoản đủ strike bị đóng ngay. Có đúng ý, và có cần báo Resident không?
13. Gỡ comment thường: Resident có cần được báo và biết lý do không?
14. Warning có giới hạn số lần hay tự thành strike sau N lần không?
15. Unban có nên bỏ luôn bước Resume và đọc lại guidelines không? Strike có nên được xóa khi Unban không?
16. Có cần từ cấm, kiểm duyệt tự động, giới hạn tần suất, thời hạn sửa bài và comment không?
17. Quiet hours 10 PM – 7 AM trong guidelines (SS:35) có cần mã thực thi không?
18. Mọi persona Staff dùng chung `"me"`. Staff A có được sửa, xóa, ghim bài của Staff B không? Resident thấy tên từng nhân viên hay "Property team"?
19. Giới hạn 3 bài ghim tính cho cả property, từng Staff, hay theo audience?
20. "Dana Whitfield" là Client hay Staff? "Priya Shah" (feed) và "Priya Nair" (`res-2`) có phải một người không?
21. Comment mẫu ghi dưới `alex` hiện "You" cho `res-1` nhưng không sửa, xóa được. Chấp nhận không?
22. Staff có cần mute theo người và từ khóa ngay trong Social không? Bộ mute mặc định là dữ liệu mẫu hay hành vi mong muốn? Mute có nên áp vào rail và chuông không?
23. Follow dùng để làm gì ngoài tab "Following"? Có thông báo khi người mình follow đăng bài không?
24. Share "to your profile" có ai khác thấy không, khi không xem được hồ sơ người khác?
25. Có cần hồ sơ của người khác không? "Copy link to your profile" nên dẫn tới đâu?
26. "Staff card" hiển thị ở đâu phía Resident? Trạng thái Show/Hide có cần lưu không?
27. Saved có cần đồng bộ như dữ liệu thật không?
28. Violation và warning có cần xuất hiện ở trang Notifications và chuông ngoài Social không?
29. Trạng thái đã đọc của Staff ở chuông Social và trang Notifications có cần thống nhất không?
30. Alert "also replied" chỉ tính sau khi Resident đã comment. Bài đã react hoặc share có tính không? Có alert khi ai đó react comment của mình không?
31. Khi Staff xóa bài, dữ liệu của Resident ở key riêng có cần dọn không? Lịch sử violation trỏ tới bài đã xóa hiển thị ra sao?
32. Privacy mode ghi log: ai được xem? Có áp dụng cho Staff không?
33. Cổng guidelines chỉ chặn ở UI. Bản thật có cần chặn ở tầng dữ liệu không? Staff có phải chấp nhận guidelines không?
34. Khi Resident ẩn Social, có còn nhận thông báo Social không?

### 4.3 Notifications
1. Bấm thông báo tin nhắn hoặc Social có cần mở đúng cuộc chat, bài, comment không?
2. Bấm mục tin nhắn trong chuông có phải đánh dấu đã đọc cả cuộc chat như trang Notifications không?
3. Các mục Requests, Violations, Parking, Reports, Billing, Residents sẽ dẫn tới trang nào?
4. Mục "plan" của Client nên dẫn tới Workspace (hiện tại), Usage > Capacity, hay Billing & Plan?
5. Con số chuông chuẩn là số cố định (109 / 7 / 33) hay số thực sau khi ghép dữ liệu live?
6. Công tắc trong Notification settings có phải lọc danh sách và số trên chuông không?
7. Publish một promotion, tài liệu sắp hết hạn, hay vượt capacity có phải tạo thông báo không?
8. Admin có cần đích riêng cho Ticket box không?
9. Có cần xóa hoặc lưu trữ thông báo, và giữ bao lâu (hiện 3 ngày với tin nhắn, 7 ngày với Social)?

### 4.4 Promotions
1. Claim của Resident có phải vào hộp Claims của Staff và trừ tồn kho không?
2. Quy trình redeem mong muốn là gì: ai xác nhận, Resident thấy những trạng thái nào?
3. Giới hạn theo "unit" có cần áp dụng không? Persona nào cùng unit?
4. Giờ bắt đầu, kết thúc có hiệu lực không, theo múi giờ nào?
5. Staff cần "End now", "Pause", "Delete" hay chỉ dựa vào ngày kết thúc và lưu về draft?
6. Promotion đã claim nhưng bị ẩn hoặc hết hạn: Resident còn thấy mã đã nhận không?
7. QR có cần ảnh QR thật không? Mã unique có cần ngẫu nhiên và kiểm trùng phía máy chủ không?
8. Kênh Email, SMS có ý nghĩa gì trong preview?
9. Deal mẫu của Staff có cần hiện ở trang Resident không?
10. Tắt `promoShow` thì có ẩn mục menu Resident không?
11. "Resident view" trong PROTO và trang Resident thật: giữ cả hai hay gộp một?

### 4.5 Documents và Capacity
1. Documents có cần lưu, xem, tải file thật trong preview không?
2. Có cần thư mục, đổi tên, sửa metadata, thay phiên bản, link chia sẻ không?
3. "Admins only" và "Whole team" có phải thực thi theo persona không? `cli-2` là admin hay thành viên?
4. Trang Documents có theo `?as=` không? Danh sách dùng chung cả công ty hay theo người?
5. W-9: sau khi mở khóa người dùng làm được gì? Ai được mở? Có cần PIN ở trang Documents không?
6. Giới hạn 10 MB mỗi file, 10 GB gói, "9,4 GB đang dùng" có đúng theo sản phẩm thật không?
7. Tài liệu hết hạn có bị chặn dùng hay chỉ nhắc?
8. Capacity: tính tiền ngay và prorate, hay từ kỳ sau? Có hiển thị thuế không?
9. Có cho giảm hoặc hủy add-on không? Ai được mua?
10. Trang "Billing & Plan" có nằm trong preview không, và phải hiển thị gì sau khi mua?
11. Trần `max` (5000, 5000, 200, 20 block) là theo mỗi lần mua hay tổng?
12. Số liệu nào đúng: Parking 261 / 25 hay 261 / 500; Staff 18 / 3 hay 0 / 0; Properties 1 hay 1 / 2?
13. Sidebar có cần cập nhật ngay sau Confirm không?

### 4.6 Admin Command Center
1. "Platform at a glance", "Platform health", "Recent activity" sẽ lấy dữ liệu thật từ đâu? Có cần link hoặc hành động không?
2. "32 warnings" hay 8 mục? "$19 monthly revenue" có khớp các gói của Client không?
3. Admin có cần thao tác ngay trên dashboard (nhận ticket, gán người, xác nhận emergency) không?
4. Khi có nhiều emergency, cần danh sách hay chỉ mở cái cũ nhất?
5. Có cần bộ lọc và nút Refresh thủ công không?
6. Số dòng 6 và 5 có đúng ý không? "Resolved this week" là 7 ngày trượt hay tuần lịch?
7. Mục sidebar Admin nào phải có trang trong preview? Admin có cần tìm kiếm ở header, lọc menu, favorites, đồng hồ, Help Center, Status không?
8. Admin Messages và Ticket box có nên nằm trong khung Admin như Notifications và Settings không?
9. `adm-2` (Support Agent) có được xem và làm cùng những việc như `adm-1` (Support Lead) không?

### 4.7 Settings, khung, điều hướng
1. Trạng thái (Available, Busy, DND…) nên có một nguồn duy nhất không? Danh sách thời hạn và giới hạn lời nhắn (80, 100, 280) theo bên nào?
2. Ảnh đại diện tải lên có cần hiện ở header, Messages, Social không? Staff, Resident, Admin có được dùng chung một ảnh như hiện tại không?
3. Personalize lưu theo portal hay theo từng người? Hiện Jordan và Sam dùng chung `ui-prefs:staff`.
4. Thay đổi Personalize có cần cập nhật ngay ở tab khác đang mở không?
5. Nút sáng/tối ở header có cần ghi nhớ không? Khi URL có `?dark` thì theme đã lưu có nên bị bỏ qua không?
6. Mặc định theme của Resident theo thiết bị, còn ba portal kia là sáng. Có chủ ý không?
7. Cỡ chữ mặc định 14 hay 15 px? Line spacing 1.43 hay 1.5? Sensitivity "High" 20% hay 25%?
8. Các tùy chọn sidebar của Staff (Layout, Menu style, Scrollbar, Menu search, Property switcher, Sidebar icons) có cần tác động lên sidebar thật không, hay bỏ như ở ba portal kia?
9. Múi giờ, định dạng 24 giờ, định dạng ngày, ngày đầu tuần có cần áp cho đồng hồ sidebar và thời gian trong Messages, Notifications không?
10. Help Center của Staff nên dùng Ticket box như Client, hay giữ danh sách riêng (`eso-sup`)? "Escalate to property team" và "AI Work Assistant" dẫn tới đâu?
11. Resident bấm Help Center thì mở Ticket box. Đúng ý chưa?
12. Bấm "Dashboard" khi đang ở Dashboard nên làm gì?
13. Client Workspace: Company name, Resident experience, mặc định Parking, Security, Data retention có cần tác động lên các trang khác không, hay chỉ để trình bày?
14. Menu hồ sơ Staff: "Saved posts" cần đích riêng không?
15. Trang đầu `index.html` có cần thành bộ chọn portal và persona đầy đủ, kèm nút reset dữ liệu demo chung không?
16. Bản build có cần chạy được với URL không đuôi trên máy chủ thật không?
17. `src/features/settings/resident.js` và `src/partials/settings-app.html` được giữ lại có chủ ý, hay đã bị thay hẳn?
18. Property filter của Client phải lọc những số liệu nào, và lựa chọn có cần giữ giữa các trang không?
19. "View as Manager / Staff (read-only)" là công cụ demo hay phản ánh phân quyền thật theo persona?
20. Các nút trong bản chụp chưa có hành vi ("AI Work Assistant", "Open Property Hub", "Refresh", "Date range", "Learn More", "Dismiss", "Request Spot"…) nên báo "chưa có trong bản xem thử" hay giữ im lặng?
