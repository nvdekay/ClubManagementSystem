# TASKS

- [x] API danh mục chỉ đọc, response thu gọn, kiểm thử phân quyền và không trả holder/email/version.
- [x] Menu Thành viên mở cho thành viên; màn chỉ đọc không gọi API roster/withdrawal nếu không có club.member.manage.
- [x] Giới hạn menu, route và API đọc Thiết lập theo club.role.manage.
- [x] Nhãn/mô tả permission hai ngôn ngữ, quyền riêng của chủ nhiệm và cache refresh sau chỉnh role.
- [x] Unit test phân quyền danh mục và Settings; kiểm tra/build và cập nhật tài liệu.

## Kiểm chứng
Unit test xác nhận Active/Inactive đọc được danh mục, người ngoài/Left/Banned/Locked bị chặn;
thành viên thường không thể đọc Settings, đọc dữ liệu quản trị role hoặc thay đổi role. Chưa kiểm thử browser.

Đã tích hợp trên `agent/wave-2-facility-booking`, giữ tab Thiết lập chỉ còn Hồ sơ/Vai trò
và giữ API role cũ trả bản chỉ đọc đã loại members/holders/versions cho thành viên.

Kiểm tra sau khi chuyển vào branch chính đang mở: `npm run check` đạt 374/374 test
(trong đó có integration Mongo), build frontend đạt.

## Bổ sung UX hai tab

- [x] Tách hai tab, lưu query, hỗ trợ bàn phím và giữ phân quyền quản trị.
- [x] Danh sách vai trò và panel quyền chỉ đọc, responsive, nhãn en/vi.
- [x] Cập nhật tài liệu; lint/typecheck và test toàn bộ.
