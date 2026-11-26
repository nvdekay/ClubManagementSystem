# client/

Workspace frontend (React 19 + Vite). Mã nguồn ở [`src/`](src/README.md); quy tắc ở
[`.rules/frontend.md`](../.rules/frontend.md).

| Lệnh (trong `client/` hoặc `-w client` từ gốc) | Làm gì |
|---|---|
| `npm run dev` | Vite dev server `:5173`, proxy `/api` sang `PORT` của `.env` gốc |
| `npm run build` | Typecheck + build production vào `dist/` |
| `npm run typecheck` | `tsc` cho `src/` và cho `e2e/` |
| `npm test` | Unit test vitest (`src/**/*.test.ts`), nằm trong `npm run check` |
| `npm run test:e2e` | Kiểm thử end-to-end bằng Playwright, **không** nằm trong `check` — xem [`e2e/README.md`](e2e/README.md) |

`playwright.config.ts` là cấu hình của `test:e2e`; `proposal-preview.html` là trang thứ hai của
bản build (khung xem trước tài liệu đề xuất sự kiện).
