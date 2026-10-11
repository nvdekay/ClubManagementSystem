# Kế hoạch Wave 3 — vòng đời sự kiện phía CLB

Lập ngày 2026-10-11 từ SRS, đặc tả UC v2, SPEC/TASKS và source hiện tại.
Đã triển khai ngày 2026-10-11. Kết quả và cách demo: [WAVE_3_EVENTS.md](WAVE_3_EVENTS.md).
Các bảng hiện trạng bên dưới giữ đối chiếu tại thời điểm lập kế hoạch.

## Phạm vi và hiện trạng

Người dùng phụ trách UC25, UC27, UC28, UC30, UC31 A1, UC32 và UC49.
UC26 là phần phối hợp ICPDP, tái sử dụng triển khai đã có.

| Phần | Đã có | Cần làm trong Wave 3 |
|---|---|---|
| UC25 | Collection và hợp đồng nộp ở `feat-event-proposal-review/SPEC.md` | Draft, sửa, phân tích xung đột, nộp/nộp lại; bản sửa bất biến, task mới mỗi lần nộp; UI CLB |
| UC26 | Claim/decision, ngân sách duyệt theo dòng, UI ICPDP | Kiểm tra tương thích với dữ liệu UC25 thật và nghiệm thu trực quan còn mở |
| UC27 | UC29 đọc khung đăng ký; job chuyển Upcoming → Ongoing → Completed | Công bố sự kiện CLB, form đăng ký, khung check-in, nội bộ và mở tự do |
| UC28 | Cascade UC15 huỷ events/registrations, notification và release booking | Huỷ/đổi lịch phía CLB; dùng chung cascade, bổ sung ngân sách/nghĩa vụ, nguồn quyết định và audit |
| UC30 | Counter nguyên tử, Waitlisted và thứ tự danh sách chờ trong UC29 | Danh sách CLB, đổi sức chứa, promote thủ công/tự động; huỷ UC29 hiện chỉ giảm counter |
| UC31 A1 / UC32 | Self check-in, walk-in, abnormalFlags, finalized và attendanceFinalized | Check-in hộ, hiệu chỉnh/xác nhận bất thường, chốt và mở khoá có audit |
| UC49 | UC48 ghi feedback; domain có summarizeFeedback; permission club.feedback.view đã có | API/UI tổng hợp và so sánh sự kiện; ngưỡng riêng tư, nhận xét không kèm danh tính |

Không tạo ngân sách dự kiến ở `eventBudgets` khi nộp UC25: các dòng xin nằm trong
`eventProposalVersions`; UC26 tạo `eventBudgets` khi duyệt. Không triển khai lại UC26,
UC29, UC48 hoặc scheduler sự kiện đã có.

## Quyết định áp dụng

Người dùng yêu cầu triển khai theo khuyến nghị ngày 2026-10-11:

- UC25 nộp trước ít nhất 168 giờ; huỷ dưới 24 giờ trước bắt đầu được ghi nhận là muộn.
- FIFO theo `waitlistPosition`, kể cả promote thủ công; chuỗi dùng chung registration/attendance.
- Đổi thời gian/địa điểm phải duyệt lại; Internal không ngân sách chỉ ghi nhận lại.
  Giữ đăng ký, đóng tiếp nhận/check-in tới khi được duyệt và công bố lại.
- Ngân sách đã giải ngân không được đổi số duyệt khi đổi lịch. Huỷ giữ nguyên nghĩa vụ
  quyết toán/hoàn trả; ngân sách chưa giải ngân chuyển `Cancelled`.
- Booking `In Use` giữ tới hết slot; booking chưa sử dụng được giải phóng khi huỷ/đổi lịch.
- Mở khoá Internal `Closed → Completed` cần `ATTENDANCE_UNLOCK`, lý do và audit.
- Rating overall 1–5, feedback bất biến; tổng hợp hiển thị ngay khi đủ ngưỡng policy.

Không thay schema. Các giá trị báo trước là quy tắc triển khai cố định; chưa có màn cấu hình
ngoài danh mục UC04. Chi tiết nghiệm thu ở SPEC/TASKS của từng feature.

## Thứ tự bàn giao

### 1. UC25 — feat-event-proposals

- Danh sách và chi tiết sự kiện CLB; tạo/sửa Draft, xem các bản nộp và quyết định.
- Validate quyền club.event.manage, trạng thái CLB, thời gian/học kỳ, BR45, ngân sách,
  nghĩa vụ báo cáo/quyết toán/hoàn trả quá hạn và BR15.
- Dùng hợp đồng UC26: events + eventProposalVersions + approvalTasks + liên kết booking
  commit cùng transaction; kiểm tra lại quyền/trạng thái tại thời điểm ghi.
- Internal không ngân sách → Approved, RECORD_INTERNAL, không tạo task; booking vẫn duyệt riêng.
- Nối booking Wave 2: xác minh cùng CLB, trạng thái và lịch phù hợp; không sửa lịch Approved
  trực tiếp để bỏ qua UC46. ICPDP đọc được sự kiện nội bộ qua UC02.
- Test nộp đồng thời, nộp lại quá hạn, lịch xung đột, ngân sách và nghĩa vụ quá hạn.

