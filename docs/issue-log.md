# Nhật ký lỗi và góp ý

Mỗi lần có lỗi, hoặc mỗi lần bạn nêu một điểm cần nhớ, ghi vào đây: chuyện gì xảy ra, nguyên nhân, đã sửa thế nào, và **bài học để lần sau không lặp lại**. Mục mới ghi ở cuối, kèm ngày.

## Quy tắc rút ra (đọc trước khi làm việc mới)

1. **Làm mới bên cạnh, không đè lên trang khác.** Trang mới là file mới. Không đổi kiểu hay dữ liệu của trang đã có. Nếu phải sửa file dùng chung, giới hạn phạm vi (ví dụ `html.client-portal`) và hỏi trước.
2. **Portal khác chỉ đọc dữ liệu của Staff, không ghi vào đó.** Hành động của cư dân (lưu, nhận mã, thích, trả lời) nằm ở khóa riêng của cư dân.
3. **Cư dân chỉ thấy phần đã hoàn thành và đã publish.** Bài nháp, bài chỉ dành cho Staff, số liệu và công cụ của Staff không được lọt sang. Promotions và Social: chỉ tương tác (xem, lưu, nhận, thích, trả lời), không đăng bài.
4. **Trước khi thay một mục "còn là placeholder", kiểm tra nó có thật sự là placeholder không.** Prototype đã có sẵn nhiều trang Settings thật; thay mù sẽ làm mất trang tốt hơn.
5. **Cá nhân hóa phải đi theo người dùng sang trang thật.** Chọn kiểu ở Settings rồi bấm Dashboard mà ra kiểu khác là lỗi.
6. **Phần tử có class `display` (flex, grid) đè lên `display:none` mặc định của `<dialog>` đóng.** Dùng `open:flex`.
7. **Khi kiểm thử, thêm `?v=<số>` vào địa chỉ** để tránh trình duyệt dùng bản cũ (đã có lần thấy lỗi "chưa sửa" chỉ vì cache).
8. **Mỗi tính năng mới có test logic (`npm test`) và một lượt quét giao diện** (tràn ngang, tên điều khiển, vùng chạm, tương phản; 375, 768, 1440; sáng và tối).
9. **Không chép chuỗi chữ lặp trong cùng một dòng** (ví dụ tên và nhãn cùng là "Property team").

## Mục

