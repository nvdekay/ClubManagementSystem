# SPEC: feat-event-proposal-review

## Vấn đề
CLB nộp đề xuất sự kiện (UC25, do dev phía CLB làm) nhưng ICPDP chưa có chỗ nào để thẩm định. UC26
khép kín luồng: một officer nhận đề xuất, xem đủ bối cảnh (thời gian, địa điểm, rủi ro, xung đột,
booking đính kèm, nghĩa vụ quá hạn của CLB, ngân sách xin và ngân sách CLB đã được duyệt trong kỳ),
rồi ra đúng một quyết định. Ngân sách không có luồng riêng: officer chốt số tiền duyệt cho từng dòng
ngay khi phê duyệt đề xuất.

## Hành vi
- Chỉ `ICPDP_OFFICER` dùng được các endpoint dưới `/admin/event-proposals`.
- `GET /admin/event-proposals` — hàng đợi: approval task `EVENT_PROPOSAL` đang `Open` mà sự kiện ở
  `Pending Approval` / `Under Review`; cũ trước. Mỗi dòng có tên CLB, tiêu đề, thời gian, bản sửa,
  tổng tiền xin, mức rủi ro, kết quả xung đột, người đang nhận.
- `POST /admin/event-proposals/:id/claim` — officer nhận task; `Pending Approval → Under Review`
  (FR-UC26-01), audit `EVENT_PROPOSAL_REVIEW_CLAIMED`. Task đã có người khác nhận → 409.
- `GET /admin/event-proposals/:id` — chi tiết: sự kiện, mọi bản sửa (payload + dòng ngân sách),
  quyết định đã có, CLB (trạng thái + nghĩa vụ quá hạn: quyết toán, hoàn trả, báo cáo định kỳ),
  booking đính kèm (chỉ xem — UC46 quyết định riêng, FR-UC26-06), ngân sách khác của CLB cùng
  học kỳ, và `EventBudget` nếu đã duyệt.
- `POST /admin/event-proposals/:id/decision` — đúng một kết quả cho mỗi task:
  - `Request revision`: bắt buộc lý do, ≥ 1 phần cần sửa (`schedule`, `venue`, `content`, `risk`,
    `budget`, `other`) và hạn sửa ở tương lai → `Revision Requested`, ghi `revisionDeadlineAt`.
  - `Reject`: bắt buộc lý do → `Rejected`.
  - `Approve` → `Approved` (chỉ duyệt; công bố là UC27 phía CLB). Có thể kèm tối đa 10 điều kiện
    (A1), lưu vào `events.approvalConditions` để UC34 kiểm lại. Nếu bản sửa có dòng ngân sách thì
    bắt buộc gửi số duyệt cho **từng** dòng (số nguyên VND, 0 ≤ duyệt ≤ xin); dòng duyệt thấp hơn
    số xin bắt buộc có lý do. Hệ thống tạo `eventBudgets` ở `Approved` với `lines {category,
    requestedAmount, approvedAmount, reason}`, `requestedTotal`, `approvedTotal`,
    `approvedByDecisionId`, `periodCode = semesterCode`.
  - Quyết định, đổi trạng thái sự kiện, đóng task (`Decided`), audit `EVENT_PROPOSAL_<STATE>` và
    notification cho người nộp bản sửa hiện tại commit trong một transaction; lặp/đồng thời → 409.
- Job `event-lifecycle` (khởi động + mỗi giờ):
  - `Revision Requested` quá `revisionDeadlineAt` → `Expired` (E2), audit + báo người nộp.
  - `Upcoming` đã tới `startAt` → `Ongoing`; `Upcoming`/`Ongoing` đã qua `endAt` → `Completed`.
- E1: UC15 huỷ đề xuất của CLB bị tạm ngừng → sự kiện `Cancelled`, rơi khỏi hàng đợi; claim/quyết
  định khi đó trả 409.

## Hợp đồng dữ liệu cho phía CLB (UC25 — dev phía CLB phải tuân theo)
Khi nộp (hoặc nộp lại sau `Revision Requested`), trong một transaction:
1. `events`: `organizerType: "CLUB"`, `clubId`, `clubName`, `title`, `objective`, `startAt`,
   `endAt`, `semesterCode`, `venueText` hoặc `propertyId`, `audienceScope` (`PUBLIC` |
   `MEMBERS_ONLY`), `capacity`, `riskCategory` (`LOW` | `MEDIUM` | `HIGH`), `conflictResult` +
   `conflictDetail` (BR15), `state: "Pending Approval"`, `currentRevisionNo` = số bản sửa mới nhất.
2. `eventProposalVersions` (chỉ ghi thêm): `{ eventId, revisionNo, submittedBy, submittedAt,
   conflictResult, payload, budgetLines, requestedBudgetTotal }` với
   - `payload`: `{ title, objective, plan, startAt, endAt, venueText?, propertyId?, capacity,
     audienceScope, riskCategory, riskNote?, facilityNeeds?, occurrences?: [{ startAt, endAt }],
     registrationForm? }` — bản chụp bất biến của đúng những gì CLB đã nộp.
   - `budgetLines`: `[{ category, amount, purpose, plannedItems? }]` (amount là số nguyên VND > 0),
     hoặc không có khi không xin kinh phí; `requestedBudgetTotal` = tổng `amount`.
3. `approvalTasks`: `{ entityType: "EVENT_PROPOSAL", entityId: eventId, clubId, title: <tiêu đề>,
   state: "Open", openedAt }` — **mỗi lần nộp một task mới** (BR16/WF-05).
4. Booking đính kèm (UC45): `propertyBookings.eventId = eventId`.
Sự kiện `MEMBERS_ONLY` không có ngân sách được ghi nhận thẳng `Approved` (BR53), không tạo task.

## Tiêu chí nghiệm thu
- [x] Người không có `ICPDP_OFFICER` nhận 403 ở mọi endpoint.
- [x] Claim chuyển `Pending Approval → Under Review` và gán task; officer khác không chiếm được.
- [x] Revision/Reject validate lý do; Revision validate phần cần sửa + hạn tương lai.
- [x] Approve có ngân sách: thiếu số duyệt / vượt số xin / giảm mà không lý do → 400; hợp lệ thì
  tạo đúng một `eventBudgets` với số xin và số duyệt tách biệt.
- [x] Approve không ngân sách không tạo `eventBudgets`; điều kiện được lưu vào sự kiện.
- [x] Mỗi task chỉ có một quyết định; quyết định lần hai → 409.
- [x] Job chuyển `Revision Requested` quá hạn → `Expired` và `Upcoming → Ongoing → Completed`.
- [ ] Hàng đợi/chi tiết/quyết định chạy trên desktop/mobile, `en`/`vi`, sáng/tối —
  typecheck/lint/build đã xanh; còn nghiệm thu trực quan thủ công.

## Ngoài phạm vi
UC25 (form nộp đề xuất phía CLB), UC27 công bố, UC46 quyết định booking, hạn mức ngân sách theo kỳ
(chính sách chưa có giá trị này — chỉ hiển thị ngân sách CLB đã được duyệt trong kỳ), email outbox,
hộp thư thông báo trong app.

## Changelog
- v0.2.0 (2026-10-10) — hoàn tất backend, job, API, UI, i18n, seed demo và test tự động; còn visual QA.
- v0.1.0 (2026-10-10) — chốt quyết định với người dùng (chỉ duyệt → `Approved`; ngân sách duyệt theo
  dòng ngay trong UC26; job lịch sự kiện cùng slice).
