# infra/mail/

Adapter gửi email cho port `MailTransport` của `domain/notification.ts`. Worker outbox
(`interface/jobs/notification-delivery-job.ts`, SCH-10) chọn transport ở `main.ts`.

- `log-mail-transport.ts` — transport mặc định cho dev/demo: ghi một dòng JSON (người nhận + tiêu
  đề, **không** ghi nội dung) thay vì gửi thật. Mọi email vẫn đi qua đủ claim/lease, ghi
  `emailDeliveryLogs` và retry.

**Điểm mở rộng SMTP (EXT-02, Google SMTP).** Chưa làm vì cần thêm dependency (ví dụ `nodemailer`) —
phải được người dùng duyệt trước khi sửa `package.json`. Khi được duyệt: thêm
`smtp-mail-transport.ts` hiện thực `MailTransport` (ném lỗi khi server không nhận thư để worker
retry), thêm `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` vào schema của
`infra/config/` (validate lúc khởi động) và `.env.example`, rồi chọn transport ở `main.ts` khi đủ cấu hình.
