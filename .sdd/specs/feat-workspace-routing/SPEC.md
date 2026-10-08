# SPEC: feat-workspace-routing

## Vấn đề
Sau đăng nhập, người dùng có thể mang nhiều ngữ cảnh nhưng workspace picker hiện chỉ đổi nội
dung tại chỗ. URL, shell và trang đích chưa phản ánh Student, ICPDP hay CLB đã chọn.

## Hành vi
- Một workspace duy nhất được chuyển thẳng tới home tương ứng; nhiều workspace mở picker.
- Student đi tới `/student`, ICPDP tới `/icpdp`, CLB tới `/club/:clubId`.
- Route đích đọc lại `/auth/me`; ngữ cảnh không còn hiệu lực bị từ chối và không tin dữ liệu
  lưu trong browser.
- Người dùng đổi workspace tại `/workspace`; lựa chọn chỉ phục vụ điều hướng, API vẫn tự kiểm
  tra quyền.

## Tiêu chí nghiệm thu
- [x] Picker hiển thị mọi workspace hiện hành và điều hướng đúng URL theo loại.
- [x] Route role không hợp lệ không hiển thị dữ liệu riêng tư của workspace khác.
- [x] Mỗi home có liên kết tới chức năng đã triển khai và đường đổi workspace/đăng xuất.
- [ ] Giao diện responsive, `en`/`vi`, light/dark và `npm run check` xanh.

## Ngoài phạm vi
Dashboard UC02 bằng dữ liệu tổng hợp và các màn nghiệp vụ chưa được triển khai.

## Changelog
- v0.1.0 (2026-10-08) — tạo spec trước khi triển khai route và shell theo role.
