import { describe, expect, it } from "vitest";
import type { PublicCampaign } from "../../src/domain/public-discovery.js";
import type {
  RecruitmentApplication, RecruitmentApplicationRepository, RecruitmentAttachment,
  RecruitmentEligibility,
} from "../../src/domain/recruitment-application.js";
import { validateRecruitmentAnswers } from "../../src/domain/recruitment-application.js";
import {
  createRecruitmentApplicationDraft, recruitmentAttachmentAccess, submitRecruitmentApplication,
  uploadRecruitmentAttachment, withdrawRecruitmentApplication,
} from "../../src/usecase/recruitment-application.js";

const userId = "111111111111111111111111";
const campaignId = "222222222222222222222222";
const clubId = "333333333333333333333333";
const applicationId = "444444444444444444444444";
const now = new Date("2026-10-15T12:00:00Z");
const campaign: PublicCampaign = {
  id: campaignId, clubId, title: "Autumn intake", state: "Published",
  windowStart: new Date("2026-10-01T00:00:00Z"), windowEnd: new Date("2026-11-01T00:00:00Z"),
  capacity: 20, positions: ["Designer", "Developer"],
  formSchema: [
    { key: "motivation", label: "Why?", type: "textarea", required: true },
    { key: "team", label: "Team", type: "select", required: true, options: ["Design", "Tech"] },
    { key: "portfolio", label: "Portfolio", type: "url", required: false },
    { key: "resume", label: "Resume", type: "file", required: true },
  ],
};
const actor = { id: userId, accountState: "Active" as const };
const attachment: RecruitmentAttachment = {
  // Upload mints a UUID for every attachment.
  id: "3e2686be-40ae-4b9e-9837-ed8aab194198", fieldKey: "resume", fileName: "resume.pdf",
  mimeType: "application/pdf", bytes: 20, assetId: "private-asset", uploadedAt: now,
};

function application(value: Partial<RecruitmentApplication> = {}): RecruitmentApplication {
  return { id: applicationId, campaignId, clubId, userId, position: "Designer",
    answers: { motivation: "I want to build useful things", team: "Design" },
    attachments: [attachment], state: "Draft", ...value };
}

function repository(options: { application?: RecruitmentApplication | null;
  eligibility?: RecruitmentEligibility } = {}) {
  let current = options.application === undefined ? application() : options.application;
  const eligibilityResult = options.eligibility ?? {
    userActive: true, activeMembership: false, bannedMembership: false,
  };
  const calls: string[] = [];
  const repo: RecruitmentApplicationRepository = {
    campaign: async () => campaign,
    eligibility: async () => eligibilityResult,
    createDraft: async (input) => {
      calls.push("create"); current = application({ position: input.position }); return current;
    },
    findOwned: async () => current,
    findMineForCampaign: async () => current,
    listMine: async () => current ? [current] : [],
    updateDraft: async (input) => {
      calls.push("update"); current = application({ ...current!, position: input.position,
        answers: input.answers }); return current;
    },
    addAttachment: async (input) => {
      calls.push("attachment"); current = application({ ...current!,
        attachments: [...current!.attachments, input.attachment] }); return current;
    },
    attachmentAccess: async () => attachment,
    submit: async () => {
      calls.push("submit"); current = application({ ...current!, state: "Submitted", submittedAt: now }); return current;
    },
    withdraw: async () => {
      calls.push("withdraw"); current = application({ ...current!, state: "Withdrawn", withdrawnAt: now }); return current;
    },
    listForReview: async () => current ? [current] : [],
    transition: async (input) => {
      calls.push(`review:${input.action}`);
      current = application({ ...current!, state: input.action === "screen" ? "Screening"
        : input.action === "shortlist" ? "Shortlisted" : input.outcome ?? "Withdrawn" });
      return [current];
    },
    onboard: async () => current!, declineAccepted: async () => current!,
    reviewAttachment: async () => null,
  };
  return { repo, calls };
}

