---
name: EasySpotOps
version: alpha
description: Hệ thiết kế vận hành bãi đỗ — một dải điều hướng tối cố định, một canvas sáng để đọc hàng giờ.
colors:
  background: "oklch(0.972 0.0062 255.47)"
  foreground: "oklch(0.2615 0.051 261.32)"
  foreground-secondary: "oklch(0.35 0 0)"
  card: "oklch(1 0 0)"
  muted: "oklch(0.945 0.0069 247.9)"
  border: "oklch(0.9286 0.0155 257.2)"
  primary: "oklch(0.5286 0.2385 266.1)"
  primary-foreground: "oklch(1 0 0)"
  primary-on-dark: "oklch(0.7653 0.1192 269.23)"
  accent: "oklch(0.9612 0.0182 269.09)"
  ring: "oklch(0.5461 0.2152 262.88)"
  sidebar: "oklch(0.2092 0.0412 268.13)"
  sidebar-foreground: "oklch(1 0 0)"
  sidebar-accent: "oklch(0.2615 0.051 261.32)"
  sidebar-border: "oklch(0.2917 0.0402 267.88)"
  sidebar-ring: "oklch(0.6432 0.1901 264.12)"
  surface-inverted: "oklch(0.2077 0.0398 265.75)"
  surface-inverted-foreground: "oklch(0.9842 0.0034 247.86)"
  surface-inverted-accent: "oklch(0.6938 0.1604 272.17)"
  success-text: "oklch(0.515 0.1287 155.44)"
  success-bg: "oklch(0.971 0.0165 156.92)"
  warning-text: "oklch(0.5558 0.1239 64.52)"
  warning-bg: "oklch(0.9761 0.022 80.69)"
  danger-text: "oklch(0.5613 0.1633 30.57)"
  danger-bg: "oklch(0.9683 0.0157 32.01)"
  info-text: "oklch(0.4882 0.125 258)"
  info-bg: "oklch(0.9319 0.026 256)"
  neutral-text: "oklch(0.4455 0.0374 257.28)"
  neutral-bg: "oklch(0.9595 0.008 253.85)"
  destructive-on-light: "oklch(0.5054 0.1905 27.52)"
  warning-on-light: "oklch(0.4732 0.1247 46.2)"
typography:
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.375
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  small:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.333
  micro:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.455
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.333
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
spacing:
  card: "16px"
  card-sm: "12px"
components:
  button-default:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
  button-ghost:
    textColor: "{colors.foreground}"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
  button-inverse:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
  button-soft:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
  button-touch:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "32px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "16px 0"
  sidebar-item-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.sidebar-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 10px"
  button-ghost-hover:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
  label-secondary:
    textColor: "{colors.foreground-secondary}"
    typography: "{typography.label}"
  separator:
    backgroundColor: "{colors.border}"
    height: "1px"
  focus-ring:
    backgroundColor: "{colors.ring}"
    height: "3px"
  badge-success:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success-text}"
    typography: "{typography.small}"
    padding: "2px 8px"
  badge-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning-text}"
    typography: "{typography.small}"
    padding: "2px 8px"
  badge-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger-text}"
    typography: "{typography.small}"
    padding: "2px 8px"
  badge-info:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.info-text}"
    typography: "{typography.small}"
    padding: "2px 8px"
  badge-neutral:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.neutral-text}"
    typography: "{typography.small}"
    padding: "2px 8px"
  chip-on-white-destructive:
    backgroundColor: "{colors.card}"
    textColor: "{colors.destructive-on-light}"
    typography: "{typography.small}"
  chip-on-white-warning:
    backgroundColor: "{colors.card}"
    textColor: "{colors.warning-on-light}"
    typography: "{typography.small}"
  sidebar:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-foreground}"
    typography: "{typography.body}"
  sidebar-item-hover:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.sidebar-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
  sidebar-separator:
    backgroundColor: "{colors.sidebar-border}"
    height: "1px"
  sidebar-focus-ring:
    backgroundColor: "{colors.sidebar-ring}"
    height: "3px"
  surface-inverted:
    backgroundColor: "{colors.surface-inverted}"
    textColor: "{colors.surface-inverted-foreground}"
    typography: "{typography.body}"
  button-on-inverted:
    backgroundColor: "{colors.surface-inverted}"
    textColor: "{colors.surface-inverted-accent}"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    height: "32px"
  text-primary-on-dark:
    backgroundColor: "{colors.surface-inverted}"
    textColor: "{colors.primary-on-dark}"
    typography: "{typography.small}"
---

# Design System: EasySpotOps

## Overview

**North Star: "The Control Room"** — phòng điều hành, không phải trang giới thiệu.

| Bề mặt                   | Vai trò                   | Token             | Đảo theo dark |
| ------------------------ | ------------------------- | ----------------- | ------------- |
| Dải điều hướng `#10172b` | ĐỊNH HƯỚNG (cố định trái) | Control Room Navy | —             |
| Canvas `#f3f6fa`         | LÀM VIỆC (đọc hàng giờ)   | Operations Canvas | ●             |

Hai bề mặt KHÔNG đổi vai cho nhau.

- Mật độ cao = tính năng: nút `32px` · chữ nút `12px` · đệm thẻ `16px`.
- Nấc chạm riêng `44px`/`48px`, nở theo CON TRỎ: chuột `32px` · ngón tay `44px` (→ Touch Tier).
- WCAG AA: `34` route sau đăng nhập + `8` route công khai = `0` vi phạm (probe DOM thật). Là KHOÁ, không phải mục tiêu.
- Mọi bậc thang DẪN XUẤT từ một biến gốc, không bậc nào viết tay.
- Màu chủ đạo bão hoà, dùng hiếm. Phản hồi khi chạm là bắt buộc.

## Colors

Một xanh tím bão hoà làm điểm chỉ dẫn duy nhất, trên dải trung tính lạnh, + `4` cặp trạng thái nền-nhạt/chữ-đậm ép đạt AA.

### Token

| Nhóm      | Tên                 | Giá trị                       | Vai trò                                                                                  |
| --------- | ------------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| Primary   | Patrol Blue         | `oklch(0.5286 0.2385 266.1)`  | Mục ĐANG CHỌN (nav) · nút hành động chính · vòng focus = "đang ở đây / bấm tiếp đây"     |
| Primary   | Patrol Blue on Dark | `oklch(0.7653 0.1192 269.23)` | Bản đặt TRÊN bề mặt tối (bản gốc thiếu tương phản)                                       |
| Secondary | Signal Wash         | `oklch(0.9612 0.0182 269.09)` | Nền pha loãng: nút mềm · chip đang chọn · vùng nhấn nhẹ (thay Patrol Blue đặc diện rộng) |
| Neutral   | Operations Canvas   | `oklch(0.972 0.0062 255.47)`  | Nền trang (không trắng ⇒ thẻ trắng nổi không cần bóng)                                   |
| Neutral   | Deep Ink            | `oklch(0.2615 0.051 261.32)`  | Chữ chính · nền nút `inverse` · hover nav                                                |
| Neutral   | Card White          | `oklch(1 0 0)`                | Thẻ, popover (tương phản với canvas vẽ ranh giới lớp)                                    |
| Neutral   | Hairline            | `oklch(0.9286 0.0155 257.2)`  | Viền, đường chia, viền ô nhập                                                            |
| Neutral   | Control Room Navy   | `oklch(0.2092 0.0412 268.13)` | Dải nav. CỐ ĐỊNH, không đảo theo dark                                                    |

