# SPEC: feat-fixed-club-roles

## Vấn đề
Role CLB tự tạo (UC23) làm phân quyền khó hiểu và khó kiểm thử: mỗi CLB có cơ cấu riêng, thành
viên có thể giữ quyền lẻ. Người dùng chốt ngày 13/10/2026: phía CLB chỉ còn **hai role cố định**,
Club Leader và Club Member.

## Hành vi
- **Club Leader** = thành viên `Active` giữ ghế **Chủ nhiệm** (`isLeaderRole`) **hoặc Phó chủ nhiệm**
  (`isBoardSeat`) có `confirmedBy` trong nhiệm kỳ đang hiệu lực. Được **mọi** permission CLB
  (`CLUB_LEADER_PERMISSIONS`, 14 mã). Chủ nhiệm và Phó chủ nhiệm cùng một bộ quyền.
- **Club Member** = mọi thành viên `Active` khác: **không** có permission quản lý nào. Chỉ xem và
  tham gia: không gian thành viên, danh sách thành viên (chỉ đọc), xin rời CLB, đăng ký sự kiện,
  check-in, phản hồi, góp ý.
- Người đứng đơn khi CLB còn `Pending Setup`: chỉ `club.profile.manage`, `club.board.nominate`.
- `resolveClubPermissions` bỏ qua `permissionCodes` và role Members mặc định; bỏ `club.role.manage`.
- Gỡ API `/clubs/:clubId/roles*`, `/clubs/:clubId/role-directory` và OpenAPI tương ứng; gỡ tab
  "Vai trò & phân quyền" (thiết lập CLB) và tab vai trò ở trang thành viên.
- Trang **Thiết lập CLB** gate bằng `club.profile.manage`; trang **Thành viên**: Club Leader quản lý,
  Club Member xem danh sách chỉ đọc.
- Workspace CLB: `role = "leader"` khi có `club.member.manage`, ngược lại `"member"` (founder giữ nguyên).
- **Không đổi schema.** `clubPositions.permissionCodes`, `clubRoleStructureVersions` vẫn còn nhưng không
  dùng để cấp quyền; role tự tạo cũ trong DB bị bỏ qua.

**Giới hạn runtime đã đối chiếu 15/10:** API UC58 vẫn yêu cầu club.booking.manage; chỉ Leader
xem phòng được phân. Thiết lập CLB bị ẩn với Member ở UI, nhưng API GET profile/departments vẫn
cho current member đọc qua assertClubSettingsRead; mutation luôn yêu cầu quyền Leader.

## Tiêu chí nghiệm thu
- [x] Thành viên thường không có permission nào; mọi API vận hành CLB trả 403.
- [x] Chủ nhiệm và Phó chủ nhiệm đã xác nhận có đủ 14 permission; chưa xác nhận thì không có quyền.
- [x] Người đứng đơn `Pending Setup` chỉ có hồ sơ CLB và đề cử ban chủ nhiệm.
- [x] Sau khi duyệt hồ sơ thành lập, cả Chủ nhiệm và hai Phó chủ nhiệm mở được thiết lập CLB; thành viên thì không (E2E).
- [x] API quản lý role không còn; client không còn màn phân quyền.

## Ngoài phạm vi
Xoá collection/field role trong DBML. Diagram đã bỏ UC23; xem ma trận runtime tại docs/CURRENT_IMPLEMENTATION.md.

## Changelog
- v1.0.0 (2026-10-13) — người dùng chốt: Phó chủ nhiệm = Club Leader; Club Member chỉ xem và tham gia; gỡ UI + API, giữ collection.
