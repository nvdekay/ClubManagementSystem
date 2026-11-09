# components/layout/

Các khung bố cục cấu trúc. Không có tiền tố `App`.

- `PublicLayout` — header/footer cho các trang khám phá (`/`, `/clubs`, `/events`). Guest xem được
  (UC06, chỉ đọc): header hiện nút "Đăng nhập" thay cho `UserMenu`, link đăng nhập giữ trang đang
  xem trong `returnTo`; ứng tuyển/đăng ký mới yêu cầu phiên. Bố cục
  tham khảo pdp.fpt.edu.vn nhưng giữ tông xanh ngọc chung của hệ thống, chỉ màu đơn sắc, không
  gradient: header trắng, footer nền `hero-app` với thông tin FPT Education. Trang chủ `/` tự quản
  bề rộng (dải nền tràn viền), các trang khác nằm trong khung `max-w-7xl`.
- `UserMenu` — avatar người dùng trên header công khai; bấm mở menu gồm "Không gian làm việc" và
  "Đăng xuất" (màu đỏ). Đóng bằng Escape hoặc bấm ra ngoài.
- `WorkspaceShell` — khung sidebar trái cho mọi màn quản lý (Sinh viên, ICPDP, CLB); trên desktop thu gọn
  được còn cột icon (nhớ trong `localStorage`, bấm nhóm khi đang thu gọn sẽ mở lại sidebar ở nhóm đó); trên mobile
  sidebar thành drawer. Tự kiểm tra đăng nhập và quyền truy cập workspace theo URL. Menu của cả ba
  workspace gom thành tab cha (`NavGroup`, bấm để mở/thu gọn, tự mở khi đang ở một tab con); với CLB
  mỗi tab con vẫn lọc theo permission của role, nhóm chỉ còn một tab hiện thành link thường, nhóm rỗng ẩn đi.
- `SidebarAccountMenu` — chân sidebar của `WorkspaceShell`: avatar, tên và email; bấm mở menu (mở lên trên, hoặc sang
  phải khi sidebar thu gọn) gồm đổi chế độ sáng/tối, đổi ngôn ngữ và "Đăng xuất" (màu đỏ). Đóng bằng Escape hoặc bấm ra ngoài.
- `NotificationBell` — chuông thông báo in-app (NTF-04) ở chân sidebar và header mobile của `WorkspaceShell`: badge số
  chưa đọc (làm mới mỗi phút), bấm mở hộp thoại danh sách mới nhất trước, "Xem cũ hơn" theo trang, "Đánh dấu tất cả đã
  đọc"; bấm một dòng thì đánh dấu đã đọc và mở trang liên quan (`utils/notificationLink`). Chuông chỉ đếm và liệt kê
  thông báo của workspace hiện tại (`scope` lấy từ context của `WorkspaceShell`: sinh viên / ICPDP / CLB — CLB thì chỉ
  thông báo về đúng CLB đó); "Đánh dấu tất cả đã đọc" cũng chỉ áp dụng trong workspace đó.
- `PageHeader` — khối tiêu đề (tiêu đề, mô tả, link quay lại, hành động) ở đầu mỗi trang quản lý.
