# SPEC: feat-student-feedback

## Vấn đề
SRS mô tả UC50 là khiếu nại dạng ticket (Submitted → Under Triage → Forwarded → … → Closed, rút đơn,
theo dõi tiến trình, UC51/UC52 xử lý). Nhóm muốn một kênh **góp ý một chiều** đơn giản hơn.

## Quyết định (2026-10-09, người dùng)
- UC50 trở thành **gửi feedback/góp ý**, không phải ticket: không trạng thái xử lý, không rút, không
  trả lời qua lại. Bản ghi bất biến sau khi gửi, luôn ở `Submitted`.
- Sinh viên **chọn người nhận**: một CLB (`recipient: CLUB`, bắt buộc `clubId`, tuỳ chọn `eventId`
  thuộc CLB đó) hoặc **ICPDP** (`recipient: ICPDP`, tuỳ chọn gắn CLB/sự kiện liên quan).
- Có **tuỳ chọn ẩn danh**: người nhận không thấy tên; hệ thống vẫn giữ `complainantId` nội bộ để
  chống spam (giống UC48 A1).
- Sau khi gửi, sinh viên chỉ **xem lại danh sách đã gửi**.
- Lưu trong collection `complaints` hiện có (đã chỉnh schema): `clubId` không còn bắt buộc, thêm
  `recipient` (enum `feedbackRecipient`) và `isAnonymous`. Các trường ticket (`triage`,
  `clubResponse`, `responseDueAt`, `violationId`, `linkedComplaintId`, `withdrawnAt`, `closedAt`)
  không được dùng; UC51/UC52 không triển khai theo mô hình ticket.

## Hành vi
- Loại góp ý (`type`): `suggestion` (góp ý), `praise` (khen ngợi), `issue` (phản ánh vấn đề).
- Nội dung bắt buộc, 1–2.000 ký tự sau khi trim.
- CLB phải tồn tại và chưa `Dissolved`; sự kiện (nếu có) phải thuộc CLB đã chọn.
- Người đọc:
  - Thành viên CLB có `club.feedback.view` đọc góp ý gửi **cho CLB đó** (`recipient: CLUB`).
  - ICPDP Officer đọc góp ý gửi **cho ICPDP**.
  - Góp ý ẩn danh không bao giờ trả tên/email người gửi cho người đọc.
- Audit cùng transaction, không ghi nội dung; người nhận không nhận notification từng góp ý (MVP).
- UI: trang “Góp ý” của Student (form + danh sách đã gửi), hộp thư góp ý của CLB và của ICPDP,
  mục điều hướng tương ứng, i18n `en`/`vi`, responsive, light/dark.

## Tiêu chí nghiệm thu
- [x] Gửi cho CLB thiếu/sai CLB, sự kiện không thuộc CLB, nội dung rỗng/quá dài bị từ chối.
- [x] Gửi cho ICPDP được, có hoặc không gắn CLB.
- [x] Student chỉ xem được góp ý của chính mình; không có API sửa/xoá/rút.
- [x] CLB chỉ thấy góp ý gửi cho CLB mình khi có `club.feedback.view`; ICPDP chỉ thấy góp ý gửi ICPDP.
- [x] Góp ý ẩn danh không lộ danh tính trong mọi API đọc của người nhận.
- [x] Automated checks, Mongo integration và production build xanh.
- [x] QA trình duyệt desktop/mobile, `en`/`vi`, light/dark.

## Ngoài phạm vi
- Đính kèm chứng cứ, liên kết góp ý trùng, task/SLA cho ICPDP, UC51/UC52.

## Changelog
- v0.1.0 (2026-10-09) — định nghĩa lại UC50 thành góp ý một chiều theo quyết định người dùng.
