import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ClubApplicationDraft } from "../../src/domain/club-application.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";
import { mongoClubApplicationRepository } from "../../src/infra/db/mongo-club-application-repository.js";
import { mongoClubApplicationReviewRepository } from "../../src/infra/db/mongo-club-application-review-repository.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-application-test-${process.pid}`;

describe.skipIf(!uri)("Mongo club application repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("creates immutable versions and review side effects for initial and revised submissions", async () => {
    const owner = new Types.ObjectId();
    const now = new Date("2026-10-03T12:00:00Z");
    await ucmsModels.users!.create({ _id: owner, email: "founder@example.edu",
      googleSubject: "test-subject", displayName: "Founder", accountState: "Active", createdAt: now });
    const initial: ClubApplicationDraft = {
      clubName: "Robotics Club", field: "Technology", objectives: "Build robots",
      foundingUserIds: [owner.toString()], documents: [], proposedRoles: [],
    };
    const repo = mongoClubApplicationRepository();
    const application = await repo.createDraft(owner.toString(), initial, now);
    const first = await repo.submit({ id: application.id, ownerId: owner.toString(),
      snapshot: initial, expectedDraftRevision: 0,
      policyVersionId: new Types.ObjectId().toString(), now });
    expect(first.versionNo).toBe(1);

    await ucmsModels.clubApplications!.updateOne({ _id: new Types.ObjectId(application.id) },
      { $set: { state: "Revision Requested" } });
    const revised = { ...initial, objectives: "Build autonomous robots" };
    const saved = await repo.saveDraft(application.id, owner.toString(), revised,
      application.draftRevision);
    const second = await repo.submit({ id: application.id, ownerId: owner.toString(),
      snapshot: saved.draft, expectedDraftRevision: saved.draftRevision,
      policyVersionId: new Types.ObjectId().toString(), now: new Date(now.getTime() + 1000) });

    const history = await repo.versions(application.id);
    expect(history.map((version) => version.versionNo)).toEqual([1, 2]);
    expect(history[0]?.snapshot.objectives).toBe("Build robots");
    expect(history[1]?.snapshot.objectives).toBe("Build autonomous robots");
    expect(second.versionNo).toBe(2);
    // Each submission opens one review task; resubmitting closes the previous one (FR-UC07-04).
    const tasks = await ucmsModels.approvalTasks!.find({ entityId: new Types.ObjectId(application.id) })
      .sort({ openedAt: 1 }).lean();
    expect(tasks.map((task) => task.state)).toEqual(["Closed", "Open"]);
    expect(await ucmsModels.auditLogs!.countDocuments({ entityId: new Types.ObjectId(application.id),
      action: "CLUB_APPLICATION_SUBMITTED" })).toBe(2);
    expect(await ucmsModels.notifications!.countDocuments({ entityId: new Types.ObjectId(application.id) }))
      .toBe(2);
  });

  it("claims and approves once, creating the Pending Setup club and role structure v1", async () => {
    const founder = new Types.ObjectId();
    const secondFounder = new Types.ObjectId();
    const officer = new Types.ObjectId();
    const now = new Date("2026-10-08T08:00:00Z");
    await ucmsModels.users!.insertMany([
      { _id: founder, email: "founder-review@example.edu", googleSubject: "founder-review",
        displayName: "Founder Review", accountState: "Active", createdAt: now },
      { _id: secondFounder, email: "cofounder-review@example.edu", googleSubject: "cofounder-review",
        displayName: "Co-founder Review", accountState: "Active", createdAt: now },
      { _id: officer, email: "officer-review@example.edu", googleSubject: "officer-review",
        displayName: "Officer Review", accountState: "Active", createdAt: now },
    ]);
    const snapshot: ClubApplicationDraft = {
      clubName: "Automation Club", field: "Technology", objectives: "Automate responsibly",
      foundingUserIds: [founder.toString(), secondFounder.toString()], documents: [],
      proposedRoles: [
        { code: "CLUB_LEADER", name: "Club Leader", isBoardSeat: true,
          isLeaderRole: true, isDefaultMemberRole: false, isSingleHolder: true,
          permissionCodes: [] },
        { code: "MEMBERS", name: "Members", isBoardSeat: false,
          isLeaderRole: false, isDefaultMemberRole: true, isSingleHolder: false,
          permissionCodes: ["club.event.manage"] },
      ],
    };
    const applications = mongoClubApplicationRepository();
    const application = await applications.createDraft(founder.toString(), snapshot, now);
    await applications.submit({ id: application.id, ownerId: founder.toString(), snapshot,
      expectedDraftRevision: 0, policyVersionId: new Types.ObjectId().toString(), now });
    const reviews = mongoClubApplicationReviewRepository();

    const claimed = await reviews.claim(application.id, officer.toString(), now);
    expect(claimed.application.state).toBe("Under Review");
    expect(claimed.founders.map((founderItem) => founderItem.displayName)).toEqual(["Founder Review", "Co-founder Review"]);
    expect(await applications.findActiveUserByEmail("FOUNDER-REVIEW@example.edu"))
      .toMatchObject({ id: founder.toString(), displayName: "Founder Review" });
    await ucmsModels.users!.updateOne({ _id: secondFounder }, { $set: { accountState: "Locked" } });
    expect(await applications.findActiveUserByEmail("cofounder-review@example.edu")).toBeNull();
    await ucmsModels.users!.updateOne({ _id: secondFounder }, { $set: { accountState: "Active" } });
    expect(claimed.task.assigneeId).toBe(officer.toString());
    const decided = await reviews.decide(application.id, officer.toString(), {
      outcome: "Approve", sections: [], reviewNote: "Requirements satisfied",
    }, new Date(now.getTime() + 1000));

    expect(decided.application.state).toBe("Approved");
    expect(decided.task.state).toBe("Decided");
    expect(decided.decisions).toHaveLength(1);
    const storedApplication = await ucmsModels.clubApplications!.findById(application.id).lean();
    const clubId = storedApplication?.createdClubId;
    expect(clubId).toBeTruthy();
    expect(await ucmsModels.clubs!.findById(clubId).lean()).toMatchObject({
      name: "Automation Club", state: "Pending Setup",
    });
    expect(await ucmsModels.clubMemberships!.countDocuments({ clubId })).toBe(2);
    expect(await ucmsModels.clubPositions!.countDocuments({ clubId })).toBe(2);
    expect(await ucmsModels.clubRoleStructureVersions!.findOne({ clubId }).lean())
      .toMatchObject({ versionNo: 1, source: "APPLICATION" });
    expect(await ucmsModels.approvalDecisions!.countDocuments({
      approvalTaskId: new Types.ObjectId(decided.task.id),
    })).toBe(1);
    await expect(reviews.decide(application.id, officer.toString(), {
      outcome: "Approve", sections: [],
    }, new Date(now.getTime() + 2000))).rejects.toMatchObject({ kind: "conflict" });
  }, 60_000);

  it("returns an application for revision, then keeps both decisions after resubmission", async () => {
    const founder = new Types.ObjectId();
    const officer = new Types.ObjectId();
    const now = new Date("2026-10-08T10:00:00Z");
    await ucmsModels.users!.insertMany([
      { _id: founder, email: "revision-founder@example.edu", googleSubject: "revision-founder",
        displayName: "Revision Founder", accountState: "Active", createdAt: now },
      { _id: officer, email: "revision-officer@example.edu", googleSubject: "revision-officer",
        displayName: "Revision Officer", accountState: "Active", createdAt: now },
    ]);
    const initial: ClubApplicationDraft = {
      clubName: "Revision Club", field: "Community", objectives: "Initial objective",
      foundingUserIds: [founder.toString()], documents: [], proposedRoles: [
        { code: "CLUB_LEADER", name: "Club Leader", isBoardSeat: true,
          isLeaderRole: true, isDefaultMemberRole: false, isSingleHolder: true,
          permissionCodes: [] },
        { code: "MEMBERS", name: "Members", isBoardSeat: false,
          isLeaderRole: false, isDefaultMemberRole: true, isSingleHolder: false,
          permissionCodes: [] },
      ],
    };
    const applications = mongoClubApplicationRepository();
    const reviews = mongoClubApplicationReviewRepository();
    const application = await applications.createDraft(founder.toString(), initial, now);
    await applications.submit({ id: application.id, ownerId: founder.toString(), snapshot: initial,
      expectedDraftRevision: 0, policyVersionId: new Types.ObjectId().toString(), now });
    await reviews.claim(application.id, officer.toString(), now);
    const deadline = new Date("2026-10-15T10:00:00Z");
    await reviews.decide(application.id, officer.toString(), {
      outcome: "Request revision", reason: "Clarify objectives",
      sections: ["club-information"], revisionDeadlineAt: deadline,
    }, new Date(now.getTime() + 1000));
    expect(await ucmsModels.clubs!.countDocuments({ sourceApplicationId: application.id })).toBe(0);
    expect(await ucmsModels.clubApplications!.findById(application.id).lean())
      .toMatchObject({ state: "Revision Requested", revisionDeadlineAt: deadline });
    expect((await applications.findOwned(application.id, founder.toString()))?.revisionDeadlineAt)
      .toEqual(deadline);
    // The applicant sees the reason and sections, never the internal note or the reviewer.
    const feedback = await applications.decisionFeedback(application.id);
    expect(feedback).toEqual([{ outcome: "Request revision", reason: "Clarify objectives",
      sections: ["club-information"], decidedAt: expect.any(Date) }]);

    const revised = { ...initial, objectives: "Clear and measurable objective" };
    const saved = await applications.saveDraft(application.id, founder.toString(), revised, 0);
    await applications.submit({ id: application.id, ownerId: founder.toString(),
      snapshot: saved.draft, expectedDraftRevision: saved.draftRevision,
      policyVersionId: new Types.ObjectId().toString(), now: new Date(now.getTime() + 2000) });
    await reviews.claim(application.id, officer.toString(), new Date(now.getTime() + 3000));
    const rejected = await reviews.decide(application.id, officer.toString(), {
      outcome: "Reject", reason: "Still outside programme scope", sections: [],
    }, new Date(now.getTime() + 4000));

    expect(rejected.application.state).toBe("Rejected");
    expect(rejected.versions).toHaveLength(2);
    expect(rejected.decisions.map((decision) => decision.outcome))
      .toEqual(["Request revision", "Reject"]);
    expect(await ucmsModels.approvalDecisions!.countDocuments()).toBeGreaterThanOrEqual(3);
  }, 60_000);
});
