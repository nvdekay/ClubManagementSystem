# Code lệch so với diagram đã duyệt

Đối chiếu `main` ngày 07/11/2026; mục *Diagram phụ* cập nhật 14/11/2026. Nguồn chuẩn là `../SRS.md`, context diagram và diagram mới nhất
cho từng quyết định. Riêng role CLB, `UCMS_Organization_and_Flows.drawio` (02/11) mới hơn
`UCMS_UseCase_ByActor.drawio` (19/10), nên quyết định hai role cố định/UC23 bị rút được ưu tiên.

Trước khi sửa code cho một khoảng trống, cập nhật SPEC/TASKS tương ứng theo `.rules/README.md`.

## Lệch so với diagram

Code đã khớp G1–G5 (07/11/2026, xem mục *Đã khớp*), kể cả các lỗi review sau đó (khiếu nại trùng
do ICPDP gộp tay, không đoán lúc nộp, một bộ rule `Active` bằng index unique, job quá hạn chống chạy
trùng nhiều instance, mô phỏng dùng dữ liệu lúc quyết định, CLB đính kèm chứng cứ khi trả lời) và lần review thứ hai
(khiếu nại đi theo không có task, không vào hàng đợi, mọi bước xử lý trực tiếp bị từ chối, rút khiếu nại gốc thì
khiếu nại đi theo cũ nhất làm gốc; kích hoạt rule đồng
thời trả đúng một 409).

**G1 đóng lại ngày 07/11/2026:** `UCMS_Organization_and_Flows.drawio` (02/11) mới hơn use case diagram có
CRUD role (19/10) và ghi rõ chỉ hai role cố định, UC23 bị rút. Code UC23 (API, trang, menu, resolver
permission theo role, migration `club-role-upgrade`) đã gỡ; quyền CLB quay về hai role cố định của BR47/BR54/BR55.

## Diagram phụ (cập nhật 14/11/2026)

Ngày 07/11/2026 người dùng chọn để nguyên các diagram phụ còn vẽ mô hình cũ. Hai commit ngày 13/11/2026
(`c514f63` cho buổi bảo vệ đề xuất BR63, `022b47c` đồng bộ với code) đã sửa và xuất lại PNG/SVG trong
`../03-diagrams/img/`, nên các lệch ghi ở đây ngày 07/11 đã đóng:

| Diagram | Trạng thái 14/11/2026 |
|---|---|
| `UCMS_Organization_and_Flows.drawio` | Khớp: hai role cố định, UC23 rút, có `ICPDP Head` (system role `ICPDP_HEAD`, chỉ cấu hình rule UC05); duyệt một cấp |
| `UCMS_UseCase_ByActor.drawio` | Khớp: nhóm `Manage club roles` / CRUD role của UC23 đã bỏ (13/11/2026) |
| `UCMS_Screen_Flow.drawio` | Khớp: đã thay góp ý cũ bằng `Complaints` (sinh viên, CLB, ICPDP), có `Approval routing` và `Event defense room` |
| `UCMS_Database_Schema.drawio`, `UCMS_ERD.drawio` | Khớp DBML 54 bảng: có `routingRuleSets`, `eventDefenseSessions`, khiếu nại liên kết `Violation`. `requiredLevel`/`currentLevel`/`level` vẫn vẽ vì còn trong DBML cho dữ liệu cũ, không còn dùng từ 09/11/2026 |
| `UCMS_Sequence_Diagrams.drawio` | Khớp: duyệt một cấp; hình 06 thêm trang buổi bảo vệ (BR63) |
| `UCMS_Security_Architecture.drawio` | Khớp: có audit `ACCESS_DENIED` (SEC-08) |
| `../06-user-guide/` | Markdown đã cập nhật (07/11 và 14/11/2026); ảnh chụp từ 13/10/2026, trước đợt làm lại giao diện 11/2026; `GUIDE_BOOK.pdf`/`GUIDE_BOOK.html` chưa dựng lại sau các thay đổi đó |

