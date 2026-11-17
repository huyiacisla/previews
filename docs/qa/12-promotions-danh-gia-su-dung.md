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
| I6 | Câu hỏi về promotion vào ticket đang mở của chủ đề khác: gắn nhãn chủ đề "Promotions" cho ticket hoặc hiện chủ đề mới nhất; đồng hồ "Waiting" tính từ tin mới nhất của cư dân | Trung | Đã làm (16/11): dòng chủ đề hiện "Vehicle or permit + Promotions". Đồng hồ "Waiting" là thời gian ticket chờ Staff trả lời (từ lúc vào hàng chờ): với ticket chưa ai trả lời thì đúng cho cả hai câu hỏi, nên không đổi |
| I7 | Bốn nút hành động trong chi tiết claim (Apply by hand, Mark redeemed, Move back, Reject) khác nhau rõ hơn: một nút chính, còn lại viền; Mark redeemed hỏi lại một lần | Thấp | Đã làm (16/11): chi tiết claim có một nút chính, các nút khác viền; "Mark redeemed" bấm lần đầu đổi nhãn "Press again to mark as used" (tự trả lại sau 5 giây), lần hai mới đánh dấu; đã thử trên giao diện thật |
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
- **I6** đã làm (nhãn chủ đề "+ Promotions"; đồng hồ "Waiting" đúng khi chưa ai trả lời).
- **I7** đã làm.
- **I1** (trung): Reject từ hộp Claims không có dòng trong chat; cần máy chủ.
- **Cần máy chủ** (đã ghi từ trước): nguyên tử tồn kho, giới hạn tải cho nhiều người thật cùng lúc, nhật ký không sửa được, đăng nhập thật, che mã ở máy chủ, đồng bộ CRM, và một nguồn sự thật duy nhất khi nhiều tab Staff mở (một tab hộp Claims cũ có thể ghi đè quyết định mới hơn).
- **Chưa thử trực tiếp**: đọc màn hình thật (đã kiểm bằng script, xem mục "Tiếp cận" bên dưới). Bảy template đã thử trực tiếp ở đợt lặp lại bên dưới.

## Đợt thử lặp lại (Phase 5.1), 16/11/2026: cư dân khác (Morgan, res-3), cách khác
Chuỗi: nhận, **huỷ có xác nhận**, nhận lại, Staff mở hộp Claims, **từ chối bằng lý do tự viết** (dài 90 ký tự), cư dân đọc và nhận lại, Staff Verify, Mark redeemed. Dữ liệu đã trả lại.
- **Kết quả**: nhật ký `claim#1, give_back#1, claim#2, reject#2, give_back#2, claim#3, verify#3, redeem#3`; số suất còn giữ đúng (3 claim, 2 trả lại, 1 giữ); cư dân đọc "Not approved by the property team. Reason: …" đầy đủ trong khung, không tràn; "Claim again" có.
- **Lỗi tìm thấy và đã sửa (L1)**: khi Staff mở hộp Claims **sau khi** cư dân đã nhận, huỷ rồi nhận lại, claim #1 (đã huỷ) vào hộp ở trạng thái **Pending**, nên Staff có thể Verify hoặc Reject nó. Reject ghi thêm một `give_back` cho claim đã trả suất, làm **số suất bị cộng đôi**. Sửa: claim đã huỷ vào hộp là "Rejected: Cancelled by resident", không có nút hành động ("Cancelled by the resident. There is nothing to decide."), và "Move back to Pending" không dùng được cho claim cư dân đã huỷ. Thử lại: hộp hiện "Rejected 1", nhật ký không cộng đôi. Test trong tests/promotions/promotions-undo.test.mjs.

## Bảy template trên trang cư dân (16/11/2026)
Lần lượt áp từng template trong Templates & brand (Store, Modern, Deals marketplace, Editorial, Minimal mono, Seasonal / Holiday, Luxury dark), tải trang cư dân ở **390 px**, mở My rewards, đo tương phản toàn trang (khoảng 235 đến 270 phần tử chữ mỗi template). Kho đã trả về đúng bản gốc (Deals marketplace).
- **Kết quả**: cả 7 tải được, không tràn ngang, My rewards mở trong khung.
- **Lỗi tìm thấy và đã sửa (L2)**: template **Modern** có 3 chữ ở **4,47:1** (nút "Claim offer", liên kết "Skip to main content", số trên huy hiệu): màu chính `#6366f1` với chữ trắng thiếu 0,03 so với 4,5. Đổi sang `#6063ef` (4,64:1), gần như không đổi về nhìn. Thử lại: 0 chữ dưới ngưỡng. Test trong tests/promotions/promotions-undo.test.mjs.

