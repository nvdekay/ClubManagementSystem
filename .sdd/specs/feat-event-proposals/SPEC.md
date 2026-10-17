# SPEC: feat-event-proposals

## Vấn đề
Hoàn thiện UC25 phía CLB theo kế hoạch Wave 3 và SRS hiện hành.

## Hành vi
Draft, sửa, kiểm tra xung đột và nghĩa vụ, nộp/nộp lại; snapshot bất biến và task mới; Internal không ngân sách ghi nhận thẳng.

API nằm dưới `/clubs/{clubId}/events`; kiểm tra ownership và permission theo từng thao tác.
Mọi mutation dùng CSRF/authGuard và transaction, kiểm tra lại quyền/trạng thái trước khi ghi.
Response dùng phong bì chuẩn; lỗi validation/forbidden/not_found/conflict qua DomainError.
UI có en/vi, sáng/tối, loading/error/empty, primitive dùng chung.
Chi tiết hợp đồng và chính sách: [kế hoạch](../../../docs/05-implementation/WAVE_3_EVENTS_PLAN.md).
Chính sách triển khai theo chỉ dẫn người dùng làm theo khuyến nghị ngày 2026-10-11:
UC25 báo trước 168 giờ; UC28 huỷ dưới 24 giờ là muộn; FIFO; chuỗi dùng chung
registration/attendance; đổi lịch giữ đăng ký và đóng tiếp nhận tới khi duyệt/công bố lại;
booking In Use giữ đến hết slot; mở khoá Internal Closed → Completed; rating overall 1–5,
feedback bất biến và tổng hợp hiển thị ngay khi đủ ngưỡng.

## Ánh xạ yêu cầu

UC25; FR-UC25-01–15; BR10/15/21/44/45/53/54.

## Tiêu chí nghiệm thu

- [x] Lưu/sửa Draft; nộp đồng thời chỉ tạo một version/task; Internal không ngân sách ghi RECORD_INTERNAL, không tạo task.
- [x] Nộp lại giữ bản cũ, tạo revision/task mới và từ chối đúng mốc hết hạn sửa.
- [x] Chặn thiếu báo trước, ngoài học kỳ, sau hạn giải thể, nghĩa vụ quá hạn và blocking conflict; transaction không để bản nộp dở dang.
- [x] AuthGuard và OpenAPI khớp router; validation strict từ chối field ngoài hợp đồng.
- [x] Browser QA en/vi, sáng/tối, 390/1440 px; không tràn ngang trang hoặc lỗi runtime.
- [x] npm run check xanh và client build thành công.

Bằng chứng: `server/tests/unit/club-event.test.ts`, `server/tests/unit/openapi.test.ts`,
`server/tests/integration/mongo-club-event-repository.test.ts` và các regression UC15/26/29/31.
Các kiểm thử dùng Mongo thật cho nghiệp vụ; browser QA dùng API fixture để kiểm tra bố cục.
Chi tiết phạm vi kiểm chứng và giới hạn: [bàn giao](../../../docs/05-implementation/WAVE_3_EVENTS.md).

## Ngoài phạm vi
UI báo cáo/quyết toán Wave 4; không thay schema/dependency/env.
UC26 tái sử dụng phần đã có; chỉ bổ sung tương thích khi cần.

## Changelog
- 2026-10-17 — UI nêu rõ nghĩa vụ quá hạn (UC25 E2), số đăng ký bị ảnh hưởng khi giảm sức chứa (UC30 E1) và số xung đột chặn; nghĩa vụ báo cáo định kỳ có dạng `overduePeriodicReport:<periodCode>`.
- v0.1.0 (2026-10-11) — người dùng yêu cầu triển khai theo đề xuất; triển khai theo khuyến nghị đã được giao; API/UI và kiểm chứng hoàn tất.
