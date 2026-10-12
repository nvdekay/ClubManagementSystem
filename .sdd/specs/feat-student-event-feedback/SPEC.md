# SPEC: feat-student-event-feedback

## Vấn đề
UC31 đã mở feedback window từ lúc check-in nhưng Student chưa có cách gửi phản hồi. UC48 phải nhận
đúng một phản hồi bất biến cho mỗi người tham dự trên mỗi sự kiện, trong window của BR36, hỗ trợ
ẩn danh và không làm lộ danh tính hay bản tổng hợp dưới ngưỡng BR40.

## Quyết định (2026-10-09)
SRS chưa định nghĩa bộ tiêu chí. Người dùng chốt: **một tiêu chí — mức hài lòng chung, 1–5 sao**,
kèm **nhận xét bắt buộc** (tối đa 2.000 ký tự). Lưu ở `scores: [{ criterionCode: "overall", score }]`
để giữ đúng schema và làm đầu vào cho D3 Mức độ hài lòng (UC42).

## Hành vi
- Chỉ Student có `Attendance` của sự kiện mới thấy và gửi được form (FR-01, E3).
- Window: từ `checkedInAt` của chính người đó tới `endAt + feedbackWindowHours` của policy hiệu
  lực (BR36); ngoài window trả `conflict` (E2).
- Unique `(eventId, studentId)` bảo đảm một phản hồi; lần gửi thứ hai trả `conflict` (E1).
- Bản ghi bất biến: không có API sửa/xoá (BR37).
- Ẩn danh (A1): `isAnonymous: true` vẫn lưu `studentId` nội bộ để chống spam; mọi bản tổng hợp
  hay danh sách phía CLB không bao giờ trả danh tính.
- Bản tổng hợp là khung nhìn suy ra (SRS §6.11): hàm domain trả số người phản hồi, và chỉ khi đạt
  `feedbackMinRespondents` (BR40) mới kèm điểm trung bình/phân bố. Màn đọc phía CLB thuộc UC49.
- Audit ghi cùng transaction (không ghi nội dung/danh tính phản hồi ẩn danh vào notification).
- UI: form sao + nhận xét + tuỳ chọn ẩn danh trên tab “Đã check-in” của “Sự kiện của tôi” và trên
  trang sự kiện; sau khi gửi hiển thị số sao/ngày gửi (chỉ cho chính người gửi). Đủ loading/error,
  responsive, i18n `en`/`vi`, sao dùng radio group truy cập được bằng bàn phím.

## Tiêu chí nghiệm thu
- [x] Không có attendance → không thấy form và API từ chối.
- [x] Gửi sau khi window đóng bị từ chối; trước khi đóng thì nhận.
- [x] Lần gửi thứ hai bị từ chối; gửi đồng thời chỉ tạo một bản ghi.
- [x] Điểm ngoài 1–5 hoặc nhận xét rỗng/quá dài bị từ chối trước khi ghi.
- [x] Bản tổng hợp ẩn nội dung khi dưới ngưỡng BR40 và không chứa danh tính.
- [x] Automated checks, Mongo integration và production build xanh.
- [x] QA trình duyệt desktop/mobile, `en`/`vi`, light/dark.

## Ngoài phạm vi
- UC49 màn xem phản hồi của CLB (`club.feedback.view`), UC42 chấm điểm D3.

## Changelog
- v0.1.0 (2026-10-09) — chốt UC48 với một tiêu chí 1–5 sao + nhận xét theo quyết định người dùng.