## Rà soát hồi quy cuối (Phase 5.4), 16/11/2026
Sau mọi bản sửa, đo lại các điểm từng bị phàn nàn:
- **Trang Promotions của cư dân** ở 375 / 768 / 1440 px: thanh trên cùng (Redeem, My rewards, Saved, Filters) đều **bấm được** (không bị phần tử nào đè; 44 x 44 px trên điện thoại, 32 px nhìn thấy ở tablet và desktop), ô tìm kiếm hiện, **không tràn ngang**, My rewards mở nằm trọn khung ở cả ba cỡ.
- **Hộp Claims của Staff** ở 375 px: không tràn ngang; cuộn hết cỡ thì nút nổi của trợ lý không đè lên nút ✓ ✕ nào (bốn nút kiểm tra).
- Các điểm khác (modal Resident information, hộp xác nhận, bảy template, sáng và tối) đã đo ở các mục trên.
- **Ghi nhận**: khi đo, kho của Alex có thêm một claim Covered Spot Upgrade tạo lúc đo, do người dùng tự thử trên trang (phiên nhánh đang nghỉ); giữ nguyên, không phải dữ liệu thử của kịch bản.

## Hết hạn khi đang chờ duyệt (Phase 5.2), 16/11/2026
Priya nhận Covered Spot Upgrade (Pending), rồi ngày kết thúc deal được đặt ở quá khứ (đúng cách Staff kết thúc một deal mẫu: `eso-pm-ends`). Dữ liệu đã trả lại.
- **Cư dân**: deal biến khỏi danh sách; claim chuyển sang "Used / Expired" với nhãn "Expired" ("Expired Nov 15, 2026, 11:59 PM"). **Khoảng trống (L3, đã sửa)**: cửa sổ các bước vẫn chỉ nói "Awaiting staff approval · Waiting" mà không nhắc deal đã hết. Nay thêm: "Your claim was made before it ended. Ask the property team if it will still be honored." (có nút Ask staff).
- **Staff**: claim vẫn ở "Current claim" của modal (để còn quyết định), khối Checks báo "✕ The deal is not running now", có Confirm / Apply by hand / Reject. Đạt.
- **Chuông của Alex hiện 32**: là nguồn thông báo mẫu của ứng dụng (vé đỗ xe, thanh toán, yêu cầu...), không do các lượt thử tạo ra.

## Tiếp cận (kiểm bằng script, 16/11/2026)
Với mỗi cửa sổ: hộp thoại có tên và là modal, tiêu điểm vào bên trong, mọi nút, liên kết, ô nhập có tên đọc được, tab nối đúng với panel (aria-controls, aria-selected, aria-labelledby), không có id trùng, ảnh có alt.
- **Modal Resident information của Staff** (Profile, Resident reward, Ticket): 0 lỗi.
- **Cửa sổ của cư dân** (deal, My rewards, các bước, hộp "Cancel this claim?"): 0 lỗi. Hộp huỷ vào "Keep claim"; bấm Keep thì tiêu điểm trở về cửa sổ các bước.
- **Gợi ý nhỏ, đã làm**: tên người trong tab Resident reward ("Alex Rivera", "Same unit: Jamie Rivera") nay là đề mục (h3, cùng cỡ chữ), người dùng đọc màn hình nhảy theo đề mục được; đã xem trên giao diện thật.
- **Vẫn chưa thử**: đọc màn hình thật (NVDA, VoiceOver) và bàn phím ảo trên điện thoại thật.

## Quét lỗi console và độ bền khi kho hỏng (16/11/2026)
- **Quét lỗi console**: duyệt Staff (dashboard, tickets, promotions, social, messages) và cư dân (home, tickets, messages, social, notifications, promotions): **không có lỗi mới**. Chỉ còn các lỗi cũ của phiên bản đã sửa (một lỗi `claimDlg` của cư dân, hai lỗi sự kiện giả của script thử).
- **Kho hỏng**: đặt giá trị sai định dạng cho `eso-res-promo:res-1` ("{bad json"), `eso-pmclaims` (không phải mảng), `eso-pm-claimstate` ("[1,2,3]"), `eso-pm-audit-v1` ("garbage"), `eso-pm-load`. Trang cư dân vẫn dựng đủ 25 deal, thanh trên cùng đủ, My rewards báo "Nothing claimed yet" (bản ghi hỏng coi như rỗng), không lỗi console. Hộp Claims của Staff hiện "No claims here", không lỗi. Dữ liệu đã trả về bản gốc.
- **Lỗi tìm thấy (L4, mất dữ liệu) và đã sửa**: khi bản ghi của cư dân hỏng (cắt dở, không phải JSON), claim mới **ghi đè bản hỏng bằng bản sạch và xoá mất claim cũ**, trong khi Staff vẫn giữ claim cũ trong hộp Claims (hai bên lệch). Sửa: bản ghi có nhưng không đọc được **không bao giờ bị ghi đè**: nhận hoặc huỷ bị từ chối với câu "Your saved claims on this device could not be read, so nothing was changed. Reload the page; if this stays, contact the property team."; cư dân mới (chưa có bản ghi) vẫn nhận bình thường. Hộp Claims của Staff khi đọc hỏng giữ bản hỏng ở khoá `eso-pmclaims-unreadable` trước khi dựng bản sạch. Đã thử trực tiếp (cắt đôi bản ghi của Alex rồi bấm Claim: bị từ chối, bản ghi không đổi; đã trả lại). Test: tests/promotions/promotions-unreadable.test.mjs.

