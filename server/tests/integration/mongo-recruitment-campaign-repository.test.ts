import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoRecruitmentCampaignRepository } from "../../src/infra/db/mongo-recruitment-campaign-repository.js";
import type { RecruitmentCampaignInput } from "../../src/domain/recruitment-campaign.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-recruitment-campaign-test-${process.pid}`;
const now = new Date("2026-10-08T12:00:00Z");
const input: RecruitmentCampaignInput = {
  title: "Autumn recruitment", positions: ["Designer", "Developer"],
  criteria: "Students interested in design and technology",
  windowStart: new Date("2026-10-10T00:00:00Z"),
  windowEnd: new Date("2026-11-01T00:00:00Z"), capacity: 20,
  selectionSteps: [{ name: "Application" }, { name: "Interview" }],
  formSchema: [{ key: "motivation", label: "Why this club?", type: "textarea", required: true }],
  rubric: [{ key: "communication", label: "Communication", maxScore: 5 }],
};

describe.skipIf(!uri)("Mongo recruitment campaign repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("creates, detects overlaps, publishes, and cancels without deleting applications", async () => {
    const clubId = new Types.ObjectId();
    const actorId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    await ucmsModels.clubs!.create({ _id: clubId, code: "RECRUIT", name: "Recruit Club",
      field: "Technology", state: "Active", createdAt: now });
    const repo = mongoRecruitmentCampaignRepository();
    const created = await repo.createDraft(clubId.toString(), actorId.toString(), input, now);
    expect(created).toMatchObject({ title: input.title, state: "Draft", positions: input.positions });
    expect(await repo.overlaps(clubId.toString(), created.id, [" designer "],
      input.windowStart, input.windowEnd)).toEqual([]);
    const second = await repo.createDraft(clubId.toString(), actorId.toString(), {
      ...input, title: "Second recruitment", positions: ["Designer"],
    }, now);
    expect(await repo.overlaps(clubId.toString(), second.id, ["designer"],
      input.windowStart, input.windowEnd)).toMatchObject([{ id: created.id, title: created.title }]);

    const updated = await repo.updateDraft(clubId.toString(), second.id, actorId.toString(), {
      ...input, title: "Updated recruitment", positions: ["Designer"],
    }, now);
    expect(updated.title).toBe("Updated recruitment");
    const published = await repo.publish(clubId.toString(), second.id, actorId.toString(), now);
    expect(published).toMatchObject({ state: "Published", publishedBy: actorId.toString(), publishedAt: now });
    await expect(repo.updateDraft(clubId.toString(), second.id, actorId.toString(), input, now))
      .rejects.toMatchObject({ kind: "conflict" });

    await ucmsModels.recruitmentApplications!.create({
      campaignId: new Types.ObjectId(second.id), clubId, userId,
      answers: { motivation: "I want to contribute" }, state: "Submitted", submittedAt: now,
    });
    const cancelled = await repo.cancel(clubId.toString(), second.id, actorId.toString(), now);
    expect(cancelled.state).toBe("Cancelled");
    expect(await ucmsModels.recruitmentApplications!.countDocuments({ campaignId: second.id })).toBe(1);
    expect(await ucmsModels.notifications!.countDocuments({ recipientUserId: userId,
      eventCode: "RECRUITMENT_CAMPAIGN_CANCELLED", entityId: new Types.ObjectId(second.id) })).toBe(1);
    expect(await ucmsModels.auditLogs!.countDocuments({ entityId: new Types.ObjectId(second.id),
      action: { $in: ["RECRUITMENT_CAMPAIGN_DRAFT_CREATED", "RECRUITMENT_CAMPAIGN_PUBLISHED",
        "RECRUITMENT_CAMPAIGN_CANCELLED"] } })).toBe(3);
  }, 60_000);

  it("rejects campaign writes when the club is not Active", async () => {
    const clubId = new Types.ObjectId();
    const actorId = new Types.ObjectId();
    await ucmsModels.clubs!.create({ _id: clubId, code: "PAUSED", name: "Paused Club",
      field: "Technology", state: "Suspended", createdAt: now });
    await expect(mongoRecruitmentCampaignRepository().createDraft(clubId.toString(),
      actorId.toString(), input, now)).rejects.toMatchObject({ kind: "conflict" });
  });
});
