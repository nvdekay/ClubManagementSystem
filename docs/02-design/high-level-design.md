# UCMS — Thiết kế mức cao đối chiếu implementation

> Đối chiếu code ngày 27/11/2026 (các bản trước: `main` 14/11/2026; 15/10/2026, commit `60fc2db`). Mapping UC đầy đủ:
> [`../03-implementation/uc-code-mapping.md`](../03-implementation/uc-code-mapping.md).
> Phạm vi đã có và còn thiếu: [`../current-implementation.md`](../current-implementation.md).

## 1. Các container và phụ thuộc

React 19/Vite SPA gọi Express 5 API dưới `/api/v1`; API dùng Mongoose/MongoDB. Google OAuth
được nối khi đủ cấu hình Auth; Cloudinary được nối khi đủ credentials. Google SMTP gửi email qua
`notification-delivery-job` khi đủ biến `SMTP_*`/`MAIL_FROM` (bắt buộc ở production); khi phát triển không
cấu hình SMTP thì dùng `logMailTransport` chỉ ghi người nhận + tiêu đề (sửa 2026-11-07).

Khi phát triển, `docker-compose.yml` chỉ khởi động Mongo 7 dạng single-node replica set; server
(`:3000`) và client Vite (`:5173`, proxy `/api`) chạy bằng npm workspace. Bản production là một image
Docker (`Dockerfile`): Express phục vụ cả API lẫn bản build client (`CLIENT_DIST_DIR`,
`interface/http/static-client.ts`) trên cùng một cổng; `docker-compose.prod.yml` chạy image đó cùng
Mongo replica set một node. TLS do reverse proxy đặt trước container đảm nhận (`TRUST_PROXY`). Chi tiết:
mục Triển khai trong [`../../README.md`](../../README.md).

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
| M03 Leadership & Term | Term, position, assignment, transition | UC10–UC13 có (UC12/13 kiểm tra BR06); UC23 đã rút; API/UI role động đã gỡ 07/11/2026 |
| M04 Recruitment & Membership | Campaign, application, candidate evaluation, membership | Có, gồm job tái xác nhận đầu kỳ UC21 A2 |
| M05 Event & Activity | Proposal, event, school event, invitation | Có, gồm UC54 CLB nhận/từ chối lời mời |
| M06 Registration & Attendance | Registration, waitlist, attendance | Có |
| M07 Finance & Budget | Budget, disbursement, expense, evidence, reconciliation | UC35–UC37 đã nối vào app chính |
| M08 Reporting & Compliance | Event report, periodic report, violation | Có, gồm UC38 CLB nộp/nộp lại và UC40 CLB giải trình, khắc phục |
| M09 Evaluation & Export | Scheme, evaluation, export | Có ICPDP và màn CLB xem kết quả đã công bố (UC43) |
| M10 Workflow, Notification, Audit | Task/decision, notifications, audit, jobs | Có; hộp thông báo in-app chung và worker outbox (từ 19/10/2026); email gửi thật qua Google SMTP khi đủ `SMTP_*` (bắt buộc ở production), chỉ ghi log khi phát triển |
| M11 Properties & Booking | Property, non-room booking, room allocation | Có; UC58 CLB xem phòng được phân mở cho mọi thành viên `Active` (`club.room.view`) |
| M12 Feedback | Event feedback và khiếu nại | Có: UC48/49 phản hồi sự kiện; UC50–UC52 khiếu nại đi thẳng ICPDP, triage, chuyển CLB, leo thang thành hồ sơ UC40 (`usecase/complaint.ts`, `infra/db/mongo-complaint-repository.ts`) |

## 4. Workflow, thông báo và audit thật

Approval task và decision được repository từng aggregate ghi trong transaction tương ứng.
Không có một `ApprovalPort`/`approval.open()` hoặc hộp thư `/approvals` thống nhất trong runtime;
ICPDP dùng các queue riêng theo nghiệp vụ. Nộp lại hồ sơ/đề xuất sinh version bất biến; route và
repository cụ thể nằm trong ma trận UC.

Repository nhận actor/time/reason qua hợp đồng nghiệp vụ và ghi `auditLogs`, `notifications`
trong cùng transaction với thay đổi dữ liệu qua các helper chung ở `infra/db/repo-helpers.ts`: `writeAudit`
(tự sinh `correlationId` khi không truyền), `queueNotification`/`queueNotifications` (nhiều người nhận),
`icpdpOfficerIds` (người nhận là ICPDP officer), `closeOpenTasks` (đóng approval task đang mở). Không có một `AuditPort` hay `NotificationPort`
độc lập được tiêm cho mọi use case trong `main.ts`. Đây là mô tả cách code hiện tại làm; không
đồng nhất với bản thiết kế port chung trước đây.

