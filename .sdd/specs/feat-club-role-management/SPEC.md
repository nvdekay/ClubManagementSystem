# SPEC: feat-club-role-management

## Vấn đề
UC23 (Club Leader quản lý role và phân quyền CLB) đã được khôi phục ở baseline SRS 02/11/2026 và
nằm trên use case diagram (luồng context *Club roles & permissions*). Code đang dùng hai role cố định:
mọi ghế ban điều hành đã xác nhận được coi là Club Leader, role khác không mang permission, không có
màn hình quản lý role (khoảng lệch G1 trong `docs/05-implementation/CODE_DIAGRAM_GAPS.md`).
SPEC này thay `feat-fixed-club-roles` và kế thừa phần hiện thực UC23 cũ (`feat-club-roles`, gỡ ngày
13/10/2026 ở commit `42ea892`).

## Truy vết
- UC23 (FR-UC23-01…17, E1–E7, A1–A5), UC24 (thành viên xem role của mình), UC02 FR-UC02-02/03.
- BR47 (nguồn quyền), BR54 (kiểm quyền theo permission, quyền mặc định), BR55 (danh mục cố định,
  bốn quyền giữ riêng, role ban điều hành chỉ đổi qua UC12/UC13), BR56 (phiên bản cơ cấu).
- SEC-04 (quyền chỉ từ bản gán ∩ nhiệm kỳ đang hoạt động).

## Hành vi

### Domain (`domain/access.ts`, `domain/club-role.ts`)
- `CLUB_PERMISSIONS` (16), `DEFAULT_MEMBER_PERMISSIONS` (2), `LEADER_RESERVED_PERMISSIONS` (4),
  `ROLE_GRANTABLE_PERMISSIONS` = danh mục trừ bốn quyền giữ riêng.
- `isClubLeaderSeat`: `isLeaderRole` (Chủ nhiệm) hoặc ghế ban điều hành mã `VICE_LEADER`/`VICE`
  (Phó chủ nhiệm). `isClubLeader(snapshot)` = giữ ghế đó, đã xác nhận, trong nhiệm kỳ hiện hành.
- `resolveClubPermissions`:
  - thành viên `Active` → hai quyền mặc định;
  - ghế Leader đã xác nhận → đủ 16;
  - ghế ban điều hành khác → `permissionCodes` của role **chỉ khi** đã xác nhận;
  - role thường → `permissionCodes` của role, không cần xác nhận;
  - role Members không cấp gì thêm; mã lạ và bốn quyền giữ riêng luôn bị lọc; nhiều role → hợp.
- Ràng buộc (E1–E7): chỉ gán thành viên `Active`; role một người giữ không có người thứ hai; tên
  role duy nhất trong CLB (không phân biệt hoa thường); ban/bộ phận phải là department đang hoạt
  động; không gán tay role Members, ghế Leader hay ghế ban điều hành; không sửa/xoá ghế Leader; không
  xoá Members; không đổi cờ ban điều hành hay số người giữ của ghế ban điều hành; không ngừng role
  còn người giữ; role Members không mang permission; bốn quyền giữ riêng và mã lạ → 400.

### API (`/api/v1/clubs/:clubId/...`)
| Endpoint | Quyền | Ghi chú |
|---|---|---|
| `GET roles` | thành viên hiện tại; holder, danh sách thành viên và phiên bản chỉ trả cho `club.role.manage` | kèm `grantablePermissions` (12 mã: trừ 4 giữ riêng) |
| `POST roles` | `club.role.manage` + CSRF | tạo role thường |
| `PATCH roles/:roleId` | như trên | sửa tên, ban, mô tả, số người giữ, permission — hiệu lực ngay |
| `DELETE roles/:roleId` | như trên | ngừng role không còn người giữ |
| `POST roles/:roleId/assignments` | như trên | gán thành viên `Active`, khoảng hiệu lực |
| `DELETE roles/:roleId/assignments/:assignmentId` | như trên | thu hồi |
| `GET role-directory` | thành viên `Active`/`Inactive` | UC24: role, permission, `heldByMe`; không lộ người giữ khác |

CLB phải ở `Active` để thay đổi; gán cần nhiệm kỳ đang hoạt động.

