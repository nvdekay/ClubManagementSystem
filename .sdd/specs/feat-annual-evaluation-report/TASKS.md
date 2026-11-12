# TASKS: feat-annual-evaluation-report

| Công việc | Người phụ trách | Trạng thái |
|-----------|-----------------|------------|
| Domain: phân tích `periodCode` thành mùa + năm, thứ tự `SPRING → SUMMER → FALL` | — | xong |
| Domain: kiểu báo cáo năm + hàm tổng hợp (điểm năm, xếp loại, xu hướng, tổng quan) + validate đầu vào | — | xong |
| Domain/Infra: port và truy vấn đánh giá `Published` mới nhất theo CLB và kỳ, ngưỡng scheme, danh sách CLB | — | xong |
| Domain/Infra: truy vấn báo cáo định kỳ `Accepted` của năm (tài chính, thành tích) | — | xong |
| Usecase: `annualYears`, xem trước và xuất báo cáo, ghi audit `ANNUAL_REPORT` | — | xong |
| Infra: ghi file `pdf` sáu phần và `xlsx` ba sheet | — | xong |
| HTTP: hai route dưới `/admin/exports/annual-report`, mount trong `buildApp` | — | xong |
| OpenAPI: hai endpoint mới, trường `annualYears`, stub trong `tests/unit/openapi.test.ts` | — | xong |
| Client: mục "Báo cáo năm học" ở trang xuất dữ liệu ICPDP | — | xong |
| Seed demo: đánh giá `Published` và báo cáo định kỳ `Accepted` cho `Spring 2026`, `Summer 2026`, `Fall 2026` | — | xong |
| Test: unit cho phân tích kỳ và hàm tổng hợp, integration cho route và audit | — | xong |
| Docs: thêm FR-UC55-11 (A2) vào `docs/SRS.md` và `UC_CODE_MAPPING.md` | — | xong |
