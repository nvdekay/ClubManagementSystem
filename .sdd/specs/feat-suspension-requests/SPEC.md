# SPEC: feat-suspension-requests

## Vấn đề
UC14 chưa cho Leader gửi yêu cầu tạm ngừng để ICPDP quyết định ở UC15.

## Hành vi
- Leader xem các sự kiện Approved/Upcoming và booking Approved tương lai sẽ bị huỷ nếu duyệt.
- Nộp lý do, ngày kết thúc dự kiến, phương án xử lý nghĩa vụ và kế hoạch phục hồi. Tạm ngừng có hiệu lực khi ICPDP duyệt; không tự chuyển trạng thái khi nộp.
- Cần xác nhận đúng danh sách ảnh hưởng hiện tại; danh sách đổi trước commit thì trả conflict để đọc/xác nhận lại. Một yêu cầu Pending mỗi CLB.
- Tạo SUSPENSION_REQUEST task, audit và báo ICPDP. Leader theo dõi yêu cầu/nhận xét của chính CLB.
- ICPDP xem queue, Approve/Reject kèm lý do. Approve thực thi cascade UC15 cùng transaction quyết định/task/request; Reject giữ CLB Active. Kiểm tra lại quyền và trạng thái tại commit.
- UI CLB và ICPDP song ngữ, loading/error/empty, không xoá lịch sử.

## Tiêu chí nghiệm thu
- [ ] Quyền/ownership; CLB không Active không gửi được.
- [ ] Cảnh báo đủ sự kiện/booking, chặn xác nhận danh sách cũ và yêu cầu trùng.
- [ ] Approve huỷ sự kiện/booking và đóng task atomically; Reject không tác động lịch.
- [ ] Hai quyết định cạnh tranh chỉ một thành công, giữ audit/notification.
- [ ] API/OpenAPI/UI/mount và test/check/build xanh.

## Ngoài phạm vi
Hẹn giờ bắt đầu tạm ngừng; ngày bắt đầu là thời điểm ICPDP duyệt theo UC15 hiện có.

## Changelog
- 2026-10-15 — yêu cầu hoàn thiện UC và quyền sửa schema được người dùng xác nhận.
