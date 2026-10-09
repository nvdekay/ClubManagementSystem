import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoMembershipRepository } from "../../src/infra/db/mongo-membership-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-membership-test-${process.pid}`;
const now = new Date("2026-10-09T03:00:00.000Z");

describe.skipIf(!uri)("Mongo membership lifecycle repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("records a leave request without changing membership, then executes Left atomically", async () => {
    const clubId = new Types.ObjectId();
    const studentId = new Types.ObjectId();
    const managerId = new Types.ObjectId();
    const studentMembershipId = new Types.ObjectId();
    const managerMembershipId = new Types.ObjectId();
    const termId = new Types.ObjectId();
    const positionId = new Types.ObjectId();
    await ucmsModels.clubs.create({ _id: clubId, code: `ML-${clubId.toString().slice(-8)}`,
      name: "Membership Lifecycle", field: "Technology", state: "Active", createdAt: now });
    await ucmsModels.users.create([
      { _id: studentId, email: `${studentId}@example.edu`, displayName: "Leaving Member", accountState: "Active", createdAt: now },
      { _id: managerId, email: `${managerId}@example.edu`, displayName: "Club Manager", accountState: "Active", createdAt: now },
    ]);
    await ucmsModels.clubMemberships.create([
      { _id: studentMembershipId, clubId, userId: studentId, state: "Active", joinedAt: now,
        defaultRole: "MEMBERS", statusHistory: [] },
      { _id: managerMembershipId, clubId, userId: managerId, state: "Active", joinedAt: now, statusHistory: [] },
    ]);
    await ucmsModels.clubTerms.create({ _id: termId, clubId, name: "Term 2026", state: "Active",
      startAt: new Date("2026-09-01"), endAt: new Date("2027-09-01") });
    await ucmsModels.clubPositions.create({ _id: positionId, clubId, code: "MEMBERSHIP_MANAGER",
      name: "Membership Manager", isBoardSeat: false, isLeaderRole: false, isDefaultMemberRole: false,
      isSingleHolder: false, permissionCodes: ["club.member.manage"], isActive: true });
    await ucmsModels.clubPositionAssignments.create({ clubId, termId, positionId,
      membershipId: managerMembershipId, effectiveFrom: new Date("2026-09-01"), assignedBy: managerId });

    const repo = mongoMembershipRepository();
    const request = await repo.requestWithdrawal({ membershipId: studentMembershipId.toString(),
      userId: studentId.toString(), reason: "Moving away", requestedEffectiveDate: now, now });
    expect(request.state).toBe("Pending");
    expect(await ucmsModels.clubMemberships.findById(studentMembershipId).select("state").lean())
      .toMatchObject({ state: "Active" });
    expect(await ucmsModels.notifications.countDocuments({ recipientUserId: managerId,
      eventCode: "MEMBERSHIP_WITHDRAWAL_REQUESTED", entityId: new Types.ObjectId(request.id) })).toBe(1);

    const left = await repo.executeWithdrawal({ clubId: clubId.toString(), requestId: request.id,
      actorId: managerId.toString(), now: new Date("2026-10-10T03:00:00.000Z") });
    expect(left).toMatchObject({ id: studentMembershipId.toString(), state: "Left" });
    expect(await ucmsModels.membershipWithdrawalRequests.findById(request.id).select("state").lean())
      .toMatchObject({ state: "Executed" });
    expect(await ucmsModels.clubMemberships.findById(studentMembershipId)
      .select("defaultRole statusHistory").lean()).toMatchObject({
      statusHistory: [expect.objectContaining({ toState: "Left" })],
    });
    expect(await ucmsModels.auditLogs.countDocuments({ entityId: studentMembershipId,
      action: "CLUB_MEMBERSHIP_LEFT" })).toBe(1);
  }, 60_000);

  it("holds a board-seat withdrawal and revokes roles when a member is banned", async () => {
    const clubId = new Types.ObjectId();
    const studentId = new Types.ObjectId();
    const membershipId = new Types.ObjectId();
    const termId = new Types.ObjectId();
    const leaderPositionId = new Types.ObjectId();
    const futurePositionId = new Types.ObjectId();
    const managerId = new Types.ObjectId();
    const managerMembershipId = new Types.ObjectId();
    const managerPositionId = new Types.ObjectId();
    await ucmsModels.clubs.create({ _id: clubId, code: `BRD-${clubId.toString().slice(-8)}`,
      name: "Board Seat", field: "Technology", state: "Active", createdAt: now });
    await ucmsModels.users.create([
      { _id: studentId, email: `${studentId}@example.edu`, displayName: "Board Member", accountState: "Active", createdAt: now },
      { _id: managerId, email: `${managerId}@example.edu`, displayName: "Manager", accountState: "Active", createdAt: now },
    ]);
    await ucmsModels.clubMemberships.create([
      { _id: membershipId, clubId, userId: studentId, state: "Active", joinedAt: now,
        defaultRole: "MEMBERS", statusHistory: [] },
      { _id: managerMembershipId, clubId, userId: managerId, state: "Active", joinedAt: now, statusHistory: [] },
    ]);
    await ucmsModels.clubTerms.create({ _id: termId, clubId, name: "Term", state: "Active",
      startAt: new Date("2026-09-01"), endAt: new Date("2027-09-01") });
    await ucmsModels.clubPositions.create([
      { _id: leaderPositionId, clubId, code: "PRESIDENT", name: "President", isBoardSeat: true,
        isLeaderRole: true, isDefaultMemberRole: false, isSingleHolder: true, permissionCodes: [], isActive: true },
      { _id: managerPositionId, clubId, code: "MANAGER", name: "Manager", isBoardSeat: false,
        isLeaderRole: false, isDefaultMemberRole: false, isSingleHolder: false,
        permissionCodes: ["club.member.manage"], isActive: true },
      { _id: futurePositionId, clubId, code: "FUTURE_ROLE", name: "Future Role", isBoardSeat: false,
        isLeaderRole: false, isDefaultMemberRole: false, isSingleHolder: false,
        permissionCodes: [], isActive: true },
    ]);
    await ucmsModels.clubPositionAssignments.create([
      { clubId, termId, positionId: leaderPositionId, membershipId,
        effectiveFrom: new Date("2026-09-01"), assignedBy: managerId, confirmedBy: managerId },
      { clubId, termId, positionId: managerPositionId, membershipId: managerMembershipId,
        effectiveFrom: new Date("2026-09-01"), assignedBy: managerId },
      { clubId, termId, positionId: futurePositionId, membershipId,
        effectiveFrom: new Date("2026-11-01"), assignedBy: managerId },
    ]);
    const repo = mongoMembershipRepository();
    const request = await repo.requestWithdrawal({ membershipId: membershipId.toString(),
      userId: studentId.toString(), reason: "Leaving", requestedEffectiveDate: now, now });
    expect(request.state).toBe("Held");
    await expect(repo.executeWithdrawal({ clubId: clubId.toString(), requestId: request.id,
      actorId: managerId.toString(), now })).rejects.toMatchObject({ kind: "conflict" });
    await expect(repo.changeState({ clubId: clubId.toString(), membershipId: membershipId.toString(),
      actorId: managerId.toString(), state: "Banned", reason: "Policy breach", effectiveDate: now, now }))
      .rejects.toMatchObject({ kind: "conflict" });

    // Once the confirmed seat is released, banning closes active assignments and removes the default role.
    await ucmsModels.clubPositionAssignments.updateOne({ membershipId, positionId: leaderPositionId },
      { $set: { effectiveTo: now } });
    const banned = await repo.changeState({ clubId: clubId.toString(), membershipId: membershipId.toString(),
      actorId: managerId.toString(), state: "Banned", reason: "Policy breach", effectiveDate: now, now });
    expect(banned).toMatchObject({ state: "Banned", banReason: "Policy breach" });
    // History is readable through the API (FR-UC21-10), including the ObjectId actor stored with it.
    expect(banned.statusHistory).toEqual([expect.objectContaining({ fromState: "Active", toState: "Banned",
      reason: "Policy breach", actorId: managerId.toString() })]);
    expect(await ucmsModels.clubMemberships.findById(membershipId).select("defaultRole").lean())
      .not.toHaveProperty("defaultRole");
    expect(await ucmsModels.clubPositionAssignments.findOne({ membershipId, effectiveTo: now })).toBeTruthy();
    expect(await ucmsModels.clubPositionAssignments.findOne({ membershipId, positionId: futurePositionId })
      .select("effectiveFrom effectiveTo").lean()).toMatchObject({
      effectiveFrom: new Date("2026-11-01"), effectiveTo: new Date("2026-11-01"),
    });
  }, 60_000);
});
