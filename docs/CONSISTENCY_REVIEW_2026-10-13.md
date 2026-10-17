# Review tính đồng nhất DOCX, diagram và code — 13/10/2026

**Kết luận: chưa đồng nhất, chưa đủ cơ sở xác nhận bộ tài liệu bàn giao khớp hệ thống.**
Review thực hiện trên working tree hiện tại, gồm cả các thay đổi chưa commit của I66 / ADR-007.
Không sửa code, DOCX, diagram hoặc các yêu cầu trong lượt review này.

Đã đọc nội dung XML của hai DOCX, các trang trong nguồn draw.io, SRS, tài liệu Use Case,
DBML, thiết kế mức cao và các đường xử lý tương ứng trong backend/frontend. Ảnh nhúng DOCX
được đối chiếu với PNG bằng nội dung pixel; một số hình có sai khác được mở để kiểm tra trực tiếp.
Đây là review tài liệu và source, chưa phải nghiệm thu toàn bộ 55 UC trên ứng dụng chạy thật.

## Phát hiện cần xử lý

### R01 · P1 · Report và các sơ đồ luồng vẫn dùng mô hình cấp quyền qua role đã bỏ

- **Report:** `Group1_SE1939-NJ_Report_Final_v2.docx`, §III.2.1 Actors (Club Member / Club Leader),
  bảng UC23, BR47 / BR54 / BR55 và §VI.3.4. Nội dung vẫn cho Club Leader cấu hình permission
  của role, thành viên lấy hợp các permission, chỉ giữ riêng bốn permission cho Leader.
- **Ảnh report:** Figure III.3.4 vẫn là `Club Member — Club & recruitment`, có các khung
  `club.profile.manage`, `club.recruitment.manage`, `club.application.review`.
  Các Figure III.3.1–III.3.9 không trùng pixel với bộ chín PNG hiện hành.
- **Diagram:** [Context v2.1](03-diagrams/UCMS_Context_Diagram.drawio), luồng f8–f13 / f43
  vẫn gửi hồ sơ, đề xuất, báo cáo, khoản chi, booking, trả lời khiếu nại và lời mời từ Club Member;
  f33 còn là `Club roles & permissions`. [Swimlane](03-diagrams/UCMS_Swimlane_Flows.drawio),
  các trang Recruitment / Event Proposal / Finance / Facility / Complaint / Report và trang 14
  vẫn dùng `Club Member (Assigned Role)` hoặc cho chọn permission của role.
