# TASKS: feat-club-roles — ĐÃ HUỶ

> Toàn bộ feature được thay bởi `feat-fixed-club-roles`; task QA UI role cũ không còn áp dụng.
>
> **Ghi chú 17/10/2026:** code của feature này (domain/usecase `club-role.ts`, route, tab "Vai trò") đã bị gỡ khỏi repo khi chuyển sang role cố định Leader/Member (13/10/2026); UC23 đã rút khỏi phạm vi. Các checkbox dưới đây chỉ là lịch sử.

- [x] Đối chiếu UC23 (BR47/49/54/55/56), resolver quyền, schema `clubPositions` / `clubPositionAssignments` / `clubRoleStructureVersions`; ghi SPEC.
- [x] Domain `club-role.ts`: kiểu, port, quy tắc E1–E7; resolver áp permission role Members.
- [x] Use case `club-role.ts` + unit test cho mọi tiêu chí nghiệm thu.
- [x] Mongo repository (transaction, phiên bản mới, audit, thông báo) + integration test.
- [x] Route, OpenAPI, nối dây `server.ts` / `main.ts`.
- [x] Seed demo: role "Phụ trách Hậu cần" ở HEBE, gán cho một thành viên.
- [x] Client: service + hook + tab "Vai trò" trong `ClubSettingsPage` (danh sách role, form, gán/thu hồi, so sánh phiên bản), i18n `en`/`vi`.
- [x] `npm run check` xanh: 57 file, 231 test (gồm integration với Mongo thật), lint, typecheck; build client xanh (2026-10-10).
- [x] Huỷ nghiệm thu UI role tự tạo vì API/UI đã bị gỡ.

- [x] Sửa race khi gán role: serialize bằng `__v` có sẵn; kiểm tra lại người giữ và gán trùng trong transaction; integration test gán đồng thời.
- [x] Kiểm tra sau sửa Wave 1: `npm run check` xanh, 61 test files / 259 tests, gồm integration Mongo (2026-10-10).

- [x] Thành viên được xem danh sách vai trò và quyền ở chế độ chỉ đọc; API không trả holders, members, versions cho người không có club.role.manage.
