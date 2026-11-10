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
3. **active**: một Staff bấm **Take conversation** (chỉ một người thắng). Resident được báo một lần khi họ vào.
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

- **Bấm vào tin để hiện giờ, trạng thái và các nút hành động** (React, Reply, Copy, Remove); mặc định ẩn để bong bóng gọn. Hiện bằng `data-reveal` trên từng tin, không dựng lại danh sách. Tin cuối của mình luôn hiện trạng thái gửi.
- **Emoji**: bộ riêng trong `src/messaging/emoji.js` (ký tự Unicode chuẩn, không chép tài nguyên của trang nào), có tìm kiếm, nhóm theo chủ đề, mục gần đây (lưu cục bộ), 6 phản ứng nhanh. Phản ứng hiện thành chip dưới tin, bấm để thêm/bỏ.
- **Đính kèm**: tối đa 4 tệp/tin; ảnh được thu nhỏ trong trình duyệt (cạnh dài ≤1280px, JPEG) và tệp ≤450 KB sau xử lý; PDF/TXT/CSV nhận nguyên bản. Kéo-thả, dán ảnh và nút kẹp giấy đều dùng được; bấm ảnh mở xem lớn (lightbox). Chỉ nhận `data:` URL, ảnh phải là `data:image/`.
- **Sửa tin** (nút bút chì, chỉ tin chữ của mình, trong 15 phút, `CONFIG.editMs`): ô soạn chuyển sang chế độ "Editing message" (nút Save, Esc hoặc dấu x để hủy và trả lại bản nháp cũ). Cả hai bên thấy nhãn **Edited**; bản cũ không được giữ. Tin của trợ lý, tin chọn nhanh, tin chỉ có tệp và tin đã thu hồi không sửa được.
- **Ghim và tắt tiếng** (hai nút ở đầu cuộc trò chuyện, mỗi người một riêng, lưu trong `prefs`): cuộc ghim nổi lên đầu danh sách; cuộc tắt tiếng không cộng vào số chưa đọc trên tab/badge nhưng vẫn hiện số trên hàng của nó.
- **Tìm trong nội dung tin**: gõ từ 2 ký tự trở lên vào ô tìm, khối "Messages (n)" hiện các tin khớp (mới nhất trước, tối đa 30, từ khóa được tô). Bấm một kết quả mở cuộc trò chuyện, cuộn tới tin đó và nháy nền. Chỉ tìm trong cuộc người dùng được thấy; bỏ qua tin đã thu hồi, tin hệ thống và, với Staff, tin của trợ lý.
- **Bố cục ô soạn trên mobile**: ô nhập chiếm cả một hàng, các nút đính kèm/emoji/Send nằm hàng dưới (trước đây ô nhập bị ép còn vài chục px).
- **Trả lời trích dẫn** (Reply), **thu hồi tin** trong 15 phút (người nhận thấy "This message was removed"), liên kết tự nhận dạng (mở tab mới, `rel="noopener noreferrer"`).
- **Đang nhập / Online**: chỉ người trong cuộc trò chuyện thấy "<tên> is typing…" (hết hạn sau 5 giây) và huy hiệu Online (45 giây không tín hiệu thì tắt).

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
tests/messaging.test.mjs         39 test cho lõi: npm test
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

## Hạn chế

- **Không có backend.** Dữ liệu nằm trong trình duyệt, đồng bộ giữa các tab cùng máy và cùng origin; không phải thời gian thực giữa các thiết bị.
- Trợ lý là kịch bản có sẵn, không phải AI; nội dung FAQ là mẫu, cần đội vận hành thay bằng nội dung thật.
- Tệp đính kèm lưu nguyên trong `localStorage` (giới hạn ~5 MB mỗi trình duyệt): demo, không phải kho tệp; app thật cần upload lên storage. Không có gọi thoại/video, thông báo đẩy, @nhắc tên, chuyển tiếp tin.
- Mục Messages trên dashboard chỉ được nối khi trang chạy qua `preview.js`; app thật cần nối route riêng.
