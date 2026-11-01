# seed-data

Bản dump đầy đủ DB `ucms` để người mới có ngay dữ liệu giống máy của nhóm.

`ucms-seed.archive.gz` — `mongodump --gzip --archive` của 52 collection (168 user, 49 CLB,
113 sự kiện, 350 thành viên, 2065 đăng ký sự kiện…). Không chứa `authSessions`.

## Import

Sau khi làm xong bước 1–4 trong [README gốc](../README.md) (Mongo đang chạy, đã `npm run db:init`),
đứng ở thư mục gốc repo và chạy:

```bash
docker compose exec -T mongo mongorestore --drop --gzip --archive < seed-data/ucms-seed.archive.gz
```

`--drop` thay toàn bộ dữ liệu cũ của các collection có trong file, nên chạy lại được.
Không cần chạy các lệnh `npm run seed*` nữa.

Đăng nhập: đặt `BOOTSTRAP_ICPDP_EMAIL` bằng email Google của bạn. Tài khoản demo
(`@demo.ucms.edu.vn`) chỉ là dữ liệu, không đăng nhập Google được.

## Cập nhật file dump

```bash
docker compose exec mongo sh -c 'mongodump --quiet --db=ucms --excludeCollection=authSessions --gzip --archive' > seed-data/ucms-seed.archive.gz
```
