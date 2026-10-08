# TASKS: feat-database-bootstrap

| Việc | Trạng thái |
|---|---|
| Phân tích toàn bộ collection, enum, field, index trong DBML và các lệch với template | xong |
| Tạo schema Mongoose và cơ chế sinh từ DBML | xong |
| Tách repository User demo sang collection riêng | xong |
| Lệnh khởi tạo idempotent và gọi đảm bảo index lúc server boot | xong; đã chạy trên Mongo thật (xem bên dưới) |
| Lệnh kiểm tra kết nối, collection và index để đối chiếu với Compass | xong; baseline hiện tại là `49/49`, `Missing indexes: 0` |
| Cấu hình kết nối local `127.0.0.1:27017/ucms` cho backend | xong trong `.env` bị Git bỏ qua và `.env.example` |
| Test ánh xạ, typecheck, build và unit test | xong |
| Chạy integration test với Mongo thật và `npm run check` đầy đủ | xong; 19/19 test xanh, lint + typecheck + constitution xanh |

## Kết quả chạy thật (2026-10-02)

> Đây là snapshot lịch sử trước khi UC05 bị rút ngày 2026-10-08. Baseline hiện tại có 48
> collection; `routingRuleSets` và `routingRules` không còn thuộc schema. Lệnh khởi tạo không
> xoá collection cũ nếu chúng vẫn tồn tại trong database local.

Môi trường: `mongod` 8.3.3 cài sẵn trên máy, lắng nghe `127.0.0.1:27017` (không dùng Docker
Compose vì cổng 27017 đã có service này giữ). Node v24.12.0.

| Bước | Kết quả |
|---|---|
| `npm install` | xong; `typescript-eslint` đã có, lint chạy được |
| `npm run db:init` (lần 1) | `UCMS database ucms ready: 50 collections` — database `ucms` chưa tồn tại trước đó |
| `npm run db:verify` | `UCMS collections: 50/50`, `Missing indexes: 0` |
| `npm run seed` | `seeded 3 of 3 demo users` vào `demoUsers` |
| `npm run db:init` (lần 2) | thành công; ảnh chụp collection / số document / tên index trước và sau giống hệt nhau, `demoUsers` vẫn 3 document |
| Trạng thái `ucms` | 51 collection (50 UCMS + `demoUsers`), 143 index tính cả `_id_` |
| `npm run test:integration -w server` | 2 file, 4 test xanh trên Mongo thật |
| `npm run check` | constitution ok, lint server + client xanh, typecheck xanh, 19/19 test xanh |
| `npm run build --workspaces` | server (`tsc`) và client (`vite build`) xanh |
| `GET /api/v1/health` | HTTP 200, `{"ok":true}`; `GET /api/v1/users` trả 3 user demo từ `demoUsers` |
| MongoDB Compass | đã mở với `mongodb://127.0.0.1:27017/ucms`; `currentOp` của `mongod` ghi nhận client `MongoDB Compass` đang kết nối. Chưa xác nhận bằng mắt trên giao diện Compass |

## Vấn đề còn mở

- **Trùng cổng 3000.** Một tiến trình Node của dự án khác trên máy đang giữ `*:3000` (IPv4). Backend
  vẫn boot được trên `:3000` nhưng chỉ nhận IPv6, nên `http://127.0.0.1:3000` rơi vào ứng dụng kia
  (404) còn `http://[::1]:3000` mới là UCMS. Lần kiểm chứng health dùng `PORT=3055`. Cần chọn: đổi
  `PORT` trong `.env` hoặc tắt tiến trình kia khi làm UCMS.
- `npm install` báo 4 lỗ hổng (3 moderate, 1 high) từ `npm audit`; chưa xử lý vì nằm ngoài phạm vi.
