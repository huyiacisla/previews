# Messages cho 4 portal: thiết kế và cách hoạt động

Trang Messages riêng cho Resident, Staff, Client, Admin, dùng chung **một lớp kết nối** (store + transport). Giao diện tiếng Anh, tài liệu tiếng Việt.

## Trang và cách vào

| Trang | URL |
|---|---|
| Hub (sơ đồ, mở từng portal, đặt lại dữ liệu) | `/messages/index.html` |
| Resident | `/resident/messages.html` |
| Staff | `/staff/messages.html` |
| Client | `/client/messages.html` |
| Admin (Messaging & Support) | `/admin/messages.html` |

- Trong sidebar của 4 dashboard, mục **Messages** (Admin: **Messaging & Support**) là link thật tới trang riêng. Dashboard là bản chụp nên **HTML gốc không bị sửa**; `src/preview.js` nối lại `href` của đúng mục đó (các mục khác vẫn là `#`).
- **Nút Back** (đầu trang): quay về đúng dashboard bằng `history.back()` (nếu trang trước cùng origin) hoặc đi tới dashboard của portal (mở thẳng bằng URL). `preview.js` còn nhớ và khôi phục vị trí cuộn của dashboard khi quay lại.
- Trên điện thoại (<1024px) danh sách và khung chat là hai màn, mở một cuộc dùng `history.pushState` (`#/c/<id>`): Back đi **chat → danh sách → dashboard**. Desktop hiện hai khung cùng lúc.
- Đổi người xem trong cùng vai trò bằng `?as=<id>` (ví dụ `?as=stf-2`), chế độ tối bằng `?dark`. Hộp **Preview tools** (nút trên đầu trang) đổi người, mở portal khác, giả lập mất kết nối, đặt lại dữ liệu.

## Ai nhắn được ai (thực thi trong `store.js`, UI chỉ ẩn lựa chọn)

| Vai trò | Nhắn được | Ghi chú |
|---|---|---|
| Resident | Staff | Không tự mở cuộc: vào là **trợ lý (bot) hỏi trước**. Không nhắn Client hay Admin. Tin từ Admin gửi tới resident là một chiều. |
| Staff | Resident, Client, Support (Admin) | Nhận resident từ hàng chờ. Tin chủ động tới resident là ghi chú một chiều. |
| Client | Staff, Support (Admin) | Chat thường với Staff; yêu cầu tới Support có trạng thái. |
| Admin | Staff, Admin, Resident, Client, mọi người | Là **support agent** với Staff và Client. Thông báo chung (announcement) là một chiều. |

## Cuộc chat của Resident (không làm phiền)

`bot → queued → active → closed`

1. **bot**: chỉ resident và trợ lý. **Staff không thấy, không bị báo.** Trợ lý đưa chủ đề bằng nút trả lời nhanh, trả lời FAQ mẫu, hỏi "Did that answer your question?". Giải quyết được thì đóng luôn, Staff không biết.
2. **queued**: resident chọn "Talk to a person" (hoặc 2 câu không hiểu). Trợ lý tạo **thẻ tóm tắt** (chủ đề, câu đã hỏi, chi tiết đã gõ) để Staff không hỏi lại; cuộc vào hàng chờ của Staff.
3. **active**: một Staff bấm **Take conversation** **hoặc gõ trả lời ngay trong cuộc đang chờ** (câu trả lời đầu tiên tự nhận cuộc: `postCheck` trả `takes: true`, `send` gọi `takeChat` rồi đăng tin trong cùng một lần ghi, nên vẫn chỉ một người thắng). Resident được báo một lần khi họ vào ("… joined the chat"). Chuyển tiếp (Forward) vào một cuộc đang chờ bị chặn để không vô tình nhận hộ cuộc của người khác.
4. **closed**: Staff **Resolve** (bấm 2 lần để xác nhận) hoặc resident **End chat**. Có thể đánh giá Helpful / Not helpful. Lần sau mở Messages bắt đầu lại với trợ lý.
- Tự đóng khi im lặng: chat bot sau 15 phút, chat Staff sau 12 giờ (`CONFIG` trong `store.js`).
- Chỉ báo chưa đọc cho Staff **không** tính tin của trợ lý và các lần bấm trả lời nhanh (`notifies()` trong `store.js`); resident được báo về tin của trợ lý, khi Staff vào và khi đóng.
- Tin chủ động tới resident: chỉ **1 tin** cho tới khi họ trả lời, tối đa **2 cuộc chủ động chưa trả lời** mỗi 24 giờ từ bất kỳ ai. Resident có **Do not disturb** (im lặng ghi chú và announcement, không im lặng chat đang diễn ra với Staff).

