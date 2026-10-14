# SPEC: feat-room-allocation

> **Cập nhật 2026-10-13 (review issue I66, ADR-007):** xem phòng được phân phía CLB không còn dùng `club.booking.manage` mà dùng permission mặc định `club.room.view`, tự có với mọi thành viên `Active` của đúng CLB; không cần Club Leader gán quyền. `club.booking.manage` nay thuộc riêng Club Leader.

> UC58 — Phân phòng học cho CLB theo học kỳ. Product owner duyệt ngày 2026-10-11; thay luồng CLB
> tự đặt phòng học (feat-room-availability, AC13 của feat-facility-booking) và luồng ICPDP đặt trùng
> phòng học. Quyết định kiến trúc: [ADR-006](../../rfcs/ADR-006-room-allocation-by-icpdp.md).

## Vấn đề
Phòng học (`ROOM`) ở campus được nhà trường cấp cho CLB theo lịch cố định mỗi tuần, không phải theo
từng lần đặt. Luồng cũ để CLB tự giữ phòng còn trống (và ICPDP đặt trùng có lý do) khiến phòng bị
chiếm lẻ tẻ, khó kiểm soát và không khớp cách nhà trường giao chìa khoá. ICPDP cần một chỗ phân
phòng một lần cho cả học kỳ; CLB cần một màn chỉ đọc để biết phòng của mình và đưa ra làm bằng
chứng khi nhận chìa khoá.

## Hành vi

### Phân phòng (ICPDP)
- Chỉ `ICPDP_OFFICER` còn hiệu lực. Mỗi lần phân gồm: học kỳ (`semesterCode` trong policy
  `academicCalendar`, chưa kết thúc), CLB (`Active` hoặc `Dissolving`), một phòng (`type = ROOM`,
  đang hoạt động, ở bất kỳ toà nào — toà nhà = `location`), một thứ (`weekday` 1 = Thứ 2 … 7 = Chủ
  nhật, giờ Việt Nam), một slot campus và ghi chú tuỳ chọn (≤ 500 ký tự).
- Slot (UTC+7): 1 07:30–09:50, 2 10:00–12:20, 3 12:50–15:10, 4 15:20–17:40 — dùng chung
  `BOOKING_SLOTS` với UC45.
- Mẫu tuần áp dụng cho mọi tuần của học kỳ: "Slot 4, Thứ 4" → mọi thứ Tư slot 4 trong học kỳ.
  Học kỳ sau ICPDP phân lại; không có gì được kế thừa.
- Hệ thống sinh một `propertyBookings` cho mỗi ngày khớp: `state = Approved`,
  `purpose = "ICPDP room allocation"`, `currentVersionNo = 0`, `conflictResult = No Conflict`,
  `decidedBy`/`decidedAt` = officer/thời điểm phân, `semesterCode` = học kỳ đã chọn.
- Chỉ sinh ngày mà slot chưa bắt đầu và nằm trọn trong học kỳ. Ngày trùng blackout của phòng bị
  bỏ qua (ghi vào `after.skipped` của audit `ROOM_ALLOCATED`). Khung giờ được đặt (`bookableHours`) của phòng phải phủ thứ/slot
  đó, nếu không → 400. Không còn ngày nào để sinh → 400.
- CLB `Dissolving` chỉ được phân trong học kỳ giải thể (BR45); học kỳ sau đó → 409.
- Xung đột: bất kỳ ngày nào trùng booking `Approved`/`In Use` hoặc sự kiện
  `Approved`/`Upcoming`/`Ongoing` trên cùng phòng (BR15, ngưỡng `conflictThresholdMinutes`) →
  từ chối **cả đợt** (409) và liệt kê các ngày xung đột. Không có overbooking cho phòng học, kể cả
  khi `allowOverbooking = true` (BR33, BR62). Hệ quả: mỗi phòng/thứ/slot/học kỳ có tối đa một CLB.
- Kiểm tra xung đột lặp lại trong transaction dưới khoá ghi document property; booking, audit và
  notification ghi cùng transaction — hoặc tất cả hoặc không gì.
- Bản ghi phân phòng nằm trong `auditLogs`: `entityType = RoomAllocation`, `action = ROOM_ALLOCATED`,
  `after = { semesterCode, clubId, clubName, propertyId, weekday, slot, note, bookingIds, skipped }`.
  Định danh đợt phân (`{id}` trong API) trỏ tới bản ghi audit này.