- **Code hiện hành:** [access.ts](../server/src/domain/access.ts#L4) có hai quyền mặc định
  cho thành viên `Active` và 14 quyền riêng của Leader; resolver bỏ qua `permissionCodes`
  của role thường. [club-role-routes.ts](../server/src/interface/http/club-role-routes.ts#L29)
  dùng body strict và không nhận `permissionCodes`.
- **Nguồn đã chốt:** [ADR-007](../.sdd/rfcs/ADR-007-club-leader-only-permissions.md),
  [BR54 / BR55](SRS.md#L2533). Các ghi chú DBML về `clubPositions.permissionCodes`
  và `clubPositionAssignments` vẫn còn cách tính quyền cũ
  ([DBML](05-implementation/UCMS_Database_Design.dbml#L477)); một số SPEC chỉ thêm ghi chú I66
  ở đầu nhưng giữ nội dung cũ trong thân, ví dụ [SPEC auth](../.sdd/specs/feat-auth-access/SPEC.md#L16).

**Hệ quả:** actor và thẩm quyền mô tả trong bộ bàn giao khác với quyền API thực sự chấp nhận.
Đồng bộ nội dung, sơ đồ và ảnh report theo ADR-007; sửa các đoạn còn sót trong SPEC/DBML.

### R02 · P1 · Luồng thành lập CLB có hai kết quả khác nhau sau khi duyệt

- **SRS:** [FR-UC08-06](SRS.md#L1014) tạo CLB `Pending Setup`, cấp quyền founder tạm;
  UC10 / UC11 xác nhận ban đầu để chuyển `Active`.
- **Report:** UC08, UC09–UC11 và luồng F1 vẫn mô tả chuỗi này.
- **State / Organization:** trang Club trong [State Diagrams](03-diagrams/UCMS_State_Diagrams.drawio)
  vẽ UC08 → `Pending Setup`, UC11 → `Active`; Main business flows vẫn yêu cầu cấu hình và đề cử sau duyệt.
- **Code:** [mongo-club-application-review-repository.ts](../server/src/infra/db/mongo-club-application-review-repository.ts#L170)
  duyệt luôn ban sáng lập, tạo CLB `Active`, nhiệm kỳ và assignment đã xác nhận trong cùng transaction.
- **Quyết định đã được duyệt:** [SPEC simplified founding](../.sdd/specs/feat-simplified-club-founding/SPEC.md#L34)
  ghi rõ `Active` ngay, không có vòng UC10 riêng cho lần khởi lập. Swimlane trang 01 cũng đã theo luồng này.

**Hệ quả:** chạy đúng code vẫn không đạt FR-UC08-06 và các bước khởi lập của baseline hiện tại.
Cần đưa quyết định đã duyệt vào SRS, đặc tả, state diagram, luồng F1 và report;
phân biệt luồng khởi lập với UC10 / UC11 dùng cho lần thay ban sau đó.

### R03 · P1 · UC36 / UC37 có màn hình và diagram nhưng chưa có API ở server chính

[main.ts](../server/src/main.ts#L95) truyền `budgetDisbursementRepo` và `postEventReportRepo`
nhưng không truyền `eventFinanceRepo`. [server.ts](../server/src/interface/http/server.ts#L249)
chỉ gắn `eventFinanceRoutes` khi dependency này tồn tại. Menu vẫn cho Leader vào khoản chi
([WorkspaceShell.tsx](../client/src/components/layout/WorkspaceShell.tsx#L325)).

**Hệ quả:** request tới API khoản chi / quyết toán / đối soát nhận 404 khi khởi động từ `main.ts`,
dù UC36 / UC37 xuất hiện trong DOCX và Use Case diagram.
Đây là thiếu phần triển khai đã được ghi nhận trong
[bàn giao Wave 4](05-implementation/WAVE_4_REPORTS_FINANCE.md#L18), chưa được khắc phục.
Cần xử lý các quyết định BR25 / BR58 còn mở và nối repository trước khi nghiệm thu;
trong bộ bàn giao phải ghi rõ trạng thái chưa hoàn tất.

### R04 · P2 · UC05 và duyệt hai cấp vẫn xuất hiện như tính năng hiện hành

[SRS UC05](SRS.md#L923) và [D1](SRS.md#L3460) đã rút UC05, `ICPDP_HEAD` và duyệt đa cấp.
[SYSTEM_ROLE_CODES](../server/src/domain/account-admin.ts#L3) chỉ còn `ICPDP_OFFICER` và
`ATTENDANCE_UNLOCK`.

Tuy nhiên, Use Case diagram hiện hành và cả `UCMS_UseCase_ByActor.docx` vẫn có
`Configure approval routing` ở trang ICPDP 1. Organization diagram vẫn có `ICPDP Head`,
role `ICPDP_HEAD`, cấp duyệt thứ hai. Report §III.1.1, bảng UC05, BR16 và hướng dẫn cấu hình
cũng giữ cơ chế này. Chính SRS còn mâu thuẫn ở [actor ICPDP](SRS.md#L310), [F4](SRS.md#L492),
tiền điều kiện UC53 và phụ lục endpoint `/approval-routing`.

**Hệ quả:** tài liệu yêu cầu một chức năng đã rút và không có route tương ứng trong code.
Bỏ nhánh hiện hành khỏi diagram/report và sửa các tham chiếu còn sót; giữ dấu vết lịch sử ở UC05.

### R05 · P2 · ERD không còn phản ánh danh mục collection trong DBML/code

Đối chiếu danh mục bảng:

| Nguồn | Số collection nghiệp vụ | Sai khác |
|---|---:|---|
| DBML hiện tại | 51 | Có `clubFields`, `clubDepartments`, `eventInvitations` |
| `ucms-schema.generated.ts` | 51 | Tên bảng khớp DBML |
| `UCMS_ERD.drawio` | 50 | Thiếu ba collection trên; còn `routingRuleSets`, `routingRules` |
| Report §IV.2 | Ghi 50 | Vẫn mô tả RoutingRuleSet / RoutingRule |
| README triển khai | Ghi 49 | Chưa cập nhật số lượng |

**Hệ quả:** ERD của bộ bàn giao có các collection không còn trong schema và bỏ các collection đang dùng.
Sinh lại ERD từ [DBML](05-implementation/UCMS_Database_Design.dbml), cập nhật bảng thiết kế DB
trong report và [README](05-implementation/README.md#L19).
Số 51 chỉ tính bảng nghiệp vụ; `authSessions` là collection vận hành riêng.

### R06 · P2 · Nguồn state diagram UC58 đã sửa nhưng PNG và ảnh report vẫn cũ

Trang Property Booking trong nguồn draw.io đã có UC58 tạo occurrence `Approved` trực tiếp
và thu hồi sang `Released`. Tuy nhiên
[PNG Property Booking](03-diagrams/img/UCMS_State_Diagrams_08_Property-Booking.png)
vẫn ghi `UC45 ROOM reserve / UC46 room overbooking`, không có luồng UC58.

Ảnh nhúng Figure III.20 trong report trùng pixel với PNG cũ này, dù caption đã nói UC58.
[README diagram](03-diagrams/README.md#L63) cũng ghi rõ PNG chưa xuất lại.

**Hệ quả:** hình và caption trong cùng report mô tả hai cơ chế cấp phòng khác nhau.
Xuất lại PNG từ nguồn draw.io và thay ảnh Figure III.20 trong DOCX.

### R07 · P2 · Use Case diagram thiếu UC53; số UC công bố chưa thống nhất

[UC53 trong SRS](SRS.md#L2381) yêu cầu ICPDP tạo sự kiện cấp trường và mời CLB.
Code đã có [school-event-routes.ts](../server/src/interface/http/school-event-routes.ts#L79),
được nối ở `main.ts` / `server.ts`, và có màn `/workspace/school-events`.
Trang ICPDP hiện hành không có nhóm tạo/quản lý sự kiện cấp trường hoặc mời CLB;
chỉ phía Leader có `Respond to event invitation` (UC54).

[README diagram](03-diagrams/README.md#L10) nói phủ UC01–UC55 và UC58;
[Use Case model](02-use-cases/UCMS_UseCase_Model_v2.md#L11) và bảng report nói 53;
[bảng thuyết trình](UC_Diagram_Presentation.md#L719) vẫn đếm UC05, đặt UC54 ngoài 53 và bỏ UC55 khỏi bảng tổng.
Theo danh mục SRS: UC01–UC55 cộng UC58, trừ UC05 đã rút, là **55 UC còn hiệu lực**.

**Hệ quả:** không thể dùng bảng tổng hiện tại để chứng minh diagram phủ baseline.
Bổ sung UC53, bỏ UC05 và lập lại một bảng truy vết cho 55 UC hiệu lực.

### R08 · P2 · UC04 trong DOCX/SRS vẫn cho sửa domain đăng nhập và danh mục tài liệu

[Danh sách UC04](SRS.md#L901), FR-UC01-03 và hướng dẫn report vẫn lấy domain từ policy UC04;
cũng yêu cầu danh mục tài liệu bắt buộc có thể cấu hình.
[SPEC simplified founding](../.sdd/specs/feat-simplified-club-founding/SPEC.md#L44)
đã chốt bỏ hai field này khỏi policy: domain lấy từ cấu hình server, hồ sơ dùng PROPOSAL / LOGO
và các cờ `formRequirements`.

Code [mongoAuthRepository](../server/src/infra/db/mongo-auth-repository.ts#L17) lấy domain từ
`ALLOWED_DOMAIN`; [PolicySettings](../server/src/domain/policy.ts#L40) không có
`allowedEmailDomains` / `mandatoryApplicationDocuments`.

**Hệ quả:** officer không thực hiện được thao tác cấu hình mà SRS/report hướng dẫn.
Cập nhật UC01 / UC04 / UC07, BR02 / BR32 / BR42 và phần hướng dẫn theo quyết định đã duyệt;
sửa cả các SPEC còn nhắc `PolicyVersion.allowedEmailDomains`.

### R09 · P2 · Thành viên Inactive được UC24 cho vào nhưng bị chặn ở workspace

[FR-UC24-08](SRS.md#L1479) và actor Club Member trong report cho membership `Inactive`
vào không gian thành viên và có liên kết UC22. Usecase `getMemberSpace` chấp nhận trạng thái này.
Nhưng [mongo-auth-repository.ts](../server/src/infra/db/mongo-auth-repository.ts#L89)
chỉ đưa membership `Active` vào danh sách CLB; [currentUser](../server/src/usecase/auth.ts#L75)
tiếp tục loại snapshot không Active. [WorkspaceShell](../client/src/components/layout/WorkspaceShell.tsx#L228)
không render trang nếu không tìm được workspace.

**Hệ quả:** thành viên Inactive không dùng được UC24 qua giao diện dù endpoint nghiệp vụ cho phép.
Cho Inactive có workspace để dùng UC24 / UC22, giữ các quyền quản trị, điểm danh và xem phòng
theo đúng điều kiện Active của BR54. Không cần cấp thêm permission vận hành.

### R10 · P2 · Thông báo mới được ghi vào DB; chưa có phần gửi/đọc đúng như diagram

Context diagram, report và [NTF-01…04](SRS.md#L2925), [SCH-10](SRS.md#L2997)
mô tả email qua Google SMTP, retry và `EmailDeliveryLog`, thông báo in-app đọc từ mọi workspace.
Source hiện tại có các thao tác enqueue notification `Queued`; ví dụ
[queueNotifications](../server/src/infra/db/club-board.ts#L21) chỉ ghi kênh `IN_APP`.

Không tìm thấy SMTP adapter, worker rút outbox, phần ghi `emailDeliveryLogs`, route/hook/UI đọc
notification trong `server/src` / `client/src`; các job được nối ở `main.ts` chỉ xử lý nhắc hạn
và vòng đời, chưa thực hiện delivery.

**Hệ quả:** việc có notification document chưa chứng minh người dùng nhận được email/thông báo.
Ghi rõ phần chưa triển khai và hoàn thiện delivery cùng UI trước khi nghiệm thu M10.

### R11 · P2 · Báo cáo đã nộp rồi bị trả sửa vẫn có thể bị ghi là hoàn toàn chưa nộp

[FR-UC34-04](SRS.md#L1788) chỉ cho ghi nhận việc **hoàn toàn không nộp báo cáo**.
[mongo-post-event-report-repository.ts](../server/src/infra/db/mongo-post-event-report-repository.ts#L212)
tính overdue theo state của version mới nhất. Sau deadline, `Returned for correction`
không nằm trong Submitted / Accepted nên overdue trở thành true; action `overdue` ở dòng 364
không kiểm tra đã từng có version nộp trước đó.

**Hệ quả:** một hồ sơ đã nộp có thể nhận audit `REPORT_OVERDUE` của nhánh không nộp,
ảnh hưởng đánh giá và cưỡng chế nghĩa vụ. Điều kiện lỗi của W4-03 trong
[review 11/10](05-implementation/WAVE_4_REVIEW_2026-10-11.md) vẫn còn trong source.
Cần phân biệt chưa từng nộp với chậm bổ sung và kiểm tra lịch sử nộp trong transaction.
Lượt này xác nhận bằng source; chưa tái hiện MongoDB do giới hạn môi trường bên dưới.

### R12 · P2 · Nhánh đối soát quá hạn A2 vẫn dùng công thức quyết toán thông thường

[FR-UC37-10](SRS.md#L1884) và state diagram đưa A2 về `Recovery Pending`.
[mongo-event-finance-repository.ts](../server/src/infra/db/mongo-event-finance-repository.ts#L394)
kiểm tra điều kiện overdue rồi gọi cùng `reconcileExpenses`; hàm domain chọn trạng thái
theo `acceptedTotal - advanceTotal` ([event-finance.ts](../server/src/domain/event-finance.ts#L198)).
Nếu chi được chấp nhận lớn hơn tạm ứng, hàm trả `Reconciled` và số cấp bù dương.

**Hệ quả:** vẫn còn điều kiện sai khác W4-02 đã ghi nhận ngày 11/10. Cần chốt quy tắc A2
cho trường hợp chi vượt tạm ứng trước khi bật API; chưa tự chọn công thức mới.
Đây là đối chiếu source hiện tại với SRS/state và kết quả review cũ, chưa phải tái hiện runtime mới.

### R13 · P2 · Thiết kế mức cao mô tả một kiến trúc chưa khớp implementation

[High Level Design](04-design/UCMS_High_Level_Design.md) còn ghi:

- §4: mỗi workflow / notification / audit có một domain port dùng chung, audit nằm trong usecase;
  thực tế các repository nhận actor và ghi audit/task/notification trong transaction, không có
  `AuditPort` hay `approval.open` dùng chung như mô tả.
- §6: không dùng transaction đa document trong MVP; nhiều repository hiện dùng
  `mongoose.connection.transaction`, ví dụ luồng duyệt hồ sơ ở R02.
- §7: response chỉ `{ data }`; [response.ts](../server/src/interface/http/response.ts#L3)
  trả `statusCode`, `message`, `data`, `timestamp` theo quy tắc repo.
- §11: evaluation scheme dành cho v2; source hiện tại đã có domain, repository, route và UI scheme.

**Hệ quả:** người đọc thiết kế không xác định được kiến trúc nào đang chạy.
Tài liệu tự ghi là bản đề xuất ở cuối; cần phân biệt đề xuất lịch sử với thiết kế hiện hành
và cập nhật mô tả dùng trong report.

## Các phần đã khớp trong phạm vi kiểm tra

- `UCMS_UseCase_ByActor.docx` có đúng chín ảnh, nội dung pixel khớp cả chín PNG hiện hành.
  Mô hình quyền phía CLB trên bộ này khớp ADR-007: các thao tác vận hành của Leader,
  điểm danh / xem phòng cho thành viên. Vẫn cần sửa UC05 và bổ sung UC53 như R04 / R07.
- Resolver backend, API sửa role strict và UI role hiện tại cùng áp dụng role là chức danh;
  API không nhận `permissionCodes` trong body sửa role.
- UC58 trong nguồn state diagram, SRS §6.8 và source room allocation cùng dùng cấp phòng trực tiếp
  `Approved`, thu hồi buổi chưa bắt đầu sang `Released`. Lệch ở bản PNG/report, không phải nguồn draw.io này.
- Danh mục 51 bảng của DBML và `ucms-schema.generated.ts` trùng nhau. So sánh này kiểm tra
  tên bảng, không thay cho việc nghiệm thu từng field/index với database thật.

## Kiểm chứng và giới hạn

| Kiểm tra | Kết quả |
|---|---|
| Constitution | Qua |
| Lint server/client | Qua |
| Typecheck server/client | Qua |
| Vitest | 317 test qua trong 53 file; 121 test không chạy |
| `npm run check` tổng thể | **Thất bại**: 38 file integration lỗi setup/hook timeout; MongoDB `127.0.0.1:27017` từ chối kết nối |
| OAuth / SMTP / thao tác UI với DB thật | Chưa kiểm chứng trong lượt này |

Không dùng kết quả test fixture để kết luận API tài chính đã hoạt động ở `main.ts`.
R11 / R12 chưa được tái hiện runtime mới. Log lần kiểm tra nằm tại
`/tmp/ucms-consistency-review/check.log` trên máy thực hiện review.

## Thứ tự đồng bộ đề nghị

1. Đồng bộ SRS và đặc tả theo các quyết định đã duyệt: I66 / ADR-007, simplified founding,
   policy mới và việc rút UC05. Làm sạch cả các đoạn còn sót trong SPEC.
2. Sửa context, organization, swimlane, state Club, Use Case coverage và ERD;
   xuất lại PNG liên quan.
3. Cập nhật toàn bộ report DOCX: actor, UC, BR, workflow, bảng schema, ảnh, caption và hướng dẫn.
   Giữ `UCMS_UseCase_ByActor.docx` lấy ảnh từ cùng bộ PNG vừa xuất.
4. Xử lý các khoảng trống/lỗi code R03, R09–R12 theo quy tắc nghiệp vụ đã chốt;
   ghi trạng thái chưa hoàn tất nếu còn quyết định mở.
5. Chạy lại integration với MongoDB và demo các luồng thành lập, phân phòng,
   role/member, báo cáo, khoản chi và đối soát trước khi chốt tính đồng nhất.