## Support (Staff/Client ↔ Admin) và thông báo chung

- Thread Support: `open / pending / resolved`. Admin trả lời lần đầu thì tự nhận và chuyển `pending`; người hỏi trả lời thì về `open`; trả lời sau `resolved` thì mở lại. Admin đặt trạng thái, mức ưu tiên, người phụ trách; có câu trả lời mẫu.
- Announcement: chỉ Admin, gửi tới mọi người hoặc nhóm chọn, một chiều (không có ô trả lời).

## Nhóm (Staff ↔ Client)

- Chỉ **Staff hoặc Admin** tạo nhóm (New → Group); thành viên là Staff, Client, Admin; **không có Resident**. Tối thiểu **3 người** (kể cả người tạo), tối đa 12; thiếu hoặc thừa thì store từ chối. Số người hiển thị luôn lấy từ danh sách thành viên thật ("3 people").
- Hộp **Members** (bấm tiêu đề nhóm): xem từng người, ai đang online, thêm người (tới 12; chỉ Staff/Admin trong nhóm được thêm), rời nhóm. Người rời không còn thấy nhóm; khi chỉ còn 2 người thì không ai rời được nữa (nhóm không tự biến thành chat 1-1).
- Tin trong nhóm hiện tên người gửi; mốc đã đọc là **"Seen by <tên>"** khi một phần thành viên đã đọc, **"Seen by everyone"** khi tất cả đã đọc (`delivery: 'partial'` trong `store.get()`).

## Tính năng chat