## Đợt tìm lỗi (bắt đầu 16/11/2026, mục tiêu: tìm thật nhiều lỗi rồi sửa)
| # | Hướng thử | Kết quả |
|---|---|---|
| 1 | Fuzz lõi claim, huỷ, Confirm, Apply, Reject, Move back (120 chuỗi x 80 bước, bốn cư dân thật, deal gần hết suất) với các bất biến: suất trong nhật ký bằng số claim đang giữ suất; không bán quá số suất; một căn hộ không vượt giới hạn; mỗi claim trả suất tối đa một lần; thứ cư dân đọc đúng bằng mô hình; không ném lỗi | **Không vi phạm**. Hàng trăm lần chạy vào nhánh từ chối, lùi, nhận lại. Lưu ý: bộ test dùng id cư dân không có trong app thì suất không được đếm (kho chỉ đếm cư dân có trong danh sách persona), nên bộ fuzz chỉ dùng cư dân thật. Test: tests/promotions/promotions-fuzz.test.mjs |
| 2 | Fuzz chat hỗ trợ (150 chuỗi: hỏi về claim, gửi, nhận, trả lời, giải quyết, kết thúc, chuyển, ghi quyết định): mỗi cư dân tối đa một chat mở, số ticket không trùng, số chưa đọc không âm, cửa sổ chi tiết vẽ được (ticket không lặp, chat hiện tại đúng một lần) | **Không vi phạm**. Test: tests/promotions/promotions-fuzz-chat.test.mjs |
| 3 | Dữ liệu cực đoan trên giao diện: lý do 197 ký tự (120 chữ A liền, emoji, chữ Ả Rập và Do Thái, 60 chữ B liền), xem ở 375 px | **Hai lỗi, đã sửa** (L5, L6 dưới đây) |
| 4 | **Nhất quán giữa bốn kho** (bản ghi cư dân, hộp Claims, kho trạng thái, nhật ký) sau **74 bước hỗn hợp chạy qua đường thật**: cư dân nhận, nhận lại, huỷ bằng mã lõi; Staff Verify, Reject (có lý do), lùi Verify, Mark redeemed, Move back bằng **chính các nút trong khung chi tiết của hộp Claims**; sau mỗi bước so: trạng thái trong hộp Claims bằng trạng thái cư dân đọc (kể cả claim đã huỷ phải là "Cancelled by resident"), số suất trong nhật ký bằng số claim đang giữ suất (so theo thay đổi từ nền), claim của Alex không đổi | **Không sai lệch** ở 74 bước. Các thao tác ngoài trạng thái (nút không có) đều đúng là không có nút. |
| 5 | **Xuất CSV với chữ lạ**: 3000 ô ngẫu nhiên (dấu phẩy, nháy kép, xuống dòng, ký tự công thức, khoảng trắng đầu cuối, emoji, chữ Ả Rập và Do Thái, chữ dài) và 200 tệp đầy đủ, đọc lại bằng một bộ đọc CSV độc lập (RFC 4180) | **Không lỗi**: mỗi ô đọc lại đúng chữ gốc (ký tự công thức có nháy đơn đứng trước), mỗi dòng đủ cột, không ô nào mở đầu bằng công thức. Test: tests/promotions/promotions-fuzz-csv.test.mjs |
| 6 | **Thời gian lạ** (NaN, null, chuỗi, ngoài phạm vi, vô cực) đi vào các hàm hiển thị thời gian | **Hai lỗi, đã sửa** (L7, L8 dưới đây) |

