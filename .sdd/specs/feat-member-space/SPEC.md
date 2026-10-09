# SPEC: feat-member-space

## Vấn đề
UC22 (xin rời CLB) đã có backend nhưng chưa có UI; UC24 (không gian thành viên) chưa có gì. Thành
viên chưa có nơi xem tư cách, chức vụ, thành viên/ban chủ nhiệm, sự kiện và nghĩa vụ của mình ở CLB.
Phía CLB cũng chưa có màn thi hành yêu cầu rời (UC21 A1) dù API đã có.

## Hành vi
- **UC24** — `GET /clubs/{clubId}/member-space` chỉ đọc, cho người gọi có membership `Active` hoặc
  `Inactive` ở CLB đó (E1: `Left`/`Banned` hoặc không phải thành viên → 403, UI dẫn về trang công
  khai UC06). Trả về:
  - tư cách của người gọi (state, ngày tham gia) + chức vụ hiện hành (assignment trong term
    `Active`, đang hiệu lực) + yêu cầu rời đang chờ (FR-01, FR-05);
  - danh sách thành viên `Active`/`Inactive` (chỉ tên + chức vụ, không email) và ban chủ nhiệm
    đã xác nhận (FR-02);
  - sự kiện sắp tới của CLB (đã công bố, chưa kết thúc, không bị huỷ) kèm trạng thái đăng ký của
    người gọi (FR-03);
  - lịch sử điểm danh của người gọi tại CLB (FR-04);
  - phản hồi chưa gửi mà window còn mở (FR-05);
  - các CLB khác người gọi đang là thành viên để chuyển nhanh (A1).
- Không ghi dữ liệu, không chat/nhắn tin/chia sẻ file (FR-09). Liên kết tới UC29/UC31/UC48/UC22 chỉ
  là điều hướng (FR-06).
- **UC22 UI** — trong không gian thành viên: nút “Xin rời CLB” mở form lý do + ngày hiệu lực đề nghị
  (không trước hôm nay), gọi API sẵn có; hiển thị yêu cầu đang chờ/đang giữ (Held khi còn giữ ghế
  ban chủ nhiệm — E1). Thành viên `Inactive` được đánh dấu và vẫn xin rời được.
- **UC21 A1 UI (phía CLB)** — trang “Thành viên” cho người có `club.member.manage`: danh sách thành
  viên và các yêu cầu rời đang chờ, nút “Thi hành” gọi API sẵn có.
- Điều hướng: Student có mục “CLB của tôi” liệt kê CLB mình thuộc về, mở `/workspace/clubs/:clubId`.
  i18n `en`/`vi`, responsive, light/dark.

## Tiêu chí nghiệm thu
- [x] Thành viên Active/Inactive mở được không gian; Left/Banned/người ngoài bị từ chối.
- [x] Không gian hiển thị đủ FR-01…05, không lộ email thành viên khác.
- [x] Sự kiện sắp tới đúng trạng thái đăng ký; phản hồi chưa gửi chỉ gồm window còn mở.
- [x] Gửi yêu cầu rời từ UI; yêu cầu hiển thị đang chờ; CLB thi hành được và thành viên chuyển `Left`.
- [x] Automated checks, Mongo integration và production build xanh.
- [x] QA trình duyệt desktop/mobile, `en`/`vi`, light/dark.

## Ngoài phạm vi
- UC21 đổi trạng thái Active/Inactive/Banned (đã có API, màn quản trị đầy đủ để sau), chat/nhắn tin.

## Changelog
- v0.1.0 (2026-10-09) — không gian thành viên UC24 + UI xin rời UC22 + màn thi hành UC21 A1.
