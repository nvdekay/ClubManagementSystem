# Thiết lập Auth cục bộ

Auth dùng Google Authorization Code + PKCE và MongoDB. Các biến trong `.env.example` được để
trống theo yêu cầu của người dùng; điền giá trị thật vào `.env` bị Git bỏ qua, không commit secret.

| Biến | Cách điền |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth Web application trong Google Cloud Console |
| `SESSION_SECRET` | Chuỗi ngẫu nhiên bí mật tối thiểu 32 ký tự |
| `ALLOWED_DOMAIN` | Domain email được UC01 cho phép, không gồm `@` |
| `BOOTSTRAP_ICPDP_EMAIL` | Email officer đầu tiên, thuộc `ALLOWED_DOMAIN` |
| `APP_BASE_URL` | Origin backend, ví dụ `http://localhost:3055` nếu dùng `PORT=3055` |
| `CLIENT_BASE_URL` | Origin Vite client, thường `http://localhost:5173` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Bộ API credentials của Cloudinary; chỉ cần khi bật tải tài liệu UC07. Điền `.env`, không gửi secret qua chat hoặc commit. |

Trong Google Cloud Console, thêm **Authorized redirect URI** là
`<APP_BASE_URL>/api/v1/auth/callback`. Hai origin cục bộ nên dùng cùng hostname (`localhost`
hoặc `127.0.0.1`) để cookie phiên được gửi đúng. Cổng `3000` hiện có một ứng dụng khác chiếm;
nếu vẫn vậy, đặt `PORT=3055` và `APP_BASE_URL=http://localhost:3055`.

Khi toàn bộ biến Auth còn trống, server chỉ mở khu công khai UC06 và không gắn route
`/auth/*` hoặc `/admin/*`; `/docs/openapi.json` cũng chỉ liệt kê route đang phục vụ.
Khi bắt đầu điền bất kỳ biến Auth nào, server kiểm tra đủ bộ lúc khởi động và fail-fast nếu
cấu hình chưa hoàn chỉnh. `db:init`/`db:verify` chỉ cần `MONGO_URI`.
Đăng nhập lần đầu tạo User và StudentProfile trong một MongoDB transaction; `mongod` local
cần chạy ở chế độ replica set. Không sửa cấu hình service MongoDB đang chạy mà chưa xác nhận
nó có được ứng dụng khác sử dụng hay không. Bộ 50 collection nghiệp vụ DBML vẫn giữ nguyên;
server tạo thêm `authSessions` với TTL index cho phiên.

Sau khi điền cấu hình và bật replica set: chạy `npm run db:init`, `npm run check`,
`npm run build --workspaces`, rồi `npm run dev`. Thử `GET /api/v1/auth/me` không có cookie
(401), đăng nhập Google, chọn workspace, đăng xuất và thử lại `/auth/me` (401). Chỉ email đã
verified và thuộc domain cấu hình mới được vào.

Hiện `ALLOWED_DOMAIN` là policy fallback cho tới khi bản `policyVersions` đầu tiên được tạo.
Các giá trị khởi tạo khác của UC04 chưa được chốt trong SRS, nên chưa seed policy version.

Tệp hồ sơ UC07 được backend tải lên dưới dạng `authenticated` asset. Client không nhận API
secret hoặc Cloudinary asset ID; route kiểm tra chủ hồ sơ rồi trả URL tải có chữ ký hết hạn sau
60 giây. Cloudinary hỗ trợ upload backend có xác thực và URL truy cập tạm thời cho tài sản
`private`/`authenticated` ([Upload API](https://cloudinary.com/documentation/image_upload_api_reference),
[quyền truy cập media](https://cloudinary.com/documentation/control_access_to_media)).
