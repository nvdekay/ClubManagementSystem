# SPEC: feat-club-application-review

## Vấn đề
UC07 đã tạo hồ sơ bất biến và một review task nhưng ICPDP chưa có hàng đợi, màn thẩm định hay
khả năng ra quyết định. UC08 phải khép kín luồng này bằng đúng một quyết định của
`ICPDP_OFFICER`, không có Head hay cấp duyệt thứ hai.

## Hành vi
- Chỉ `ICPDP_OFFICER` đang hoạt động được xem hàng đợi và thẩm định hồ sơ.
- Hàng đợi liệt kê review task `Open` của hồ sơ thành lập, ưu tiên hồ sơ cũ trước; khi officer
  mở hồ sơ `Submitted`, task được nhận bởi officer và hồ sơ chuyển `Under Review`.
- Màn chi tiết hiển thị snapshot version hiện tại, mọi version đã nộp, tài liệu, thành viên sáng
  lập, cơ cấu role, ghi chú và lịch sử quyết định; ICPDP không sửa nội dung hồ sơ.
- Một task nhận đúng một trong ba kết quả: `Request revision`, `Approve`, `Reject`.
- Yêu cầu chỉnh sửa bắt buộc lý do, ít nhất một phần chưa đạt và deadline tương lai; hồ sơ sang
  `Revision Requested`. Từ chối bắt buộc lý do và không tạo Club.
- Phê duyệt tạo đúng một Club `Pending Setup`, nhiệm kỳ setup, membership cho các founder,
  `clubPositions` và `clubRoleStructureVersions` phiên bản 1 từ snapshot đã duyệt. Người đứng
  đơn được nhận diện là approved founder để dùng quyền tạm thời của BR47.
- Quyết định, cập nhật hồ sơ, đóng task, audit và notification cùng commit trong một transaction.
  Retry hoặc cạnh tranh không được tạo quyết định hay Club thứ hai.
- UI có loading/error/empty/success, responsive, light/dark và i18n `en`/`vi`.

## Tiêu chí nghiệm thu
- [x] Người không có `ICPDP_OFFICER` nhận 403 ở mọi endpoint review.
- [x] Mở hồ sơ chuyển `Submitted → Under Review` và gán task atomically; officer khác không thể
  chiếm task đã được gán.
- [x] Mỗi task chỉ có một decision; request lặp/concurrent không tạo dữ liệu trùng.
- [x] Revision/Reject validate lý do; Revision validate section và deadline tương lai.
- [x] Approve tạo Club `Pending Setup`, founder memberships, role structure v1 và liên kết
  `createdClubId`; Reject không tạo Club.
- [ ] Queue/detail và ba hành động chạy được trên desktop/mobile, `en`/`vi`, light/dark —
  typecheck/lint/build đã xanh; còn nghiệm thu trực quan thủ công.

## Ngoài phạm vi
Scheduler làm hết hạn deadline chỉnh sửa; gửi email outbox; UC09–UC11 hoàn thiện và kích hoạt
CLB; thay đổi hoặc xuất lại sơ đồ.

## Changelog
- v0.2.0 (2026-10-08) — hoàn tất backend, API, queue/detail UI, i18n và automated tests;
  còn visual QA thủ công.
- v0.1.0 (2026-10-08) — chốt UC08 một cấp duyệt và bắt đầu implementation.
