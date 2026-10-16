# UCMS — Thiết kế mức cao đối chiếu implementation

> Cập nhật 15/10/2026 theo commit `60fc2db`. Mapping UC đầy đủ:
> [`../05-implementation/UC_CODE_MAPPING.md`](../05-implementation/UC_CODE_MAPPING.md).
> Phạm vi đã có và còn thiếu: [`../CURRENT_IMPLEMENTATION.md`](../CURRENT_IMPLEMENTATION.md).

## 1. Các container và phụ thuộc

React 19/Vite SPA gọi Express 5 API dưới `/api/v1`; API dùng Mongoose/MongoDB. Google OAuth
được nối khi đủ cấu hình Auth; Cloudinary được nối khi đủ credentials. Google SMTP còn là phụ
thuộc thiết kế, chưa có delivery worker trong `main.ts`.

`docker-compose.yml` hiện chỉ khởi động Mongo 7 dạng single-node replica set. Server và client
chạy bằng npm workspace; không có container server/Nginx trong compose hiện tại.

## 2. Bốn tầng và cấu trúc thật

Hướng phụ thuộc `interface → usecase → domain ← infra` theo `.rules/architecture.md`. Domain
định nghĩa entity, quy tắc và repository port; use case kiểm tra quyền/luồng; interface parse
zod và response; infra hiện thực repository cùng transaction. `main.ts` chọn repository cụ thể
và nối vào `buildApp`.

Ví dụ M05 dùng file phẳng hiện hành:

```text
server/src/domain/club-event.ts
server/src/usecase/club-event.ts
server/src/interface/http/club-event-routes.ts
server/src/infra/db/mongo-club-event-repository.ts
client/src/services/clubEvents.ts
client/src/hooks/useClubEvents.ts
client/src/pages/club/ClubEventsPage.tsx
```

Không có thư mục `domain/event/`, `usecase/event/` hoặc `pages/events/` trong lát cắt này.

## 3. Bản đồ module và mức hoàn thành

| Module | Dữ liệu/chức năng | Trạng thái |
|---|---|---|
| M01 Identity, Access, Configuration | User, session, system role, policy, dashboard | Có; OAuth thật còn gate nghiệm thu |
| M02 Club Lifecycle | Hồ sơ thành lập, profile, lifecycle | UC08 tạo Active ngay; UC14 CLB xin tạm ngừng và UC15 ICPDP quyết định; job hết hạn hồ sơ UC07/08 |
| M03 Leadership & Term | Term, position, assignment, transition | UC10–UC13 có (UC12/13 kiểm tra BR06); UC23 đã rút |
| M04 Recruitment & Membership | Campaign, application, candidate evaluation, membership | Có, gồm job tái xác nhận đầu kỳ UC21 A2 |
| M05 Event & Activity | Proposal, event, school event, invitation | Có, gồm UC54 CLB nhận/từ chối lời mời |
| M06 Registration & Attendance | Registration, waitlist, attendance | Có |
| M07 Finance & Budget | Budget, disbursement, expense, evidence, reconciliation | UC35–UC37 đã nối vào app chính |
| M08 Reporting & Compliance | Event report, periodic report, violation | Có, gồm UC38 CLB nộp/nộp lại và UC40 CLB giải trình, khắc phục |
| M09 Evaluation & Export | Scheme, evaluation, export | Có ICPDP và màn CLB xem kết quả đã công bố (UC43) |
| M10 Workflow, Notification, Audit | Task/decision, notifications, audit, jobs | Ghi dữ liệu có; chưa có mail worker/inbox tổng quát/lease như thiết kế đích |
| M11 Properties & Booking | Property, non-room booking, room allocation | Có; UC58 CLB xem chỉ dành Leader |
| M12 Feedback | Event feedback và góp ý một chiều | Có; physical complaints giữ tên cũ; UC51/52 đã rút |

## 4. Workflow, thông báo và audit thật

Approval task và decision được repository từng aggregate ghi trong transaction tương ứng.
Không có một `ApprovalPort`/`approval.open()` hoặc hộp thư `/approvals` thống nhất trong runtime;
ICPDP dùng các queue riêng theo nghiệp vụ. Nộp lại hồ sơ/đề xuất sinh version bất biến; route và
repository cụ thể nằm trong ma trận UC.

Repository nhận actor/time/reason qua hợp đồng nghiệp vụ và ghi `auditLogs`, `notifications`
trong cùng transaction với thay đổi dữ liệu. Không có một `AuditPort` hay `NotificationPort`
độc lập được tiêm cho mọi use case trong `main.ts`. Đây là mô tả cách code hiện tại làm; không
đồng nhất với bản thiết kế port chung trước đây.

Jobs được nối trong `main.ts`:

