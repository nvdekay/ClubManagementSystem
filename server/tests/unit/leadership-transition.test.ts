import { describe, expect, it, vi } from "vitest";
import type { AuthRepository } from "../../src/domain/auth.js";
import type {
  LeadershipTransition,
  LeadershipTransitionRepository,
} from "../../src/domain/leadership-transition.js";
import {
  decideLeadershipTransition,
  listLeadershipTransitions,
} from "../../src/usecase/leadership-transition.js";

const now = new Date("2026-10-09T10:00:00Z");
const officerId = "000000000000000000000001";
const planId = "000000000000000000000002";

function plan(): LeadershipTransition {
  return { id: planId, clubId: "000000000000000000000003", clubName: "Robotics",
    clubState: "Active", fromTerm: { id: "000000000000000000000004", name: "2025",
      startAt: new Date("2025-10-01T00:00:00Z"), endAt: new Date("2026-10-01T00:00:00Z"), state: "Active" },
    toTerm: { id: "000000000000000000000005", name: "2026",
      startAt: now, endAt: new Date("2027-10-01T00:00:00Z"), state: "Planned" },
    candidates: [{ positionCode: "PRESIDENT", positionName: "President",
      membershipId: "000000000000000000000006", userId: "000000000000000000000007", displayName: "New leader" }],
    outstandingObligations: [{ id: "budget-1", type: "BUDGET", description: "Close settlement",
      assigneeMembershipId: "000000000000000000000006" }],
    handover: { items: [] }, state: "Pending Confirmation", submittedBy: officerId,
    submittedAt: now, followUpConditions: [], task: { id: "000000000000000000000008",
      state: "Open", assigneeId: officerId, openedAt: now }, decisions: [] };
}

function auth(roles: string[]): AuthRepository {
  return { allowedDomains: async () => [], findOrCreateGoogleUser: async () => { throw new Error("unused"); },
    findUserById: async () => null, systemRoleCodes: async () => roles,
    clubIds: async () => [], auditLogin: async () => undefined };
}

function repository(): LeadershipTransitionRepository {
  return { listOpen: vi.fn(async () => [plan()]), find: vi.fn(async () => plan()),
    claim: vi.fn(async () => plan()), decide: vi.fn(async () => plan()) };
}

describe("UC13 leadership transition confirmation", () => {
  it("allows only an ICPDP Officer to read the queue", async () => {
    const repo = repository();
    await expect(listLeadershipTransitions(repo, auth(["ICPDP_OFFICER"]),
      { id: officerId, accountState: "Active" })).resolves.toHaveLength(1);
    await expect(listLeadershipTransitions(repo, auth(["ICPDP_HEAD"]),
      { id: officerId, accountState: "Active" })).rejects.toMatchObject({ kind: "forbidden" });
  });

  it("normalizes conditional approval and only accepts known obligations", async () => {
    const repo = repository();
    await decideLeadershipTransition(repo, auth(["ICPDP_OFFICER"]),
      { id: officerId, accountState: "Active" }, planId,
      { outcome: "Approve", reason: "  Track settlement  ",
        followUpObligationIds: ["budget-1", "budget-1"] }, now);
    expect(repo.decide).toHaveBeenCalledWith(planId, officerId, {
      outcome: "Approve", reason: "Track settlement", followUpObligationIds: ["budget-1"],
    }, now);
    await expect(decideLeadershipTransition(repo, auth(["ICPDP_OFFICER"]),
      { id: officerId, accountState: "Active" }, planId,
      { outcome: "Approve", followUpObligationIds: ["missing"] }, now))
      .rejects.toMatchObject({ kind: "validation" });
  });

  it("requires claim ownership and a reason when returning the plan", async () => {
    const repo = repository();
    await expect(decideLeadershipTransition(repo, auth(["ICPDP_OFFICER"]),
      { id: officerId, accountState: "Active" }, planId,
      { outcome: "Request revision", followUpObligationIds: [] }, now))
      .rejects.toMatchObject({ kind: "validation" });
    vi.mocked(repo.find).mockResolvedValueOnce({ ...plan(), task: { ...plan().task,
      assigneeId: "000000000000000000000099" } });
    await expect(decideLeadershipTransition(repo, auth(["ICPDP_OFFICER"]),
      { id: officerId, accountState: "Active" }, planId,
      { outcome: "Approve", followUpObligationIds: [] }, now))
      .rejects.toMatchObject({ kind: "conflict" });
  });
});
