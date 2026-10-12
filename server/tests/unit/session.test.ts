import { describe, expect, it } from "vitest";
import type { AuthSession, SessionRepository } from "../../src/domain/session.js";
import { createSessionService } from "../../src/infra/auth/session-service.js";

function memorySessions(): SessionRepository {
  const sessions = new Map<string, AuthSession>();
  return {
    async create(session) {
      sessions.set(session.tokenHash, { ...session, id: String(sessions.size + 1), revokedAt: null });
    },
    async findActive(hash, now) {
      const session = sessions.get(hash);
      return session && !session.revokedAt && session.expiresAt > now ? session : null;
    },
    async revoke(hash, now) {
      const session = sessions.get(hash);
      if (session) session.revokedAt = now;
    },
    async revokeUser(userId, now) {
      for (const session of sessions.values()) {
        if (session.userId === userId) session.revokedAt = now;
      }
    },
  };
}

describe("signed Mongo-backed sessions", () => {
  const now = new Date("2026-10-02T12:00:00Z");

  it("issues an opaque signed cookie and resolves the matching CSRF token", async () => {
    const service = createSessionService(memorySessions(), "secret".repeat(8));
    const issued = await service.issue("user-a", now);
    expect(issued.cookieValue).not.toContain("user-a");
    const resolved = await service.resolve(issued.cookieValue, now);
    expect(resolved?.session.userId).toBe("user-a");
    expect(resolved?.csrfToken).toBe(issued.csrfToken);
  });

  it("rejects a changed signature and an expired session", async () => {
    const service = createSessionService(memorySessions(), "secret".repeat(8));
    const issued = await service.issue("user-a", now);
    expect(await service.resolve(`${issued.cookieValue}x`, now)).toBeNull();
    expect(await service.resolve(issued.cookieValue, issued.expiresAt)).toBeNull();
  });

  it("revokes one session on logout and all user sessions on account change", async () => {
    const service = createSessionService(memorySessions(), "secret".repeat(8));
    const first = await service.issue("user-a", now);
    const second = await service.issue("user-a", now);
    await service.revoke(first.cookieValue, now);
    expect(await service.resolve(first.cookieValue, now)).toBeNull();
    expect(await service.resolve(second.cookieValue, now)).not.toBeNull();
    await service.revokeUser("user-a", now);
    expect(await service.resolve(second.cookieValue, now)).toBeNull();
  });
});
