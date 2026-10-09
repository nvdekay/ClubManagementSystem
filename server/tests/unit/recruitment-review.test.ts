import { describe, expect, it, vi } from "vitest";
import type { ClubAccessRepository } from "../../src/domain/access.js";
import type { RecruitmentReviewRepository } from "../../src/domain/recruitment-application.js";
import { listRecruitmentApplicationsForReview, reviewerAttachmentAccess, reviewRecruitmentApplications } from "../../src/usecase/recruitment-review.js";

const userId = "111111111111111111111111";
const clubId = "222222222222222222222222";
const campaignId = "333333333333333333333333";
const applicationId = "444444444444444444444444";
const now = new Date("2026-10-08T12:00:00Z");
const actor = { id: userId, accountState: "Active" as const };

function accessRepo(permission = true): ClubAccessRepository {
  return { findSnapshot: async () => ({ clubId, clubName: "Test", clubState: "Active",
    membership: { id: "555555555555555555555555", clubId, state: "Active" },
    terms: [{ id: "666666666666666666666666", clubId, state: "Active",
      startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01") }],
    positions: [{ id: "777777777777777777777777", clubId, isActive: true,
      isLeaderRole: false, permissionCodes: permission ? ["club.application.review"] : [] }],
    assignments: [{ clubId, termId: "666666666666666666666666",
      positionId: "777777777777777777777777", membershipId: "555555555555555555555555",
      effectiveFrom: new Date("2026-01-01") }], isApprovedFounder: false }) };
}

function reviewRepo(): RecruitmentReviewRepository {
  return { listForReview: vi.fn(async () => []), transition: vi.fn(async () => []),
    onboard: vi.fn(async () => { throw new Error("unused"); }),
    declineAccepted: vi.fn(async () => { throw new Error("unused"); }),
    reviewAttachment: vi.fn(async ({ attachmentId }: { attachmentId: string }) =>
      attachmentId === attachment.id ? attachment : null) };
}

const attachment = { id: "8f2c1a3e-5b6d-4c7e-9a8b-1c2d3e4f5a6b", fieldKey: "cv", fileName: "cv.pdf",
  mimeType: "application/pdf", bytes: 10, assetId: "asset-1", uploadedAt: now };
const storage = { upload: vi.fn(), accessUrl: vi.fn(async (assetId: string) => `https://files.test/${assetId}`) };

describe("UC18 recruitment review", () => {
  it("lists applications only for club reviewers with the review permission", async () => {
    const repo = reviewRepo();
    await expect(listRecruitmentApplicationsForReview(repo, accessRepo(), actor,
      clubId, campaignId, "Submitted", now)).resolves.toEqual([]);
    await expect(listRecruitmentApplicationsForReview(repo, accessRepo(false), actor,
      clubId, campaignId, undefined, now)).rejects.toMatchObject({ kind: "forbidden" });
  });

  it("lets club reviewers open a submitted applicant's attachment through a signed URL", async () => {
    const input = { clubId, campaignId, applicationId, attachmentId: attachment.id };
    await expect(reviewerAttachmentAccess(reviewRepo(), storage, accessRepo(), actor, input, now))
      .resolves.toEqual({ url: "https://files.test/asset-1", fileName: "cv.pdf" });
    await expect(reviewerAttachmentAccess(reviewRepo(), storage, accessRepo(false), actor, input, now))
      .rejects.toMatchObject({ kind: "forbidden" });
    await expect(reviewerAttachmentAccess(reviewRepo(), storage, accessRepo(), actor,
      { ...input, attachmentId: "00000000-0000-4000-8000-000000000000" }, now)).rejects.toMatchObject({ kind: "not_found" });
    await expect(reviewerAttachmentAccess(reviewRepo(), storage, accessRepo(), actor,
      { ...input, attachmentId: "not-a-uuid" }, now)).rejects.toMatchObject({ kind: "validation" });
    await expect(reviewerAttachmentAccess(reviewRepo(), null, accessRepo(), actor, input, now))
      .rejects.toMatchObject({ kind: "unavailable" });
  });

  it("requires a rejection reason and delegates valid decisions", async () => {
    const repo = reviewRepo();
    const input = { clubId, campaignId, applicationIds: [applicationId], action: "decide" as const,
      outcome: "Rejected" as const };
    await expect(reviewRecruitmentApplications(repo, accessRepo(), actor, input, now))
      .rejects.toMatchObject({ kind: "validation" });
    await reviewRecruitmentApplications(repo, accessRepo(), actor,
      { ...input, reason: "Insufficient experience" }, now);
    expect(repo.transition).toHaveBeenCalledWith({ ...input, reason: "Insufficient experience", actorId: userId, now });
  });
});
