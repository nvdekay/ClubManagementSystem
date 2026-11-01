# UCMS — University Club Management System

Hệ thống quản lý câu lạc bộ sinh viên trong trường đại học.
Express 5 + Mongoose + React 19 (Vite) + TypeScript, một npm workspace.
Clean architecture ở cả hai phía, ranh giới tầng được CI kiểm tra.

## Chạy dự án lần đầu (sau khi clone)

### 1. Cài sẵn

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | >= 22.9 | Các script dùng `--env-file`; kiểm tra bằng `node -v` |
| Docker Desktop | bản mới | Chạy MongoDB 7 ở chế độ replica set (cần cho transaction) |
| Git | bất kỳ | |

Không cần cài MongoDB riêng: `docker compose` lo phần này.

### 2. Lấy code và cài thư viện

```bash
git clone https://github.com/nvdekay/ClubManagementSystem.git
cd ClubManagementSystem
npm install              # một lần cho cả server/ và client/ (npm workspace)
```

### 3. Tạo file `.env`

```bash
cp .env.example .env
```

`.env` bị Git bỏ qua — không commit file này, không gửi secret qua chat. Điền các biến:

| Biến | Giá trị cho máy local |
|---|---|
| `MONGO_URI` | Giữ nguyên `mongodb://127.0.0.1:27017/ucms` |
| `PORT` | `3000` (cổng API) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth client loại *Web application* trong Google Cloud Console (xin trưởng nhóm hoặc tự tạo) |
| `SESSION_SECRET` | Chuỗi ngẫu nhiên ≥ 32 ký tự, ví dụ `openssl rand -hex 32` |
| `ALLOWED_DOMAIN` | `fpt.edu.vn`, hoặc `*` để cho mọi tài khoản Google (kể cả `@gmail.com`) |
| `BOOTSTRAP_ICPDP_EMAIL` | Email Google của bạn — tài khoản này thành ICPDP officer đầu tiên |
| `APP_BASE_URL` | `http://localhost:3000` |
| `CLIENT_BASE_URL` | `http://localhost:5173` |
| `CLOUDINARY_*` | Chỉ cần khi thử tải tài liệu hồ sơ UC07; để trống cũng chạy được |

Trong Google Cloud Console, thêm **Authorized redirect URI** `http://localhost:3000/api/v1/auth/callback`.
Khi OAuth app còn ở chế độ *Testing*, thêm email của bạn vào *Test users*. Chi tiết:
[`docs/05-implementation/AUTH_SETUP.md`](docs/05-implementation/AUTH_SETUP.md).

> Chưa có Google OAuth? Để trống **toàn bộ** biến Auth (`GOOGLE_*`, `SESSION_SECRET`,
> `ALLOWED_DOMAIN`, `BOOTSTRAP_ICPDP_EMAIL`, `APP_BASE_URL`, `CLIENT_BASE_URL`): server vẫn chạy
> nhưng chỉ mở khu công khai. Điền dở một phần thì server dừng ngay lúc khởi động.

### 4. Bật MongoDB và tạo cơ sở dữ liệu

```bash
docker compose up -d --wait   # Mongo 7, replica set rs0, chỉ nghe trên 127.0.0.1:27017
npm run db:init               # tạo collection + index (chạy lại được); npm run db:verify để kiểm tra
```

### 5. Nạp dữ liệu mẫu (tuỳ chọn, nên làm)

Chạy theo đúng thứ tự:

```bash
npm run seed                                   # CLB + sự kiện công khai (ảnh chụp dữ liệu PDP)
npm run seed:demo -- --owner=<email-google-của-bạn>   # dữ liệu nghiệp vụ; bạn thành ICPDP + Chủ nhiệm CLB HEBE
npm run seed:dashboard                         # ~150 sinh viên demo, 12 tháng hoạt động cho biểu đồ dashboard
```

Các lệnh seed chạy lại được, không tạo bản ghi trùng; `seed:dashboard` chỉ ghi vào DB localhost.

