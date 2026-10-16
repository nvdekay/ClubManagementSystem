# SPEC: feat-club-periodic-submission

## Vấn đề
UC39 đã xét báo cáo nhưng thiếu đầu vào UC38 và lịch sử bất biến qua nhiều vòng sửa.

## Hành vi
- Leader có `club.report.submit` xem kỳ báo cáo, báo cáo CLB, số liệu hệ thống và nhận xét trả lại.
- `GET /clubs/:clubId/periodic-reports` trả kỳ từ policy và danh sách báo cáo của chính CLB.
- `POST /clubs/:clubId/periodic-reports` tạo Draft cho một học kỳ đã bắt đầu, hạn theo PERIODIC của policy. Mỗi CLB/kỳ duy nhất.
- `PUT /clubs/:clubId/periodic-reports/:id` sửa Draft/Returned for correction với versionNo dự kiến để chặn ghi đè cạnh tranh.
- `POST /clubs/:clubId/periodic-reports/:id/submit` yêu cầu narrative, nextPlan, ít nhất một minh chứng có note hoặc URL HTTP(S). Đóng băng số liệu cùng kỳ; versionNo tăng mỗi lần nộp lại; lưu snapshot bất biến tại audit PERIODIC_REPORT_SUBMITTED, tạo task mới.
- Submitted/Accepted không cho sửa. Nộp muộn vẫn nhận và gắn lateFlag. Quyết định cũ vẫn đọc được từ audit theo versionNo.
- UI en/vi có form tạo/sửa/nộp, số liệu, nhận xét từng vòng và lịch sử version.

## Tiêu chí nghiệm thu
- [ ] Quyền Leader và ownership áp dụng mọi thao tác; Draft không lộ sang CLB khác.
- [ ] Validate nội dung/minh chứng/kỳ, unique và optimistic concurrency.
- [ ] Hai vòng Return–sửa–Submit–Accept giữ nguyên snapshot/decision và task.
- [ ] Snapshot và task/audit/notification cùng transaction; Accepted mới vào UC42.
- [ ] OpenAPI, mount, UI, unit/integration, check và build xanh.

## Ngoài phạm vi
Báo cáo năm học và mẫu tuỳ chỉnh chưa có trong policy.

## Changelog
- 2026-10-15 — triển khai UC38 theo hợp đồng feat-periodic-reports và yêu cầu hoàn thiện UC của người dùng.
