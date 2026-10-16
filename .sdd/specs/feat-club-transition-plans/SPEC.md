# SPEC: feat-club-transition-plans

## Vấn đề
UC13 thiếu đầu vào UC12: Leader cần lập, sửa và nộp kế hoạch bàn giao nhiệm kỳ cùng nghĩa vụ.

## Hành vi
- Leader có club.transition.plan đọc context nhiệm kỳ hiện hành, ghế ban chủ nhiệm hiện có, thành viên Active, nghĩa vụ M05/M07/M08 và lịch sử kế hoạch.
- Tạo Draft kèm nhiệm kỳ đích Planned. Một CLB chỉ có một Draft/Returned/Pending Confirmation; khoá CLB khi tạo để tránh trùng.
- Sửa Draft/Returned dùng revision chống ghi đè. Nộp kiểm tra lại ứng viên Active, đủ từng ghế, không trùng người, mỗi nghĩa vụ còn tồn tại phải có người nhận trong ban mới. Chuyển giao sớm cần lý do.
- Nộp lưu snapshot audit bất biến, tạo task TRANSITION_PLAN mới. UC13 xác nhận mới đổi quyền; trả lại vẫn sửa/nộp được và giữ quyết định các vòng cũ.
- Không khôi phục role tuỳ tạo hay cấu hình permission: sử dụng các ghế hiện hành theo feat-fixed-club-roles; hỗ trợ dữ liệu cũ isBoardSeat.
- API /clubs/:clubId/transition-plans (GET/POST), /:id (PUT), /:id/submit (POST); UI song ngữ cùng route CLB.

## Tiêu chí nghiệm thu
- [ ] Quyền/ownership và revision áp dụng tại commit.
- [ ] Nạp nghĩa vụ từ dữ liệu thật; chặn nộp thiếu người nhận/ứng viên/ngày/lý do sớm.
- [ ] Tạo/sửa/nộp không thay quyền; UC13 duyệt chuyển quyền nguyên tử.
- [ ] Trả lại và nộp lại giữ snapshot và mọi quyết định.
- [ ] Mongo test, UI, OpenAPI, mount, check/build xanh.

## Ngoài phạm vi
Role tự tạo UC23 đã rút và tự hoàn tất nghĩa vụ được bàn giao.

## Changelog
- 2026-10-15 — theo yêu cầu hoàn thiện UC và cho phép sửa schema của người dùng.
