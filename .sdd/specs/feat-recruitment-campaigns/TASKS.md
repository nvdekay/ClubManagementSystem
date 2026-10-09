# TASKS: feat-recruitment-campaigns

- [x] Đối chiếu UC16, BR01/09/11/54, DBML, policy calendar, permissions và luồng UC06.
- [x] Chốt cửa sổ nhận đơn phải nằm trọn trong đúng một kỳ `academicCalendar` với người dùng.
- [x] Chốt overlap: cảnh báo + xác nhận publish campaign riêng, không gộp; khóa SPEC.
- [x] Domain model/port và use cases create/update/publish/cancel, authorization và policy.
- [x] Mongo repository, transaction, audit/notification; giữ nguyên applications khi đóng campaign.
- [x] HTTP routes, validation, OpenAPI và route contract tests.
- [x] UI campaign management cho UC16, i18n `en`/`vi`, responsive/theme/loading/error.
- [x] Unit/integration tests cho quyền, calendar, overlap, public visibility và cancel.
- [x] `npm run check`, production builds; nghiệm thu trực quan chưa chạy (không có browser tool trong phiên).