**Một sự cố của bộ thử (không phải lỗi ứng dụng)**: lần đầu bộ thử nhấn nút "đầu tiên hiển thị" nên trúng biểu tượng Verify/Reject trên **dòng đầu danh sách (claim Mallard của Alex)**, làm claim đó bị Reject trong lúc thử. Đã trả lại từ bản sao lưu (kho giống hệt, Alex: hai claim Pending) và sửa bộ thử chỉ nhấn nút trong khung chi tiết, thêm điều kiện "claim của Alex không được đổi". Bài học: mọi bộ thử điều khiển giao diện phải nhắm đúng phần tử theo dòng và có hàng rào bảo vệ dữ liệu thật.

**L5 (cư dân)**: đoạn "Claimed just now. AAAA…" trong My rewards **tràn 752 px** ra ngoài khung và cửa sổ deal có thanh cuộn ngang (dòng "Not approved … Reason: …" không xuống dòng). Sửa: các đoạn chữ do người viết (trạng thái, lỗi, ngày hết hạn, ghi chú của thẻ) cho phép xuống dòng giữa từ. Thử lại: cửa sổ deal, My rewards và các bước đều không tràn, emoji và chữ hai chiều hiển thị đúng.
**L6 (Staff)**: tab **History claimed** trong modal Resident information có thanh cuộn ngang với cùng lý do. Sửa: mọi đoạn chữ trong modal xuống dòng giữa từ. Thử lại: hết cuộn ngang. Hộp Claims và thẻ chat của cư dân vốn không lỗi. Test: tests/promotions/promotions-undo.test.mjs.

**L7 (hiển thị thời gian)**: các hàm `formatTime, formatFull, dayKey, dayLabel, listTime` của Messages **ném lỗi** ("Invalid time value") với thời gian hỏng (NaN, chuỗi, ngoài phạm vi), còn `duration` và `formatBytes` in ra "NaN d", "NaN MB", "Infinity". Sửa: có hàm `isTime`; thời gian hỏng thành chữ rỗng hoặc "Unknown date", thời lượng hoặc kích thước hỏng thành "under 1 min" hoặc "0 B". Một số lạ như 53 trường hợp thử trước khi sửa, 0 sau khi sửa. Test: tests/promotions/promotions-fuzz-time.test.mjs.
**L8 (khung chat vỡ giữa chừng)**: `new Date(m.at).toISOString()` ở `renderLog` cũng ném lỗi, nên một tin nhắn có thời gian hỏng **làm khung chat chỉ dựng được 2 trong 9 tin** (phần còn lại biến mất, console báo RangeError). Đã tái hiện bằng cách làm hỏng thời gian của hai tin của Priya trong kho. Sửa: hàm `isoOf` (rỗng khi không phải thời gian), thay cho mọi `new Date(...).toISOString()` trên dữ liệu đã lưu trong chat, danh sách và Ticket box (sáu chỗ ở app.js, bốn chỗ ở tickets.js), cộng khống chế xuất CSV và nhật ký lịch sử cho giá trị quá lớn. Thử lại: khung chat dựng đủ (số tin bằng bản gốc), không lỗi mới. Dữ liệu đã trả lại. Test chặn lỗi quay lại: không file nào còn dùng `new Date(giá trị lưu).toISOString()` không bảo vệ.

## Dữ liệu lưu bị hỏng từng trường (16/11/2026)
Hướng 7 và 8: làm hỏng **từng trường** (null, chữ, danh sách, số cực lớn, đối tượng rỗng, xoá trường, cắt cụt) của các kho rồi gọi mọi hàm đọc và hành động. Kho promotions: 250 bản hỏng (đã thử đến 1500), mọi hàm đọc và hành động trên bốn cư dân. Kho tin nhắn: 300 bản hỏng (đã thử đến 1500), mọi hàm danh sách, chat, cửa sổ chi tiết, Ticket box, tìm kiếm, số chưa đọc, thông báo cho mọi người dùng. Test: tests/promotions/promotions-fuzz-damage.test.mjs và promotions-fuzz-damage-chat.test.mjs.

| # | Lỗi | Sửa |
|---|---|---|
| L9 | **Treo trang**: một bản ghi claim có `count` cực lớn (1e308) làm `listPromotions` (và các danh sách duyệt claim từ 1 đến count) chạy không dứt; cả trang Staff khi nhập claim cũng vậy | `count` bị cắt ở 1000 (`MAX_CLAIMS`) khi đọc bản ghi cư dân và khi hộp Claims nhập claim; thử 250 bản hỏng chỉ mất 5 giây thay vì treo |
| L10 | **Kho tin nhắn hỏng làm mọi hàm đọc ném lỗi** (324 lần ném trên 300 bản): `prefs`, `seq`, `ticketSeq` hỏng, một tin thiếu danh sách người đã đọc (`readBy`), một cuộc chat trỏ tới người không tồn tại (cư dân, người yêu cầu, tác giả, người tham gia), cuộc chat trực tiếp chỉ còn một người | Bước sửa tối thiểu khi đọc: ở transport (sửa `prefs`, bộ đếm, danh sách tin) và ở store (`sanitize`: bỏ cuộc chat không thể thuộc về ai, cho tin có `readBy` và thời gian). Cái nào đang đúng không bị đụng. Thử trực tiếp trên trình duyệt: làm hỏng `prefs`, `seq`, một `readBy` và đổi người của chat T-1081 sang một tài khoản không tồn tại: trang Messages mở được, không lỗi console, các chat khác vẫn hiện; đã trả lại dữ liệu gốc. |

