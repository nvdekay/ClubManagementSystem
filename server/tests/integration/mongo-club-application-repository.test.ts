import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ClubApplicationDraft } from "../../src/domain/club-application.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";
import { mongoClubApplicationRepository } from "../../src/infra/db/mongo-club-application-repository.js";
import { mongoClubApplicationReviewRepository } from "../../src/infra/db/mongo-club-application-review-repository.js";

const uri = process.env.MONGO_URI;

function draftOf(clubName: string, founders: ClubApplicationDraft["founders"],
  overrides: Partial<ClubApplicationDraft> = {}): ClubApplicationDraft {
  return { clubName, fieldId: new Types.ObjectId().toString(), field: "Công nghệ", summary: "Summary",
    objectives: "Build robots", fanpageUrl: "", contactEmail: "", founders, documents: [], ...overrides };
}
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
    const initial = draftOf("Robotics Club", [{ userId: owner.toString(), role: "LEADER" }]);
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

  it("approves once: the club is Active with the default structure and the founding board seated", async () => {
    const founder = new Types.ObjectId();
    const secondFounder = new Types.ObjectId();
    const thirdFounder = new Types.ObjectId();
    const officer = new Types.ObjectId();
    const now = new Date("2026-10-08T08:00:00Z");
    await ucmsModels.users!.insertMany([
      { _id: founder, email: "founder-review@example.edu", googleSubject: "founder-review",
        displayName: "Founder Review", accountState: "Active", createdAt: now },
      { _id: secondFounder, email: "cofounder-review@example.edu", googleSubject: "cofounder-review",
        displayName: "Co-founder Review", accountState: "Active", createdAt: now },
      { _id: thirdFounder, email: "third-review@example.edu", googleSubject: "third-review",
        displayName: "Third Review", accountState: "Active", createdAt: now },
      { _id: officer, email: "officer-review@example.edu", googleSubject: "officer-review",
        displayName: "Officer Review", accountState: "Active", createdAt: now },
    ]);
    const snapshot = draftOf("Automation Club", [
      { userId: founder.toString(), role: "MEMBER" },
      { userId: secondFounder.toString(), role: "LEADER" },
      { userId: thirdFounder.toString(), role: "VICE_LEADER" },
    ], { fanpageUrl: "https://facebook.com/automation", contactEmail: "automation@example.edu",
      documents: [{ id: "logo-1", documentType: "LOGO", fileName: "logo.png", mimeType: "image/png",
        bytes: 10, assetId: "asset", publicUrl: "https://cdn.example/logo.png", uploadedAt: now }] });
    const applications = mongoClubApplicationRepository();
    const application = await applications.createDraft(founder.toString(), snapshot, now);
    const policyVersionId = new Types.ObjectId().toString();
    await applications.submit({ id: application.id, ownerId: founder.toString(), snapshot,
      expectedDraftRevision: 0, policyVersionId, now });
    const reviews = mongoClubApplicationReviewRepository();

    const claimed = await reviews.claim(application.id, officer.toString(), now);
    expect(claimed.application.state).toBe("Under Review");
    expect(claimed.founders.map((founderItem) => founderItem.displayName))
      .toEqual(["Founder Review", "Co-founder Review", "Third Review"]);
    expect(await applications.findActiveUserByEmail("FOUNDER-REVIEW@example.edu"))
      .toMatchObject({ id: founder.toString(), displayName: "Founder Review" });
    expect(claimed.task.assigneeId).toBe(officer.toString());
    const decided = await reviews.decide(application.id, officer.toString(), {
      outcome: "Approve", sections: [], reviewNote: "Requirements satisfied",
    }, new Date(now.getTime() + 1000));

    expect(decided.application.state).toBe("Approved");
    expect(decided.task.state).toBe("Decided");
    expect(decided.decisions[0]?.policyVersionId).toBe(policyVersionId);
    const clubId = (await ucmsModels.clubApplications!.findById(application.id).lean())?.createdClubId;
    expect(await ucmsModels.clubs!.findById(clubId).lean()).toMatchObject({
      name: "Automation Club", field: "Công nghệ", state: "Active", description: "Summary",
      contactEmail: "automation@example.edu", logoUrl: "https://cdn.example/logo.png",
      channels: [{ label: "Fanpage", url: "https://facebook.com/automation" }],
    });
    expect(await ucmsModels.clubMemberships!.countDocuments({ clubId, defaultRole: "MEMBERS" })).toBe(3);
    const positions = await ucmsModels.clubPositions!.find({ clubId }).sort({ _id: 1 }).lean();
    expect(positions.map((position) => position.code)).toEqual(["CLUB_LEADER", "VICE_LEADER", "MEMBERS"]);
    const assignments = await ucmsModels.clubPositionAssignments!.find({ clubId }).lean();
    const memberships = await ucmsModels.clubMemberships!.find({ clubId }).lean();
    function holder(code: string): string[] {
      const positionId = String(positions.find((position) => position.code === code)!._id);
      return assignments.filter((assignment) => String(assignment.positionId) === positionId)
        .map((assignment) => String(memberships.find((membership) =>
          String(membership._id) === String(assignment.membershipId))!.userId));
    }
    expect(holder("CLUB_LEADER")).toEqual([secondFounder.toString()]);
    expect(holder("VICE_LEADER")).toEqual([thirdFounder.toString()]);
    expect(assignments.every((assignment) => String(assignment.confirmedBy) === officer.toString())).toBe(true);
    expect(await ucmsModels.clubTerms!.findOne({ clubId }).lean())
      .toMatchObject({ state: "Active", confirmedBy: officer });
    expect(await ucmsModels.clubRoleStructureVersions!.findOne({ clubId }).lean())
      .toMatchObject({ versionNo: 1, source: "APPLICATION" });
    expect(await ucmsModels.notifications!.countDocuments({ entityId: new Types.ObjectId(application.id),
      eventCode: "CLUB_APPLICATION_APPROVED" })).toBe(3);
    expect(await applications.activeLeaderUserIds([secondFounder.toString(), founder.toString()],
      new Date(now.getTime() + 2000))).toEqual([secondFounder.toString()]);
    await expect(reviews.decide(application.id, officer.toString(), {
      outcome: "Approve", sections: [],
    }, new Date(now.getTime() + 2000))).rejects.toMatchObject({ kind: "conflict" });

    // The same student cannot be approved as leader of a second club while this term runs.
    const second = draftOf("Second Club", [{ userId: secondFounder.toString(), role: "LEADER" }]);
    const secondApplication = await applications.createDraft(secondFounder.toString(), second, now);
    await applications.submit({ id: secondApplication.id, ownerId: secondFounder.toString(), snapshot: second,
      expectedDraftRevision: 0, policyVersionId, now });
    await reviews.claim(secondApplication.id, officer.toString(), now);
    await expect(reviews.decide(secondApplication.id, officer.toString(), { outcome: "Approve", sections: [] },
      new Date(now.getTime() + 3000))).rejects.toMatchObject({ kind: "conflict",
      details: { issues: ["leaderHoldsAnotherClub"] } });
    expect(await ucmsModels.clubs!.countDocuments({ name: "Second Club" })).toBe(0);
  }, 60_000);

  it("reads applications saved before fixed founding roles with the applicant as leader", async () => {
    const owner = new Types.ObjectId();
    const peer = new Types.ObjectId();
    const now = new Date("2026-10-09T08:00:00Z");
    const created = await ucmsModels.clubApplications!.create({ clubName: "Legacy Club", field: "Công nghệ",
      founderUserId: owner, state: "Draft", currentVersionNo: 1, createdAt: now,
      draftPayload: { clubName: "Legacy Club", field: "Công nghệ", objectives: "Old",
        foundingUserIds: [owner.toString(), peer.toString()], proposedRoles: [], documents: [], _revision: 0 } });
    const record = await mongoClubApplicationRepository().findOwned(String(created._id), owner.toString());
    expect(record?.draft).toMatchObject({ fieldId: "", summary: "", founders: [
      { userId: owner.toString(), role: "LEADER" }, { userId: peer.toString(), role: "MEMBER" }] });
  });

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
    const initial = draftOf("Revision Club", [{ userId: founder.toString(), role: "LEADER" }],
      { field: "Cộng đồng", objectives: "Initial objective" });
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
