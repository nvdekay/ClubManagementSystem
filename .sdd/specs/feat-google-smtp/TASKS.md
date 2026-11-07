# TASKS: feat-google-smtp

- [x] Thêm `nodemailer` + `@types/nodemailer` (bản không còn advisory khi `npm audit`).
- [x] `mailConfig` trong `infra/config/` (zod, fail fast, không lộ giá trị).
- [x] `smtp-mail-transport.ts` + nối ở `main.ts`.
- [x] Unit test cấu hình, gửi thành công, từ chối/lỗi → retry, log không có nội dung.
- [x] `.env.example`, README `infra/mail`, `interface/jobs`, AUTH_SETUP, SRS EXT-02, HLD, CURRENT_IMPLEMENTATION, CODE_DIAGRAM_GAPS.
- [x] `npm run check` xanh.
