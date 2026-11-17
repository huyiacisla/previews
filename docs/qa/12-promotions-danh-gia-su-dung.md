# Đánh giá "dùng thử" Promotions và tương tác hỗ trợ (bắt đầu 16/11/2026)

**Câu hỏi**: người thật (cư dân, nhân viên) có dùng được từ đầu đến cuối mà không cần ai chỉ không? Chỗ nào khó hiểu, thừa bước, dễ bấm nhầm, hoặc làm người dùng không biết chuyện gì đang xảy ra?

**Cách chấm mỗi kịch bản** (0 đến 2 điểm mỗi ô, 2 là tốt):
| Ô | Hỏi |
|---|---|
| Hiểu | Người dùng biết mình đang ở đâu và nút làm gì, không cần đoán? |
| Ít bước | Số lần bấm hợp lý (nêu số thật)? |
| Trạng thái | Luôn thấy chuyện gì đã xảy ra và bước kế (Pending, Verified, Used, lý do)? |
| Lùi được | Bấm nhầm thì có đường quay lại hoặc xác nhận? |
| Thấy được | Không có gì bị che; chữ đọc được; nút bấm được ở 375, 768, 1440, sáng và tối? |

Một kịch bản **đạt** khi không có ô nào 0 và tổng từ 8 trở lên; ô 0 là lỗi cần sửa. Mỗi lần thử ghi: việc làm, số bước, kết quả, điểm, điều cần cải thiện. Sửa xong thì thử lại kịch bản đó đến khi đạt.

**Nguyên tắc dữ liệu**: dữ liệu thật của app (claim thử do giao diện tạo), không dựng dữ liệu giả; trả lại dữ liệu sau mỗi kịch bản; không đụng T-1086, T-1087 và claim Mallard của Alex. Làm nhẹ từng bước; bị quá tải thì dừng và thử lại lần sau. Lịch tự chạy mỗi 5 phút làm kịch bản kế tiếp.

**Người dùng thử**: Alex Rivera (`res-1`, 02-291), Jamie Rivera (`res-4`, cùng căn hộ), Priya Nair (`res-2`, 05-114), Morgan (`res-3`); Staff Jordan Lee (`stf-1`).

## Kịch bản
| # | Kịch bản | Ý đồ |
|---|---|---|
| S1 | Cư dân tìm một deal và nhận | Tìm, xem điều khoản, nhận, hiểu vì sao mã bị che |
| S2 | Chờ Pending lâu, muốn biết chuyện gì xảy ra | Mở các bước, thấy "Waiting 7 h", hỏi hỗ trợ |
| S3 | Staff nhận câu hỏi trong chat, xem thông tin, quyết định **Approve** | Mở Details, thấy hồ sơ, claim, căn hộ, ticket; Confirm; cư dân thấy Verified và mã hiện |
| S4 | Staff **từ chối** có lý do | Lý do có sẵn, cư dân thấy lý do, biết hỏi lại ở đâu, "Claim again" |
| S5 | Staff Verify nhầm rồi lùi | "Move back to Pending", mã bị che lại, nhật ký có một dòng |
| S6 | Hai người cùng căn hộ | Người sau bị chặn có lý do, hỏi hỗ trợ; Staff thấy ai đã nhận, liên kết trong hộp Claims |
| S7 | Nhiều người cùng bấm một deal | Quá tải: "Please try again in a moment", không ghi, nút tắt rồi bật |
| S8 | Staff xem như cư dân (Resident view) | Không ghi dữ liệu; Ask, Claim, Cancel chỉ báo |
| S9 | Đổi quà: Staff đánh dấu đã dùng | Used, My rewards chuyển sang lịch sử |
| S10 | Cư dân huỷ claim Pending | Trả lại suất; Staff thấy đã huỷ |
| S11 | Bàn phím và đọc màn hình | Tab đi hết nút, Escape đóng, nhãn đúng |
| S12 | Sáng và tối, 375 / 768 / 1440, các template | Không chữ mất, không tràn, không bị khuất |
| S13 | Deal bị Staff tạm dừng hoặc hết hạn khi cư dân đang xem | Báo rõ, không nhận được, không treo |
| S14 | Cư dân hỏi về claim nhiều lần | Một cuộc chat, không nhân đôi ticket |

## Tiến độ
- [x] S1 · [x] S2 · [x] S3 · [x] S4 · [x] S5 · [ ] S6 · [x] S7 (đã thử ở phần chống quá tải) · [x] S8 (đã thử ở Phase 3) · [x] S9 · [ ] S10 · [ ] S11 · [ ] S12 · [ ] S13 · [ ] S14

"Thấy được" (sáng/tối, 375/768/1440) của S1 đến S5, S9 chưa chấm: làm ở S12.

## Kết quả từng kịch bản
Chạy một chuỗi liền (một cư dân là Priya, 16/11/2026, trình duyệt xem trước, dữ liệu đã trả lại sau đó): nhận, hỏi hỗ trợ, Staff xem thông tin, Verify, lùi, từ chối có lý do, nhận lại, Verify, đã dùng. Điểm theo thứ tự Hiểu / Ít bước / Trạng thái / Lùi được (Thấy được để S12).

