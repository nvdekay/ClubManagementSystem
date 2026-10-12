# SPEC: feat-student-event-registration

## Vấn đề
Student đang xem được sự kiện công khai nhưng chưa thể đăng ký ngay trên hồ sơ sự kiện, theo dõi
đăng ký hoặc tự huỷ. UC29 phải giữ quota chính xác khi nhiều người đăng ký đồng thời và không
được tạo đăng ký trùng.

## Hành vi
- Student đã đăng nhập đọc registration context ngay trên event detail và danh sách đăng ký của
  mình. Context trả registration window suy ra, capacity, số đã xác nhận, waitlist, phạm vi đối
  tượng và form từ `eventProposalVersions.payload.registrationForm` của revision hiện hành.
- Chỉ event `Upcoming`, đã công bố, chưa bắt đầu và đang trong registration window mới nhận đăng
  ký. Event `MEMBERS_ONLY` chỉ nhận membership `Active` của chính CLB tổ chức.
- Câu trả lời được validate theo snapshot form; hỗ trợ `text`, `textarea`, `select`, `radio`,
  `checkbox` với required/options và giới hạn độ dài.
- Khi còn chỗ, một phép cập nhật có điều kiện atomically tăng `confirmedRegistrationCount`, rồi
  tạo `Confirmed`. Khi đầy: tạo `Waitlisted` với số thứ tự atomically tăng nếu bật waitlist;
  ngược lại trả conflict. Policy `allowOverbooking` cho phép tạo `Confirmed` vượt capacity.
- Unique `(eventId, studentId)` bảo đảm tối đa một document. Đăng ký lại sau huỷ tái sử dụng
  document cũ, không tạo lịch sử trùng.
- Student được huỷ `Confirmed` hoặc `Waitlisted` trước giờ bắt đầu; huỷ `Confirmed` atomically
  giảm bộ đếm và giải phóng suất. Việc tự động promote waitlist thuộc UC30.
- Tạo notification và audit cho đăng ký/huỷ. UI có CTA trên event detail và trang “đăng ký của
  tôi”, đầy đủ loading/error/empty, responsive và i18n `en`/`vi`.

## Tiêu chí nghiệm thu
- [x] Guest không thể đăng ký; tài khoản khoá bị từ chối.
- [x] Khung giờ, trạng thái, thời điểm bắt đầu và audience scope được kiểm tra lại khi ghi.
- [x] Form required/options được validate trước repository write.
- [x] Đăng ký đồng thời không vượt capacity; unique index chặn đăng ký trùng.
- [x] Event đầy tạo waitlist đúng thứ tự hoặc trả conflict khi waitlist tắt.
- [x] Student huỷ trước giờ bắt đầu, document chuyển `Cancelled` và suất Confirmed được giải phóng.
- [x] Đăng ký lại dùng lại document cũ.
- [x] Student xem được trạng thái trong event detail, trang riêng và dashboard UC02.
- [x] Notification/audit được ghi cùng transaction.
- [x] Automated checks, Mongo integration và production build xanh.
- [x] Visual QA desktop/mobile, `en`/`vi`, light/dark.

## Ngoài phạm vi
- UC30 tự động/manual promote waitlist và thay đổi capacity.
- UC27 công bố event và cấu hình registration window.
- UC31 check-in; UC29 chỉ cung cấp registration đủ điều kiện cho UC31.

## Changelog
- v0.1.0 (2026-10-09) — chốt vertical slice UC29 và cơ chế quota nguyên tử.
