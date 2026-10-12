# SPEC: feat-club-profile-structure

## Vấn đề
Sau UC08, Club ở `Pending Setup` nhưng founder chưa có nơi hoàn thiện hồ sơ vận hành và định
nghĩa các ban/bộ phận. UC09 cần cho đúng người có `club.profile.manage` sửa dữ liệu thuộc thẩm
quyền CLB, đồng thời bảo vệ trường thuộc thẩm quyền nhà trường và mọi đơn vị đang được role sử
dụng.

## Khoảng trống schema
DBML hiện có `clubMemberships.departmentId` và `clubPositions.unit` nhưng không có aggregate
ban/bộ phận. UC09 cần thêm collection `clubDepartments` để có định danh ổn định, trạng thái,
thứ tự hiển thị và kiểm tra tham chiếu trước khi xoá. Đây là thay đổi schema cần người dùng chấp
thuận trước khi triển khai.

## Hành vi
- Chỉ actor có `club.profile.manage` trong đúng Club được đọc cấu hình nội bộ và cập nhật.
  Approved founder của Club `Pending Setup` dùng quyền tạm từ UC08.
- Hồ sơ được sửa gồm description, contact email/phone, charter URL, channels và operating scope.
  `code`, `name`, `field`, `state`, `sourceApplicationId` và `institutionalFields` là read-only.
- Ban/bộ phận có tên duy nhất trong một Club, mô tả, thứ tự và trạng thái active. Tạo/sửa/xoá
  mềm đều ghi audit.
- Không cho ngừng dùng một ban/bộ phận nếu còn `clubPositions.unit` đang active hoặc membership
  hiện hành tham chiếu tới nó.
- Cung cấp template khởi đầu cho Club chưa có đơn vị; áp dụng template là idempotent và không
  ghi đè đơn vị người dùng đã tạo.
- UC09 không đổi Club sang `Active`; chỉ UC11 được làm việc đó.
- UI Club có profile editor và structure editor, URL mở trực tiếp, responsive, light/dark,
  i18n `en`/`vi`, loading/error/empty/success.

## Tiêu chí nghiệm thu
- [x] Actor khác Club hoặc thiếu `club.profile.manage` nhận 403.
- [x] Không API nào cho phép sửa trường thuộc thẩm quyền ICPDP hoặc trạng thái Club.
- [x] Profile update và mọi thay đổi department tạo audit trong cùng transaction.
- [x] Tên department không trùng trong Club; department đang được dùng không thể ngừng hoạt động.
- [x] Template áp dụng idempotent và không ghi đè cấu trúc hiện có.
- [ ] UI profile/structure hoạt động trên desktop/mobile, `en`/`vi`, light/dark — build đã xanh;
  còn nghiệm thu trực quan thủ công.

## Ngoài phạm vi
Định nghĩa role/permission (UC23), đề cử ban chủ nhiệm (UC10), xác nhận và kích hoạt Club (UC11),
thay đổi hoặc xuất lại sơ đồ.

## Changelog
- v0.2.0 (2026-10-08) — hoàn tất schema, backend, API, UI và automated tests; còn visual QA.
- v0.1.0 (2026-10-08) — phân tích UC09 và ghi nhận khoảng trống `clubDepartments`.

### Điều chỉnh UX và quyền đọc thiết lập

Thành viên Active/Inactive được xem thiết lập; mutation vẫn cần club.profile.manage, có test quyền đọc/ghi.
