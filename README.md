# UCMS — University Club Management System

Hệ thống quản lý câu lạc bộ sinh viên trong trường đại học.
Express 5 + Mongoose + React 19 (Vite) + TypeScript, một npm workspace.
Clean architecture ở cả hai phía, ranh giới tầng được CI kiểm tra.

## Bắt đầu nhanh

Yêu cầu Node >= 22.9 (các script dùng `--env-file`).

```bash
cp .env.example .env     # bắt buộc — server fail-fast nếu thiếu
docker compose up -d     # Mongo (bind vào 127.0.0.1)
npm install
npm run dev              # API :3000 (route dưới /api/v1, tài liệu OpenAPI ở /docs), client :5173
npm run seed             # tuỳ chọn — dữ liệu demo
```

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

Baseline yêu cầu là **[`docs/SRS.md`](docs/SRS.md)** — 54 use case, 45 quy tắc nghiệp vụ, 11
vòng đời thực thể, mô hình dữ liệu, yêu cầu phi chức năng và ma trận truy vết. Mọi tài liệu
khác nằm trong [`docs/`](docs/README.md), và kế hoạch triển khai kèm thiết kế cơ sở dữ liệu ở
[`docs/05-implementation/`](docs/05-implementation/README.md).

## Quy tắc

Quy tắc — cho cả người đóng góp lẫn AI agent — nằm trong một thư mục duy nhất:
**[.rules/](.rules/README.md)**. `CLAUDE.md` và `AGENTS.md` chỉ là con trỏ tới đó.

Quy ước ngôn ngữ: **tài liệu viết bằng tiếng Việt**, còn **code, comment, commit, config, thông
báo lỗi và test viết bằng tiếng Anh** — chi tiết ở [`.rules/README.md`](.rules/README.md) §5.

## Giấy phép

[MIT](LICENSE)