Jobs được nối trong `main.ts` (mỗi job hẹn giờ qua `interface/jobs/schedule.ts`):

- `facility-booking-job`: Approved → In Use → Completed.
- `club-lifecycle-job`: hết hạn tạm ngừng và vòng đời giải thể.
- `event-lifecycle-job`: đề xuất quá hạn sửa, Ongoing/Completed và invitation Expired.
- `accountability-reminder-job`: nghĩa vụ báo cáo/tài chính và thông báo nhắc hạn.
- `application-expiry-job`: hồ sơ thành lập quá hạn sửa (UC07/08) chuyển `Expired`.
- `membership-reconfirmation-job`: mở đợt tái xác nhận đầu kỳ và chuyển `Inactive` khi quá 14 ngày (UC21 A2).
- `complaint-response-job`: mỗi giờ quét khiếu nại đã chuyển CLB mà quá hạn trả lời (UC52, tín hiệu tuân thủ).
- `evidence-cleanup-job`: lúc khởi động và mỗi 24 giờ xoá ảnh minh chứng UC38 trên Cloudinary không được báo cáo nào
  tham chiếu (`uploadedAssets`, `usecase/periodic-evidence-cleanup.ts`).
- `notification-delivery-job` (SCH-10, từ 19/10/2026): mỗi phút rút outbox `notifications` — dòng chỉ in-app
  `Queued → Sent`; dòng có kênh `EMAIL` được claim nguyên tử (đẩy `dueAt` qua lease 5 phút, tăng `attempts`) nên hai
  instance không gửi trùng (NTF-07), mỗi lần thử ghi một `emailDeliveryLogs`, lỗi thì retry backoff 1/2/4/8 phút, quá
  5 lần thì `Failed` (NTF-02/03).

Kênh email theo ma trận SRS §8.2 do `notificationChannels()` ở `domain/notification.ts` quyết định (hồ sơ thành lập
yêu cầu sửa/duyệt/từ chối, đề xuất sự kiện duyệt/từ chối, quyết định booking, vi phạm yêu cầu giải trình/có quyết định).
Transport là `smtpMailTransport` (`nodemailer`, Google SMTP) khi đủ cấu hình, `logMailTransport` khi phát triển
— xem `server/src/infra/mail/README.md`. Người dùng đọc thông báo qua `GET /notifications/mine` (chuông ở
`WorkspaceShell`), đánh dấu đã đọc qua `POST /notifications/{id}/read` và `POST /notifications/mine/read-all`. Chuông
chỉ hiện thông báo của workspace đang mở: các endpoint `mine` nhận `scope=student|icpdp|club` (+ `clubId`), audience
của từng `eventCode` do `notificationAudience()` ở `domain/notification.ts` quyết định.

## 5. Định danh và quyền truy cập

