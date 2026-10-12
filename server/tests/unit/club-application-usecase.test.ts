import { describe, expect, it, vi } from "vitest";
import type {
  ApplicationDocument, ApplicationFileStorage, ClubApplicationDraft, ClubApplicationRecord, ClubApplicationRepository,
  ClubApplicationVersion,
} from "../../src/domain/club-application.js";
import type { ClubField, ClubFieldRepository } from "../../src/domain/club-field.js";
import { DEFAULT_FORM_REQUIREMENTS, type PolicyRepository, type PolicyVersion } from "../../src/domain/policy.js";
import {
  applicationConfiguration, createApplicationDraft, getMyApplication, lookupFounder, previewApplication,
  saveApplicationDraft, submitApplication, uploadApplicationDocument,
} from "../../src/usecase/club-application.js";

const now = new Date("2026-10-03T12:00:00Z");
const actor = { id: "000000000000000000000001", accountState: "Active" as const };
const vice = "000000000000000000000007";
const fieldId = "00000000000000000000000a";
function document(documentType: string): ApplicationDocument {
  return { id: `${documentType}-id`, documentType, fileName: "file", mimeType: "application/pdf", bytes: 8,
    assetId: "asset", uploadedAt: now };
}
const draft: ClubApplicationDraft = {
  clubName: "Robotics Club", fieldId, field: "Công nghệ", summary: "Robots", objectives: "Build robots",
  fanpageUrl: "", contactEmail: "",
  founders: [{ userId: actor.id, role: "LEADER" }, { userId: vice, role: "VICE_LEADER" }],
  documents: [document("PROPOSAL"), document("LOGO")],
};

function record(overrides: Partial<ClubApplicationDraft> = {}): ClubApplicationRecord {
  return { id: "000000000000000000000002", founderUserId: actor.id,
    state: "Draft", currentVersionNo: 1, draftRevision: 0, draft: { ...draft, ...overrides }, createdAt: now };
}

function policy(minFoundingMembers = 2,
  clubFounding: Partial<PolicyVersion["formRequirements"]["clubFounding"]> = {}): PolicyRepository {
  const version: PolicyVersion = {
    id: "000000000000000000000003", minFoundingMembers,
    formRequirements: { ...DEFAULT_FORM_REQUIREMENTS,
      clubFounding: { ...DEFAULT_FORM_REQUIREMENTS.clubFounding, ...clubFounding } },
    reportDeadlines: [], conflictThresholdMinutes: 30, feedbackWindowHours: 48, feedbackMinRespondents: 5,
    allowOverbooking: false, enforceOverdueReportBlock: false, academicCalendar: [],
    effectiveFrom: now, createdBy: actor.id, createdAt: now,
  };
  return { findEffective: async () => version };
}

function fields(catalog: ClubField[] = [{ id: fieldId, name: "Công nghệ", sortOrder: 10, isActive: true }]) {
  const repo: ClubFieldRepository = {
    listActive: async () => catalog.filter((field) => field.isActive),
    listWithUsage: async () => [], find: async (id) => catalog.find((field) => field.id === id) ?? null,
    create: async () => { throw new Error("unused"); }, update: async () => { throw new Error("unused"); },
    remove: async () => { throw new Error("unused"); },
  };
  return repo;
}

function repository(overrides: Partial<ClubApplicationRepository> = {}) {
  const version: ClubApplicationVersion = {
    id: "000000000000000000000004", applicationId: record().id,
    versionNo: 1, policyVersionId: "000000000000000000000003", snapshot: draft,
    submittedAt: now,
  };
  const repo: ClubApplicationRepository = {
    createDraft: async (_owner, value) => ({ ...record(), draft: value }), listMine: async () => [record()],
    findOwned: async () => record(), versions: async () => [], decisionFeedback: async () => [],
    findActiveUserByEmail: async (email: string) => email === "peer@example.edu"
      ? { id: "000000000000000000000009", displayName: "Peer", email } : null,
    founderProfiles: async () => [],
    saveDraft: async () => record(), addDocument: async () => record(),
    removeDocument: async () => record(), usersExist: async () => true,
    activeClubNameExists: async () => false, activeLeaderUserIds: async () => [],
    submit: async () => version,
    withdraw: async () => ({ ...record(), state: "Withdrawn" }), ...overrides,
  };
  return repo;
}

