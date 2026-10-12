import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoBoardNominationRepository } from "../../src/infra/db/mongo-board-nomination-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-board-nomination-test-${process.pid}`;

describe.skipIf(!uri)("Mongo board nomination repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("submits one task, records one partial decision and activates the founding club", async () => {
    const now = new Date("2026-10-08T12:00:00Z");
    const ids = Array.from({ length: 7 }, () => new Types.ObjectId());
    const [clubId, termId, founderUserId, secondUserId, officerId, presidentId, viceId] = ids;
    const founderMembershipId = new Types.ObjectId();
    const secondMembershipId = new Types.ObjectId();
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-BOARD", name: "Board Club",
      field: "Technology", state: "Pending Setup", createdAt: now });
    await ucmsModels.clubTerms!.create({ _id: termId, clubId, name: "Founding term",
      startAt: now, endAt: new Date("2027-10-08T12:00:00Z"), state: "Active" });
    await ucmsModels.users!.insertMany([
      { _id: founderUserId, email: "founder@example.edu", displayName: "Founder", accountState: "Active", createdAt: now },
      { _id: secondUserId, email: "member@example.edu", displayName: "Member", accountState: "Active", createdAt: now },
      { _id: officerId, email: "officer@example.edu", displayName: "Officer", accountState: "Active", createdAt: now },
    ]);
    await ucmsModels.clubMemberships!.insertMany([
      { _id: founderMembershipId, clubId, userId: founderUserId, state: "Active", joinedAt: now, statusHistory: [] },
      { _id: secondMembershipId, clubId, userId: secondUserId, state: "Active", joinedAt: now, statusHistory: [] },
    ]);
    await ucmsModels.clubPositions!.insertMany([
      { _id: presidentId, clubId, code: "PRESIDENT", name: "President", isBoardSeat: true,
        isLeaderRole: true, isDefaultMemberRole: false, isSingleHolder: true, permissionCodes: [], isActive: true },
      { _id: viceId, clubId, code: "VICE", name: "Vice President", isBoardSeat: true,
        isLeaderRole: false, isDefaultMemberRole: false, isSingleHolder: true, permissionCodes: [], isActive: true },
    ]);
    await ucmsModels.roles!.create({ _id: new Types.ObjectId(), code: "ICPDP_OFFICER",
      name: "ICPDP Officer", scope: "system", permissionCodes: [], isSystem: true });
    const role = await ucmsModels.roles!.findOne({ code: "ICPDP_OFFICER" }).lean();
    await ucmsModels.userRoleAssignments!.create({ userId: officerId, roleId: role!._id,
      grantedBy: officerId, grantedAt: now, computedAt: now });

    const repo = mongoBoardNominationRepository();
    const context = await repo.getContext(clubId.toString());
    expect(context).toMatchObject({ clubState: "Pending Setup", candidates: expect.arrayContaining([
      expect.objectContaining({ membershipId: founderMembershipId.toString(), displayName: "Founder" }),
    ]) });
    const submitted = await repo.submit(clubId.toString(), founderUserId.toString(), termId.toString(), [
      { positionId: presidentId.toString(), membershipId: founderMembershipId.toString() },
      { positionId: viceId.toString(), membershipId: secondMembershipId.toString() },
    ], now);
    expect(await ucmsModels.approvalTasks!.countDocuments({ entityType: "BOARD_NOMINATION",
      entityId: new Types.ObjectId(submitted.id) })).toBe(1);
    expect(await repo.listOpen()).toHaveLength(1);
    const claimed = await repo.claim(submitted.id, officerId.toString(), now);
    const presidentSeat = claimed.seats.find((seat) => seat.positionId === presidentId.toString())!;
    const viceSeat = claimed.seats.find((seat) => seat.positionId === viceId.toString())!;
    const decided = await repo.decide(submitted.id, officerId.toString(), {
      confirmedSeatIds: [presidentSeat.id],
      returnedSeats: [{ seatId: viceSeat.id, reason: "Needs renewed term consent" }],
      reason: "Confirm founding president; return vice seat for update",
    }, now);

    expect(decided).toMatchObject({ state: "Returned", clubState: "Active",
      seats: expect.arrayContaining([
        expect.objectContaining({ id: presidentSeat.id, state: "Confirmed" }),
        expect.objectContaining({ id: viceSeat.id, state: "Returned", reason: "Needs renewed term consent" }),
      ]), decisions: [expect.objectContaining({ outcome: "Approve",
        confirmedSeatIds: [presidentSeat.id], returnedSeatIds: [viceSeat.id] })] });
    expect(await ucmsModels.clubs!.findById(clubId).lean()).toMatchObject({ state: "Active" });
    expect(await ucmsModels.clubTerms!.findById(termId).lean()).toMatchObject({
      confirmedBy: officerId, confirmedAt: now,
    });
    expect(await ucmsModels.clubPositionAssignments!.countDocuments({ termId,
      positionId: presidentId, membershipId: founderMembershipId, confirmedBy: officerId })).toBe(1);
    expect(await ucmsModels.clubPositionAssignments!.countDocuments({ termId, positionId: viceId })).toBe(0);
    expect(await ucmsModels.approvalDecisions!.countDocuments({ approvalTaskId: new Types.ObjectId(claimed.task.id) })).toBe(1);
    await expect(repo.decide(submitted.id, officerId.toString(), {
      confirmedSeatIds: [presidentSeat.id],
      returnedSeats: [{ seatId: viceSeat.id, reason: "Needs renewed term consent" }],
    }, now)).rejects.toMatchObject({ kind: "conflict" });
    expect(await repo.listOpen()).toHaveLength(0);
    expect(await ucmsModels.auditLogs!.countDocuments({ entityId: new Types.ObjectId(submitted.id),
      action: { $in: ["BOARD_NOMINATION_SUBMITTED", "BOARD_NOMINATION_CLAIMED", "BOARD_NOMINATION_RETURNED"] } })).toBe(3);
    expect(await ucmsModels.notifications!.countDocuments({ entityType: "BoardNomination",
      entityId: new Types.ObjectId(submitted.id) })).toBe(3);
  }, 60_000);

  it("returns a nominee whose membership became inactive before confirmation", async () => {
    const now = new Date("2026-10-08T13:00:00Z");
    const clubId = new Types.ObjectId();
    const termId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    const officerId = new Types.ObjectId();
    const membershipId = new Types.ObjectId();
    const positionId = new Types.ObjectId();
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-INACTIVE", name: "Inactive Club",
      field: "Community", state: "Pending Setup", createdAt: now });
    await ucmsModels.clubTerms!.create({ _id: termId, clubId, name: "Setup term", startAt: now,
      endAt: new Date("2027-10-08T13:00:00Z"), state: "Active" });
    await ucmsModels.users!.create({ _id: userId, email: "inactive@example.edu", displayName: "Inactive",
      accountState: "Active", createdAt: now });
    await ucmsModels.clubMemberships!.create({ _id: membershipId, clubId, userId,
      state: "Active", joinedAt: now, statusHistory: [] });
    await ucmsModels.clubPositions!.create({ _id: positionId, clubId, code: "PRESIDENT",
      name: "President", isBoardSeat: true, isLeaderRole: true, isDefaultMemberRole: false,
      isSingleHolder: true, permissionCodes: [], isActive: true });
    const repo = mongoBoardNominationRepository();
    const submitted = await repo.submit(clubId.toString(), userId.toString(), termId.toString(), [
      { positionId: positionId.toString(), membershipId: membershipId.toString() },
    ], now);
    const claimed = await repo.claim(submitted.id, officerId.toString(), now);
    const seatId = claimed.seats[0]!.id;
    await ucmsModels.clubMemberships!.updateOne({ _id: membershipId }, { $set: { state: "Inactive" } });
    const result = await repo.decide(submitted.id, officerId.toString(), {
      confirmedSeatIds: [seatId], returnedSeats: [],
    }, now);
    expect(result).toMatchObject({ clubState: "Pending Setup", seats: [
      expect.objectContaining({ state: "Returned", reason: "Nominee membership is no longer Active" }),
    ], decisions: [expect.objectContaining({ outcome: "Reject", returnedSeatIds: [seatId] })] });
    expect(await ucmsModels.clubPositionAssignments!.countDocuments({ positionId })).toBe(0);
    expect(await ucmsModels.clubs!.findById(clubId).lean()).toMatchObject({ state: "Pending Setup" });
  }, 60_000);

  it("detects a President term overlapping across two clubs", async () => {
    const now = new Date("2026-10-08T14:00:00Z");
    const clubIds = [new Types.ObjectId(), new Types.ObjectId()];
    const termIds = [new Types.ObjectId(), new Types.ObjectId()];
    const userId = new Types.ObjectId();
    const candidateMembershipId = new Types.ObjectId();
    const currentMembershipId = new Types.ObjectId();
    const candidatePresidentId = new Types.ObjectId();
    const currentPresidentId = new Types.ObjectId();
    const assignmentId = new Types.ObjectId();
    await ucmsModels.clubs!.insertMany(clubIds.map((clubId, index) => ({ _id: clubId,
      code: `CLB-OVERLAP-${index}`, name: `Overlap Club ${index}`, field: "Technology",
      state: index ? "Active" : "Pending Setup", createdAt: now })));
    await ucmsModels.clubTerms!.insertMany(termIds.map((termId, index) => ({ _id: termId,
      clubId: clubIds[index], name: `Term ${index}`, startAt: now,
      endAt: new Date("2027-10-08T14:00:00Z"), state: "Active" })));
    await ucmsModels.users!.create({ _id: userId, email: "overlap@example.edu",
      displayName: "Overlapping nominee", accountState: "Active", createdAt: now });
    await ucmsModels.clubMemberships!.insertMany([
      { _id: candidateMembershipId, clubId: clubIds[0], userId, state: "Active", joinedAt: now, statusHistory: [] },
      { _id: currentMembershipId, clubId: clubIds[1], userId, state: "Active", joinedAt: now, statusHistory: [] },
    ]);
    await ucmsModels.clubPositions!.insertMany([
      { _id: candidatePresidentId, clubId: clubIds[0], code: "PRESIDENT", name: "President",
        isBoardSeat: true, isLeaderRole: true, isDefaultMemberRole: false, isSingleHolder: true,
        permissionCodes: [], isActive: true },
      { _id: currentPresidentId, clubId: clubIds[1], code: "PRESIDENT", name: "President",
        isBoardSeat: true, isLeaderRole: true, isDefaultMemberRole: false, isSingleHolder: true,
        permissionCodes: [], isActive: true },
    ]);
    await ucmsModels.clubPositionAssignments!.create({ _id: assignmentId, clubId: clubIds[1],
      termId: termIds[1], positionId: currentPresidentId, membershipId: currentMembershipId,
      effectiveFrom: now, assignedBy: userId, confirmedBy: userId });
    const repo = mongoBoardNominationRepository();
    const context = await repo.getContext(clubIds[0]!.toString());
    expect(context?.presidentConflictMembershipIds).toContain(candidateMembershipId.toString());
    await expect(repo.submit(clubIds[0]!.toString(), userId.toString(), termIds[0]!.toString(), [
      { positionId: candidatePresidentId.toString(), membershipId: candidateMembershipId.toString() },
    ], now)).rejects.toMatchObject({ kind: "conflict" });
  }, 60_000);
});
