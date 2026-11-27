# Hướng dẫn cho agent

Toàn bộ quy tắc của repo này nằm ở **`.rules/`**. File này không chứa quy tắc nào.

**Đọc [`.rules/README.md`](.rules/README.md) trước** — đó là điểm vào: cần đọc gì trước khi
đụng vào `server/` hay `client/`, các quy tắc áp dụng ở mọi nơi, và quy trình làm việc.

## Lệnh tra nhanh

| Việc | Lệnh |
|---|---|
| Definition of Done (constitution + lint + format + typecheck + test) | `npm run check` |
| Chạy dev (server :3000 + client :5173) | `npm run dev` (cần `docker compose up -d --wait` trước) |
| Unit / integration test phía server | `npm run test:unit -w server` / `npm run test:integration -w server` |
| Một file test | `npm test -w server -- tests/unit/<file>.test.ts` |
| Một test theo tên | `npm test -w server -- tests/unit/<file>.test.ts -t "<tên test>"` |
| Unit test phía client | `npm test -w client` |
| Test giao diện Playwright (cần Mongo, không nằm trong `check`) | `npm run test:e2e` |
| Build | `npm run build --workspaces` |

Integration test **tự bỏ qua** khi thiếu `MONGO_URI` (`server/vitest.config.ts` nạp `.env` ở gốc), và cần Mongo
chạy ở chế độ replica set qua `docker compose`. Không có hai điều kiện này thì kết quả xanh
không có nghĩa là integration test đã chạy.
