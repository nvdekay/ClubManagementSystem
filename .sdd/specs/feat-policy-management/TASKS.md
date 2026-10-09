# TASKS: feat-policy-management

- [x] Chốt cấu trúc `academicCalendar`, `reportDeadlines` và không seed giá trị nghiệp vụ; viết SPEC.
- [x] Domain và use case validate đủ chín nhóm, thứ tự thời gian, RBAC và ngày hiệu lực.
- [x] Mongo append-only repository, audit, query phiên bản hiện hành/lịch sử; viết integration test (chờ chạy với Mongo thật ở bước nghiệm thu).
- [x] Route GET/POST, Zod, CSRF, OpenAPI và test HTTP/route contract.
- [x] Client ICPDP: service/hook/form/lịch sử, i18n và token hai theme; build kiểm tra (chờ kiểm tra trực quan).
- [ ] Hoàn tất FR-UC04-06: liên kết quyết định với policy snapshot; từ chối policy làm vô hiệu quyết định đã ra và trả danh sách bản ghi ảnh hưởng. Chưa triển khai vì module quyết định chưa có; chưa thay schema liên quan.
- [ ] Chạy `npm run check` với Mongo thật, kiểm tra UI bằng trình duyệt ở desktop/mobile en/vi light/dark.
