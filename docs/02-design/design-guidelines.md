# UCMS — Quy tắc thiết kế giao diện

Quy tắc thị giác cho client của Hệ thống Quản lý Câu lạc bộ Đại học FPT. Chỉ bàn về màu, chữ,
khoảng cách và công thức component — quy tắc về vị trí đặt code nằm ở
[`.rules/frontend.md`](../../.rules/frontend.md).

Token được khai báo đúng một lần trong [`client/src/index.css`](../../client/src/index.css) bên
trong `@theme`, kèm các ghi đè `:root.dark`. Component không bao giờ thấy một mã màu; chúng dùng
utility Tailwind được sinh ra (`bg-primary-app`, `text-muted-app`, `border-border-app`).

## 1. Nền tảng thương hiệu

Đối chiếu với `client/src/index.css` ngày 14/11/2026. Từ đợt làm lại giao diện 11–12/11/2026,
client dùng phong cách dashboard sáng, gọn (kiểu Catalyst): nền trung tính trắng / xám lạnh, một
màu nhấn **cam FPT**, thẻ bo góc vừa phải và đổ bóng rất nhẹ. Bảng màu đất ấm (cam đất `#C67139`,
nền kem, xanh olive) và font Nunito của mockup `FPT_Club.html` cũ **không còn dùng**.

Cam FPT có hai token: `brand-app` là cam logo tươi, chỉ dùng cho điểm nhấn không phải chữ (vạch
đánh dấu mục đang chọn, vòng focus, biểu đồ); `primary-app` là cam đậm hơn để chữ trắng trên nền
cam và chữ cam trên nền trắng đều đạt WCAG AA (4.5:1). Mọi cặp chữ / nền đều đạt AA trong theme
của nó.

## 2. Token màu

Theme sáng là mặc định; theme tối bật bằng class `dark` trên `<html>` và ghi đè cùng các custom
property, nên mọi utility `*-app` tự đổi màu mà component không phải sửa.

### Thương hiệu — chỉ dùng cho mảng nền, điểm nhấn và đồ hoạ

| Token | Sáng | Tối | Dùng cho | Không bao giờ dùng cho |
|---|---|---|---|---|
| `brand-app` | `#F37021` | `#FB923C` | Vạch nav đang chọn, điểm nhấn, logo | Chữ nội dung nhỏ (dùng `primary-app`) |
| `on-brand-app` | `#FFFFFF` | `#14161B` | Ký tự trên mảng `brand-app` | — |
| `brand-blue-app` | `#38BDF8` | `#38BDF8` | Mảng trang trí phụ | Chữ nhỏ |
| `brand-green-app` | `#34D399` | `#34D399` | Mảng trang trí phụ | Chữ nhỏ |
| `hero-app` / `on-hero-app` | `#0B2533` / `#FFFFFF` | `#0E2635` / `#E6F3FA` | Dải nền đậm của hero, call-to-action và footer trang công khai | — |

### Ngữ nghĩa

