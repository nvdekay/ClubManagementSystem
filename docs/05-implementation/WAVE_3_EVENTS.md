# Bàn giao Wave 3 — vòng đời sự kiện CLB

> **Tài liệu lịch sử.** Nội dung bên dưới ghi lại quyết định tại thời điểm lập tài liệu;
> checkbox và mô tả RBAC/UC23 cũ không phải trạng thái release hiện hành.
> Trạng thái API/UI và khoảng trống triển khai: [CURRENT_IMPLEMENTATION.md](../CURRENT_IMPLEMENTATION.md).


Cập nhật ngày 2026-10-11. Đã triển khai UC25, UC27, UC28, UC30, UC31 A1, UC32 và UC49;
UC26 dùng luồng ICPDP hiện có, bổ sung xử lý ngân sách khi duyệt lại lịch.
Kế hoạch và chính sách: [WAVE_3_EVENTS_PLAN.md](WAVE_3_EVENTS_PLAN.md).

## Phần đã có

| Màn hình | Quyền | Chức năng |
|---|---|---|
| `/club/:clubId/events` | `club.event.manage` | Tạo/sửa Draft, budget lines, form đăng ký, chuỗi hoạt động, liên kết booking; nộp/nộp lại, lịch sử version/quyết định; công bố, huỷ/đổi lịch |
| `/club/:clubId/event-attendance` | `club.attendance.manage` | Danh sách, tìm kiếm/phân trang, capacity, FIFO, check-in hộ, hiệu chỉnh/xác nhận vắng mặt, chốt |
| `/club/:clubId/event-feedback` | `club.feedback.view` | Tổng hợp rating, phân bố/nhận xét ẩn định danh và so sánh tối đa 20 sự kiện |
| `/workspace/event-proposals/:id` | `ICPDP_OFFICER` | Nhận/thẩm định đề xuất thật từ UC25, giữ số duyệt hiện có khi duyệt lại; không tạo budget trùng |

Mở khoá attendance cần thêm system role `ATTENDANCE_UNLOCK`, lý do và audit. Nút nằm trong
màn điểm danh CLB; người chỉ có system role có thể gọi API mở khoá mà không cần membership CLB.

API ở `/api/v1/clubs/:clubId/events`; OpenAPI mô tả đầy đủ các action. Route sử dụng authGuard,
CSRF, zod strict và phong bì response chuẩn. Usecase kiểm tra quyền; repository kiểm tra lại
quyền, ownership, CLB và trạng thái trong transaction. Event version chặn ghi từ màn hình cũ;
khoá ghi event/property tuần tự hoá các thao tác cạnh tranh.

Draft payload nằm trong audit snapshot; version nộp nằm trong `eventProposalVersions` bất biến.
UC26 mới tạo `eventBudgets`. Không thay schema, dependency hoặc env.

## Các tình huống cần nhớ

- Nộp trước ít nhất 168 giờ; các lần diễn ra cùng học kỳ, dùng chung registration/attendance.
- Public hoặc Internal có budget cần ICPDP; Internal không budget ghi nhận Approved trực tiếp.
- Đổi lịch giữ đăng ký nhưng chặn đăng ký/check-in tới khi duyệt và công bố lại. Các lần diễn ra
  được dịch theo lịch mới; nếu vượt khung hoặc học kỳ thì từ chối. Blocking conflict rollback.
- Duyệt lại không đổi số duyệt của budget đã giải ngân. Nếu đổi lịch bị từ chối hoặc bản sửa
  quá hạn, huỷ đăng ký/counter/booking, giữ nghĩa vụ tài chính và trạng thái Rejected/Expired.
- Huỷ dưới 24 giờ được ghi nhận muộn. Budget chưa giải ngân chuyển Cancelled; đã giải ngân
  giữ state/số tiền/hạn nghĩa vụ, audit có settlementRequired. Số phải hoàn do UC37 quyết định.
- UC15 dùng cùng helper huỷ, audit sự kiện tham chiếu audit quyết định CLB. Booking In Use
  giữ tới hết slot; booking chưa sử dụng được giải phóng.
