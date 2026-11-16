# Cỡ theo thiết bị (cấu hình)

Ba thiết bị dùng để kiểm: **mobile 375**, **tablet 830**, **desktop 1440** (sáng và tối).

| Thiết bị | Chiều rộng | Ảnh đại diện ở trang Profile | Nút máy ảnh |
|---|---|---|---|
| Mobile | dưới 768 px | 64 px | 24 px |
| Tablet | 768 đến 1279 px | 72 px | 26 px |
| Desktop | từ 1280 px | 80 px | 28 px |

## Đối chiếu với hai bài tham khảo

Hai bài (nhanhoa.com "kích thước thiết kế website" và vietnix.vn "kích thước website") cho cùng dải: mobile 360 đến 414 px (iPhone phổ biến 375, 390, 414, 430), tablet 601 đến 1280 px (iPad dọc 768, iPad Air 820), desktop 1024 đến 1920 px (1366, 1440, 1920 là phổ biến). Điểm gãy thường dùng: 480, 768, 1024, 1280. Hai bài **không** nêu cỡ chữ, vùng chạm hay khoảng cách, nên các số đó giữ theo DESIGN.md (chữ 16 px, vùng chạm 44 px trên cảm ứng).

Ba mốc kiểm của dự án (375, 830, 1440) nằm trong dải đó, và điểm gãy 768 và 1280 trùng với bài. Ngoài ba mốc chính, đã kiểm thêm không tràn ngang ở **360, 414, 820, 1024, 1920** trên Staff, Client, Resident Settings, Messages, Notifications và Social.

## Cỡ đang dùng

Các giá trị nằm ở **một chỗ**: đầu `src/staff/account-settings.quality.css`, thành biến `--eso-pf-avatar` và `--eso-pf-cam` (đổi số là đổi cả ba thiết bị). Chữ trong ảnh đại diện tự co theo (28% cỡ ảnh).

Khi có thêm phần tử cần chỉnh theo thiết bị, thêm biến cùng kiểu `--eso-<chỗ>-<thuộc tính>` vào khối này, không viết số cứng trong từng trang.

Cỡ chữ mặc định là 16 px ở cả ba thiết bị; cài đặt Personalize (Text) mới đổi cỡ chữ, và nó được lưu theo trình duyệt (`ui-prefs:<portal>`). Nếu một trang trông to bất thường, kiểm tra cài đặt đã lưu trước.
