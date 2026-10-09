import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoLeadershipTransitionRepository } from "../../src/infra/db/mongo-leadership-transition-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-leadership-transition-test-${process.pid}`;

describe.skipIf(!uri)("Mongo leadership transition repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("holds a suspended club, then atomically changes terms, board roles and follow-ups", async () => {
    const now = new Date("2026-10-09T10:00:00Z");
    const clubId = new Types.ObjectId();
    const fromTermId = new Types.ObjectId();
    const toTermId = new Types.ObjectId();
    const oldLeaderUserId = new Types.ObjectId();
    const oldViceUserId = new Types.ObjectId();
    const newLeaderUserId = new Types.ObjectId();
    const newTreasurerUserId = new Types.ObjectId();
    const officerId = new Types.ObjectId();
    const oldLeaderMembershipId = new Types.ObjectId();
    const oldViceMembershipId = new Types.ObjectId();
    const newLeaderMembershipId = new Types.ObjectId();
    const newTreasurerMembershipId = new Types.ObjectId();
    const presidentId = new Types.ObjectId();
    const viceId = new Types.ObjectId();
    const membersId = new Types.ObjectId();
    const planId = new Types.ObjectId();
    const taskId = new Types.ObjectId();
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-TRANSITION", name: "Transition Club",
      field: "Technology", state: "Suspended", createdAt: now });
    await ucmsModels.clubTerms!.insertMany([
      { _id: fromTermId, clubId, name: "2025-2026", startAt: new Date("2025-10-01T00:00:00Z"),
        endAt: new Date("2026-11-01T00:00:00Z"), state: "Active" },
      { _id: toTermId, clubId, name: "2026-2027", startAt: new Date("2026-11-01T00:00:00Z"),
        endAt: new Date("2027-11-01T00:00:00Z"), state: "Planned", previousTermId: fromTermId },
    ]);
    await ucmsModels.users!.insertMany([
      [oldLeaderUserId, "old-leader"], [oldViceUserId, "old-vice"],
      [newLeaderUserId, "new-leader"], [newTreasurerUserId, "new-treasurer"],
      [officerId, "officer"],
    ].map(([id, name]) => ({ _id: id, email: `${String(name)}@example.edu`,
      displayName: String(name), accountState: "Active", createdAt: now })));
    await ucmsModels.clubMemberships!.insertMany([
      [oldLeaderMembershipId, oldLeaderUserId], [oldViceMembershipId, oldViceUserId],
      [newLeaderMembershipId, newLeaderUserId], [newTreasurerMembershipId, newTreasurerUserId],
    ].map(([id, userId]) => ({ _id: id, clubId, userId, state: "Active", joinedAt: now, statusHistory: [] })));
    await ucmsModels.clubPositions!.insertMany([
      { _id: presidentId, clubId, code: "PRESIDENT", name: "President", isBoardSeat: true,
        isLeaderRole: true, isDefaultMemberRole: false, isSingleHolder: true, permissionCodes: [], isActive: true },
      { _id: viceId, clubId, code: "VICE", name: "Vice President", isBoardSeat: true,
        isLeaderRole: false, isDefaultMemberRole: false, isSingleHolder: true,
        permissionCodes: ["club.event.manage"], isActive: true },
      { _id: membersId, clubId, code: "MEMBERS", name: "Members", isBoardSeat: false,
        isLeaderRole: false, isDefaultMemberRole: true, isSingleHolder: false, permissionCodes: [], isActive: true },
    ]);
    await ucmsModels.clubPositionAssignments!.insertMany([
      { clubId, termId: fromTermId, positionId: presidentId, membershipId: oldLeaderMembershipId,
        effectiveFrom: new Date("2025-10-01T00:00:00Z"), assignedBy: officerId, confirmedBy: officerId },
      { clubId, termId: fromTermId, positionId: viceId, membershipId: oldViceMembershipId,
        effectiveFrom: new Date("2025-10-01T00:00:00Z"), assignedBy: officerId, confirmedBy: officerId },
    ]);
    await ucmsModels.clubRoleStructureVersions!.create({ clubId, versionNo: 1, effectiveFrom: now,
      source: "APPLICATION", roles: [], createdBy: officerId, createdAt: now });
    await ucmsModels.transitionPlans!.create({ _id: planId, clubId, fromTermId, toTermId,
      candidates: [
        { positionCode: "PRESIDENT", membershipId: newLeaderMembershipId.toString() },
        { positionCode: "TREASURER", membershipId: newTreasurerMembershipId.toString() },
      ], outstandingObligations: [{ id: "budget-1", type: "BUDGET",
        description: "Finish event settlement", assigneeMembershipId: newTreasurerMembershipId.toString() }],
      handoverItems: { items: [{ id: "asset-1", description: "Transfer equipment register" }],
        proposedBoardRoles: [
          { code: "PRESIDENT", name: "President", isLeaderRole: true, isSingleHolder: true,
            permissionCodes: [] },
          { code: "TREASURER", name: "Treasurer", isLeaderRole: false, isSingleHolder: true,
            permissionCodes: ["club.expense.record"] },
        ] }, state: "Pending Confirmation", submittedBy: oldLeaderUserId, submittedAt: now });
    await ucmsModels.approvalTasks!.create({ _id: taskId, entityType: "TRANSITION_PLAN", entityId: planId,
      clubId, title: "Leadership transition — Transition Club", state: "Open", openedAt: now });

    const repo = mongoLeadershipTransitionRepository();
    expect(await repo.listOpen()).toHaveLength(1);
    await repo.claim(planId.toString(), officerId.toString(), now);
    await expect(repo.decide(planId.toString(), officerId.toString(), {
      outcome: "Approve", followUpObligationIds: ["budget-1"],
    }, now)).rejects.toMatchObject({ kind: "conflict" });
    expect(await ucmsModels.transitionPlans!.findById(planId).lean()).toMatchObject({ state: "Pending Confirmation" });
    expect(await ucmsModels.approvalTasks!.findById(taskId).lean()).toMatchObject({ state: "Open" });

    await ucmsModels.clubs!.updateOne({ _id: clubId }, { $set: { state: "Active" } });
    const decided = await repo.decide(planId.toString(), officerId.toString(), {
      outcome: "Approve", reason: "Continue tracking settlement", followUpObligationIds: ["budget-1"],
    }, now);
    expect(decided).toMatchObject({ state: "Confirmed", followUpConditions: [
      expect.objectContaining({ id: "budget-1" }),
    ], decisions: [expect.objectContaining({ outcome: "Approve", followUpObligationIds: ["budget-1"] })] });
    expect(await ucmsModels.clubTerms!.findById(fromTermId).lean()).toMatchObject({ state: "Closed", endAt: now });
    expect(await ucmsModels.clubTerms!.findById(toTermId).lean()).toMatchObject({
      state: "Active", startAt: now, confirmedBy: officerId,
    });
    expect(await ucmsModels.clubPositionAssignments!.countDocuments({ termId: fromTermId,
      effectiveTo: now })).toBe(2);
    expect(await ucmsModels.clubPositionAssignments!.countDocuments({ termId: toTermId,
      confirmedBy: officerId })).toBe(2);
    expect(await ucmsModels.clubPositions!.findById(viceId).lean()).toMatchObject({ isBoardSeat: false });
    expect(await ucmsModels.clubPositions!.findById(membersId).lean()).toMatchObject({
      isDefaultMemberRole: true, isActive: true,
    });
    expect(await ucmsModels.clubRoleStructureVersions!.findOne({ clubId, versionNo: 2 }).lean())
      .toMatchObject({ source: "TRANSITION", sourceRefId: planId });
    expect(await ucmsModels.auditLogs!.countDocuments({ entityId: planId,
      action: { $in: ["TRANSITION_PLAN_CLAIMED", "TRANSITION_PLAN_CONFIRMED"] } })).toBe(2);
    expect(await ucmsModels.notifications!.countDocuments({ entityId: planId,
      eventCode: "LEADERSHIP_TRANSITION_CONFIRMED" })).toBe(4);
    await expect(repo.decide(planId.toString(), officerId.toString(), {
      outcome: "Approve", followUpObligationIds: [],
    }, now)).rejects.toMatchObject({ kind: "conflict" });
  }, 60_000);

  it("returns a plan with a reason without changing terms or granting assignments", async () => {
    const now = new Date("2026-10-09T12:00:00Z");
    const clubId = new Types.ObjectId();
    const fromTermId = new Types.ObjectId();
    const toTermId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    const officerId = new Types.ObjectId();
    const membershipId = new Types.ObjectId();
    const positionId = new Types.ObjectId();
    const planId = new Types.ObjectId();
    const taskId = new Types.ObjectId();
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-RETURN-TRANSITION",
      name: "Returned Transition Club", field: "Community", state: "Active", createdAt: now });
    await ucmsModels.clubTerms!.insertMany([
      { _id: fromTermId, clubId, name: "Current", startAt: new Date("2025-10-01T00:00:00Z"),
        endAt: new Date("2026-11-01T00:00:00Z"), state: "Active" },
      { _id: toTermId, clubId, name: "Next", startAt: new Date("2026-11-01T00:00:00Z"),
        endAt: new Date("2027-11-01T00:00:00Z"), state: "Planned", previousTermId: fromTermId },
    ]);
    await ucmsModels.users!.insertMany([
      { _id: userId, email: "returned-candidate@example.edu", displayName: "Candidate",
        accountState: "Active", createdAt: now },
      { _id: officerId, email: "returned-officer@example.edu", displayName: "Officer",
        accountState: "Active", createdAt: now },
    ]);
    await ucmsModels.clubMemberships!.create({ _id: membershipId, clubId, userId,
      state: "Active", joinedAt: now, statusHistory: [] });
    await ucmsModels.clubPositions!.create({ _id: positionId, clubId, code: "PRESIDENT",
      name: "President", isBoardSeat: true, isLeaderRole: true, isDefaultMemberRole: false,
      isSingleHolder: true, permissionCodes: [], isActive: true });
    await ucmsModels.transitionPlans!.create({ _id: planId, clubId, fromTermId, toTermId,
      candidates: [{ positionCode: "PRESIDENT", membershipId: membershipId.toString() }],
      outstandingObligations: [], handoverItems: { items: [] }, state: "Pending Confirmation",
      submittedBy: userId, submittedAt: now });
    await ucmsModels.approvalTasks!.create({ _id: taskId, entityType: "TRANSITION_PLAN",
      entityId: planId, clubId, title: "Leadership transition", state: "Open",
      assigneeId: officerId, openedAt: now });

    const result = await mongoLeadershipTransitionRepository().decide(
      planId.toString(), officerId.toString(), {
        outcome: "Request revision", reason: "Assign every outstanding asset", followUpObligationIds: [],
      }, now,
    );

    expect(result).toMatchObject({ state: "Returned", decisions: [
      expect.objectContaining({ outcome: "Request revision", reason: "Assign every outstanding asset" }),
    ] });
    expect(await ucmsModels.clubTerms!.findById(fromTermId).lean()).toMatchObject({ state: "Active" });
    expect(await ucmsModels.clubTerms!.findById(toTermId).lean()).toMatchObject({ state: "Planned" });
    expect(await ucmsModels.clubPositionAssignments!.countDocuments({ termId: toTermId })).toBe(0);
    expect(await ucmsModels.auditLogs!.countDocuments({ entityId: planId,
      action: "TRANSITION_PLAN_RETURNED" })).toBe(1);
  }, 60_000);
});