### Thu hồi (ICPDP)
- Bắt buộc lý do (≤ 2000 ký tự). Buổi chưa bắt đầu → `Released`
  (`releasedBy = ROOM_ALLOCATION_REVOKED`); buổi đã bắt đầu/đã qua giữ nguyên làm lịch sử.
  Ghi audit `ROOM_ALLOCATION_REVOKED` (`entityType = RoomAllocation`, cùng `entityId`) kèm lý do.
- Thu hồi lần hai → 409. Muốn đổi phòng/thứ/slot: thu hồi rồi tạo đợt mới.

### Thông báo
- In-app tới ban chủ nhiệm (Club Leader + các ghế board đang giữ): `ROOM_ALLOCATED`,
  `ROOM_ALLOCATION_REVOKED` (kèm lý do).

### Phía CLB (chỉ đọc)
- `/club/:clubId/rooms` — "Phòng được phân": chỉ thành viên `Active` có
  `club.booking.manage` trong đúng CLB (bao gồm Club Leader theo BR54) xem được. Dùng permission
  CSVC hiện có; Club Leader gán cho role của thành viên phụ trách nhận chìa khoá. API kiểm tra
  `assertClubAccess`; menu ẩn và trang chặn khi thiếu quyền. Hiển thị lịch tuần của học kỳ hiện tại
  và sắp tới (thứ, slot, giờ, phòng, toà, ghi chú) và các buổi sắp tới để xuất trình cho bảo vệ.
  CLB không đặt, huỷ hay xin phòng học.
- `/club/:clubId/bookings` chỉ còn yêu cầu `HALL`/`OUTDOOR`/`STAGE`/`EQUIPMENT` (UC45–47).

### Phía ICPDP (UI)
- `/workspace/room-allocations` — "Phân phòng CLB", nhóm sidebar "Sự kiện & cơ sở vật chất":
  chọn học kỳ; danh sách đợt phân (lọc theo CLB/toà); dialog tạo đợt với lưới chiếm dụng tuần
  của phòng đang chọn; thu hồi kèm lý do.

### Vòng đời và cascade
- Job lifecycle vẫn chuyển từng buổi `Approved → In Use → Completed`.
- UC15 tạm ngừng/giải thể giải phóng các buổi tương lai như mọi booking khác. Kích hoạt lại CLB
  **không** khôi phục chúng — ICPDP phải phân lại.
- Sự kiện CLB đặt tại phòng đã phân bị BR15 chặn như với mọi booking `Approved`.

## Hợp đồng API (dưới `/api/v1`)

| Endpoint | Quyền | Mô tả |
|---|---|---|
| `GET /admin/room-allocations?semesterCode=` | ICPDP | Danh sách đợt phân của học kỳ (kèm các buổi và trạng thái) |
| `GET /admin/room-allocations/options` | ICPDP | Học kỳ chưa kết thúc, CLB `Active`/`Dissolving`, phòng ROOM đang hoạt động |
| `POST /admin/room-allocations` | ICPDP + CSRF | `{semesterCode, clubId, propertyId, weekday, slot, note?}` → 201 đợt phân kèm các buổi đã sinh; 409 kèm danh sách xung đột |
| `POST /admin/room-allocations/{id}/revoke` | ICPDP + CSRF | `{reason}` → 200 đợt phân sau thu hồi; 409 nếu đã thu hồi |
| `GET /clubs/{clubId}/room-allocations` | Thành viên `Active` có `club.booking.manage` trong CLB | Đợt phân chưa thu hồi còn buổi sắp tới, chỉ kèm các buổi `Approved`/`In Use` chưa kết thúc |

Lỗi: 400 validate (học kỳ không có, thứ/slot sai, ngoài khung giờ được đặt, không còn ngày),
401/403/423 theo auth chung, 404 CLB/phòng/đợt không tồn tại, 409 học kỳ đã kết thúc, CLB sai
trạng thái, phòng ngừng hoạt động, vượt học kỳ giải thể, xung đột, thu hồi lặp.

## Hợp đồng dữ liệu
Không đổi schema, không thêm collection (ADR-006). Dùng `propertyBookings` (các trường như trên;
`releasedBy` thêm giá trị `ROOM_ALLOCATION_REVOKED`), `auditLogs` (bản ghi đợt phân/thu hồi) và
`notifications`. Dữ liệu ROOM cũ (đặt trực tiếp, đặt trùng, legacy review) bị `npm run seed:demo`
xoá hẳn kèm task/decision/notification/audit của chúng; demo seed vài đợt phân phòng.

