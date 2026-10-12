# SPEC: feat-periodic-reports

## Vấn đề
CLB nộp báo cáo hoạt động định kỳ (UC38, do dev phía CLB làm) nhưng ICPDP chưa thẩm định được và
không thấy CLB nào chưa nộp. UC39 cho officer xem tình trạng báo cáo của mọi CLB trong một học kỳ, đặt
báo cáo cạnh số liệu của hệ thống, chấp nhận (có thể kèm ghi nhận cho kỳ đánh giá) hoặc trả về với nhận
xét có cấu trúc, và ghi nhận CLB không nộp đúng hạn (E1).

## Hành vi

**Nhóm chức năng trên sơ đồ ICPDP:** `Assess periodic report` nằm trong `Manage compliance`; `Request periodic report revision` và `Approve periodic report` nằm trong `Manage evaluation`. Hai chức năng sau là các nhánh quyết định của UC39, không tạo mã UC mới và không thay đổi module sở hữu `PeriodicReport` (M08). Phía CLB, `Revise and resubmit periodic report` là UC38 A2 trong `Manage reports`, cần permission `club.report.submit`.

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
2. Nộp lại sau `Returned for correction`: CLB đọc nhận xét từ audit `PERIODIC_REPORT_RETURNED`,
   sửa các phần chưa đúng mẫu hoặc còn thiếu. Trước khi cập nhật bản ghi hiện tại, giữ bản chụp
   version đã nộp và quyết định tương ứng theo CON-08; không ghi đè lịch sử. Bản hiện tại chuyển
   `state: "Submitted"`, `versionNo + 1`, xoá `decisionOutcome`/`observation` của quyết định cũ.
   Tạo task mới; ICPDP kiểm tra lại mẫu, nội dung và minh chứng đến khi `Accepted`.
   Việc lưu đủ snapshot các version và khép vòng UC38–UC39 cần được nghiệm thu; thay đổi tài liệu
   này không xác nhận phần triển khai phía CLB đã hoàn thành.
3. `approvalTasks`: `{ entityType: "PERIODIC_REPORT", entityId: reportId, clubId, title, state: "Open",
   openedAt }` — mỗi lần nộp một task mới.

## Tiêu chí nghiệm thu
- [ ] Kiểm tra theo mẫu áp dụng, đủ các mục bắt buộc và minh chứng; trả về chỉ rõ phần chưa đạt.
- [ ] UC38–UC39 lặp qua ít nhất hai lần trả về và nộp lại, giữ đọc được các version và quyết định cũ;
  chỉ báo cáo `Accepted` được dùng làm đầu vào UC42.
- [x] Tổng quan liệt kê mọi CLB phải báo cáo; CLB chưa nộp sau hạn là quá hạn.
- [x] Chi tiết đặt số liệu đóng băng cạnh số liệu hệ thống cùng kỳ.
- [x] Trả về bắt buộc nhận xét + phần cần sửa; chấp nhận lưu ghi nhận; quyết định lần hai → 409.
- [x] Ghi nhận không nộp chỉ khi quá hạn, mở hồ sơ `OVERDUE_REPORT` đúng một lần.
- [ ] Tổng quan/chi tiết/quyết định chạy trên desktop/mobile, `en`/`vi`, sáng/tối — typecheck/lint/build
  đã xanh; còn nghiệm thu trực quan thủ công.

## Ngoài phạm vi
UC38 (form nộp phía CLB), kỳ báo cáo năm học/tuỳ chỉnh, nhắc hạn/leo thang tự động (SCH-09), email.

## Changelog
- 2026-10-11 — đồng bộ I65: nhóm `Manage evaluation`, yêu cầu kiểm tra mẫu, nội dung và minh chứng,
  giữ version cũ và xét lại báo cáo đến khi chấp nhận; bổ sung tiêu chí chưa nghiệm thu.
- v0.1.0 (2026-10-10) — backend, API, UI, i18n, seed demo (thêm học kỳ Summer 2026 vào lịch demo) và test
  tự động; còn visual QA.
