# TASKS: feat-event-proposal-review

- [x] Chốt quyết định với người dùng, ghi SPEC kèm hợp đồng dữ liệu UC25 cho dev phía CLB (2026-10-10).
- [x] Domain + use case: validate quyết định, số duyệt từng dòng ngân sách, điều kiện phê duyệt.
- [x] Repository Mongo: hàng đợi, chi tiết (nghĩa vụ quá hạn, booking, ngân sách trong kỳ), claim, decide
  (tạo `eventBudgets`), job hết hạn sửa + `Upcoming → Ongoing → Completed`.
- [x] Route + OpenAPI + nối dây `server.ts`/`main.ts` + job `event-lifecycle`.
- [x] Unit test + integration test.
- [x] Seed demo: 4 đề xuất chờ duyệt (3 có kinh phí, 1 đã qua một lần yêu cầu sửa) + 1 ngân sách đã duyệt trong kỳ.
- [x] Client: hàng đợi + màn thẩm định, sidebar "Duyệt đề xuất sự kiện", i18n `en`/`vi`.
- [x] `npm run check` xanh, build client OK.
- [ ] Kiểm tra trực quan trên trình duyệt (sáng/tối, vi/en, mobile).