- **Bấm vào tin (hoặc rê chuột trên máy tính) để hiện giờ, trạng thái và các nút hành động**; mặc định ẩn để bong bóng gọn. Thanh chỉ có **React, Reply, Forward** và nút ba chấm **More actions**; menu ba chấm có **Copy text, Edit message, Unsend for everyone, Delete for me** (Esc đóng, mũi tên chọn). Edit và Unsend chỉ trong 15 phút nhưng **luôn hiện**: quá hạn thì mờ đi (lý do "Only within 15 minutes of sending" hiện khi rê chuột, không in thành dòng chữ trong menu) để không ai tưởng là thiếu chức năng. Con số 15 phút là hằng số tuỳ chọn `editMs`/`unsendMs`, chưa được duyệt: đổi hoặc bỏ giới hạn thì sửa một dòng. **Delete for me** (`store.hideMessage`, lưu trong `prefs.hidden`) ẩn tin khỏi góc nhìn của riêng bạn, không giới hạn thời gian; người khác vẫn thấy.
- **Forward**: gửi bản sao tin (kèm tệp) vào một cuộc trò chuyện khác mà bạn được nhắn (`store.forward`, `forwardTargets`); tin đến có nhãn "Forwarded". Resident không chuyển tiếp; thông báo chung, cuộc đã đóng, tin đã thu hồi và tin của trợ lý không chuyển tiếp được. Hiện bằng `data-reveal` trên từng tin, không dựng lại danh sách. Tin cuối của mình luôn hiện trạng thái gửi.
- **Emoji** (bảng gọn rộng cố định 320px, 8 cột đều nhau, hàng tab danh mục có gạch chân; không giãn hết chiều ngang): bộ riêng trong `src/messaging/emoji.js` (ký tự Unicode chuẩn, không chép tài nguyên của trang nào), có tìm kiếm, nhóm theo chủ đề, mục gần đây (lưu cục bộ), 6 phản ứng nhanh. Phản ứng hiện thành chip dưới tin, bấm để thêm/bỏ.
- **Đính kèm**: tối đa 4 tệp/tin; ảnh được thu nhỏ trong trình duyệt (cạnh dài ≤1280px, JPEG) và tệp ≤450 KB sau xử lý; PDF/TXT/CSV nhận nguyên bản. Kéo-thả, dán ảnh và nút kẹp giấy đều dùng được; bấm ảnh mở xem lớn (lightbox). Chỉ nhận `data:` URL, ảnh phải là `data:image/`.
- **Sửa tin** (nút bút chì, chỉ tin chữ của mình, trong 15 phút, `CONFIG.editMs`): ô soạn chuyển sang chế độ "Editing message" (nút Save, Esc hoặc dấu x để hủy và trả lại bản nháp cũ). Cả hai bên thấy nhãn **Edited**; bản cũ không được giữ. Tin của trợ lý, tin chọn nhanh, tin chỉ có tệp và tin đã thu hồi không sửa được.
- **Ghim, đánh dấu quan trọng, tắt tiếng** (menu ba chấm ở góc phải đầu cuộc trò chuyện, và nút ba chấm hiện khi rê chuột/focus trên từng hàng danh sách; mỗi người một riêng, lưu trong `prefs`). Trạng thái hiện bằng **biểu tượng nhỏ, không chữ**, dưới tiêu đề và trên hàng danh sách: **cờ đỏ** = Important (`important`), **ghim** = Pinned, **chuông gạch chéo** = Muted. Chưa bật thì không hiện gì (không có cờ trống). Cuộc ghim nổi lên đầu danh sách; cuộc tắt tiếng không cộng vào số chưa đọc trên tab/badge nhưng vẫn hiện số trên hàng của nó.
- **Đầu cuộc trò chuyện** là lưới 3 cột (mobile) hoặc 4 cột (≥640px): ảnh đại diện | tiêu đề + dấu trạng thái + người tham gia | (nút hành động như Take, Resolve) | số người + ba chấm. Nút hành động xuống hàng riêng trên mobile; nhóm nút phải luôn nằm góc phải trên cùng, menu không bị cắt mép.
- **Thao tác không đảo ngược** theo web-design-guidelines: **Unsend** hỏi lại một lần ("Tap again to unsend", tự hủy sau 4 giây); **Delete for me** có thông báo **Undo** (`store.unhideMessage`).
- **Phản ứng emoji** nằm dưới bong bóng nhưng ảnh đại diện vẫn căn đáy bong bóng (không tụt xuống theo hàng phản ứng). Trên mobile thanh nút của tin nằm **dưới** bong bóng (không ép bong bóng hẹp).
- **Tìm trong nội dung tin**: gõ từ 2 ký tự trở lên vào ô tìm, khối "Messages (n)" hiện các tin khớp (mới nhất trước, tối đa 30, từ khóa được tô). Bấm một kết quả mở cuộc trò chuyện, cuộn tới tin đó và nháy nền. Chỉ tìm trong cuộc người dùng được thấy; bỏ qua tin đã thu hồi, tin hệ thống và, với Staff, tin của trợ lý.
- **Bố cục ô soạn trên mobile**: ô nhập chiếm cả một hàng, các nút đính kèm/emoji/Send nằm hàng dưới (trước đây ô nhập bị ép còn vài chục px).
- **Trả lời trích dẫn** (Reply), **thu hồi tin** trong 15 phút (người nhận thấy "This message was removed"), liên kết tự nhận dạng (mở tab mới, `rel="noopener noreferrer"`).
- **Đang nhập / Online**: chỉ người trong cuộc trò chuyện thấy "<tên> is typing…" (hết hạn sau 5 giây) và huy hiệu Online (45 giây không tín hiệu thì tắt).

