# SPEC: feat-notification-inbox

## Vấn đề
Các use case đã ghi `notifications` trong transaction nghiệp vụ, nhưng người dùng không có chỗ nào để đọc
chúng, và không có worker rút outbox gửi email (SRS §8.2 NTF-01..07, SCH-10, EXT-02). Tính năng này nối hai
đầu còn thiếu: hộp thông báo in-app chung cho mọi workspace và worker gửi email có retry.

## Hành vi
- `GET /api/v1/notifications/mine?limit=1..50&before=<ISO>&unreadOnly=true|false` (cần phiên, không cần CSRF):
  thông báo của chính người gọi, mới nhất trước; trả `{ items, unread, nextBefore? }`. Mỗi item có
  `eventCode`, `entityType`, `entityId`, `payload`, `createdAt`, `readAt?` và `clubId?` (lấy từ payload hoặc từ
  thực thể — sự kiện, booking, vi phạm, … — để client dựng link). Query lạ hoặc sai → 400.
- `GET /api/v1/notifications/mine/unread-count` → `{ unread }`.
- `POST /api/v1/notifications/{id}/read` (CSRF): đặt `readAt`; id sai dạng → 400; không có hoặc của người khác → 404.
  Trả `{ unread }`.
- `POST /api/v1/notifications/mine/read-all` (CSRF) → `{ marked, unread }`.
- Đọc chuyển `state` sang `Read` nếu dòng đã giao (`Sent`) hoặc chỉ có kênh in-app; dòng còn email chờ gửi giữ
  `Queued` để worker vẫn gửi — gửi xong thì thành `Read` luôn.
- Kênh: `notificationChannels(eventCode)` thêm `EMAIL` cho các sự kiện "In-app + Email" của ma trận §8.2
  (`CLUB_APPLICATION_REVISION_REQUESTED/APPROVED/REJECTED`, `EVENT_PROPOSAL_APPROVED/REJECTED`,
  `PROPERTY_BOOKING_STATUS`, `VIOLATION_RESPONSE_REQUESTED/DECIDED/CLOSED_NO_VIOLATION`).
- Worker `notification-delivery-job` mỗi phút: dòng chỉ in-app đến hạn → `Sent`. Dòng có `EMAIL`: claim nguyên tử
  (`findOneAndUpdate` đẩy `dueAt` qua lease 5 phút và tăng `attempts`), gửi qua `MailTransport`, ghi một
  `emailDeliveryLogs` mỗi lần thử (`Sent` / `Retrying` / `Failed`). Lỗi → `dueAt = now + 1, 2, 4, 8 phút` (tối đa
  1 giờ), lần thứ 5 lỗi → `Failed` + `lastError`. Người nhận không có email → `Failed` ngay. Lỗi gửi không đụng
  thay đổi nghiệp vụ đã commit (CON-09). Worker chết giữa chừng → dòng được thử lại khi hết lease (giao ít nhất một lần).
- Client: chuông ở chân sidebar và header mobile của `WorkspaceShell` với badge số chưa đọc (làm mới mỗi phút); hộp
  thoại liệt kê tiêu đề theo `eventCode` (i18n en/vi, có tiêu đề dự phòng theo nhóm), chủ thể từ payload, lý do, thời
  gian; bấm một dòng → đánh dấu đã đọc và mở trang liên quan nếu có; "Xem cũ hơn"; "Đánh dấu tất cả đã đọc".

## Tiêu chí nghiệm thu
- [x] Danh sách chỉ gồm thông báo của chính người gọi, mới nhất trước, phân trang bằng `before`, có `clubId` suy ra.
- [x] Đánh dấu thông báo của người khác → 404; đánh dấu đọc không huỷ email đang chờ.
- [x] Hai lần claim liên tiếp trong thời hạn lease chỉ một lần trả về dòng.
- [x] Gửi lỗi → retry với backoff và log `Retrying`; hết lượt → `Failed`; gửi được → `Sent` (hoặc `Read` nếu đã đọc).
- [x] Sự kiện trong ma trận email được xếp kênh `EMAIL`, sự kiện khác chỉ `IN_APP`.
- [x] Chuông hiện số chưa đọc, hộp thoại không tràn ngang ở 390px, sáng/tối, en/vi.

## Ngoài phạm vi
- SMTP thật (Google SMTP, EXT-02): cần thêm dependency SMTP và `SMTP_*` — chờ người dùng duyệt. Hiện dùng
  `logMailTransport` chỉ ghi người nhận + tiêu đề ra log.
- Tuỳ chọn tắt/bật từng loại thông báo, đẩy realtime (websocket), mẫu email HTML.
- Lease document chung cho mọi job (NTF-07 bản đầy đủ): worker này chống gửi trùng bằng claim từng dòng; các job
  khác vẫn chạy idempotent như trước.

## Changelog
- v1.0.0 (2026-10-19) — làm theo yêu cầu "làm nốt các UC còn thiếu" (khoảng trống số 12 trong CURRENT_IMPLEMENTATION).
