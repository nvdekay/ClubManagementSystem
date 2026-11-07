# SPEC: feat-member-default-permissions

## Vấn đề
Diagram đã duyệt (trang *Club Member - Events & bookings*) và SRS baseline 02/11/2026 cho mọi thành
viên `Active` quản lý danh sách chờ, chốt điểm danh (UC30, UC32) và xem phòng ICPDP đã phân cho CLB
(UC58). Code hiện chỉ cấp hai việc này cho Club Leader, và xem phòng lại đòi `club.booking.manage`
(quyền tạo booking UC45). Khoảng lệch G2 trong `docs/05-implementation/CODE_DIAGRAM_GAPS.md`.

## Truy vết
- BR54 (khôi phục 02/11): mọi thành viên `Active` tự có `club.attendance.manage`, `club.room.view`.
- BR47 (c): quyền mặc định đến từ tư cách thành viên `Active`, không từ bản gán role.
- BR55: danh mục permission CLB cố định — 16 mã, gồm `club.room.view` và `club.role.manage`.
- UC30, UC32, UC58; FR-UC02-03 (dashboard CLB của Club Member chỉ các mục của hai quyền mặc định).

## Hành vi
- `domain/access.ts`:
  - `CLUB_PERMISSIONS` — danh mục cố định 16 mã (14 mã cũ + `club.room.view` + `club.role.manage`).
  - `DEFAULT_MEMBER_PERMISSIONS = [club.attendance.manage, club.room.view]`.
  - `LEADER_RESERVED_PERMISSIONS = [club.role.manage, club.board.nominate, club.transition.plan,
    club.suspension.request]` (dùng ở feat-club-role-management).
  - `resolveClubPermissions`: membership `Active` của đúng CLB → thêm hai quyền mặc định, **không**
    cần nhiệm kỳ hay bản gán. Membership `Inactive`, `Left`, `Banned`, hoặc người ngoài CLB → không.
    Người sáng lập CLB `Pending Setup` không có membership `Active` → không nhận quyền mặc định.
  - Club Leader vẫn có toàn bộ danh mục (nay 16 mã).
- UC30/UC32: giữ kiểm tra `club.attendance.manage`. Danh sách sự kiện và kết quả thao tác điểm danh
  của người không có `club.event.manage` tiếp tục bị lược nội dung quản trị (objective, plan, ngân
  sách, booking, form đăng ký, version, quyết định).
- UC58 `GET /api/v1/clubs/:clubId/room-allocations` đòi `club.room.view`. Tạo/sửa booking (UC45) vẫn
  đòi `club.booking.manage`.
- `GET /auth/me`: workspace CLB của thành viên thường trả `permissions = [club.attendance.manage,
  club.room.view]`, `role = "member"`.
- Client: mục điều hướng *Phòng được phân* và trang `ClubRoomsPage` gate theo `club.room.view`; mục
  *Booking* vẫn theo `club.booking.manage`.
- Dashboard CLB: panel booking sắp tới vẫn theo `club.booking.manage` (không đổi).

### Ma trận phân quyền
| Thao tác | Thành viên `Active` | Club Leader | Thành viên không Active / CLB khác |
|---|---|---|---|
| UC30 danh sách chờ, UC32 chốt điểm danh | ✓ | ✓ | 403 |
| UC58 xem phòng được phân | ✓ | ✓ | 403 |
| UC45 tạo booking | 403 (trừ khi role cấp `club.booking.manage`) | ✓ | 403 |

### Lỗi
- Không đăng nhập → 401; tài khoản khoá → 423; thiếu quyền → 403 `club access denied`.

### Transaction, audit, thông báo, migration
- Không mutation mới; các mutation điểm danh hiện có vẫn re-check quyền trong transaction qua
  `assertEventWriteAccess`, dùng chung `resolveClubPermissions` nên tự nhận quyền mặc định.
- Không đổi schema, không cần migration: quyền mặc định suy ra từ membership hiện có.
- Bảng `permissions` được bootstrap thêm hai mã mới (idempotent upsert).

## Tiêu chí nghiệm thu
- [x] **Cho** thành viên `Active` không có bản gán nào, **khi** resolve quyền, **thì** nhận đúng
      `club.attendance.manage` và `club.room.view`.
- [x] **Cho** membership `Inactive`/`Left`/`Banned`, **thì** không nhận hai quyền.
- [x] **Cho** thành viên CLB A, **khi** xem phòng hoặc thao tác điểm danh CLB B, **thì** 403.
- [x] **Cho** thành viên thường, **khi** gọi danh sách/điểm danh UC30/UC32, **thì** thành công và payload
      không chứa nội dung quản trị sự kiện.
- [x] **Cho** thành viên thường, **khi** xem UC58, **thì** thành công; **khi** tạo booking UC45, **thì** 403.
- [x] Club Leader có đủ 16 quyền.
- [x] OpenAPI route coverage vẫn xanh.

## Ngoài phạm vi
Role CLB cấu hình được và cấp quyền qua role (feat-club-role-management).

## Changelog
- v1.0.0 (2026-11-07) — người dùng duyệt theo prompt sửa lệch code/diagram.
- v1.1.0 (2026-11-07) — SRS hiện hành rút UC23: danh mục còn 15 mã (bỏ `club.role.manage`), không còn `LEADER_RESERVED_PERMISSIONS`; Club Leader có cả 15, thành viên `Active` vẫn có hai quyền mặc định.
