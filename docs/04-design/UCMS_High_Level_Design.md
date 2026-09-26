# UCMS — Thiết kế mức cao

Trạng thái: bản nháp · Ngày: 2026-09-21 · Phạm vi: 12 module của
[`UCMS_Business_System_Analysis.md`](../01-business-analysis/UCMS_Business_System_Analysis.md)
dựng trên repo này.

Tài liệu này nói **hệ thống có hình dạng thế nào**. Nó không nhắc lại các quy tắc về tầng —
những thứ đó nằm ở [`.rules/architecture.md`](../../.rules/architecture.md) (tầng phía server),
[`.rules/frontend.md`](../../.rules/frontend.md) (client) và
[`ADR-001`](../../.sdd/rfcs/ADR-001-clean-architecture-layers.md) /
[`ADR-002`](../../.sdd/rfcs/ADR-002-client-architecture.md). Mọi thứ ở đây hoặc là ánh xạ các
module nghiệp vụ lên những quy tắc đó, hoặc là nêu tên một quyết định mà các quy tắc chưa phủ.

---

## 1. Bối cảnh

```text
        Student ─┐
   Club Board (CMB) ─┼──HTTPS──► UCMS SPA ──/api/v1──► UCMS API ──► MongoDB
      ICPDP Officer ─┘                                    │
                                                          ├──► Google OAuth   (đăng nhập)
                                                          └──► Google SMTP    (email thông báo)
```

Ba actor là người, một hệ thống, hai phụ thuộc bên ngoài. Không có tích hợp nào khác nằm trong
phạm vi (mục 5.2 của bản phân tích).

## 2. Các container

| Container | Công nghệ | Trách nhiệm |
|---|---|---|
| `client/` | SPA React 19 + Vite, build tĩnh | Toàn bộ giao diện. Chỉ nói chuyện với `/api/v1/*`. |
| `server/` | Express 5 + Mongoose, một tiến trình Node duy nhất | API, quy tắc nghiệp vụ, callback OAuth, bộ lập lịch. |
| MongoDB | một instance, có khả năng chạy replica set | Toàn bộ dữ liệu bền vững, gồm cả hàng đợi thông báo và nhật ký audit. |

**Quyết định D1 — một khối triển khai, không phải nhiều service.** 54 use case, một nhóm, một
database, một ranh giới giao dịch. Module là thư mục, không phải tiến trình. Việc chia 4 tầng đã
cho sẵn những đường nối mà tách service mới có, mà không phải trả giá vận hành. Chỉ xem xét lại
khi một module cần mở rộng độc lập (hiện không module nào cần: tải là vài trăm sinh viên).

**Quyết định D2 — bộ lập lịch chạy trong chính tiến trình API.** Nhắc hạn, leo thang và việc rút
hàng đợi email là các job theo thời gian, không phải một hệ thống queue. Chúng chạy dưới dạng
một interval trong tiến trình, được bảo vệ bằng một lease document trong Mongo để instance thứ
hai không gửi trùng. Tách ra container worker riêng khi API được mở rộng quá một instance.

## 3. Bản đồ module → code

Một module là một **lát cắt dọc xuyên bốn tầng đã có** — không bao giờ là một thư mục cấp cao
mới. Ví dụ M05 Event & Activity:

```text
server/src/domain/event/            entity (Event, EventProposalVersion), máy trạng thái,
                                    lỗi nghiệp vụ, port (EventRepository, ApprovalPort)
server/src/usecase/event/           submitProposal, approveEvent, publishEvent, …  mỗi luồng một file
server/src/interface/http/event-routes.ts   /api/v1/events*  — parse, gọi usecase, trả response
server/src/infra/db/mongo-event-repository.ts
client/src/services/events.ts       fetch có kiểu cho từng endpoint
client/src/hooks/useEvents.ts       query key của React Query
client/src/pages/events/            các màn hình
```

Quyền sở hữu dữ liệu theo module (§6 của bản phân tích) là quy tắc quyết định **ai được ghi**:
một usecase chỉ ghi các aggregate của module mình và đọc module khác qua repository port của
chúng. Ghi xuyên module phải đi qua usecase của module sở hữu, không phải qua repository của nó.

| Module | Aggregate nó sở hữu | MVP |
|---|---|---|
| M01 Identity & RBAC | User, StudentProfile, Role, Permission | ✅ |
| M02 Club Lifecycle | Club, ClubApplication(+Version) | ✅ |
| M03 Leadership & Term | ClubTerm, ClubPosition(+Assignment) | một phần (UC09–10) |
| M04 Recruitment & Membership | RecruitmentCampaign, RecruitmentApplication, ClubMembership | ✅ |
| M05 Event & Activity | Event, EventProposalVersion, PostEventReport | ✅ |
| M06 Registration & Attendance | EventRegistration, Attendance | ✅ |
| M07 Finance & Budget | BudgetRequest(+Version), Expense, FinancialEvidence, Reconciliation | ✅ |
| M08 Reporting & Compliance | PeriodicReport, Violation, CorrectiveAction | một phần |
| M09 Performance Evaluation | Evaluation, EvaluationScheme/Dimension | ❌ v2 |
| M10 Workflow / Notification / Audit | ApprovalTask, ApprovalDecision, Notification, EmailDeliveryLog, AuditLog | ✅ (xuyên suốt) |
| M11 Property & Booking | Property, PropertyBooking | ✅ |
| M12 Feedback & Complaint | EventFeedback, Complaint | ✅ |

