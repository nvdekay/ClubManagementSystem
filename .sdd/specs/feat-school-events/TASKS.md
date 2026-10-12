# TASKS: feat-school-events

- [x] Chốt quyết định với người dùng, kể cả đổi schema (2026-10-10).
- [x] DBML: `clubId` không bắt buộc ở `eventRegistrations`, `attendances`, `eventFeedbacks`; chạy lại generator.
- [x] Luồng sinh viên nhận sự kiện không thuộc CLB: danh sách/chi tiết công khai, đăng ký, check-in, phản hồi.
- [x] Domain + use case: chuẩn hoá sự kiện, học kỳ, hạn phản hồi, mã check-in.
- [x] Repository Mongo: tạo (cảnh báo trùng lịch), mời/mời lại, thu hồi, công bố, hết hạn lời mời.
- [x] Route + OpenAPI + nối dây; job `event-lifecycle` hết hạn lời mời.
- [x] Unit test + integration test (gồm sinh viên đăng ký và check-in sự kiện cấp trường).
- [x] Seed demo: ngày hội CLB đang chờ phản hồi (HEBE đã nhận lời) + buổi tập huấn đã công bố.
- [x] Client: danh sách, form tạo (kiểm tra trùng lịch tức thì), chi tiết, sidebar, i18n `en`/`vi`.
- [x] `npm run check` xanh, build client OK.
- [ ] Kiểm tra trực quan trên trình duyệt.