## Nút Back

- Desktop (≥1024px): danh sách luôn hiện cạnh cuộc trò chuyện, Back về dashboard (hoặc trang trước cùng portal).
- Mobile: danh sách và cuộc trò chuyện là hai màn. Mở cuộc từ danh sách thêm một mục lịch sử; chuyển giữa các cuộc (kết quả tìm, nút View sau Forward) thì thay mục, không thêm. **Back từ một cuộc luôn về danh sách trước**, kể cả khi trang mở thẳng vào cuộc (liên kết, tải lại, không có mục lịch sử của mình); nhãn nút là "Messages", rồi mới "Dashboard". Chạm Back hai lần nhanh chỉ tính một lần, không văng ra dashboard. Resident vào thẳng trợ lý nên Back thoát luôn.

## Ngăn kéo menu trên dashboard (mobile/tablet)

Nút "Open navigation" của 4 dashboard mở sidebar có sẵn dưới dạng ngăn kéo (dưới 1024px): đóng bằng nền mờ, Esc, chọn một mục, hoặc khi màn hình rộng ra; trả focus về nút. Các nhóm thu gọn trong sidebar (Communication, Operations…) cũng được nối lại trong `preview.js`. Menu Theme / thông báo / hồ sơ vẫn là bản chụp tĩnh (chỉ nút Theme đổi sáng/tối).

## Kết nối

`src/messaging/transport.js`: một tài liệu trạng thái dùng chung, lưu trong `localStorage`, đồng bộ giữa các tab cùng trình duyệt bằng `BroadcastChannel` (dự phòng: sự kiện `storage`). Ghi theo **compare-and-set** trên `rev`, nên hai tab ghi cùng lúc không đè mất tin. `store.js` không biết gì về nơi lưu: muốn nối app thật, thay `transport.js` bằng bản có cùng bốn hàm (`read`, `update`, `onChange`, `info`) gọi WebSocket/API.

## Tệp

```
src/messaging/   store.js, transport.js, bot.js, personas.js, format.js, emoji.js (lõi, không chạm DOM)
                 app.js, boot.js, hub.js (giao diện)
src/partials/messages-app.html   khung + mọi <template> (nơi duy nhất chứa class Tailwind)
src/{resident,staff,client,admin}/messages.html, src/messages/index.html
tests/messaging.test.mjs         42 test cho lõi: npm test
```

## Quyết định thiết kế

- **Markup nằm trong HTML, không trong JS.** `ui-tokens.css` chỉ sinh class Tailwind cho file `.html` dưới `src/` (`@source "./**/*.html"`); JS chỉ clone `<template>`, điền chữ, bật tắt `data-*` và `hidden`. (SVG không có thuộc tính `.hidden`: dùng `removeAttribute('hidden')`.)
- Theo DESIGN.md: chỉ token có tên, thang chữ 11–24px, không in hoa, bo góc ≤14px, trạng thái bằng cặp Tonal, **One Beacon** (nút Send là khối xanh đặc duy nhất trong vùng soạn; bong bóng của mình dùng `bg-accent`), badge xanh đặc chỉ cho số chưa đọc. Đã quét: không mã hex thô, không giá trị tùy ý cho chữ/khoảng cách/bo góc.
- DESIGN.md **không có spec chat** (bong bóng, avatar, composer, hàng cuộc hội thoại): suy ra từ token chung; dùng lại `conversation-selected` có sẵn cho hàng đang chọn.
- `ui-tokens.css` có `.dark body { background: initial }` nên **nền đặt trên `<body>` mất ở chế độ tối**; các trang Messages và hub tự tô nền ở khung bọc.
- Trợ lý chỉ hiện lựa chọn của lượt hiện tại; chọn xong thì thu gọn (lựa chọn đã hiện thành tin của người dùng).
- Gửi lạc quan (Sending → Sent → Read), lỗi có Retry/Discard và không trùng tin (`clientId`), bản nháp giữ theo cuộc, mốc "New messages", nút "N new messages" khi đang cuộn lên, `aria-live` cho tin mới, điều hướng bằng bàn phím (mũi tên trong danh sách, `/` để tìm), vùng chạm 44px trên cảm ứng.

