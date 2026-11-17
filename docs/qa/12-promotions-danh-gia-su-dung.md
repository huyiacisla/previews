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
- [x] S1 · [x] S2 · [x] S3 · [x] S4 · [x] S5 · [x] S6 · [x] S7 (đã thử ở phần chống quá tải) · [x] S8 (đã thử ở Phase 3) · [x] S9 · [x] S10 · [x] S11 · [x] S12 · [x] S13 · [x] S14

"Thấy được" (sáng/tối, 375/768/1440) đã chấm ở S12 (xem bên dưới): 2 điểm cho mọi kịch bản S1 đến S5, S9.

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

| S6 | Jamie (cùng căn hộ với Alex) mở deal Mallard: nút "Claimed by your unit" tắt, dòng "One claim per unit: Alex Rivera already claimed this on Nov 16.", **không thấy mã của Alex**, có "Ask the property team about this" (1 bấm). Chat: thẻ chỉ ghi "Claimed by your unit". Staff: modal Resident reward có cảnh báo đỏ "This unit already got ... through Alex Rivera's account ... Do not pay it twice." và claim của Alex kèm các bước | 2 / 2 / 2 / n.a. | Đạt. Rõ cho cả hai bên. |
| S10 | Priya nhận rồi huỷ trong My rewards. Dữ liệu đúng: suất trả lại, Staff thấy "Cancelled by resident", nhật ký claim rồi give_back. **Lỗi dùng được: bấm "Cancel claim" là huỷ ngay, không hỏi lại**, trong khi suất có thể hết ("Only 2 left") | 2 / 2 / 2 / **0** | Lùi được = 0, nên chưa đạt. Đã sửa: bấm huỷ chỉ mở hộp "Cancel this claim?" (Keep claim có tiêu điểm sẵn; "Your claim for X will be cancelled and its place given back. It may not be there if you try again."); chỉ lần bấm thứ hai mới huỷ. Thử lại: hỏi, Keep giữ nguyên Pending, xác nhận mới huỷ ("Claim cancelled"). Điểm mới 2 / 2 / 2 / 2: đạt. Test trong promotions-undo.test.mjs. |

| S11 | Bàn phím trên cửa sổ Resident information: tiêu điểm ở nút Details (tên "Resident information", báo là hộp thoại); Enter mở (tiêu điểm vào Close), Tab tới các tab, mũi tên chuyển sang "Resident reward", Escape đóng và tiêu điểm trả về Details; đóng bằng Escape không làm đóng thêm gì khác | 2 / 2 / 2 / 2 | Đạt. Chưa thử đọc màn hình thật (chỉ nhãn và vai trò: tablist, tab, tabpanel, aria-selected, "Passed/Needs attention", "Done/Now/Next"). |
| S13 | Deal bị tạm dừng, xoá hoặc hết hạn khi cư dân đang xem: bị từ chối kèm lý do ("This promotion is paused right now. Try again later." / "no longer available" / "has ended"), không ghi gì, cửa sổ đóng và báo | 2 / 2 / 2 / n.a. | Đạt, bằng test tự động tests/promotions/promotions-integrity.test.mjs (không thể tạm dừng một deal mẫu bằng giao diện trong xem trước). |
| S14 | Priya hỏi về claim hai lần (hai lần vào Messages từ cửa sổ deal) | 2 / 2 / 2 / n.a. | Đạt: vẫn **1 cuộc chat, 1 thẻ claim, 1 câu hỏi**, không nhân đôi ticket. |

| S12 | **Theme và cỡ màn hình**, đo bằng script tương phản (tỉ lệ 4,5:1 cho chữ thường, 3:1 cho chữ lớn; chữ nền trong suốt được trộn với nền thật) trên các cửa sổ mới: modal Resident information của Staff (ba tab, mục Current claim, sáng và tối): **0 chữ dưới ngưỡng**; cửa sổ của cư dân (deal, My rewards, các bước, hộp "Cancel this claim?", sáng và tối): **0 chữ dưới ngưỡng**; modal ở **375 px**: nằm trọn khung, không tràn ngang, mọi nút cao từ 28 px (vùng bấm 44 px), tab Resident reward cao 665 px vẫn vừa màn hình; **768 px** đã xem trong lượt trước | 2 / 2 / 2 / 2 + Thấy được 2 | Đạt. Duy nhất một chữ dưới ngưỡng: nút Send đang bị tắt trong chế độ tối (tỉ lệ 2,5; nút tắt được miễn theo WCAG). Chưa thử lại trực tiếp bảy template trên Resident view (do test tự động của template). |

