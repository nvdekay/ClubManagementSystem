# infra/

Các adapter đi ra ngoài. Hiện thực các port của domain.

- `config/` — đọc và kiểm tra biến môi trường.
- `db/` — Mongo: schema sinh từ DBML, repository, lệnh init/verify, seed.
- `auth/` — Google OAuth (OIDC), chữ ký phiên/CSRF.
- `files/` — lưu tệp qua Cloudinary và sinh file xuất dữ liệu (UC55).
