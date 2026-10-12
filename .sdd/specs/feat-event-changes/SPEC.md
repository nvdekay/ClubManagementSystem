# SPEC: feat-event-changes

## Vấn đề
Hoàn thiện UC28 phía CLB theo kế hoạch Wave 3 và SRS hiện hành.

## Hành vi
Huỷ/đổi lịch có lý do; duyệt lại theo D4; cascade registration/booking/ngân sách/nghĩa vụ với audit và notification.

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

UC28; FR-UC28; BR15/19/45/54.

## Tiêu chí nghiệm thu

- [x] Đổi lịch giữ đăng ký, tạo revision/task mới và đóng đăng ký/check-in; blocking conflict rollback toàn bộ.
- [x] Duyệt lại dùng một ngân sách; từ chối duyệt lại huỷ đăng ký/counter và giữ trạng thái Rejected.
- [x] Huỷ ngân sách chưa giải ngân chuyển Cancelled; đã giải ngân giữ state/số tiền/nghĩa vụ và audit settlementRequired.
- [x] UC15 gọi cùng helper trong transaction; audit sự kiện liên kết đúng audit quyết định CLB.
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