## 4. Thiết kế xuyên suốt (M10)

Ba thứ dưới đây là cái biến 12 module thành một hệ thống; mỗi thứ là một **domain port với đúng
một bản cài ở tầng infra**, được tiêm trong `main.ts` như mọi repository khác.

### 4.1 Workflow phê duyệt

Sáu đối tượng nghiệp vụ đi qua nộp → thẩm định → sửa → quyết định (hồ sơ thành lập CLB, đề xuất
sự kiện, yêu cầu ngân sách, đặt cơ sở vật chất, khiếu nại, tạm ngừng hoạt động). Chúng dùng
chung **một** aggregate `ApprovalTask`: `{ entityType, entityId, state, assignee, decisions[] }`.

Module giữ trạng thái thực thể của riêng nó (`Event.status`), còn approval task giữ trạng thái
*thẩm định*. Một usecase gọi `approval.open(entityType, entityId, …)`; callback quyết định lật
trạng thái thực thể thông qua usecase sở hữu nó. Một hộp thư người duyệt duy nhất cho ICPDP là
hệ quả miễn phí của thiết kế này — và đó chính là lý do dùng chung một aggregate.

**Bản sửa là các version chỉ-ghi-thêm** (`ClubApplicationVersion`, `EventProposalVersion`,
`BudgetRequestVersion`): một lần nộp lại ghi một document version mới, không bao giờ sửa bản
trước. Cả audit lẫn câu hỏi "ICPDP thực sự đã duyệt cái gì" đều phụ thuộc vào điều đó.

### 4.2 Thông báo — dùng outbox, không bao giờ gửi đồng bộ

```text
usecase commit thay đổi nghiệp vụ
  → notification.enqueue(event, recipients, channels)   # cùng request, ghi vào Mongo
  → scheduler rút outbox → dòng in-app / Google SMTP → EmailDeliveryLog(+retry)
```

§19 của bản phân tích yêu cầu điều này: *một email gửi lỗi không bao giờ được làm hỏng một giao
dịch nghiệp vụ đã commit*. Gửi đồng bộ sẽ làm đúng điều đó. Số lần thử lại và khoảng lùi nằm
trên chính document của outbox.

Leo thang deadline (`T−X nhắc / T đến hạn / T+Y quá hạn / T+Z leo thang`) cũng chính là bộ lập
lịch đó quét các index theo ngày đến hạn; X/Y/Z là document cấu hình, không phải hằng số.

### 4.3 Audit

Mọi usecase làm thay đổi trạng thái đều ghi `{ entityType, entityId, actor, action, before,
after, at }` qua một `AuditPort`. Nó được gọi **trong usecase**, không phải trong middleware của
route và cũng không phải trong repository: route không biết tên hành động nghiệp vụ, còn
repository không biết actor.

## 5. Định danh, xác thực, phân quyền

- **Xác thực:** luồng Google OAuth Authorization Code. `interface/http/auth-routes.ts` sở hữu
  phần redirect + callback; callback tìm hoặc tạo `User` rồi đặt một cookie phiên được ký,
  `httpOnly`, `SameSite=Lax`. Không bao giờ lưu mật khẩu (§5.2 của bản phân tích).
- **Phân quyền — hai lớp kiểm tra, hai tầng:**
  1. *Quyền* (vai trò này có được làm hành động này không) — middleware ở route, lấy từ bảng
     `Role → Permission`.
  2. *Phạm vi* (actor này có ở **đúng CLB** đó, với **đúng chức vụ** đó, trong **nhiệm kỳ hiện
     tại** không) — nằm trong usecase, vì đây là quy tắc nghiệp vụ và phải unit-test được mà
     không cần HTTP. Đây mới là lớp thực sự bảo vệ dữ liệu; middleware chỉ chặn sớm.
- Việc gán vai trò gắn với nhiệm kỳ: quyền được suy ra từ `ClubPositionAssignment` ∩ `ClubTerm`
  đang hoạt động, không bao giờ từ một cờ trên user. Nhờ vậy chuyển giao ban chủ nhiệm trở thành
  một thay đổi dữ liệu, không phải một lần migration.

## 6. Thiết kế dữ liệu (MongoDB)

- Mỗi aggregate một collection; tham chiếu bằng `ObjectId`, không join xuyên collection trong
  đường đi nóng.
