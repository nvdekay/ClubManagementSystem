import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoCandidateEvaluationRepository } from "../../src/infra/db/mongo-candidate-evaluation-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-candidate-evaluation-test-${process.pid}`;
const now = new Date("2026-10-08T12:00:00Z");

describe.skipIf(!uri)("Mongo candidate evaluation repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("upserts one evaluation per reviewer and locks it once the application is decided", async () => {
    const clubId = new Types.ObjectId();
    const reviewerId = new Types.ObjectId();
    const rubric = [{ key: "communication", label: "Communication", maxScore: 5 }];
    const campaign = await ucmsModels.recruitmentCampaigns!.create({ clubId, title: "Autumn",
      positions: ["Designer"], windowStart: now, windowEnd: now, capacity: 5, formSchema: [],
      rubric, state: "Screening", createdAt: now });
    const application = await ucmsModels.recruitmentApplications!.create({ campaignId: campaign._id, clubId,
      userId: new Types.ObjectId(), answers: {}, state: "Shortlisted", submittedAt: now });
    await ucmsModels.users!.create({ _id: reviewerId, email: `reviewer-${String(reviewerId)}@example.edu`, displayName: "Reviewer", accountState: "Active", createdAt: now });
    const repo = mongoCandidateEvaluationRepository();
    const ids = [String(clubId), String(campaign._id), String(application._id)] as const;

    expect(await repo.target(...ids)).toEqual({ campaignState: "Screening",
      applicationState: "Shortlisted", rubric });
    expect(await repo.target(String(new Types.ObjectId()), ids[1], ids[2])).toBeNull();

    const first = await repo.save({ applicationId: ids[2], reviewerId: String(reviewerId),
      scores: { communication: 3 }, totalScore: 3, comment: "Good", now });
    const second = await repo.save({ applicationId: ids[2], reviewerId: String(reviewerId),
      scores: { communication: 4.5 }, totalScore: 4.5, now: new Date(now.getTime() + 1000) });
    expect(second).toMatchObject({ id: first.id, totalScore: 4.5, createdAt: now });
    expect(second.comment).toBeUndefined();

    const listed = await repo.listForCampaign(ids[0], ids[1]);
    expect(listed).toMatchObject({ rubric, evaluations: [{ reviewerName: "Reviewer", totalScore: 4.5,
      scores: { communication: 4.5 } }] });

    await ucmsModels.recruitmentApplications!.updateOne({ _id: application._id }, { $set: { state: "Accepted" } });
    await expect(repo.save({ applicationId: ids[2], reviewerId: String(reviewerId),
      scores: { communication: 1 }, totalScore: 1, now })).rejects.toMatchObject({ kind: "conflict" });
  });
  it("serializes reviewers on workflow documents and rejects a cancellation after target loading", async () => {
    const clubId = new Types.ObjectId();
    const campaign = await ucmsModels.recruitmentCampaigns!.create({ clubId, title: "Concurrent",
      positions: ["Designer"], windowStart: now, windowEnd: now, capacity: 5, formSchema: [],
      rubric: [], state: "Screening", createdAt: now });
    const application = await ucmsModels.recruitmentApplications!.create({ campaignId: campaign._id, clubId,
      userId: new Types.ObjectId(), answers: {}, state: "Shortlisted", submittedAt: now });
    const repo = mongoCandidateEvaluationRepository();
    const input = { applicationId: String(application._id), scores: {}, comment: "Review", now };
    const reviews = await Promise.all(Array.from({ length: 4 }, () =>
      repo.save({ ...input, reviewerId: String(new Types.ObjectId()) })));
    expect(reviews).toHaveLength(4);
    expect(await ucmsModels.recruitmentApplications!.findById(application._id).lean()).toMatchObject({ __v: 4 });
    expect(await ucmsModels.recruitmentCampaigns!.findById(campaign._id).lean()).toMatchObject({ __v: 4 });

    expect(await repo.target(String(clubId), String(campaign._id), input.applicationId))
      .toMatchObject({ campaignState: "Screening", applicationState: "Shortlisted" });
    await ucmsModels.recruitmentCampaigns!.updateOne({ _id: campaign._id }, { $set: { state: "Cancelled" } });
    await expect(repo.save({ ...input, reviewerId: reviews[0]!.reviewerId, comment: "Changed" }))
      .rejects.toMatchObject({ kind: "conflict" });
    expect(await ucmsModels.candidateEvaluations!.findById(reviews[0]!.id).lean())
      .toMatchObject({ comment: "Review" });
    // Failed workflow checks roll back even the application's version-key write.
    expect(await ucmsModels.recruitmentApplications!.findById(application._id).lean()).toMatchObject({ __v: 4 });
  }, 60_000);

});
