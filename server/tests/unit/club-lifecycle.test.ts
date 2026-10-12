import { describe, expect, it, vi } from "vitest";
import {
  nextSemester, type ClubLifecycleDetail, type ClubLifecycleRepository,
} from "../../src/domain/club-lifecycle.js";
import type { PolicyRepository, PolicyVersion } from "../../src/domain/policy.js";
import {
  dissolveClub, getClubLifecycle, listClubLifecycles, reactivateClub, runClubLifecycleJob, suspendClub,
} from "../../src/usecase/club-lifecycle.js";

const now = new Date("2026-10-10T08:00:00Z");
const actor = { id: "000000000000000000000001", accountState: "Active" as const };
const officer = { systemRoleCodes: async () => ["ICPDP_OFFICER"] };
const student = { systemRoleCodes: async () => [] };
const clubId = "000000000000000000000002";
const calendar = [
  { code: "FA26", startAt: new Date("2026-09-01T00:00:00Z"), endAt: new Date("2026-12-31T00:00:00Z") },
  { code: "SP27", startAt: new Date("2027-01-05T00:00:00Z"), endAt: new Date("2027-04-30T00:00:00Z") },
];
const policy: PolicyRepository = { findEffective: async () => ({ academicCalendar: calendar }) as unknown as PolicyVersion };
const cascade = { cancelledEvents: 1, cancelledRegistrations: 3, cancelledBookings: 0 };

function club(overrides: Partial<ClubLifecycleDetail> = {}): ClubLifecycleDetail {
  return { id: clubId, code: "CLB-1", name: "CLB A", field: "Công nghệ", state: "Active", activeMembers: 5,
    openCampaigns: [], upcomingEvents: [], history: [], ...overrides };
}

function repository(current: ClubLifecycleDetail | null = club()) {
  const repo: ClubLifecycleRepository = {
    list: async () => (current ? [current] : []), detail: async () => current,
    suspend: vi.fn(async () => cascade), reactivate: vi.fn(async () => undefined),
    decideDissolution: vi.fn(async () => cascade), suspensionsDueForReminder: vi.fn(async () => []),
    markReminded: vi.fn(async () => undefined), expiredSuspensions: vi.fn(async () => []),
    startDissolving: vi.fn(async () => []), completeDissolutions: vi.fn(async () => []),
    officerIds: async () => ["000000000000000000000009"],
  };
  return repo;
}

describe("UC15 club lifecycle rules", () => {
  it("picks the first semester that has not started yet", () => {
    expect(nextSemester(calendar, now)?.code).toBe("SP27");
    expect(nextSemester(calendar, new Date("2027-02-01"))).toBeNull();
  });
});

describe("UC15 club lifecycle use cases", () => {
  it("is for ICPDP officers only", async () => {
    await expect(listClubLifecycles(repository(), student, actor, now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(suspendClub(repository(), officer, null, clubId, { reason: "x" }, now))
      .rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("suspends an active club with a reason and an optional future end", async () => {
    const repo = repository();
    await expect(suspendClub(repo, officer, actor, clubId, { reason: "  Vi phạm  " }, now)).resolves.toEqual(cascade);
    expect(repo.suspend).toHaveBeenCalledWith(clubId, { reason: "Vi phạm", until: null }, actor.id, now);
    const until = new Date("2026-11-01T00:00:00Z");
    await suspendClub(repo, officer, actor, clubId, { reason: "Tạm dừng", until }, now);
    expect(repo.suspend).toHaveBeenLastCalledWith(clubId, { reason: "Tạm dừng", until }, actor.id, now);
    await expect(suspendClub(repo, officer, actor, clubId, { reason: " " }, now)).rejects.toMatchObject({ kind: "validation" });
    await expect(suspendClub(repo, officer, actor, clubId, { reason: "x", until: new Date("2026-01-01") }, now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(suspendClub(repository(club({ state: "Suspended" })), officer, actor, clubId, { reason: "x" }, now))
      .rejects.toMatchObject({ kind: "conflict" });
    await expect(suspendClub(repository(null), officer, actor, clubId, { reason: "x" }, now))
      .rejects.toMatchObject({ kind: "not_found" });
  });

  it("reactivates only suspended clubs", async () => {
    const repo = repository(club({ state: "Suspended" }));
    await expect(reactivateClub(repo, officer, actor, clubId, { reason: "Đã khắc phục" }, now))
      .resolves.toEqual({ reactivated: true });
    expect(repo.reactivate).toHaveBeenCalledWith(clubId, "Đã khắc phục", actor.id, now);
    await expect(reactivateClub(repository(), officer, actor, clubId, { reason: "x" }, now))
      .rejects.toMatchObject({ kind: "conflict" });
  });

  it("schedules dissolution for the next semester and refuses twice or without one", async () => {
    const repo = repository();
    await expect(dissolveClub(repo, policy, officer, actor, clubId, { reason: "Không hoạt động" }, now))
      .resolves.toMatchObject({ effectiveSemester: "SP27", cancelledEvents: 1 });
    expect(repo.decideDissolution).toHaveBeenCalledWith(clubId, expect.objectContaining({
      effectiveSemester: "SP27", effectiveFrom: calendar[1]!.startAt, effectiveTo: calendar[1]!.endAt,
      decidedBy: actor.id, reason: "Không hoạt động" }), now);
    const decided = club({ dissolution: { decidedAt: now, decidedBy: actor.id, reason: "x", effectiveSemester: "SP27",
      effectiveFrom: calendar[1]!.startAt, effectiveTo: calendar[1]!.endAt } });
    await expect(dissolveClub(repository(decided), policy, officer, actor, clubId, { reason: "x" }, now))
      .rejects.toMatchObject({ kind: "conflict" });
    await expect(dissolveClub(repository(), policy, officer, actor, clubId, { reason: "x" }, new Date("2027-02-01")))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(getClubLifecycle(repository(), policy, officer, actor, clubId, now))
      .resolves.toMatchObject({ nextSemester: { code: "SP27" } });
  });

  it("the job reminds, reactivates expired suspensions as the system, then advances dissolutions", async () => {
    const repo = repository();
    vi.mocked(repo.suspensionsDueForReminder).mockResolvedValue([club({ id: "a", state: "Suspended" })]);
    vi.mocked(repo.expiredSuspensions).mockResolvedValue([club({ id: "b", state: "Suspended" })]);
    vi.mocked(repo.startDissolving).mockResolvedValue(["c"]);
    await expect(runClubLifecycleJob(repo, now)).resolves.toEqual({ reminded: 1, reactivated: 1, dissolving: 1, dissolved: 0 });
    expect(repo.markReminded).toHaveBeenCalledWith("a", ["000000000000000000000009"], now);
    expect(repo.reactivate).toHaveBeenCalledWith("b", expect.any(String), null, now);
  });
});