| Token | Sáng | Tối | Dùng cho |
|---|---|---|---|
| `text-app` | `#0E121B` | `#EEF0F3` | Chữ nội dung và tiêu đề |
| `muted-app` | `#525866` | `#A3A9B5` | Chữ phụ, chú thích, placeholder, badge trung tính |
| `bg-app` | `#FFFFFF` | `#0F1115` | Nền trang, nền thẻ, ô nhập, dialog |
| `surface-app` | `#F5F7FA` | `#171A20` | Header bảng, hover dòng, nút phụ khi hover, ô chỉ đọc |
| `surface-strong-app` | `#EBEEF2` | `#20242C` | Nền badge trung tính, rãnh segmented control |
| `border-app` | `#E4E7EC` | `#2A2F38` | Đường kẻ, viền thẻ và ô nhập, thanh cuộn |
| `sidebar-app` | `#FFFFFF` | `#0F1115` | Nền sidebar của `WorkspaceShell` |
| `primary-app` | `#C84C0C` | `#FB923C` | Nền nút chính, chữ link / nhấn mạnh, checkbox và radio |
| `on-primary-app` | `#FFFFFF` | `#14161B` | Chữ và icon nằm trên `primary-app` |
| `primary-soft-app` | `#FFF1E8` | `#3A2112` | Nền nhạt của mục đang chọn, khối nhấn cam |
| `accent-app` | `#C84C0C` | `#FDBA74` | Link, hành động phụ |
| `ring-app` | `#F37021` | `#FB923C` | Vòng focus, luôn hiển thị khi focus |
| `success-app` / `mint-app` | `#047857` | `#6EE7B7` | CLB active, đã duyệt, đã điểm danh |
| `mint-soft-app` | `#E7F7EE` | `#0F2E22` | Nền badge thành công |
| `warning-app` | `#B45309` | `#FCD34D` | Đang chờ duyệt, deadline sắp tới |
| `danger-app` | `#D02533` | `#FCA5A5` | Hành động phá huỷ, bị từ chối, lỗi nhập liệu |
| `info-app` / `info-soft-app` | `#1D5FD1` / `#EAF1FD` | `#93B8F7` / `#172338` | Badge thông tin — xanh dương để không lẫn với cam nhấn hay vàng cảnh báo |
| `segment-app` | `#FFFFFF` | `#2C323C` | Mục đang chọn của segmented control |
| `backdrop-app` | `#0E121B66` | `#000000B8` | Lớp mờ phía sau dialog |
| `chart-1-app` / `chart-2-app` | `#E8650F` / `#2F6FE0` | `#E06B1E` / `#5B8DEF` | Hai chuỗi dữ liệu của biểu đồ dashboard |
| `chart-muted-app` / `chart-grid-app` | `#D5D9E0` / `#EEF0F3` | `#3A404B` / `#232831` | Chuỗi mờ và lưới biểu đồ |

Ngoài ra `index.css` còn các token riêng cho trang đăng nhập (`auth-*`), bốn màu logo Google
(`google-*`) và dải màu tuyển thành viên (`recruitment-*`); chỉ dùng chúng ở đúng chỗ đã đặt tên.

`on-primary-app` lật sang gần đen ở chế độ tối vì `primary-app` tối là cam sáng. Viết cứng
`text-white` trên một nút chính sẽ mất tương phản ngay khi đổi theme — luôn dùng token.

### Ánh xạ trạng thái cho các đối tượng nghiệp vụ của UCMS

`AppBadge` có năm tone; luôn chọn tone thay vì tự ghép màu.

| Trạng thái nghiệp vụ | Tone `AppBadge` | Token |
|---|---|---|
| CLB active / sự kiện đã duyệt / thành viên được nhận | `success` | `mint-soft-app` + `success-app` |
| Đang chờ duyệt / đang chờ thẩm định đề xuất | `warning` | `warning-app` (nền 12%) |
| Bị từ chối / đã huỷ / bị tạm ngừng | `danger` | `danger-app` (nền 10%) |
| Thông tin, đang diễn ra, học kỳ hiện tại | `info` | `info-soft-app` + `info-app` |
| Nháp / đã lưu trữ / không hoạt động | `neutral` | `surface-strong-app` + `muted-app` |

Một badge trạng thái luôn mang nhãn chữ, không bao giờ chỉ dùng màu — `AppBadge` có chấm màu
`bg-current` kèm từ mô tả.

### Thêm một token

1. Đã có token nào mang nghĩa này chưa? Dùng lại (`border-app` và `muted-app` phủ được hầu hết
   nhu cầu).
2. Khai báo `--color-<name>-app` trong `@theme` **và** một ghi đè `:root.dark` trong cùng PR.
3. Kiểm tra ≥ 4.5:1 với `bg-app` và `surface-app` ở cả hai theme trước khi commit.

## 3. Typography

Ứng dụng dùng **Be Vietnam Pro** (400/500/600/700/800, nạp từ Google Fonts ở đầu `index.css`)
cho cả nội dung và tiêu đề: `--font-sans`, `--font-heading` và hai font của trang đăng nhập đều
trỏ về họ này. Be Vietnam Pro được thiết kế cho dấu tiếng Việt; dùng chung một họ font tránh
fallback không đồng đều giữa ký tự Latin và ký tự có dấu.

Từ màn hình tablet trở lên (`min-width: 768px`), cỡ chữ gốc của `html` là 90% — mọi kích thước
theo `rem` thu nhỏ đều như zoom 90%. Điện thoại giữ 100%. Các cỡ bên dưới là giá trị danh nghĩa
trước khi nhân 90%.

