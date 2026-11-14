# TASKS: feat-club-evaluations

- [x] Chốt quyết định với người dùng (2026-10-10).
- [x] Domain: chỉ số, công thức D1–D8 kèm lineage, tổng có trọng số, xếp loại, kiểm tra chấm tay.
- [x] Use case: tổng quan kỳ, sinh nháp, sinh lại (giữ chấm tay) / bản sửa, chấm tay, chốt, mở lại, công bố cả kỳ.
- [x] Repository Mongo: thu thập chỉ số từ sự kiện, đăng ký, điểm danh, phản hồi, thành viên, đơn tuyển,
  lời mời, kinh phí, báo cáo, vi phạm; ghi nháp/kết quả, công bố + thông báo.
- [x] Route + OpenAPI + nối dây.
- [x] Unit test + integration test.
- [x] Seed demo: scheme mặc định đang áp dụng cho Fall 2026.
- [x] Client: tổng quan kỳ + chi tiết (dữ liệu nguồn, chấm tay, chốt, bản sửa), sidebar, i18n `en`/`vi`.
- [x] `npm run check` xanh, build client OK.
- [x] Kiểm tra trực quan trên trình duyệt (`/workspace/evaluations`, sinh bản nháp 48 CLB và mở chi tiết; quét giao diện 16/10/2026 trên DB QA: desktop en/sáng và mobile vi/tối, không lỗi console/API, không tràn ngang).

## Điều chỉnh báo cáo quá hạn và giao diện (14/11/2026)

- [x] Tự tính 0 điểm toàn kỳ cho báo cáo nộp muộn hoặc quá hạn chưa nộp; lưu lineage và lý do.
- [x] Không ghi đè mức 0 bằng chấm tay; kiểm tra lại lúc chốt và trước công bố.
- [x] Bắt buộc có tổng điểm và chốt đủ CLB; kiểm tra lại trạng thái trong transaction công bố.
- [x] Ẩn nút Sinh bản nháp / Sinh lại theo yêu cầu; không tự tạo đánh giá khi mở trang.
- [x] 13 test domain/integration liên quan đạt; gồm hạn chính xác, gia hạn, đóng đợt nộp, CLB mới, nháp qua hạn và bản thiếu tổng điểm.
- [x] npm run check toàn dự án đạt: constitution, lint, typecheck, 595 test server + 27 test client; Mongo integration chạy thật.
