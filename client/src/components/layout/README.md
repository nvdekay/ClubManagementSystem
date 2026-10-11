# components/layout/

Các khung bố cục cấu trúc. Không có tiền tố `App`.

- `PublicLayout` — header/footer cho các trang khám phá (`/`, `/clubs`, `/events`). Chỉ hiển thị
  khi đã đăng nhập; nếu chưa có phiên, chuyển tới `/login` và giữ trang đích trong `returnTo`. Bố cục
  tham khảo pdp.fpt.edu.vn nhưng giữ tông xanh ngọc chung của hệ thống, chỉ màu đơn sắc, không
  gradient: header trắng, footer nền `hero-app` với thông tin FPT Education. Trang chủ `/` tự quản
  bề rộng (dải nền tràn viền), các trang khác nằm trong khung `max-w-7xl`.
- `UserMenu` — avatar người dùng trên header công khai; bấm mở menu gồm "Không gian làm việc" và
  "Đăng xuất" (màu đỏ). Đóng bằng Escape hoặc bấm ra ngoài.
- `WorkspaceShell` — khung sidebar trái cho mọi màn quản lý (Sinh viên, ICPDP, CLB); trên mobile
  sidebar thành drawer. Tự kiểm tra đăng nhập và quyền truy cập workspace theo URL. Menu của cả ba
  workspace gom thành tab cha (`NavGroup`, bấm để mở/thu gọn, tự mở khi đang ở một tab con); với CLB
  mỗi tab con vẫn lọc theo permission của role, nhóm chỉ còn một tab hiện thành link thường, nhóm rỗng ẩn đi.
- `PageHeader` — khối tiêu đề (tiêu đề, mô tả, link quay lại, hành động) ở đầu mỗi trang quản lý.
