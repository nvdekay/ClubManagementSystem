import { describe, expect, it, vi } from "vitest";
import type { AuthRepository } from "../../src/domain/auth.js";
import type { ClubAccessRepository, ClubAccessSnapshot } from "../../src/domain/access.js";
import type { BoardNominationContext, BoardNominationDetail,
  BoardNominationRepository } from "../../src/domain/board-nomination.js";
import {
  decideBoardNomination,
  getBoardNominationContext,
  listBoardNominations,
  submitBoardNomination,
} from "../../src/usecase/board-nomination.js";

const now = new Date("2026-10-08T12:00:00Z");
const actor = { id: "000000000000000000000001", accountState: "Active" as const };
const clubId = "000000000000000000000002";
const leaderPositionId = "000000000000000000000003";
const otherPositionId = "000000000000000000000004";
const memberId = "000000000000000000000005";
const otherMemberId = "000000000000000000000006";
const seat1Id = "000000000000000000000007";
const seat2Id = "000000000000000000000008";
const nominationId = "000000000000000000000009";

function context(): BoardNominationContext {
  return { clubId, clubName: "Robotics", clubState: "Pending Setup",
    term: { id: "000000000000000000000010", name: "Founding term", state: "Active",
      startAt: now, endAt: new Date("2027-10-08T12:00:00Z") },
    positions: [
      { id: leaderPositionId, code: "PRESIDENT", name: "President", isLeaderRole: true },
      { id: otherPositionId, code: "VP", name: "Vice President", isLeaderRole: false },
    ],
    candidates: [
      { membershipId: memberId, userId: actor.id, displayName: "Founder", state: "Active" },
      { membershipId: otherMemberId, userId: "000000000000000000000011", displayName: "Member", state: "Active" },
    ], occupiedPositionIds: [], pendingPositionIds: [], presidentConflictMembershipIds: [],
  };
}

function detail(): BoardNominationDetail {
  const base = context();
  const task = { id: "000000000000000000000012", state: "Open", assigneeId: actor.id, openedAt: now };
  return { id: nominationId, clubId, clubName: base.clubName, clubState: base.clubState,
    term: base.term!, state: "Pending Confirmation", submittedBy: actor.id, submittedAt: now,
    task, decisions: [], seats: [
      { id: seat1Id, positionId: leaderPositionId, positionCode: "PRESIDENT", positionName: "President",
        isLeaderRole: true, membershipId: memberId, userId: actor.id, displayName: "Founder", state: "Pending Confirmation" },
      { id: seat2Id, positionId: otherPositionId, positionCode: "VP", positionName: "Vice President",
        isLeaderRole: false, membershipId: otherMemberId, userId: "000000000000000000000011", displayName: "Member", state: "Pending Confirmation" },
    ] };
}

function setup(options: { role?: string; permission?: boolean; data?: BoardNominationContext } = {}) {
  const repository: BoardNominationRepository = {
    getContext: vi.fn(async () => options.data ?? context()),
    submit: vi.fn(async () => detail()), listOpen: vi.fn(async () => [detail()]),
    find: vi.fn(async () => detail()), claim: vi.fn(async () => detail()),
    decide: vi.fn(async () => detail()),
  };
  const auth: AuthRepository = {
    allowedDomains: async () => [],
    findOrCreateGoogleUser: async () => { throw new Error("unused"); },
    findUserById: async () => null,
    systemRoleCodes: async () => options.role ? [options.role] : [],
    clubIds: async () => [], auditLogin: async () => undefined,
  };
  const snapshot: ClubAccessSnapshot = { ...context(), membership: null,
    clubState: context().clubState, terms: [], positions: [], assignments: [], isApprovedFounder: true };
  const access: ClubAccessRepository = { findSnapshot: async () =>
    options.permission === false ? null : snapshot };
  return { repository, auth, access };
}

function officerAuth(codes: string[]): AuthRepository {
  return { allowedDomains: async () => [],
    findOrCreateGoogleUser: async () => { throw new Error("unused"); },
    findUserById: async () => null, systemRoleCodes: async () => codes,
    clubIds: async () => [], auditLogin: async () => undefined };
}

describe("UC10/UC11 board nomination use cases", () => {
  it("allows the founding leader to read nomination context and submit active members", async () => {
    const { repository, access } = setup();
    await expect(getBoardNominationContext(repository, access, actor, clubId, now))
      .resolves.toMatchObject({ clubName: "Robotics", positions: expect.arrayContaining([
        expect.objectContaining({ code: "PRESIDENT" }),
      ]) });
    await expect(submitBoardNomination(repository, access, actor, clubId, [
      { positionId: leaderPositionId, membershipId: memberId },
    ], now)).resolves.toMatchObject({ state: "Pending Confirmation" });
    expect(repository.submit).toHaveBeenCalledWith(clubId, actor.id, context().term!.id,
      [{ positionId: leaderPositionId, membershipId: memberId }], now);
  });

  it("rejects duplicate seats, inactive nominees, occupied seats, and a President overlap", async () => {
    const { repository, access } = setup();
    await expect(submitBoardNomination(repository, access, actor, clubId, [
      { positionId: leaderPositionId, membershipId: memberId },
      { positionId: leaderPositionId, membershipId: otherMemberId },
    ], now)).rejects.toMatchObject({ kind: "validation" });
    await expect(submitBoardNomination(repository, access, actor, clubId, [
      { positionId: leaderPositionId, membershipId: "000000000000000000000099" },
    ], now)).rejects.toMatchObject({ kind: "validation" });
    await expect(submitBoardNomination(setup({ data: { ...context(), occupiedPositionIds: [leaderPositionId] } }).repository,
      access, actor, clubId, [{ positionId: leaderPositionId, membershipId: memberId }], now))
      .rejects.toMatchObject({ kind: "conflict" });
    await expect(submitBoardNomination(setup({ data: { ...context(),
      presidentConflictMembershipIds: [memberId] } }).repository, access, actor, clubId,
    [{ positionId: leaderPositionId, membershipId: memberId }], now)).rejects.toMatchObject({ kind: "conflict" });
    await expect(submitBoardNomination(repository, { findSnapshot: async () => null }, actor,
      clubId, [{ positionId: leaderPositionId, membershipId: memberId }], now))
      .rejects.toMatchObject({ kind: "forbidden" });
  });

  it("allows one officer to decide once and requires one result for every pending seat", async () => {
    const { repository, auth } = setup({ role: "ICPDP_OFFICER" });
    await expect(decideBoardNomination(repository, auth, actor, nominationId, {
      confirmedSeatIds: [seat1Id], returnedSeats: [{ seatId: seat2Id, reason: "Need updated details" }],
    }, now)).resolves.toMatchObject({ id: nominationId });
    expect(repository.decide).toHaveBeenCalledWith(nominationId, actor.id, {
      confirmedSeatIds: [seat1Id], returnedSeats: [{ seatId: seat2Id, reason: "Need updated details" }],
      reason: undefined,
    }, now);
    await expect(decideBoardNomination(repository, auth, actor, nominationId, {
      confirmedSeatIds: [seat1Id], returnedSeats: [],
    }, now)).rejects.toMatchObject({ kind: "validation" });
  });

  it("protects ICPDP queue access from every role except ICPDP_OFFICER", async () => {
    const { repository } = setup();
    await expect(listBoardNominations(repository, officerAuth(["ICPDP_HEAD"]), actor))
      .rejects.toMatchObject({ kind: "forbidden" });
    await expect(listBoardNominations(repository, officerAuth(["ICPDP_OFFICER"]), actor))
      .resolves.toHaveLength(1);
  });
});