**Chấm lại sau khi sửa**
- **S3** (Staff xem thông tin và Confirm): Hiểu 2 / Bước 2 / Trạng thái 2 / Lùi 2 (nay có Move back to Pending trong modal) / Thấy được 2 = **10/10, đạt**.
- **S4** (từ chối có lý do): Hiểu 2 (nhãn khoá rõ) / Bước 2 / Trạng thái 1 (Reject làm từ hộp Claims không có dòng trong chat; thẻ, chuông, cửa sổ deal có lý do) / Lùi 2 / Thấy được 2 = **9/10, đạt**.
- S1 10/10, S2 9/10, S5 10/10, S6 8/8, S9 9/10, S10 10/10 (sau khi thêm hộp xác nhận), S11, S13, S14 đạt.

**Đạt khi sửa xong**: S4 (tổng 6/8) và S3 (tổng 7/8) chưa đạt ngưỡng 8; S1, S2, S5, S9 đạt. I2, I4, I5 đã sửa; còn I1 (chat báo quyết định) rồi chấm lại S3 và S4.

## Điều cần cải thiện (gom lại)
| # | Việc | Mức | Tình trạng |
|---|---|---|---|
| I1 | Khi Staff Reject từ **hộp Claims**, chat không nhận dòng hệ thống (Reject và Apply làm từ chat thì có; Confirm thường không, theo quyết định cũ có test). Cư dân vẫn thấy thẻ đổi sang "Not approved" kèm lý do, và chuông | Trung | **Giữ, cần máy chủ**: prototype không có nơi chung cho hộp Claims và chat cùng ghi; làm bằng cách quét khi Staff mở Messages sẽ chỉ gửi khi có người mở Messages, rất thiếu tin cậy. Đề nghị: một sự kiện "quyết định" ở máy chủ sinh dòng chat |
| I2 | Thẻ claim trong modal của Staff hiện "Checks before you decide": hợp đồng còn hiệu lực, deal còn chạy tới ngày nào và còn mấy suất, có ai cùng căn hộ nhận chưa (để lý do mẫu từ chối có dữ kiện; mỗi dòng có chữ "Passed" hoặc "Needs attention" cho trình đọc màn hình) | Cao | Đã làm (16/11), đã xem trên giao diện thật với claim của Alex |
| I3 | "Move back to Pending" cho claim Verified cũng có trong modal Resident information (hành động `unverify` của `decideClaim`: hộp Claims, kho trạng thái, nhật ký ghi theo thứ tự có hoàn tác; không áp dụng cho claim đã dùng, bị từ chối hoặc đã đồng bộ) | Trung | Đã làm (16/11), đã thử trên giao diện thật |
| I4 | Nhãn ô khoá trong hộp Reject rõ hơn ("Do not let the resident claim again (the deal is out)") | Trung | Đã làm (16/11) |
| I5 | Lý do từ chối hiện với nhãn "Reason:" ở cửa sổ deal của cư dân | Thấp | Đã làm (16/11) |
| I6 | Câu hỏi về promotion vào ticket đang mở của chủ đề khác: gắn nhãn chủ đề "Promotions" cho ticket hoặc hiện chủ đề mới nhất; đồng hồ "Waiting" tính từ tin mới nhất của cư dân | Trung | Chưa làm |
| I7 | Bốn nút hành động trong chi tiết claim (Apply by hand, Mark redeemed, Move back, Reject) khác nhau rõ hơn: một nút chính, còn lại viền; Mark redeemed hỏi lại một lần | Thấp | Chưa làm |
| I10 | Cancel claim hỏi lại một lần (Keep claim là mặc định) | Cao | Đã làm (16/11) |
| I8 | Chống quá tải khi nhiều người nhận cùng lúc | Cao | Đã làm (16/11) |
| I9 | Đường lùi cho Verify nhầm | Cao | Đã làm (16/11) |

## Nhật ký lỗi
- 16/11: S5 trước khi thử: bấm nhầm Verify không có đường quay lại (chỉ Reject rồi mới "Move back to Pending", và lúc đó cư dân thấy "Not approved"). Đã thêm "Move back to Pending" cho claim đã Verify chưa đồng bộ; nhật ký có sự kiện `unverify`; test tests/promotions/promotions-undo.test.mjs.

