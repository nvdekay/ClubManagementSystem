# Luồng code gửi đề án sự kiện và ICPDP duyệt đề án

Đối chiếu mã nguồn tại commit `f5d4b7c`, ngày 18/11/2026. Số dòng bên dưới thuộc phiên bản này;
khi code thay đổi, hãy tìm theo tên hàm. Các liên kết dùng đường dẫn tương đối để đọc trên GitHub.

Phạm vi: UC25 gửi đề xuất sự kiện của CLB và UC26 ICPDP thẩm định, ghi quyết định.
Tên trong code là `icpdp`, role là `ICPDP_OFFICER`.

## 1. Tổng quan frontend → backend → database

```text
CLB chọn file DOCX
  → Frontend trích xuất dữ liệu đề án
  → Lưu bản nháp
  → Upload tài liệu
  → Nộp phiên bản mới nhất
  → Backend tạo eventProposalVersions + approvalTasks
  → ICPDP tải danh sách chờ và mở hồ sơ
  → Nhận xử lý (claim)
  → Ghi quyết định
  → Backend cập nhật sự kiện, booking, ngân sách, audit và thông báo
  → Frontend cập nhật cache và hiển thị kết quả
```

Các tầng có trách nhiệm khác nhau:

| Tầng | Trách nhiệm |
|---|---|
| Trang React | Nhận thao tác, quản lý form, hiển thị kết quả |
| Hook React Query | Chọn service, quản lý trạng thái request và cache |
| Service frontend | Dựng HTTP request, đọc response và lỗi |
| HTTP route backend | Xác thực, parse/validate dữ liệu truyền tải, gọi usecase |
| Usecase | Kiểm tra quyền và điều kiện nghiệp vụ đầu vào |
| Mongo repository | Kiểm tra trạng thái thực tế, transaction và lưu dữ liệu |

