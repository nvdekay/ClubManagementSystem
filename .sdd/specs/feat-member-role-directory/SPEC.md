# SPEC: feat-member-role-directory

## Vấn đề
Thành viên cần biết mỗi role có permission gì mà không mở màn Thiết lập CLB hay được cấp quyền quản trị role.

## Hành vi
- Menu, route và API đọc Thiết lập CLB chỉ mở với club.role.manage (Leader/founder được cấp quyền tạm khi Pending Setup).
- Menu Thành viên mở cho workspace CLB. Thành viên thường xem danh mục role/permission chỉ đọc; người có club.member.manage vẫn có bảng quản trị thành viên như trước.
- GET /clubs/{clubId}/role-directory dành cho membership Active/Inactive đúng CLB; chặn Locked, chưa đăng nhập, Left/Banned và người ngoài CLB.
- Response chỉ có định nghĩa role đang hoạt động và permission tương ứng, không có email, danh sách thành viên, lịch sử cơ cấu hoặc holder assignment. Role Leader thể hiện toàn bộ quyền thực tế.
- Mọi API thay đổi role giữ nguyên yêu cầu club.role.manage; thành viên không có nút tạo/sửa/gán/thu hồi role ở danh mục.

## Tiêu chí nghiệm thu
- [ ] Thành viên thường đọc được danh mục mà không cần quyền quản trị; người ngoài/Left/Banned bị chặn.
- [ ] Response không chứa danh sách thành viên hoặc lịch sử; Leader có đủ quyền bao gồm quyền riêng.
- [ ] Thiết lập không xuất hiện với thành viên; Thành viên có mục role/permission chỉ đọc.
- [ ] Mutation role vẫn bị chặn với thành viên thường; npm run check xanh.

## Ngoài phạm vi
Không đổi schema, không cấp thêm permission quản trị hay quyền đọc danh sách thành viên cho thành viên thường.

## Changelog
- v1.0.0 (2026-10-11) — yêu cầu người dùng trong phiên hiện tại.

## Bổ sung UX — 2026-10-11

Tách bảng thành viên và danh mục vai trò thành hai tab độc lập theo ảnh tham chiếu.
Tab vai trò chọn một vai trò ở danh sách bên trái và hiển thị các nhóm quyền được cấp bên phải;
trên màn nhỏ hai phần xếp dọc. Danh mục vẫn chỉ đọc. Tab thành viên giữ phân quyền hiện hành;
thành viên thường mở trực tiếp tab vai trò, không gọi API quản trị. Query `tab` giữ tab khi tải lại.
