# SPEC: feat-event-capacity

> **Cập nhật 2026-10-13 (review issue I66, ADR-007):** UC30 do mọi thành viên `Active` làm được — `club.attendance.manage` là permission mặc định (BR54).

## Vấn đề
Hoàn thiện UC30 phía CLB theo kế hoạch Wave 3 và SRS hiện hành.

## Hành vi
Danh sách đăng ký, đổi sức chứa, FIFO promote thủ công và tự động trong transaction.

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

UC30; FR-UC30-01–07; BR54.

## Tiêu chí nghiệm thu

- [x] Huỷ Confirmed trong UC29 tự promote đầu Waitlisted cùng transaction; counter không vượt capacity khi policy cấm.
- [x] Giảm capacity dưới Confirmed trả conflict kèm registrationIds; promote thủ công dùng cùng FIFO.
- [x] Danh sách CLB có Confirmed/Waitlisted, thứ tự chờ, tìm kiếm và phân trang; quyền attendance tách event/feedback.
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
- v0.1.0 (2026-10-11) — người dùng yêu cầu triển khai theo đề xuất; triển khai theo khuyến nghị đã được giao; API/UI và kiểm chứng hoàn tất.