### Cặp trạng thái (bản light; đảo theo dark)

| Tên          | Chữ                          | Nền                          | Nghĩa                                   |
| ------------ | ---------------------------- | ---------------------------- | --------------------------------------- |
| Clear Green  | `oklch(0.515 0.1287 155.44)` | `oklch(0.971 0.0165 156.92)` | Xong · còn trống · giấy phép còn hạn    |
| Hold Amber   | `oklch(0.5558 0.1239 64.52)` | `oklch(0.9761 0.022 80.69)`  | Chờ duyệt · sắp hết hạn · vượt ngưỡng   |
| Citation Red | `oklch(0.5613 0.1633 30.57)` | `oklch(0.9683 0.0157 32.01)` | Vi phạm · cẩu kéo · không hoàn tác được |
| Log Blue     | `oklch(0.4882 0.125 258)`    | `oklch(0.9319 0.026 256)`    | Thông tin · nhật ký · trung lập cần đọc |

Log Blue tách khỏi Patrol Blue bằng CHROMA (`0,125` vs `0,2385`) + hue lệch `8°`, không phải bằng đổi sang hue khác (`DOC-a541e5e63672-R03`; trước đó `C 0,217`, lệch `1,7°` ⇒ "thông tin" đọc như "bấm được"). Dark: chữ `oklch(0.82 0.075 258)` · nền `oklch(0.28 0.06 258)`.

### Named Rules

| Rule                                    | Luật                                                                                                                                                                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fixed Surface**                       | Bề mặt KHÔNG đảo ⇒ token đặt lên cũng KHÔNG đảo (nav, dải tối trang công khai). Ghép token ĐẢO (`text-foreground`, `text-muted-foreground`) lên chúng = nguồn của `20`/`22` ca tương phản hỏng trước khi về `0`. |
| **One Beacon**                          | Patrol Blue đặc chỉ ở MỘT chỗ/màn: mục đang chọn ∨ hành động chính. Chỗ thứ hai ⇒ Signal Wash.                                                                                                                   |
| **Tonal Pair** (`DOC-c074ed99482a-R06`) | Nền + chữ CÙNG sắc ở HAI ĐẦU thang sáng (xem bảng dưới).                                                                                                                                                         |

**Tonal Pair** (quốc tế: _tonal_/_soft_/_tinted_):

| Theme | Nền                             | Chữ + icon             |
| ----- | ------------------------------- | ---------------------- |
| Light | đầu sáng (≈ bậc `50`)           | đầu tối (≈ bậc `700`)  |
| Dark  | đầu tối (≈ bậc `950`) — ĐẢO đầu | đầu sáng (≈ bậc `300`) |

- Khoảng cách hai đầu gánh khả năng đọc (≥ `4.5:1` ở CẢ HAI theme, đo lại mỗi khi đổi token); sắc chung gánh nghĩa ⇒ không cần viền.
- Áp cho: Badge · dải cảnh báo inline · ô icon trạng thái · chip/mục đang chọn · nút mềm.
- Dùng CẶP token `--X-bg`/`--X-text` (`bg-success-bg text-success-text`); primitive pha alpha cùng sắc (`bg-primary/10 text-primary` ở Button `soft`) ⇒ chọn `variant`, không tự pha.
- Cấm: palette thô (`bg-blue-50 text-blue-700`, `UI009`) · nền tông này + chữ tông khác.
- Tông mới ⇒ thêm cặp token light ∧ dark, đo AA, rồi mới dùng.

### Biểu đồ

`--chart-1..5` là bộ màu series (`DOC-a541e5e63672-R04/R05`, thay khuôn shadcn mặc định của `DOC-db505b209fa9-R25`). MỖI SLOT MỘT HUE ở cả hai theme; chỉ L/C đổi:

| Token       | Hue    | Light (`:root`)         | Dark (`.dark`)         |
| ----------- | ------ | ----------------------- | ---------------------- |
| `--chart-1` | `266°` | `oklch(0.56 0.2 266)`   | `oklch(0.66 0.16 266)` |
| `--chart-2` | `205°` | `oklch(0.55 0.095 205)` | `oklch(0.78 0.1 205)`  |
| `--chart-3` | `70°`  | `oklch(0.62 0.125 70)`  | `oklch(0.8 0.13 70)`   |
| `--chart-4` | `335°` | `oklch(0.6 0.19 335)`   | `oklch(0.72 0.17 335)` |
| `--chart-5` | `140°` | `oklch(0.63 0.15 140)`  | `oklch(0.82 0.16 140)` |

- Light ≥ `3:1` trên Card White (`3,31`–`4,87`); dark ≥ `5,65:1` trên nền tối. Khoảng cách OKLab `ΔE` nhỏ nhất giữa hai series: light `0,159` · dark `0,154`.

- Màu không đứng một mình: có legend ∨ nhãn trực tiếp; phân biệt thêm bằng nhãn/hình khi cần.
- Quá `5` series ⇒ gộp ∨ tách biểu đồ, không tái dùng màu. Pie/donut ≤ `5` nhóm.
- Trạng thái ngữ nghĩa (đạt · cảnh báo · vi phạm) dùng cặp trạng thái ở trên, không dùng `--chart-*`.
- Các luật trên là khuyến nghị (`/ui-ux-pro-max` `chart`), chưa có gate.

## Typography

Một họ chữ duy nhất: **Inter** (`--font-heading` → `--font-sans`; fallback `ui-sans-serif`, `system-ui`, `sans-serif`). Thứ bậc do CỠ + ĐỘ ĐẬM, không do đối lập kiểu chữ. Hai bậc nhỏ nhất ĐÃ ghi đè mặc định Tailwind.

`D-R2` (huyi0 `2026-11-08`): thang đo "thuộc thang" = `11 · 12 · 14 · 16 · 18 · 20 · 24 · 30` px. `18`/`20`/`30` là bậc ĐÃ dùng thật (`text-lg` `214` · `text-xl` `154` · `text-3xl` `21` lượt), nay vào bảng để phép đo không báo nhầm; không có bậc thứ chín. Tracking âm: tiêu đề (Display · Headline · Subhead · Title-lg · Title) dùng `tracking-tight` = `-0.025em` (đo `-0.6px` ở 24 · `-0.45px` ở 18 · `-0.4px` ở 16 · `-0.35px` ở 14 khi Body làm tiêu đề); chữ thường (Body · Small · Micro) `0`. Cỡ ngoài thang (`13` · `15` · `22` · `26`…) vẫn là vi phạm.