## Quyết định
- D1: Lưu đợt phân dưới dạng các booking đã sinh + một audit record, không có collection mới.
- D2: Một đợt phân = đúng một thứ + một slot; nhiều buổi/tuần thì tạo nhiều đợt.
- D3: Xung đột → từ chối cả đợt (không sinh một phần) để ICPDP chủ động chọn phòng/slot khác.
- D4: Blackout là kế hoạch của nhà trường nên chỉ bỏ qua ngày đó, không chặn cả đợt.
- D5: Không sửa đợt phân; đổi = thu hồi + tạo mới, để lịch sử rõ ràng.

## Trường hợp biên
- Phân giữa học kỳ: chỉ sinh các ngày mà slot chưa bắt đầu (kể cả hôm nay nếu slot chưa tới giờ).
- Blackout trùng một số tuần: các ngày đó bị bỏ qua (ghi trong audit `skipped`); ngày còn lại vẫn sinh.
- Thu hồi giữa học kỳ: buổi đã qua/đang diễn ra giữ nguyên (`In Use`/`Completed`), buổi tương lai `Released`.
- CLB bị tạm ngừng/giải thể: buổi tương lai được giải phóng; kích hoạt lại không khôi phục — ICPDP phân lại.
- Sự kiện CLB đặt vào phòng/slot đã phân → `Blocking Conflict` như trước.
- Hai officer phân cùng phòng/thứ/slot đồng thời: khoá property bảo đảm chỉ một đợt thành công.
- Phòng ngừng hoạt động sau khi đã phân: các buổi đã sinh giữ nguyên (UC44 A1).

## Tiêu chí nghiệm thu
- [x] AC1: Chỉ ICPDP gọi được API admin; chỉ thành viên `Active` có `club.booking.manage` trong đúng CLB đọc được API CLB; thiếu quyền, `Inactive`, role hết hạn hoặc CLB khác bị 403.
- [x] AC2: Sinh đúng một booking `Approved` cho mỗi ngày khớp, chỉ ngày chưa bắt đầu, đúng giờ UTC+7.
- [x] AC3: Ngày trùng blackout bị bỏ qua và trả về; ngoài khung giờ được đặt hoặc không còn ngày → 400.
- [x] AC4: Một ngày xung đột với booking/sự kiện chiếm phòng → 409, không ghi gì; liệt kê ngày xung đột; `allowOverbooking` không có tác dụng.
- [x] AC5: Học kỳ đã kết thúc, CLB sai trạng thái, vượt học kỳ giải thể, phòng không phải ROOM/ngừng hoạt động bị từ chối.
- [x] AC6: Audit `ROOM_ALLOCATED` đủ trường `after`; notification `ROOM_ALLOCATED` tới ban chủ nhiệm; tất cả cùng transaction.
- [x] AC7: Thu hồi bắt buộc lý do, `Released` buổi tương lai với `releasedBy = ROOM_ALLOCATION_REVOKED`, giữ buổi đã qua, audit + notification; thu hồi lặp → 409.
- [x] AC8: Hai đợt đồng thời cùng phòng/thứ/slot chỉ một thành công.
- [ ] AC9 (build OK, chưa QA trực quan vì cần đăng nhập Google OAuth): UI ICPDP `/workspace/room-allocations` (chọn học kỳ, lọc CLB/toà, lưới chiếm dụng, tạo, thu hồi) và UI CLB `/club/:clubId/rooms` chỉ đọc; en/vi, sáng/tối, 390/1440 px.
- [x] AC10: `seed:demo` xoá dữ liệu ROOM cũ và seed vài đợt phân, chạy lại idempotent.
- [x] AC11: SRS, đặc tả/mô hình UC (UC58, BR33/BR35/BR62), diagram, guide book, DOCX và ADR-006 cập nhật.

## Ngoài phạm vi
Sửa đợt phân tại chỗ; phân nhiều slot/thứ trong một lần; tự sao chép sang học kỳ sau; CLB xin
hoặc đổi phòng học; khôi phục buổi đã giải phóng khi CLB kích hoạt lại; quản lý chìa khoá.

## Changelog
- v1.0.0 (2026-10-11) — product owner duyệt luồng ICPDP phân phòng học theo học kỳ (UC58).
- v1.1.0 (2026-10-13) — xem phòng phía CLB dùng `club.room.view`, mặc định cho mọi thành viên `Active` (I66, ADR-007).

Kiểm chứng v1.0.0: `npm run check` — 91 file / 434 test pass (có integration Mongo thật:
`mongo-room-allocation-repository.test.ts`, booking, UC25); `npm run build -w client` thành công;
`npm run seed:demo` hai lần trên DB local: 0 booking ROOM cũ, 4 đợt phân / 47 buổi, không nhân đôi.
