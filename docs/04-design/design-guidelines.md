# UCMS — Quy tắc thiết kế giao diện

Quy tắc thị giác cho client của Hệ thống Quản lý Câu lạc bộ Đại học FPT. Chỉ bàn về màu, chữ,
khoảng cách và công thức component — quy tắc về vị trí đặt code nằm ở
[`.rules/frontend.md`](../../.rules/frontend.md).

Token được khai báo đúng một lần trong [`client/src/index.css`](../../client/src/index.css) bên
trong `@theme`, kèm các ghi đè `:root.dark`. Component không bao giờ thấy một mã màu; chúng dùng
utility Tailwind được sinh ra (`bg-primary-app`, `text-muted-app`, `border-border-app`).

## 1. Nền tảng thương hiệu

Bảng màu doanh nghiệp của FPT có ba màu: cam `#F37021`, xanh dương `#0066B3`, xanh lá `#00A650`.
Chúng là bản sắc, không phải giao diện.

Cam trên nền trắng đo được **2.94:1** — dưới ngưỡng 4.5:1 của WCAG AA cho chữ và dưới 3:1 cho
viền mang nghĩa. Vì vậy các màu thương hiệu được giữ làm token `*-brand-*` dành cho mảng nền,
logo và khối trang trí, còn mọi màu tương tác đều là biến thể tối hơn, đã kiểm tra độ tương
phản. Đây là quy tắc duy nhất giữ cho ứng dụng vừa đúng nhận diện vừa dễ tiếp cận.

## 2. Token màu

Độ tương phản đo với chính nền của theme đó (`#ffffff` / `#0a0a0a`).

### Thương hiệu — cố định ở cả hai theme, chỉ dùng cho mảng nền và đồ hoạ

| Token | Giá trị | Dùng cho | Không bao giờ dùng cho |
|---|---|---|---|
| `brand-app` | `#F37021` | Logo, khối hero, chuỗi dữ liệu biểu đồ, mảng trang trí lớn | Chữ nội dung, link, viền 1px, icon nhỏ |
| `brand-blue-app` | `#0066B3` | Mảng nền thương hiệu phụ, chuỗi biểu đồ | — |
| `brand-green-app` | `#00A650` | Mảng nền thương hiệu, chuỗi biểu đồ | Chữ báo thành công (3.2:1 — dùng `success-app`) |

### Ngữ nghĩa — mọi giá trị đều ≥ 4.5:1 trên nền của chính nó

| Token | Sáng | Tối | Tương phản (sáng / tối) | Dùng cho |
|---|---|---|---|---|
| `text-app` | `#1A1A1A` | `#F5F5F5` | 16.9 / 18.2 | Chữ nội dung và tiêu đề |
| `muted-app` | `#5B6472` | `#A1A1AA` | 5.98 / 7.72 | Chữ phụ, chú thích, nhãn bị vô hiệu, placeholder |
| `bg-app` | `#FFFFFF` | `#0A0A0A` | — | Nền trang |
| `surface-app` | `#F9FAFB` | `#18181B` | — | Thẻ, header bảng, panel, modal |
| `border-app` | `#E5E7EB` | `#27272A` | — | Đường kẻ, viền thẻ và ô nhập, thanh cuộn |
| `primary-app` | `#C2410C` | `#FB923C` | 5.18 / 8.75 | Nền nút chính, nav đang chọn, trạng thái được chọn |
| `on-primary-app` | `#FFFFFF` | `#1A1A1A` | 5.18 / 7.69 trên primary | Chữ và icon nằm trên `primary-app` |
| `accent-app` | `#0066B3` | `#60A5FA` | 5.91 / 7.79 | Link, hành động phụ, nhấn mạnh thông tin |
| `ring-app` | `#0066B3` | `#60A5FA` | — | Vòng focus, offset 2px |
| `success-app` | `#047857` | `#34D399` | 5.48 / 10.3 | CLB active, điểm danh đã xác nhận |
| `warning-app` | `#B45309` | `#FBBF24` | 5.02 / 11.9 | Đang chờ duyệt, deadline sắp tới |
| `danger-app` | `#B91C1C` | `#F87171` | 6.47 / 7.16 | Hành động phá huỷ, bị từ chối, lỗi nhập liệu |

