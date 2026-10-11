# SPEC: feat-facility-booking

> UC45–47; gồm phía CLB và ICPDP. Người dùng chốt phạm vi và giao agent chọn quy tắc ngày 2026-10-10.

## Vấn đề
CLB cần đặt cơ sở vật chất, theo dõi thẩm định và giải phóng lịch; ICPDP cần nhận yêu cầu,
kiểm tra xung đột và ra quyết định có lịch sử truy vết. Tái sử dụng UC44 đã có.

## Hành vi
- Chốt ngày 2026-10-11: CLB đặt trực tiếp chỉ được giữ phòng còn trống, kể cả policy
  `allowOverbooking = true`. Chỉ ICPDP được đặt trùng khi policy đang bật và nhập lý do
  không rỗng (tối đa 2000 ký tự); không được bỏ qua blackout, trạng thái CLB/phòng,
  học kỳ, slot tương lai hoặc yêu cầu có Chủ nhiệm đang giữ chức vụ hợp lệ.
- ICPDP đặt trùng qua `POST /admin/clubs/{clubId}/bookings/overbook`; lịch trùng,
  officer, thời điểm, lý do và snapshot Chủ nhiệm được ghi trong `BOOKING_RESERVED`.
  Thông báo tới Chủ nhiệm cùng transaction; không đổi schema. Chi tiết hiển thị lý do.
  Policy và role được kiểm tra lại trong transaction. Slot đã hết xung đột thì từ chối
  thao tác overbooking, để CLB dùng luồng đặt phòng còn trống.
- Với task review cũ, duyệt slot trùng phải nhập riêng `overbookingReason` và policy
  đang bật. Không có lý do ngoại lệ thì tự trả `Revision Requested`; ghi lý do và
  các conflict vào decision/audit khi ngoại lệ được chấp nhận.
- `GET /admin/clubs/{clubId}/booking-responsible` và
  `GET /admin/clubs/{clubId}/booking-properties/{id}/availability` phục vụ form ICPDP.
- Phía CLB cần `club.booking.manage`: danh mục còn hoạt động, xem lịch, tạo/sửa Draft,
  nộp Requested, sửa Revision Requested và nộp version mới, xem lịch sử, huỷ Requested/Approved.
- Chỉ CLB Active được tạo/nộp. Dissolving chỉ được đặt trong giới hạn học kỳ giải thể (BR45);
  Suspended/Dissolved không nhận booking mới. Quyền đọc/huỷ không phụ thuộc trạng thái CLB.
- Payload: propertyId, purpose, startAt, endAt, headcount, equipment, eventId (tuỳ chọn).
  eventId phải thuộc đúng CLB, chưa huỷ/kết thúc; không ép có sự kiện khi đặt hoạt động định kỳ.
- Thời gian nằm trong một học kỳ đã cấu hình và khung giờ UC44, tính theo Asia/Ho_Chi_Minh.
  Không đặt qua đêm; thời điểm bắt đầu phải ở tương lai khi nộp/duyệt.
- Người dùng chốt booking theo ngày và một slot: Slot 1 07:30–09:50, Slot 2 10:00–12:20,
  Slot 3 12:50–15:10, Slot 4 15:20–17:40 (UTC+7). Chưa có Slot 5/6.
  Server trả danh mục slot qua GET /booking-slots và từ chối khung giờ tự nhập hoặc qua ngày.
  Hạn gửi trong ngày sử dụng: Slot 1/2 trước 07:30, Slot 3 trước 09:50, Slot 4 trước 12:20;
  đúng mốc không được gửi. Áp dụng khi tạo/sửa/nộp, kiểm tra lại trong transaction;
  không áp dụng hạn gửi cho ICPDP duyệt/đề xuất (slot vẫn phải ở tương lai).
  Booking và phương án ICPDP thay thế phải khớp trọn một slot; timestamp vẫn là dữ liệu lưu.
  Hai khung giờ khớp slot khác nhau không xung đột; dữ liệu lịch cũ hoặc sự kiện ngoài slot
  tiếp tục áp dụng `conflictThresholdMinutes`. `allowOverbooking` cho phép xung đột với cảnh báo.
  Khung giờ trường dùng cho sự kiện đã Approved/Upcoming/Ongoing cũng được kiểm tra.
  Blackout luôn chặn. Vượt capacity chỉ cảnh báo, ICPDP quyết định; equipment phải có trong UC44.
- ICPDP xem danh sách/chi tiết, nhận task → Under Review; chỉ người nhận được ra quyết định.
  Approve/Reject/Request revision đều có lý do. Có reviewNote và phương án property/thời gian
  thay thế khi Request revision; CLB tự sửa để chấp nhận, ICPDP không tự đổi yêu cầu đã nộp.
- Kiểm tra lại lịch và trạng thái trong transaction khi nộp/duyệt. Xung đột mới lúc duyệt
  tự đưa về Revision Requested, ghi decision và thông báo; không âm thầm cấp phòng trùng lịch.
- Huỷ phải có lý do; dưới 24 giờ trước startAt là huỷ muộn, lưu isLateCancellation
  và audit để UC40 đọc. Đúng 24 giờ không muộn. In Use/Completed không cho huỷ thủ công.
- Hàm release dùng chung cho cascade UC28/UC15/UC40; cascade vòng đời CLB được giải phóng In Use,
  không ghi huỷ muộn. Cascade sự kiện chỉ giải phóng Requested/Under Review/Revision Requested/Approved.
- Version bất biến nằm trong auditLogs action BOOKING_SUBMITTED (after.payload), đi cùng
  currentVersionNo và approvalTasks/approvalDecisions; giữ equipment trong audit snapshot của draft
  và version. Không thay đổi schema hoặc thêm collection.
