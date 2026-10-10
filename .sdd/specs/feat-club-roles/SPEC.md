# SPEC: feat-club-roles

## Vấn đề
UC23 — Chủ nhiệm cần tự tổ chức CLB: tạo role (thủ quỹ, trưởng nhóm hậu cần, …), chọn
permission cho từng role từ danh mục cố định, giao role cho thành viên `Active` và thu hồi khi
cần. Hiện cơ cấu chỉ có phiên bản 1 sinh ra lúc ICPDP duyệt hồ sơ (UC08), không có nơi nào sửa
tiếp, và quyền vận hành chỉ đến từ ghế ban điều hành.

## Hành vi
Mọi endpoint nằm dưới `/api/v1/clubs/{clubId}/roles`, yêu cầu đăng nhập và permission giữ riêng
`club.role.manage` trong đúng CLB (E5 → 403). Club Leader đã xác nhận có quyền này; founder của
CLB `Pending Setup` có quyền tạm từ UC08 (resolver có sẵn). Mutation cần CSRF và chỉ chạy khi
CLB ở `Active` hoặc `Pending Setup` (khác → 409). Mọi mutation trả lại toàn bộ overview.

| Method | Path | Việc |
|---|---|---|
| GET | `/clubs/{clubId}/roles` | Overview: role (kèm người giữ hiện tại), thành viên `Active` có thể gán, ban/bộ phận đang hoạt động, các phiên bản cơ cấu, danh mục permission cấp được |
| POST | `/clubs/{clubId}/roles` | Tạo role thường |
| PATCH | `/clubs/{clubId}/roles/{roleId}` | Sửa role (tên, ban/bộ phận, một/nhiều người giữ, permission) |
| DELETE | `/clubs/{clubId}/roles/{roleId}` | Ngừng dùng role (`isActive=false`, không xoá cứng) |
| POST | `/clubs/{clubId}/roles/{roleId}/assignments` | Gán thành viên, `effectiveFrom`/`effectiveTo` tuỳ chọn |
| DELETE | `/clubs/{clubId}/roles/{roleId}/assignments/{assignmentId}` | Thu hồi role của thành viên |

Body role: `{ name, unit?, isSingleHolder, permissionCodes[], reason? }`. Body gán:
`{ membershipId, effectiveFrom?, effectiveTo? }`.

- **Phiên bản (BR56):** tạo / sửa / ngừng dùng role đều chèn một document mới vào
  `clubRoleStructureVersions` (`versionNo` = lớn nhất + 1, `source: "ROLE_MANAGEMENT"`,
  `sourceRefId` = role, `createdBy`, `reason` tuỳ chọn, `roles` = ảnh chụp các role đang hoạt
  động). Không bao giờ sửa phiên bản cũ. Gán / thu hồi không phải thay đổi cơ cấu nên không tạo
  phiên bản.
- **A3:** phiên bản 1 là cơ cấu khởi lập (Chủ nhiệm / Phó chủ nhiệm / Thành viên) do UC08 ghi.
- **A1:** sửa permission áp dụng ngay — resolver đọc trực tiếp `clubPositions` mỗi request.
  Audit ghi tập permission trước và sau.
- **A2:** thu hồi đặt `effectiveTo = now` (bản gán chưa bắt đầu thì `effectiveTo = effectiveFrom`,
  theo cùng quy ước với UC21), có audit và thông báo cho thành viên.
- **A4:** role ban điều hành (`isBoardSeat`) được sửa tên / ban / permission, nhưng không gán /
  thu hồi người giữ ở đây và không đổi `isSingleHolder`.
- **A5:** overview trả mọi phiên bản (kèm ảnh chụp role); client cho chọn hai phiên bản và so sánh
  theo `positionId` (thêm / bỏ / đổi tên, đổi permission).
- **Gán (bước 5–6):** bản gán thuộc nhiệm kỳ `Active` hiện tại, `assignedBy` = `confirmedBy` =
  leader (gán trực tiếp không cần xác nhận thêm), nên quyền có ngay và role hiện ở UC24.
  `effectiveFrom` trước thời điểm hiện tại được kéo về `now`. CLB chưa có nhiệm kỳ `Active` → 409.
- **Role Members mặc định:** permission của role `isDefaultMemberRole` áp dụng cho mọi thành viên
  `Active` (BR56: tự gán cho mọi thành viên) — resolver được mở rộng tương ứng.
