# Prompt cho Claude — sửa đầy đủ các khoảng lệch code so với diagram và SRS

Bạn đang làm việc trong repository UCMS tại thư mục gốc hiện tại. Mục tiêu của phiên làm việc này
là **sửa đầy đủ những khoảng lệch thật sự giữa code hiện tại với use case diagram, context diagram
và SRS đã duyệt**, không sửa yêu cầu để hợp thức hoá code đang có.

Đây là một nhiệm vụ triển khai lớn, xuyên suốt backend, frontend, dữ liệu, test và tài liệu. Hãy làm
theo từng feature hoàn chỉnh, tiếp tục cho tới khi toàn bộ Definition of Done ở cuối prompt đạt.
Không chỉ phân tích hoặc viết kế hoạch rồi dừng. Tuy nhiên, phải dừng đúng lúc để hỏi người dùng ở
những cổng phê duyệt bắt buộc được nêu dưới đây.

---

## 1. Quy tắc bắt buộc phải đọc trước khi hành động

Trước khi sửa bất kỳ file nào:

1. Đọc toàn bộ `.rules/README.md`.
2. Đọc toàn bộ `.rules/architecture.md`, `.rules/backend.md`, `.rules/frontend.md`.
3. Đọc `docs/README.md`, `docs/CURRENT_IMPLEMENTATION.md`, `docs/SRS.md` và
   `docs/05-implementation/README.md`.
4. Đọc kỹ `docs/05-implementation/CODE_DIAGRAM_GAPS.md`, nhưng **không coi mọi dòng trong file đó
   đều đúng**; các correction bắt buộc nằm trong prompt này.
5. Đọc các nguồn chuẩn:
   - `docs/03-diagrams/UCMS_UseCase_ByActor.drawio`;
   - `docs/03-diagrams/UCMS_Context_Diagram.drawio`;
   - các phần UC05, UC23, UC30, UC32, UC50, UC51, UC52, UC58, BR16, BR38, BR39,
     BR47, BR54, BR55, BR56, SEC-08, AC17 và AC19 trong `docs/SRS.md`.
6. Trước khi ghi file vào một thư mục dưới `server/src`, `server/tests`, `client/src` hoặc
   `.sdd/specs`, đọc `README.md` của chính thư mục đó.
7. Kiểm tra `git status --short` và giữ nguyên mọi thay đổi không thuộc nhiệm vụ này. Không reset,
   checkout hoặc ghi đè thay đổi của người dùng.

Nguyên tắc xuyên suốt:

- SRS hiện hành và diagram đã duyệt là nguồn yêu cầu; code phải đổi để khớp.
- Tài liệu viết tiếng Việt; code, comment, tên file/ký hiệu, error message, test và commit viết
  tiếng Anh.
- Tuân thủ clean architecture `interface → usecase → domain ← infra`.
- Không để route hoặc React component chứa logic nghiệp vụ.
- Không dùng `any`, không thêm barrel file, không phá response envelope, OpenAPI hoặc quy tắc i18n.
- Không commit/push nếu người dùng chưa yêu cầu rõ.

---

## 2. Cổng phải hỏi người dùng trước khi triển khai

Theo `.rules/backend.md`, bạn bắt buộc phải hỏi trước khi:

- sửa schema dưới `server/src/infra/db/**` hoặc DBML;
- sửa `.env.example` hay bất kỳ `.env*` nào;
- thêm dependency vào `package.json`;
- xoá file.

Nhiệm vụ này chắc chắn sẽ cần schema change cho UC05/UC23 và cần dependency/config cho SMTP.
Vì vậy, sau khi audit ban đầu, hãy gửi **một yêu cầu phê duyệt gộp** nêu chính xác:

1. Các schema/DBML dự kiến thay đổi cho role, approval routing và multi-level decisions.
2. Dependency SMTP dự kiến thêm (ưu tiên một SMTP client phổ biến như `nodemailer`, nhưng phải
   nêu rõ trước khi thêm).
