import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoRecruitmentApplicationRepository } from "../../src/infra/db/mongo-recruitment-application-repository.js";
import type { PublicCampaign } from "../../src/domain/public-discovery.js";
import type { RecruitmentAttachment } from "../../src/domain/recruitment-application.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-recruitment-application-test-${process.pid}`;
const now = new Date("2026-10-08T12:00:00Z");

describe.skipIf(!uri)("Mongo recruitment application repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("stores one draft, validates eligibility at submit, notifies reviewers, and preserves withdrawal", async () => {
    const clubId = new Types.ObjectId();
    const campaignId = new Types.ObjectId();
    const studentId = new Types.ObjectId();
    const reviewerId = new Types.ObjectId();
    const reviewerMembershipId = new Types.ObjectId();
    const termId = new Types.ObjectId();
    const positionId = new Types.ObjectId();
    const membersRoleId = new Types.ObjectId();
    await ucmsModels.clubs!.create({ _id: clubId, code: "APP-UC17", name: "Application Club",
      field: "Technology", state: "Active", createdAt: now });
    await ucmsModels.users!.create([
      { _id: studentId, email: "applicant@example.edu", displayName: "Applicant",
        accountState: "Active", createdAt: now },
      { _id: reviewerId, email: "reviewer@example.edu", displayName: "Reviewer",
        accountState: "Active", createdAt: now },
    ]);
    await ucmsModels.clubTerms!.create({ _id: termId, clubId, name: "Term 2026",
      state: "Active", startAt: new Date("2026-09-01"), endAt: new Date("2027-09-01") });
    await ucmsModels.clubPositions!.create({ _id: positionId, clubId, code: "RECRUITER",
      name: "Recruiter", isBoardSeat: false, isLeaderRole: false, isDefaultMemberRole: false,
      isSingleHolder: false, permissionCodes: ["club.application.review"], isActive: true });
    await ucmsModels.clubPositions!.create({ _id: membersRoleId, clubId, code: "MEMBERS",
      name: "Members", isBoardSeat: false, isLeaderRole: false, isDefaultMemberRole: true,
      isSingleHolder: false, permissionCodes: [], isActive: true });
    await ucmsModels.clubMemberships!.create({ _id: reviewerMembershipId, clubId,
      userId: reviewerId, state: "Active", joinedAt: now, statusHistory: [] });
    await ucmsModels.clubPositionAssignments!.create({ clubId, termId, positionId,
      membershipId: reviewerMembershipId, effectiveFrom: new Date("2026-09-01"), assignedBy: reviewerId });
    await ucmsModels.recruitmentCampaigns!.create({ _id: campaignId, clubId,
      title: "Autumn intake", positions: ["Designer", "Developer"], criteria: "Interested students",
      windowStart: new Date("2026-10-01"), windowEnd: new Date("2026-11-01"), capacity: 20,
      selectionSteps: [{ name: "Application" }], formSchema: [
        { key: "motivation", label: "Why?", type: "textarea", required: true },
        { key: "resume", label: "Resume", type: "file", required: true },
      ], rubric: [], state: "Published", publishedBy: reviewerId, publishedAt: now, createdAt: now });
    const campaign: PublicCampaign = {
      id: campaignId.toString(), clubId: clubId.toString(), title: "Autumn intake", state: "Published",
      windowStart: new Date("2026-10-01"), windowEnd: new Date("2026-11-01"), capacity: 20,
      positions: ["Designer", "Developer"], formSchema: [
        { key: "motivation", label: "Why?", type: "textarea", required: true },
        { key: "resume", label: "Resume", type: "file", required: true },
      ],
    };
    const repo = mongoRecruitmentApplicationRepository();
    const draft = await repo.createDraft({ campaign, userId: studentId.toString(),
      position: "Designer", now });
    expect(draft).toMatchObject({ state: "Draft", position: "Designer", answers: {}, attachments: [] });
    await expect(repo.createDraft({ campaign, userId: studentId.toString(),
      position: "Developer", now })).rejects.toMatchObject({ kind: "conflict" });
    await expect(repo.findOwned(draft.id, reviewerId.toString())).resolves.toBeNull();

    const attachment: RecruitmentAttachment = { id: crypto.randomUUID(), fieldKey: "resume",
      fileName: "resume.pdf", mimeType: "application/pdf", bytes: 12,
      assetId: "private-asset", uploadedAt: now };
    await repo.addAttachment({ applicationId: draft.id, userId: studentId.toString(), attachment });
    expect(await repo.attachmentAccess(draft.id, studentId.toString(), attachment.id))
      .toMatchObject({ assetId: "private-asset", fieldKey: "resume" });
    expect(await repo.attachmentAccess(draft.id, reviewerId.toString(), attachment.id)).toBeNull();
    const reviewLookup = { clubId: clubId.toString(), campaignId: campaignId.toString(),
      applicationId: draft.id, attachmentId: attachment.id };
    expect(await repo.reviewAttachment(reviewLookup)).toBeNull(); // drafts stay private
    await repo.updateDraft({ applicationId: draft.id, userId: studentId.toString(),
      position: "Designer", answers: { motivation: "I want to help" }, now });
    const submitted = await repo.submit(draft.id, studentId.toString(), now);
    expect(submitted.state).toBe("Submitted");
    expect(await repo.reviewAttachment(reviewLookup)).toMatchObject({ assetId: "private-asset" });
    expect(await repo.reviewAttachment({ ...reviewLookup, clubId: new Types.ObjectId().toString() }))
      .toBeNull();
    expect(await ucmsModels.notifications!.countDocuments({ recipientUserId: reviewerId,
      eventCode: "RECRUITMENT_APPLICATION_SUBMITTED", entityId: new Types.ObjectId(draft.id) })).toBe(1);
    const withdrawn = await repo.withdraw(draft.id, studentId.toString(), now);
    expect(withdrawn.state).toBe("Withdrawn");
    await expect(repo.withdraw(draft.id, studentId.toString(), now)).rejects.toMatchObject({ kind: "conflict" });
    expect(await repo.listMine(studentId.toString())).toMatchObject([{
      id: draft.id, state: "Withdrawn", campaignTitle: "Autumn intake", clubName: "Application Club",
    }]);
    expect(await ucmsModels.notifications!.countDocuments({ recipientUserId: reviewerId,
      eventCode: "RECRUITMENT_APPLICATION_WITHDRAWN", entityId: new Types.ObjectId(draft.id) })).toBe(1);
    expect(await ucmsModels.auditLogs!.countDocuments({ entityId: new Types.ObjectId(draft.id),
      action: { $in: ["RECRUITMENT_APPLICATION_DRAFT_CREATED", "RECRUITMENT_APPLICATION_SUBMITTED",
        "RECRUITMENT_APPLICATION_WITHDRAWN"] } })).toBe(3);

    const secondStudent = new Types.ObjectId();
    await ucmsModels.users!.create({ _id: secondStudent, email: "second-applicant@example.edu",
      displayName: "Second Applicant", accountState: "Active", createdAt: now });
    const secondDraft = await repo.createDraft({ campaign, userId: secondStudent.toString(),
      position: "Developer", now });
    const secondAttachment = { ...attachment, id: crypto.randomUUID() };
    await repo.addAttachment({ applicationId: secondDraft.id, userId: secondStudent.toString(),
      attachment: secondAttachment });
    await repo.updateDraft({ applicationId: secondDraft.id, userId: secondStudent.toString(),
      position: "Developer", answers: { motivation: "I like building software" }, now });
    await repo.submit(secondDraft.id, secondStudent.toString(), now);
    expect(await repo.listForReview(clubId.toString(), campaignId.toString(), "Submitted"))
      .toMatchObject([{ id: secondDraft.id, state: "Submitted" }]);
    const screening = await repo.transition({ clubId: clubId.toString(), campaignId: campaignId.toString(),
      applicationIds: [secondDraft.id], action: "screen", actorId: reviewerId.toString(), now });
    expect(screening[0]?.state).toBe("Screening");
    const shortlist = await repo.transition({ clubId: clubId.toString(), campaignId: campaignId.toString(),
      applicationIds: [secondDraft.id], action: "shortlist", reason: "Strong experience",
      actorId: reviewerId.toString(), now });
    expect(shortlist[0]?.state).toBe("Shortlisted");
    const accepted = await repo.transition({ clubId: clubId.toString(), campaignId: campaignId.toString(),
      applicationIds: [secondDraft.id], action: "decide", outcome: "Accepted",
      actorId: reviewerId.toString(), now });
    expect(accepted[0]).toMatchObject({ state: "Accepted", decisionOutcome: "Accepted" });
    const onboarded = await repo.onboard({ clubId: clubId.toString(), campaignId: campaignId.toString(),
      applicationId: secondDraft.id, actorId: reviewerId.toString(), joinedAt: now, now });
    expect(onboarded.state).toBe("Onboarded");
    expect(await ucmsModels.clubMemberships!.findOne({ clubId, userId: secondStudent })
      .select("state defaultRole sourceApplicationId").lean()).toMatchObject({
      state: "Active", defaultRole: "MEMBERS", sourceApplicationId: new Types.ObjectId(secondDraft.id),
    });
    expect(await ucmsModels.notifications!.countDocuments({ recipientUserId: secondStudent,
      eventCode: { $in: ["RECRUITMENT_APPLICATION_ACCEPTED", "RECRUITMENT_APPLICATION_ONBOARDED"] },
      entityId: new Types.ObjectId(secondDraft.id) })).toBe(2);
    expect(await ucmsModels.recruitmentCampaigns!.findById(campaignId).select("state").lean())
      .toMatchObject({ state: "Completed" });
  }, 60_000);

  it("rejects banned and active club members at the eligibility boundary", async () => {
    const clubId = new Types.ObjectId();
    const bannedId = new Types.ObjectId();
    const activeId = new Types.ObjectId();
    await ucmsModels.clubs!.create({ _id: clubId, code: "ELIG-UC17", name: "Eligibility Club",
      field: "Technology", state: "Active", createdAt: now });
    await ucmsModels.users!.create([
      { _id: bannedId, email: "banned@example.edu", displayName: "Banned", accountState: "Active", createdAt: now },
      { _id: activeId, email: "member@example.edu", displayName: "Member", accountState: "Active", createdAt: now },
    ]);
    await ucmsModels.clubMemberships!.create([
      { clubId, userId: bannedId, state: "Banned", joinedAt: now, statusHistory: [] },
      { clubId, userId: activeId, state: "Active", joinedAt: now, statusHistory: [] },
    ]);
    const repo = mongoRecruitmentApplicationRepository();
    await expect(repo.eligibility(bannedId.toString(), clubId.toString()))
      .resolves.toMatchObject({ userActive: true, bannedMembership: true, activeMembership: false });
    await expect(repo.eligibility(activeId.toString(), clubId.toString()))
      .resolves.toMatchObject({ userActive: true, bannedMembership: false, activeMembership: true });
  });
});