### Transaction, phiên bản, audit, thông báo
Mỗi mutation chạy trong một transaction Mongo: ghi `clubPositions`/`clubPositionAssignments`, append
một `clubRoleStructureVersions` (`source = ROLE_EDIT`, `versionNo` tăng; index unique
`(clubId, versionNo)` biến hai sửa đồng thời thành 409), ghi `auditLogs` before/after
(`CLUB_ROLE_CREATED|UPDATED|DEACTIVATED|ASSIGNED|REVOKED`), và thông báo
`CLUB_ROLE_ASSIGNED|REVOKED|UPDATED` cho người giữ bị ảnh hưởng. Lỗi bất kỳ bước nào → rollback toàn bộ.

### Migration
`infra/db/club-role-upgrade.ts` chạy lúc server khởi động, idempotent: lọc mã lạ và bốn quyền giữ
riêng khỏi role, xoá `permissionCodes` của ghế Leader và Members, và chỉ khi cơ cấu hiện hành khác
phiên bản mới nhất mới append một phiên bản `MIGRATION` + audit `CLUB_ROLE_STRUCTURE_MIGRATED`. Không
đụng bản gán, không sửa phiên bản cũ, không biến ghế ban điều hành khác thành Leader.

### Client
- `/club/:clubId/roles` (`ClubRolesPage`), menu chỉ hiện khi có `club.role.manage`.
- ICPDP: lịch sử cơ cấu ở trang lịch sử ban chủ nhiệm của CLB hiện thêm số permission của từng role.
- UC24: trang thành viên chỉ đọc hiện danh mục role và đánh dấu role người xem đang giữ.
- Workspace `role = "leader"` chỉ khi `isClubLeader`, không suy từ `club.member.manage`.

## Tiêu chí nghiệm thu
- [x] Leader có đủ 16 quyền; thành viên thường có đúng hai quyền mặc định.
- [x] Role thường cấp đúng permission không cần `confirmedBy`; ghế ban điều hành khác cần xác nhận.
- [x] Chủ nhiệm/Phó chủ nhiệm hợp lệ nhận toàn bộ quyền; ghế ban điều hành khác thì không.
- [x] Nhiều role → hợp quyền; bản gán hết hạn/chưa bắt đầu, nhiệm kỳ hết hạn, role ngừng, membership không `Active` → không cấp.
- [x] Quyền giữ riêng và mã lạ bị từ chối ở domain/API.
- [x] E1–E7 có test; mỗi mutation tạo đúng một phiên bản, audit và thông báo; sửa đồng thời → 409.
- [x] Truy cập chéo CLB bị từ chối; role/assignment id phải thuộc đúng CLB.
- [x] Workspace không thành `leader` chỉ vì role thường có `club.member.manage`.
- [x] Upgrader chuẩn hoá dữ liệu cũ và chạy lại không sinh thêm phiên bản.

## Ngoài phạm vi
Thêm/bỏ role ban điều hành (chỉ qua UC12/UC13); thông báo cho ICPDP mỗi lần CLB sửa role.

## Changelog
- v1.0.0 (2026-11-07) — người dùng duyệt theo prompt sửa lệch code/diagram; thay `feat-fixed-club-roles`.
- v1.1.0 (2026-11-07) — sửa sau review: chỉ CLB `Active` sửa cơ cấu (đúng tiền điều kiện UC23); danh mục cấp được = 12 mã (danh mục trừ bốn quyền giữ riêng, BR55); gán role kiểm nhiệm kỳ tồn tại, đúng CLB, đang hiệu lực trong transaction; role UC23 không ghi `confirmedBy`; migration không đổi CLB nào nếu không ghi được phiên bản/audit (trả `skippedClubIds`).
- v1.2.0 (2026-11-07) — Member Space (UC24) hiện role UC23 không cần `confirmedBy`; ghế ban điều hành vẫn cần ICPDP xác nhận.
- v2.0.0 (2026-11-07) — **Thay thế** lại bởi role cố định (`feat-fixed-club-roles`): SRS hiện hành rút UC23 (BR47, BR54, BR55); API, UI, menu, resolver theo role và migration của SPEC này đã gỡ. Hai quyền mặc định của thành viên vẫn giữ (`feat-member-default-permissions`).
