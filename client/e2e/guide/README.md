# client/e2e/guide/

Chụp lại ảnh của hướng dẫn sử dụng (`docs/04-user-guide/images/`) từ app thật bằng Playwright:
`npm run guide:screenshots` (từ thư mục gốc). **Không** thuộc `npm run test:e2e` hay `npm run check`.
Cách dùng đầy đủ và bước dựng HTML/PDF: [`docs/04-user-guide/README.md`](../../../docs/04-user-guide/README.md).

Dùng lại stack e2e (`../setup/`): seed database bằng `prepare-db.ts`, cấp phiên thật cho từng vai
bằng `mint-sessions.ts`, chạy API + bản build client. Khác với bộ test:

| Thứ | Giá trị |
|---|---|
| Database | `ucms-e2e-guide` (xoá rồi seed lại, xoá khi xong) |
| Cổng | API `:3400`, client `:5400` |
| Ngôn ngữ / theme | Tiếng Việt, sáng; khung nhìn 1440 × 1000 |
| Worker | 1, chạy theo thứ tự file (vài ảnh dựa vào thao tác của ảnh trước) |

Ghi đè bằng `E2E_DB_NAME` (phải bắt đầu bằng `ucms-e2e`), `E2E_SERVER_PORT`, `E2E_CLIENT_PORT`.
`E2E_REUSE_SERVERS=1` chụp trên stack đang chạy sẵn và không seed thêm dữ liệu guide.

| File | Là gì |
|---|---|
| `../guide.config.ts` | Cấu hình Playwright riêng cho việc chụp |
| `defaults.ts` | Đặt database và cổng mặc định trước khi `../setup/env.ts` được đọc |
| `global-setup.ts` | Chạy `prepare-guide.ts`, rồi cấp phiên cho từng vai |
| `prepare-guide.ts` | Dữ liệu riêng cho ảnh: hồ sơ thành lập, báo cáo sau sự kiện, kinh phí theo hạng mục, yêu cầu cơ sở vật chất, khiếu nại đã chuyển CLB, ghế ban chủ nhiệm còn trống ở HEBE, buổi bảo vệ đề án đang diễn ra, bản nháp đánh giá CLB; đổi nhãn e2e sang tiếng Việt. Ghi qua usecase/repository của server |
| `capture.ts` | Mở trang, chờ dữ liệu tải xong (không còn skeleton, ảnh, toast), lưu PNG |
| `screens.guide.ts` | Mỗi test chụp một hoặc vài ảnh, tên file trùng `images/manifest.json` |

Thêm ảnh: viết test mới trong `screens.guide.ts` (selector theo vai trò và chữ tiếng Việt, lấy từ
`src/i18n/locales/vi/`), thêm dòng vào `images/manifest.json` và nhúng ảnh trong `guide-book.md`.