Báo cáo final là báo cáo Google Doc của nhóm (13–14/11/2026); các bản `.docx` cũ trong repo đã xoá.

G2 (quyền mặc định của thành viên): mọi membership `Active` tự có `club.attendance.manage` và
`club.room.view`, không cần bản gán (BR54).

## Lệch so với SRS

Không còn lệch: G1 (UC23 động) đã gỡ, S3 đã khớp; S1 và S2 là kết luận sai (xem dưới).

### Kết luận sai đã loại bỏ (07/11/2026)

- **S1 không phải lệch.** SRS cập nhật 02/11/2026 quy định domain đăng nhập lấy từ biến môi trường
  `ALLOWED_DOMAIN`, không thuộc UC04. Code đúng.
- **S2 không phải lệch.** SRS hiện hành quy định UC48/UC49 chấm một điểm tổng 1–5
  (`FEEDBACK_CRITERION = "overall"`) kèm nhận xét. Code đúng.

## Đã khớp

- **G1 (07/11/2026)** — UC23 đã rút theo SRS hiện hành: không còn API `/clubs/:clubId/roles*` /
  `role-directory`, trang `/club/:clubId/roles`, menu "Vai trò & phân quyền", resolver permission theo role hay
  migration `club-role-upgrade`. Danh mục còn 15 permission (bỏ `club.role.manage`); Club Leader có toàn bộ,
  Club Member có hai quyền mặc định, chức danh khác không cấp quyền (BR47, BR54, BR55).
- **G2 (07/11/2026)** — UC30, UC32, UC58: mọi thành viên `Active` có `club.attendance.manage` và
  `club.room.view` mặc định (`DEFAULT_MEMBER_PERMISSIONS` trong `server/src/domain/access.ts`);
  xem phòng được phân dùng `club.room.view` thay cho `club.booking.manage`, tạo booking UC45 vẫn cần
  `club.booking.manage`. SPEC: `.sdd/specs/feat-member-default-permissions/`.
- **G3 (07/11/2026)** — UC50–UC52: khiếu nại luôn tới ICPDP (BR38) kèm task; ICPDP mở xem xét và quyết định
  Dismissed / Forwarded / Escalated có lý do (BR39); CLB (`club.complaint.respond`) chỉ thấy khiếu nại đã
  `Forwarded`, không có danh tính người khiếu nại (D5), trả lời một lần; ICPDP đóng hoặc leo thang; leo thang
  mở hồ sơ UC40 liên kết hai chiều trong cùng transaction; quá hạn trả lời có tín hiệu tuân thủ (job). SPEC:
  `.sdd/specs/feat-complaint-workflow/`.
- **G4 (07/11/2026)** — UC05: bộ rule định tuyến đánh phiên bản (`routingRuleSets`), từ chối rule chồng
  nhau, mô phỏng chỉ đọc; `ICPDP_HEAD` là system role cấp kèm `ICPDP_OFFICER` (D1); UC08, UC26, UC46 khớp
  rule cần cấp 2 — cấp 1 duyệt không tạo tác dụng phụ cuối, Head nhận và quyết định cấp 2, người duyệt cấp 1
  không quyết định cấp 2. SPEC: `.sdd/specs/feat-approval-routing/`. **Sửa 09/11/2026:** người dùng bỏ cấp
  duyệt thứ hai; rule chỉ đặt SLA, mọi hồ sơ UC08/UC26/UC46 do một ICPDP Officer quyết định, `ICPDP_HEAD` chỉ
  cấu hình rule.
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
3. ~~**G1**~~ — UC23 động đã gỡ 07/11/2026, quyền quay về hai role cố định.
4. ~~**G3**~~ — đã xong 07/11/2026.
5. ~~**G4**~~ — đã xong 07/11/2026.
6. ~~**G5**~~ — đã xong 07/11/2026.