| Vai trò | Class | Cỡ / dãn dòng | Độ đậm |
|---|---|---|---|
| Tiêu đề trang (`PageHeader`) | `font-heading text-2xl font-semibold tracking-tight` | 24 / 32 | 600 |
| Tiêu đề lớn trang công khai | `text-3xl font-heading font-bold` | 30 / 36 | 700 |
| Tiêu đề thẻ, mục | `text-base font-semibold` | 16 / 24 | 600 |
| Nội dung | `text-base` | 16 / 24 | 400 |
| Phụ / chú thích, mô tả trang | `text-sm text-muted-app` | 14 / 20 | 400 |
| Ô trong bảng, nút | `text-sm` | 14 / 20 | 400–500 |
| Nhãn, badge | `text-xs font-medium` | 12 / 16 | 500 |

Quy tắc: chữ nội dung không bao giờ nhỏ hơn 16px trên mobile; độ dài dòng văn xuôi giới hạn
65–75 ký tự (`max-w-[65ch]`); không quá hai độ đậm trong cùng một component.

## 4. Khoảng cách, bo góc, đổ bóng

- **Khoảng cách** — thang 4px của Tailwind. Bên trong một thẻ: `p-5`. Giữa các mục: `gap-6`.
  Giữa các điều khiển liên quan: `gap-2`.
- **Bo góc** — kiểu "soft-square", khai báo trong `@theme`: `rounded-md` 6px, `rounded-lg` 8px
  (nút, ô nhập, textarea), `rounded-xl` 10px, `rounded-2xl` 14px (thẻ, khung biểu đồ, dialog),
  `rounded-3xl` 16px. Badge dùng `rounded-md`; avatar và chấm trạng thái dùng `rounded-full`.
  Không còn nút / ô nhập dạng pill hay thẻ bo 32px của mockup cũ.
- **Đổ bóng** — `shadow-xs` cho thẻ, nút và ô nhập; `shadow-lg` cho tooltip và popover;
  `shadow-xl` cho dialog. Chế độ tối dựa vào `surface-app` + `border-app` để tách lớp, vì bóng gần
  như vô hình trên nền tối.
- **Container** — mỗi trang một chiều rộng tối đa: `max-w-7xl mx-auto px-4 sm:px-8`.
- **z-index** — header dính 10, dropdown 20, lớp phủ modal 30, toast 50. Không dùng giá trị khác.

## 5. Công thức component

Dựng từ bộ kit `components/ui/` đã có (`AppButton`, `AppCard`, `AppBadge`, `AppInput`,
`AppTextarea`, `AppSelect`, `AppDialog`, `AppEmptyState`, `AppSkeleton`, chart…) — mở rộng chính
các file đó thay vì tạo kiểu lại ở từng nơi gọi.

**Nút chính** (`AppButton variant="primary"`) — `rounded-lg px-3.5 min-h-11 sm:min-h-9 text-sm
font-medium bg-primary-app text-on-primary-app shadow-xs hover:opacity-90 active:scale-[0.98]
focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 disabled:opacity-50`

**Nút phụ** (`secondary`) — `border border-border-app bg-bg-app text-text-app shadow-xs
hover:bg-surface-app` cộng cùng bộ kích thước. **Nút ghost** — chỉ chữ, `hover:bg-surface-app`.
**Nút phá huỷ** — nền `bg-danger-app`, chữ dùng token chứ không viết cứng `text-white`.

**Thẻ** (`AppCard`) — `rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs`. Thẻ bấm
được thêm `role="button"`, `tabIndex={0}` và hiệu ứng hover chỉ đổi màu viền / nền, không bao giờ
`scale`, để lưới không bị dồn lại.

**Bảng** — header `bg-surface-app text-muted-app text-xs`, các dòng ngăn bằng
`divide-y divide-border-app`, ô `px-4 py-3 text-sm`, hover dòng `hover:bg-surface-app`. Dưới
`md`, một bảng danh sách thành viên chuyển thành danh sách thẻ xếp chồng chứ không phải thanh
cuộn ngang.

