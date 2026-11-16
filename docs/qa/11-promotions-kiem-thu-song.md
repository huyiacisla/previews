# Kiểm thử "sống" Promotions và tin nhắn hỗ trợ (bắt đầu 16/11/2026)

**Mục tiêu (người dùng)**: biết chắc hệ thống nhận claim và cách ứng xử giữa Staff và Resident có chạy thật không: ý tưởng Promotions chạy như một sản phẩm sống. Thử nhiều lần, nhiều cách, đến khi đạt; những gì đã làm trước đây vẫn chạy mượt.

**Cách làm**: giao diện thật trong khung trình duyệt của ứng dụng (Resident và Staff dùng chung một kho), dữ liệu thật của app (nguyên tắc dữ liệu thật: không dựng dữ liệu giả; claim thử là claim thật do giao diện tạo), mỗi lượt có sao lưu và trả lại dữ liệu. Làm từng phase; xong phase này thì qua phase sau; nếu một phase dài thì hẹn lại sau 5 phút và làm tiếp. Lỗi tìm thấy thì sửa, thêm test, thử lại phase đó, ghi vào mục "Nhật ký lỗi" cuối tệp.

**Người dùng thử**: Alex Rivera (`res-1`, unit 02-291), Jamie Rivera (`res-4`, cùng unit 02-291), Priya Nair (`res-2`), Morgan (`res-3`); Staff Jordan Lee (`stf-1`, Property Manager). Không đụng ticket T-1086 và T-1087 và claim Mallard của Alex (người dùng đang giữ làm ca tập).

## Phase 1: cùng căn hộ nhận rồi nhận lại
| # | Ca | Kỳ vọng |
|---|---|---|
| 1.1 | Alex claim deal giới hạn theo căn hộ | Có mã (che khi Pending), kho giảm 1 |
| 1.2 | Jamie (cùng unit) mở cùng deal | Nút "Claimed by your unit", không thấy mã của Alex, có dòng nói ai đã nhận và ngày; không claim được |
| 1.3 | Jamie bấm Claim bằng cách gọi thẳng (bấm nhanh, mở hai lần) | Bị từ chối có lý do, không ghi claim, nhật ký không có dòng claim thứ hai |
| 1.4 | Alex bấm Claim lần hai | "You already claimed this", không thêm claim |
| 1.5 | Alex huỷ claim Pending | Kho trả lại; Jamie claim được |
| 1.6 | Jamie claim, rồi Alex bị chặn | Đối xứng với 1.2 |
| 1.7 | Staff Reject claim của Jamie | Căn hộ được giải phóng; Alex claim được |
| 1.8 | Staff Verify claim của Alex rồi Jamie thử | Jamie vẫn bị chặn (claim đã duyệt vẫn tính cho căn hộ) |
| 1.9 | Hộp Claims của Staff cho căn hộ | Staff thấy claim của cả hai, và cảnh báo trùng căn hộ ở chat |
| 1.10 | Deal giới hạn theo người (nếu có) | Hai người cùng căn hộ nhận được mỗi người một lần |

## Phase 2: hỏi về promotion, Pending quá lâu, phản ánh đi đâu
| # | Ca | Kỳ vọng |
|---|---|---|
| 2.1 | Resident bấm "Ask about this claim" (My rewards, cửa sổ các bước, cửa sổ deal) | Mở Messages, câu hỏi đi tới property team, thẻ claim, nhãn Promotions, có ticket |
| 2.2 | Jamie bị chặn bởi căn hộ bấm "Ask the property team" | Chat có ngữ cảnh "claimed by your unit" |
| 2.3 | Staff mở chat từ claim ("Message") | Thấy claim, nút Confirm / Apply by hand / Reject ngay trong chat |
| 2.4 | Staff trả lời trong chat; Resident thấy | Tin hiện thời gian thực, thông báo chuông |
| 2.5 | Claim Pending đã 24h, 72h (đổi giờ claim bằng chính cơ chế đồng hồ demo nếu có, nếu không ghi rõ chưa thử được) | Resident thấy tuổi claim; có đường hỏi; Staff thấy claim cũ nổi lên |
| 2.6 | Resident không biết bao giờ được duyệt | Giao diện có nói thời gian dự kiến hoặc cách hỏi |
| 2.7 | Duyệt rồi Resident có biết ở đâu | Chuông, My rewards, cửa sổ deal đều đổi |
| 2.8 | Bị từ chối: Resident thấy lý do và biết phản ánh ở đâu | Lý do rõ, nút hỏi lại, "Claim again" nếu không khoá |

## Phase 3: Staff xem như Resident
| # | Ca | Kỳ vọng |
|---|---|---|
| 3.1 | Staff bật "Resident view" ở Promotions | Khung Resident trong portal Staff, không rời portal |
| 3.2 | Trong khung: My rewards, thẻ Pending, bấm nhãn Pending | Hiện các bước |
| 3.3 | Trong khung: View | Cửa sổ deal, mã che khi Pending |
| 3.4 | Trong khung: Ask about this claim | Chỉ nói nút làm gì (không chuyển khỏi portal Staff) |
| 3.5 | Đủ 7 template, Phone/Tablet/Desktop | Giống Resident thật |

