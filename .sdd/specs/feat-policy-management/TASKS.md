# TASKS: feat-policy-management

- [x] Chốt cấu trúc `academicCalendar`, `reportDeadlines` và không seed giá trị nghiệp vụ; viết SPEC.
- [x] Domain và use case validate đủ chín nhóm, thứ tự thời gian, RBAC và ngày hiệu lực.
- [x] Mongo append-only repository, audit, query phiên bản hiện hành/lịch sử; integration test đã chạy với Mongo thật.
- [x] Route GET/POST, Zod, CSRF, OpenAPI và test HTTP/route contract.
- [x] Client ICPDP: service/hook/form/lịch sử, i18n và token hai theme; build kiểm tra (chờ kiểm tra trực quan).
- [x] Hoàn tất FR-UC04-06: liên kết quyết định với policy snapshot; từ chối policy làm vô hiệu quyết định đã ra và trả danh sách bản ghi ảnh hưởng, không cần đổi schema.
- [x] `npm run check` xanh; integration UC04 và quyết định hồ sơ chạy với Mongo thật; client production build xanh.
- [ ] Kiểm tra trực quan bằng trình duyệt ở desktop/mobile en/vi light/dark (browser control không khả dụng trong phiên hiện tại).