> Cách nhanh hơn: nạp thẳng bản dump đầy đủ của nhóm thay cho ba lệnh trên —
> `docker compose exec -T mongo mongorestore --drop --gzip --archive < seed-data/ucms-seed.archive.gz`
> (xem [`seed-data/`](seed-data/README.md)).
Tài khoản demo chỉ là dữ liệu — không đăng nhập Google được.

### 6. Chạy

```bash
npm run dev
```

| Địa chỉ | Là gì |
|---|---|
| http://localhost:5173 | Giao diện web |
| http://localhost:3000/api/v1 | API (Vite đã proxy `/api` sang đây) |
| http://localhost:3000/docs | Tài liệu OpenAPI |

Mở http://localhost:5173, đăng nhập bằng email đã đặt ở `BOOTSTRAP_ICPDP_EMAIL` (hoặc `--owner`).
`Ctrl+C` để dừng; `docker compose stop` để tắt Mongo (dữ liệu giữ trong volume `mongo-data`).

### Gặp lỗi?

| Triệu chứng | Cách xử lý |
|---|---|
| Server báo thiếu biến / dừng ngay khi khởi động | `.env` chưa có hoặc điền dở bộ biến Auth (xem bước 3) |
| `Transaction numbers are only allowed on a replica set member` | Mongo không chạy replica set — dùng `docker compose` như bước 4 |
| Dữ liệu trống dù đã seed, hoặc thấy DB "lạ" | Máy đã có MongoDB khác (ví dụ Homebrew) chiếm cổng 27017. Tắt nó (`brew services stop mongodb-community`) rồi `docker compose up -d --wait` lại |
| `Port 5173 is in use` / client chạy sang cổng 5174 | Tắt ứng dụng đang dùng cổng 5173: đăng nhập Google luôn quay về `CLIENT_BASE_URL` |
| Cổng 3000 bị chiếm | Đặt `PORT=3055`, `APP_BASE_URL=http://localhost:3055` và đổi redirect URI trên Google Cloud tương ứng |
| Google báo `redirect_uri_mismatch` | Redirect URI trên Google Cloud phải đúng `<APP_BASE_URL>/api/v1/auth/callback` |
| Google báo app chưa được xác minh / không cho đăng nhập | Thêm email vào *Test users* của OAuth app |

## Kiểm tra

```bash
npm run check            # constitution + lint + typecheck + test — Definition of Done
```

## Bố cục

```
server/       Express API — clean architecture (domain / usecase / interface / infra)
client/       React + Vite — pages, components, hooks, services, i18n
docs/         Tài liệu nghiệp vụ và thiết kế — bắt đầu từ docs/SRS.md
.rules/       Toàn bộ quy tắc dự án — kiến trúc, backend, frontend
.sdd/         Spec và ADR
```

Mọi thư mục đều có một `README.md` nói rõ thứ gì thuộc về nó.

## Tài liệu

Baseline yêu cầu là **[`docs/SRS.md`](docs/SRS.md)** — danh mục UC và quy tắc nghiệp vụ, 12
vòng đời thực thể, mô hình dữ liệu, yêu cầu phi chức năng và ma trận truy vết. Mọi tài liệu
khác nằm trong [`docs/`](docs/README.md). Mapping code và phần còn thiếu xem
[`docs/CURRENT_IMPLEMENTATION.md`](docs/CURRENT_IMPLEMENTATION.md), và kế hoạch triển khai kèm thiết kế cơ sở dữ liệu ở
[`docs/05-implementation/`](docs/05-implementation/README.md).

## Quy tắc

Quy tắc — cho cả người đóng góp lẫn AI agent — nằm trong một thư mục duy nhất:
**[.rules/](.rules/README.md)**. `CLAUDE.md` và `AGENTS.md` chỉ là con trỏ tới đó.

Quy ước ngôn ngữ: **tài liệu viết bằng tiếng Việt**, còn **code, comment, commit, config, thông
báo lỗi và test viết bằng tiếng Anh** — chi tiết ở [`.rules/README.md`](.rules/README.md) §5.

## Giấy phép

[MIT](LICENSE)