**Điều cần biết**: bước làm sạch cũng áp lên bản được ghi lại, nên một cuộc chat trỏ tới người không tồn tại sẽ **biến mất vĩnh viễn** ở lần ghi kế tiếp (chat đó vốn không hiển thị được cho ai). Chưa có chỗ lưu bản gốc của chat bị bỏ.

## Bấm rất nhanh và trang cũ ghi đè (16/11/2026)
- **Bấm liên tiếp trong cùng một nhịp** (trên giao diện thật, Priya và Morgan): nhận claim **x5** tạo **1** claim (1 sự kiện claim); Verify **x3** ra **1** sự kiện verify; Reject **x3** ra **1** reject và **1** give_back; Cancel (hộp xác nhận) **x3** ra **1** give_back. **Không lỗi.**
- **Mã hộp Claims đọc lại kho trước mỗi thao tác (L11, phòng thủ)**: trước đây trang hộp Claims giữ bản sao của mình và ghi cả bản sao đó khi có thao tác; nếu trang chưa nhận tin cập nhật (tab nền, đã gặp hai lần ở lượt trước) thì có thể ghi bản cũ đè quyết định mới. Nay `fresh()` lấy lại bản đã lưu trước mỗi cú bấm trong hộp Claims và trước mỗi lần nhập claim của cư dân. **Chưa tái hiện được lỗi gốc một cách chủ động** (trình duyệt vẫn gửi sự kiện kho cho khung bên trong, nên không tạo được trang "cũ" thật); đã thử các luồng Verify, Move back, Reject, Mark redeemed qua giao diện với mã mới: đúng, nhật ký đúng (claim, verify, unverify, verify, redeem). Test tĩnh trong tests/promotions/promotions-undo.test.mjs. Dữ liệu đã trả lại.

## Thao tác hàng loạt trong hộp Claims (16/11/2026)
**L12 (Staff, thao tác trên dòng không thấy)**: bộ chọn dòng chỉ được xoá khi đổi tab. Chọn hai dòng (Morgan và Priya), rồi **tìm "Morgan"** (danh sách chỉ còn một dòng): thanh vẫn báo "**2 selected**" và **Verify hàng loạt duyệt cả Priya**, dòng đang bị ẩn. Cùng lỗi với bộ lọc (khoảng thời gian, đồng bộ, deal), vì chúng không xoá bộ chọn. Đã tái hiện trên giao diện thật (claim của Alex không bị chạm). Sửa: `draw()` bỏ khỏi bộ chọn mọi dòng không còn trong danh sách đang hiển thị (tìm kiếm, bộ lọc, đổi tab hoặc quyết định đều làm dòng rời danh sách). Thử lại đúng kịch bản: "1 selected", chỉ Morgan được duyệt, Priya vẫn Pending. Test tĩnh trong tests/promotions/promotions-undo.test.mjs. Dữ liệu đã trả lại.

## Nhật ký đầy (16/11/2026)
**L13 (nhật ký kiểm toán)**: nhật ký giữ 5000 sự kiện mới nhất; khi đầy, sự kiện cũ nhất bị bỏ, nên **số suất tính từ nhật ký (`spotsTaken`) sai**: claim cũ bị bỏ mà give_back của nó (mới hơn) còn lại làm tổng lệch. Tái hiện bằng test (ba suất của một deal ở đầu nhật ký biến thành 0 sau khi cắt). `spotsTaken` chưa được ứng dụng dùng (chỉ để đối chiếu), nhưng nhật ký là chỗ để giải quyết tranh chấp. Sửa: phần các sự kiện bị bỏ làm với suất được cộng dồn theo từng deal vào trường `base` của chính nhật ký, `spotsTaken` cộng thêm `base`; mã của Staff (`auditAdd`) cũng giữ và cập nhật `base` khi nó ghi. `base` hỏng được bỏ qua. Test: tests/promotions/promotions-audit-cap.test.mjs (nhật ký gần đầy dựng sẵn, nhanh).

