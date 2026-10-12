# SPEC: feat-student-event-checkin

## Vấn đề
Student đã đăng ký được sự kiện (UC29) nhưng chưa thể chứng minh có mặt. UC31 phải tạo đúng một
`Attendance` cho mỗi người và mỗi sự kiện (BR18), mở feedback window ngay lúc check-in (BR36) để
UC48 có dữ liệu, và dashboard UC02 phải phản ánh lịch sử check-in.

## Hành vi
- Student đã đăng nhập check-in bằng **mã check-in** (`events.checkInCode`) do ban tổ chức xuất
  trình tại địa điểm, từ trang “Đăng ký của tôi” hoặc trang sự kiện. Mã QR là deep link
  `/workspace/event-registrations?checkin=<eventId>&code=<mã>`; quét bằng camera điện thoại mở
  sẵn hộp check-in đã điền mã (không thêm thư viện quét QR).
- So khớp mã không phân biệt hoa thường, bỏ khoảng trắng hai đầu; sai mã trả `validation`.
- Khung giờ check-in = `[checkInOpenAt ?? startAt, checkInCloseAt ?? endAt)`. Event phải đã công
  bố, ở trạng thái `Upcoming` hoặc `Ongoing`; ngoài khung giờ trả `conflict` (E2 — chỉ còn đường
  check-in thủ công của CMB).
- Cần đăng ký `Confirmed` của chính Student (E3). Nếu event `allowWalkIn` (A2): Student chưa có
  đăng ký Confirmed được check-in walk-in, hệ thống tạo/tái sử dụng bản đăng ký `Confirmed`,
  tăng `confirmedRegistrationCount` và gắn `abnormalFlags: ["walk-in"]`, `method: "walk-in"`.
  Event `MEMBERS_ONLY` vẫn yêu cầu membership `Active`.
- Unique `(eventId, studentId)` bảo đảm một bản ghi; check-in lặp lại trả bản ghi đầu tiên với
  `alreadyCheckedIn: true`, không ghi thêm (E1).
- Feedback window của người đó mở tại `checkedInAt`, đóng tại `endAt + feedbackWindowHours` của
  policy hiệu lực (BR36, SCH-07); giá trị được suy ra, không lưu trường mới.
- Audit + notification ghi trong cùng transaction với `Attendance`.
- UI: hộp check-in trên “Đăng ký của tôi” và trên event detail (đăng ký Confirmed, trong khung
  giờ), tab “Đã check-in” liệt kê lịch sử kèm hạn phản hồi; panel `attendanceHistory` của
  dashboard dẫn tới tab này. Đủ loading/error/empty, responsive, i18n `en`/`vi`.

## Tiêu chí nghiệm thu
- [x] Guest/tài khoản khoá bị từ chối; mã sai bị từ chối mà không ghi gì.
- [x] Ngoài khung giờ hoặc event không ở `Upcoming`/`Ongoing` bị từ chối.
- [x] Không có đăng ký Confirmed bị từ chối, trừ event cho walk-in (tạo kèm đăng ký).
- [x] Check-in đồng thời/lặp lại chỉ tạo một `Attendance`; lần sau trả bản ghi đầu tiên.
- [x] Phản hồi API có `feedbackOpensAt`/`feedbackClosesAt` đúng BR36.
- [x] Audit/notification cùng transaction.
- [x] Student xem lịch sử check-in ở “Đăng ký của tôi” và qua dashboard UC02.
- [x] Automated checks, Mongo integration và production build xanh.
- [x] QA trình duyệt desktop/mobile, `en`/`vi`, light/dark.

## Ngoài phạm vi
- A1 check-in thủ công bởi CMB (`club.attendance.manage`) và màn tạo/hiển thị QR phía CLB — làm
  cùng màn điểm danh CLB (UC32).
- UC48 gửi phản hồi (chỉ mở window ở đây), UC32 chốt điểm danh, scheduler chuyển `Ongoing`.

## Changelog
- v0.1.0 (2026-10-09) — chốt vertical slice UC31 luồng Student (chính, A2, E1–E3).
