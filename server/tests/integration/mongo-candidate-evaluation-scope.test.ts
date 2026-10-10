import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoCandidateEvaluationRepository } from "../../src/infra/db/mongo-candidate-evaluation-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-candidate-evaluation-scope-test-${process.pid}`;
const now = new Date("2026-10-08T12:00:00Z");

describe.skipIf(!uri)("Mongo candidate evaluation repository — club/campaign scoping", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("never resolves an application or campaign through another club or campaign", async () => {
    const clubA = new Types.ObjectId();
    const clubB = new Types.ObjectId();
    const rubric = [{ key: "skill", label: "Skill", maxScore: 10 }];
    async function campaign(clubId: Types.ObjectId) {
      return ucmsModels.recruitmentCampaigns!.create({ clubId, title: "Autumn", positions: ["Designer"],
        windowStart: now, windowEnd: now, capacity: 5, formSchema: [], rubric, state: "Screening", createdAt: now });
    }
    const [campaignA, campaignA2, campaignB] = [await campaign(clubA), await campaign(clubA), await campaign(clubB)];
    const applicationB = await ucmsModels.recruitmentApplications!.create({ campaignId: campaignB._id, clubId: clubB,
      userId: new Types.ObjectId(), answers: {}, state: "Shortlisted", submittedAt: now });
    const applicationA2 = await ucmsModels.recruitmentApplications!.create({ campaignId: campaignA2._id, clubId: clubA,
      userId: new Types.ObjectId(), answers: {}, state: "Shortlisted", submittedAt: now });
    const repo = mongoCandidateEvaluationRepository();
    await repo.save({ applicationId: String(applicationB._id), reviewerId: String(new Types.ObjectId()),
      scores: { skill: 9 }, totalScore: 9, now });

    // Club A reviewer naming club B's application under club A's campaign.
    expect(await repo.target(String(clubA), String(campaignA._id), String(applicationB._id))).toBeNull();
    // Club A reviewer naming club B's campaign under club A.
    expect(await repo.target(String(clubA), String(campaignB._id), String(applicationB._id))).toBeNull();
    // Same club, application of a different campaign.
    expect(await repo.target(String(clubA), String(campaignA._id), String(applicationA2._id))).toBeNull();
    // Listing club B's campaign through club A finds nothing; club A's own campaign leaks no club B evaluation.
    expect(await repo.listForCampaign(String(clubA), String(campaignB._id))).toBeNull();
    expect(await repo.listForCampaign(String(clubA), String(campaignA._id))).toEqual({ rubric, evaluations: [] });
  }, 60_000);
});
