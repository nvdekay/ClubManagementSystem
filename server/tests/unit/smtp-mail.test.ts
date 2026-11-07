import { describe, expect, it, vi } from "vitest";
import type { ClaimedEmail, MailOutboxRepository } from "../../src/domain/notification.js";
import { mailConfig, type Config } from "../../src/infra/config/index.js";
import { logMailTransport } from "../../src/infra/mail/log-mail-transport.js";
import { smtpMailTransport, type SmtpSender } from "../../src/infra/mail/smtp-mail-transport.js";
import { deliverNotifications } from "../../src/usecase/notification.js";

const now = new Date("2026-11-07T03:00:00Z");
const base: Config = { NODE_ENV: "development", PORT: 3000, MONGO_URI: "mongodb://x" };
const smtp = { SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "587", SMTP_SECURE: "false", SMTP_USER: "ucms@fpt.edu.vn",
  SMTP_PASSWORD: "app-password-secret", MAIL_FROM: "UCMS <ucms@fpt.edu.vn>" };

describe("EXT-02 mail configuration", () => {
  it("uses the log transport only in development without SMTP settings", () => {
    expect(mailConfig(base)).toEqual({ transport: "log" });
    expect(() => mailConfig({ ...base, NODE_ENV: "production" })).toThrow(/SMTP configuration missing/);
    expect(() => mailConfig({ ...base, NODE_ENV: "production", MAIL_TRANSPORT: "log" })).toThrow(/not allowed in production/);
  });

  it("builds the SMTP config from a full setup and fails fast on a partial one without echoing values", () => {
    expect(mailConfig({ ...base, ...smtp })).toMatchObject({ transport: "smtp", SMTP_PORT: 587, SMTP_SECURE: false });
    for (const missing of Object.keys(smtp)) {
      const partial = { ...base, ...smtp, [missing]: undefined };
      let message = "";
      try { mailConfig(partial); } catch (error) { message = error instanceof Error ? error.message : ""; }
      expect(message).toContain(missing);
      expect(message).not.toContain("app-password-secret");
    }
    expect(() => mailConfig({ ...base, ...smtp, MAIL_TRANSPORT: "log" })).toThrow(/MAIL_TRANSPORT=log/);
    expect(() => mailConfig({ ...base, ...smtp, MAIL_FROM: "UCMS <not-an-address>" })).toThrow(/MAIL_FROM/);
    expect(() => mailConfig({ ...base, ...smtp, SMTP_SECURE: "yes" })).toThrow(/SMTP_SECURE/);
  });
});

function claim(id: string, attempt = 1): ClaimedEmail {
  return { id, attempt, eventCode: "EVENT_PROPOSAL_APPROVED", payload: { title: "Robotics Day" }, toEmail: "a@fpt.edu.vn" };
}
function outbox(claims: ClaimedEmail[]) {
  const queue = [...claims];
  const sent: Array<{ id: string; response?: string }> = [];
  const failed: Array<{ id: string; retryAt: Date | null }> = [];
  const repo: MailOutboxRepository = {
    drainInApp: async () => 0, claimNextEmail: async () => queue.shift() ?? null,
    recordSent: async (item, _to, response) => { sent.push({ id: item.id, response }); },
    recordFailed: async (item, _to, _error, retryAt) => { failed.push({ id: item.id, retryAt }); },
  };
  return { repo, sent, failed };
}

describe("SMTP transport through the outbox worker", () => {
  it("records a delivery only when the server accepted the recipient", async () => {
    const sender: SmtpSender = { sendMail: vi.fn(async () => ({ accepted: ["a@fpt.edu.vn"], rejected: [], response: "250 2.0.0 OK" })) };
    const { repo, sent } = outbox([claim("n1")]);
    expect(await deliverNotifications(repo, smtpMailTransport({ MAIL_FROM: smtp.MAIL_FROM }, sender), now)).toMatchObject({ sent: 1 });
    expect(sent).toEqual([{ id: "n1", response: "250 2.0.0 OK" }]);
    expect(sender.sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: smtp.MAIL_FROM, to: "a@fpt.edu.vn" }));
  });

  it("keeps retry and backoff when SMTP refuses or fails, then gives up", async () => {
    const refused: SmtpSender = { sendMail: async () => ({ accepted: [], rejected: ["a@fpt.edu.vn"] }) };
    const down: SmtpSender = { sendMail: async () => { throw new Error("421 try later"); } };
    for (const sender of [refused, down]) {
      const { repo, sent, failed } = outbox([claim("n1", 1), claim("n2", 5)]);
      expect(await deliverNotifications(repo, smtpMailTransport({ MAIL_FROM: smtp.MAIL_FROM }, sender), now))
        .toMatchObject({ sent: 0, retried: 1, failed: 1 });
      expect(sent).toEqual([]);
      expect(failed[0]?.retryAt).toBeInstanceOf(Date);
      expect(failed[1]?.retryAt).toBeNull();
    }
  });

  it("keeps the development log transport free of the body", async () => {
    const lines: string[] = [];
    await logMailTransport((line) => lines.push(line)).send({ to: "a@fpt.edu.vn", subject: "Hello", text: "secret body" });
    expect(lines.join("")).not.toContain("secret body");
  });
});