## Dữ liệu lạ: mã dài và mã HTML (16/11/2026)
**L14 (Resident, My rewards)**: một mã dài không có khoảng trắng (65 ký tự) bị giữ một dòng (`whitespace-nowrap`) nên đẩy thẻ rộng ra, tạo thanh cuộn ngang. Sửa: ô mã `[data-code]` có `min-w-0 flex-1 wrap-anywhere`, mã ngắt dòng trong thẻ (3 dòng, không cuộn ngang). Test tĩnh trong tests/promotions/promotions-undo.test.mjs.

**HTML trong dữ liệu: an toàn (không phải lỗi)**: tạo claim của Morgan với tên, căn hộ và mã chứa `<b>`, `<img src=x onerror=...>`. Đã xem hộp Claims của Staff (dòng, chi tiết, mắt), các màn Resident (deal, My rewards, các bước), thẻ claim trong chat và cửa sổ Resident information (tab Resident reward): tất cả hiện **như chữ thường**, không có thẻ `img` hay thuộc tính `on*` được tạo ra, `window.__xss` vẫn 0. Dữ liệu đã trả lại đúng như trước (Alex còn hai claim Pending, T-1086/T-1087 nguyên).

## Một suất mỗi căn hộ: nhả suất (16/11/2026, không có lỗi mới)
Hướng: người giữ suất của căn hộ huỷ, bị Reject, hoặc đã được Verify; người cùng căn hộ (Jamie) claim, người đầu claim lại. Kết quả đúng: sau **Cancel** hoặc **Reject** căn hộ được nhả (Jamie claim được, Alex sau đó bị chặn, nhật ký giữ đúng 1 suất); claim đã **Verify** không huỷ được ("Only a claim that is waiting can be cancelled") và không trả suất; người bị Reject claim lại được (pending). Giữ lại làm test: tests/promotions/promotions-unit-release.test.mjs (4 test). Đây là lượt không có lỗi mới thứ 2 liên tiếp trong số các lượt gần đây (lượt trước là kiểm HTML, chỉ có L14 về mã dài).

## Deal có giới hạn tổng, những suất cuối (16/11/2026, không có lỗi mới)
Hướng: `parking1` (mẫu còn 3 suất) đi qua claim của ba cư dân, deal đầy, claim bị từ chối vì đầy, Cancel, Reject, claim lại cho đến đầy lần nữa, và Jamie (cùng căn hộ với Alex) bị chặn ở mọi bước. Ở **mọi bước** số suất còn lại trên thẻ đúng bằng 3 trừ số suất nhật ký đang giữ (`spotsTaken`); claim bị từ chối không lấy suất. Giữ lại làm test: tests/promotions/promotions-soldout.test.mjs. Đây là lượt thứ 2 liên tiếp không có lỗi mới.

## Hàng hỏng trong hộp Claims của Staff (16/11/2026)
**L15 (Staff, hộp Claims)**: hộp Claims chỉ lọc hàng không có `rk`; một hàng đã lưu có trường sai kiểu vẫn vào danh sách. Thử trên trang thật (6 hàng hỏng: tên null/số, thời gian chữ/null, trạng thái lạ, deal và mã null, căn hộ null): trang không sập nhưng hiện "**Invalid Date**", "Unit ••", tên "12", và hàng có trạng thái lạ **chỉ thấy ở tab All** (không ở tab nào khác, kể cả Pending). Đọc mã cho thấy còn chỗ nguy hiểm hơn: hàng **không có `rid` và `code` là null** làm `c.code.replace` ở bước nạp **ném lỗi và dừng cả mã hộp Claims** (chưa tái hiện trên trang vì thử bằng hàng có rid; xác nhận bằng đọc mã); tên thiếu làm `localeCompare` của sắp xếp "Resident A–Z" ném lỗi. Sửa: hàm `tidy()` đưa mọi hàng về đúng kiểu khi đọc (nạp trang, `fresh()`, tin cập nhật từ tab khác): tên/căn hộ/mã/deal là chữ (mặc định "Resident", "—", "", "gone:…"), thời gian là số hữu hạn (không thì lấy giờ hiện tại), trạng thái phải là một trong bốn (không thì Pending), `sync` là true/false. Thử lại trên trang thật với 7 hàng hỏng (có cả hàng không rid, mã null): không còn "Invalid Date", mọi hàng hiện ở tab Pending (tab All 9, Pending 9), không lỗi. Test tĩnh trong tests/promotions/promotions-undo.test.mjs (và hai test cũ cập nhật theo mã mới). Dữ liệu đã trả lại.