`on-primary-app` lật sang gần đen ở chế độ tối. Viết cứng `text-white` trên một nút chính sẽ
tụt xuống khoảng 2:1 ngay khi đổi theme — luôn dùng token.

### Ánh xạ trạng thái cho các đối tượng nghiệp vụ của UCMS

| Trạng thái nghiệp vụ | Token |
|---|---|
| CLB active / sự kiện đã duyệt / thành viên được nhận | `success-app` |
| Đang chờ duyệt / đang chờ thẩm định đề xuất | `warning-app` |
| Bị từ chối / đã huỷ / bị tạm ngừng | `danger-app` |
| Nháp / đã lưu trữ / không hoạt động | `muted-app` |
| Đang diễn ra / nổi bật / học kỳ hiện tại | `primary-app` |

Một badge trạng thái luôn mang nhãn chữ, không bao giờ chỉ dùng màu — nền là `bg-*` với độ mờ
thấp, chữ là token ở giá trị đầy đủ, cộng với từ mô tả.

### Thêm một token

1. Đã có token nào mang nghĩa này chưa? Dùng lại (`border-app` và `muted-app` phủ được hầu hết
   nhu cầu).
2. Khai báo `--color-<name>-app` trong `@theme` **và** một ghi đè `:root.dark` trong cùng PR.
3. Kiểm tra ≥ 4.5:1 với `bg-app` và `surface-app` ở cả hai theme trước khi commit.

## 3. Typography

Một họ chữ duy nhất: **Be Vietnam Pro** (400/500/600/700), import trong `index.css` và gắn vào
`--font-sans`. Nó được vẽ cho dấu tiếng Việt — `ộ`, `ằ`, `ỹ` vẫn giữ được hình ở cỡ 14px, điều
mà Poppins và phần lớn font sans hình học không làm được.

| Vai trò | Class | Cỡ / dãn dòng | Độ đậm |
|---|---|---|---|
| Tiêu đề trang | `text-3xl font-bold` | 30 / 36 | 700 |
| Tiêu đề mục | `text-xl font-semibold` | 20 / 28 | 600 |
| Tiêu đề thẻ | `text-base font-semibold` | 16 / 24 | 600 |
| Nội dung | `text-base` | 16 / 24 | 400 |
| Phụ / chú thích | `text-sm text-muted-app` | 14 / 20 | 400 |
| Ô trong bảng | `text-sm` | 14 / 20 | 400 |
| Nhãn, badge | `text-xs font-medium uppercase tracking-wide` | 12 / 16 | 500 |

Quy tắc: chữ nội dung không bao giờ nhỏ hơn 16px trên mobile; độ dài dòng văn xuôi giới hạn
65–75 ký tự (`max-w-[65ch]`); không quá hai độ đậm trong cùng một component.

## 4. Khoảng cách, bo góc, đổ bóng

- **Khoảng cách** — thang 4px của Tailwind, và chỉ dùng `1 2 3 4 6 8 12 16`. Bên trong một thẻ:
  `p-4` (mobile) / `p-6` (desktop). Giữa các mục: `gap-6`. Giữa các điều khiển liên quan: `gap-2`.
- **Bo góc** — `rounded-md` (6px) cho ô nhập, nút và badge; `rounded-lg` (8px) cho thẻ và modal;
  `rounded-full` cho avatar và pill. Không dùng giá trị nào khác.
- **Đổ bóng** — mặc định là phẳng. `shadow-sm` chỉ dùng cho thẻ nằm trên `bg-app` mà không có
  viền; `shadow-lg` cho modal và popover. Chế độ tối dựa vào `surface-app` + `border-app` thay
  cho bóng, vì bóng gần như vô hình trên nền đen.
- **Container** — mỗi trang một chiều rộng tối đa: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- **z-index** — header dính 10, dropdown 20, lớp phủ modal 30, toast 50. Không dùng giá trị khác.

