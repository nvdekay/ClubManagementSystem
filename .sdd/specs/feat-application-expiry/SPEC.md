# SPEC: feat-application-expiry

## Vấn đề
UC07/08 có revisionDeadlineAt nhưng chưa có job chuyển hồ sơ quá hạn sang Expired.

## Hành vi
- Quét lúc khởi động và mỗi giờ: chỉ Revision Requested với revisionDeadlineAt <= now thành Expired.
- Transaction cập nhật hồ sơ, đóng task còn mở, ghi audit và báo founder. Chạy lại/cạnh tranh không ghi trùng.
- Nộp lại kiểm tra deadline trong transaction kể cả khi job chưa chạy; không đổi hồ sơ Submitted/Approved hoặc hồ sơ không có hạn.

## Tiêu chí nghiệm thu
- [ ] Hết hạn đúng mốc, bỏ qua trạng thái khác/hạn thiếu.
- [ ] Idempotent, cạnh tranh nộp/hết hạn chỉ một bên hợp lệ, audit/notification nguyên tử.
- [ ] Job nối main.ts và kiểm thử Mongo/check xanh.

## Changelog
- 2026-10-15 — hoàn thiện khoảng trống UC07/08 theo handoff.
