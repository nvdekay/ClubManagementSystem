import { describe, expect, it, vi } from "vitest";
import type { AuthRepository } from "../../src/domain/auth.js";
import type {
  ApplicationReviewDetail,
  ClubApplicationReviewRepository,
} from "../../src/domain/club-application-review.js";
import type { ClubApplicationDraft } from "../../src/domain/club-application.js";
import {
  claimApplicationReview,
  applicationReviewDocumentAccess,
  decideApplicationReview,
  listApplicationReviews,
} from "../../src/usecase/club-application-review.js";

const now = new Date("2026-10-08T08:00:00Z");
const officer = { id: "000000000000000000000001", accountState: "Active" as const };
const applicationId = "000000000000000000000002";
const draft: ClubApplicationDraft = {
  clubName: "Robotics Club", field: "Technology", objectives: "Build robots",
  foundingUserIds: ["000000000000000000000003"], documents: [], proposedRoles: [],
};
const detail: ApplicationReviewDetail = {
  task: { id: "000000000000000000000004", applicationId, title: "Robotics",
    state: "Open", openedAt: now },
  application: { id: applicationId, founderUserId: "000000000000000000000003",
    state: "Submitted", currentVersionNo: 1, draftRevision: 0, draft, createdAt: now },
  versions: [], decisions: [],
};

function auth(roles: string[]): AuthRepository {
  return {
    allowedDomains: async () => [],
    findOrCreateGoogleUser: async () => { throw new Error("unused"); },
    findUserById: async () => null,
    systemRoleCodes: async () => roles,
    clubIds: async () => [], auditLogin: async () => undefined,
  };
}

function repository(overrides: Partial<ClubApplicationReviewRepository> = {}) {
  const repo: ClubApplicationReviewRepository = {
    listOpen: async () => [detail], find: async () => detail,
    findDocument: async () => null,
    claim: async () => detail, decide: async () => detail, ...overrides,
  };
  return repo;
}

describe("UC08 club application review use case", () => {
  it("requires the single ICPDP officer role", async () => {
    await expect(listApplicationReviews(repository(), auth([]), officer))
      .rejects.toMatchObject({ kind: "forbidden" });
    await expect(listApplicationReviews(repository(), auth(["ICPDP_HEAD"]), officer))
      .rejects.toMatchObject({ kind: "forbidden" });
    await expect(listApplicationReviews(repository(), auth(["ICPDP_OFFICER"]), officer))
      .resolves.toHaveLength(1);
  });

  it("passes the officer identity when claiming a review", async () => {
    const claim = vi.fn(async () => detail);
    await claimApplicationReview(repository({ claim }), auth(["ICPDP_OFFICER"]),
      officer, applicationId, now);
    expect(claim).toHaveBeenCalledWith(applicationId, officer.id, now);
  });

  it("validates revision feedback before the repository write", async () => {
    const decide = vi.fn(async () => detail);
    const repo = repository({ decide });
    await expect(decideApplicationReview(repo, auth(["ICPDP_OFFICER"]), officer,
      applicationId, { outcome: "Request revision", reason: "Clarify roles",
        sections: [], revisionDeadlineAt: new Date("2026-10-09T08:00:00Z") }, now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(decideApplicationReview(repo, auth(["ICPDP_OFFICER"]), officer,
      applicationId, { outcome: "Reject" }, now))
      .rejects.toMatchObject({ kind: "validation" });
    expect(decide).not.toHaveBeenCalled();
  });

  it("normalizes and sends one valid decision", async () => {
    const decide = vi.fn(async () => detail);
    await decideApplicationReview(repository({ decide }), auth(["ICPDP_OFFICER"]), officer,
      applicationId, { outcome: "Request revision", reason: "  Clarify roles  ",
        reviewNote: "  Adviser consulted  ", sections: ["role-structure", "role-structure"],
        revisionDeadlineAt: new Date("2026-10-09T08:00:00Z") }, now);
    expect(decide).toHaveBeenCalledWith(applicationId, officer.id, {
      outcome: "Request revision", reason: "Clarify roles", reviewNote: "Adviser consulted",
      sections: ["role-structure"], revisionDeadlineAt: new Date("2026-10-09T08:00:00Z"),
    }, now);
  });

  it("authorizes document access before issuing a storage URL", async () => {
    const accessUrl = vi.fn(async () => "https://files.example.test/document");
    const repo = repository({ findDocument: async () => ({
      id: "550e8400-e29b-41d4-a716-446655440000", documentType: "charter",
      fileName: "charter.pdf", mimeType: "application/pdf", bytes: 10,
      assetId: "private-asset", uploadedAt: now,
    }) });
    await expect(applicationReviewDocumentAccess(repo, auth([]), { accessUrl,
      upload: async () => { throw new Error("unused"); } }, officer, applicationId,
    "550e8400-e29b-41d4-a716-446655440000")).rejects.toMatchObject({ kind: "forbidden" });
    await expect(applicationReviewDocumentAccess(repo, auth(["ICPDP_OFFICER"]), {
      accessUrl, upload: async () => { throw new Error("unused"); },
    }, officer, applicationId, "550e8400-e29b-41d4-a716-446655440000"))
      .resolves.toEqual({ fileName: "charter.pdf", url: "https://files.example.test/document" });
    expect(accessUrl).toHaveBeenCalledWith("private-asset");
  });
});
