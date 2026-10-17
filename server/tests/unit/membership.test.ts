import { describe, expect, it } from "vitest";
import type { MembershipRepository } from "../../src/domain/membership.js";
import type { ClubAccessRepository } from "../../src/domain/access.js";
import { isBeforeToday } from "../../src/domain/membership.js";
import { changeMembershipState, listClubMemberships, onboardMemberManually, requestMembershipWithdrawal } from "../../src/usecase/membership.js";

const actor = { id: "111111111111111111111111", accountState: "Active" as const };
const clubId = "222222222222222222222222";
const membershipId = "333333333333333333333333";
const now = new Date("2026-10-09T03:00:00.000Z"); // 10:00 in Asia/Ho_Chi_Minh
const access: ClubAccessRepository = { findSnapshot: async () => ({
  clubId, clubName: "Example Club", clubState: "Active", isApprovedFounder: false,
  membership: { id: membershipId, clubId, state: "Active" }, terms: [{
    id: "555555555555555555555555", clubId, state: "Active",
    startAt: new Date("2026-09-01T00:00:00.000Z"), endAt: new Date("2027-09-01T00:00:00.000Z"),
  }], positions: [{
    id: "444444444444444444444444", clubId, isActive: true, isLeaderRole: true,
    permissionCodes: [],
  }], assignments: [{ clubId, termId: "555555555555555555555555",
    positionId: "444444444444444444444444", membershipId,
    effectiveFrom: new Date("2026-09-01T00:00:00.000Z"), confirmedBy: actor.id,
  }],
}) };

function repository(): { repo: MembershipRepository; captured: { state?: string; date?: Date; reason?: string; email?: string } } {
  const captured: { state?: string; date?: Date; reason?: string; email?: string } = {};
  const repo: MembershipRepository = {
    listMine: async () => [], listClub: async () => [],
    onboardManually: async (input) => {
      captured.email = input.email; captured.reason = input.reason;
      return { id: membershipId, clubId, userId: "666666666666666666666666", state: "Active", joinedAt: now, statusHistory: [] };
    },
    changeState: async (input) => {
      captured.state = input.state; captured.date = input.effectiveDate; captured.reason = input.reason;
      return { id: membershipId, clubId, userId: actor.id, state: input.state,
        joinedAt: now, statusHistory: [] };
    },
    requestWithdrawal: async (input) => ({ id: "555555555555555555555555",
      membershipId: input.membershipId, clubId, userId: input.userId, reason: input.reason,
      requestedEffectiveDate: input.requestedEffectiveDate, state: "Pending", createdAt: now }),
    listMyWithdrawalRequests: async () => [], listClubWithdrawalRequests: async () => [],
    executeWithdrawal: async () => { throw new Error("unused"); },
  };
  return { repo, captured };
}

describe("UC21/UC22 membership lifecycle", () => {
  it("uses the Vietnam calendar day when identifying past effective dates", () => {
    expect(isBeforeToday(new Date("2026-10-08T16:59:00.000Z"), now)).toBe(true);
    expect(isBeforeToday(new Date("2026-10-08T17:00:00.000Z"), now)).toBe(false);
  });

  it("blocks past status dates and requires a ban reason", async () => {
    const { repo, captured } = repository();
    await expect(changeMembershipState(repo, access, actor, { clubId, membershipId,
      state: "Inactive", effectiveDate: new Date("2026-10-08T16:59:00.000Z") }, now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(changeMembershipState(repo, access, actor, { clubId, membershipId,
      state: "Banned", effectiveDate: now }, now)).rejects.toMatchObject({ kind: "validation" });
    expect(captured.state).toBeUndefined();
  });

  it("requires a reason and a valid email for manual onboarding (UC20 A1, BR13)", async () => {
    const { repo, captured } = repository();
    await expect(onboardMemberManually(repo, access, actor, { clubId, email: "student@fpt.edu.vn", reason: "  " }, now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(onboardMemberManually(repo, access, actor, { clubId, email: "not-an-email", reason: "Transfer" }, now))
      .rejects.toMatchObject({ kind: "validation" });
    expect(captured.email).toBeUndefined();
    await onboardMemberManually(repo, access, actor, { clubId, email: " Student@FPT.edu.vn ", reason: " Transfer " }, now);
    expect(captured).toMatchObject({ email: "student@fpt.edu.vn", reason: "Transfer" });
  });

  it("accepts a future leave request without changing membership state", async () => {
    const { repo } = repository();
    const result = await requestMembershipWithdrawal(repo, actor, { membershipId,
      reason: "Moving to another city", requestedEffectiveDate: new Date("2026-10-12T00:00:00.000Z") }, now);
    expect(result).toMatchObject({ membershipId, userId: actor.id,
      reason: "Moving to another city", state: "Pending" });
  });

  it("normalizes ban reasons before persistence", async () => {
    const { repo, captured } = repository();
    await changeMembershipState(repo, access, actor, { clubId, membershipId,
      state: "Banned", effectiveDate: now, reason: "  repeated abuse  " }, now);
    expect(captured).toMatchObject({ state: "Banned", reason: "repeated abuse" });
  });

  it("passes the clock to the roster so it can resolve currently held roles", async () => {
    const { repo } = repository();
    let seen: Date | undefined;
    repo.listClub = async (_clubId, at) => { seen = at; return []; };
    await listClubMemberships(repo, access, actor, clubId, now);
    expect(seen).toBe(now);
    await expect(listClubMemberships(repo, { findSnapshot: async () => null }, actor, clubId, now))
      .rejects.toMatchObject({ kind: "forbidden" });
  });
});
