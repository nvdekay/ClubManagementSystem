# TASKS: feat-facility-booking

## Overbooking do ICPDP quyết định
- [x] Guard policy/role/lý do, transaction và audit/notification cho đặt trùng.
- [x] API/OpenAPI, UI ICPDP và lịch sử ngoại lệ en/vi.
- [x] Test quyền, policy, lý do, rollback và cập nhật report/SRS; chạy check/build.

Kiểm chứng overbooking ngày 2026-10-11: `npm run check` qua 81 file / 379 test,
gồm Mongo thật; build client thành công (cảnh báo bundle lớn hiện có). Cập nhật
diagram theo actor trang CLB/ICPDP, xuất PNG và đồng bộ hai hình vào report v2.
Giao diện được kiểm tra bằng lint/typecheck/build; chưa kiểm thử trực tiếp trong trình duyệt.

- [x] Đọc UC44–47, xác nhận phạm vi ICPDP và quy tắc xung đột/huỷ muộn, viết SPEC.
- [x] Domain và use case; permission và guard nghiệp vụ.
- [x] Mongo repository: draft/version/task/decision, khoá slot, audit và notification.
- [x] Route/OpenAPI và nối dây; job vòng đời booking, hàm cascade dùng chung.
- [x] UI CLB: danh mục/lịch, draft/nộp lại, theo dõi/huỷ và lịch sử.
- [x] UI ICPDP: hàng đợi/nhận/duyệt, đề xuất thay thế, FR-05.
- [x] i18n en/vi và seed demo.
- [x] Unit/integration test theo AC; npm run check xanh (81 test files / 361 tests, có Mongo thật).
- [x] Nghiệm thu giao diện en/vi, sáng/tối (Chrome, API fixture; 390/1440 px).

Kiểm chứng ngày 2026-10-10: `npm run check` và `npm run build -w client` thành công.

## Điều chỉnh đặt theo slot
- [x] Danh mục bốn slot từ server, validate và kiểm tra xung đột theo slot.
- [x] UI CLB/ICPDP chọn ngày + slot; tên phòng rõ mã/toà/tầng.
- [x] Seed phòng Hoà Lạc và booking theo slot cho account hiện có.
- [x] Test slot, chạy check/build và kiểm tra giao diện.

Kiểm chứng điều chỉnh slot: 81 file / 361 test, build client thành công. Seed idempotent
cho `tnh.t1k30.ht@gmail.com`: 3 phòng, 4 yêu cầu theo slot; 4 yêu cầu mẫu cũ Released.

## Điều chỉnh giao diện booking
- [x] Thay select native bằng AppSelect; danh sách thành AppTable có phân trang; tạo/sửa trong AppDialog.
- [x] Kiểm tra giao diện và chạy npm run check/build.

Kiểm chứng giao diện: Chrome en/vi sáng/tối, 390/1440 px, tạo draft trong AppDialog,
ICPDP chọn phương án thay thế qua AppSelect. Fixture 25 booking kiểm tra trang cuối,
đổi số dòng, lọc trạng thái về trang đầu; chọn slot bằng bàn phím.
`npm run check`: 81 file / 361 test, không có cảnh báo lint mới; build client thành công.

## Điều chỉnh hai luồng booking — 2026-10-11
- [x] Chốt SPEC: ROOM trực tiếp; cơ sở vật chất khác cần ICPDP duyệt.
- [x] Domain/API/repository và quyền liên kết UC25.
- [x] UI booking, danh mục OUTDOOR/STAGE và i18n.
- [x] Đồng bộ DOCX, SRS, use case model/spec và diagram/PNG.
- [x] Unit/integration, npm run check, build client và kiểm tra UI.

## Bỏ luồng phòng học khỏi UC45–47 — 2026-10-11 (v1.4.0, xem feat-room-allocation)
- [x] Cập nhật SPEC v1.4.0, đánh dấu AC11/12/13/16/17 bị thay; đồng bộ SRS, đặc tả/mô hình UC, diagram, guide book, DOCX.
- [ ] Chặn ROOM ở mọi endpoint CLB; `booking-properties` của CLB không trả ROOM.
- [ ] Gỡ endpoint overbook, `booking-responsible`, `RoomOverbookingForm` và i18n liên quan.
- [ ] ICPDP không đề xuất ROOM làm phương án thay thế; UC25 từ chối gắn booking ROOM.
- [ ] Unit/integration, `npm run check`, build client và kiểm tra UI `/club/:clubId/bookings`.
