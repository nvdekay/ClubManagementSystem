# hooks/

Các React hook tái sử dụng được, mỗi hook một file `use<Name>.ts` — lấy dữ liệu, logic có state
dùng chung. Chỉ dùng state gốc của React (không thư viện state); gọi `services/` để truy cập
API, không bao giờ gọi `fetch` trực tiếp trong component.

`usePageTransition` là hook giao diện thuần (không gọi API): `WorkspaceShell` và `PublicLayout` gắn ref
của nó vào vùng nội dung để khi đổi đường dẫn thì cuộn về đầu trang và chạy hiệu ứng mờ-trượt nhẹ
(bỏ qua lần render đầu và khi người dùng bật giảm chuyển động).
