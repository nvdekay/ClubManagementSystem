import { describe, expect, it, vi } from "vitest";
import type { ClubAccessRepository, ClubAccessSnapshot } from "../../src/domain/access.js";
import type { AuthRepository, AuthUser } from "../../src/domain/auth.js";
import type { DashboardRepository } from "../../src/domain/dashboard.js";
import { DomainError } from "../../src/domain/errors.js";
import { getDashboard } from "../../src/usecase/dashboard.js";

const user: AuthUser = {
  id: "0123456789abcdef01234567", email: "student@fpt.edu.vn",
  displayName: "Student", accountState: "Active",
};
const now = new Date("2026-10-09T08:00:00Z");
const clubId = "abcdefabcdefabcdefabcdef";

function fixture(roles: string[] = [], snapshot: ClubAccessSnapshot | null = null) {
  const student = vi.fn<DashboardRepository["student"]>(async (_userId, at) => ({
    kind: "student", generatedAt: at,
    panels: [{ key: "memberships", status: "ready", count: 1 }],
  }));
  const club = vi.fn<DashboardRepository["club"]>(async (id, _permissions, at) => ({
    kind: "club", clubId: id, generatedAt: at, panels: [],
  }));
  const icpdp = vi.fn<DashboardRepository["icpdp"]>(async (at) => ({
    kind: "icpdp", generatedAt: at, panels: [],
  }));
  const repo: DashboardRepository = { student, club, icpdp };
  const authRepo: AuthRepository = {
    allowedDomains: async () => [],
    findOrCreateGoogleUser: async () => user,
    findUserById: async () => user,
    systemRoleCodes: async () => roles,
    clubIds: async () => [],
    auditLogin: async () => undefined,
  };
  const accessRepo: ClubAccessRepository = { findSnapshot: async () => snapshot };
  return { repo, authRepo, accessRepo, student, club, icpdp };
}

function activeSnapshot(): ClubAccessSnapshot {
  return {
    clubId, clubName: "Chess Club", clubState: "Active",
    membership: { id: "111111111111111111111111", clubId, state: "Active" },
    terms: [], positions: [], assignments: [], isApprovedFounder: false,
  };
}

describe("UC02 dashboard use case", () => {
  it("scopes a student dashboard to the signed-in user", async () => {
    const deps = fixture();
    const result = await getDashboard(
      deps.repo, deps.authRepo, deps.accessRepo, user, { workspace: "student" }, now,
    );
    expect(result.kind).toBe("student");
    expect(deps.student).toHaveBeenCalledWith(user.id, now);
    expect(deps.club).not.toHaveBeenCalled();
    expect(deps.icpdp).not.toHaveBeenCalled();
  });

  it("requires the live ICPDP role", async () => {
    const denied = fixture();
    await expect(getDashboard(
      denied.repo, denied.authRepo, denied.accessRepo, user, { workspace: "icpdp" }, now,
    )).rejects.toMatchObject({ kind: "forbidden" } satisfies Partial<DomainError>);

    const allowed = fixture(["ICPDP_OFFICER"]);
    await getDashboard(
      allowed.repo, allowed.authRepo, allowed.accessRepo, user, { workspace: "icpdp" }, now,
    );
    expect(allowed.icpdp).toHaveBeenCalledWith(now);
  });

  it("requires an active club context and rejects malformed identifiers", async () => {
    const denied = fixture();
    await expect(getDashboard(
      denied.repo, denied.authRepo, denied.accessRepo, user,
      { workspace: "club", clubId }, now,
    )).rejects.toMatchObject({ kind: "forbidden" } satisfies Partial<DomainError>);
    await expect(getDashboard(
      denied.repo, denied.authRepo, denied.accessRepo, user,
      { workspace: "club", clubId: "bad" }, now,
    )).rejects.toMatchObject({ kind: "validation" } satisfies Partial<DomainError>);

    const allowed = fixture([], activeSnapshot());
    await getDashboard(
      allowed.repo, allowed.authRepo, allowed.accessRepo, user,
      { workspace: "club", clubId }, now,
    );
    expect(allowed.club).toHaveBeenCalledWith(clubId, [], now);
  });
});
