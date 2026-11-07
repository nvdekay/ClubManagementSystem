# TASKS: feat-forbidden-access-audit

- [x] Domain: `AccessDenial`, port `AccessDenialAuditRepository`, hàm chọn đối tượng bị nhắm tới.
- [x] Usecase `recordAccessDenial`; `requireClubPermission` gắn `requiredPermission`.
- [x] Infra: ghi `auditLogs` (Mongo), nối ở `main.ts`.
- [x] Interface: `authGuard` lưu ngữ cảnh route; middleware `accessDenialAuditor` trước `errorHandler`.
- [x] Unit test (usecase, middleware) + test HTTP AC17 + integration Mongo.
- [x] Tài liệu: CURRENT_IMPLEMENTATION, CODE_DIAGRAM_GAPS, README `interface/http`, `infra/db`.
- [x] `npm run check` xanh.