## 5. Công thức component

Dựng từ bộ kit `components/ui/` đã có — mở rộng chính các file đó thay vì tạo kiểu lại ở từng
nơi gọi.

**Nút chính** — `bg-primary-app text-on-primary-app rounded-md px-4 py-2 text-sm font-medium
transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring-app
focus-visible:ring-offset-2 disabled:opacity-50`

**Nút phụ** — `border border-border-app bg-surface-app text-text-app` cộng cùng bộ kích thước.
**Nút phá huỷ** — `bg-danger-app text-white`. **Nút ghost** — chỉ chữ, `hover:bg-surface-app`.

**Thẻ** — `rounded-lg border border-border-app bg-surface-app p-4 sm:p-6`. Thẻ bấm được thêm
`role="button"`, `tabIndex={0}` và `hover:border-primary-app transition-colors` — hiệu ứng hover
chỉ đổi màu, không bao giờ `scale`, để lưới không bị dồn lại.

**Bảng** — header `bg-surface-app text-muted-app text-xs uppercase`, các dòng ngăn bằng
`divide-y divide-border-app`, ô `px-4 py-3 text-sm`, hover dòng `hover:bg-surface-app`. Dưới
`md`, một bảng danh sách thành viên chuyển thành danh sách thẻ xếp chồng chứ không phải thanh
cuộn ngang.

**Trường nhập liệu** — `<label>` đặt trên ô nhập, `text-sm font-medium`; ô nhập
`border border-border-app bg-bg-app rounded-md px-3 py-2`; chữ lỗi `text-sm text-danger-app`
ngay dưới trường, kèm `aria-invalid` và `aria-describedby`. Không bao giờ chỉ dựa vào viền đỏ.
Focus dùng `ring-1 ring-ring-app` **không** có `ring-offset`, cộng `border-ring-app` — một vòng
có offset quanh một ô vốn đã có viền trông như hai lớp viền cách nhau bởi một khe trắng. Nút có
nền đặc vẫn giữ `ring-offset-2`, vì vòng không offset sẽ nằm đè lên nền.

**Badge** — `rounded-full px-2 py-0.5 text-xs font-medium`, nền là token trạng thái ở độ mờ 10%
và chữ là chính token đó.

**Trạng thái rỗng** — một icon, một câu giải thích chỗ này lẽ ra có gì, một hành động chính.
Dùng `AppEmptyState`; không bao giờ hiển thị nó khi lần tải đầu còn đang chạy.

**Trạng thái tải** — `AppSkeleton` với hình khối khớp bố cục thật, chỉ ở lần tải đầu. Nút khi
đang gửi thì bị vô hiệu và hiện spinner; chúng không bao giờ biến mất.

## 6. Chuyển động

150–300ms, chỉ dùng `transition-colors` hoặc `transition-opacity` — `transform` và `opacity` là
hai thuộc tính duy nhất rẻ với GPU, còn chuyển động làm đổi bố cục (`width`, `height`, `scale`
khi hover) gây tính lại layout. Hiệu ứng ở mức trang phải cho phép tắt:

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
| Dùng `#F37021` làm màu chữ hoặc link | 2.94:1 — trượt AA; dùng `primary-app` |
| Viết `text-white` trên nút chính | Hỏng ở chế độ tối; dùng `on-primary-app` |
| Dùng `text-gray-400` cho chữ nội dung | Dưới 4.5:1 trên nền trắng; dùng `muted-app` |
| `hover:scale-105` trên thẻ | Làm lưới dồn lại; hãy đổi màu thay vì phóng to |
| Dùng emoji làm icon (🎓 🏆 📅) | Hiển thị khác nhau theo hệ điều hành; dùng SVG |
| Thêm một màu nhấn thứ ba cho mỗi tính năng | Bảng màu chỉ gồm ba màu thương hiệu cộng các màu ngữ nghĩa |
| Đặt `cursor-pointer` ở từng component | Đã có một quy tắc toàn cục trong `index.css` lo việc đó |
