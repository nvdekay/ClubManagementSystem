# TASKS: feat-club-role-management

- [x] Domain: danh mục 16 mã, quyền mặc định, quyền giữ riêng, `isClubLeaderSeat`, `isClubLeader`, resolver theo BR47.
- [x] Snapshot quyền (`mongo-access-repository`, re-check trong transaction `club-event-access`) mang `code`, `permissionCodes`, `isDefaultMemberRole`.
- [x] Khôi phục và sửa domain/usecase/route/repository UC23 từ `42ea892^`: mô tả role, `ROLE_EDIT`, thông báo `CLUB_ROLE_UPDATED`, khoá ghế Leader, role Members không mang permission.
- [x] DBML: `clubPositions.description`, ghi chú BR54/BR55; sinh lại schema.
- [x] OpenAPI + nối dây `server.ts`/`main.ts` + stub `openapi.test.ts`.
- [x] Upgrader dữ liệu idempotent chạy lúc khởi động + integration test.
- [x] Rà `isBoardSeat`/`isLeaderRole`: miễn tái xác nhận UC21 A2 chỉ cho ghế Leader.
- [x] Unit + integration test (resolver, UC23 E1–E7, phiên bản/audit/thông báo, workspace role).
- [x] Client: `ClubRolesPage`, route, menu, mô tả role, UC24 `heldByMe`, i18n en/vi, lịch sử cơ cấu ICPDP.
- [x] Tài liệu: CURRENT_IMPLEMENTATION, HLD, SRS §A3 và §bảo mật, CODE_DIAGRAM_GAPS, UC_CODE_MAPPING, README.
- [x] `npm run check` xanh.
