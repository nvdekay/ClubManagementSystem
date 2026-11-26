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
| `API_DOCS` | Để trống. `/docs` luôn bật khi phát triển; khi `NODE_ENV=production` thì tắt, trừ khi đặt `true` |
| `TRUST_PROXY` | Để trống ở máy local (= `false`). Khi chạy sau reverse proxy, đặt số hop proxy (thường `1`) để giới hạn tần suất request (20/phút/IP cho `/api/v1/auth/*`, 300/phút/IP cho `/api/v1`) thấy đúng IP client |

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
npm run check            # constitution + lint + format + typecheck + test — Definition of Done
```

### Lint và format

Chạy tại thư mục gốc:

```bash
npm run lint            # kiểm tra ESLint ở cả server và client
npm run lint:fix        # tự sửa các lỗi ESLint có hỗ trợ autofix
npm run format          # format toàn bộ code và cấu hình được hỗ trợ
npm run format:check    # kiểm tra format, không sửa file
```

Khi dọn code, chạy `npm run lint:fix` rồi `npm run format`; sau đó chạy `npm run check`.
ESLint giữ các quy tắc TypeScript, React Hooks và ranh giới UI hiện có, đồng thời yêu cầu
dấu ngoặc nhọn cho mọi nhánh `if`/`else` và vòng lặp. Lệnh lint báo lỗi nếu còn warning.

Prettier thống nhất thụt 2 dấu cách, nháy đơn trong JavaScript/TypeScript, không chấm phẩy,
dấu phẩy cuối và xuống dòng theo độ rộng mục tiêu 100 ký tự. Cấu hình nằm trong
[`.prettierrc.json`](.prettierrc.json); [`.editorconfig`](.editorconfig) giữ UTF-8 và xuống dòng LF.
Hai lệnh format áp dụng cho code, test và cấu hình trong `server/`, `client/`, các file JSON/MJS
ở gốc và cấu hình VS Code. File sinh tự động (`*.generated.*`), lockfile, build output và tài liệu
được bỏ qua qua [`.prettierignore`](.prettierignore).

Trong VS Code, cài hai extension được repo đề xuất: **ESLint** và **Prettier - Code formatter**.
Workspace đã bật format khi lưu và tự sửa ESLint khi lưu file JavaScript/TypeScript.
CI gọi `npm run check`, nên code chưa đúng format sẽ làm bước kiểm tra thất bại.

## Triển khai (một container)

Bản production là **một image Docker**: Express phục vụ cả API (`/api/v1`) lẫn bản build của
client (`client/dist`) trên cùng một cổng. [`Dockerfile`](Dockerfile) build cả hai workspace,
chỉ giữ thư viện production của server, chạy `node dist/main.js` bằng user `node` (không phải
root) với `NODE_ENV=production` và `CLIENT_DIST_DIR=/app/client/dist`, kèm `HEALTHCHECK` gọi
`/api/v1/health`. [`docker-compose.prod.yml`](docker-compose.prod.yml) chạy image đó cùng
MongoDB.

```bash
cp .env.example .env.production      # điền theo bảng dưới; file này không được commit
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --wait
docker compose -f docker-compose.prod.yml logs -f app    # mỗi request một dòng JSON có requestId
```

Chỉ build image (CI cũng chạy bước này): `docker build -t ucms .`

### Biến môi trường bắt buộc ở production

Server **dừng ngay lúc khởi động** nếu thiếu hoặc sai các biến sau (chỉ in tên biến, không in giá trị):

| Biến | Ghi chú |
|---|---|
| `MONGO_URI` | Compose đã đặt sẵn `mongodb://mongo:27017/ucms?replicaSet=rs0`. Dùng Mongo khác thì Mongo đó **phải là replica set** (repository dùng transaction nhiều document), ví dụ MongoDB Atlas |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `ALLOWED_DOMAIN`, `BOOTSTRAP_ICPDP_EMAIL` | Như bước 3; production luôn yêu cầu đăng nhập nên thiếu bộ Auth là lỗi |
| `APP_BASE_URL`, `CLIENT_BASE_URL` | Cùng một địa chỉ công khai, ví dụ `https://clubs.example.edu.vn`, vì client và API chung origin. Redirect URI trên Google Cloud: `<APP_BASE_URL>/api/v1/auth/callback` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Production bắt buộc gửi email qua SMTP (`MAIL_TRANSPORT=log` bị từ chối). Google: `smtp.gmail.com`, `587`, `SMTP_SECURE=false`, App Password |

Biến tuỳ chọn:

| Biến | Ghi chú |
|---|---|
| `CLOUDINARY_*` | Cần cho tải tệp (hồ sơ, minh chứng, đề án sự kiện); để trống thì các chức năng tải tệp tắt |
| `TRUST_PROXY` | **Đặt khi chạy sau reverse proxy** (nginx, Caddy, router của PaaS): số hop proxy, thường `1`. Nhờ đó giới hạn tần suất request thấy đúng IP client và server nhận ra request HTTPS (header `Strict-Transport-Security` chỉ gửi khi request đến qua HTTPS). Không có proxy thì để trống, vì tin một proxy không tồn tại cho phép client giả `X-Forwarded-For` |
| `API_DOCS` | `/docs` (Swagger UI) tắt ở production; đặt `true` để bật |
| `CLIENT_DIST_DIR` | Thư mục bản build của client; image đã đặt sẵn. Để trống thì server chỉ phục vụ API (khi phát triển, Vite phục vụ client) |
| `PORT` | Cổng trong container, mặc định `3000`. Compose publish ra `127.0.0.1:${APP_PORT:-3000}` |

### HTTPS và reverse proxy

Ở production cookie phiên có cờ `Secure`, nên ứng dụng phải được truy cập qua **HTTPS**. Đặt một
reverse proxy kết thúc TLS trước container (compose chỉ mở cổng trên `127.0.0.1`), chuyển tiếp
`X-Forwarded-For` và `X-Forwarded-Proto`, rồi đặt `TRUST_PROXY=1`. Proxy có thể gửi sẵn header
`X-Request-Id`; server giữ lại nếu là token ngắn an toàn (chữ, số, `.`, `_`, `:`, `-`, tối đa 64
ký tự), nếu không thì tự sinh, và luôn trả lại trong header `X-Request-Id` để đối chiếu log.

Server tự đặt các header bảo mật: `Content-Security-Policy` (chỉ cho script của chính ứng dụng;
style, font Google Fonts; ảnh `https:`; kết nối tới API và Cloudinary), `Permissions-Policy`,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`; `/docs` có CSP riêng cho Swagger UI.
Định nghĩa ở `server/src/interface/http/security-headers.ts` — thêm nguồn ngoài mới cho client
(CDN, dịch vụ ảnh) thì phải sửa ở đó.

### MongoDB và sao lưu

Mongo trong compose là replica set một node (`rs0`), tự khởi tạo ở lần chạy đầu, không publish
cổng ra ngoài và lưu dữ liệu ở volume `mongo-data`. Sao lưu định kỳ bằng `mongodump`, cất file
ngoài máy chủ (file dump có thể chứa dữ liệu cá nhân — không commit, `*.archive.gz` đã bị Git bỏ qua):

```bash
# Sao lưu
docker compose -f docker-compose.prod.yml exec -T mongo \
  mongodump --db ucms --archive --gzip > ucms-$(date +%F).archive.gz
# Khôi phục (ghi đè dữ liệu hiện có)
docker compose -f docker-compose.prod.yml exec -T mongo \
  mongorestore --drop --archive --gzip < ucms-2026-11-26.archive.gz
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
