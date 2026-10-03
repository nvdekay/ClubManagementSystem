import { describe, expect, it } from "vitest";
import type { AuthRepository, AuthUser, LoginAudit } from "../../src/domain/auth.js";
import type { ClubAccessRepository } from "../../src/domain/access.js";
import type { GoogleIdentity } from "../../src/domain/google-identity.js";
import type { SessionService } from "../../src/domain/session.js";
import { completeGoogleLogin, currentUser } from "../../src/usecase/auth.js";

const now = new Date("2026-10-02T12:00:00Z");
const identity: GoogleIdentity = {
  subject: "google-subject", email: "Student@fpt.edu.vn", emailVerified: true,
  displayName: "Student",
};
const user: AuthUser = {
  id: "0123456789abcdef01234567", email: "student@fpt.edu.vn", displayName: "Student",
  accountState: "Active",
};

function fixtures() {
  const events: string[] = [];
  const audits: LoginAudit[] = [];
  const repo: AuthRepository = {
    async allowedDomains() { events.push("policy"); return ["fpt.edu.vn"]; },
    async findOrCreateGoogleUser() { events.push("user"); return user; },
    async findUserById() { return user; },
    async systemRoleCodes() { return []; },
    async clubIds() { return []; },
    async auditLogin(attempt) { events.push("audit"); audits.push(attempt); },
  };
  const sessions: SessionService = {
    async issue() {
      events.push("session");
      return { cookieValue: "signed", csrfToken: "csrf", expiresAt: new Date(now.getTime() + 1000) };
    },
    async resolve() {
      return { session: { id: "s", userId: user.id, tokenHash: "h", csrfHash: "c",
        expiresAt: new Date(now.getTime() + 1000), revokedAt: null }, csrfToken: "csrf" };
    },
    async revoke() {},
    async revokeUser() {},
  };
  const accessRepo: ClubAccessRepository = { findSnapshot: async () => null };
  return { repo, accessRepo, sessions, events, audits };
}

describe("Google login use case", () => {
  it("checks the domain before any user query, then issues and audits a session", async () => {
    const { repo, sessions, events, audits } = fixtures();
    const result = await completeGoogleLogin(repo, sessions, identity, now);
    expect(result.cookieValue).toBe("signed");
    expect(events).toEqual(["policy", "user", "session", "audit"]);
    expect(audits[0]?.action).toBe("LOGIN_SUCCESS");
  });

  it("audits and rejects an unverified or disallowed identity without querying a user", async () => {
    for (const denied of [
      { ...identity, emailVerified: false },
      { ...identity, email: "student@fpt.edu.vn.evil.test" },
    ]) {
      const { repo, sessions, events, audits } = fixtures();
      await expect(completeGoogleLogin(repo, sessions, denied, now))
        .rejects.toMatchObject({ kind: "forbidden" });
      expect(events).toEqual(["policy", "audit"]);
      expect(audits[0]?.action).toBe("LOGIN_DENIED_DOMAIN");
    }
  });

  it("rejects a locked account with reason before issuing a session", async () => {
    const fixture = fixtures();
    const repo = { ...fixture.repo,
      async findOrCreateGoogleUser() { fixture.events.push("user"); return {
        ...user, accountState: "Locked" as const, lockReason: "review pending",
      }; },
    };
    await expect(completeGoogleLogin(repo, fixture.sessions, identity, now))
      .rejects.toMatchObject({ kind: "locked", message: "review pending" });
    expect(fixture.events).toEqual(["policy", "user", "audit"]);
  });

  it("returns fresh roles and clubs for a resolved session", async () => {
    const { repo, accessRepo, sessions } = fixtures();
    expect(await currentUser(repo, accessRepo, sessions, "signed", now)).toMatchObject({
      user, csrfToken: "csrf", systemRoles: [], workspaces: [{ kind: "student" }],
    });
  });

  it("returns every current club context plus Student and ICPDP workspaces", async () => {
    const fixture = fixtures();
    const repo: AuthRepository = {
      ...fixture.repo,
      async systemRoleCodes() { return ["ICPDP_OFFICER"]; },
      async clubIds() { return ["club-a", "club-b"]; },
    };
    const accessRepo: ClubAccessRepository = {
      async findSnapshot(_userId, clubId) {
        return {
          clubId, clubName: clubId, clubState: "Active", isApprovedFounder: false,
          membership: { id: `member-${clubId}`, clubId, state: "Active" },
          terms: [{ id: `term-${clubId}`, clubId, state: "Active",
            startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01") }],
          positions: [{ id: `position-${clubId}`, clubId, isActive: true,
            isLeaderRole: false, permissionCodes: ["club.event.manage"] }],
          assignments: [{ clubId, termId: `term-${clubId}`, positionId: `position-${clubId}`,
            membershipId: `member-${clubId}`, effectiveFrom: new Date("2026-01-01") }],
        };
      },
    };
    const result = await currentUser(repo, accessRepo, fixture.sessions, "signed", now);
    expect(result.workspaces.map((workspace) => workspace.kind))
      .toEqual(["student", "icpdp", "club", "club"]);
    expect(result.workspaces[2]).toMatchObject({
      clubId: "club-a", role: "member", permissions: ["club.event.manage"],
    });
    expect(result.workspaces[3]).toMatchObject({ clubId: "club-b" });
  });

  it("omits former memberships while retaining a pending founder workspace", async () => {
    const fixture = fixtures();
    const repo: AuthRepository = {
      ...fixture.repo,
      async clubIds() { return ["former", "founder", "other-club"]; },
    };
    const accessRepo: ClubAccessRepository = {
      async findSnapshot(_userId, clubId) {
        return {
          clubId,
          clubName: clubId,
          clubState: clubId === "founder" ? "Pending Setup" : "Active",
          isApprovedFounder: clubId === "founder",
          membership: clubId === "former"
            ? { id: "former-membership", clubId, state: "Left" }
            : clubId === "other-club"
              ? { id: "wrong-membership", clubId: "different-club", state: "Active" }
              : null,
          terms: [],
          positions: [],
          assignments: [],
        };
      },
    };
    const result = await currentUser(repo, accessRepo, fixture.sessions, "signed", now);
    expect(result.workspaces).toEqual([
      { kind: "student", permissions: [] },
      {
        kind: "club", clubId: "founder", clubName: "founder",
        role: "founder",
        permissions: ["club.profile.manage", "club.role.manage", "club.board.nominate"],
      },
    ]);
  });
});
