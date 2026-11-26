# client/e2e/

Kiểm thử end-to-end giao diện bằng **Playwright** (Chromium): mở trang thật trong trình duyệt,
chạy trên server thật và một database Mongo riêng được seed sẵn. Bổ sung cho `npm run check`
(chỉ lint + typecheck + unit test), **không** nằm trong `check` để `check` vẫn nhanh.

## Chạy

```bash
docker compose up -d --wait        # Mongo replica set, như khi phát triển
npx playwright install chromium    # một lần cho mỗi máy (cài trình duyệt)
npm run test:e2e                   # từ thư mục gốc (hoặc trong client/)
```

Khoảng 40 giây trên máy local: seed DB ~20 giây, build client, rồi 20 test chạy song song 4 worker.
Lọc test: `npm run test:e2e -- icpdp` hoặc `npm run test:e2e -- -g "policy"`.
Báo cáo HTML khi lỗi: `npx playwright show-report e2e/playwright-report` (trong `client/`); mỗi
test lỗi có trace, ảnh chụp và `error-context.md` trong `e2e/test-results/`.

Không đọc `.env` của bạn: mọi biến server nằm trong `setup/env.ts`. Mặc định:

| Thứ | Giá trị | Đổi bằng |
|---|---|---|
| Database | `mongodb://127.0.0.1:27017/ucms-e2e` (bị xoá rồi seed lại mỗi lần chạy, xoá khi xong) | `E2E_DB_NAME` (phải bắt đầu bằng `ucms-e2e`), `E2E_MONGO_BASE` |
| API | `:3300` | `E2E_SERVER_PORT` |
| Client | `:5300` (bản build production qua `vite preview`, proxy `/api` như dev) | `E2E_CLIENT_PORT` |

Khi đang viết test, giữ sẵn một stack đang chạy rồi đặt `E2E_REUSE_SERVERS=1`: Playwright dùng
lại server ở hai cổng trên và **không** xoá database khi xong.

## Cách hoạt động

1. `webServer` (trong `playwright.config.ts`) chạy `setup/prepare-db.ts`: xoá DB e2e, tạo
   collection + index, chạy bootstrap Auth giống server, rồi các seed có sẵn theo đúng thứ tự
   (`seed` → `seed:demo --owner=e2e.officer@fpt.edu.vn` → `seed:dashboard` →
   `seed:periodic-reports`), cuối cùng thêm 22 ca vi phạm và 1 yêu cầu tạm ngừng của HEBE qua
   usecase thật (để hàng đợi có trang 2). Sau đó start server (`src/main.ts`) và `vite preview`.
2. `setup/global-setup.ts` chạy `setup/mint-sessions.ts`: cấp phiên thật qua session service
   của server (cùng `SESSION_SECRET`) cho từng vai, ghi cookie `ucms_session` (path `/api/v1`,
   httpOnly, SameSite Lax — giống callback OAuth) vào `.auth/<vai>.json`. **Không có đường tắt
   đăng nhập nào trong code production**; CSRF token vẫn lấy từ `/auth/me` như thường.
3. `fixtures.ts` là API dùng chung của mọi spec (`import { test, expect } from '../fixtures'`):
   - `test.use({ role: 'officer' | 'leader' | 'member' | 'student' })` chọn phiên; không đặt thì là khách.
   - Mỗi test có IP riêng (header `X-Forwarded-For` trên `/api/v1/**`, server chạy `TRUST_PROXY=1`)
     nên giới hạn 20 request/phút của `/api/v1/auth/*` không dồn giữa các test.
   - Ngôn ngữ cố định `en`, theme `light`; stylesheet Google Fonts trả rỗng (không cần mạng).
   - Mọi `pageerror`, `console.error`, request lỗi và chunk JS/CSS tải lỗi đều làm test fail.
     Test nào chủ động gây lỗi (404, 401) thì khai báo bằng `pageIssues.allow(/mẫu/)`.
4. `setup/global-teardown.ts` xoá DB e2e.

## Vai và dữ liệu

| Vai | Tài khoản | Ghi chú |
|---|---|---|
| `officer` | `e2e.officer@fpt.edu.vn` | ICPDP officer (bootstrap) |
| `leader` | cùng tài khoản trên | `seed:demo` cho owner làm Chủ nhiệm HEBE; phiên riêng |
| `member` | `havnhe170005@fpt.edu.vn` | Thành viên Active của HEBE, không giữ chức vụ |
| `student` | `lannvhe180003@fpt.edu.vn` | Sinh viên chưa tham gia CLB nào |

Cloudinary và SMTP để trống nên không có gì rời khỏi máy (email đi vào log transport);
`seed:demo` vì vậy bỏ qua ba hồ sơ thành lập CLB cần tải file.

## Thư mục

| Đường dẫn | Là gì |
|---|---|
| `tests/*.e2e.ts` | Các spec, mỗi file một khu vực (công khai, sinh viên, Club Leader, ICPDP, phiên). Đuôi `.e2e.ts` để vitest của client không nhặt nhầm |
| `setup/` | Cấu hình stack (`env.ts`), seed DB, cấp phiên, global setup/teardown. Các script import module của `server/` nên chạy bằng `tsx` |
| `fixtures.ts` | `test`/`expect` mở rộng dùng cho mọi spec |
| `tsconfig.json` | Typecheck riêng cho e2e (`npm run typecheck -w client` chạy cả hai) |

## Viết test mới

- Selector theo vai trò và chữ hiển thị tiếng Anh (`getByRole('button', { name: 'Save' })`), không
  theo class CSS. Lấy chuỗi từ `src/i18n/<module>.ts` (khoá `en`).
- Dữ liệu dùng chung một DB cho mọi worker: test ghi dữ liệu thì chỉ đụng bản ghi của chính nó và
  không giả định danh sách đang rỗng.
- Thiếu dữ liệu: ưu tiên seed có sẵn; nếu không có, thêm vào `addE2eRecords` trong
  `setup/prepare-db.ts` và ghi qua usecase của server.

## Vấn đề đã biết

- Trang đề xuất sự kiện: khi phân trang file mẫu `.docx`, `pagedjs` (trong iframe xem trước) ném
  `Cannot read properties of null (reading 'getAttribute')` vài lần, dù bản xem trước vẫn hiển thị
  đủ trang. Lỗi nằm trong thư viện; test của trang này cho phép riêng lỗi đó.
