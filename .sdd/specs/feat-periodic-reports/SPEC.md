# SPEC: feat-periodic-reports

## Vấn đề
CLB nộp báo cáo hoạt động định kỳ (UC38, do dev phía CLB làm) nhưng ICPDP chưa thẩm định được và
không thấy CLB nào chưa nộp. UC39 cho officer xem tình trạng báo cáo của mọi CLB trong một học kỳ, đặt
báo cáo cạnh số liệu của hệ thống, chấp nhận (có thể kèm ghi nhận cho kỳ đánh giá) hoặc trả về với nhận
xét có cấu trúc, và ghi nhận CLB không nộp đúng hạn (E1).

## Hành vi
- Chỉ `ICPDP_OFFICER`; API dưới `/admin/periodic-reports`; trang `/workspace/periodic-reports`.
- Kỳ báo cáo = học kỳ trong lịch năm học của chính sách (`periodType = SEMESTER`). Hạn = `endAt` của học
  kỳ + `dueDaysAfterPeriodEnd` của mục `reportDeadlines` `PERIODIC` (mặc định 7 ngày); dòng đã có báo cáo
  dùng `dueAt` của chính báo cáo.
- `GET /admin/periodic-reports?period=` — mặc định học kỳ gần nhất đã kết thúc. Mỗi CLB `Active`,
  `Suspended`, `Dissolving` (và CLB khác đã có báo cáo kỳ đó) là một dòng: trạng thái báo cáo hoặc chưa
  nộp, hạn, nộp trễ, lần nộp, `overdue` (quá hạn mà chưa `Submitted`/`Accepted`/`Returned`), hồ sơ đã mở.
- `GET /admin/periodic-reports/:id` — thuyết minh, kế hoạch kỳ sau, minh chứng, số liệu đóng băng đặt cạnh
  số liệu hệ thống cùng CLB và học kỳ (sự kiện đã tổ chức/bị huỷ, lượt điểm danh, thành viên đang hoạt động
  hiện tại, số khoản kinh phí + tổng duyệt + đã tạm ứng), quyết định và lịch sử.
- `POST /admin/periodic-reports/:id/decision` — báo cáo phải `Submitted`:
  - `Accept` (+ `observation` tuỳ chọn, A1) → `Accepted`, lưu `observation` cho kỳ đánh giá.
  - `Return` (bắt buộc `reason` + ≥ 1 phần cần sửa: `narrative`, `nextPlan`, `figures`, `evidence`,
    `other`) → `Returned for correction`.
  - Lưu `decisionOutcome`, `decidedBy`, `decidedAt`; nhận xét và các phần cần sửa nằm ở audit
    `PERIODIC_REPORT_RETURNED` (`reason`, `after.sections`) vì `periodicReports` không có cột cho chúng.
  - Đóng task `PERIODIC_REPORT`, audit `PERIODIC_REPORT_<ACCEPTED|RETURNED>`, thông báo ban chủ nhiệm và
    người nộp (payload có `reason`, `sections`, `observation`).
- `POST /admin/periodic-reports/missing` (E1) `{ clubId, periodCode, severity, note? }` — chỉ khi đã quá hạn
  và CLB chưa nộp: mở hồ sơ UC40 `OVERDUE_REPORT`, audit `PERIODIC_REPORT_MISSING` trên CLB
  (`after.periodCode`, `after.violationId`) để không ghi nhận lần hai, thông báo ban chủ nhiệm.
- Báo cáo được chấp nhận đã là đầu vào của UC42 (chỉ số `reportsDue`/`reportsOnTime`).

## Hợp đồng dữ liệu cho phía CLB (UC38 — dev phía CLB phải tuân theo)
1. `periodicReports` (một bản ghi cho mỗi CLB + học kỳ, unique): `clubId`, `periodCode` (mã học kỳ của
   lịch năm học), `periodType: "SEMESTER"`, `dueAt` (theo công thức ở trên), `narrative`, `nextPlan`,
   `evidence: [{ note?, url? }]`, `state` `Draft` → `Submitted`, `versionNo` (+1 mỗi lần nộp lại),
   `lateFlag` (nộp sau `dueAt`), `submittedBy`, `submittedAt`, và `preloadedFigures` đóng băng lúc nộp:
   `{ events: { completed, cancelled }, members: { active }, attendance: { total },
   finance: { budgets, approvedTotal, disbursedTotal }, capturedAt }`.
2. Nộp lại sau `Returned for correction`: sửa tại chỗ, `state: "Submitted"`, `versionNo + 1`, xoá
   `decisionOutcome`/`observation`. Nhận xét của ICPDP đọc từ audit `PERIODIC_REPORT_RETURNED` mới nhất.
3. `approvalTasks`: `{ entityType: "PERIODIC_REPORT", entityId: reportId, clubId, title, state: "Open",
   openedAt }` — mỗi lần nộp một task mới.

## Tiêu chí nghiệm thu
- [x] Tổng quan liệt kê mọi CLB phải báo cáo; CLB chưa nộp sau hạn là quá hạn.
- [x] Chi tiết đặt số liệu đóng băng cạnh số liệu hệ thống cùng kỳ.
- [x] Trả về bắt buộc nhận xét + phần cần sửa; chấp nhận lưu ghi nhận; quyết định lần hai → 409.
- [x] Ghi nhận không nộp chỉ khi quá hạn, mở hồ sơ `OVERDUE_REPORT` đúng một lần.
- [ ] Tổng quan/chi tiết/quyết định chạy trên desktop/mobile, `en`/`vi`, sáng/tối — typecheck/lint/build
  đã xanh; còn nghiệm thu trực quan thủ công.

## Ngoài phạm vi
UC38 (form nộp phía CLB), kỳ báo cáo năm học/tuỳ chỉnh, nhắc hạn/leo thang tự động (SCH-09), email.

## Changelog
- v0.1.0 (2026-10-10) — backend, API, UI, i18n, seed demo (thêm học kỳ Summer 2026 vào lịch demo) và test
  tự động; còn visual QA.