const input = { clubName: " Robotics Club ", fieldId, summary: "Robots", objectives: "Build robots",
  fanpageUrl: "", contactEmail: "", founders: draft.founders };

describe("UC07 application submission use case", () => {
  it("validates against the effective policy and returns the duplicate-name warning", async () => {
    const submit = vi.fn(async () => ({ id: "000000000000000000000004",
      applicationId: record().id, versionNo: 1,
      policyVersionId: "000000000000000000000003", snapshot: draft, submittedAt: now }));
    const repo = repository({ activeClubNameExists: async () => true, submit });
    const result = await submitApplication(repo, policy(), fields(), actor, record().id, now);
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
    await expect(submitApplication(repo, { findEffective: async () => null }, fields(), actor,
      record().id, now)).rejects.toMatchObject({ kind: "unavailable" });
    await expect(submitApplication(repo, policy(), fields(),
      { id: "000000000000000000000005", accountState: "Active" }, record().id, now))
      .rejects.toMatchObject({ kind: "not_found" });
    expect(submit).not.toHaveBeenCalled();
  });

  it("lists every gap at once: fields the policy requires, founders and the board", async () => {
    const submit = vi.fn();
    const repo = repository({ submit, findOwned: async () => record({ summary: "", documents: [],
      founders: [{ userId: actor.id, role: "MEMBER" }] }) });
    await expect(submitApplication(repo, policy(3), fields(), actor, record().id, now))
      .rejects.toMatchObject({ kind: "validation", details: { required: 3, issues: [
        "summary", "proposal", "logo", "foundersTooFew", "leaderCount", "viceLeaderCount",
      ] } });
    expect(submit).not.toHaveBeenCalled();
  });

  it("lets a student leave out fields the policy marks optional", async () => {
    const submit = vi.fn(repository().submit);
    const repo = repository({ submit, findOwned: async () => record({ summary: "", documents: [] }) });
    await submitApplication(repo, policy(2, { summary: false, proposal: false, logo: false }), fields(),
      actor, record().id, now);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("allows at most two vice leaders and exactly one leader", async () => {
    const founders = [{ userId: actor.id, role: "LEADER" as const },
      ...["0b", "0c", "0d"].map((suffix) => ({ userId: `0000000000000000000000${suffix}`,
        role: "VICE_LEADER" as const }))];
    const repo = repository({ findOwned: async () => record({ founders }) });
    await expect(previewApplication(repo, policy(), fields(), actor, record().id, now))
      .resolves.toMatchObject({ issues: ["viceLeaderCount"] });
  });

  it("blocks a hidden field and a leader who already leads another club", async () => {
    const hidden = fields([{ id: fieldId, name: "Công nghệ", sortOrder: 10, isActive: false }]);
    const repo = repository({ activeLeaderUserIds: async (ids) => [...ids] });
    await expect(submitApplication(repo, policy(), hidden, actor, record().id, now))
      .rejects.toMatchObject({ details: { issues: ["fieldUnavailable", "leaderHoldsAnotherClub"] } });
  });

  it("stores the catalog name of the chosen field and rejects unknown fields and roles", async () => {
    const created = await createApplicationDraft(repository(), fields(), actor, input, now);
    expect(created.draft).toMatchObject({ clubName: "Robotics Club", fieldId, field: "Công nghệ" });
    await expect(createApplicationDraft(repository(), fields([]), actor, input, now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(createApplicationDraft(repository(), fields(), actor,
      { ...input, founders: [{ userId: actor.id, role: "TREASURER" }] }, now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(createApplicationDraft(repository(), fields(), actor,
      { ...input, fanpageUrl: "javascript:alert(1)" }, now)).rejects.toMatchObject({ kind: "validation" });
  });

  it("exposes the active field catalog and the fixed founding positions", async () => {
    const config = await applicationConfiguration(policy(), fields(), actor, now);
    expect(config.fields).toEqual([{ id: fieldId, name: "Công nghệ", sortOrder: 10, isActive: true }]);
    expect(config.positions.map((position) => position.founderRole)).toEqual(["LEADER", "VICE_LEADER", "MEMBER"]);
    expect(config.maxViceLeaders).toBe(2);
  });

  it("returns the ICPDP decision feedback with the owner's application", async () => {
    const feedback = [{ outcome: "Request revision" as const, reason: "Clarify objectives",
      sections: ["club-information"], decidedAt: now }];
    const repo = repository({ decisionFeedback: async () => feedback });
    await expect(getMyApplication(repo, actor, record().id))
      .resolves.toMatchObject({ application: { id: record().id }, decisions: feedback });
  });

  it("resolves founders by exact email instead of raw account ids", async () => {
    const repo = repository();
    await expect(lookupFounder(repo, actor, "  Peer@Example.edu "))
      .resolves.toMatchObject({ id: "000000000000000000000009", displayName: "Peer" });
    await expect(lookupFounder(repo, actor, "nobody@example.edu")).rejects.toMatchObject({ kind: "not_found" });
    await expect(lookupFounder(repo, actor, "not-an-email")).rejects.toMatchObject({ kind: "validation" });
    await expect(lookupFounder(repo, null, "peer@example.edu")).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("rejects a stale draft edit instead of overwriting another session", async () => {
    const save = vi.fn();
    const repo = repository({ findOwned: async () => ({ ...record(), draftRevision: 3 }),
      saveDraft: save });
    await expect(saveApplicationDraft(repo, fields(), actor, record().id, input, 2))
      .rejects.toMatchObject({ kind: "conflict" });
    expect(save).not.toHaveBeenCalled();
  });

  it("accepts only PDF/DOCX proposals and PNG/JPEG logos, checking bytes and size", async () => {
    const upload = vi.fn(async (value: { documentType: string; visibility: string }): Promise<ApplicationDocument> => ({
      ...document(value.documentType), id: "new-id" }));
    const storage: ApplicationFileStorage = { upload, accessUrl: async () => "https://example.test/file" };
    const addDocument = vi.fn(async () => record());
    const removeDocument = vi.fn(async () => record());
    const repo = repository({ addDocument, removeDocument });
    const pdf = Buffer.from("%PDF-1.7");
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    const svg = Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\"/>");
    await uploadApplicationDocument(repo, storage, actor, record().id,
      "PROPOSAL", "de-an.pdf", "application/pdf", pdf, now);
    await uploadApplicationDocument(repo, storage, actor, record().id,
      "LOGO", "logo.png", "image/png", png, now);
    for (const [type, name, mime, bytes] of [
      ["PROPOSAL", "spoof.png", "image/png", pdf], ["LOGO", "logo.pdf", "application/pdf", pdf],
      ["LOGO", "logo.svg", "image/svg+xml", svg], ["CHARTER", "x.pdf", "application/pdf", pdf],
      ["LOGO", "big.png", "image/png", Buffer.concat([png, Buffer.alloc(2 * 1024 * 1024)])],
    ] as const) {
      await expect(uploadApplicationDocument(repo, storage, actor, record().id, type, name, mime, bytes, now))
        .rejects.toMatchObject({ kind: "validation" });
    }
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls.map(([value]) => value.visibility))
      .toEqual(["private", "public"]);
    // Each upload replaces the earlier file of the same type.
    expect(removeDocument.mock.calls.map((call) => (call as unknown[])[2])).toEqual(["PROPOSAL-id", "LOGO-id"]);
  });
});