| Bậc             | Đậm | Cỡ                                                               | Dùng cho                                                                                                                                                                                                                       |
| --------------- | --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Display         | 600 | `1.875rem`/30px (`text-3xl`)                                     | Hero, số liệu lớn (`md:text-3xl` trên Headline); chỉ ở vùng hero, không thay Headline                                                                                                                                          |
| Headline        | 600 | `1.5rem`/24px                                                    | Tiêu đề trang (1/màn). `tracking-tight` (`-0.025em` ⇒ `-0.6px`)                                                                                                                                                                |
| Subhead         | 600 | `1.25rem`/20px (`text-xl`)                                       | Tiêu đề khối lớn trong trang, hero phụ. KHÔNG làm tiêu đề trang (h1 ⇒ Headline 24px). `tracking-tight`                                                                                                                         |
| Title-lg        | 500 ∨ 600 | `1.125rem`/18px (`text-lg`)                                | Tiêu đề thẻ/section/hộp thoại cần nổi hơn Title (card "My profile", tên thread, tiêu đề hộp thoại Settings). `600` chỉ từ bậc này. `tracking-tight` (`-0.45px`)                                                                |
| Title           | 500 | `1rem`/16px `leading-snug`                                       | Tiêu đề thẻ, hộp thoại. `tracking-tight` (`-0.4px`)                                                                                                                                                                            |
| Body            | 400 | `0.875rem`/14px                                                  | Nội dung, nhãn form, ô bảng                                                                                                                                                                                                    |
| Small           | 400 | `0.75rem`/12px (`text-xs`, dòng `16px`; hạ từ `13` `2026-09-22`) | Chữ phụ, mô tả. Chữ NÚT = cùng cỡ này qua `control-text` (`--font-size-control` `12px`, `R18`; hạ từ `13` `2026-10-03`)                                                                                                        |
| Micro           | 500 | `0.6875rem`/11px (`text-2xs`, bậc repo tự thêm)                  | Badge, số trang, số liệu nhỏ nhấn mạnh                                                                                                                                                                                         |
| Label / Eyebrow | 500 | `0.75rem`/12px                                                   | Nhãn trên tiêu đề khối: viết như câu, tách bằng CỠ + MÀU (`text-muted-foreground`), KHÔNG chữ hoa/giãn chữ. Chữ hoa chỉ ở _Viết hoa mã nhập_ (`DOC-c074ed99482a-R08`). `tracking-eyebrow*` (`R04`) còn khai nhưng đã rời nhãn. |

| Rule                 | Luật                                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Named Step**       | Chữ mang KIỂU (cỡ · màu · giãn · đậm) ⇒ trỏ bậc CÓ TÊN (token tầng 1 ∨ `@utility` `packages/platform/web/ui`). `className` chỉ mang ĐỊNH VỊ (`mt-1`, `flex`, `gap-2`). Đã kéo `1219` điểm kiểu tuỳ tiện về `100`.                     |
| **Semibold Ceiling** | Trần đậm `500`; `600` chỉ từ `text-lg` (18px) trở lên. ≤ `16px` (Title, nhãn, nút, badge) dừng `500`. `font-black`/`font-bold` đã hạ toàn cây; nhấn mạnh ⇒ đổi CỠ ∨ MÀU. Gate `font-semibold-below-text-lg` (`DOC-c074ed99482a-R05`). |

**Strict Scale**: cấm giá trị LẺ ngoài thang — cỡ chữ · line-height · spacing đều qua token (`text-[13px]` · `mt-[7px]` = vi phạm).

- Cỡ chữ ≤ `3–4`/màn (`◐` chưa gate; bảng trên `9` bậc, mỗi màn dùng một phần).
- `13px` là giá trị lẻ ngoài thang `12`/`14`. Chữ nút đã hạ `13` → `12px` (`--font-size-control`, line-height giữ `16px` ⇒ nút không đổi cao; huyi0 + Jev `2026-10-03`: `0,60` vs `0,28` cho Body `14px`). Token này dùng chung cả họ control (Button · Select · Input desktop · Tab · MenuItem · Combobox · Command).

### Số liệu và ngôn ngữ

| Mục                | Luật                                                                                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ngôn ngữ giao diện | `lang="en"` ở CẢ `6` app (`app/layout.tsx`): nhãn, thông báo bằng tiếng Anh. Tiếng Việt chỉ ở tài liệu nội bộ                                                                                         |
| Số · ngày · giờ    | `Intl.*` ∨ `toLocale*String` với `"en-US"` (`≈117` lượt: `69` `DateTimeFormat` · `23` `NumberFormat` · `13` `toLocaleDateString` · `8` `toLocaleString` · `4` `toLocaleTimeString`); không format tay |
| Cột số             | `tabular-nums` cho bảng, giá, đếm giờ để cột không nhảy (đang `12` file `packages/platform/web/ui`, `86` file toàn repo)                                                                              |

## Layout

