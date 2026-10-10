# TASKS: feat-club-roles

- [x] Đối chiếu UC23 (BR47/49/54/55/56), resolver quyền, schema `clubPositions` / `clubPositionAssignments` / `clubRoleStructureVersions`; ghi SPEC.
- [x] Domain `club-role.ts`: kiểu, port, quy tắc E1–E7; resolver áp permission role Members.
- [x] Use case `club-role.ts` + unit test cho mọi tiêu chí nghiệm thu.
- [x] Mongo repository (transaction, phiên bản mới, audit, thông báo) + integration test.
- [x] Route, OpenAPI, nối dây `server.ts` / `main.ts`.
- [x] Seed demo: role "Phụ trách Hậu cần" ở HEBE, gán cho một thành viên.
- [x] Client: service + hook + tab "Vai trò" trong `ClubSettingsPage` (danh sách role, form, gán/thu hồi, so sánh phiên bản), i18n `en`/`vi`.
- [x] `npm run check` xanh: 57 file, 231 test (gồm integration với Mongo thật), lint, typecheck; build client xanh (2026-10-10).
- [ ] Nghiệm thu trực quan thủ công (sáng/tối, `en`/`vi`).
