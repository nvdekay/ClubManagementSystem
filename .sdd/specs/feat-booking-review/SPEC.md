# SPEC: feat-booking-review

## Vấn đề
CLB gửi yêu cầu đặt phòng/thiết bị (UC45, do dev phía CLB làm) nhưng ICPDP chưa có chỗ thẩm định.
UC46 cho officer nhận yêu cầu, xem đủ bối cảnh (CLB, mục đích, sức chứa, xung đột khung giờ, nghĩa vụ
quá hạn) và ra đúng một quyết định; booking được duyệt giữ khung giờ (BR33).

## Hành vi
- Chỉ `ICPDP_OFFICER` dùng được các endpoint dưới `/admin/bookings`.
- `GET /admin/bookings` — hàng đợi: approval task `PROPERTY_BOOKING` đang `Open` mà booking ở
  `Requested` / `Under Review`; cũ trước. Mỗi dòng có property, CLB, mục đích, khung giờ, số người,
  người đang nhận.
- `POST /admin/bookings/:id/claim` — officer nhận task; `Requested → Under Review` (FR-UC46-01),
  audit `PROPERTY_BOOKING_REVIEW_CLAIMED`. Task đã có người khác nhận → 409.
- `GET /admin/bookings/:id` — chi tiết: booking + property (vị trí, sức chứa), sự kiện liên quan,
  CLB (trạng thái + nghĩa vụ quá hạn: quyết toán, hoàn trả, báo cáo định kỳ), xung đột BR15, cờ
  `outsideHours` (ngoài giờ được đặt hoặc trong thời gian khoá, giờ trường UTC+7), `allowOverbooking`
  của chính sách, và các quyết định trước (mọi task của booking).
- Xung đột: booking khác trên cùng property chồng giờ (`Approved`/`In Use` = **giữ chỗ**,
  `Requested`/`Under Review` = cảnh báo) và sự kiện đang `Approved`/`Upcoming`/`Ongoing` dùng property đó
  (sự kiện cấp trường do ICPDP tổ chức giữ chỗ; sự kiện CLB chỉ cảnh báo vì nó cần booking riêng).
- `POST /admin/bookings/:id/decision` — đúng một kết quả cho mỗi task:
  - `Request revision`: bắt buộc lý do; có thể kèm phương án thay thế (A1): property khác đang hoạt
    động và/hoặc khung giờ mới (đủ cả bắt đầu và kết thúc, ở tương lai) → `Revision Requested`.
  - `Reject`: bắt buộc lý do → `Rejected`.
  - `Approve` (lý do không bắt buộc) → `Approved`. Trong transaction kiểm lại: CLB phải `Active`
    (BR34) và không có gì đang giữ chỗ chồng giờ trừ khi chính sách cho phép overbooking (BR33/E1) →
    nếu vi phạm trả 409, officer phải trả về.
  - Quyết định (`approvalDecisions`, `comments = { versionNo, alternative? }`), đổi trạng thái booking
    (`decidedBy`, `decidedAt`, `decisionReason`), đóng task (`Decided`), audit `PROPERTY_BOOKING_<STATE>`
    và notification `PROPERTY_BOOKING_STATUS` cho ban chủ nhiệm CLB commit trong một transaction.
- Lý do bắt buộc với Từ chối và Yêu cầu chỉnh sửa theo BR05 và ghi chú của `approvalDecisions`
  (SRS FR-UC46-03 ghi "hai kết quả sau" — đã chọn cách đọc nhất quán với BR05).

## Hợp đồng dữ liệu cho phía CLB (UC45 — dev phía CLB phải tuân theo)
Khi gửi (hoặc gửi lại sau `Revision Requested`), trong một transaction:
1. `propertyBookings`: `propertyId`, `clubId`, `clubName`, `purpose`, `startAt`, `endAt`,
   `semesterCode`, `headcount`, `eventId` (nếu gắn với đề xuất sự kiện, UC45 A2), `conflictResult`
   (BR15 như CLB thấy), `state: "Requested"`, `currentVersionNo` (+1 mỗi lần gửi lại), `createdAt`.
2. `approvalTasks`: `{ entityType: "PROPERTY_BOOKING", entityId: bookingId, clubId, title: purpose,
   state: "Open", openedAt }` — **mỗi lần gửi một task mới** (BR16/WF-05).
3. Phương án thay thế của officer nằm ở quyết định mới nhất (`approvalDecisions.comments.alternative`
   `{ propertyId?, propertyLabel?, startAt?, endAt? }`) để form gửi lại của CLB điền sẵn.
CLB `Suspended` không được tạo booking mới (BR34); kiểm tra BR33/BR45/giai đoạn khoá là của UC45.

## Tiêu chí nghiệm thu
- [x] Người không có `ICPDP_OFFICER` nhận 403 ở mọi endpoint.
- [x] Claim chuyển `Requested → Under Review` và gán task; officer khác không chiếm được.
- [x] Reject/Revision bắt buộc lý do; phương án thay thế chỉ đi với Revision và phải hợp lệ.
- [x] Approve bị chặn (409) khi có booking đã duyệt chồng giờ (trừ khi cho phép overbooking) hoặc CLB
  không `Active`; hợp lệ thì booking `Approved`, task `Decided`, ban chủ nhiệm nhận thông báo.
- [x] Mỗi task chỉ có một quyết định; quyết định lần hai → 409.
- [ ] Hàng đợi/chi tiết/quyết định chạy trên desktop/mobile, `en`/`vi`, sáng/tối —
  typecheck/lint/build đã xanh; còn nghiệm thu trực quan thủ công.

## Ngoài phạm vi
UC45 (form gửi phía CLB), UC47 huỷ/trả và scheduler `Approved → In Use → Completed`, email outbox,
hộp thư thông báo trong app.

## Changelog
- v0.1.0 (2026-10-10) — backend, API, UI, i18n, seed demo và test tự động; còn visual QA.
