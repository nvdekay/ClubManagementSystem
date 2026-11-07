# SPEC: feat-google-smtp

## Vấn đề
Context diagram có luồng UCMS → Google SMTP (`Email message`, ES2/EXT-02). Outbox và worker gửi email đã có
(claim/lease, `emailDeliveryLogs`, retry) nhưng transport chỉ ghi log (khoảng lệch G5).

## Truy vết
EXT-02, ES2, SCH-10, NTF-07, SEC-04 (bí mật), SRS §8.2 (ma trận sự kiện có email).

## Hành vi
- Dependency `nodemailer` (bản vá các advisory đã biết) + `@types/nodemailer` ở workspace `server`.
- `infra/config/mailConfig(config)` — đọc env duy nhất ở `infra/config/`, validate bằng zod:
  - đủ `SMTP_HOST`, `SMTP_PORT` (1–65535), `SMTP_SECURE` (`true` = TLS cổng 465 / `false` = STARTTLS cổng 587),
    `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` (địa chỉ hoặc `Tên <địa chỉ>`, không xuống dòng) → SMTP;
  - không có biến SMTP nào, không phải production → log transport (lựa chọn tường minh: `MAIL_TRANSPORT=log`
    hoặc để trống);
  - production mà không đủ SMTP, `MAIL_TRANSPORT=log` ở production, hoặc có biến SMTP nhưng chọn log → lỗi
    lúc khởi động; thông báo chỉ nêu tên biến, không bao giờ in giá trị.
- `infra/mail/smtp-mail-transport.ts` hiện thực `MailTransport`: gửi `text` hiện có (không HTML), chỉ trả
  thành công khi server nhận người nhận; bị từ chối hoặc lỗi kết nối → ném lỗi để worker retry/backoff rồi
  `Failed` sau lần cuối. Cổng 587 bắt buộc nâng TLS. Không log mật khẩu, token hay nội dung thư.
- `main.ts` chọn transport; outbox, lease (hai worker không gửi trùng), delivery log giữ nguyên.
- `.env.example` thêm `MAIL_TRANSPORT`, `SMTP_*`, `MAIL_FROM` (đã duyệt); hướng dẫn Gmail App Password ở
  `docs/05-implementation/AUTH_SETUP.md`.

## Tiêu chí nghiệm thu
- [x] Cấu hình đủ tạo SMTP transport; thiếu một biến thì fail fast, thông báo không lộ giá trị.
- [x] Production không âm thầm dùng log transport.
- [x] SMTP giả nhận thư → ghi gửi thành công kèm phản hồi provider.
- [x] SMTP từ chối / lỗi → retry có backoff, lần cuối `Failed`.
- [x] Hai worker không gửi trùng (lease, test sẵn có ở `mongo-notification-repository.test.ts`).
- [x] Log transport không ghi nội dung thư.
- [x] Test không bao giờ gửi thư thật.

## Ngoài phạm vi
Email HTML; OAuth2 XOAUTH2 cho Gmail (dùng App Password); theo dõi bounce.

## Changelog
- v1.0.0 (2026-11-07) — người dùng duyệt dependency `nodemailer` và các key env.
