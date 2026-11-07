# infra/mail/

Adapter gửi email cho port `MailTransport` của `domain/notification.ts`. Worker outbox
(`interface/jobs/notification-delivery-job.ts`, SCH-10) chọn transport ở `main.ts`.

- `log-mail-transport.ts` — transport mặc định cho dev/demo: ghi một dòng JSON (người nhận + tiêu
  đề, **không** ghi nội dung) thay vì gửi thật. Mọi email vẫn đi qua đủ claim/lease, ghi
  `emailDeliveryLogs` và retry.

- `smtp-mail-transport.ts` — Google SMTP (EXT-02) qua `nodemailer`: chỉ trả thành công khi server SMTP
  nhận người nhận; bị từ chối hoặc lỗi kết nối thì ném lỗi để worker retry với backoff. Không log mật khẩu
  hay nội dung thư. Cổng 587 bắt buộc nâng TLS (`requireTLS`).

**Chọn transport** (`mailConfig` ở `infra/config/`, gọi trong `main.ts`): đủ `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` → SMTP. Không có biến SMTP nào và không phải
production → log transport. Production bắt buộc SMTP; thiếu một biến, `MAIL_FROM` sai hoặc đặt
`MAIL_TRANSPORT=log` khi có biến SMTP → server dừng ngay lúc khởi động, thông báo chỉ nêu tên biến.
Test không bao giờ gửi thư thật (dùng sender giả).
