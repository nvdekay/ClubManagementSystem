# TASKS: feat-recruitment-onboarding

- [x] Reconcile UC20/SRS, membership fields, default Members role, and existing unique index.
- [x] Lock onboarding and decline semantics.
- [x] Implement repository/use cases for Accepted → Onboarded or Declined.
- [x] Add transactional membership, role, audit, and notifications without schema edits.
- [x] Add secured API/OpenAPI and tests.
- [x] Add reviewer UI actions for accepted candidates; join date defaults to today, optional department is accepted by the API.
- [x] Add Mongo integration coverage and run checks/builds (37 files, 133 tests).
- [x] Add visual QA when browser tooling is available (`/club/:clubId/recruitment` và màn sàng lọc đơn; quét giao diện 16/10/2026 trên DB QA: desktop en/sáng và mobile vi/tối, không lỗi console/API, không tràn ngang).
