import nodemailer from "nodemailer";
import type { MailTransport } from "../../domain/notification.js";
import type { SmtpConfig } from "../config/index.js";

/** Phần của nodemailer transporter mà adapter này dùng; test truyền vào bản giả. */
export interface SmtpSender {
  sendMail(message: { from: string; to: string; subject: string; text: string }):
    Promise<{ accepted?: unknown[]; rejected?: unknown[]; response?: string; messageId?: string }>;
}

// Tạo nodemailer transporter theo cấu hình SMTP (bắt buộc TLS)
export function createSmtpSender(config: SmtpConfig): SmtpSender {
  return nodemailer.createTransport({
    host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE,
    // Port 587 phải nâng cấp lên TLS; không bao giờ gửi thông tin đăng nhập dạng văn bản thuần.
    requireTLS: !config.SMTP_SECURE,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
  });
}

// Transport email gửi thật qua SMTP, từ chối thì ném lỗi để outbox thử lại
/**
 * EXT-02 Google SMTP: chỉ hoàn tất khi server đã nhận người nhận; mọi từ chối đều throw để
 * outbox worker thử lại với backoff. Ở đây không log gì — worker ghi kết quả
 * mà không có nội dung, và mật khẩu không bao giờ rời khỏi transporter.
 */
export function smtpMailTransport(config: Pick<SmtpConfig, "MAIL_FROM">, sender: SmtpSender): MailTransport {
  return {
    name: "smtp",
    // Gửi email qua SMTP và kiểm người nhận được server chấp nhận
    async send(email) {
      const info = await sender.sendMail({ from: config.MAIL_FROM, to: email.to, subject: email.subject, text: email.text });
      const accepted = (info.accepted ?? []).map(String);
      if (!accepted.includes(email.to) || (info.rejected ?? []).length) {
        throw new Error("SMTP server did not accept the recipient");
      }
      return { providerResponse: (info.response ?? info.messageId ?? "accepted").slice(0, 200) };
    },
  };
}