Backend tạo repository thật ở [server/src/main.ts:102](../../server/src/main.ts#L102)
và [main.ts:136](../../server/src/main.ts#L136), rồi truyền vào router.
Router được gắn dưới `/api/v1` tại [server.ts:295](../../server/src/interface/http/server.ts#L295)
và [server.ts:330](../../server/src/interface/http/server.ts#L330).

## 2. CLB mở trang và chọn file đề án

Route frontend được đăng ký tại [client/src/main.tsx:120](../../client/src/main.tsx#L120):

```text
/club/:clubId/events/new
/club/:clubId/events/:eventId/edit
→ ClubEventProposalPage()
```

[ClubEventProposalPage():489](../../client/src/pages/club/ClubEventProposalPage.tsx#L489):

1. Lấy `clubId`, `eventId` từ URL.
2. Kiểm tra quyền `club.event.manage` trong workspace của đúng CLB, dòng 494–495.
3. Nếu sửa hồ sơ, gọi `useClubEvent()` để tải chi tiết, dòng 496.
4. Chỉ cho sửa `Draft` hoặc `Revision Requested`, dòng 523.
5. Render `ProposalForm`, truyền dữ liệu và `csrfToken`, dòng 542.

Khi chọn file, `onChange` ở [dòng 388](../../client/src/pages/club/ClubEventProposalPage.tsx#L388) gọi:

```text
pickFile(file)                            dòng 194
→ proposalFileType(file, ["docx"])         dòng 204
→ importEventProposal(file)               dòng 208
→ setImported(result)                     dòng 211
→ setDraft(result.input)                  dòng 212
→ setPendingFile({ file, mimeType })       dòng 213
```

[importEventProposal():145](../../client/src/utils/eventProposalImport.ts#L145) kiểm tra file
DOCX không rỗng, tối đa 10 MB, đọc XML và relationships trong file, rồi chạy
`mapProposalDocument(parseWordXml(xml, rels))` để ánh xạ thành dữ liệu sự kiện.

**Lúc chọn file, trình duyệt mới trích xuất dữ liệu; file chờ upload khi lưu hoặc nộp.**
Chi tiết mapping Word: [EVENT_PROPOSAL_IMPORT.md](EVENT_PROPOSAL_IMPORT.md).

## 3. Bấm “Lưu và nộp”: frontend chạy ba bước

Nút ở [ClubEventProposalPage.tsx:478](../../client/src/pages/club/ClubEventProposalPage.tsx#L478):

```tsx
onClick={() => void persist(true)}
```

[persist():234](../../client/src/pages/club/ClubEventProposalPage.tsx#L234) điều phối tuần tự:

| Bước | Dòng | Lời gọi và ý nghĩa |
|---|---:|---|
| Lưu hồ sơ | 244 | Có `activeId`: mutation `kind: "action"`, `action: "save"`; chưa có: `kind: "create"` |
| Giữ kết quả | 257 | Gán `result.event` vào `savedEvent`, giữ ID nháp để thử lại |
| Upload file | 267 | Mutation `kind: "upload-document"` nếu có `pendingFile` |
| Lấy version mới | 274 | `savedEvent = uploaded.event` vì upload tăng version |
| Nộp duyệt | 292 | Mutation `kind: "action"`, `action: "submit"`, body `{ expectedVersion: savedEvent.version }` |
| Hoàn tất | 299 | Toast thành công và điều hướng về danh sách |

Lưu nháp bằng submit form gọi `persist(false)` ở dòng 307–309; hàm dừng trước bước nộp.
Nếu upload lỗi, form giữ ID nháp và file đang chờ để thử lại, tránh tạo trùng hồ sơ.

Các lệnh `mutation.mutateAsync()` đi vào
[useClubEventMutation():24](../../client/src/hooks/useClubEvents.ts#L24):

```text
kind: "create"          → createClubEvent()
kind: "upload-document" → uploadEventProposalDocument()
kind: "action"          → actOnClubEvent()
```

Service nằm trong [clubEvents.ts:107](../../client/src/services/clubEvents.ts#L107)
và [clubEvents.ts:152](../../client/src/services/clubEvents.ts#L152):

| Thao tác | HTTP request | Body |
|---|---|---|
| Tạo nháp | `POST /api/v1/clubs/:clubId/events` | Dữ liệu sự kiện |
| Lưu nháp cũ | `POST /api/v1/clubs/:clubId/events/:id/save` | Dữ liệu sự kiện + `expectedVersion` |
| Upload | `POST /api/v1/clubs/:clubId/events/:id/proposal-document` | File gốc |
| Nộp | `POST /api/v1/clubs/:clubId/events/:id/submit` | `{ expectedVersion }` |

Request JSON gửi `Content-Type: application/json` và `X-CSRF-Token`.
Upload gửi `Content-Type` của file, `X-Filename` và `X-CSRF-Token`.
Hàm `request()` ở [clubEvents.ts:74](../../client/src/services/clubEvents.ts#L74) ghép URL,
gọi `apiFetch()`, kiểm tra HTTP lỗi và trả `response.data`.

## 4. Backend nhận request gửi đề án

[authGuard():52](../../server/src/interface/http/auth-routes.ts#L52) chạy trước các handler ghi dữ liệu:

```text
Đọc cookie ucms_session → resolve session → tải user
→ kiểm tra tài khoản Locked → kiểm tra X-CSRF-Token
→ đặt user vào res.locals.actor → next()
```

Các đường gọi cụ thể:

| Request | HTTP route | Usecase | Mongo repository |
|---|---|---|---|
| Tạo nháp | [club-event-routes.ts:134](../../server/src/interface/http/club-event-routes.ts#L134) | [createClubEvent():49](../../server/src/usecase/club-event.ts#L49) | [create():327](../../server/src/infra/db/mongo-club-event-repository.ts#L327) |
| Lưu/nộp | [actions:138, handler:152](../../server/src/interface/http/club-event-routes.ts#L138) | [actOnClubEvent():61](../../server/src/usecase/club-event.ts#L61) | [act():356](../../server/src/infra/db/mongo-club-event-repository.ts#L356) |
| Upload | [club-event-routes.ts:185](../../server/src/interface/http/club-event-routes.ts#L185) | [uploadEventProposalDocument():124](../../server/src/usecase/club-event.ts#L124) | `repo.act(..., { kind: "attach-document", document }, ...)` |

Route parse body bằng Zod; usecase kiểm tra quyền `club.event.manage`.

Tạo nháp: repository mở transaction, kiểm tra quyền ghi, gọi `assess()`, tạo `events`
với `state: "Draft"`, `currentRevisionNo: 0`, đồng bộ booking và ghi audit `EVENT_DRAFT_CREATED`.

Upload: route đọc raw body tối đa 10 MB. Usecase kiểm tra file, hồ sơ tồn tại và trạng thái
`Draft`/`Revision Requested`, gọi `storage.uploadProposalDocument()` tại dòng 134 rồi
`repo.act()` để gắn metadata tài liệu. Repository tăng version và ghi audit
`EVENT_PROPOSAL_DOCUMENT_UPLOADED` tại dòng 371.

### Xử lý submit trong transaction

[act():356](../../server/src/infra/db/mongo-club-event-repository.ts#L356):

```text
mongoose.connection.transaction()
→ assertEventWriteAccess()                              dòng 358
→ findOneAndUpdate(id + clubId + expectedVersion)         dòng 359
→ tăng __v; không khớp thì báo conflict
→ đọc payload và tài liệu đã lưu                         dòng 362
→ kiểm tra Draft / Revision Requested                    dòng 368
→ kiểm tra hạn chỉnh sửa                                 dòng 369
→ assertProposalDocumentPresent()                        dòng 377
→ assess(..., submitting = true, ...)                    dòng 378
→ submitVersion(...)                                    dòng 385
```

[assess():72](../../server/src/infra/db/mongo-club-event-repository.ts#L72) kiểm tra CLB
đang hoạt động, dữ liệu sự kiện, học kỳ, thời gian báo trước, nghĩa vụ quá hạn và xung đột lịch.
Thời gian báo trước hiện được truyền là **168 giờ** tại [main.ts:136](../../server/src/main.ts#L136).
Xung đột loại `Blocking Conflict` chặn nộp.

[submitVersion():156](../../server/src/infra/db/mongo-club-event-repository.ts#L156):

| Dòng | Tác động |
|---:|---|
| 158 | Tăng `revisionNo` |
| 165 | Chọn `Pending Approval`; nếu có phiên bảo vệ hoạt động thì `Under Review` |
| 166 | Tạo `eventProposalVersions`, chốt payload gồm tài liệu, ngân sách và người nộp |
| 169 | Cập nhật `events`, `currentRevisionNo`, kết quả xung đột; bỏ hạn sửa cũ |
| 172 | Tạo `approvalTasks`: `entityType: "EVENT_PROPOSAL"`, `state: "Open"`, có thông tin SLA định tuyến |
| 178 | Liên kết booking với sự kiện |
| 179 | Đồng bộ booking của các buổi sang `Under Review` |
| 181 | Ghi audit `EVENT_PROPOSAL_SUBMITTED` |

**Điểm nối giữa hai phía là `approvalTasks`: CLB submit tạo task; màn ICPDP đọc task đó.**

## 5. ICPDP tải hàng đợi, chi tiết và nhận hồ sơ

Route frontend ở [main.tsx:147](../../client/src/main.tsx#L147):

```text
/workspace/event-proposals      → EventProposalQueuePage
/workspace/event-proposals/:id  → EventProposalReviewPage
```

### Tải hàng đợi

```text
EventProposalQueuePage.tsx:26 → useEventProposalQueue()
→ fetchEventProposalQueue()
→ GET /api/v1/admin/event-proposals
→ listEventProposalReviews()
→ officer() kiểm tra role ICPDP_OFFICER
→ repo.listOpen()
```

Điểm code: [trang:26](../../client/src/pages/icpdp/EventProposalQueuePage.tsx#L26),
[hook:13](../../client/src/hooks/useEventProposalReviews.ts#L13),
[service:137](../../client/src/services/eventProposalReviews.ts#L137),
[route:66](../../server/src/interface/http/event-proposal-review-routes.ts#L66),
[usecase:84](../../server/src/usecase/event-proposal-review.ts#L84),
[repository:180](../../server/src/infra/db/mongo-event-proposal-review-repository.ts#L180).

`listOpen()` tìm task `Open`, ghép sự kiện ở trạng thái phù hợp và tổng ngân sách của revision hiện tại.
Hàng đợi còn hỗ trợ task yêu cầu hủy, nhưng tài liệu này tập trung vào đề án.

### Tải chi tiết

[EventProposalReviewPage.tsx:60](../../client/src/pages/icpdp/EventProposalReviewPage.tsx#L60)
gọi `useEventProposal(id, isOfficer)`:

```text
useEventProposal() → fetchEventProposal(id)
→ GET /api/v1/admin/event-proposals/:id
→ getEventProposalReview() → repo.find() → detail()
```

[detail():96](../../server/src/infra/db/mongo-event-proposal-review-repository.ts#L96)
ghép sự kiện, task, phiên bản đã nộp, quyết định cũ, CLB/nghĩa vụ, booking, ngân sách và lịch sử bảo vệ.
Tài liệu ICPDP xem mặc định là bản nộp mới nhất: route
[club-event-routes.ts:202](../../server/src/interface/http/club-event-routes.ts#L202) gọi
[reviewEventProposalDocumentAccess():155](../../server/src/usecase/club-event.ts#L155),
kiểm tra officer rồi lấy tài liệu từ revision để cấp URL truy cập.

### Nhận xử lý (claim)

Trang hàng đợi có thể nhận hồ sơ khi mở tại
[EventProposalQueuePage.tsx:69](../../client/src/pages/icpdp/EventProposalQueuePage.tsx#L69).
Trong trang chi tiết, nút nhận ở dòng 659 gọi
[claim():249](../../client/src/pages/icpdp/EventProposalReviewPage.tsx#L249):

```text
action.mutateAsync({ kind: "claim", id, csrfToken })
→ useEventProposalAction() → claimEventProposal()
→ POST /api/v1/admin/event-proposals/:id/claim
→ claimEventProposalReview() → repo.claim()
```

Handler: [route:74](../../server/src/interface/http/event-proposal-review-routes.ts#L74).
Usecase: [claimEventProposalReview():100](../../server/src/usecase/event-proposal-review.ts#L100).
Mongo: [claim():209](../../server/src/infra/db/mongo-event-proposal-review-repository.ts#L209).

Repository mở transaction, kiểm tra task còn mở và chưa thuộc officer khác, gán `assigneeId`,
chuyển `Pending Approval` → `Under Review` tại dòng 235 và ghi audit nhận xử lý.

## 6. ICPDP ghi quyết định

Khi người dùng là người phụ trách task đang mở, trang render
[ProposalDecisionPanel ở dòng 663](../../client/src/pages/icpdp/EventProposalReviewPage.tsx#L663).

Nút ở [ProposalDecisionPanel.tsx:371](../../client/src/pages/icpdp/ProposalDecisionPanel.tsx#L371)
gọi [submitDecision():153](../../client/src/pages/icpdp/ProposalDecisionPanel.tsx#L153):

1. `field.touchAll()` kiểm tra các trường.
2. `askConfirm()` yêu cầu người thao tác xác nhận.
3. Dựng input tại dòng 164: `outcome`, `reason`, `reviewNote`.
4. Nếu `Request revision`: thêm `sections`, `revisionDeadlineAt`.
5. Nếu `Approve`: thêm `conditions`, `budgetLines` với số tiền và `fundingDecision`.
6. Nhánh thông thường gọi `reviewAction.mutateAsync({ kind: "decide", ... })` tại dòng 188.

```text
useEventProposalAction()                         hooks/useEventProposalReviews.ts:25
→ decideEventProposal()                          services/eventProposalReviews.ts:152
→ POST /api/v1/admin/event-proposals/:id/decision
→ authGuard()
→ parsed(eventReviewDecisionBody, req.body)       event-proposal-review-routes.ts:79
→ decideEventProposalReview()                    usecase/event-proposal-review.ts:106
→ repo.decide()                                  mongo-event-proposal-review-repository.ts:251
→ transaction
→ applyProposalDecisionInSession()               event-defense-helpers.ts:168
```

Liên kết: [hook](../../client/src/hooks/useEventProposalReviews.ts#L25),
[service](../../client/src/services/eventProposalReviews.ts#L152),
[route](../../server/src/interface/http/event-proposal-review-routes.ts#L78),
[usecase](../../server/src/usecase/event-proposal-review.ts#L106),
[repository](../../server/src/infra/db/mongo-event-proposal-review-repository.ts#L251).

Usecase gọi `officer()` xác minh quyền, `normalizedEventDecision()` chuẩn hóa và kiểm tra
dữ liệu theo outcome; tải hồ sơ; nếu duyệt thì kiểm tra `approvedBudget()` trước khi ghi.
Yêu cầu sửa phải có lý do, mục cần sửa và hạn tương lai. Các quyết định khác ngoài duyệt
cũng phải có lý do. Repository kiểm tra lại dữ liệu cần thiết trong transaction.

### Hàm thực sự cập nhật database

[applyProposalDecisionInSession():168](../../server/src/infra/db/event-defense-helpers.ts#L168):

| Dòng | Xử lý |
|---:|---|
| 186 | Tìm sự kiện `Under Review`/`Re-defense Pending` và task `Open` thuộc đúng officer |
| 198 | Kiểm tra phiên bảo vệ đang hoạt động hoặc đã hoàn tất |
| 224 | Lấy revision đang được duyệt |
| 230 | Kiểm tra và tính các dòng ngân sách được duyệt |
| 239 | Tạo `approvalDecisions` với outcome, lý do, ghi chú, điều kiện, officer |
| 255 | Xác định `nextState` |
| 263 | Cập nhật `events.state`, hạn sửa hoặc điều kiện duyệt |
| 277 | Chuyển task cũ thành `Decided` |
| 278 | Nếu `Re-defense`, tạo task `Open` mới |
| 291 | Nếu có phiên đã bảo vệ chờ kết quả, cập nhật outcome của phiên |
| 305 | Nếu duyệt: kiểm tra lại tài sản, blackout, xung đột và duyệt booking |
| 363 | Nếu yêu cầu sửa: chuyển booking liên quan sang `Revision Requested` |
| 369 | Nếu từ chối: giải phóng booking liên quan |
| 384 | Tạo/cập nhật `eventBudgets` nếu có các dòng ngân sách |
| 445 | Ghi `auditLogs` |
| 458 | Tạo `notifications` cho người nộp, trạng thái `Queued` |

Các thay đổi nằm trong cùng transaction: kiểm tra thất bại thì rollback.
Thông báo được đưa vào hàng đợi; việc tạo bản ghi `Queued` chưa đồng nghĩa email đã gửi xong.

| Outcome | Trạng thái sự kiện |
|---|---|
| `Approve` | `Approved` |
| `Reject` | `Rejected` |
| `Request revision` | `Revision Requested` |
| `Re-defense` | `Re-defense Pending` |

## 7. Nhánh quyết định sau bảo vệ

Trang truyền `postDefense = true` nếu phiên hiện tại là `DEFENDED` và chưa có outcome,
tại [EventProposalReviewPage.tsx:666](../../client/src/pages/icpdp/EventProposalReviewPage.tsx#L666).
Panel khi đó chạy dòng 185 thay vì dòng 188:

```text
defenseAction.mutateAsync({ kind: "decideAfter", ... })
→ useEventDefenseActions()
→ decideAfterDefense() ở service frontend
→ POST /api/v1/admin/event-proposals/:id/defense/decision
→ decideAfterDefense() ở usecase backend
→ defenseRepo.decideAfterDefense()
→ applyProposalDecisionInSession(..., { requireDefendedSession: true })
```

Điểm code: [panel:185](../../client/src/pages/icpdp/ProposalDecisionPanel.tsx#L185),
[hook:92](../../client/src/hooks/useEventDefense.ts#L92),
[service:350](../../client/src/services/eventDefense.ts#L350),
[route:213](../../server/src/interface/http/event-defense-routes.ts#L213),
[usecase:229](../../server/src/usecase/event-defense.ts#L229),
[repository:682](../../server/src/infra/db/mongo-event-defense-repository.ts#L682).

Hai nhánh cùng dùng hàm ghi quyết định. Nhánh sau bảo vệ bắt buộc có phiên `DEFENDED`
chưa có kết quả. Khi còn phiên bảo vệ hoạt động, backend chặn `Approve`, `Reject` và `Re-defense`;
yêu cầu sửa phải có hạn phù hợp với lịch bảo vệ. `Re-defense` cần phiên đã bảo vệ hoàn tất.

## 8. Response về frontend và vòng sửa/nộp lại

Backend trả hồ sơ mới qua [ok():5](../../server/src/interface/http/response.ts#L5),
theo envelope `{ statusCode, message, data, timestamp }`. Service frontend lấy `data`.

Sau quyết định thông thường,
[useEventProposalAction():37](../../client/src/hooks/useEventProposalReviews.ts#L37):

```text
setQueryData(["event-proposal-reviews", "detail", eventId], detail)
→ invalidateQueries(["event-proposal-reviews", "queue"])
→ React render trạng thái mới, danh sách chờ tải lại
```

Sau quyết định bảo vệ, [useEventDefense.ts:100](../../client/src/hooks/useEventDefense.ts#L100)
invalidate chi tiết đề án, hàng đợi và các query liên quan đến bảo vệ.
Sau thao tác CLB, [useClubEvents.ts:39](../../client/src/hooks/useClubEvents.ts#L39)
invalidate nhóm cache `club-events`.

Nếu `Request revision`, CLB mở lại route edit, sửa Word và import lại, rồi chạy lại
`persist(true)`. `submitVersion()` tạo revision và task mới, giữ các phiên bản đã nộp trước đó.

**`Approved` là đã duyệt đề án.** CLB còn thao tác `publish` riêng để chuyển sang `Upcoming`:
[mongo-club-event-repository.ts:392](../../server/src/infra/db/mongo-club-event-repository.ts#L392).

## 9. Các điểm đặt breakpoint để lần luồng

| Muốn xem gì | Breakpoint |
|---|---|
| Trích xuất Word thành dữ liệu | `pickFile()` dòng 208 và `importEventProposal()` dòng 145 |
| Ba bước lưu → upload → nộp | `persist()` dòng 244, 267, 292 |
| Hook chọn service | `useClubEventMutation()` dòng 32 |
| Backend nhận submit | `club-event-routes.ts` dòng 153 |
| Kiểm tra version và trạng thái | `mongo-club-event-repository.ts` dòng 359, 368 |
| Tạo task xuất hiện bên ICPDP | `submitVersion()` dòng 172 |
| ICPDP nhận task | `mongo-event-proposal-review-repository.ts` dòng 231, 235 |
| Dựng payload quyết định | `ProposalDecisionPanel.tsx` dòng 164, 188 |
| Backend kiểm tra quyết định | `decideEventProposalReview()` dòng 109 |
| Ghi kết quả và dữ liệu liên quan | `applyProposalDecisionInSession()` dòng 239, 263, 277, 305, 384, 458 |

Tài liệu mô tả đường đi của mã nguồn đã đọc, không phải biên bản chạy thử end-to-end với database.