- `facility-booking-job`: Approved → In Use → Completed.
- `club-lifecycle-job`: hết hạn tạm ngừng và vòng đời giải thể.
- `event-lifecycle-job`: đề xuất quá hạn sửa, Ongoing/Completed và invitation Expired.
- `accountability-reminder-job`: nghĩa vụ báo cáo/tài chính và thông báo nhắc hạn.
- `application-expiry-job`: hồ sơ thành lập quá hạn sửa (UC07/08) chuyển `Expired`.
- `membership-reconfirmation-job`: mở đợt tái xác nhận đầu kỳ và chuyển `Inactive` khi quá 14 ngày (UC21 A2).

Chưa có SMTP delivery/retry hoặc lease Mongo dùng chung. Sự tồn tại của collection `emailDeliveryLogs` không chứng minh mail
đã được gửi.

## 5. Định danh và quyền truy cập

Auth dùng Google OAuth, cookie phiên ký, `httpOnly`, `SameSite=Lax`, Secure theo môi trường,
CSRF token cho request thay đổi dữ liệu. Domain lấy từ `ALLOWED_DOMAIN` (danh sách hoặc `*`),
không lấy từ policy UC04. System role gồm `ICPDP_OFFICER` và quyền đặc biệt attendance unlock.

Phía CLB chỉ có hai role cố định. `resolveClubPermissions` yêu cầu membership Active, term
Active còn hiệu lực, position active, assignment đúng membership/term còn hiệu lực và đã
`confirmedBy`. Ghế `isLeaderRole` hoặc `isBoardSeat` nhận toàn bộ 14 permission; còn lại nhận
rỗng. Cơ cấu chuẩn là Chủ nhiệm/Phó chủ nhiệm/Thành viên. Approved founder Pending Setup chỉ
nhận `club.profile.manage` và `club.board.nominate`.

Không có role tự tạo, API roles/role-directory hay UI cấu hình permission. Field cũ được giữ
cho tương thích, không cấp quyền. Client ẩn menu theo `/auth/me`; server vẫn kiểm tra quyền.
Member roster đọc qua member-space, chỉ tên/vị trí/trạng thái. GET profile/departments cho current
member đọc, dù UI settings chỉ mở cho Leader. UC58 yêu cầu Leader ngay cả khi chỉ đọc.

## 6. MongoDB và tính nguyên tử

DBML có 51 collection nghiệp vụ; authSessions là collection vận hành ngoài DBML. Repository
thực sự dùng multi-document transaction, vì vậy Mongo phải hỗ trợ replica set. Unique index,
guarded update và khoá/version trong transaction bảo vệ race ở slot, capacity và quyết định.
Không giữ tuyên bố cũ “không dùng transaction đa document”.

`ensureUcmsDatabase` tạo schema/index lúc boot. Schema sinh từ DBML; `_id` là ObjectId, các
reference không phải foreign key được Mongo cưỡng chế. `complaints` lưu UC50 góp ý Submitted
bất biến với recipient/type/isAnonymous; ticket fields cũ không dùng.

## 7. API và response

Route parse zod, gọi use case và trả phong bì từ `response.ts`:

- Thành công: `{ statusCode, message, data, timestamp }`.
- Lỗi: `{ statusCode, error, message, details?, timestamp, path }`.
- DomainError: validation 400, unauthorized 401, forbidden 403, not_found 404, conflict 409,
  locked 423, unavailable 503; lỗi ngoài dự kiến 500 không lộ stack.

OpenAPI được khai báo bằng TypeScript trong `openapi.ts` và các file phụ, phục vụ `/docs`;
test kiểm tra lệch route/spec. Không được mô tả là tự sinh toàn bộ từ zod.
`server.ts` mount theo dependency; `main.ts` là nguồn quyết định module thực chạy. Các endpoint
UC36/37 không hoạt động chỉ vì đã có file route hoặc entry OpenAPI.

## 8. Client

Router declarative trong `client/src/main.tsx`. `services → hooks → component`, React Query quản
lý server state, i18next en/vi, Tailwind token theme. PublicLayout hiện yêu cầu đăng nhập cho
cả home/danh bạ; API `/public/*` vẫn mở. WorkspaceShell kiểm tra workspace và menu theo permission.

Các trang nằm ở `pages/auth`, `pages/public`, `pages/student`, `pages/club`, `pages/icpdp`.
Phía CLB có thêm route UI cho UC12, UC14, UC38, UC40, UC43, UC54; UC36/37 dùng API đã nối trong app chính.

## 9. Kiểm chứng và phần còn lại

`npm run check` ngày 15/10/2026 xanh: 296 pass, 118 Mongo integration skip. Không thay kết quả
OAuth/Cloudinary thật hoặc visual QA của từng feature. Kế hoạch hiện hành:
[`../05-implementation/REMAINING_UC_PLAN.md`](../05-implementation/REMAINING_UC_PLAN.md).

Đây là bản ghi nhận implementation đã quan sát, không phải quyết định kiến trúc mới. Các ADR
cũ giữ nguyên lịch sử; mọi thay đổi kiến trúc về sau phải tuân theo quy trình `.rules/`.