## Hộp Claims nhập từ bản ghi cư dân và kho quyết định bị hỏng (16/11/2026)
**L16 (Staff, hộp Claims nhập dữ liệu)**: hộp Claims nhập claim từ bản ghi của từng cư dân (`eso-res-promo:<id>`) và nhận quyết định từ kho trạng thái (`eso-pm-claimstate`). Với bản ghi hỏng từng trường (mã là đối tượng, `codes` là chuỗi, `count` là chữ, lý do và `manual` là đối tượng, thời gian chữ hoặc đối tượng), trang không sập nhưng **in "[object Object]" làm mã và lý do**, một chuỗi `codes` bị đọc từng ký tự ("abc" cho mã "b", "c"), thời gian chữ được chép vào `vt`, và quan trọng hơn trang **ghi chuỗi hỏng đó ngược lại vào kho quyết định** (lý do "[object Object]" của Reject, `manual` của Verify), nên dữ liệu hỏng thành dữ liệu "thật" và cư dân sẽ đọc nó. Sửa: `fromRes` chỉ nhận chữ hoặc số (`tx()`) cho mã, lý do, `manual`; thời gian chỉ nhận số hữu hạn (`nm()`); `codes` chỉ đọc khi là đối tượng hoặc danh sách. Thử lại trên trang thật từ kho sạch với đúng dữ liệu hỏng đó: không còn "[object Object]", mã và lý do rỗng, kho quyết định ghi lý do rỗng. Test tĩnh (promotions-undo; promotions-integrity cập nhật theo mã mới). Dữ liệu đã trả lại, đối chiếu giống hệt.

**L17 (Staff, phần còn sót của L16)**: gọi các hàm của hộp Claims với bản ghi cư dân hỏng (`who.name` là đối tượng, `who.unit` là danh sách, `count` 1e308) cho thấy L16 chưa phủ tên và căn hộ: `String(who.name||"Resident")` vẫn in "**[object Object]**" làm tên và "1" làm căn hộ (từ `[1]`). Sửa: tên và căn hộ cũng đi qua `tx()` (chỉ chữ hoặc số, mặc định "Resident" và "—"). Thử lại trên trang thật: 0 chỗ "[object", tên "Resident", căn hộ "—". Cùng lượt: `count` 1e308 vào hộp Claims chỉ tạo 1000 hàng (giới hạn L9), các hàm thống kê, danh sách, tra cứu mã không ném lỗi. Test tĩnh trong promotions-undo. Dữ liệu đã trả lại, đối chiếu giống hệt.

**L18 (Staff, chi tiết claim)**: `tidy()` (L15) mới phủ tên, căn hộ, mã, thời gian tạo, trạng thái. Mở chi tiết của ba hàng hỏng các trường còn lại (lý do là đối tượng/danh sách, ghi chú là đối tượng/số, `vt`/`jt` là chữ hoặc 1e20, `manual` là chuỗi hoặc đối tượng có `by`/`at`/`reason` sai kiểu): chi tiết in "**Reject reason [object Object]**", "**Applied by hand [object Object] [object Object], Invalid Date**" và "Staff, Invalid Date". Sửa: `tidy()` cũng ép lý do và ghi chú về chữ, bỏ `vt/jt/rt` không phải số hợp lệ, và đưa `manual` về `{by, at, reason}` (một chuỗi thành "Property team" với giờ quyết định; thứ không dùng được thì bỏ). Thử lại trên trang thật với đúng ba hàng đó: chi tiết sạch ("Applied by hand: str / Property team, just now"), không lỗi script. Test tĩnh trong promotions-undo. Dữ liệu đã trả lại, đối chiếu giống hệt.

## Hai bản xuất CSV riêng của Staff (16/11/2026)
**L19 (Staff, xuất CSV)**: bản xuất chính (`claims-csv.js`) đã chặn công thức và xử lý xuống dòng, nhưng Staff còn **hai bản xuất CSV tự viết** khác: nút "Export claimers (CSV)" của bảng vòng đời deal (`csvOf`) và "Download claimers CSV" của trang Storage (`csv(m)`). Cả hai chỉ đặt dấu ngoặc khi có dấu phẩy, nháy kép hoặc `\n`: tên, căn hộ hoặc mã bắt đầu bằng `=` `+` `-` `@` thì **Excel/Sheets chạy nó như công thức** (ví dụ tên `=HYPERLINK(...)`), và dấu `\r` không được đặt trong ngoặc. Tái hiện trên trang thật: hàng có tên `=HYPERLINK("http://x","hi")`, căn hộ `+1`, mã `@SUM(A1)` xuất ra nguyên văn. Sửa: hàm ô `csvCellS` (cùng luật với `csvCell` của bản chính: dấu `'` đứng trước ô nguy hiểm, ngoặc cho dấu phẩy, nháy, xuống dòng, khoảng trắng đầu/cuối) dùng cho cả hai nơi. Thử lại: ô thành `'=HYPERLINK(...)`, `'+1`, `'@SUM(A1)`. Test tĩnh trong promotions-undo, so `csvCellS` với `csvCell` trên 14 giá trị. Dữ liệu đã trả lại, đối chiếu giống hệt.