## Ngoại lệ so với BRIEF.md

BRIEF cấm thêm JS ngoài `preview.js`. Messages "hoạt động thật" cần JS, nên có hai ngoại lệ có chủ đích: thư mục `src/messaging/` (không thư viện ngoài) và đoạn nối link Messages + khôi phục cuộn trong `preview.js`. Cùng lý do với `account-settings.quality.js`.

## Theo checklist PDF (khẩn cấp, vòng đời ticket, audit, tìm kiếm, ngoại tuyến)

Bảng đối chiếu từng mục nằm ở `docs/checklist-conformance.md`. Tóm tắt các tính năng thêm từ checklist:

- **Khẩn cấp**: nút cảnh báo trong ô soạn (Resident, Staff, Admin). Tin khẩn cấp có viền đỏ, nền đỏ nhạt, nhấp nháy tới khi có người xác nhận. Resident báo khẩn thì bỏ qua trợ lý và vào hàng chờ ngay, xếp đầu danh sách. Staff/Admin thấy banner đỏ trên cùng (`role="alert"`) với nút **Acknowledge**. Vượt qua Do Not Disturb, tắt tiếng và giới hạn "một ghi chú tới khi trả lời". Sau 180 giây chưa xác nhận: thẻ audit "SMS and critical alert sent (simulated)" (`CONFIG.emergencySmsMs`, xử lý trong `tick()`).
- **Vòng đời ticket**: Open → In progress → Waiting on resident → Resolved → Closed (`ticketStage`, `setTicketState`). Resident trả lời thì tự về In progress.
- **Thẻ audit** (`audit()` trong `store.js`): "Status: Open → In progress", người thực hiện kèm ID, giờ ISO UTC. Có cho trạng thái ticket, ưu tiên, người phụ trách, trạng thái support, xác nhận khẩn cấp, leo thang. Không hiện làm xem trước trong danh sách, không tính chưa đọc, không ẩn hay sửa được.
- **Thông báo**: người gửi/Admin thấy "% read (x of y)" và tên người chưa đọc (`get().ack`).
- **Tìm kiếm có cấu trúc** (`src/messaging/query.js`): `unit:`, `status:`, `priority:`, `assignee:`, `tag:`, `after:`, `before:`, cụm trong ngoặc kép; nút "+ unit"… và chip bỏ từng bộ lọc. Ctrl/Cmd+K tới ô tìm, Alt+N mở thread chưa đọc kế tiếp (khẩn cấp, quan trọng, mới nhất), Esc đóng menu.
- **Ngoại tuyến**: tin gửi khi mất mạng nằm trong thread mờ 50% kèm đồng hồ, lưu trong `localStorage` (thay IndexedDB), tự gửi lại theo 1, 2, 4, 8, 16, 30 giây và gửi ngay khi mạng về.
- **Panel chi tiết cột 3** (`store.contextFor`, `renderContext` trong `app.js`): Staff/Admin thấy hồ sơ resident, căn hộ, hợp đồng, công nợ, ghi chú vào nhà, 5 ticket gần nhất và hành động nhanh; cuộc khác thì hiện người tham gia. Từ 1280px là cột thứ ba (`#view-app[data-context=open]`), hẹp hơn là ngăn kéo bên phải; mặc định mở trên màn rộng, nhớ lựa chọn, Esc đóng. Dữ liệu hợp đồng/công nợ là dữ liệu mẫu trong `personas.js`.
- **Màu vai trò** bằng token (Resident xám, Staff hổ phách, Admin xanh chàm, Client lục), **bottom sheet** cho hộp thoại dưới 640px, **chế độ tương phản cao** (Preview tools hoặc `?contrast`), ảnh nén 1920px WebP ~300KB.

