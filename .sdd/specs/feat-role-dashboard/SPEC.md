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
- 2026-10-19 — drill-down UC02: `GET /dashboard/internal-events` (ICPDP, lọc `clubId`/`semesterCode`, sự kiện `MEMBERS_ONLY` đã ghi nhận trở đi kể cả đã huỷ, tối đa 200 dòng) và `/dashboard/internal-events/:id` (chi tiết + điểm danh chỉ đọc), trang `/workspace/internal-events`; `GET /dashboard/clubs/:clubId/board-history` (ICPDP hoặc Club Leader của CLB đó — `club.board.nominate`) trả các phiên bản cơ cấu và ghế ban chủ nhiệm theo nhiệm kỳ kèm bước xác nhận (UC11 nếu khớp ghế đề cử đã xác nhận, UC13 nếu nhiệm kỳ đến từ kế hoạch chuyển giao đã xác nhận, UC08 với nhiệm kỳ khởi lập); hiện trong hộp quản lý CLB của ICPDP và trang `/club/:clubId/board-history`. Panel Student `withdrawalRequests` (UC22) đếm yêu cầu rời `Pending`/`Held`. Thẻ panel bấm được tới màn sở hữu; panel CLB active/suspended của ICPDP dẫn tới `/icpdp/clubs`.
- 2026-10-17 — dashboard ICPDP và Club Leader thành chart: snapshot thêm `icpdpCharts` (hàng chờ theo loại tách trong/quá SLA, sự kiện 8 tháng, CLB theo lĩnh vực/trạng thái, kinh phí học kỳ) và `clubCharts` (thành viên 12 tháng, đăng ký/check-in 6 sự kiện gần nhất, phễu đợt tuyển gần nhất, phân bố điểm phản hồi; chỉ khi có `club.member.manage`). Chart lỗi thì bỏ chart, panel vẫn giữ. Client vẽ bằng `components/ui/chart/` (SVG/HTML, không thêm thư viện), bảng màu đã qua bộ kiểm tra dataviz. Student và Club Member giữ thẻ số liệu.
- 2026-10-17 — panel `internalEvents` đếm sự kiện `MEMBERS_ONLY` (giá trị `ICPDP_INTERNAL` cũ không bao giờ được ghi); `overdueReports` của CLB tính cả kỳ chưa mở báo cáo.
- v0.1.0 (2026-10-09) — tạo spec UC02 trước khi triển khai.
- v1.0.0 (2026-10-09) — hoàn tất API, dashboard ba workspace và kiểm thử UC02.
