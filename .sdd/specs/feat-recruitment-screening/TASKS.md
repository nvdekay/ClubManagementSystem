# TASKS: feat-recruitment-screening

- [x] Reconcile UC18/SRS state transitions, permission, capacity, and existing DBML fields.
- [x] Lock campaign completion and rejection-reason semantics.
- [x] Implement domain port, reviewer use cases, transitions, bulk operations, capacity, and auto-completion.
- [x] Implement Mongo transactions with audit/notifications using existing schema.
- [x] Add HTTP routes/OpenAPI/permission and contract tests.
- [x] Add club reviewer queue/detail UI, filters, actions, i18n, responsive/theme states.
- [x] Add unit/integration tests for transitions, ACL, and completion.
- [ ] Add focused integration cases for capacity and bulk/waitlist promotion.
- [x] Reviewer với `club.application.review` mở tệp đính kèm của đơn đã nộp qua URL ký ngắn hạn; sửa kiểm tra id tệp theo UUID ở cả route của chủ đơn (2026-10-09).
- [x] Run `npm run check` and server/client builds (37 files, 133 tests); visual QA unavailable in this session.
