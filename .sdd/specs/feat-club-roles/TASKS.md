# TASKS: feat-club-roles

- [x] Đối chiếu UC23 (BR47/49/54/55/56), resolver quyền, schema `clubPositions` / `clubPositionAssignments` / `clubRoleStructureVersions`; ghi SPEC.
- [ ] Domain `club-role.ts`: kiểu, port, quy tắc E1–E7; resolver áp permission role Members.
- [ ] Use case `club-role.ts` + unit test cho mọi tiêu chí nghiệm thu.
- [ ] Mongo repository (transaction, phiên bản mới, audit, thông báo) + integration test.
- [ ] Route, OpenAPI, nối dây `server.ts` / `main.ts`.
- [ ] Seed demo: role "Phụ trách Hậu cần" ở HEBE, gán cho một thành viên.
- [ ] Client: service + hook + tab "Vai trò" trong `ClubSettingsPage` (danh sách role, form, gán/thu hồi, so sánh phiên bản), i18n `en`/`vi`.
- [ ] `npm run check` xanh.
- [ ] Nghiệm thu trực quan thủ công (sáng/tối, `en`/`vi`).