| # | Ngày | Ai nêu | Chuyện gì | Nguyên nhân | Đã sửa | Bài học |
|---|---|---|---|---|---|---|
| 1 | trước 2026-11-09 | Bạn | Chữ "Closed" lặp ở trên và dưới một cuộc đã đóng | Cả huy hiệu, ghi chú và chip đều nói "Closed" | Bỏ huy hiệu cho queued/active/closed, rút ngắn ghi chú, chip tách Resolved/Closed | Một trạng thái chỉ có một nhãn trong một màn hình |
| 2 | trước | Kiểm thử | Số ticket nhảy lung tung | Số suy ra từ id | Đánh số tuần tự `ticketNo` (T-1081…) | Số hiển thị cho người dùng phải tuần tự và ổn định |
| 3 | trước | Kiểm thử | Nhóm Services nhân bản giữ mục đầu cũ; hàng nút tràn ở 375px; thuộc tính `data-role` trùng; từ dài kéo bong bóng ra ngoài | Nhân bản không dọn mục; bố cục ngang; trùng tên thuộc tính; thiếu `wrap-anywhere` | `replaceChildren()`, xếp dọc, đổi `data-rolelabel`, `wrap-anywhere` | Nhân bản phần tử phải dọn nội dung cũ; kiểm 375px |
| 4 | 2026-11-09 | Bạn | Panel chi tiết hiện "Balance due" | Không có dữ liệu nợ hay hỗ trợ của cư dân | Bỏ dòng, bỏ hàm định dạng tiền, bỏ `balance` khỏi persona và test | Không đưa vào giao diện thứ mà dữ liệu chưa có |
| 5 | 2026-11-09 | Bạn | Promotions Staff tạo phải hiện bên Resident; Resident chỉ thấy phần đã xong | Trang Resident chưa có | `/resident/promotions.html`, `src/promotions/store.js` (chỉ đọc, lọc bản nháp, chưa bắt đầu, hết hạn, đối tượng) | Quy tắc 3 |
| 6 | 2026-11-09 | Kiểm thử | Bài của Staff có `aud:"staff"` (ghi chú ca đêm, cổng kẹt phím) sẽ lọt sang Social của cư dân | Feed dùng chung một danh sách | `timeline()` chỉ lấy `aud` là `all` hoặc `residents`; có test | Lọc theo đối tượng ở một chỗ, có test riêng |
| 7 | 2026-11-10 | Bạn | "Implement save chứ không phải đổi dữ liệu"; "không được đổi kiểu trang khác" | Tôi ghi số lượt xem và nhận mã ngược vào bản ghi của Staff, và thêm CSS chung | Bỏ ghi ngược (có test chứng minh không đụng dữ liệu Staff); CSS chỉ cho Client | Quy tắc 1 và 2 |
| 8 | 2026-11-10 | Kiểm thử | Hộp hướng dẫn Social vẫn hiện sau khi cư dân đã bấm Continue | Class `flex` trên `<dialog>` đè `display:none` của dialog đóng | Đổi thành `open:flex` | Quy tắc 6; kiểm thử bằng cách đọc `getComputedStyle`, không chỉ nhìn ảnh |
| 9 | 2026-11-10 | Bạn (ảnh) | Đường dẫn "Dashboard › Settings › Workspace" dính sát nhau | `#ttl` là flex nên khoảng trắng giữa các thẻ bị bỏ | `gap` cho `#ttl` | Trong flex, khoảng trắng giữa thẻ không còn tác dụng |
| 10 | 2026-11-10 | Bạn (ảnh) | Trang Settings của Client còn chữ và thẻ của Staff: thẻ một tòa nhà, "View as Manager / Staff (read-only)", "this staff profile" | Trang Client dùng lại prototype của Staff | Thay chữ, bỏ "View as" và "Resident view" (chỉ là demo xem vai trò khác), thẻ tòa nhà ẩn cho Client, đường dẫn "All properties" | Client quản lý nhiều tòa nhà; không đưa công cụ xem thử vai trò vào sản phẩm |
| 11 | 2026-11-10 | Bạn (ảnh) | Chọn kiểu ở Settings rồi bấm Dashboard ra kiểu khác | Cá nhân hóa chỉ sống trong prototype | Trang Settings ghi `ui-prefs:<portal>`; `preview.js` áp màu sidebar, theme, màu nhấn lên trang thật. **Chưa làm**: kiểu bố cục sidebar (Rail, Floating, Tab bar), kiểu menu, kiểu icon | Quy tắc 5; còn mở, xem bên dưới |
| 12 | 2026-11-10 | Kiểm thử | "Property team" lặp hai lần (tên và nhãn); avatar câu trả lời của cư dân là chữ "Y" | Nhãn vai trò và tên giống nhau; viết tắt từ chữ "You" | Ẩn nhãn khi trùng tên; lấy chữ viết tắt từ tên cư dân | Quy tắc 9 |
| 13 | 2026-11-10 | Kiểm thử | Thông báo nhỏ bị che sau hộp thoại; mất focus bàn phím sau khi vẽ lại danh sách | Hộp thoại nằm ở top layer; vẽ lại thay cả thẻ | Hộp thông báo là `popover`; trả focus về nút vừa dùng | Mọi thao tác vẽ lại phải trả focus |
| 14 | 2026-11-10 | Kiểm thử | Sắp thay các trang Settings bằng bản mới | Tưởng chúng còn là placeholder; thực ra đã có thật (Notifications, Support, Security…) | Chỉ thêm mục còn thiếu: Messages, Accessibility, Resident promotions; Client thêm Reports and digests, Billing contact | Quy tắc 4 |
| 15 | 2026-11-10 | Kiểm thử | Thấy "lỗi" mà thực ra là trình duyệt dùng bản cũ | Cache | Dùng `?v=` khi kiểm | Quy tắc 7 |
| 16 | 2026-11-10 | Bạn | Yêu cầu cài repo `claude-code-ui-freeze-investigation` | Đó không phải skill; là bản ghi điều tra kèm một bản CLI đóng gói | Không cài, không chạy. Đã cài skill `ui-ux-review` từ file bạn gửi | Chỉ cài thứ đúng loại; đọc trước khi cài |
| 17 | 2026-11-10 | Kiểm thử | `npm audit` báo 6 lỗ hổng (2 thấp, 4 vừa) | Gói dev `shadcn` kéo theo `ts-morph` và `minimatch` | Không áp `audit fix --force` (đổi phiên bản lớn). Gói chạy thật: 0 lỗ hổng. Không đi vào `dist` | Phân biệt gói dev và gói chạy thật |
| 18 | 2026-11-10 | Kiểm thử (vòng 2) | Gõ dở một trả lời ở Social rồi quay lại tab: ô nhập bị dựng lại, mất focus | `start()` vẽ lại mỗi lần; dấu "đã vẽ" lỗi thời sau khi một thao tác tự vẽ lại | `render()` tự ghi chữ ký của cái nó vừa vẽ; chỉ vẽ lại khi dữ liệu hiển thị đổi; hộp hướng dẫn giữ dấu tick | Mọi vòng "vẽ lại khi có thay đổi" phải so chữ ký, và chữ ký phải cập nhật ở mọi đường vẽ |
| 19 | 2026-11-10 | Bạn | Messages thiếu ẩn và xóa tin nhắn, và không có chỗ để khôi phục | Chỉ có "Delete for me" từng tin nhắn, không có chỗ xem lại; hội thoại không ẩn được | Hide conversation (menu ⋮ của hàng, menu đầu thread, panel chi tiết) có Undo; tab **Hidden (n)** chỉ hiện khi có gì đã ẩn; trong đó nút Restore cho hội thoại và cho tin nhắn đã xóa-cho-tôi; hội thoại ẩn tự hiện lại khi có hoạt động mới; không ẩn được khi đang có khẩn cấp; Ticket box không bị ảnh hưởng; 6 test mới | Mọi hành động "ẩn" phải đi kèm chỗ để lấy lại |
| 20 | 2026-11-10 | Kiểm thử | Ẩn hai hội thoại liên tiếp: hai thông báo giống hệt chồng lên đầu trang | Mỗi lần ẩn thêm một thông báo | Thông báo trùng chữ thay thế nhau, tối đa hai thông báo cùng lúc | Giới hạn số thông báo hiện cùng lúc |
| 21 | 2026-11-10 | Rà soát (/design, ui-ux-review) | Mỗi bài Social đang mở phần trả lời có một nút **Reply** đặc màu xanh: nhiều khối xanh đặc cùng một màn hình | Luật "One Beacon" của DESIGN.md: một khối xanh đặc mỗi màn hình | Nút Reply chuyển sang kiểu viền (outline); khối xanh đặc chỉ còn ở hộp hướng dẫn | Nút lặp theo danh sách không bao giờ dùng kiểu đặc |
| 22 | 2026-11-10 | Rà soát | Thẻ khuyến mãi dùng `after:content-['']` (giá trị tùy ý, trái luật "chỉ token có tên"); viền focus chỉ hiện bằng pseudo-element | Cách làm thẻ bấm được nguyên thẻ | Thay bằng một `span` phủ thẻ; viền focus bằng `focus-within` trên thẻ; tiêu đề vẫn là nút để bàn phím và trình đọc màn hình dùng | Không dùng giá trị tùy ý để lách; dùng phần tử thật |
| 23 | 2026-11-10 | Rà soát | Đóng hộp chi tiết khuyến mãi sau khi lưu hoặc nhận mã: focus rơi về đầu trang | Thẻ bị dựng lại nên nút đã mở hộp không còn trong trang | `returnFocus()` tìm nút tiêu đề mới của đúng thẻ; test trên trình duyệt ở cả đường nhấp chuột và Esc | Gặp lại lỗi #13: mọi lần dựng lại phải trả focus |
| — | 2026-11-10 | Rà soát | Đã kiểm, **không phải lỗi**: công tắc Social ở trang Settings cao 24px với chuột (đủ mức tối thiểu 24px của WCAG 2.2 AA) và 32px khi là màn cảm ứng; hai thẻ cùng tên "Property team" đã xử lý ở #12 | — | — | Ghi lại để lần sau khỏi tốn công kiểm lại |
| 24 | 2026-11-10 | Bạn (đối chiếu ux-checklist.com, cả 4 portal) | 4 dashboard chụp ghi `lang="vi"` nhưng nội dung tiếng Anh; trình đọc màn hình đọc sai giọng | Bản chụp từ app thật giữ nguyên thuộc tính | `preview.js` đặt lại `lang="en"` lúc chạy (không sửa HTML gốc); đã kiểm Staff, Admin, Client, Resident | Ngôn ngữ trang phải khớp ngôn ngữ nội dung |
| 25 | 2026-11-10 | Đối chiếu | Tắt JavaScript thì 5 trang động chỉ trắng | Không có nội dung dự phòng | Thông báo `<noscript>` ở Messages, Ticket box, Promotions, Social, Settings | Trang phụ thuộc JS phải nói rõ khi không chạy được |
| 26 | 2026-11-10 | Đối chiếu (Inclusive, Accessibility) | Chỉ Staff, Client và Messages có tùy chọn tương phản và giảm chuyển động; Resident thì không | Chưa có chỗ chọn ở Resident | Settings > Personalize > Comfort: Higher contrast, Reduce motion; áp cho mọi trang Resident qua `preview.js`; `html[data-reduce-motion]` thêm vào `styles.css` (chỉ có tác dụng khi bật); 4 test mới | Mỗi portal có cùng nhóm tùy chọn thoải mái cho người dùng |
| 27 | 2026-11-10 | Bạn | "Language hiện tại chỉ có English" | Trang Language của Staff và Client còn mời chọn Tiếng Việt và Español, trong khi chúng không dịch gì ngoài vài nhãn của prototype | Chỉ còn English (United States) ở cả Staff và Client; `lang` đã lưu khác `en` được đặt về `en`; bỏ mục "làm đa ngôn ngữ" khỏi danh sách chờ | Đừng đưa ra lựa chọn mà sản phẩm chưa hỗ trợ thật |
| — | 2026-11-10 | Đối chiếu | Còn thiếu, chờ quyết định: Admin chưa có Settings; trang Settings của Staff/Client nặng 1,3 MB mỗi bản | — | Ghi trong `docs/ux-checklist-conformance.md` | — |

Ghi chú quy trình: bước cuối của `/design` (web-design-guidelines) cần tải bộ luật mới nhất từ mạng; công cụ tải trang không có trong phiên này nên bước đó **chưa chạy**. Thay vào đó đã đối chiếu thủ công với danh sách kiểm của `ui-ux-review` và DESIGN.md.

## Còn mở

- Kiểu bố cục sidebar, kiểu menu, kiểu icon chọn ở Settings chưa đi sang dashboard thật (dashboard là bản chụp, cấu trúc khác prototype). Cần quyết định: dựng lại sidebar thật theo các kiểu đó, hay bỏ các lựa chọn bố cục khỏi Settings.
- Resident Social mới là một trang xem và tương tác; chưa có hồ sơ, theo dõi, báo cáo bài.
- Phản hồi và lượt thích của cư dân nằm ở khóa riêng của cư dân, nên Staff chưa thấy chúng (theo quy tắc 2). Muốn Staff thấy thì cần một kênh riêng, hỏi bạn trước.
