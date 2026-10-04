import { describe, expect, it, vi } from "vitest";
import type {
  ApplicationDocument, ApplicationFileStorage, ClubApplicationDraft, ClubApplicationRecord, ClubApplicationRepository,
  ClubApplicationVersion,
} from "../../src/domain/club-application.js";
import type { PolicyRepository, PolicyVersion } from "../../src/domain/policy.js";
import { saveApplicationDraft, submitApplication, uploadApplicationDocument } from "../../src/usecase/club-application.js";

const now = new Date("2026-10-03T12:00:00Z");
const actor = { id: "000000000000000000000001", accountState: "Active" as const };
const draft: ClubApplicationDraft = {
  clubName: "Robotics Club", field: "Technology", objectives: "Build robots",
  foundingUserIds: [actor.id], documents: [], proposedRoles: [
    { code: "CLUB_LEADER", name: "Club Leader", isBoardSeat: true,
      isLeaderRole: true, isDefaultMemberRole: false, isSingleHolder: true, permissionCodes: [] },
    { code: "MEMBERS", name: "Members", isBoardSeat: false,
      isLeaderRole: false, isDefaultMemberRole: true, isSingleHolder: false, permissionCodes: [] },
  ],
};

function record(): ClubApplicationRecord {
  return { id: "000000000000000000000002", founderUserId: actor.id,
    state: "Draft", currentVersionNo: 1, draftRevision: 0, draft, createdAt: now };
}

function policy(): PolicyRepository {
  const version: PolicyVersion = {
    id: "000000000000000000000003", allowedEmailDomains: ["example.edu"],
    minFoundingMembers: 1, mandatoryApplicationDocuments: [], reportDeadlines: [],
    conflictThresholdMinutes: 30, feedbackWindowHours: 48, feedbackMinRespondents: 5,
    allowOverbooking: false, enforceOverdueReportBlock: false, academicCalendar: [],
    effectiveFrom: now, createdBy: actor.id, createdAt: now,
  };
  return { findEffective: async () => version };
}

function repository(overrides: Partial<ClubApplicationRepository> = {}) {
  const version: ClubApplicationVersion = {
    id: "000000000000000000000004", applicationId: record().id,
    versionNo: 1, policyVersionId: "000000000000000000000003", snapshot: draft,
    submittedAt: now,
  };
  const repo: ClubApplicationRepository = {
    createDraft: async () => record(), listMine: async () => [record()],
    findOwned: async () => record(), versions: async () => [],
    saveDraft: async () => record(), addDocument: async () => record(),
    removeDocument: async () => record(), usersExist: async () => true,
    activeClubNameExists: async () => false, submit: async () => version,
    withdraw: async () => ({ ...record(), state: "Withdrawn" }), ...overrides,
  };
  return repo;
}

describe("UC07 application submission use case", () => {
  it("validates against the effective policy and returns the duplicate-name warning", async () => {
    const submit = vi.fn(async () => ({ id: "000000000000000000000004",
      applicationId: record().id, versionNo: 1,
      policyVersionId: "000000000000000000000003", snapshot: draft, submittedAt: now }));
    const repo = repository({ activeClubNameExists: async () => true, submit });
    const result = await submitApplication(repo, policy(), actor, record().id, now);
    expect(result.activeNameConflict).toBe(true);
    expect(result.version.policyVersionId).toBe("000000000000000000000003");
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      expectedDraftRevision: 0, policyVersionId: "000000000000000000000003",
    }));
  });

  it("does not submit when policy is missing or the applicant does not own the draft", async () => {
    const submit = vi.fn();
    const repo = repository({ findOwned: async (id, ownerId) =>
      ownerId === actor.id ? record() : null, submit });
    await expect(submitApplication(repo, { findEffective: async () => null }, actor,
      record().id, now)).rejects.toMatchObject({ kind: "unavailable" });
    await expect(submitApplication(repo, policy(),
      { id: "000000000000000000000005", accountState: "Active" }, record().id, now))
      .rejects.toMatchObject({ kind: "not_found" });
    expect(submit).not.toHaveBeenCalled();
  });

  it("rejects an invalid member set before any write", async () => {
    const submit = vi.fn();
    const repo = repository({ findOwned: async () => ({ ...record(),
      draft: { ...draft, foundingUserIds: [] } }), submit });
    await expect(submitApplication(repo, policy(), actor, record().id, now))
      .rejects.toMatchObject({ kind: "validation" });
    expect(submit).not.toHaveBeenCalled();
  });

  it("rejects a stale draft edit instead of overwriting another session", async () => {
    const save = vi.fn();
    const repo = repository({ findOwned: async () => ({ ...record(), draftRevision: 3 }),
      saveDraft: save });
    await expect(saveApplicationDraft(repo, actor, record().id, {
      clubName: draft.clubName, field: draft.field, objectives: draft.objectives,
      foundingUserIds: draft.foundingUserIds, proposedRoles: draft.proposedRoles,
    }, 2)).rejects.toMatchObject({ kind: "conflict" });
    expect(save).not.toHaveBeenCalled();
  });

  it("checks file bytes against the declared type before Cloudinary upload", async () => {
    const upload = vi.fn(async (): Promise<ApplicationDocument> => ({
      id: "doc-id", documentType: "charter", fileName: "charter.pdf",
      mimeType: "application/pdf", bytes: 8, assetId: "asset-id", uploadedAt: now,
    }));
    const storage: ApplicationFileStorage = { upload, accessUrl: async () => "https://example.test/file" };
    const addDocument = vi.fn(async () => record());
    const repo = repository({ addDocument });
    const pdf = Buffer.from("%PDF-1.7");
    await uploadApplicationDocument(repo, storage, actor, record().id,
      "charter", "charter.pdf", "application/pdf", pdf, now);
    await expect(uploadApplicationDocument(repo, storage, actor, record().id,
      "charter", "spoof.png", "image/png", pdf, now)).rejects.toMatchObject({ kind: "validation" });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(addDocument).toHaveBeenCalledTimes(1);
  });
});
