# interface/http/

Adapter Express. Phần nối dây cố định: `server.ts` (app), `middleware.ts` (log, ánh xạ lỗi, và
`accessDenialAuditor` — chỗ duy nhất ghi audit một lần bị 403 của người đã đăng nhập, SEC-08),
`request.ts` (`actor(res)` lấy người gọi đã qua `authGuard`, `parse(schema, value, what)` validate dữ
liệu vào bằng zod — route dùng chung hai hàm này, không tự viết lại; `objectId` là schema id Mongo 24 ký tự hex dùng chung; `pageQuery` là query `page`/`pageSize` dùng chung
của các danh sách phân trang phía server, mặc định 20 và tối đa 100, route `.extend()` thêm bộ lọc
riêng rồi `.strict()`, response là `{ items, total, page, pageSize }` theo `Page<T>` ở
`domain/paging.ts`), `rate-limit.ts` (giới hạn tần suất request theo IP, cửa sổ cố định trong bộ nhớ; `buildApp` gắn một mức cho
`/api/v1/auth` và một mức cho toàn `/api/v1` khi có `deps.rateLimits`),
`response.ts` (hợp đồng response — nơi DUY NHẤT gọi `res.json()`), `openapi.ts` (/docs; phần spec theo nhóm tính năng tách ra `openapi-*.ts`, các mảnh dùng chung —
`envelope`, `jsonOk`, `apiError`, `jsonBody`, `ApiError` — ở `openapi-shared.ts`),
`security-headers.ts` (CSP, Permissions-Policy, HSTS và các header bảo mật chung; /docs có CSP riêng),
`static-client.ts` (phục vụ bản build của client kèm SPA fallback khi có `CLIENT_DIST_DIR`). Router
đã đăng nhập khai báo deps kế thừa `SessionDeps` và lấy cặp middleware `const { read, write } =
guards(deps)` từ `auth-routes.ts` (read không cần CSRF, write bắt CSRF). Route
mở rộng theo mẫu mỗi tài nguyên một file `<resource>-routes.ts`, gắn dưới `/api/v1`. Chỉ dịch
qua lại giữa HTTP và lời gọi usecase; không chứa logic nghiệp vụ.