- **Chỉ denormalize cho màn hình danh sách** — ví dụ `{ clubId, clubName }` trên dòng sự kiện và
  booking, để một danh sách trên dashboard chỉ tốn một truy vấn. Usecase của module sở hữu chịu
  trách nhiệm cập nhật bản sao khi đổi tên.
- Compound index là một phần của repository, được tạo lúc khởi động (`ensureUserIndexes` là mẫu
  đã có). Tối thiểu: `(clubId, status)`, `(eventId, studentId)` unique trên đăng ký,
  `(entityType, entityId)` trên audit và approval, `(dueAt, state)` trên outbox.
- Không dùng transaction đa document trong MVP. Hai chỗ thực sự cần tính nguyên tử — sức chứa
  đăng ký và xung đột booking — dùng một unique index cộng một `findOneAndUpdate` có điều kiện,
  vốn còn mạnh hơn so với đọc-kiểm-ghi bên trong một transaction.

## 7. Bề mặt API

Giữ nguyên hợp đồng của template: REST dưới `/api/v1`, phong bì `{ data }`, `DomainError` kind →
400/409/404, mọi thứ khác → 500, validate bằng zod ở biên trước bất kỳ truy vấn Mongoose nào.
Mỗi module một file route, đăng ký trong `server.ts`. OpenAPI vẫn được sinh từ các schema zod và
phục vụ tại `/docs`.

Tên tài nguyên đặt theo aggregate: `/clubs`, `/clubs/:id/members`, `/events`,
`/events/:id/registrations`, `/budget-requests`, `/property-bookings`, `/complaints`,
`/approvals` (hộp thư người duyệt dùng chung), `/notifications`.

## 8. Client

Điều kiện kích hoạt router của ADR-002 **đã xảy ra** — UCMS có ba workspace theo vai trò và hàng
chục màn hình, nên `react-router` được thêm vào ngay, phần còn lại của ADR-002 giữ nguyên
(services → hooks → components, React Query cho server state, token Tailwind, file chuỗi i18next
tách theo module).

```text
client/src/pages/
  auth/          đăng nhập + callback OAuth
  student/       CLB của tôi, tuyển thành viên, sự kiện, đăng ký của tôi, phản hồi, khiếu nại
  club/          workspace quản trị CLB: thành viên, sự kiện, ngân sách, booking, báo cáo
  icpdp/         hộp thư phê duyệt, CLB, vi phạm, đánh giá, dashboard
```

Việc chặn route phản chiếu phía server: một lớp vỏ bố cục có hiểu vai trò quyết định *cái gì
được hiển thị*; server quyết định *cái gì được phép*. Client không bao giờ giữ lớp kiểm tra
quyền có thẩm quyền.

## 9. Triển khai

`docker compose`: `mongo` + `server` (Node, chỉ phục vụ API) + một host tĩnh cho client đã build
(Nginx hoặc chính Express với một mount tĩnh ở `/`). Biến môi trường được validate lúc khởi động
bởi `infra/config/` — nơi duy nhất đọc `process.env`; bí mật mới (`GOOGLE_CLIENT_ID/SECRET`,
`SESSION_SECRET`, `SMTP_*`) được thêm vào schema đó và vào `.env.example` cùng lúc.

## 10. Thuộc tính chất lượng

| Thuộc tính | Mục tiêu | Thiết kế này đạt được bằng cách nào |
|---|---|---|
| Khả năng kiểm thử | usecase unit-test được, không cần DB | port + bản giả in-memory (quy tắc đã có) |
| Khả năng audit | mọi thay đổi trạng thái đều quy được trách nhiệm | §4.3 + các version chỉ-ghi-thêm |
| Độ tin cậy của email | giao dịch nghiệp vụ không bao giờ hỏng vì SMTP | outbox §4.2 |
| Toàn vẹn dữ liệu | không đăng ký trùng / không đặt phòng trùng | unique index + guarded update §6 |
| Bảo mật | không tự chế xác thực, không NoSQL injection | Google OAuth, zod ở biên, kiểm tra phạm vi trong usecase |
| Chi phí thay đổi | module mới = 4 file server + 2 file client | lát cắt dọc §3 |

## 11. Cố ý chưa thiết kế

- Bộ máy đánh giá hiệu quả (M09) — scheme cấu hình được thuộc v2; MVP chỉ lưu kết quả đánh giá
  nhập tay.
- Lưu trữ file cho chứng từ tài chính — MVP lưu một liên kết ngoài; thêm object storage khi thực
  sự cần upload.
- Read model / database báo cáo cho dashboard — dùng aggregation pipeline thuần cho tới khi có
  một truy vấn chậm đo được.
- Triển khai nhiều instance, message queue, tầng cache — chưa cái nào có điều kiện kích hoạt
  (§D1, D2).

---

Mỗi quyết định D1–D2 và các mục §4–§6 sẽ trở thành một `ADR-NNN` trong `.sdd/rfcs/` khi nhóm
chấp nhận; tài liệu này là bản đề xuất, không phải bản ghi nhận.