describe("UC17 recruitment applications", () => {
  it("validates required answers, choices, position and required files", () => {
    expect(() => validateRecruitmentAnswers({ campaign, position: "Designer",
      answers: { motivation: "Interested", team: "Design" }, attachments: [attachment] })).not.toThrow();
    expect(() => validateRecruitmentAnswers({ campaign, position: "Other",
      answers: { motivation: "Interested", team: "Design" }, attachments: [attachment] }))
      .toThrow("application position is not part of this campaign");
    expect(() => validateRecruitmentAnswers({ campaign, position: "Designer",
      answers: { motivation: "Interested", team: "Marketing" }, attachments: [attachment] }))
      .toThrow("invalid application answer");
    expect(() => validateRecruitmentAnswers({ campaign, position: "Designer",
      answers: { team: "Design" }, attachments: [attachment] })).toThrow("required application answer is missing");
    expect(() => validateRecruitmentAnswers({ campaign, position: "Designer",
      answers: { motivation: "Interested", team: "Design" }, attachments: [] }))
      .toThrow("required application attachment is missing or duplicated");
  });

  it("creates drafts only for eligible active students and campaign positions", async () => {
    const ready = repository();
    await expect(createRecruitmentApplicationDraft(ready.repo, actor, campaignId, "Developer", now))
      .resolves.toMatchObject({ state: "Draft", position: "Developer" });
    await expect(createRecruitmentApplicationDraft(repository({ eligibility: { userActive: true,
      activeMembership: true, bannedMembership: false } }).repo, actor, campaignId, "Designer", now))
      .rejects.toMatchObject({ kind: "conflict" });
    await expect(createRecruitmentApplicationDraft(repository({ eligibility: { userActive: true,
      activeMembership: false, bannedMembership: true } }).repo, actor, campaignId, "Designer", now))
      .rejects.toMatchObject({ kind: "forbidden" });
  });

  it("submits an eligible complete draft once, and rejects an incomplete one", async () => {
    const ready = repository();
    await expect(submitRecruitmentApplication(ready.repo, actor, applicationId, now))
      .resolves.toMatchObject({ state: "Submitted" });
    expect(ready.calls).toEqual(["submit"]);
    const incomplete = repository({ application: application({ answers: { team: "Design" } }) });
    await expect(submitRecruitmentApplication(incomplete.repo, actor, applicationId, now))
      .rejects.toThrow("required application answer is missing");
    expect(incomplete.calls).toEqual([]);
  });

  it("gives the owner a signed URL for an attachment keyed by its upload UUID", async () => {
    const { repo } = repository();
    const storage = { upload: async () => { throw new Error("unused"); },
      accessUrl: async (assetId: string) => `https://files.test/${assetId}` };
    await expect(recruitmentAttachmentAccess(repo, storage, actor, applicationId, attachment.id))
      .resolves.toEqual({ url: "https://files.test/private-asset", fileName: "resume.pdf" });
    await expect(recruitmentAttachmentAccess(repo, storage, actor, applicationId, "555555555555555555555555"))
      .rejects.toMatchObject({ kind: "validation" });
  });

  it("only permits withdrawal before a decision", async () => {
    const eligible = repository({ application: application({ state: "Shortlisted" }) });
    await expect(withdrawRecruitmentApplication(eligible.repo, actor, applicationId, now))
      .resolves.toMatchObject({ state: "Withdrawn" });
    const decided = repository({ application: application({ state: "Accepted" }) });
    await expect(withdrawRecruitmentApplication(decided.repo, actor, applicationId, now))
      .rejects.toMatchObject({ kind: "conflict" });
  });

  it("validates and attaches signed PDF files only to configured file questions", async () => {
    const ready = repository();
    const storage = {
      upload: async () => attachment,
      accessUrl: async () => "https://storage.example/signed",
    };
    await expect(uploadRecruitmentAttachment(ready.repo, storage, actor, applicationId,
      "resume", "resume.pdf", "application/pdf", Buffer.from("%PDF-1.7\nbody"), now))
      .resolves.toMatchObject({ attachments: [attachment, attachment] });
    await expect(uploadRecruitmentAttachment(ready.repo, storage, actor, applicationId,
      "motivation", "resume.pdf", "application/pdf", Buffer.from("%PDF-1.7\nbody"), now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(uploadRecruitmentAttachment(ready.repo, storage, actor, applicationId,
      "resume", "malware.pdf", "application/pdf", Buffer.from("not a pdf"), now))
      .rejects.toMatchObject({ kind: "validation" });
  });
});
