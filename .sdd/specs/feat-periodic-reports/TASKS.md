# TASKS: feat-periodic-reports

- [x] Domain + use case: hạn theo chính sách, học kỳ mặc định, chuẩn hoá quyết định.
- [x] Repository Mongo: tổng quan theo kỳ, chi tiết đối chiếu, quyết định, ghi nhận không nộp (E1).
- [x] Route + OpenAPI + nối dây `server.ts`/`main.ts`.
- [x] Unit test + integration test.
- [x] Seed demo: học kỳ Summer 2026, 2 báo cáo chờ (1 trễ), 1 đã chấp nhận, còn lại quá hạn.
- [x] Client: tổng quan + trang thẩm định, sidebar, i18n `en`/`vi`.
- [x] `npm run check` xanh, build client OK.
- [x] Kiểm tra trực quan trên trình duyệt (16/10/2026: màn thẩm định ICPDP desktop en/sáng; màn CLB thêm mobile vi/tối).
- [x] Đồng bộ tài liệu I65: hai nhánh yêu cầu sửa và duyệt thuộc `Manage evaluation`; giữ UC38/UC39.
- [x] Nghiệm thu kiểm tra mẫu, nội dung, minh chứng và vòng trả về–nộp version mới–xét lại đến khi duyệt,
  đối chiếu được version cũ và quyết định tương ứng (CON-08). 16/10/2026 trên app chính, DB QA: CLB tạo bản nháp Fall 2026, nộp v1; ICPDP trả về mục Evidence; CLB bổ sung liên kết, nộp v2; ICPDP chấp nhận; báo cáo khoá, lịch sử hiện cả v1 và v2 kèm quyết định. Không lỗi console/API.

## Phía CLB còn thiếu (đối chiếu 15/10/2026)

- [x] UC38: API/UI tạo draft, nộp và nộp lại version sau Return (xong ở `feat-club-periodic-submission`, 15/10/2026).
- [x] Nghiệm thu vòng UC38 → UC39 → UC38 với app chính, không chỉ dữ liệu seed (xem mục trên).