| # | Việc làm và số bước | Điểm | Nhận xét |
|---|---|---|---|
| S1 | Mở deal Covered Spot Upgrade, bấm "Get my code": **2 lần bấm**. Thấy điều khoản, "Only 2 left", mã che "RES-******" với lời "Code will be available after staff approval". Nút đổi thành "Claimed by you" | 2 / 2 / 2 / 1 | Dễ. Huỷ claim có (Cancel claim) nhưng không hỏi lại lần nữa trước khi huỷ (chưa kiểm xác nhận). |
| S2 | "Ask about this claim" trong cửa sổ deal: **1 lần bấm** chuyển sang Messages với thẻ claim (mã che, Pending) | 2 / 2 / 1 / n.a. | Câu hỏi vào ticket đang mở **T-1081 (Vehicle or permit)**; nhãn chủ đề của hàng vẫn là "Vehicle or permit" và đồng hồ "Waiting 16 h" là của câu hỏi cũ. Xem I6. |
| S3 | Staff: danh sách chat thấy câu mới và dấu chưa đọc; mở chat, dải "Asked about: Covered Spot Upgrade" có nút Details mở thẳng modal ở tab Resident reward với claim cần duyệt, bước đã qua và nút Confirm / Apply by hand / Reject; **Confirm: 3 lần bấm** từ danh sách. Cư dân thấy thẻ đổi sang Verified và mã hiện ngay, chuông tăng | 2 / 2 / 2 / 1 | Rất gọn. Nhưng để quyết định approve hay không, Staff phải sang tab Profile (hợp đồng) và không thấy hạn deal, số suất còn lại trên thẻ claim. Chat của cư dân không có dòng nào báo "đã xác nhận" (chỉ thẻ đổi). Xem I1, I2. |
| S4 | Staff Reject (hộp inbox): lý do **bắt buộc**, có 4 lý do mẫu và ô tự viết. Cư dân thấy "Not approved" + lý do trên thẻ chat và trong cửa sổ deal, nút "Claim again", suất trả lại (2 thành 3) | 1 / 2 / 1 / 2 | Ô khoá "Lock: deal is really out, resident cannot claim again" khó hiểu (I4). Dòng lý do cư dân đọc "Not approved by the property team. Not a current resident at this unit": hai câu dính nhau, thiếu nhãn "Reason:" (I5). Chat không có dòng báo từ chối (I1). |
| S5 | Staff Verify nhầm: trước đây không có đường lùi. Nay claim Verified chưa đồng bộ có **"Move back to Pending"**: claim Pending lại, mã bị che lại, nhật ký một dòng `unverify` (chuỗi: claim, verify, unverify, reject, give_back, claim, verify, redeem) | 2 / 2 / 2 / 2 | Nút lùi chỉ có trong hộp Claims, chưa có trong modal Resident information (I3); bốn nút hành động nhìn ngang nhau (I7). Một lần lùi đầu tiên bị bản ghi hộp Claims ghi đè về "verified" (không tái hiện được lần hai; nghi một phiên khác ghi cùng kho vào lúc đó). |
| S9 | Staff Verify rồi **Mark redeemed**: 2 lần bấm. Cư dân thấy "Used" ở tab "Used / Expired" của My rewards, mã vẫn hiện | 2 / 2 / 2 / 1 | Mark redeemed không hỏi xác nhận; không có đường lùi sau khi đã dùng (đúng ý, nhưng nên có hỏi lại). |

**Đạt khi sửa xong**: S4 (tổng 6/8) và S3 (tổng 7/8) chưa đạt ngưỡng 8; S1, S2, S5, S9 đạt. I2, I4, I5 đã sửa; còn I1 (chat báo quyết định) rồi chấm lại S3 và S4.

## Điều cần cải thiện (gom lại)
| # | Việc | Mức | Tình trạng |
|---|---|---|---|
| I1 | Khi Staff Confirm, Reject hoặc lùi một claim, chat của cư dân nhận một dòng hệ thống ("Your claim for X was confirmed. Your code is ready." / "... was not approved: lý do") để cư dân không phải tự đoán qua thẻ hoặc chuông | Cao | Chưa làm |
| I2 | Thẻ claim trong modal của Staff hiện "Checks before you decide": hợp đồng còn hiệu lực, deal còn chạy tới ngày nào và còn mấy suất, có ai cùng căn hộ nhận chưa (để lý do mẫu từ chối có dữ kiện; mỗi dòng có chữ "Passed" hoặc "Needs attention" cho trình đọc màn hình) | Cao | Đã làm (16/11), đã xem trên giao diện thật với claim của Alex |
| I3 | "Move back to Pending" cho claim Verified cũng có trong modal Resident information | Trung | Chưa làm |
| I4 | Nhãn ô khoá trong hộp Reject rõ hơn ("Do not let the resident claim again (the deal is out)") | Trung | Đã làm (16/11) |
| I5 | Lý do từ chối hiện với nhãn "Reason:" ở cửa sổ deal của cư dân | Thấp | Đã làm (16/11) |
| I6 | Câu hỏi về promotion vào ticket đang mở của chủ đề khác: gắn nhãn chủ đề "Promotions" cho ticket hoặc hiện chủ đề mới nhất; đồng hồ "Waiting" tính từ tin mới nhất của cư dân | Trung | Chưa làm |
| I7 | Bốn nút hành động trong chi tiết claim (Apply by hand, Mark redeemed, Move back, Reject) khác nhau rõ hơn: một nút chính, còn lại viền; Mark redeemed hỏi lại một lần | Thấp | Chưa làm |
| I8 | Chống quá tải khi nhiều người nhận cùng lúc | Cao | Đã làm (16/11) |
| I9 | Đường lùi cho Verify nhầm | Cao | Đã làm (16/11) |

## Nhật ký lỗi
- 16/11: S5 trước khi thử: bấm nhầm Verify không có đường quay lại (chỉ Reject rồi mới "Move back to Pending", và lúc đó cư dân thấy "Not approved"). Đã thêm "Move back to Pending" cho claim đã Verify chưa đồng bộ; nhật ký có sự kiện `unverify`; test tests/promotions/promotions-undo.test.mjs.
