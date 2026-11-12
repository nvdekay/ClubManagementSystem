# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Toàn bộ quy tắc của repo này nằm ở **`.rules/`**. File này không chứa quy tắc nào, chỉ có lệnh và
bản đồ code.

**Đọc [`.rules/README.md`](.rules/README.md) trước** — đó là điểm vào: cần đọc gì trước khi
đụng vào `server/` hay `client/`, các quy tắc áp dụng ở mọi nơi, và quy trình làm việc.
Cài đặt lần đầu và bảng xử lý lỗi: [`README.md`](README.md).

## Lệnh

```bash
docker compose up -d --wait   # Mongo 7, replica set rs0, 127.0.0.1:27017 (transaction cần replica set)
npm run dev                   # server :3000 + client :5173, Vite proxy /api; OpenAPI ở :3000/docs

npm run check                 # Definition of Done: constitution + lint + typecheck + test
npm run build --workspaces    # CI chạy thêm sau check

npm run test:unit -w server                                  # chỉ unit, không cần DB
npm test -w server -- tests/unit/openapi.test.ts             # một file (unit hoặc integration)
npm test -w server -- tests/unit/openapi.test.ts -t "routes" # lọc theo tên test

python3 server/src/infra/db/generate-ucms-schema.py          # sinh lại schema từ DBML
```

- Chỉ `server/` có test; `client/` không có test runner, được kiểm tra bằng lint + typecheck.
- `npm test` nạp `MONGO_URI` từ `.env`, nên chạy cả integration và cần Mongo đang bật. Không có
  `MONGO_URI` (job `check` trên CI) thì integration bị bỏ qua.
- Đừng chạy một file integration bằng `npm run test:integration -w server -- <file>`: script đã có
  sẵn filter `tests/integration`, vitest gộp filter nên cả thư mục vẫn chạy.
- `scripts/check-constitution.sh` chạy cả `tests/unit/openapi.test.ts`, nên route lệch OpenAPI
  làm fail ngay bước đầu của `check`, với thông báo `SEC-02`.

## Kiến trúc server

`server/src/main.ts` là composition root: dựng mọi repository Mongo rồi truyền vào
`buildApp(deps)` ở `interface/http/server.ts`. Hầu hết `deps` là tuỳ chọn và một route chỉ được
mount khi đủ dependency của nó. Thiếu bộ biến Auth thì chỉ khu công khai chạy. `server.ts` cũng lọc
tài liệu OpenAPI theo các cờ `has…`, nên `/docs` chỉ hiện route thực sự được mount.

Một endpoint mới đi qua nhiều chỗ:

1. Port trong `domain/<module>.ts`, usecase trong `usecase/`, hiện thực trong
   `infra/db/mongo-<module>-repository.ts`.
2. `interface/http/<module>-routes.ts`; dependency mới khai báo trong `buildApp`, mount có điều
   kiện, cờ `has…` nếu cần, và nối thật ở `main.ts`.
3. OpenAPI: `openapi.ts` hoặc các file `openapi-*.ts`.
4. Stub trong cả hai lời gọi `buildApp` đầy đủ của `tests/unit/openapi.test.ts`; test này duyệt
   route thật của Express để so với spec và kiểm tra mọi mutation đều có auth.

Cơ chế xuyên suốt:

- **Xác thực:** Google OAuth, phiên ở cookie `ucms_session` (collection `authSessions`), mutation
  cần header `X-CSRF-Token`. `authGuard` trong `auth-routes.ts` đặt `res.locals.actor`.
- **Phân quyền CLB:** kiểm tra ở tầng usecase qua `requireClubPermission`, không phải middleware.
  Club Leader có mọi permission, role UC23 mang permission riêng, mọi thành viên `Active` có hai quyền mặc định; danh mục ở `domain/access.ts`.
- **Job nền:** `interface/jobs/` chỉ hẹn giờ và gọi usecase idempotent; được start và stop trong
  `main.ts`, kể cả khi không có cấu hình Auth.
- **Thông báo:** inbox lọc theo workspace bằng danh sách audience ở `domain/notification.ts`; mã sự
  kiện chưa có trong danh sách sẽ âm thầm rơi vào inbox sinh viên. Email đi qua outbox +
  `notification-delivery-job`; Google SMTP khi đủ `SMTP_*` (bắt buộc ở production), log transport khi dev (`infra/mail/`).
- **Schema:** `docs/05-implementation/UCMS_Database_Design.dbml` →
  `infra/db/ucms-schema.generated.ts` (sinh tự động, không sửa tay) → `infra/db/ucms-models.ts`.
  Đổi số bảng hoặc enum thì cập nhật guard trong generator và `tests/unit/ucms-models.test.ts`.
- **Sắp xếp tên tiếng Việt** trong Mongo cần `.collation({ locale: "vi" })`.

## Kiến trúc client

- Toàn bộ route nằm ở `client/src/main.tsx`; `App.tsx` chỉ render `AuthWorkspacePage`.
- Hai shell: `PublicLayout` (khách) và `WorkspaceShell` (đăng nhập, sidebar theo workspace). URL chia
  theo workspace: `/student`, `/icpdp`, `/club/:clubId`, `/workspace/*`.
- `/auth/me` trả danh sách `workspaces`, mỗi workspace có `permissions`; UI ẩn hiện chức năng dựa
  vào đó, còn server vẫn tự kiểm tra.
- Key i18n được kiểm tra kiểu (`i18n/i18next.d.ts`): key ghép động kiểu `` `x.day${n}` `` không qua
  được `tsc`, hãy dùng mảng key `const` hoặc `switch`.

## Tra cứu nghiệp vụ

- `docs/SRS.md`: baseline yêu cầu (UC, BR, vòng đời thực thể).
- `docs/05-implementation/UC_CODE_MAPPING.md`: từ mã UC ra route server và trang client.
- `docs/CURRENT_IMPLEMENTATION.md`: phạm vi đã có trong code và khoảng trống còn lại.
- `.sdd/specs/feat-*/` và `.sdd/rfcs/ADR-*.md`: spec từng tính năng và quyết định kiến trúc.
