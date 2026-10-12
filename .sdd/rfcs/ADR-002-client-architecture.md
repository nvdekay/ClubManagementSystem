# ADR-002: Kiến trúc client tối giản phụ thuộc

Ngày: 2026-08-13 · Trạng thái: đã chấp nhận

## Quyết định
Ứng dụng một trang React 19 + Vite trong `client/`, cố ý dùng rất ít thư viện:
- Không router, không thư viện state, không HTTP client. Dùng `fetch` gốc phía sau hai tầng:
  `services/<domain>.ts` (endpoint, có kiểu, không React) → `hooks/use<Domain>.ts`
  (TanStack React Query, sở hữu `queryKey`) → component. Server state sống trong cache của
  React Query; client state (theme, ngôn ngữ, form) nằm trong `useState`.
- Tailwind v4 theo hướng CSS-first. Mọi màu có theme là token `--color-<name>-app` trong khối
  `@theme` của `index.css`, kèm ghi đè `:root.dark` — dark mode là một class `.dark` trên
  `<html>`, không dùng variant `dark:`. Class có điều kiện chỉ đi qua `cn()` (mẫu ghi đè CSS,
  không dùng template literal trong `className`) — được ESLint cưỡng chế.
- Ngôn ngữ là một từ điển phẳng `STRINGS[locale]` trong `i18n.ts` (`en`/`vi`), không dùng thư
  viện i18n.
- Bảng dùng TanStack Table v9 dạng headless: người gọi sở hữu instance `useTable`, bộ kit
  `ui/table/` chịu trách nhiệm render.
- Phân loại component: `ui/` (nguyên tử, tiền tố `App*`), `custom/` (có hiểu biết nghiệp vụ),
  `layout/` (khung); giao diện dùng một lần thì để nội tuyến. Không dùng barrel file.

## Vì sao
- Đây là template cho nhóm nhỏ cộng AI agent: ít thư viện hơn = ít quy ước để trôi dạt hơn, và
  những quy tắc còn lại thì lint cưỡng chế được (màu, className).
- Lớp gián tiếp qua token biến dark mode thành một lần tô lại, không phải một đợt rà từng component.
- Việc tách service/hook giữ cho endpoint test được mà không cần render, và cache key chỉ khai
  báo một lần.

## Đánh đổi
- Mỗi thư viện bị bỏ qua đều có một điều kiện kích hoạt được ghi rõ (xem `.claude/skills/react-arch`):
  router khi có trang thứ hai, thư viện state khi việc truyền props qua nhiều tầng thực sự gây
  khó chịu và chứng minh được, thư viện i18n khi từ điển phẳng vượt quá một trang. Thêm khi
  điều kiện xảy ra, không phải trước đó — và cập nhật tài liệu khi một điều kiện kích hoạt.
- Việc bật/tắt `.dark` và ngôn ngữ thủ công nghĩa là mọi giao diện mới đều phải kiểm tra ở cả
  hai chế độ; điều này được kiểm soát bằng checklist của react-arch thay vì bằng công cụ.

> **Ghi chú (2026-09):** điều kiện kích hoạt router đã xảy ra với UCMS — sản phẩm có ba workspace
> theo vai trò, nên `react-router` được thêm vào; phần còn lại của ADR này giữ nguyên. Tương tự,
> phần ngôn ngữ nay dùng i18next với file chuỗi tách theo module.
