# SPEC: feat-membership-reconfirmation

## Vấn đề
UC21 A2 thiếu scheduler và trạng thái xác nhận đầu kỳ.

## Hành vi
- Đầu mỗi học kỳ đang hiệu lực trong policy, job mở một yêu cầu cho mỗi membership Active đã có trước đầu kỳ, unique membership/kỳ. Thành viên mới gia nhập trong kỳ không phải xác nhận lại ngay.
- Hạn xác nhận = startAt + 14 ngày. Student xem yêu cầu của mình và xác nhận trước hạn; không thể xác nhận thay người khác.
- Ghế Leader đã xác nhận, assignment/term/position hiện còn hiệu lực được miễn; kiểm tra lại tại thời điểm hết hạn để không làm CLB mất ban chủ nhiệm.
- Quá hạn Pending, membership còn Active và không giữ ghế Leader → Inactive, ghi statusHistory/audit/notification trong transaction. Hiệu lực lúc job thực thi, không hồi tố đầu kỳ sau thời gian gia hạn.
- Job idempotent, chạy khi khởi động rồi mỗi giờ; bỏ qua membership Left/Banned/Inactive, xác nhận không tự phục hồi tư cách đã kết thúc.
- Student có panel yêu cầu xác nhận trong trang các CLB của tôi.

## Tiêu chí nghiệm thu
- [ ] Một yêu cầu mỗi kỳ; chạy lại/cạnh tranh không tạo trùng thông báo hoặc lịch sử.
- [ ] Student chỉ xác nhận yêu cầu chính mình, chặn ở đúng deadline.
- [ ] Leader được miễn cả khi được bổ nhiệm giữa kỳ; Active chưa xác nhận chuyển Inactive, Left/Banned giữ nguyên.
- [ ] Chặn hồi tố, giữ assignment và lịch sử; role resolver không cấp quyền cho Inactive.
- [ ] Unit/integration thời gian, OpenAPI/UI/job/mount/check/build xanh.

## Ngoài phạm vi
Sinh viên tự phục hồi Inactive; Leader dùng luồng UC21 đã có để kích hoạt lại sau xác minh.

## Changelog
- 2026-10-15 — người dùng xác nhận hạn 14 ngày, tự Inactive khi quá hạn và miễn Leader đã xác nhận. Quyết định này thay mô tả A2 cũ không có thời gian gia hạn.