## Hai tab, một tab cũ (16/11/2026, không có lỗi mới)
Hướng: tab cũ của ba cư dân cùng thấy deal `parking1` "còn 3 suất", rồi lần lượt claim trong khi các tab kia đã lấy suất; sau đó tab cũ của người đã claim và tab của Jamie (nạp trước khi deal đầy) claim lại. Claim kiểm tra **kho**, không tin trang: ba claim đầu thành công, các lần sau bị từ chối (đầy hoặc cùng căn hộ) và nhật ký giữ đúng 3 suất. Thêm vào tests/promotions/promotions-soldout.test.mjs. Chưa có cách thử hai tab ghi **cùng lúc** (JavaScript một luồng: mỗi claim chạy trọn vẹn trước khi tab kia chạy), nên "tranh nhau suất cuối" thực chất là tuần tự và đã được phủ.
**Ghi nhận, không sửa**: xuất sự kiện đầy đủ trên trang Storage (`new Date(endAt(m)).toISOString()`) sẽ ném lỗi nếu ngày kết thúc của một deal đã lưu không phải ngày hợp lệ (nút không tải gì, không báo). Ngày kết thúc đến từ ô ngày của form Staff nên chỉ gặp khi kho bị sửa tay; chưa đáng sửa.

## Đã đọc / chưa đọc, huy hiệu và chuông (16/11/2026, không có lỗi mới)
Hướng: 40 chuỗi ngẫu nhiên (80 bước, có hạt giống) gồm cư dân hỏi về claim, gửi tin, Staff nhận và trả lời, **đánh dấu đã đọc / chưa đọc**, tắt tiếng. Sau mỗi bước, cho cả bốn cư dân và Staff: số trên huy hiệu (`badgeCount`) không âm và không vượt tổng số tin chưa đọc của các chat người đó thấy; "mark as read" luôn để lại 0; "mark as unread" thêm tối đa một tin; mỗi thông báo của chuông (`alertsFor`) không báo nhiều tin chưa đọc hơn chat đang có. Tất cả đúng. Test: tests/promotions/promotions-fuzz-unread.test.mjs.
**Ghi nhận, không sửa (cần quyết định sản phẩm)**: Reject một claim đã "Synced" (Staff, chi tiết hoặc hàng loạt, hoặc từ chat) **âm thầm đặt Synced về không**, trong khi "Move back to Pending" lại từ chối claim đã sync ("Undo the sync first"). Hai đường xử lý khác nhau: hệ thống ngoài vẫn thấy claim hợp lệ sau khi cư dân bị từ chối. Chưa sửa vì chưa rõ muốn chặn Reject hay chỉ cảnh báo.

## Tin đã thu hồi hoặc đã ẩn vẫn tính là chưa đọc (16/11/2026)
Lượt trước ghi "fuzz đã đọc/chưa đọc không có lỗi" nhưng fuzz đó chỉ gửi tin, không thu hồi hay ẩn tin (và `setMuted` không có trong store, nên phần tắt tiếng thực ra không được thử). Lượt này thêm các thao tác đó.

**L20 (huy hiệu, danh sách, chuông)**: cư dân gửi tin rồi **thu hồi** (`unsend`) trước khi Staff đọc: `unreadCount` vẫn tính tin đã thu hồi (chữ rỗng) nên huy hiệu và dòng danh sách của Staff báo **1 tin chưa đọc** cho một tin không còn, và mở chat thì không có gì để đọc. **L21**: tin được người xem ẩn bằng "Delete for me" (`hideMessage`) cũng vẫn tính chưa đọc cho chính người đã ẩn nó. Sửa: `unreadCount` (và qua nó `badgeCount`, hàng danh sách, `alertsFor`, nay dùng cùng một hàm đếm thay vì tự đếm) bỏ tin đã thu hồi và tin người xem đã ẩn; "Mark as unread" bỏ qua hai loại đó; vạch "tin mới" khi mở chat (`app.js`) không neo vào tin đã thu hồi. Test: tests/promotions/promotions-unsent-unread.test.mjs (3 test, hai test đầu đỏ trước khi sửa). Mở lại trang Messages của Staff: ba chat T-1081, T-1086, T-1087 nguyên, không lỗi.
