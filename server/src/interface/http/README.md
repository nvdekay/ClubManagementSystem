# interface/http/

Adapter Express. Phần nối dây cố định: `server.ts` (app), `middleware.ts` (log, ánh xạ lỗi, và
`accessDenialAuditor` — chỗ duy nhất ghi audit một lần bị 403 của người đã đăng nhập, SEC-08),
`response.ts` (hợp đồng response — nơi DUY NHẤT gọi `res.json()`), `openapi.ts` (/docs). Route
mở rộng theo mẫu mỗi tài nguyên một file `<resource>-routes.ts`, gắn dưới `/api/v1`. Chỉ dịch
qua lại giữa HTTP và lời gọi usecase; không chứa logic nghiệp vụ.