- Audit, task, decision, notification ghi cùng transaction. Khoá ghi document property trước
  kiểm tra slot để hai transaction duyệt khác booking cùng phòng không cùng thành công.
- UC44 hiển thị các yêu cầu đang chờ vướng blackout (FR-05); quyết định đã duyệt giữ nguyên.
- Booking tự chuyển Approved → In Use → Completed theo thời gian bằng job idempotent.
- Giao diện dùng AppSelect cho mọi ô chọn. Lịch sử booking dùng AppTable với AppPagination
  và chọn số dòng; lọc trạng thái đưa về trang đầu. Tạo/sửa yêu cầu qua AppDialog,
  các trường thiết bị/sự kiện và chi tiết giờ được đặt nằm trong phần mở rộng.
- Phòng demo mang tên mã phòng DE312/DE222/DE223, vị trí ghi toà Delta và tầng.
  Mã UC44 tự sinh vẫn giữ để tham chiếu nội bộ; UI ưu tiên tên phòng và vị trí.
  Đây là danh mục mẫu, không khẳng định toàn bộ phòng thực tế đều được phép đặt.
  Booking cũ giữ nguyên lịch sử; seed giải phóng riêng bốn booking mẫu khung giờ cũ; demo mới dùng mục đích riêng để seed idempotent theo slot.
- API dưới /api/v1: GET /clubs/{clubId}/booking-properties; GET /clubs/{clubId}/bookings;
  POST /clubs/{clubId}/bookings; GET/PATCH /clubs/{clubId}/bookings/{id};
  POST /clubs/{clubId}/bookings/{id}/submit và /cancel;
  GET /clubs/{clubId}/booking-properties/{id}/availability?startAt&endAt;
  GET /admin/bookings; GET /admin/bookings/{id}; POST /admin/bookings/{id}/claim và /decision;
  GET /admin/properties/{id}/booking-conflicts.
- GET /clubs/{clubId}/booking-events trả sự kiện chưa đóng của đúng CLB; giao diện chọn sự kiện
  theo tên và thời gian, không yêu cầu nhập ObjectId.

## Tiêu chí nghiệm thu
- [x] AC11: CLB không thể tự overbooking; ICPDP chỉ được khi policy bật và có lý do,
  kể cả policy/role đổi giữa precheck và transaction; chặn blackout và trạng thái sai.
- [x] AC12: Lý do, officer, thời điểm, conflict, snapshot và notification nguyên tử;
  giao diện ICPDP hỗ trợ đặt trùng và cả hai workspace đọc được lý do ngoại lệ.
- [x] AC1: Xác thực, permission, vai trò ICPDP và scope CLB được kiểm tra.
- [x] AC2: Validate payload, học kỳ, giờ địa phương, blackout, equipment, event scope và BR45.
- [x] AC3: Draft/sửa/nộp lại tạo lịch sử bất biến, task mới và tăng version đúng.
- [x] AC4: Threshold/overbooking/capacity, tranh chấp slot lúc duyệt và race đều đúng.
- [x] AC5: Claim độc quyền, quyết định có lý do, phương án thay thế; audit/notification đầy đủ.
- [x] AC6: Huỷ/huỷ muộn/cascade giải phóng slot, đóng task và chặn trạng thái sai.
- [x] AC7: Job chuyển In Use/Completed idempotent; FR-05 trả đúng booking đang chờ.
- [x] AC8: UI CLB/ICPDP, lịch trống, version/quyết định, loading/error, en/vi sáng/tối.
- [x] AC9: Chỉ nhận bốn slot cố định; UI tạo/sửa/đề xuất dùng ngày + slot, lịch sử hiển thị slot.
- [x] AC10: Cùng phòng/ngày/slot chặn; slot kế tiếp được đặt, legacy/event/blackout vẫn kiểm tra.

## Ngoài phạm vi
Đề xuất sự kiện UC25, xử lý hồ sơ vi phạm UC40 và workflow tạm ngừng UC14.
Không thêm nút trả phòng trước hạn cho In Use vì UC47 E1 chưa cho phép thao tác này.

## Changelog
- v1.2.0 (2026-10-11) — người dùng chốt overbooking chỉ dành cho ICPDP, policy phải bật và bắt buộc lý do.
- v1.0.0 (2026-10-10) — người dùng giao triển khai cả ICPDP và dùng quy tắc agent đề xuất.
- v1.1.0 (2026-10-10) — người dùng chốt bốn slot và tên phòng theo mã campus Hoà Lạc.

## Kiểm chứng

Unit test kiểm tra permission, validate, policy buffer, giờ Việt Nam, BR45 và huỷ muộn;
integration Mongo kiểm tra version/task/decision, tranh chấp claim/duyệt, rollback, blackout,
cascade và job.

Chrome kiểm tra hai màn CLB/ICPDP ở en/vi, sáng/tối, chiều rộng 390/1440 px; API fixture
được chặn tại trình duyệt, kiểm tra tạo draft và nhận/duyệt. Persistence được kiểm tra riêng
bằng Mongo thật.

Kiểm chứng điều chỉnh slot: `npm run check` qua 81 file / 361 test với Mongo thật;
`npm run build -w client` thành công. Seed hai lần giữ 3 phòng, 4 booking mới và 4 booking
mẫu cũ Released. Chrome kiểm tra chọn Slot 3 khi tạo draft và Slot 4 khi ICPDP đề xuất
đổi lịch, đúng timestamp UTC+7, en/vi sáng/tối ở 390/1440 px.
