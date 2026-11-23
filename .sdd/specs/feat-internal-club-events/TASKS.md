# TASKS: feat-internal-club-events

Điều chỉnh giao diện ngày 2026-11-17:
- [x] Chỉ giữ nút tạo đề xuất sự kiện; gỡ liên kết và route tạo sự kiện nội bộ, sửa hướng dẫn en/vi.
- [x] Cập nhật SPEC và tài liệu trang CLB; giữ quản lý sự kiện nội bộ hiện có.
- [x] `npm run check` xanh: constitution, lint, typecheck; server 424 test và client 33 test qua. 199 integration test bỏ qua do thiếu `MONGO_URI`; chưa nghiệm thu trên trình duyệt.

- [x] Đối chiếu plan với code, tạo SPEC (ghi các điều chỉnh so với plan).
- [x] Diagram `.drawio` và tài liệu đặc tả (Phần 1 của plan).
- [x] DBML `eventState` + sinh lại `ucms-schema.generated.ts`.
- [x] Domain: trạng thái, input nội bộ, rule 24h, Phương án B, dashboard, check-in, export.
- [x] Usecase + Mongo repository: tạo/sửa/công bố/đổi lịch/huỷ, phòng UC58, scheduler.
- [x] Các repository liên quan: UC02, UC24, UC38, UC42, UC14/UC15, đặt phòng/tài sản.
- [x] Route, OpenAPI, stub trong `openapi.test.ts`.
- [x] Unit + integration test; cập nhật seed demo.
- [x] Client: trang sự kiện nội bộ, 2 nút, badge/hành động, Phương án B, biểu đồ 2 chuỗi, i18n.
- [x] `npm run check` và `npm run build --workspaces`. (Server: typecheck, lint, `npm test -w server` 113 file / 602 test và `check-constitution.sh` đã xanh; còn chờ client.)

Kiểm chứng ngày 2026-11-14: `npm run check` xanh (server 602 test/113 file, client 27 test);
`npm run build --workspaces` thành công; 14 file `.drawio` hợp lệ. Chưa nghiệm thu trên trình duyệt.
