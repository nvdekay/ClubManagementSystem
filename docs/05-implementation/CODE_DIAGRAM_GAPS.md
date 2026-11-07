# Code lệch so với diagram đã duyệt

Đối chiếu ngày 02/11/2026, commit `2f6f5dd`; cập nhật sau khi sửa ngày 07/11/2026. Nguồn chuẩn là **use case diagram**
(`../03-diagrams/UCMS_UseCase_ByActor.drawio`) và **context diagram**
(`../03-diagrams/UCMS_Context_Diagram.drawio`, 46 luồng) đã được duyệt, cùng `../SRS.md`.
Chỗ nào code khác diagram thì **code sai** và phải sửa code, không sửa yêu cầu.

Mỗi khoảng trống dưới đây là một tính năng mới: trước khi code, lập
`.sdd/specs/feat-{name}/SPEC.md` + `TASKS.md` theo `.rules/README.md`.

## Lệch so với diagram

Không còn khoảng lệch nào (07/11/2026): G1–G5 đã khớp, xem mục *Đã khớp*.

G2 (quyền mặc định của thành viên) **không** đi qua role của UC23: mọi membership `Active` tự có
`club.attendance.manage` và `club.room.view`, không cần bản gán (BR54, BR47 c).

## Lệch so với SRS (không thể hiện trên diagram)

Không còn khoảng lệch nào ngoài diagram: S3 đã khớp, S1 và S2 là kết luận sai (xem dưới).

### Kết luận sai đã loại bỏ (07/11/2026)

- **S1 không phải lệch.** SRS cập nhật 02/11/2026 quy định domain đăng nhập lấy từ biến môi trường
  `ALLOWED_DOMAIN`, không thuộc UC04. Code đúng.
- **S2 không phải lệch.** SRS hiện hành quy định UC48/UC49 chấm một điểm tổng 1–5
  (`FEEDBACK_CRITERION = "overall"`) kèm nhận xét. Code đúng.

## Đã khớp

- **G2 (07/11/2026)** — UC30, UC32, UC58: mọi thành viên `Active` có `club.attendance.manage` và
  `club.room.view` mặc định (`DEFAULT_MEMBER_PERMISSIONS` trong `server/src/domain/access.ts`);
  xem phòng được phân dùng `club.room.view` thay cho `club.booking.manage`, tạo booking UC45 vẫn cần
  `club.booking.manage`. SPEC: `.sdd/specs/feat-member-default-permissions/`.
- **G1 (07/11/2026)** — UC23: Club Leader tạo/sửa/ngừng role, chọn permission (bốn quyền giữ riêng
  không cấp được), gán/thu hồi người giữ; mỗi thay đổi là một phiên bản cơ cấu `ROLE_EDIT`, có audit
  và thông báo. Resolver theo BR47: chỉ ghế Chủ nhiệm / Phó chủ nhiệm đã xác nhận là Club Leader;
  ghế ban điều hành khác và role thường nhận permission của chính role. Dữ liệu cũ được chuẩn hoá
  bởi `server/src/infra/db/club-role-upgrade.ts`. SPEC: `.sdd/specs/feat-club-role-management/`.
- **G3 (07/11/2026)** — UC50–UC52: khiếu nại luôn tới ICPDP (BR38) kèm task; ICPDP mở xem xét và quyết định
  Dismissed / Forwarded / Escalated có lý do (BR39); CLB (`club.complaint.respond`) chỉ thấy khiếu nại đã
  `Forwarded`, không có danh tính người khiếu nại (D5), trả lời một lần; ICPDP đóng hoặc leo thang; leo thang
  mở hồ sơ UC40 liên kết hai chiều trong cùng transaction; quá hạn trả lời có tín hiệu tuân thủ (job). SPEC:
  `.sdd/specs/feat-complaint-workflow/`.
- **G4 (07/11/2026)** — UC05: bộ rule định tuyến đánh phiên bản (`routingRuleSets`), từ chối rule chồng
  nhau, mô phỏng chỉ đọc; `ICPDP_HEAD` là system role cấp kèm `ICPDP_OFFICER` (D1); UC08, UC26, UC46 khớp
  rule cần cấp 2 — cấp 1 duyệt không tạo tác dụng phụ cuối, Head nhận và quyết định cấp 2, người duyệt cấp 1
  không quyết định cấp 2. SPEC: `.sdd/specs/feat-approval-routing/`.
- **G5 (07/11/2026)** — Context: email đi ra Google SMTP qua `smtpMailTransport` (`nodemailer`) khi đủ cấu
  hình; production bắt buộc SMTP và dừng khởi động nếu thiếu; outbox, lease, retry giữ nguyên. Credential
  SMTP do người vận hành điền vào `.env`. SPEC: `.sdd/specs/feat-google-smtp/`.
- **S3 (07/11/2026)** — SEC-08 / AC17: mỗi lần người dùng đã đăng nhập bị 403 vì thiếu quyền ghi đúng
  một dòng `auditLogs` `ACCESS_DENIED` qua `accessDenialAuditor` trong
  `server/src/interface/http/middleware.ts`. SPEC: `.sdd/specs/feat-forbidden-access-audit/`.

- UC08 duyệt hồ sơ tạo CLB ở `Active` cùng nhiệm kỳ sáng lập và ghế ban chủ nhiệm (state diagram
  *Club*, main workflow 1). Code còn giữ quy tắc tương thích cho CLB cũ đang `Pending Setup`
  (`server/src/domain/access.ts`), không CLB mới nào vào trạng thái này.

## Thứ tự đề xuất

1. ~~**G2**~~ — đã xong 07/11/2026.
2. ~~**S3**~~ — đã xong 07/11/2026.
3. ~~**G1**~~ — đã xong 07/11/2026.
4. ~~**G3**~~ — đã xong 07/11/2026.
5. ~~**G4**~~ — đã xong 07/11/2026.
6. ~~**G5**~~ — đã xong 07/11/2026.
