# TASKS: feat-post-event-reports

- [x] Domain + use case: hạn nộp theo chính sách, kiểm tra lệch điểm danh (E1), chuẩn hoá quyết định.
- [x] Repository Mongo: hàng đợi + quá hạn, chi tiết đối chiếu, quyết định, ghi nhận không nộp (A1).
- [x] Helper mở hồ sơ UC40 trong transaction (`infra/db/violation-case.ts`).
- [x] Route + OpenAPI + nối dây `server.ts`/`main.ts`.
- [x] Đánh giá CLB đếm cả sự kiện `Report Submitted`/`Closed`.
- [x] Unit test + integration test.
- [x] Seed demo: 1 báo cáo khớp số liệu, 1 báo cáo lệch điểm danh, 1 sự kiện quá hạn chưa nộp.
- [x] Client: 2 danh sách + trang thẩm định, sidebar, i18n `en`/`vi`.
- [x] `npm run check` xanh, build client OK.
- [ ] Kiểm tra trực quan trên trình duyệt.