Auth dùng Google OpenID Connect (Authorization Code + PKCE S256, `state`, `nonce`, ID token RS256
kiểm qua JWKS), phiên lưu phía server trong `authSessions` (chỉ hash), cookie phiên ký HMAC,
`httpOnly`, `SameSite=Lax`, `Secure` khi `NODE_ENV=production`, CSRF token theo phiên cho request
thay đổi dữ liệu. Toàn bộ cơ chế và hạn chế đã biết: [`../srs.md` §12.1](../srs.md#121-cơ-chế-bảo-mật). Domain lấy từ `ALLOWED_DOMAIN` (danh sách hoặc `*`),
không lấy từ policy UC04. System role chỉ còn `ICPDP_OFFICER` (từ 25/11/2026 `ICPDP_HEAD` và `ATTENDANCE_UNLOCK` đã gộp vào đây): mọi ICPDP Officer cấu hình rule định tuyến UC05 và mở khoá điểm danh. Định tuyến UC05: `domain/approval-routing.ts` khớp rule; `infra/db/approval-routing.ts` đóng băng rule khớp và SLA lên `approvalTasks` lúc mở task; UC08/UC26/UC46 duyệt một cấp (BR16, BR31).

Thiết kế đích theo BR47, BR54, BR55 dùng hai role phía CLB cố định. Membership `Active` tạo
`Club Member` với capability thành viên cố định; ghế Chủ nhiệm / Phó chủ nhiệm đã xác nhận trong
term `Active` tạo `Club Leader` với toàn bộ quyền quản lý cố định. Các chức danh khác và
`permissionCodes` trên position không cấp quyền. Re-check trong transaction phải dựng cùng snapshot.
UC08 tạo CLB `Active` với ghế Chủ nhiệm/Phó chủ nhiệm đã xác nhận.

Không có role tự tạo, API roles/role-directory hay UI cấu hình permission. Field cũ được giữ cho
tương thích, không cấp quyền; phần UC23 động thêm tạm ngày 07/11/2026 đã gỡ. Client ẩn
menu theo `/auth/me`; server vẫn kiểm tra quyền.
Member roster đọc qua member-space, chỉ tên/vị trí/trạng thái. GET settings (profile/departments)
của CLB cần `club.profile.manage`, tức chỉ Club Leader đọc và sửa. UC58 xem phòng được phân mở cho mọi thành viên `Active` (`club.room.view`).

## 6. MongoDB và tính nguyên tử

DBML có 55 bảng (collection nghiệp vụ, gồm `uploadedAssets` thêm 26/11/2026); `authSessions` là collection vận hành ngoài DBML, tổng cộng 56 collection. Repository
thực sự dùng multi-document transaction, vì vậy Mongo phải hỗ trợ replica set. Unique index,
guarded update và khoá/version trong transaction bảo vệ race ở slot, capacity và quyết định.
Không giữ tuyên bố cũ “không dùng transaction đa document”.

`ensureUcmsDatabase` tạo schema/index lúc boot. Schema sinh từ DBML; `_id` là ObjectId, các
reference không phải foreign key được Mongo cưỡng chế. `complaints` lưu khiếu nại chính thức UC50–UC52:
`Submitted → Under Triage → Dismissed | Forwarded | Escalated`, CLB trả lời một lần (`Club Responded`),
ICPDP đóng hoặc leo thang thành hồ sơ UC40; `triage`, `clubResponse`, `closure` nhúng trong bản ghi.
Bản ghi góp ý cũ trước 07/11/2026 vẫn đọc được.

## 7. API và response

Route parse zod, gọi use case và trả phong bì từ `response.ts`:

- Thành công: `{ statusCode, message, data, timestamp }`.
- Lỗi: `{ statusCode, error, message, details?, timestamp, path }`.
- DomainError: validation 400, unauthorized 401, forbidden 403, not_found 404, conflict 409,
  locked 423, unavailable 503; lỗi ngoài dự kiến 500 không lộ stack.

Mọi router mount dưới `/api/v1` qua `mount()` trong `buildApp`. Body JSON tối đa 100kb (route cần body
lớn nằm trong `LARGE_JSON_ROUTES`); mỗi request có `X-Request-Id` và một dòng log JSON; giới hạn tần suất
theo IP (`rate-limit.ts`: 20/phút cho `/api/v1/auth`, 300/phút cho `/api/v1`); header bảo mật và CSP ở
`security-headers.ts`.

OpenAPI được khai báo bằng TypeScript trong `openapi.ts` và các file phụ, phục vụ `/docs`;
test kiểm tra lệch route/spec. `/docs` tắt ở production trừ khi `API_DOCS=true`. Không được mô tả là tự sinh toàn bộ từ zod.
`server.ts` mount theo dependency; `main.ts` là nguồn quyết định module thực chạy. Các endpoint
UC36/37 không hoạt động chỉ vì đã có file route hoặc entry OpenAPI.

## 8. Client

Router declarative trong `client/src/main.tsx`, mọi trang nạp lười (`lazy()` + `Suspense`). `services → hooks → component`
(mọi service gọi API qua `services/apiRequest.ts`: `apiClient(base, toError?)` cho JSON, `postFile` cho file tải về;
mutation chỉ cần làm mới cache dùng `useInvalidatingMutation`), React Query quản lý server state, i18next en/vi (chuỗi tách theo
ngôn ngữ ở `i18n/locales/{en,vi}`, nạp lười), Tailwind token theme. Khu công khai (`PublicLayout`: home, danh bạ
CLB, sự kiện và trang chi tiết) đọc được khi chưa đăng nhập, header chỉ hiện nút đăng nhập; API `/public/*` mở. WorkspaceShell kiểm tra workspace và menu theo permission.

Các trang nằm ở `pages/auth`, `pages/public`, `pages/student`, `pages/club`, `pages/icpdp`.
Phía CLB có thêm route UI cho UC12, UC14, UC38, UC40, UC43, UC54; UC36/37 dùng API đã nối trong app chính.

## 9. Kiểm chứng và phần còn lại

Số test ngày 28/11/2026: server 1072 test / 144 file vitest (unit + integration; integration cần Mongo),
client 110 test / 10 file, Playwright e2e 20 test / 5 file (`npm run test:e2e`, ngoài `npm run check`). Không thay kết quả
OAuth/Cloudinary thật hoặc visual QA của từng feature. Trạng thái hiện hành:
[`../current-implementation.md`](../current-implementation.md).

Đây là bản ghi nhận implementation đã quan sát, không phải quyết định kiến trúc mới. Các ADR
cũ giữ nguyên lịch sử; mọi thay đổi kiến trúc về sau phải tuân theo quy trình `.rules/`.
