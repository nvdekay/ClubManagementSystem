import { describe, expect, it, vi } from "vitest";
import type { ClubAccessRepository, ClubAccessSnapshot } from "../../src/domain/access.js";
import type { AuthRepository, AuthUser } from "../../src/domain/auth.js";
import type { DashboardRepository } from "../../src/domain/dashboard.js";
import { DomainError } from "../../src/domain/errors.js";
import {
  getClubBoardHistory, getDashboard, getInternalEvent, listInternalEvents,
} from "../../src/usecase/dashboard.js";

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
  const internalEvents = vi.fn<DashboardRepository["internalEvents"]>(async () => ({ items: [], clubs: [], semesters: [] }));
  const internalEvent = vi.fn<DashboardRepository["internalEvent"]>(async () => null);
  const boardHistory = vi.fn<DashboardRepository["boardHistory"]>(async (id) => ({
    club: { id, code: "CHESS", name: "Chess Club", state: "Active" }, structures: [], terms: [],
  }));
  const repo: DashboardRepository = { student, club, icpdp, internalEvents, internalEvent, boardHistory };
  const authRepo: AuthRepository = {
    allowedDomains: async () => [],
    findOrCreateGoogleUser: async () => user,
    findUserById: async () => user,
    systemRoleCodes: async () => roles,
    clubIds: async () => [],
    auditLogin: async () => undefined,
  };
  const accessRepo: ClubAccessRepository = { findSnapshot: async () => snapshot };
  return { repo, authRepo, accessRepo, student, club, icpdp, internalEvents, internalEvent, boardHistory };
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

  it("keeps the internal-event drill-down to ICPDP and validates its filter (FR-UC02-02)", async () => {
    const denied = fixture();
    await expect(listInternalEvents(denied.repo, denied.authRepo, user, {}))
      .rejects.toMatchObject({ kind: "forbidden" });
    const allowed = fixture(["ICPDP_OFFICER"]);
    await listInternalEvents(allowed.repo, allowed.authRepo, user, { clubId, semesterCode: "Fall 2026" });
    expect(allowed.internalEvents).toHaveBeenCalledWith({ clubId, semesterCode: "Fall 2026" });
    await expect(listInternalEvents(allowed.repo, allowed.authRepo, user, { clubId: "bad" }))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(getInternalEvent(allowed.repo, allowed.authRepo, user, clubId))
      .rejects.toMatchObject({ kind: "not_found" });
  });

  it("shows board history to ICPDP and the club's own Club Leader only (BR56)", async () => {
    const officer = fixture(["ICPDP_OFFICER"]);
    await getClubBoardHistory(officer.repo, officer.authRepo, officer.accessRepo, user, clubId, now);
    expect(officer.boardHistory).toHaveBeenCalledWith(clubId);

    const member = fixture([], activeSnapshot());
    await expect(getClubBoardHistory(member.repo, member.authRepo, member.accessRepo, user, clubId, now))
      .rejects.toMatchObject({ kind: "forbidden" });

    const termId = "222222222222222222222222", positionId = "333333333333333333333333";
    const leader = fixture([], { ...activeSnapshot(),
      terms: [{ id: termId, clubId, state: "Active", startAt: new Date("2026-01-01Z"), endAt: new Date("2027-01-01Z") }],
      positions: [{ id: positionId, clubId, isActive: true, isLeaderRole: true }],
      assignments: [{ clubId, termId, positionId, membershipId: "111111111111111111111111",
        effectiveFrom: new Date("2026-01-01Z"), confirmedBy: "444444444444444444444444" }] });
    await expect(getClubBoardHistory(leader.repo, leader.authRepo, leader.accessRepo, user, clubId, now))
      .resolves.toMatchObject({ club: { code: "CHESS" } });
  });
});
