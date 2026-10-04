import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ClubApplicationDraft } from "../../src/domain/club-application.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";
import { mongoClubApplicationRepository } from "../../src/infra/db/mongo-club-application-repository.js";

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
    expect(await ucmsModels.approvalTasks!.countDocuments({ entityId: new Types.ObjectId(application.id) }))
      .toBe(1);
    expect(await ucmsModels.auditLogs!.countDocuments({ entityId: new Types.ObjectId(application.id),
      action: "CLUB_APPLICATION_SUBMITTED" })).toBe(2);
    expect(await ucmsModels.notifications!.countDocuments({ entityId: new Types.ObjectId(application.id) }))
      .toBe(2);
  });
});