- 16/11, **rủi ro nhiều tab**: hai lần liên tiếp, sau khi Staff lùi một Verify, bản ghi hộp Claims bị ghi đè về "verified" (kho trạng thái của cư dân đã đúng, hai nơi lệch nhau). Cả hai lần đều có một tab Staff Promotions cũ còn mở với dữ liệu cũ (tab-46). Khi tab đó được làm mới, cùng chuỗi chạy ổn định 4 giây ở Pending. Kết luận: một trang hộp Claims cũ đang mở ở tab khác có thể ghi đè quyết định mới hơn (ghi của tab sau thắng). Không sửa trong prototype (cần một nguồn sự thật duy nhất ở máy chủ); khi dùng nhiều tab Staff cần làm mới trang. Ghi nhận cho việc chuyển sang máy chủ.

## Kết luận (16/11/2026)
**Mọi kịch bản S1 đến S14 đạt** (không ô nào 0, mỗi kịch bản từ 8 điểm trở lên). Quy trình từ nhận, hỏi hỗ trợ, Staff xem thông tin và các điều kiện, quyết định Approve hoặc Reject có lý do, lùi khi bấm nhầm, đến đã dùng, chạy trọn trên giao diện thật; sáng và tối, 375 / 768 / 1440 đều không có chữ dưới ngưỡng tương phản và không bị khuất.

**Đã sửa trong đợt này** (đều có test, cả bộ 656/656): chống quá tải khi nhiều người nhận cùng một deal; "Move back to Pending" cho Verify nhầm (hộp Claims và modal); khối "Checks before you decide"; hộp xác nhận trước khi huỷ claim; nhãn ô khoá của hộp Reject; nhãn "Reason:" cho cư dân; nút Claim, Cancel trong Resident view của Staff chỉ báo; cửa sổ Resident information gọn, bàn phím dùng được.

**Còn lại, đã biết, không chặn** (ghi để làm sau):
- **I6** (trung): câu hỏi về promotion vào ticket đang mở của chủ đề khác (Priya: "Vehicle or permit") nên nhãn chủ đề và đồng hồ "Waiting" không khớp câu hỏi mới nhất.
- **I7** (thấp): bốn nút hành động trong chi tiết claim nhìn ngang nhau; "Mark redeemed" chưa hỏi lại.
- **I1** (trung): Reject từ hộp Claims không có dòng trong chat; cần máy chủ.
- **Cần máy chủ** (đã ghi từ trước): nguyên tử tồn kho, giới hạn tải cho nhiều người thật cùng lúc, nhật ký không sửa được, đăng nhập thật, che mã ở máy chủ, đồng bộ CRM, và một nguồn sự thật duy nhất khi nhiều tab Staff mở (một tab hộp Claims cũ có thể ghi đè quyết định mới hơn).
- **Chưa thử trực tiếp**: bảy template trên Resident view (do test tự động của template); đọc màn hình thật.

## Đợt thử lặp lại (Phase 5.1), 16/11/2026: cư dân khác (Morgan, res-3), cách khác
Chuỗi: nhận, **huỷ có xác nhận**, nhận lại, Staff mở hộp Claims, **từ chối bằng lý do tự viết** (dài 90 ký tự), cư dân đọc và nhận lại, Staff Verify, Mark redeemed. Dữ liệu đã trả lại.
- **Kết quả**: nhật ký \`claim#1, give_back#1, claim#2, reject#2, give_back#2, claim#3, verify#3, redeem#3\`; số suất còn giữ đúng (3 claim, 2 trả lại, 1 giữ); cư dân đọc "Not approved by the property team. Reason: …" đầy đủ trong khung, không tràn; "Claim again" có.
- **Lỗi tìm thấy và đã sửa (L1)**: khi Staff mở hộp Claims **sau khi** cư dân đã nhận, huỷ rồi nhận lại, claim #1 (đã huỷ) vào hộp ở trạng thái **Pending**, nên Staff có thể Verify hoặc Reject nó. Reject ghi thêm một \`give_back\` cho claim đã trả suất, làm **số suất bị cộng đôi**. Sửa: claim đã huỷ vào hộp là "Rejected: Cancelled by resident", không có nút hành động ("Cancelled by the resident. There is nothing to decide."), và "Move back to Pending" không dùng được cho claim cư dân đã huỷ. Thử lại: hộp hiện "Rejected 1", nhật ký không cộng đôi. Test trong tests/promotions/promotions-undo.test.mjs.
