# Hướng dẫn cho agent

Toàn bộ quy tắc của repo này nằm ở **`.rules/`**. File này không chứa quy tắc nào.

**Đọc [`.rules/README.md`](.rules/README.md) trước** — đó là điểm vào: cần đọc gì trước khi
đụng vào `server/` hay `client/`, các quy tắc áp dụng ở mọi nơi, và quy trình làm việc.

## Lệnh tra nhanh

| Việc | Lệnh |
|---|---|
| Definition of Done (constitution + lint + typecheck + test) | `npm run check` |
| Chạy dev (server :3000 + client :5173) | `npm run dev` (cần `docker compose up -d --wait` trước) |
| Unit / integration test phía server | `npm run test:unit -w server` / `npm run test:integration -w server` |
| Một file test | `npx vitest run tests/unit/<file>.test.ts` (chạy trong `server/`) |
| Một test theo tên | `npx vitest run -t "<tên test>"` (chạy trong `server/`) |
| Build | `npm run build --workspaces` |

Integration test **tự bỏ qua** khi thiếu `MONGO_URI` (vitest đọc `../.env`), và cần Mongo
chạy ở chế độ replica set qua `docker compose`. Không có hai điều kiện này thì kết quả xanh
không có nghĩa là integration test đã chạy.