- Audit: `ClubPosition` (`CLUB_ROLE_CREATED|UPDATED|DEACTIVATED`) và `ClubPositionAssignment`
  (`CLUB_ROLE_ASSIGNED|REVOKED`); thông báo `CLUB_ROLE_ASSIGNED|REVOKED` (`IN_APP`) cho thành
  viên. Mỗi thao tác chạy trong một transaction.

### Ngoại lệ
- **E1** gán cho thành viên không `Active` (hoặc không thuộc CLB) → 409.
- **E2** role một người giữ đã có người → 409; đổi role thành một người giữ khi đang có >1 người
  giữ → 409; gán trùng người đang giữ → 409.
- **E3** permission giữ riêng của leader → 400; mã ngoài danh mục → 400.
- **E4** ngừng dùng role còn người giữ → 409.
- **E5** người gọi không có `club.role.manage` → 403.
- **E6** ngừng dùng / gán / thu hồi / đổi `isSingleHolder` của role ban điều hành → 409. API tạo
  role không có trường `isBoardSeat` nên không thể thêm hay đánh dấu lại role ban điều hành.
- **E7** sửa / ngừng dùng role Chủ nhiệm, ngừng dùng role Members, gán tay role Members → 409.

### Kiểm tra dữ liệu
Tên 1–120 ký tự, không trùng (không phân biệt hoa thường) với role đang hoạt động khác → 409.
`unit` phải là tên một ban/bộ phận đang hoạt động (UC09) → 400. `reason` ≤ 500 ký tự.
`effectiveTo` phải sau `effectiveFrom` → 400.

## Tiêu chí nghiệm thu
- [x] Người gọi thiếu `club.role.manage` bị từ chối 403 (E5); founder `Pending Setup` được phép.
- [x] Tạo role lưu permission đã chuẩn hoá và tạo phiên bản cơ cấu mới; phiên bản cũ không đổi (bước 4, BR56).
- [x] Permission giữ riêng của leader hoặc ngoài danh mục bị từ chối (E3).
- [x] Sửa permission tạo phiên bản mới, audit có tập trước/sau, quyền có hiệu lực ngay cho người giữ (A1).
- [x] Gán thành viên `Active` thành công; thành viên không `Active` bị từ chối (E1, bước 5).
- [x] Role một người giữ đã có người bị từ chối; không đổi thành một người giữ khi có nhiều người giữ (E2).
- [x] Thu hồi làm mất quyền ngay, có audit và thông báo (A2).
- [x] Ngừng dùng role còn người giữ bị từ chối (E4).
- [x] Role ban điều hành: sửa permission được; gán / thu hồi / ngừng dùng / đổi `isSingleHolder` bị từ chối (A4, E6).
- [x] Role Chủ nhiệm không sửa / ngừng dùng được; Members không ngừng dùng / gán tay được (E7).
- [x] Permission của role Members áp dụng cho mọi thành viên `Active`.
- [x] Overview trả danh sách phiên bản; client so sánh hai phiên bản (A5).
- [x] Mongo repository: phiên bản tăng dần, audit + thông báo ghi trong transaction (integration, bỏ qua khi không có `MONGO_URI`).
- [ ] UI tab "Vai trò" trong cài đặt CLB hoạt động `en`/`vi`, sáng/tối — build xanh; còn nghiệm thu trực quan thủ công.

## Ngoài phạm vi
- Mô tả role: `clubPositions` không có trường `description` và SPEC này không đổi schema — chỉ lưu
  tên, ban/bộ phận, một/nhiều người giữ, permission.
- Thêm / bỏ role ban điều hành và chọn người giữ ghế ban điều hành (UC10 / UC11 / UC12 / UC13).
- Thông báo cho người giữ khi permission của role đổi (spec chỉ yêu cầu audit).
- ICPDP xem lịch sử cơ cấu (UC02).

## Changelog
- v1.0.0 (2026-10-10) — bản đầu tiên, theo quyết định của product owner (UC23 đầy đủ, không đổi schema).

### Điều chỉnh UX và quyền đọc thiết lập

Thành viên được xem danh sách vai trò và quyền ở chế độ chỉ đọc; API không trả holders, members, versions cho người không có club.role.manage.
