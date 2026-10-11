# SPEC: feat-post-event-reports

## Vấn đề
CLB nộp báo cáo sau sự kiện (UC33, do dev phía CLB làm) nhưng ICPDP chưa có chỗ thẩm định và đóng
sự kiện. UC34 cho officer đối chiếu kế hoạch đã duyệt với thực tế, rồi chấp nhận (đóng sự kiện), trả
về để sửa, hoặc chấp nhận kèm một phát hiện mở hồ sơ ở UC40; đồng thời ghi nhận sự kiện không nộp
báo cáo khi quá hạn (A1).

## Hành vi
- Chỉ `ICPDP_OFFICER` dùng được các endpoint dưới `/admin/event-reports`.
- Hạn nộp = `endAt` của sự kiện + `dueDaysAfterPeriodEnd` của mục `reportDeadlines` có
  `reportType = "POST_EVENT"` trong chính sách đang hiệu lực (BR20); mặc định 7 ngày khi chưa có.
- `GET /admin/event-reports` — hai danh sách:
  - `submitted`: `postEventReports` đang `Submitted`, nộp sớm trước; có cờ `lateFlag`, lần nộp.
  - `missing`: sự kiện CLB đang `Completed`, đã qua hạn nộp, có đề xuất UC25 trong hệ thống (sự kiện
    nhập sẵn không có quy trình duyệt nên không nợ báo cáo), không phải sự kiện nội bộ không kinh phí
    (BR53), và chưa có báo cáo nào ngoài `Draft`. Dòng đã ghi nhận có `violationId`.
- `GET /admin/event-reports/:id` — báo cáo + sự kiện (mục tiêu, sức chứa, địa điểm, điều kiện đã gắn ở
  UC26 A2), số liệu đóng băng của CLB đặt cạnh số liệu hệ thống hiện tại (đăng ký `Confirmed`, điểm
  danh, ngân sách, phản hồi), cờ `attendanceMismatch` (E1), quyết định và lịch sử audit.
- `POST /admin/event-reports/:id/decision` — báo cáo phải `Submitted` và sự kiện `Report Submitted`:
  - `Accept` (lý do không bắt buộc) → báo cáo `Accepted`, sự kiện `Closed`.
  - `Return` (bắt buộc lý do) → báo cáo `Returned for correction`, sự kiện về `Completed` (UC33 A2).
  - `AcceptWithFinding` (bắt buộc lý do + phát hiện: mức độ, tiêu đề, chi tiết) → như `Accept` và mở
    hồ sơ UC40 `REPORT_FINDING` (`originRefId` = sự kiện) trong cùng transaction, lưu `findingViolationId`.
  - E1: số `checkedIn` đóng băng khác số bản ghi `attendances` → chỉ cho `Return` (409 nếu chấp nhận).
  - Đóng task `POST_EVENT_REPORT`, audit `POST_EVENT_REPORT_<ACCEPTED|RETURNED|ACCEPTED_WITH_FINDING>`,
    thông báo cho ban chủ nhiệm CLB và người nộp.
- `POST /admin/event-reports/missing/:eventId` (A1) — chỉ khi sự kiện đang nợ báo cáo và đã quá hạn:
  mở hồ sơ UC40 `OVERDUE_REPORT` (`originRefId` = sự kiện, mức độ do officer chọn, ghi chú thành chứng
  cứ), audit `POST_EVENT_REPORT_MISSING`, thông báo ban chủ nhiệm. Ghi nhận lần hai → 409.
- Đánh giá CLB (UC42) giờ tính sự kiện `Report Submitted` và `Closed` là sự kiện đã diễn ra.

## Hợp đồng dữ liệu cho phía CLB (UC33 — dev phía CLB phải tuân theo)
Khi nộp (hoặc nộp lại sau `Returned for correction`), trong một transaction:
1. Điều kiện: sự kiện `Completed`, `events.attendanceFinalized = true` (UC32, E1 của UC33).
2. `postEventReports` (một bản ghi cho mỗi sự kiện, sửa tại chỗ khi nộp lại): `eventId`, `clubId`,
   `state: "Submitted"`, `versionNo` (+1 mỗi lần nộp lại), `lateFlag` (nộp sau hạn), `submittedBy`,
   `submittedAt`, `actualResult`, `incidents?`, `lessonsLearned?`, `evidence: [{ note?, url? }]`, và
   `preloadedFigures` đóng băng lúc nộp:
   `{ attendance: { registered, checkedIn }, budget?: { approvedTotal, disbursedTotal, expenseTotal },
   feedback?: { count, average? }, capturedAt }`. Khi nộp lại thì xoá `decisionOutcome`/`decisionReason`.
3. `events.state`: `Completed → Report Submitted`.
4. `approvalTasks`: `{ entityType: "POST_EVENT_REPORT", entityId: reportId, clubId, title, state: "Open",
   openedAt }` — mỗi lần nộp một task mới.
Phản hồi của officer nằm ở `postEventReports.decisionOutcome` (`Accept` | `Return` |
`AcceptWithFinding`), `decisionReason`, `decidedAt`, `findingViolationId`.

## Tiêu chí nghiệm thu
- [x] Người không có `ICPDP_OFFICER` nhận 403 ở mọi endpoint.
- [x] Chấp nhận báo cáo khớp số liệu → báo cáo `Accepted`, sự kiện `Closed`, task `Decided`.
- [x] Báo cáo có số điểm danh lệch không chấp nhận được, chỉ trả về được; trả về đưa sự kiện về
  `Completed` và thông báo người nộp.
- [x] Chấp nhận kèm phát hiện mở hồ sơ `REPORT_FINDING` gắn với sự kiện.
- [x] Danh sách quá hạn bỏ qua sự kiện chưa tới hạn, sự kiện nội bộ không kinh phí, sự kiện nhập sẵn;
  ghi nhận không nộp mở hồ sơ `OVERDUE_REPORT` đúng một lần.
- [ ] Hàng đợi/chi tiết/quyết định chạy trên desktop/mobile, `en`/`vi`, sáng/tối —
  typecheck/lint/build đã xanh; còn nghiệm thu trực quan thủ công.

## Ngoài phạm vi
UC33 (form nộp phía CLB), nhắc hạn/leo thang tự động (SCH), email outbox, hộp thư thông báo trong app.

## Changelog
- v0.1.0 (2026-10-10) — backend, API, UI, i18n, seed demo và test tự động; còn visual QA.
- v0.1.1 (2026-10-11) — **Thay thế** khi merge `main`: UC33/UC34 dùng bản của nhóm (`.sdd/specs/feat-post-event-report/`, version bất biến theo ADR-005). Code của SPEC này đã gỡ khỏi nhánh hiện hành; bản gốc nằm ở commit `0d74359`.