**Trường nhập liệu** — `<label>` đặt trên ô nhập, `text-sm font-medium`; ô nhập (`AppInput`)
`h-11 sm:h-9 rounded-lg border border-border-app bg-bg-app px-3 text-sm shadow-xs`; chữ lỗi
`text-sm text-danger-app` ngay dưới trường, kèm `aria-invalid` (viền chuyển `border-danger-app`)
và `aria-describedby`. Không bao giờ chỉ dựa vào viền đỏ. Focus dùng vòng mờ
`focus-visible:ring-3 focus-visible:ring-ring-app/20` cộng `border-ring-app`, **không** có
`ring-offset`. Nút có nền đặc vẫn giữ `ring-offset-2`, vì vòng không offset sẽ nằm đè lên nền.
Dấu sao đỏ và lỗi inline chỉ đặt ở trường bắt buộc.

**Badge** (`AppBadge`) — `rounded-md px-2 py-0.5 text-xs font-medium`, chấm màu đứng trước nhãn,
màu theo tone ở §2.

**Trạng thái rỗng** — một icon, một câu giải thích chỗ này lẽ ra có gì, một hành động chính.
Dùng `AppEmptyState` (có `variant="boxed"`); không bao giờ hiển thị nó khi lần tải đầu còn đang chạy.

**Trạng thái tải** — `AppSkeleton` với hình khối khớp bố cục thật, chỉ ở lần tải đầu. Nút khi
đang gửi thì bị vô hiệu và hiện spinner; chúng không bao giờ biến mất.

## 6. Chuyển động

150–300ms, ưu tiên `transition-colors` hoặc `transition-opacity` — `transform` và `opacity` là
hai thuộc tính rẻ với GPU, còn chuyển động làm đổi bố cục (`width`, `height`) gây tính lại
layout. Ngoại lệ đã có sẵn trong kit: nút co nhẹ khi nhấn (`active:scale-[0.98]`), dialog mở với
`scale` 0.97 → 1, và hiệu ứng đổi theme dạng vòng tròn lan từ nút bật theme. Hiệu ứng ở mức trang phải cho phép tắt:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

## 7. Icon

Heroicons hoặc Lucide dạng outline, viewBox 24×24, render ở `w-5 h-5` (trong dòng) hoặc
`w-6 h-6` (đứng riêng), fill `currentColor` để chúng đổi màu theo theme. Không dùng emoji làm
icon giao diện. Nút chỉ có icon phải mang `aria-label`.

## 8. Checklist trước khi mở PR

- [ ] Không có mã màu ngoài `index.css`; không dùng variant `dark:` (lớp gián tiếp token đã lo)
- [ ] Đã lật theme — chữ, viền và nội dung mờ vẫn đọc được dưới `.dark`
- [ ] Đã đổi ngôn ngữ sang `vi` — chuỗi tiếng Việt dài hơn 30–60%; các hàng dùng `flex-wrap`,
      không `whitespace-nowrap`, không đặt chiều rộng pixel cố định quanh một giá trị `t()`
- [ ] Mọi phần tử tương tác đều có vòng `focus-visible` nhìn thấy được
- [ ] Vùng chạm ≥ 44×44px
- [ ] Trạng thái được thể hiện bằng chữ hoặc icon, không chỉ bằng màu
- [ ] Đã kiểm tra ở 375 / 768 / 1024 / 1440px, không có cuộn ngang
- [ ] Đã tôn trọng `prefers-reduced-motion`

## 9. Những thứ không được làm

| Đừng | Vì sao |
|---|---|
| Dùng `brand-app` (`#F37021`) làm màu chữ hoặc link nhỏ | Không đạt 4.5:1 trên nền trắng; dùng `primary-app` |
| Viết `text-white` trên nút chính | Hỏng ở chế độ tối; dùng `on-primary-app` |
| Dùng `text-gray-400` cho chữ nội dung | Dưới 4.5:1 trên nền trắng; dùng `muted-app` |
| `hover:scale-105` trên thẻ | Làm lưới dồn lại; hãy đổi màu thay vì phóng to |
| Dùng emoji làm icon (🎓 🏆 📅) | Hiển thị khác nhau theo hệ điều hành; dùng SVG |
| Thêm một màu nhấn riêng cho mỗi tính năng | Giao diện chỉ có một màu nhấn (cam FPT) cộng các màu ngữ nghĩa |
| Đặt `cursor-pointer` ở từng component | Đã có một quy tắc toàn cục trong `index.css` lo việc đó |
