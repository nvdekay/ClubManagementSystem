# SPEC: feat-event-publishing

## Vấn đề
Hoàn thiện UC27 phía CLB theo kế hoạch Wave 3 và SRS hiện hành.

## Hành vi
Công bố Approved → Upcoming, form và khung đăng ký/check-in; Internal chỉ trong CLB; sự kiện mở tự do.

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

UC27; FR-UC27; BR53/54.

## Tiêu chí nghiệm thu

- [x] Chỉ Approved được công bố; registration close không sau start; không đăng ký phải cho walk-in.
- [x] Công bố sinh check-in code và Upcoming; UC29 đăng ký được dữ liệu do UC25/UC26 tạo.
- [x] Internal không ngân sách đi Draft → Approved → Upcoming mà không sinh review task.
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
