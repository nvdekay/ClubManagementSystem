import type { MailTransport } from "../../domain/notification.js";

// Transport email dev: chỉ ghi log người nhận và tiêu đề thay vì gửi thật
/**
 * Transport cho môi trường dev: ghi một dòng JSON cho mỗi email thay vì gửi đi. Chỉ log
 * người nhận và tiêu đề, không bao giờ log nội dung. Transport SMTP thật cần một dependency
 * SMTP client (vd nodemailer) và cấu hình `SMTP_*` — xem README của thư mục này.
 */
export function logMailTransport(write: (line: string) => void = console.log): MailTransport {
  return {
    name: "log",
    // Ghi một dòng JSON log cho email và coi như đã gửi
    async send(email) {
      write(JSON.stringify({ mail: "log", to: email.to, subject: email.subject }));
      return { providerResponse: "logged" };
    },
  };
}
