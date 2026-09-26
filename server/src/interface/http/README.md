# interface/http/

Adapter Express. Phần nối dây cố định: `server.ts` (app), `middleware.ts` (log + ánh xạ lỗi),
`response.ts` (hợp đồng response — nơi DUY NHẤT gọi `res.json()`), `openapi.ts` (/docs). Route
mở rộng theo mẫu mỗi tài nguyên một file `<resource>-routes.ts`, gắn dưới `/api/v1`. Chỉ dịch
qua lại giữa HTTP và lời gọi usecase; không chứa logic nghiệp vụ.