- Huỷ Confirmed tự promote FIFO trong cùng transaction. Giảm capacity dưới Confirmed bị chặn
  và trả registrationIds bị ảnh hưởng.
- Chốt cần Completed, đã xử lý toàn bộ bất thường/vắng mặt. No-show có marker riêng và bị loại
  khỏi feedback, evaluation, export. Check-in có feedback không được đổi timestamp.
- Internal không budget chốt sang Closed; mở khoá đưa về Completed. Feedback window vẫn mở
  từ check-in; tổng hợp hiển thị ngay khi đủ feedbackMinRespondents, không trả định danh.

## Dữ liệu demo và cách thử

Đã chạy hai lần, số document không đổi ở lần thứ hai:

```sh
npm run seed:demo -- --owner=tnh.t1k30.ht@gmail.com
```

Ba fixture mới của HEBE: `Wave 3 demo: Workshop proposal` (Draft),
`Wave 3 demo: Public workshop` (Pending Approval, có ngân sách) và
`Wave 3 demo: Internal practice` (Upcoming, không ngân sách). Lịch tính từ ngày seed đầu tiên;
seed bỏ qua fixture đã tồn tại, không đưa sự kiện đã thao tác về trạng thái cũ.

1. Đăng nhập account demo, chọn HEBE → Sự kiện. Mở Draft, sửa và nộp.
2. Chuyển ICPDP → Duyệt đề xuất sự kiện. Nhận, yêu cầu sửa; về CLB sửa/nộp lại rồi duyệt.
3. CLB công bố Approved, chọn khung đăng ký/check-in. Sinh viên đăng ký; giảm capacity để
   thử lỗi, huỷ một suất để thử auto-promote FIFO.
4. Mở Điểm danh sự kiện để check-in hộ; ngoài khung phải nhập lý do. Sau khi job chuyển
   Completed, xác nhận từng bất thường/vắng mặt rồi chốt. Internal chuyển Closed.
5. Sinh viên đã check-in gửi feedback qua UC48; CLB mở Phản hồi sự kiện và chọn so sánh.
6. Thử đổi lịch/huỷ một sự kiện khác. Đổi lịch Public phải quay lại hàng đợi ICPDP.

## Kiểm chứng

| Kiểm tra ngày 2026-10-11 | Kết quả |
|---|---|
| `npm run check` | Constitution, lint, typecheck; 395 test trong 83 file xanh |
| `npm run build -w client` | Thành công; Vite còn cảnh báo chunk lớn của ứng dụng |
| Integration Mongo Wave 3 | 9 test: concurrent submit, FIFO/counter, Internal/finalize/unlock, ngưỡng feedback/privacy, duyệt lại/budget, quyền tại lúc ghi, notice/học kỳ/giải thể/nghĩa vụ, revision/deadline và reject/rollback |
| Regression | UC15, UC26, UC29, UC31, feedback/evaluation/export nằm trong check toàn repo |
| Browser QA Chrome | 20 cấu hình màn/dialog: en/vi, sáng/tối, 390/1440 px; thêm thiếu quyền. Không runtime error, key chưa dịch hoặc tràn ngang trang |
| Seed demo | Chạy hai lần; events=37, registrations=22, attendances=9, feedbacks=3, bookings=12 ở cả hai lần |

Browser QA dùng API fixture để kiểm tra giao diện, gồm màn UC26 với budget đã duyệt.
Các kiểm thử nghiệp vụ dùng Mongo thật; chưa chạy toàn bộ chuỗi trên trình duyệt bằng Google
OAuth với hai tài khoản thật. Checklist demo trên là bước nghiệm thu bằng tài khoản người dùng.
Không gộp browser fixture thành bằng chứng end-to-end của production API.

UC40 hiện ghi nhận quyết định hồ sơ, chưa có nhánh thi hành chế tài huỷ sự kiện. Helper huỷ
đã dùng chung cho UC28/UC15; việc gọi từ nhánh chế tài UC40 cần nối khi triển khai Wave 5.
UI báo cáo/quyết toán/hoàn trả thuộc Wave 4; Wave 3 giữ đúng dữ liệu/nghĩa vụ để nối tiếp.
