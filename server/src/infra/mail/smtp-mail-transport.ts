import nodemailer from "nodemailer";
import type { MailTransport } from "../../domain/notification.js";
import type { SmtpConfig } from "../config/index.js";

/** The part of a nodemailer transporter this adapter uses; tests pass a fake. */
export interface SmtpSender {
  sendMail(message: { from: string; to: string; subject: string; text: string }):
    Promise<{ accepted?: unknown[]; rejected?: unknown[]; response?: string; messageId?: string }>;
}

export function createSmtpSender(config: SmtpConfig): SmtpSender {
  return nodemailer.createTransport({
    host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE,
    // Port 587 must upgrade to TLS; never send credentials in clear text.
    requireTLS: !config.SMTP_SECURE,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
  });
}

/**
 * EXT-02 Google SMTP: resolves only when the server accepted the recipient; any refusal throws so
 * the outbox worker retries with backoff. Nothing is logged here — the worker records the outcome
 * without the body, and the password never leaves the transporter.
 */
export function smtpMailTransport(config: Pick<SmtpConfig, "MAIL_FROM">, sender: SmtpSender): MailTransport {
  return {
    name: "smtp",
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