3. Các key dự kiến thêm vào `.env.example`, ví dụ `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
   `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`.
4. Mọi file cũ dự kiến xoá; ưu tiên repurpose/rename an toàn thay vì xoá nếu chưa được duyệt.

Đồng thời yêu cầu người dùng chốt hai quyết định nghiệp vụ còn mở:

- **D1 / UC05:** khuyến nghị giữ diagram bốn actor và hiện thực `ICPDP_HEAD` như một system role
  thuộc ICPDP Officer; level 2 bắt buộc role này, không thêm actor thứ năm.
- **D5 / UC52:** hỏi CLB có được thấy danh tính người khiếu nại hay không. Khuyến nghị mặc định an
  toàn là không lộ danh tính cho CLB; ICPDP vẫn thấy để xử lý và chống lạm dụng.

Không tự đoán D1 hoặc D5. Trong lúc chờ trả lời, bạn có thể hoàn thành các phần độc lập không cần
hai quyết định đó và không cần mutation chưa được duyệt, nhưng không được hoàn tất UC05/UC52 theo
một giả định chưa được chốt.

---

## 3. Correction bắt buộc đối với `CODE_DIAGRAM_GAPS.md`

Kết quả audit đã xác nhận file gap đúng hướng nhưng có các lỗi sau. Phải dùng correction này khi
triển khai và cập nhật lại tài liệu:

### 3.1 S1 không phải gap

Không thêm domain email vào `PolicySettings`. SRS cập nhật 02/11/2026 quy định domain đăng nhập
đến từ biến môi trường `ALLOWED_DOMAIN`, không thuộc UC04. Code hiện hành ở điểm này là đúng.

### 3.2 S2 không phải gap

Không đổi UC48/UC49 sang feedback nhiều tiêu chí. SRS hiện hành quy định đúng một điểm tổng nguyên
1–5 với `FEEDBACK_CRITERION = "overall"`, kèm nhận xét. Code hiện hành ở điểm này là đúng.

### 3.3 G2 không được cấp qua role UC23

Mọi membership `Active` tự có hai permission mặc định:

- `club.attendance.manage`;
- `club.room.view`.

Hai quyền này không phụ thuộc role assignment. `club.booking.manage` vẫn chỉ dùng cho UC45/UC47
và quản lý booking ngoài `ROOM`; không dùng để xem phòng được phân ở UC58.

### 3.4 Catalogue chuẩn có 16 permission

Code hiện có 14 permission. Catalogue chuẩn phải thêm:

- `club.room.view`;
- `club.role.manage`.

Bốn quyền giữ riêng của Club Leader, không được cấp cho role khác:

- `club.role.manage`;
- `club.board.nominate`;
- `club.transition.plan`;
- `club.suspension.request`.

### 3.5 Không coi mọi `isBoardSeat` là Club Leader

Club Leader là thành viên `Active` giữ đúng ghế Chủ nhiệm hoặc Phó chủ nhiệm đã được xác nhận trong
nhiệm kỳ hiện hành. Role ban điều hành khác chỉ nhận permission của chính role đó. Không giữ logic
hiện tại cấp mọi permission cho bất kỳ position nào có `isBoardSeat = true`.

### 3.6 Hai mâu thuẫn tài liệu phải được làm rõ

- Câu ở SRS §A3 nói Club Leader “không uỷ quyền” mâu thuẫn UC23/BR54; sau khi được xác nhận, sửa
  thành nghĩa “có thể uỷ quyền các permission cấp được qua role, nhưng không thể uỷ quyền bốn
  permission giữ riêng”.
- Phụ lục endpoint UC58 còn ghi `club.booking.manage`; phải đổi sang `club.room.view`.

---

## 4. Tạo SPEC/TASKS trước khi code

Đây là các tính năng mới. Trước khi sửa code, copy `.sdd/specs/_template.md` và tạo đầy đủ:

1. `.sdd/specs/feat-member-default-permissions/SPEC.md` + `TASKS.md`.
2. `.sdd/specs/feat-club-role-management/SPEC.md` + `TASKS.md`.
3. `.sdd/specs/feat-forbidden-access-audit/SPEC.md` + `TASKS.md`.
4. `.sdd/specs/feat-complaint-workflow/SPEC.md` + `TASKS.md`.
5. `.sdd/specs/feat-approval-routing/SPEC.md` + `TASKS.md`.
6. `.sdd/specs/feat-google-smtp/SPEC.md` + `TASKS.md`.

Mỗi SPEC phải truy vết tới FR/BR/SEC/AC tương ứng, có tiêu chí nghiệm thu dạng Given/When/Then,
các trường hợp lỗi, authorization matrix, transaction boundary, notification/audit, migration và
test plan. Cập nhật checkbox trong `TASKS.md` ngay khi hoàn thành từng task, không đợi cuối phiên.

Không gộp cả sáu feature thành một SPEC khổng lồ.

---

## 5. Feature 1 — quyền mặc định của Club Member (G2)

### Mục tiêu

Mọi thành viên `Active` của đúng CLB được quản lý waitlist, hỗ trợ/chốt attendance và xem phòng
được ICPDP phân; thành viên `Inactive`, `Left`, `Banned` hoặc người ngoài CLB không được các quyền
này.

### Thay đổi bắt buộc

1. Trong domain access:
   - thêm `club.room.view` vào `ClubPermission`/catalogue;
   - mọi membership `Active` tự nhận `club.attendance.manage` và `club.room.view`;
   - quyền mặc định không yêu cầu term/assignment;
   - các quyền role/leader vẫn yêu cầu nhiệm kỳ và assignment hợp lệ;
   - không cấp quyền mặc định cho founder legacy nếu không có membership Active.
2. UC30/UC32:
   - giữ permission check `club.attendance.manage` đang có;
   - bảo đảm list/detail/action attendance hoạt động với plain Active member;
   - không vô tình lộ payload quản trị sự kiện ngoài dữ liệu attendance cần thiết.
3. UC58:
   - đổi `clubRoomAllocations()` từ `club.booking.manage` sang `club.room.view`;
   - đổi client gate ở `ClubRoomsPage` và navigation;
   - không mở trang tạo/sửa booking cho người chỉ có `club.room.view`;
   - sửa OpenAPI, README và i18n liên quan.
4. Sửa `currentUser()` để workspace của plain member trả hai permission mặc định.

### Test bắt buộc

- Active member nhận đúng hai quyền mặc định khi không có assignment nào.
- Inactive/Left/Banned member không nhận hai quyền.
- Member của CLB A không xem phòng/chốt attendance của CLB B.
- Plain Active member gọi UC30/UC32 thành công.
- Plain Active member xem UC58 thành công nhưng vẫn bị 403 khi tạo booking UC45.
- Leader vẫn có đầy đủ quyền.
- OpenAPI route coverage vẫn xanh.

---

## 6. Feature 2 — UC23 role và permission CLB (G1)

### Mục tiêu

Club Leader quản lý role nội bộ, permission và assignment theo UC23; quyền được suy ra từ dữ liệu
thật trong nhiệm kỳ hiện hành và thay đổi có hiệu lực ngay.

### Domain và authorization

1. Tách rõ ba nhóm:
   - `DEFAULT_MEMBER_PERMISSIONS`;
   - permission có thể cấp cho role;
   - `LEADER_RESERVED_PERMISSIONS`.
2. Club Leader nhận toàn bộ 16 permission.
3. Thành viên giữ nhiều role nhận hợp các permission của các role còn hiệu lực.
4. Role thường do UC23 gán không cần ICPDP xác nhận.
5. Role ban điều hành chỉ cấp permission khi assignment đã được ICPDP xác nhận.
6. Chỉ Chủ nhiệm/Phó chủ nhiệm hợp lệ nhận actor/label Club Leader. Không suy ra `role: "leader"`
   chỉ vì người dùng có `club.member.manage`.
7. Bốn quyền giữ riêng không bao giờ được lưu vào role khác, kể cả request giả mạo trực tiếp API.
8. Mọi permission phải thuộc catalogue cố định; reject unknown code.

### CRUD và ràng buộc UC23

Hiện thực đủ FR-UC23-01 đến FR-UC23-17:

- list role + permission + holder;
- create/update role thường;
- department/unit, description, single/multi-holder;
- assign Active member với effective range;
- revoke assignment;
- update permission áp dụng ngay cho mọi holder;
- deactivate role;
- không gán tay role Members;
- không sửa/xoá Chủ nhiệm hoặc xoá Members;
- không thêm/bỏ/đổi cờ role ban điều hành giữa nhiệm kỳ qua UC23;
- không gán người giữ role ban điều hành qua UC23;
- không deactivate role còn holder;
- không thêm holder thứ hai vào single-holder role;
- giới hạn tuyệt đối theo đúng club và active term.

Mỗi mutation phải trong một transaction, đồng thời:

- cập nhật `clubPositions`/`clubPositionAssignments`;
- append một `clubRoleStructureVersions` bất biến với `versionNo` tăng tuần tự;
- ghi audit before/after;
- tạo notification cho thành viên bị ảnh hưởng;
- không để partial write nếu bất kỳ bước nào lỗi.

### Migration an toàn

Không bật lại `permissionCodes` cũ một cách mù quáng. Viết migration/upgrader idempotent hoặc một
quy trình dữ liệu được kiểm thử để:

- lọc unknown permission;
- loại bốn quyền giữ riêng khỏi role thường;
- chuẩn hoá Chủ nhiệm, Phó chủ nhiệm và Members;
- không biến mọi `isBoardSeat` thành Leader;
- căn chỉnh structure version hiện hành với role hiện hành;
- giữ lịch sử cũ, không xoá workflow record;
- chạy lại không nhân bản version/audit/assignment.

### API và frontend

- Thêm routes theo convention hiện hành dưới `/api/v1/clubs/:clubId/...`.
- Dùng `club.role.manage` cho toàn bộ mutation UC23.
- Thêm OpenAPI đồng thời với route.
- Tạo service và React Query hook riêng, query key chứa `clubId` và mọi input.
- Tạo trang role management cho Club Leader, responsive, dark theme, en/vi.
- UI phải ẩn bốn permission giữ riêng khỏi danh sách cấp được.
- UI hiển thị holder, effective range, role type, department và version history.
- ICPDP có màn chỉ đọc role/holder/toàn bộ structure versions từ trang CLB.
- UC24 hiển thị role hiện tại của chính thành viên.
- Navigation chỉ hiện trang quản lý khi có `club.role.manage`.

### Rà soát bắt buộc

Tìm toàn repo các query trực tiếp theo `permissionCodes`, `isLeaderRole`, `isBoardSeat`. Đảm bảo
mọi permission check dùng cùng semantics, kể cả re-check bên trong transaction của event,
membership và recruitment. Không để use case guard đúng nhưng repository transaction guard sai.

### Test bắt buộc

- Leader có đủ 16 quyền.
- Active member có hai quyền mặc định.
- Regular role cấp đúng permission, không cần `confirmedBy`.
- Board role khác chỉ cấp permission đã cấu hình và cần confirmation.
- Chủ nhiệm/Phó chủ nhiệm hợp lệ được nhận toàn bộ quyền.
- Role giữ nhiều permission và nhiều role hợp quyền đúng.
- Expired assignment/term, inactive position/member không cấp quyền.
- Reserved/unknown permission bị từ chối ở domain/API.
- Tất cả E1–E7 của UC23 có test.
- Mutation tạo đúng một version, audit và notification; lỗi rollback toàn bộ.
- Cross-club access bị từ chối.
- Workspace role không bị đổi thành `leader` chỉ vì một role thường có `club.member.manage`.

---

## 7. Feature 3 — audit lần thử trái quyền (S3 / SEC-08 / AC17)

### Mục tiêu

Một người dùng đã xác thực nhưng không có quyền thực hiện hành động bị từ chối với 403 và lần thử
được ghi bền vững vào `auditLogs`, đặc biệt AC17: non-ICPDP cố quyết định booking.

### Yêu cầu

- Không coi `console.warn` là audit.
- Không ghi secret, cookie, CSRF token, request body thô hoặc stack trace vào audit.
- Phân biệt 401 unauthenticated, 423 locked, validation error và 403 authorization denial.
- Tránh ghi trùng một denial ở cả use case và middleware.
- Audit tối thiểu gồm actor, actor role/scope nếu biết, action định thực hiện, entity type/id,
  method/path đã chuẩn hoá, required permission/role, reason, correlation ID và timestamp.
- Nếu chọn middleware/dependency injection, không làm `domain` phụ thuộc Express/Mongoose.
- Nếu route cần truyền audit context, context phải được dựng từ dữ liệu đã validate, không từ raw
  `req.body`.
- Việc audit denial không được thay đổi target business entity.

### Test bắt buộc

- Non-officer gọi `POST /admin/bookings/:id/decision` nhận 403.
- Booking giữ nguyên.
- Có đúng một audit denial với actor, booking id và action.
- Officer hợp lệ quyết định booking không sinh denial audit.
- Unauthenticated request nhận 401 và không bị ghi nhầm thành authenticated denial.
- Cross-club permission denial có audit đúng scope nếu phạm vi SRS/SPEC đã chọn bao phủ nó.

---

## 8. Feature 4 — complaint workflow UC50–UC52 (G3)

### Không giữ mô hình góp ý một chiều

Code hiện tại cho Student chọn `recipient = CLUB | ICPDP`. Mô hình này phải được thay bằng complaint
workflow chính thức:

- complaint luôn đi thẳng tới ICPDP;
- CLB không thấy complaint trước khi ICPDP chọn `Forwarded`;
- CLB không được dismiss/escalate/close;
- tên domain/API/UI nên dùng `Complaint`, không tiếp tục gây nhầm với event feedback.

Nếu cần giữ compatibility cho dữ liệu cũ, thực hiện migration/adapter có chủ đích; không để route
cũ làm đường vòng vi phạm BR38.

### UC50 — Student

- Bắt buộc chọn club; event là optional nhưng phải thuộc club.
- Nhận complaint type, description và evidence.
- Validate type/length/file metadata ở biên và domain.
- Tạo `Complaint` ở `Submitted` và approval/task cho ICPDP trong cùng transaction.
- Ghi audit không chứa nội dung nhạy cảm không cần thiết.
- Notification cho ICPDP; không notification cho CLB.
- Student xem timeline/trạng thái/outcome của complaint mình gửi.
- Student rút complaint ở `Submitted` hoặc `Under Triage` → `Withdrawn`, đóng task liên quan.
- Hỗ trợ liên kết complaint trùng của cùng student về cùng sự việc bằng `linkedComplaintId` và
  phân loại chung theo SRS.

### UC51 — ICPDP triage

- Mở complaint `Submitted` chuyển `Under Triage`.
- Triage gồm severity, validity, outcome, reason, actor, at.
- Chỉ ba outcome: `Dismissed`, `Forwarded`, `Escalated`.
- Reason bắt buộc cho mọi outcome.
- `Dismissed`: đóng task, thông báo student.
- `Forwarded`: đặt response deadline, tạo task/notification cho đúng CLB; chỉ từ thời điểm này CLB
  mới đọc được nội dung được phép.
- `Escalated`: tạo `Violation` UC40 và liên kết hai chiều complaint ↔ violation trong cùng
  transaction; không tạo một hồ sơ rời không truy vết được.
- Sau `Club Responded`, ICPDP được `Closed` hoặc `Escalated`.
- Complaint của CLB đã Dissolved vẫn được đóng có lịch sử theo FR-UC51-07.
- Kết quả complaint phải cung cấp input đúng cho UC42.

### UC52 — Club response

- Chỉ role có `club.complaint.respond` trong đúng CLB được xem complaint `Forwarded`.
- Áp dụng quyết định D5 về danh tính người khiếu nại; không lộ identity qua API payload, log,
  notification hoặc cache nếu D5 chọn ẩn.
- Nhận response text, evidence và concrete action.
- Một lần nộp chuyển `Forwarded → Club Responded`, quay lại queue ICPDP.
- CLB không được sửa response đã nộp, dismiss, escalate hoặc close.
- Quá deadline tạo compliance signal theo UC52 E1/UC40, có job hoặc cơ chế idempotent phù hợp.

### Frontend/API

- Student: trang gửi complaint và theo dõi timeline/withdraw.
- ICPDP: queue, detail, claim/open, triage, close/escalate sau response.
- Club: inbox chỉ các complaint đã Forwarded và form response.
- Repurpose các file `StudentFeedback*` hợp lý; không xoá nếu chưa được phê duyệt.
- Service → hook → component đúng quy tắc frontend.
- Thêm en/vi, dark theme, loading/error/empty states.
- Cập nhật OpenAPI và route coverage.

### Test bắt buộc

- AC19 đầy đủ.
- CLB không thấy complaint Submitted/Under Triage/Dismissed.
- Forwarded mới xuất hiện cho đúng CLB.
- Club khác và người thiếu permission nhận 403.
- Mỗi transition hợp lệ/thất bại có unit test.
- Escalation tạo complaint link và violation backlink atomically.
- Withdrawal race/triage race được bảo vệ bằng conditional update/versioning.
- Audit/notification/task rollback nếu transaction lỗi.
- Privacy D5 có API test khẳng định payload không lộ field bị cấm.

---

## 9. Feature 5 — approval routing UC05 và `ICPDP_HEAD` (G4)

### Mục tiêu

ICPDP cấu hình rule định tuyến đánh phiên bản; hồ sơ UC08, UC26, UC46 khớp rule phải qua cấp duyệt
thứ hai trước khi quyết định có hiệu lực. Hồ sơ không khớp rule chỉ duyệt một cấp.

### Role hệ thống

Sau khi D1 được chốt theo hướng RBAC:

- thêm `ICPDP_HEAD` vào system role catalogue, bootstrap và account administration;
- người có `ICPDP_HEAD` vẫn thuộc workspace ICPDP;
- định nghĩa rõ có bắt buộc đồng thời `ICPDP_OFFICER` hay `ICPDP_HEAD` tự bao hàm officer;
- level 2 chỉ người có `ICPDP_HEAD` được quyết định;
- session/role change vẫn thu hồi hoặc phản ánh quyền ngay theo semantics hiện tại;
- cập nhật client account role selector và i18n.

### RoutingRuleSet

- Version bất biến, lifecycle `Draft → Active`.
- Rule condition hỗ trợ đúng SRS: entity type, money threshold, event risk, property category,
  compliance history; output gồm required approval level và SLA.
- Validate rule chồng nhau; không bắt buộc coverage toàn bộ vì không match mặc định một cấp.
- Kích hoạt version mới không làm đổi route của task/hồ sơ đã mở.
- Audit activate; không sửa version Active tại chỗ.
- UC05 A1 mô phỏng draft rules trên N hồ sơ đã quyết định gần nhất mà không sửa dữ liệu.

### Approval task/decision

Schema/domain phải hỗ trợ tối thiểu:

- route/rule version đã chốt tại lúc mở task;
- `requiredLevel`, `currentLevel`, assignee role và SLA;
- nhiều decision theo task, mỗi decision có `level`;
- index không còn cấm nhiều decision hợp lệ trên một task; vẫn chống duplicate cùng level;
- state transition rõ cho Open/awaiting level 2/Decided/Closed;
- lịch sử quyết định đọc được theo thứ tự.

Không hard-code logic riêng ba lần. Thiết kế port/usecase chung đủ nhỏ để UC08, UC26, UC46 gọi,
nhưng không làm repository các aggregate import lẫn nhau hoặc phá transaction boundary.

### Tích hợp UC08, UC26, UC46

- Khi submit/open review, resolve routing rule một lần và đóng băng kết quả trên task.
- Nếu một cấp: flow hiện tại tiếp tục với đúng audit/notification.
- Nếu hai cấp: decision cấp 1 chưa được phép làm entity chuyển Approved/Rejected cuối cùng hoặc
  tạo side effect cuối như tạo Club/EventBudget/booking Approved.
- Cấp 2 phải thấy hồ sơ, decision cấp 1, reason/note và SLA.
- Chỉ sau decision cuối mới áp dụng business transition và side effect trong transaction.
- Request revision/reject semantics ở từng level phải được SPEC hoá rõ, không tự suy diễn.
- Queue/UI hiển thị cấp hiện tại, role cần xử lý, aging/SLA và lịch sử.

### Test bắt buộc

- Rule overlap bị từ chối; no-match ra level 1.
- Version mới chỉ áp dụng hồ sơ mới.
- Simulation không mutation.
- UC08/26/46 mỗi loại có test one-level và two-level.
- Officer thường không làm level 2; Head làm được.
- Level 1 không tạo side effect cuối.
- Duplicate decision cùng level bị conflict.
- Hai reviewer race chỉ một người thắng.
- Audit, task, decision, notification và entity transition nhất quán khi transaction rollback.
- OpenAPI/client role gates/route coverage xanh.

---

## 10. Feature 6 — Google SMTP thật (G5)

### Mục tiêu

Giữ nguyên outbox, claim/lease, delivery log và retry hiện có; thay log transport bằng SMTP thật ở
môi trường được cấu hình.

### Yêu cầu

- Sau khi được duyệt dependency, thêm SMTP client ở đúng workspace server.
- Tạo `infra/mail/smtp-mail-transport.ts` hiện thực `MailTransport`.
- Transport phải resolve chỉ khi SMTP server đã nhận message; lỗi phải throw để worker retry.
- Config được đọc duy nhất ở `infra/config/`, validate bằng zod và fail fast.
- Production không được âm thầm dùng log transport khi thiếu một phần SMTP config.
- Development/test có thể dùng log/fake transport theo lựa chọn tường minh.
- Không log password, access token hoặc body email; log transport hiện tại chỉ dùng dev.
- `MAIL_FROM` phải được validate; TLS/port/secure semantics phải rõ.
- Dùng `text` hiện có; nếu thêm HTML phải escape dữ liệu người dùng.
- Không gửi email thật trong unit/integration CI.
- Cập nhật `.env.example`, mail/config README và tài liệu setup sau khi được phê duyệt.

### Test bắt buộc

- Config đầy đủ tạo SMTP transport; config thiếu một phần fail fast mà không lộ giá trị.
- Fake SMTP success ghi delivery success đúng provider/transport.
- SMTP failure giữ retry/backoff và cuối cùng Failed theo worker hiện tại.
- Hai worker không gửi trùng nhờ lease hiện có.
- Development log transport vẫn không ghi body.

---

## 11. Đồng bộ tài liệu sau mỗi feature

Khi một feature hoàn thành, cập nhật tối thiểu:

- `docs/CURRENT_IMPLEMENTATION.md`;
- `docs/05-implementation/UC_CODE_MAPPING.md`;
- `docs/05-implementation/CODE_DIAGRAM_GAPS.md`;
- `docs/04-design/UCMS_High_Level_Design.md` nếu thiết kế runtime thay đổi;
- README của các thư mục/file liên quan;
- OpenAPI;
- user guide nếu navigation/flow người dùng thay đổi đáng kể.

Trong `CODE_DIAGRAM_GAPS.md`:

- xoá hoặc đánh dấu S1/S2 là kết luận sai đã loại bỏ, không coi là code gap;
- sửa mô tả G1/G2 theo correction trong prompt;
- chỉ chuyển gap sang “đã khớp” sau khi code, API, UI và test đã hoàn tất;
- không tuyên bố SMTP thật nếu production vẫn dùng log transport;
- không tuyên bố UC05/UC23/UC50–52 hoàn thành nếu chỉ có schema/backend mà thiếu UI hoặc nhánh lỗi.

Rà lại `docs/README.md` và các README đang ghi “52 use case trong phạm vi” hoặc “UC05/UC23/UC51/
UC52 đã rút”; baseline 02/11 đã khôi phục chúng, tổng cộng 56 use case trong phạm vi. Chỉ sửa các
dòng thực sự stale, không thay yêu cầu khác.

Không sửa file `.drawio` chỉ để phản ánh code cũ; diagram đã duyệt là chuẩn. Chỉ sửa diagram nếu
người dùng phê duyệt một thay đổi yêu cầu thật sự.

---

## 12. Quy trình kiểm tra

Sau mỗi feature:

1. Chạy unit test liên quan.
2. Chạy integration test liên quan nếu có MongoDB; nếu môi trường thiếu MongoDB, báo rõ test nào
   chưa chạy, nhưng vẫn chạy toàn bộ kiểm tra không cần DB.
3. Chạy typecheck/lint workspace bị tác động.
4. Kiểm tra OpenAPI route parity.
5. Với frontend, kiểm tra cả `en`/`vi`, light/dark, loading/error/empty và viewport hẹp.
6. Với mutation, kiểm tra transaction rollback/race/idempotency.
7. Cập nhật `TASKS.md` ngay.

Cuối toàn bộ nhiệm vụ:

- chạy `npm run check` từ repository root;
- nếu fail, sửa mọi lỗi do thay đổi của nhiệm vụ này;
- không che lỗi bằng skip test, `any`, nới TypeScript/ESLint hoặc xoá assertion;
- chạy `git diff --check`;
- xem `git status --short` và liệt kê chính xác file đã thay đổi;
- rà tìm chuỗi stale:
  - `club.booking.manage` trên đường xem room allocation;
  - comment nói Club Member không có permission;
  - comment nói role không mang permission;
  - `recipient = CLUB` trong complaint submission;
  - catalogue system role thiếu `ICPDP_HEAD`;
  - production wiring luôn dùng `logMailTransport`;
  - S1/S2 còn được mô tả là gap;
  - README còn ghi 52 use case hoặc UC05/UC23/UC51/UC52 đã rút.

---

## 13. Definition of Done cuối cùng

Chỉ báo hoàn thành khi tất cả điều sau đúng:

- [ ] Sáu SPEC và TASKS tồn tại, truy vết đúng SRS và mọi task hoàn tất được tick.
- [ ] Active Club Member có `club.attendance.manage` và `club.room.view` mặc định.
- [ ] Xem phòng không còn phụ thuộc `club.booking.manage`.
- [ ] UC23 có backend + API + UI + versioning + audit + notification + migration + tests.
- [ ] Resolver hợp permission role đúng term/assignment và không biến mọi board seat thành Leader.
- [ ] Workspace role không suy ra sai từ `club.member.manage`.
- [ ] Reserved permissions không thể cấp qua request giả mạo.
- [ ] AC17 có audit denial bền vững và test.
- [ ] UC50–UC52 chạy end-to-end, giữ privacy và AC19 xanh.
- [ ] UC05 routing chạy end-to-end cho UC08, UC26, UC46, gồm level 2 và `ICPDP_HEAD` theo D1.
- [ ] Approval schema hỗ trợ nhiều decision mà vẫn chống duplicate/race.
- [ ] SMTP thật được wire khi có config; production không âm thầm log thay gửi.
- [ ] S1/S2 không gây ra thay đổi code sai.
- [ ] OpenAPI, docs, README, mapping và current implementation đồng bộ.
- [ ] Không có secret trong diff/log.
- [ ] `npm run check` xanh.
- [ ] `git diff --check` xanh.

Khi bàn giao, trả lời ngắn gọn nhưng đầy đủ:

1. Outcome của từng G1–G5 và S3.
2. Các quyết định D1/D5 đã áp dụng.
3. Migration/config/dependency đã thêm.
4. Test đã chạy và kết quả chính xác.
5. Test nào chưa chạy và lý do, nếu có.
6. Các rủi ro hoặc bước vận hành còn lại, đặc biệt migration dữ liệu và credential SMTP.
7. Không nói “hoàn thành” nếu còn bất kỳ checkbox Definition of Done nào chưa đạt.
