import type { MailTransport } from "../../domain/notification.js";

/**
 * Development transport: writes one JSON line per email instead of delivering it. It logs the
 * recipient and subject only, never the body. A real SMTP transport needs an SMTP client
 * dependency (e.g. nodemailer) and `SMTP_*` settings — see this folder's README.
 */
export function logMailTransport(write: (line: string) => void = console.log): MailTransport {
  return {
    name: "log",
    async send(email) {
      write(JSON.stringify({ mail: "log", to: email.to, subject: email.subject }));
      return { providerResponse: "logged" };
    },
  };
}