## Ticket box (nhóm Services của sidebar)

Nơi lưu mọi cuộc hội thoại đã trở thành ticket, kể cả sau khi đóng, để đọc lại, tìm và xuất.

- **Lối vào**: mục **Ticket box** (kèm số ticket đang mở) là mục cuối của nhóm **Services** trong sidebar 4 dashboard (`src/preview.js`). Staff đã có nhóm Services (sau Audit Log); Client, Admin và Resident chưa có nên preview **tạo nhóm Services mới** (nhân bản một nhóm sẵn có, đặt trước nhóm cuối) chỉ chứa Ticket box. Mở `/<portal>/tickets.html`. Trong Messages, cuộc đã đóng hiện dòng "Saved as T-… in the Ticket box" kèm nút mở.
- **Cái gì là ticket**: chat resident đã tới đội (có `queuedAt`) và mọi thread Support. Chat chỉ do trợ lý trả lời không thành ticket. Số hiệu liên tiếp `T-1081`, `T-1082`… (`conv.ticketNo`, bộ đếm `ticketSeq`), được cấp lúc vào hàng chờ hoặc lúc tạo yêu cầu Support.
- **Ai thấy gì** (`store._ticketAccess`, chỉ đọc): Resident thấy ticket của mình; Staff thấy mọi ticket resident và Support do mình gửi; Admin thấy mọi Support; Client thấy Support của mình. Staff đọc được ticket đã đóng của đồng nghiệp (kho lưu của đội), Admin không thấy ticket resident.
- **Trang**: danh sách bên trái (tab Open / Closed / All có số, ô tìm hỗ trợ cú pháp `unit:`, `status:`, `priority:`, `assignee:`, `tag:`, `after:`, `before:` và tìm cả trong nội dung hội thoại), bản ghi bên phải: số ticket, trạng thái, người yêu cầu, căn hộ, người phụ trách, thời điểm mở/đóng, thời gian xử lý, đánh giá, ưu tiên, rồi toàn bộ hội thoại **chỉ đọc** theo dạng bản ghi (không phải bong bóng chat): tên, vai trò, giờ, nội dung, tệp đính kèm tải về được, ghi chú hệ thống và thẻ audit.
- **Hành động**: **Export** (tải `T-xxxx.txt` gồm thông tin ticket, người xuất, từng tin và từng thẻ audit giờ ISO), **Copy link**, **Open in Messages** (với ticket còn mở và bạn có quyền xem cuộc).
- **API trong `store.js`**: `ticketBox(userId, query)`, `ticketCounts(userId)`, `ticketRecord(userId, convId)`.
- Mobile: danh sách và bản ghi là hai màn, Back về danh sách trước (cùng quy tắc với Messages).

## Kiểm thử

- `npm test` chạy 54 test: 42 test nghiệp vụ (`tests/messaging.test.mjs`), 11 test theo checklist (`tests/checklist.test.mjs`) và **1 test ngẫu nhiên** (`tests/fuzz.test.mjs`): hàng nghìn thao tác ngẫu nhiên của 9 người (gửi, nhận cuộc, nhóm, sửa, thu hồi, forward, ghim…) rồi kiểm các luật không được vỡ (ai thấy gì, nhóm 2–12 người chỉ Staff/Client/Admin, resident chỉ với Staff/Admin, tin đã thu hồi không còn chữ/tệp/phản ứng, số chưa đọc không âm, trạng thái cuộc resident hợp lệ, danh sách và `get` khớp nhau). Chạy lại một ca lỗi: đặt `SEED=<số>`. Đã chạy một lần 40 hạt giống × 1200 bước, không lỗi.
- **Nội dung dài**: một từ dài 180 ký tự không dấu cách làm bong bóng rộng gần 3000px và tràn ra ngoài màn hình (mất phần đầu tin). Đã sửa bằng `wrap-anywhere` (`overflow-wrap: anywhere`) cho bong bóng và kết quả tìm kiếm; `break-words` không đủ vì không giảm độ rộng tối thiểu của phần tử. Đã thử lại ở 375px và 1440px, kể cả tin trả lời có trích dẫn.
- Quét trình duyệt (làm tay, không nằm trong `npm test`): 4 portal × 375/768/1280px × sáng/tối, mở từng cuộc trò chuyện, menu ba chấm của tin và của cuộc, bảng emoji; tìm tràn ngang, nút ra ngoài màn hình, nút không tên, lỗi JS. Lần quét này tìm ra menu của tin tràn ra ngoài màn hình (đã sửa: menu căn theo nút rồi kẹp trong vùng tin) và thanh tab bị cắt trên mobile (đã sửa: tab xuống hàng).

