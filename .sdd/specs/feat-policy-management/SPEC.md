# SPEC: feat-policy-management

## Vấn đề
ICPDP cần cấu hình chín nhóm giá trị UC04 theo phiên bản có ngày hiệu lực để UC01, UC07 và các module sau đọc đúng quy định tại thời điểm ra quyết định. Người dùng sẽ tự điền các giá trị ban đầu; server không đặt số liệu nghiệp vụ thay ICPDP.

## Hành vi
- `GET /api/v1/admin/policies`: officer xem phiên bản đang hiệu lực và tối đa 20 phiên bản gần đây, gồm bản đã lên lịch. Nếu chưa có policy, trả `current: null` và danh sách rỗng để màn cấu hình lần đầu hoạt động.
- `POST /api/v1/admin/policies`: officer nhập toàn bộ chín nhóm giá trị BR42 và ngày hiệu lực tuỳ chọn. Không gửi ngày nghĩa là có hiệu lực ngay; ngày gửi phải ở tương lai. Mỗi lần lưu tạo document mới chỉ-ghi-thêm và audit actor, thời điểm, bản trước, bản mới và lý do nếu có. Không có endpoint sửa/xoá.
- `academicCalendar` là danh sách `{code,startAt,endAt}`; `reportDeadlines` là danh sách `{reportType,dueDaysAfterPeriodEnd,remindBeforeDays,overdueAfterDays,escalateAfterDays}` như người dùng đã chốt. Mã học kỳ và loại báo cáo duy nhất; các khoảng học kỳ không chồng lấn; mốc `T+Z` sau `T+Y`.
- Chỉ người có `ICPDP_OFFICER` còn hiệu lực được đọc/ghi. Route ghi bắt buộc session và CSRF; use case kiểm tra quyền lần nữa. Input đi qua Zod trước khi chạm Mongo; API trả envelope và có OpenAPI.
- Màn ICPDP cho nhập đủ các trường, xem phiên bản hiện hành/lịch sử, trạng thái đang tải/lỗi/thành công, dùng i18n en/vi và theme hiện có. Màn không tự gán giá trị mặc định cho chính sách.
- Trước khi tạo version, hệ thống kiểm tra các quyết định đã ban hành có thời gian hiệu lực giao
  với policy mới. Nếu lịch học kỳ mới làm sự kiện/booking đã duyệt nằm ngoài học kỳ, làm mất học
  kỳ giải thể đã quyết định, hoặc tắt overbooking trong khi còn booking tương lai đã duyệt vượt
  sức chứa, API trả `409` cùng `affectedRecords`; không tạo version hay audit.
- Quyết định duyệt hồ sơ thành lập lưu `policyVersionId` của snapshot đã nộp trong metadata quyết
  định, để policy mới không viết lại căn cứ lịch sử.

## Tiêu chí nghiệm thu
- [x] Không có policy: officer thấy biểu mẫu trống; người không có quyền bị 403; thiếu session 401.
- [x] Mọi giá trị sai kiểu, trùng lặp, khoảng học kỳ chồng lấn hoặc thứ tự deadline sai bị 400; không tạo version/audit.
- [x] Ngày hiệu lực trong quá khứ bị từ chối; ngày tương lai không ảnh hưởng policy hiện tại trước ngày đó.
- [x] Tạo policy ghi đúng một version mới và audit; bản cũ giữ nguyên; resolver theo ngày chọn đúng bản.
- [x] UI nhập đủ chín nhóm, thêm/bớt dòng deadline/học kỳ, hiển thị lịch sử và xử lý lỗi ở en/vi, light/dark.
- [x] Policy xung đột quyết định đã ban hành bị từ chối với danh sách bản ghi; quyết định duyệt hồ
  sơ thành lập giữ tham chiếu policy snapshot lịch sử.

## Ngoài phạm vi
UC07 nộp hồ sơ; các giá trị ngoài danh sách BR42; điều chỉnh quyết định đã ra trong quá khứ. UC05 đã rút khỏi baseline.

## Changelog
- v0.1.0 (2026-10-03) — cấu trúc hai trường JSON và việc không seed số liệu ban đầu được người dùng chốt trong phiên làm việc.
- v0.2.0 (2026-10-08) — đồng bộ quyết định chỉ có một role ICPDP là `ICPDP_OFFICER`.
- v0.3.0 (2026-10-09) — bổ sung kiểm tra tác động quyết định và phản hồi xung đột FR-UC04-06.
