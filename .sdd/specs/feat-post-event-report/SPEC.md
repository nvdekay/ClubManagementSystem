# SPEC: feat-post-event-report

## Vấn đề
UC32 đã chốt điểm danh nhưng CLB chưa nộp được báo cáo có snapshot bất biến cho ICPDP đóng sự kiện.

## Hành vi
- CLB có `club.report.submit` đọc nghĩa vụ, tạo/sửa Draft và nộp khi Completed, đã chốt điểm danh.
- Internal không ngân sách không sinh nghĩa vụ. Deadline POST_EVENT lấy từ policy hiệu lực; nộp trễ vẫn nhận.
- Mỗi version một document, unique `(eventId, versionNo)`; snapshot tại submit chứa đề xuất đã duyệt, thống kê điểm danh, ngân sách/khoản chi và feedback đủ ngưỡng. Không lộ danh tính feedback.
- Submitted không sửa nội dung. Trả sửa tạo Draft version mới, giữ nguyên version cũ và quyết định.
- ICPDP claim task rồi accept/return/finding có lý do. Mâu thuẫn số liệu điểm danh bắt buộc return. Finding nối usecase UC40.
- Báo cáo và ngân sách đóng độc lập. Khi đã nộp báo cáo không mở khoá điểm danh.
- API dưới `/clubs/:clubId/event-reports` và `/admin/event-reports`, lỗi chuẩn 400/403/404/409.

## Tiêu chí nghiệm thu
- [ ] Quyền/ownership kiểm tra ở usecase và tại commit.
- [ ] Nộp kép chỉ có một task; snapshot bất biến, nộp lại có version mới.
- [ ] Deadline, nộp trễ, Internal và điểm danh chưa chốt đúng nghiệp vụ.
- [ ] Claim/decision độc quyền; return/finding/accept audit và notification cùng transaction.
- [ ] UI en/vi, sáng/tối, mobile/desktop và demo API thật.

## Ngoài phạm vi
UC38/UC39 và toàn bộ vòng đời UC40.

## Changelog
- v1.0.0 (2026-10-11) — triển khai theo plan Wave 4 được người dùng yêu cầu.