- Nav cố định + vùng nội dung cuộn. Dưới `768px` (`MOBILE_BREAKPOINT` = `md` Tailwind) nav → thanh dưới đáy. KHÔNG có thang breakpoint riêng (`sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536).
- Khoảng cách theo `--spacing` Tailwind (bội `4px`) ∧ 5 bậc có tên `step-*` (`--spacing-step-*` trong `packages/platform/web/ui/src/styles.css`; tiền tố `step-` bắt buộc vì `max-w-md` tra `--spacing` trước `--container`). Bậc không có tên (`0` · lẻ `.5` · `1.5` · `2.5` · `3.5` · `5` · ≥`7`) giữ số. Thẻ: `--card-spacing` = `16px`, `12px` ở biến thể gọn; đổi 1 biến ⇒ đổi cả đệm dọc lẫn gap khối con.
- Lưới dữ liệu dày: `gap` `8`–`12px` ⇒ trả giá bằng Grid Item Floor.

| Tên (`gap-step-md`, `p-step-lg`…) | px     | Số cũ | Dùng cho                          |
| --------------------------------- | ------ | ----- | --------------------------------- |
| `step-xs`                         | `4px`  | `1`   | hàng chữ sát nhau                 |
| `step-sm`                         | `8px`  | `2`   | gap tối thiểu (UX-02), icon ↔ chữ |
| `step-md`                         | `12px` | `3`   | đệm thẻ gọn (`card-sm`)           |
| `step-lg`                         | `16px` | `4`   | gap giữa các khối (trần), đệm thẻ |
| `step-xl`                         | `24px` | `6`   | đệm lề trang                      |

| Rule                | Luật                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Grid Item Floor** | Ô lưới mặc định `min-width: auto` ⇒ cột NỞ theo nội dung dài nhất; `truncate` ở CON không cứu (đo: tràn `350,6px`). Gỡ sàn ở CHÍNH ô lưới — nhưng chỉ khi rãnh còn sàn. `grid-cols-<N>` = `repeat(N, minmax(0,1fr))` đã sàn `0` ⇒ `min-w-0` ở đó là token chết.                                                                                                                                                                                                                                                                                                                                                                          |
| **Touch Tier**      | Không nới toàn thang. `3` nấc riêng (`44px`, `48px`, bậc icon), khai TỪNG call-site (`size="touch"` · `data-size="touch"`); mặc định primitive KHÔNG đổi. huyi0 `2026-09-24`: `44px` cho control tương tác ở CẢ `6` app (auth · website · `4` portal), thay chốt `28/32px` của `DOC-7b1e4c93d2a6`. Bảng dày giữ mật độ bằng menu gom hành động hàng, không thu vùng chạm (`DOC-2265534b1802-R27`). `44px` là vùng chạm ngón tay, không phải khung nhìn cho chuột: huyi0 `2026-09-28` (`DOC-727c3d04d605-R23`) `touch` nở theo `@media (pointer)` — `fine` `32px` (hạ từ `36px`, huyi0 `2026-09-29`) · `coarse` `44px`; primitive tự đổi. |
| **Block Gap Band**  | `gap` (cả `gap-x`/`gap-y`) giữa KHỐI anh em `flex`/`grid` ∈ `8–16px` = `gap-2`…`gap-4`, mặc định `gap-3`; CẢ `6` app lẫn `packages/platform/web/ui` (huyi0 `2026-09-27`, thay trần `24px`). Ngoài dải ⇒ chỉ hợp lệ khi thuộc ngoại lệ có ID (`DOC-4ff406833e96` §2.2) ∧ `2/3` skill (`/impeccable` · `/web-design-guidelines` · `/ui-ux-pro-max`) đồng ý. Ca ngoài catalog: phán `2/3` trước ⇒ đạt thì thêm ID ⇒ mới dùng. Audit gặp gap ngoài dải: gọi tên ngoại lệ bằng ID ∨ báo vi phạm — không có ca thứ ba.                                                                                                                         |

Ngoại lệ Block Gap (`DOC-4ff406833e96` §2.2): `R11` Chữ chồng · `R12` Trong control · `R13` Cụm inline · `R14` Ghép liền · `R15` Dày dữ liệu · `R16` Phân vùng trang · `R17` Chấm carousel · `R18` Overlay tự đệm · `R19` Field (nhãn ↔ đúng 1 control) · `R20` Dải điều hướng · `R21` Vùng tự giãn bằng margin.

### Lớp chồng (z-index)

Hiện trạng đo ở `packages/platform/web/ui` — CHƯA có token `--z-*`.

| Bậc                     | Lượt             | Dùng cho                                                                                     |
| ----------------------- | ---------------- | -------------------------------------------------------------------------------------------- |
| `z-0` · `z-10` · `z-20` | `2` · `19` · `2` | Lớp cục bộ trong nội dung                                                                    |
| `z-50`                  | `29`             | Header cố định · lớp nổi                                                                     |
| `z-[70]`                | `1`              | Widget hỗ trợ nổi (`assistant-widget.tsx`) — ngoại lệ                                        |
| `z-100` · `z-[100]`     | `2` · `1`        | Skip link (`z-100` > header `z-50`, `skip-link.tsx`) · Alert nổi `PropertyCommandCenterPage` |

Bậc mới ⇒ thêm vào bảng này TRƯỚC khi dùng. `z-[n]` tuỳ ý là nợ (đang `2`: `z-[70]`, `z-[100]`).

## Elevation & Depth

Độ nâng MÃ HOÁ THỨ BẬC, không mã hoá trạng thái: mỗi lớp có bậc bóng cố định theo vị trí trong chồng lớp. `5` bậc, tiền tố `lift` (KHÔNG ghi đè thang bóng Tailwind — tên trần đang dùng `1033` lượt).

| Bậc       | `box-shadow`                         | Lớp                             |
| --------- | ------------------------------------ | ------------------------------- |
| `lift-xs` | `0 1px 2px rgba(15, 23, 42, 0.035)`  | Thẻ, hàng trực tiếp trên canvas |
| `lift-sm` | `0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 20px rgba(15, 23, 42, 0.06)` | Panel, thẻ, chip nổi trên cover (2 lớp: sát mép + quầng) |
| `lift-md` | `0 12px 32px rgba(15, 23, 42, 0.14)` | Popover, dropdown, tooltip      |
| `lift-lg` | `0 18px 44px rgba(15, 23, 42, 0.16)` | Hộp thoại                       |
| `lift-xl` | `0 24px 70px rgba(15, 23, 42, 0.24)` | Drawer, lớp phủ toàn màn        |

Làm mờ nền sau lớp phủ: `1px` ∨ `2px` (dưới bậc nhỏ nhất Tailwind).

> **Độ lệch (trung thực):** cây hiện tại chưa khớp doctrine — `shadow-sm` chiếm `549`/`1033` lượt ⇒ phần lớn bề mặt gần phẳng, phân lớp bằng tông nền (`--card` trên `--background`) + viền `--border`. Màn mới theo thang trên; màn cũ = nợ đo được.

| Rule                                     | Luật                                                                                                                                                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Layer Not State**                      | Bậc bóng do LỚP quyết định, không do tương tác. Hover đổi nền, không nâng bậc. Nhấn "bấm được" ⇒ phản hồi nhấn (Components), không thêm bóng.                                                                               |
| **Soft Separation** (`DOC-62ec87391443`) | `3` công cụ theo thứ tự, dừng ở cái đầu đủ tách: ① khoảng trắng (`gap` ở cha) → ② tông nền (Card White trên Canvas) → ③ ring mờ `ring-1 ring-foreground/10` (mặc định mọi overlay). Viền TRANG TRÍ cấm; viền CHỨC NĂNG giữ. |

**Subtle Depth** — thấy lớp, không thấy hiệu ứng; nhận ra được cái bóng = quá tay. `◐` = chuẩn đã nhận, CHƯA có token/gate:

| Luật                 | Chuẩn                                                                                             | Hiện trạng                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Alpha thấp           | Alpha bóng ≈ `3–8%`, blur lớn                                                                     | ● `lift-xs` `3,5%` · `lift-sm` `6%`; `lift-md/lg/xl` = `14/16/24%` VƯỢT chuẩn = NỢ (token chưa đổi) |
| Nhiều tầng           | Bóng ghép nhiều lớp alpha thấp thay một lớp đậm                                                   | ◐ mỗi bậc `lift-*` hiện MỘT lớp                                                                     |
| Nền chênh một bậc    | Lớp cao hơn chênh nền một bậc; dark: càng cao càng sáng                                           | ◐ light ● (Card/Canvas `ΔL 0,028`); dark chưa có luật bậc                                           |
| Hairline + highlight | Viền hairline `1px` alpha thấp (= ring mờ, Soft Separation ③) + highlight `1px` phía trên (inset) | ◐ ring mờ ●; highlight chưa token. Card vẫn KHÔNG viền; highlight là bóng inset, không phải viền    |
| Gradient             | ≤ `1–3%` độ sáng                                                                                  | ◐ cây hiện không gradient                                                                           |

Viền chức năng:

| Loại                     | Luật                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vòng focus               | Không bao giờ bỏ (WCAG 2.4.7). `outline-none` chỉ khi kèm `focus-visible:ring-*`                                                                                   |
| Viền ô nhập              | Không bỏ (WCAG 1.4.11 đòi `3:1`). `--input` `#7f8792` ≈ `3,64:1` trên Card White (light); dark `white/40%` ≥ `3,6:1` (`DOC-b3e641ff7e34-R01`) = ĐẠT; không hạ thêm |
| Đường chia hàng bảng dày | Được làm mờ, không được bỏ                                                                                                                                         |

Border TRANG TRÍ → tông nền (`DOC-e21db82d0753`): hộp `border` + `bg-card` ⇒ ring mờ ∨ `bg-muted`; `border-b`/`border-t` đầu/chân khối ⇒ `gap` ∨ nền khác; `divide-y` danh sách ⇒ `gap-2` + hover nền (bảng thật GIỮ hairline); viền màu trạng thái ⇒ Tonal Pair + icon/chữ; `border-dashed` đóng khung ⇒ `bg-muted/40` (trừ **Dashed Slot**, § Buttons — viền đứt CHỨC NĂNG, không phải trang trí). Ngoại lệ: control, sticky header, Table*, menu divider.

- Hai lớp nền chồng lệch ≥ Card White/Canvas (`ΔL 0,028`, sàn chấp nhận). `--muted`/canvas `0,027` (`#e9edf1`, `DOC-c074ed99482a-R02`; trước `0,004` tàng hình).
- Card lồng Card (cùng `bg-card`) không tự tách ⇒ primitive tự đổi Card con sang tông `bg-muted/40` (không ring; `2026-10-18`); site khai `bg-*` thì thắng. Card trên nền `bg-card` khác mà không lồng Card ⇒ tự thêm ring mờ ∨ đổi bậc nền lớp con.

## Shapes

Bo vừa phải, nhất quán. Thang DẪN XUẤT từ `--radius` = `10px`; DỪNG ở `xl`.

| `xs` | `sm` | `md` | `lg` | `xl` |
| ---- | ---- | ---- | ---- | ---- |
| 4px  | 6px  | 8px  | 10px | 14px |

- Không viên thuốc, không thẻ bo `24px` (bo lớn = "giải trí"; phòng điều hành = "chính xác").
- Viền `1px` mọi nơi, trừ 1 utility `1.5px`. Ranh giới chủ yếu do TÔNG NỀN vẽ, viền chỉ xác nhận.
- **Derived Scale:** không bậc nào viết px thẳng; thiếu cỡ ⇒ THÊM bậc vào thang (không `rounded-[18px]`), NEVER đổi px bậc đang có (kéo hàng nghìn điểm theo).

## Components

### Buttons

| Biến thể                  | Nền                                                                             | Chữ            | Ghi chú                                                |
| ------------------------- | ------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------ |
| `default`                 | Patrol Blue                                                                     | trắng          | Primary                                                |
| `outline`                 | `--background` + ring mờ `ring-1 ring-foreground/10` (KHÔNG viền; `2026-10-03`) | PHẢI tự khai   | Đặt trên nền tối mà không khai ⇒ chữ kế thừa `1,05:1`  |
| `ghost`                   | —                                                                               | `--foreground` | Hover mới hiện nền `--muted`                           |
| `dashed`                  | trong suốt + viền ĐỨT `1px` `border-foreground/30`; hover nền `--muted`, viền `/50` | `--muted-foreground` → hover `--foreground` | Chỗ "thêm / chưa có / tuỳ chọn", E4 (→ Dashed Slot). Có ở `button.tsx` |
| `secondary`               | xám trung tính                                                                  | —              |                                                        |
| `inverse`                 | Deep Ink                                                                        | màu canvas     | Nút đậm thứ hai; dùng khi màu chủ đạo đã có ở chỗ khác |
| `soft`                    | Signal Wash                                                                     | Patrol Blue    | Bản nhẹ của primary                                    |
| `destructive` / `warning` | tông pha `10%` (KHÔNG đặc)                                                      | màu trạng thái | Nguy hiểm nhận bằng MÀU, không bằng khối đặc           |
| `on-inverted`             | token `surface-inverted-*`                                                      | —              | `2` biến thể cho nút TRÊN dải tối cố định              |

- **Hộp:** `8px`; viền trong suốt ở biến thể đặc (mọi biến thể cùng hộp); cao `32px`; đệm ngang `10px`; chữ `12px`/500 (= Small).
- **Hover:** nền còn `80%` đục. **Focus:** vòng `3px` `--ring` `50%` + viền đổi `--ring`; luôn `focus-visible`.
- **Nhấn:** LÚN `1px` (`active:translate-y-px`), trừ nút mở menu — chữ ký xúc giác, không tuỳ chọn.
- **Kích thước:** chuột `24` · `28` · `32` (mặc định) · `36` · `40`; ngón tay `44` · `48`. `touch` = `32` (chuột, = `default`) ∨ `44` (cảm ứng); lịch sử → Touch Tier. Nút không khai `height`: cao = đệm + dòng (nhãn dài xuống dòng, nút cao theo).
- **Trạng thái chờ:** `<Spinner data-icon="inline-start" />` thay icon đầu + `disabled` + `aria-busy={cond}`; nhãn → "…ing…". Không `animate-spin` trên icon lucide.

**Thang nhấn** (`DOC-727c3d04d605`) — chọn `variant` theo độ quan trọng, KHÔNG theo sở thích viền:

| ID  | Bậc        | `variant`          | Dùng cho                                             |
| --- | ---------- | ------------------ | ---------------------------------------------------- |
| E1  | Đèn hiệu   | `default`          | Hành động chính duy nhất của vùng                    |
| E2  | Nhấn phụ   | `soft` · `inverse` | Hành động thứ hai đáng chú ý; chip/segment đang chọn |
| E3  | Trung tính | `secondary`        | Cancel/Close, hành động thường                       |
| E4  | Chìm       | `ghost` · `dashed` | Nút chỉ-icon; hành động trong hàng/thanh công cụ; nút "thêm" không trọng (`dashed`) |
| E5  | Chữ        | `link`             | Điều hướng ("View all")                              |

- Sắc trạng thái (`destructive` · `warning`) đứng NGOÀI thang, chọn theo NGHĨA. `outline` chỉ cho nút trên nền màu đã có viền cạnh; mặc định E3.
- **One Beacon (nút):** mỗi vùng hành động (footer dialog · header section · hàng bảng) tối đa MỘT E1; nút thứ hai trở đi ⇒ E2/E3. Không tự tô tông bằng `className` (`bg-foreground`, `border-primary/30`…) trên nút không `variant` — primitive coi là E1.

**Dashed Slot** (huyi0 cho phép `2026-11-05`): viền ĐỨT `1px` = tín hiệu CHỨC NĂNG "chỗ trống ∨ thêm vào ∨ tuỳ chọn" (cùng nghĩa `Empty`), không phải trang trí.

| Cho phép                                                                                       | Cấm                                                                                                         |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Button variant="dashed"` E4 cho hành động THÊM không trọng: Add filter · Add tag · Add note · Invite | E1/E2 · destructive/warning · nút ĐANG CHỌN (chọn ⇒ `soft`, bỏ viền đứt) · nút CRUD trong hàng bảng            |
| Chip BẤM ĐƯỢC "+ thêm" = Button `dashed` size `xs`/`sm` (KHÔNG phải Badge)                      | Badge hiển thị (vẫn KHÔNG viền) · hộp/thẻ đóng khung bằng viền đứt trang trí (trừ `Empty`)                    |

- Trần: ≤ `2` nút `dashed`/vùng hành động. Nút đã `border` trong suốt sẵn ⇒ đổi sang viền đứt KHÔNG đổi kích thước.
- Chữ ở mức `muted-foreground` ⇒ đo AA cả hai theme trước khi chốt token (Tonal Pair). Tên nút luôn là CHỮ ∨ `aria-label`, viền đứt không gánh nghĩa một mình.
- Variant `dashed` đã có ở `button.tsx`; `quality:ui` + `tsc` xanh. `◐` chưa gate chặn dùng sai chỗ (E1/E2, nút đang chọn, vượt trần `2`) ⇒ review tay. Test `data-table.test.tsx` (`not.toContain("border-dashed")`) vẫn đúng cho nút View.

**Cỡ theo ngữ cảnh:**

| Z   | Size                    | Dùng cho                                                                                          |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| Z1  | `touch`                 | Nút đứng riêng · footer · form · mobile                                                           |
| Z2  | `xl` (`48px`)           | CTA website; KHÔNG dùng trong app ops                                                             |
| Z3  | `default`/`sm`/`icon-*` | Nút trong bảng · thanh công cụ · dày đặc. Chỉ-icon Z3 phải có vùng chạm `44px` (`TOUCH_HIT_AREA`) |

Chiều cao do `size` quyết định; không đè bằng `h-*`/`min-h-*`/`py-*`.

**Icon:** lucide duy nhất; `data-icon="inline-start"` (primitive tự canh cỡ/khoảng cách); `inline-end` chỉ cho "Next"/mũi tên đi tới. Theo động từ: Save → `Save` · Delete → `Trash2` · Back → `ArrowLeft` · Retry → `RotateCw`. Cancel/Dismiss chỉ-chữ.

**Nút chỉ-icon** (`DOC-727c3d04d605` Đợt 5): dùng `IconOnlyButton` (`@easyspotops/ui/patterns/icon-only-button`); `label` bắt buộc (nuôi `aria-label` + Tooltip); mặc định `ghost` + `icon`, cạnh nút `touch` ⇒ `icon-touch`. Tối đa `2` nút chỉ-icon khác nghĩa cạnh nhau; hơn ⇒ gom vào More.

| Bỏ chữ CHỈ khi đủ 4 điều                                                                                                                                                                               | GIỮ chữ                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| glyph phổ quát (Refresh · Edit · Remove · Copy · Close × · More … · d-pad · Prev/Next tháng) ∧ ngữ cảnh tự gỡ nghĩa (hàng bảng · cạnh giá trị · header dialog) ∧ không phải E1 ∧ không phải điều hướng | mọi E1 · Cancel/Close/Back/Next ở footer · Try again · Approve/Reject · Filters · Clear filters · Export/Import · Save · bottom-nav · Print/Download ở footer viewer · Copy khi giá trị không hiện trên màn (Copy Invite Link) |

Gate: `tsc` chặn thiếu `label` · `icon-only-button-without-accessible-name` chặn `Button` trần · `button-*-text-icon-only` chặn khuôn đã chuyển (Refresh, Edit/Remove hàng bảng, d-pad).

**Cột action của bảng** (`DOC-23b588c10271`, chuẩn S1–S12; huyi0 chốt `2026-10-29`): ô cuối hàng CHỈ có MỘT `⋯` `DataTableRowMenu` (ghost `icon-touch`, `aria-label="Open menu for <tên hàng duy nhất>"`); MỌI hành động (Open · View · Approve · Edit · Copy · Remove …) là mục của menu, KHÔNG nút chữ/icon/link ngoài menu, kể cả khi chỉ có 1 hành động. Header HIỆN chữ "Actions" (cả skeleton), th ∧ td `text-center` (wrapper flex ⇒ `justify-center`), th `w-24`. Thứ tự mục: chính (Open/View/Approve) → Edit → Copy → vạch → destructive cuối (`variant="destructive"`); Sentence case. Xoá hẳn ⇒ `DataTableDeleteDialog`; xác nhận hiện có giữ nguyên. Thẻ mobile dùng chính component menu của bảng. Cấm `MoreActionsMenu iconOnly` ∨ `DropdownMenu` ∨ `Button`/`IconOnlyButton`/`Link` tự chế trong ô action.

### Trạng thái tương tác

**Interactive States** — MỌI control bấm được đủ `5` trạng thái; đổi trạng thái KHÔNG đổi kích thước/layout; chuyển `120–200ms`.

| Trạng thái      | Tín hiệu                                                                                    | Ghi chú                                                                  |
| --------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `hover`         | nền còn `80%` đục (nút) · nền `--muted` (ghost) — KHÔNG nâng bóng                           | Layer Not State                                                          |
| `focus-visible` | vòng `3px` `--ring` `50%` + viền `--ring`                                                   | không bao giờ bỏ; một hình focus cho toàn hệ                             |
| `active`        | LÚN `1px` (`active:translate-y-px`)                                                         | `transform` ⇒ không đẩy layout; trừ nút mở menu                          |
| `disabled`      | `opacity-50` + `pointer-events-none` (đo `button.tsx`; cả `disabled:` lẫn `data-disabled:`) | `focusableWhenDisabled` ⇒ còn `aria-disabled` để trình đọc màn hình thấy |
| `loading`       | `Spinner` thay icon đầu + `disabled` + `aria-busy`                                          | → Buttons · Trạng thái chờ                                               |

### Cards / Containers

| Thuộc tính | Giá trị                                                           |
| ---------- | ----------------------------------------------------------------- |
| Bo         | `14px` (`xl`, đỉnh thang)                                         |
| Nền        | Card White trên canvas                                            |
| Bóng       | `lift-xs` khi trực tiếp trên canvas                               |
| Viền       | `border-2 border-transparent` = viền TRÙNG nền card (`2026-11-05`, huyi0); không thấy viền, ranh giới vẫn do tông nền; tắt = `border-0` |
| Đệm        | `16px` dọc qua `--card-spacing`; `12px` ở biến thể gọn            |
| Chân thẻ   | `CardFooter`: tông `bg-muted/50`, KHÔNG `border-t` (`2026-10-03`) |
| Tiêu đề    | `16px`/500 `leading-snug`; `14px` ở biến thể gọn                  |

### Inputs / Fields

- **Style:** viền `1px` Hairline · nền trong suốt trên bề mặt thẻ · bo `8px`.
- **Focus:** như nút (vòng `3px` `--ring` `50%` + viền `--ring`) — một hình focus cho toàn hệ.
- **Error:** `aria-invalid` ⇒ viền + vòng `--destructive`. Qua ARIA, không qua class (trình đọc màn hình + mắt cùng tín hiệu).

### Navigation

Nav tối cố định. Mục thường: chữ trắng/navy · hover: nền Deep Ink · ĐANG CHỌN: nền Patrol Blue đặc. Viền trong = navy nâng sáng vừa đủ thấy; vòng focus dùng xanh sáng riêng (`sidebar-ring`). Dưới `768px` ⇒ thanh dưới đáy, mục xếp lưới chia đều.

### Badges

Tên gọi là **Badge**, không phải Chip (`DOC-bd1a754bb928`).

| Thuộc tính               | Luật                                                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hình                     | pill `rounded-full`; chữ `12px`/400 MỌI cỡ; icon `12px`                                                                                                                            |
| Cỡ (đệm ngang/dọc)       | `sm` `8px`/`2px` (mặc định) · `md` `10px`/`4px` · `lg` `12px`/`4px`. Không đè `text-sm`/`font-*` (luật `badge-typography-override`)                                                |
| Viền                     | KHÔNG viền, KHÔNG outline. Tông = Tonal Pair (light `50`/`700` · dark `950`/`300`; khuôn "custom colors" shadcn). Trên ảnh ∨ lớp phủ cần tách nền ⇒ `shadow-sm`, không thêm viền   |
| Tông ngữ nghĩa           | `success` · `warning` · `info` · `destructive` (token `danger-*`) · `neutral` — cặp `--X-bg`/`--X-text`, tương phản `4,51`–`6,74` (light) · `8,36`–`9,55` (dark), AA cả hai theme  |
| Tông phân loại           | `purple` · `sky` (không ngữ nghĩa)                                                                                                                                                 |
| Đặc                      | `default` nền Patrol Blue — chỉ cho số đếm cần hút mắt (tin chưa đọc). `secondary` · `ghost` · `link` giữ nghĩa như Button                                                         |
| Màu                      | Không đứng một mình: luôn kèm chữ nhãn; tông chỉ là tín hiệu phụ                                                                                                                   |
| Vạch ngày / tin hệ thống | `neutral` + `render={<time />}`                                                                                                                                                    |
| KHÔNG phải Badge         | Control bấm được (lọc/toggle ⇒ `ToggleGroup`/`Button`; chip "+ thêm" ⇒ Button `dashed`) · avatar ∨ ô icon tròn · vỏ bọc bố cục. Nhãn tự vẽ `span`/`p`/`div` + `bg-X/10` bị chặn bởi ast-grep `handrolled-tone-pill` |

### Trạng thái và thông báo

Phân biệt theo THỜI GIAN SỐNG, không theo sắc thái:

| Loại                                                                     | Kênh                | Lý do                             |
| ------------------------------------------------------------------------ | ------------------- | --------------------------------- |
| Phản hồi SAU hành động người dùng                                        | toast               | Thoáng qua                        |
| Trạng thái THƯỜNG TRỰC (thiếu quyền · danh sách rỗng · cảnh báo hạn mức) | dải cảnh báo inline | Phải còn đó khi quay lại          |
| Lỗi form phải sửa tại chỗ                                                | inline (luôn)       | Toast biến mất trước khi sửa xong |

**Trạng thái dữ liệu:**

| Trạng thái           | Primitive                                                      | Luật                                                                    |
| -------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Rỗng                 | `Empty` (`empty.tsx`): căn giữa, viền đứt, `gap-4`, đệm `24px` | Luôn có câu giải thích + hành động kế tiếp; không để trống trơn         |
| Đang tải trang       | `PageSkeleton` · `ShellSkeleton` · `Skeleton`                  | Giữ khung bố cục để không nhảy layout; không spinner chặn dài           |
| Đang xử lý hành động | `Spinner` + `aria-busy` (→ Buttons)                            | Nút `disabled` trong lúc chờ                                            |
| Lỗi route            | `RouteError` · `RouteNotFound` (`route-state.tsx`)             | Kèm đường thoát (thử lại ∨ về trang trước)                              |
| Lỗi form             | inline cạnh ô + `aria-invalid`                                 | Nhãn luôn hiện (không placeholder-only); lỗi nêu NGUYÊN NHÂN + cách sửa |

Dòng Skeleton có gate ast-grep (`skeleton-card-bg-override` · `loading-text-instead-of-skeleton`, `severity: warning`): khối chờ dùng `BlockSkeleton`/`RowsSkeleton` + `label` (khối tự là `role="status"`), không đè `bg-card`, không chữ `<p>Loading …</p>` thay khung (`DOC-7e3a9c15d2b8`). Dòng Lỗi form là khuyến nghị (`/ui-ux-pro-max` `ux`), chưa có gate.

### Chuyển động

Số đo từ `packages/platform/web/ui` (`.tsx`). Cột Luật là quy ước đề xuất theo số đo, chưa có gate trừ khi ghi rõ.

| Mục            | Giá trị đo                                                                                                                       | Luật                                                                                                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thời lượng     | `duration-100` (`14`) · `200` (`8`) · `300` (`5`) · `150` (`3`) · `450` (`2`); `transition` trần (`95` lượt) = Tailwind `150ms`  | Control tương tác (hover · focus · active · đổi trạng thái) `120–200ms` (Interactive States; `duration-100` `14` lượt = dưới sàn ⇒ nợ); mở panel `200–300ms`; trên `300ms` chỉ cho minh hoạ |
| Easing         | mặc định Tailwind; `ease-linear` (`4`: xoay, tiến trình) · `ease-in-out` (`3`); reveal `ease-out` (`dashboard-reveal` `280ms`)   | Cái gì xuất hiện ⇒ `ease-out`; hằng tốc (spinner, progress) ⇒ `linear`                                                                                                                      |
| Thuộc tính     | `transition-colors` (`15`) · `-opacity` (`6`) · `-transform` (`4`)                                                               | Chỉ màu · opacity · transform. KHÔNG animate `width`/`height`/`top`/`left`; `transition-all` bị ast-grep chặn (`DOC-19dc6bd1a4b3`)                                                          |
| Reduced motion | `styles.css:690` `@media (prefers-reduced-motion: reduce) { * { animation-duration · transition-duration: 0.01ms !important } }` | Quy tắc TOÀN CỤC: call-site không cần `motion-reduce:` (`DOC-19dc6bd1a4b3-R01`)                                                                                                             |
| Hover          | đổi nền (→ Layer Not State)                                                                                                      | Không nâng bóng, không dịch chuyển layout                                                                                                                                                   |

Quyết định animate/easing/transform: `/emil-design-eng` · rà chi tiết `/make-interfaces-feel-better` · `website-next` `/motion`. Bảng trên thắng khi lệch (`DOC-4c2e8a22cde1`).

#### Bậc biểu cảm theo bề mặt (huyi0 duyệt `2026-10-05`, `DOC-0afcf40fc6b3-R03`)

Lý do (huyi0 `2026-10-05`: hiệu ứng chưa đủ thu hút end user; tra nguồn: doc tham khảo đã xoá 2026-11-06): bảng trên là sàn kỷ luật cho vận hành; thu hút end user cần thêm ở bề mặt TỰ PHỤC VỤ ∧ TIẾP THỊ, không ở bảng điều khiển dày dữ liệu. Phép thử mỗi hiệu ứng: trả lời được `1` trong `4` câu — đã nhận hành động chưa · đang chạy chưa · xong/lỗi chưa · cái gì vừa dời; không trả lời được = trang trí.

`●` cho phép · `○` chỉ khi hiếm (lần đầu/việc đáng kể) · `—` không.

| Hiệu ứng                                                  | A Operate (staff · admin) | B Self-service (resident · client) | C Marketing (website · auth) |
| --------------------------------------------------------- | ------------------------- | ---------------------------------- | ---------------------------- |
| Phản hồi nhấn (lún/scale `0.97`) · hover đổi nền          | ●                         | ●                                  | ●                            |
| Skeleton → nội dung (fade `150ms`) · trễ spinner `300ms`  | ●                         | ●                                  | ●                            |
| Toast vào `16px`+mờ / ra `4px` fade                       | ●                         | ●                                  | —                            |
| Highlight nền `1.2s` mục vừa thêm/khôi phục               | ●                         | ●                                  | —                            |
| Chuyển trang `ViewTransition` crossfade (header đứng yên) | —                         | ●                                  | ●                            |
| Chuyển trang trượt hướng tới/lui · morph phần tử chung    | —                         | ○                                  | ●                            |
| Khoảnh khắc xong (vẽ dấu ✓ `≤400ms`, `1`/phiên/loại việc) | —                         | ○                                  | ○                            |
| Số KPI đếm lên (`≤600ms`, lần đầu mỗi phiên)              | —                         | ○                                  | ●                            |
| Stagger thẻ khi vào (`30–60ms`, `≤8` mục, 1 lần)          | —                         | ●                                  | ●                            |
| Reveal khi cuộn (CSS `view()`; trần `≤600ms`)             | —                         | —                                  | ●                            |
| Nâng bóng/dịch bố cục khi hover · parallax                | —                         | —                                  | ○                            |

Bổ sung huyi0 duyệt triển khai `2026-10-05` (`DOC-0afcf40fc6b3-R54–R58`): bậc B badge sau mutation thành công fade `150ms`; upload thật chuyển thanh bằng `scaleX` `200ms`, chỉ báo hoàn tất sau response; bậc C timeline đồng bộ icon/nội dung theo bước cuộn `300ms`. Không replay theo polling; không % giả; nội dung vẫn đọc được khi chưa tới bước.

Trần chung: thao tác lặp hằng ngày ⇒ không animate (`/emil-design-eng`); mọi hiệu ứng ∈ bảng này PHẢI qua reduced-motion; chuyển trang tắt trượt khi reduce.

## Do's and Don'ts

Matrix: `●` = Do · `✗` = Don't.

| Chủ đề       | Do                                                                                                                                               | Don't                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Lưới         | Gỡ `min-width: auto` ở CHÍNH ô lưới khi rãnh còn sàn (không `grid-cols-<N>` ∨ `fr` trần)                                                         | `min-w-0` ở ô trong `grid-cols-<N>` ∨ ô tự `overflow: hidden` (đã hết sàn, đổi `0px`)                   |
| Token ghép   | CỐ ĐỊNH ↔ CỐ ĐỊNH; ĐẢO ↔ đảo. Khai màu chữ cùng lúc màu nền                                                                                      | `text-white`/`text-black` cứng (không đảo dark; từng sinh chữ trắng trên nền trắng)                     |
| Focus & nhấn | `focus-visible` cho mọi control bấm được (`171`/`216` link đeo lốt nút từng không có vòng focus); control mới có trạng thái nhấn thấy được = LÚN | Bỏ vòng focus ∨ viền ô nhập ∨ đường chia hàng bảng dày chỉ để "nhẹ" hơn                                 |
| Thang        | Thiếu cỡ ⇒ THÊM bậc vào thang                                                                                                                    | Giá trị tuỳ tiện trong `className` (`text-[13px]` · `tracking-[0.14em]` · `shadow-[…]` · `rounded-[…]`) |
| Chữ          | Nhấn mạnh bằng cỡ ∨ màu; nhãn viết như câu                                                                                                       | Đậm `> 600`, `600` dưới `text-lg`; `font-black`; VIẾT HOA nhãn/eyebrow (chỉ ô nhập mã được hoa)         |
| Hình         | Bo ≤ `14px`                                                                                                                                      | Bo `> 14px` (`6` bậc lớn còn khai nhưng có luật chặn)                                                   |
| Tách vùng    | Khoảng trắng → tông nền → ring mờ; dừng ở công cụ đầu đủ tách                                                                                    | Viền trang trí đóng khung                                                                               |
| Trạng thái   | Cặp tông (nền + chữ cùng sắc, dark đảo đầu)                                                                                                      | Khối màu đặc bão hoà                                                                                    |
| Bóng         | Phân lớp bằng bậc `lift-*` theo vị trí                                                                                                           | Nâng bậc bóng khi hover (đổi nền)                                                                       |
| Vùng chạm    | Dùng `2` nấc chạm có sẵn                                                                                                                         | Nới toàn thang để đạt vùng chạm                                                                         |
| Gap          | `8–16px`                                                                                                                                         | Ngoài dải khi không gọi được ID ngoại lệ đã phán `2/3` (`DOC-4ff406833e96` §2.2)                        |