## Phạm vi demo: logic tính năng nằm ở frontend (đã chốt)

Đã thống nhất: để **đủ demo**, mọi logic tính năng chạy ở FE (`src/messaging/store.js`, thuần JS, có test). Không có server. Khi port sang app thật, đây là phần phải chuyển sang backend:

| Việc | Hiện ở FE | App thật cần |
|---|---|---|
| Lưu và đồng bộ | `transport.js`: `localStorage` + `BroadcastChannel` (chỉ cùng máy, cùng trình duyệt) | API + WebSocket/SSE; giữ cùng 4 hàm `read/update/onChange/info` |
| Quyền nhắn, máy trạng thái resident, quy tắc nhóm, giới hạn chủ động | `store.js` (`CAN_MESSAGE`, `postCheck`, `act`) | Kiểm lại phía server; FE chỉ ẩn lựa chọn |
| Trợ lý (bot) | `bot.js` kịch bản có sẵn | Dịch vụ trợ lý thật (FAQ, chuyển người) |
| Tệp đính kèm | Ảnh thu nhỏ trong trình duyệt, lưu dạng `data:` URL trong `localStorage` | Upload lên storage, quét virus, giới hạn dung lượng thật |
| Online, đang nhập | Tín hiệu tạm trong `transport.live` | Presence qua WebSocket |
| Ghim, tắt tiếng, đã đọc, sửa, thu hồi, forward, tìm kiếm | `store.js` (`toggleFlag`, `markRead`, `edit`, `unsend`, `forward`, `hideMessage`, `unhideMessage`, `search`) | Endpoint tương ứng; tìm kiếm cần chỉ mục phía server |
| Danh tính | `personas.js` (`?as=<id>`) | Đăng nhập và phiên thật |
| Thông báo | Tiêu đề tab `(n)`, toast | Thông báo đẩy, email |

Quy ước khi thêm tính năng: viết logic và luật trong `store.js` kèm test trong `tests/messaging.test.mjs`; `app.js` chỉ vẽ và gọi `store`; không ghép class Tailwind trong JS (class nằm trong `<template>` ở `partials/messages-app.html`). Phần lệch so với BRIEF.md (có JS) đã nêu ở mục "Ngoại lệ".

## Hạn chế

- **Không có backend.** Dữ liệu nằm trong trình duyệt, đồng bộ giữa các tab cùng máy và cùng origin; không phải thời gian thực giữa các thiết bị.
- Trợ lý là kịch bản có sẵn, không phải AI; nội dung FAQ là mẫu, cần đội vận hành thay bằng nội dung thật.
- Tệp đính kèm lưu nguyên trong `localStorage` (giới hạn ~5 MB mỗi trình duyệt): demo, không phải kho tệp; app thật cần upload lên storage. Không có gọi thoại/video, thông báo đẩy, @nhắc tên.
- Mục Messages trên dashboard chỉ được nối khi trang chạy qua `preview.js`; app thật cần nối route riêng.
