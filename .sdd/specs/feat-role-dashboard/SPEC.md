# SPEC: feat-role-dashboard

## Vấn đề
Sau khi chọn workspace, Student, Club Member/Leader và ICPDP Officer mới chỉ thấy các lối tắt,
chưa có trang tổng quan nghiệp vụ theo UC02 để nhận biết việc đang chờ và mở đúng luồng xử lý.

## Hành vi
- `GET /api/v1/dashboard` nhận `workspace=student|icpdp|club`; ngữ cảnh CLB bắt buộc có
  `clubId` và được đối chiếu lại với membership/quyền hiện hành.
- Student chỉ nhận số liệu của chính mình; CLB chỉ nhận số liệu của CLB đã chọn; ICPDP chỉ
  dành cho tài khoản đang có role `ICPDP_OFFICER`.
- Mỗi panel được đọc độc lập và trả `ready` cùng số lượng, hoặc `error` nếu riêng nguồn dữ liệu
  đó không khả dụng. Endpoint vẫn trả các panel còn lại.
- Dashboard chỉ đọc, không thay đổi trạng thái nghiệp vụ. Panel có màn nghiệp vụ hiện hành cung
  cấp liên kết để mở đúng luồng sở hữu.
- Khi toàn bộ chỉ số bằng 0, giao diện vẫn giữ các điểm bắt đầu phù hợp với workspace.

## Tiêu chí nghiệm thu
- [x] API từ chối workspace ICPDP/CLB không thuộc quyền của actor và input CLB không hợp lệ.
- [x] Ba workspace nhận đúng tập panel, đúng phạm vi actor/CLB và thời điểm tổng hợp.
- [x] Lỗi của một nguồn dữ liệu không che các panel còn lại.
- [x] UI có loading, lỗi toàn trang, lỗi từng panel, empty state và liên kết nghiệp vụ.
- [x] OpenAPI, test server, `en`/`vi`, light/dark và `npm run check` đều đạt.

## Ngoài phạm vi
Không triển khai các thao tác ghi của module sở hữu panel; các thao tác đó thuộc UC tương ứng.

## Changelog
- v0.1.0 (2026-10-09) — tạo spec UC02 trước khi triển khai.
- v1.0.0 (2026-10-09) — hoàn tất API, dashboard ba workspace và kiểm thử UC02.