**Đầu ra:** CLB nộp được đề xuất thật; ICPDP nhận, yêu cầu sửa và duyệt đúng bản sửa.

### 2. UC27 — feat-event-publishing

- Approved → Upcoming; thông tin công khai, khung đăng ký, form, waitlist và cấu hình check-in.
- Internal chỉ xuất hiện ở UC24; Public xuất hiện ở UC06. Hỗ trợ không cần đăng ký và walk-in.
- Tái sử dụng job hiện có; kiểm tra biên thời gian ở API vì job chạy mỗi giờ.
- Test công bố đồng thời, sai trạng thái, registrationCloseAt > startAt và dữ liệu UC29/UC31.

**Đầu ra:** đề xuất được duyệt trở thành sự kiện sinh viên đăng ký/check-in được.

### 3. UC28 — feat-event-changes

- Huỷ có lý do, tín hiệu huỷ muộn; chặn khi đã chốt điểm danh.
- Đổi lịch đánh giá lại BR15, tạo bản sửa/task mới theo D4; giữ lịch sử bản duyệt cũ.
- Dùng chung thao tác huỷ trong transaction cho CLB, UC15 và UC40: registration/counter,
  booking, notification, budget/nghĩa vụ, audit và liên kết quyết định nguồn.
- Chưa giải ngân → budget Cancelled; đã tạm ứng → giữ nghĩa vụ quyết toán/thu hồi cho Wave 4.
  Wave 3 phải ghi đúng nghĩa vụ, không triển khai UI quyết toán UC36/UC37 tại đây.
- Test huỷ/đổi lịch cạnh tranh với claim, approve, đăng ký, check-in và release booking;
  bảo đảm retry không nhân đôi task, notification hoặc nghĩa vụ.

**Đầu ra:** thay đổi sự kiện không để sót booking hoặc làm mất nghĩa vụ tài chính.

### 4. UC30 — feat-event-capacity

- Danh sách Confirmed/Waitlisted, phân trang/lọc, counter và vị trí chờ.
- Đổi sức chứa; từ chối giảm dưới số Confirmed và nêu các đăng ký bị ảnh hưởng.
- Promote có điều kiện trong transaction, audit và notification; nối auto-promote vào huỷ UC29.
- Test huỷ/promote/đăng ký đồng thời; không vượt sức chứa ngoài ngoại lệ policy và giữ thứ tự chờ.

**Đầu ra:** suất trống được lấp đúng chính sách; số Confirmed khớp counter.

### 5. UC31 A1 / UC32 — feat-event-attendance-close

- Tra cứu người tham dự, check-in hộ; lưu người thực hiện và lý do nếu ngoài khung giờ.
- Danh sách điểm danh, vắng mặt và cờ bất thường; hiệu chỉnh/xác nhận kèm lý do.
- Chốt khi Completed và mọi bất thường đã xử lý; khoá cả self check-in và mọi đường sửa.
- ATTENDANCE_UNLOCK mở khoá có lý do/audit; phân biệt với club.attendance.manage.
- BR53 không ngân sách: Completed → Closed khi chốt, không sinh báo cáo sau sự kiện.
  Sự kiện nội bộ có ngân sách vẫn đi luồng báo cáo thông thường.
- Feedback window tiếp tục tính từ check-in; không đổi sang mốc chốt điểm danh.
- Test chốt cạnh tranh với check-in/hiệu chỉnh/mở khoá và quyền giữa các CLB.

**Đầu ra:** có bộ điểm danh chính thức cho UC33/UC42.

### 6. UC49 — feat-event-feedback-view

- Tổng hợp rating, phân bố, nhận xét không kèm định danh và so sánh nhiều sự kiện cùng CLB.
- Dùng club.feedback.view đã có và feedbackMinRespondents của policy hiệu lực.
- Dưới ngưỡng chỉ thông báo có phản hồi; API không trả điểm, phân bố hay nhận xét.
- Test ngưỡng N−1/N, truy cập chéo CLB và response không lộ studentId/attendanceId/tác giả.

**Đầu ra:** CLB đọc được feedback để chuẩn bị báo cáo, giữ đúng BR37/BR40.

## Cổng nghiệm thu

- Mỗi đợt làm đủ domain → usecase → interface → infra, OpenAPI, service → hook → page,
  i18n en/vi, seed demo và test cần thiết; cập nhật TASKS ngay khi hoàn thành.
- npm run check xanh; npm run build -w client thành công cho phần có UI.
- Integration Mongo thật cho transaction/cạnh tranh; browser QA en/vi, sáng/tối,
  mobile/desktop với account có/thiếu quyền. UI dùng primitive hiện có, có loading/error/empty.
- Demo đầy đủ: Draft → nộp → yêu cầu sửa → nộp lại → duyệt → công bố → đăng ký/waitlist
  → promote → check-in → chốt → feedback tổng hợp; thêm nhánh Internal và huỷ/đổi lịch.
- Nghiệm thu trực quan UC26 đang mở phải được hoàn tất trong luồng demo nối UC25.
- Trạng thái test Wave 2 là dữ liệu bàn giao, không phải kết quả kiểm chứng Wave 3.

Wave 3 đã có API, UI, dữ liệu demo và kiểm thử; xem tài liệu bàn giao để phân biệt
kiểm thử Mongo thật với browser QA dùng API fixture.
