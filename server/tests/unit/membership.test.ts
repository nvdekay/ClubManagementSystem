import { describe, expect, it } from "vitest";
import type { MembershipRepository } from "../../src/domain/membership.js";
import type { ClubAccessRepository } from "../../src/domain/access.js";
import { isBeforeToday } from "../../src/domain/membership.js";
import { changeMembershipState, requestMembershipWithdrawal } from "../../src/usecase/membership.js";

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

function repository(): { repo: MembershipRepository; captured: { state?: string; date?: Date; reason?: string } } {
  const captured: { state?: string; date?: Date; reason?: string } = {};
  const repo: MembershipRepository = {
    listMine: async () => [], listClub: async () => [],
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
});
