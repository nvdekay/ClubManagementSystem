# Code lệch so với diagram đã duyệt

Đối chiếu ngày 02/11/2026, commit `2f6f5dd`; cập nhật sau khi sửa ngày 07/11/2026. Nguồn chuẩn là **use case diagram**
(`../03-diagrams/UCMS_UseCase_ByActor.drawio`) và **context diagram**
(`../03-diagrams/UCMS_Context_Diagram.drawio`, 46 luồng) đã được duyệt, cùng `../SRS.md`.
Chỗ nào code khác diagram thì **code sai** và phải sửa code, không sửa yêu cầu.

Mỗi khoảng trống dưới đây là một tính năng mới: trước khi code, lập
`.sdd/specs/feat-{name}/SPEC.md` + `TASKS.md` theo `.rules/README.md`.

## Lệch so với diagram

Code đã khớp use case diagram và context diagram ở G1–G5 (07/11/2026, xem mục *Đã khớp*), kể cả các lỗi
review sau đó (gộp khiếu nại trùng theo đúng sự việc, một bộ rule `Active` bằng index unique, kiểm tra nhiệm kỳ
khi gán role, migration không đổi dữ liệu nếu không ghi được phiên bản, job quá hạn chống chạy trùng nhiều
instance, mô phỏng dùng dữ liệu lúc quyết định, CLB đính kèm chứng cứ khi trả lời).

## Diagram phụ còn mô tả mô hình cũ (người dùng chọn chưa sửa, 07/11/2026)

Các diagram dưới đây không phải nguồn chuẩn nhưng vẫn vẽ mô hình trước 07/11/2026; ảnh PNG/SVG trong
`../03-diagrams/img/` và báo cáo Google Doc cũng chưa sinh lại:

| Diagram | Còn lệch |
|---|---|
| `UCMS_Organization_and_Flows.drawio` | Ghi "only two club roles", "UC23 withdrawn", Club Member không có permission quản lý; chưa có `ICPDP_HEAD` và duyệt cấp 1 → cấp 2 |
| `UCMS_Screen_Flow.drawio` | Còn "Student feedback" / "Student feedback inbox"; thiếu Vai trò & phân quyền, Khiếu nại (CLB, ICPDP), Định tuyến phê duyệt |
| `UCMS_Database_Schema.drawio`, `UCMS_ERD.drawio` | Thiếu `routingRuleSets`, `approvalTasks.routingRuleSetId/routingRuleId/requiredLevel/currentLevel`, `approvalDecisions.level`; complaint còn là góp ý một chiều, chưa liên kết `Violation` |
| `UCMS_Sequence_Diagrams.drawio` | Chưa có luồng duyệt hai cấp với `ICPDP_HEAD` |
| `UCMS_Security_Architecture.drawio` | Chưa có audit `ACCESS_DENIED` (SEC-08) |
| `../06-user-guide/GUIDE_BOOK.pdf`, ảnh chương 4 và 19 | Chưa xuất lại / chụp lại (Markdown và HTML đã cập nhật) |

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