## Phase 4: giao diện bị khuất, Staff không duyệt được
| # | Ca | Kỳ vọng |
|---|---|---|
| 4.1 | Nút chat nổi của Staff có che nút Verify, Reject, nhãn, ô nhập | Không che; nếu che thì sửa |
| 4.2 | Cửa sổ chi tiết claim cuộn tới nút cuối ở 375, 768, 1440 | Mọi nút bấm được |
| 4.3 | Thanh dính, header, bàn phím ảo làm khuất ô ghi chú | Không |
| 4.4 | Staff có thể duyệt claim của người khác căn hộ khi trùng căn hộ | Có cảnh báo, không duyệt nhầm |
| 4.5 | Bấm nhầm Verify | Có đường quay lại (Move back to Pending, ghi nhật ký) |
| 4.6 | Phím Tab và Escape, đọc màn hình (nhãn) | Đi hết các nút, đóng được |
| 4.7 | Sáng/tối, 375, 768, 1440 | Không chữ mất, không tràn ngang |

## Phase 5: lặp lại và hồi quy
| # | Ca |
|---|---|
| 5.1 | Chạy lại bộ 50 điểm (claim, che mã, Verify, mở khoá, CSV) 3 lần liên tiếp, mỗi lần một cư dân khác |
| 5.2 | Reject, Cancel, Redeem, hết hạn, claim lại |
| 5.3 | `npm test` đầy đủ, console sạch, trả dữ liệu |
| 5.4 | Rà lại các phàn nàn trước đây (thanh Promotions, Saved, My rewards, chuông, header, template) |

## Phase 6: báo cáo
Tổng hợp kết quả, lỗi đã sửa, lỗi còn lại, việc cần máy chủ; cập nhật `10-promotions-ghi-chep.md`.

## Tiến độ
- [x] Phase 1 (27 điểm đạt; chưa thử 1.10 vì mẫu không có deal giới hạn theo người)
- [x] Phase 2 (đã thử bằng giao diện thật; 4 lỗi sửa, 2 khoảng trống ghi lại; xem Nhật ký lỗi)
- [ ] Phase 3
- [ ] Phase 4
- [ ] Phase 5
- [ ] Phase 6

## Nhật ký lỗi

### Phase 2 (16/11/2026)
| # | Lỗi hoặc khoảng trống | Xử lý |
|---|---|---|
| P2-1 | Thẻ claim trong chat đứng yên ở "Claimed": Staff Verify hoặc Reject xong, Resident vẫn đọc thẻ cũ | Sửa: thẻ đọc trạng thái claim hiện tại (Pending / Verified / Used / Not approved / Cancelled, kèm lý do khi bị từ chối) và vẽ lại khi kho đổi |
| P2-2 | Thẻ claim trong chat của Resident cho thấy mã đầy đủ dù claim còn Pending | Sửa: che mã tới khi được duyệt (như My rewards và cửa sổ deal); Staff vẫn thấy mã để tìm claim |
| P2-3 | Pending lâu: bước "In progress" không nói đã chờ bao lâu | Sửa: "Waiting 6 h", "Waiting 3 days": chỉ nêu sự thật, không hứa thời gian duyệt |
| P2-4 | Staff nhìn chat của Jamie không biết ai cùng căn hộ đã nhận gì trước đó | Sửa: nút **View all** ở đầu mục Promotions mở cửa sổ gồm các promotion của người này và của từng người cùng căn hộ (trạng thái, mã, ai quyết định, lúc nào, lý do); mỗi dòng ghi "Also claimed in this unit by …" |
| P2-5 | Hộp Claims của Staff không nối hai claim cùng căn hộ | Sửa: mỗi dòng có nhãn "+ Alex (same unit)"; chi tiết claim có khung **Same unit** (tên là nút mở claim kia, trạng thái, tuổi, mã) và cảnh báo "One per unit" khi claim còn Pending; không tính claim đã bị từ chối |
| P2-G1 | Không có nhắc sau khi chờ lâu (không có đồng hồ phía máy chủ) | Ghi lại: cần máy chủ (nhắc Staff khi claim quá 24 giờ) |
| P2-G2 | Hộp Claims bấm Reject không gửi System Message vào chat (Reject trong chat thì có) | Ghi lại: để sửa nếu người dùng đồng ý |

Cách kiểm: Staff mở chat của Jamie (cùng căn hộ 02-291 với Alex) → Promotions → View all; hộp Claims được thử bằng một dòng Jamie tạm thời cùng deal rồi gỡ (dữ liệu đã trả lại). Test tự động: tests/promotions/promotions-link.test.mjs (7 ca); cả bộ 615/615 đạt.
