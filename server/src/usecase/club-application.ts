import { DomainError } from "../domain/errors.js";
import type { ClubFieldRepository } from "../domain/club-field.js";
import {
  APPLICATION_DOCUMENT_TYPES, FOUNDER_ROLES, FOUNDING_POSITIONS, MAX_VICE_LEADERS,
  foundingSubmissionIssues,
  type ApplicationDocument, type ApplicationDocumentType, type ApplicationFileStorage,
  type ClubApplicationDraft, type ClubApplicationRecord, type ClubApplicationRepository,
  type ClubApplicationVersion, type ApplicantDecisionFeedback, type FounderProfile,
  type FounderRole, type FoundingIssue,
} from "../domain/club-application.js";
import type { FoundingRequirements, PolicyRepository } from "../domain/policy.js";
import type { AccessActor } from "./access.js";
import { foundingRequirementsAt } from "./policy.js";

const objectId = /^[0-9a-f]{24}$/i;
const docxMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const documentRules: Record<ApplicationDocumentType, { mimeTypes: ReadonlySet<string>;
  maxBytes: number; visibility: "private" | "public" }> = {
  PROPOSAL: { mimeTypes: new Set(["application/pdf", docxMime]), maxBytes: 10 * 1024 * 1024,
    visibility: "private" },
  LOGO: { mimeTypes: new Set(["image/png", "image/jpeg"]), maxBytes: 2 * 1024 * 1024,
    visibility: "public" },
};

function fileSignatureMatches(mimeType: string, bytes: Buffer): boolean {
  if (mimeType === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (mimeType === "image/png") return bytes.subarray(0, 8).equals(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/jpeg") return bytes.length >= 3 &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === docxMime) {
    return bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) &&
      bytes.includes(Buffer.from("[Content_Types].xml"));
  }
  return false;
}

export interface DraftInput {
  clubName: string;
  fieldId: string;
  summary: string;
  objectives: string;
  fanpageUrl: string;
  contactEmail: string;
  founders: { userId: string; role: string }[];
}

function owner(actor: AccessActor | null): string {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") {
    throw new DomainError(actor.lockReason || "account locked", "locked");
  }
  if (!objectId.test(actor.id)) throw new DomainError("invalid actor", "validation");
  return actor.id;
}

function applicationId(id: string): string {
  if (!objectId.test(id)) throw new DomainError("invalid application id", "validation");
  return id;
}

function editable(record: ClubApplicationRecord): void {
  if (record.state !== "Draft" && record.state !== "Revision Requested") {
    throw new DomainError("application cannot be edited in this state", "conflict");
  }
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: string, max: number): string {
  const normalized = value.trim();
  if (normalized.length > max) throw new DomainError("application text is too long", "validation");
  return normalized;
}

function httpUrl(value: string): string {
  const normalized = text(value, 2_000);
  if (!normalized) return "";
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
    return parsed.toString();
  } catch {
    throw new DomainError("invalid fanpage URL", "validation");
  }
}

/**
 * Resolve the chosen field against the catalog. A field hidden after it was saved stays on the
 * draft (so editing other parts still works) but blocks submission until the student re-picks.
 */
async function resolvedField(fields: ClubFieldRepository, fieldId: string,
  current?: ClubApplicationDraft): Promise<{ fieldId: string; field: string }> {
  if (!objectId.test(fieldId)) throw new DomainError("club field is required", "validation");
  const found = await fields.find(fieldId);
  if (!found || (!found.isActive && current?.fieldId !== fieldId)) {
    throw new DomainError("club field is not available", "validation");
  }
  return { fieldId, field: found.name };
}

async function draftFrom(fields: ClubFieldRepository, input: DraftInput,
  documents: ApplicationDocument[], current?: ClubApplicationDraft): Promise<ClubApplicationDraft> {
  const clubName = text(input.clubName, 200);
  if (!clubName) throw new DomainError("club name is required", "validation");
  const contactEmail = text(input.contactEmail, 320).toLowerCase();
  if (contactEmail && !emailPattern.test(contactEmail)) {
    throw new DomainError("invalid contact email", "validation");
  }
  if (input.founders.length > 100 || input.founders.some((founder) => !objectId.test(founder.userId)
    || !FOUNDER_ROLES.some((role) => role === founder.role))) {
    throw new DomainError("invalid founding member", "validation");
  }
  return { clubName, ...await resolvedField(fields, input.fieldId.trim(), current),
    summary: text(input.summary, 1_000), objectives: text(input.objectives, 5_000),
    fanpageUrl: httpUrl(input.fanpageUrl), contactEmail,
    founders: input.founders.map((founder) => ({ userId: founder.userId.toLowerCase(),
      role: founder.role as FounderRole })),
    documents: [...documents] };
}

async function owned(repo: ClubApplicationRepository, id: string,
  ownerId: string): Promise<ClubApplicationRecord> {
  const record = await repo.findOwned(applicationId(id), ownerId);
  if (!record) throw new DomainError("application not found", "not_found");
  return record;
}

export async function createApplicationDraft(repo: ClubApplicationRepository,
  fields: ClubFieldRepository, actor: AccessActor | null, input: DraftInput,
  now: Date): Promise<ClubApplicationRecord> {
  return repo.createDraft(owner(actor), await draftFrom(fields, input, []), now);
}

export async function saveApplicationDraft(repo: ClubApplicationRepository,
  fields: ClubFieldRepository, actor: AccessActor | null, id: string, input: DraftInput,
  expectedDraftRevision: number): Promise<ClubApplicationRecord> {
  const ownerId = owner(actor);
  const record = await owned(repo, id, ownerId);
  editable(record);
  if (record.draftRevision !== expectedDraftRevision) {
    throw new DomainError("application draft changed; reload before saving", "conflict");
  }
  return repo.saveDraft(record.id, ownerId,
    await draftFrom(fields, input, record.draft.documents, record.draft), expectedDraftRevision);
}

export async function listMyApplications(repo: ClubApplicationRepository,
  actor: AccessActor | null): Promise<ClubApplicationRecord[]> {
  return repo.listMine(owner(actor));
}

export async function getMyApplication(repo: ClubApplicationRepository,
  actor: AccessActor | null, id: string): Promise<{
  application: ClubApplicationRecord; versions: ClubApplicationVersion[];
  decisions: ApplicantDecisionFeedback[]; founders: FounderProfile[];
}> {
  const record = await owned(repo, id, owner(actor));
  const [versions, decisions] = await Promise.all([repo.versions(record.id), repo.decisionFeedback(record.id)]);
  const founderIds = [record.draft, ...versions.map((version) => version.snapshot)]
    .flatMap((draft) => draft.founders.map((founder) => founder.userId));
  return { application: record, versions, decisions, founders: await repo.founderProfiles(founderIds) };
}

/** Resolve a founding member by exact email so students never type raw account ids. */
export async function lookupFounder(repo: ClubApplicationRepository, actor: AccessActor | null,
  email: string): Promise<FounderProfile> {
  owner(actor);
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > 254 || !emailPattern.test(normalized)) {
    throw new DomainError("invalid email", "validation");
  }
  const profile = await repo.findActiveUserByEmail(normalized);
  if (!profile) throw new DomainError("no active account uses this email", "not_found");
  return profile;
}

export async function applicationConfiguration(policy: PolicyRepository,
  fields: ClubFieldRepository, actor: AccessActor | null, now: Date) {
  owner(actor);
  return {
    requirements: await foundingRequirementsAt(policy, now),
    fields: await fields.listActive(),
    positions: FOUNDING_POSITIONS.map(({ code, name, founderRole }) => ({ code, name, founderRole })),
    maxViceLeaders: MAX_VICE_LEADERS,
  };
}

type ExtendedIssue = FoundingIssue
  | "fieldUnavailable" | "leaderHoldsAnotherClub";

/** Domain issues plus the checks that need the catalog or other clubs. */
async function submissionIssues(repo: ClubApplicationRepository, fields: ClubFieldRepository,
  draft: ClubApplicationDraft, applicantId: string, requirements: FoundingRequirements,
  now: Date): Promise<ExtendedIssue[]> {
  const issues: ExtendedIssue[] = foundingSubmissionIssues(draft, applicantId, requirements);
  if (draft.fieldId && objectId.test(draft.fieldId) && !(await fields.find(draft.fieldId))?.isActive) {
    issues.push("fieldUnavailable");
  }
  const leader = draft.founders.find((founder) => founder.role === "LEADER");
  if (leader && (await repo.activeLeaderUserIds([leader.userId], now)).length) {
    issues.push("leaderHoldsAnotherClub");
  }
  return issues;
}

export async function previewApplication(repo: ClubApplicationRepository, policy: PolicyRepository,
  fields: ClubFieldRepository, actor: AccessActor | null, id: string, now: Date) {
  const ownerId = owner(actor);
  const record = await owned(repo, id, ownerId);
  editable(record);
  const requirements = await foundingRequirementsAt(policy, now);
  return { requirements,
    issues: await submissionIssues(repo, fields, record.draft, ownerId, requirements, now),
    activeNameConflict: await repo.activeClubNameExists(record.draft.clubName) };
}

export async function submitApplication(repo: ClubApplicationRepository, policy: PolicyRepository,
  fields: ClubFieldRepository, actor: AccessActor | null, id: string, now: Date): Promise<{
  version: ClubApplicationVersion; activeNameConflict: boolean;
}> {
  const ownerId = owner(actor);
  const record = await owned(repo, id, ownerId);
  editable(record);
  const requirements = await foundingRequirementsAt(policy, now);
  const issues = await submissionIssues(repo, fields, record.draft, ownerId, requirements, now);
  if (issues.length) {
    throw new DomainError("club application is incomplete", "validation", {
      issues, required: requirements.minFoundingMembers,
    });
  }
  if (!await repo.usersExist(record.draft.founders.map((founder) => founder.userId))) {
    throw new DomainError("founding member not found", "validation");
  }
  const activeNameConflict = await repo.activeClubNameExists(record.draft.clubName);
  const version = await repo.submit({ id: record.id, ownerId,
    snapshot: record.draft, expectedDraftRevision: record.draftRevision,
    policyVersionId: requirements.policyVersionId, now });
  return { version, activeNameConflict };
}

export async function withdrawApplication(repo: ClubApplicationRepository,
  actor: AccessActor | null, id: string, now: Date): Promise<ClubApplicationRecord> {
  const ownerId = owner(actor);
  const record = await owned(repo, id, ownerId);
  if (!["Submitted", "Under Review", "Revision Requested"].includes(record.state)) {
    throw new DomainError("application cannot be withdrawn in this state", "conflict");
  }
  return repo.withdraw(record.id, ownerId, now);
}

export async function uploadApplicationDocument(repo: ClubApplicationRepository,
  storage: ApplicationFileStorage | null, actor: AccessActor | null, id: string,
  documentType: string, fileName: string, mimeType: string, bytes: Buffer,
  now: Date): Promise<ApplicationDocument> {
  const ownerId = owner(actor);
  const record = await owned(repo, id, ownerId);
  editable(record);
  if (!storage) throw new DomainError("file storage is not configured", "unavailable");
  const type = APPLICATION_DOCUMENT_TYPES.find((value) => value === documentType);
  if (!type) throw new DomainError("invalid application document type", "validation");
  const rule = documentRules[type];
  if (!fileName.trim() || fileName.length > 255 || !rule.mimeTypes.has(mimeType) ||
    bytes.length === 0 || bytes.length > rule.maxBytes || !fileSignatureMatches(mimeType, bytes)) {
    throw new DomainError("invalid application document", "validation", {
      documentType: type, maxBytes: rule.maxBytes, mimeTypes: [...rule.mimeTypes],
    });
  }
  const document = await storage.upload({ ownerId, applicationId: record.id,
    documentType: type, fileName: fileName.trim(), mimeType, bytes,
    visibility: rule.visibility, now });
  // One file per type: the new upload replaces the previous one.
  const replaced = record.draft.documents.filter((item) => item.documentType === type);
  await repo.addDocument(record.id, ownerId, document);
  for (const previous of replaced) await repo.removeDocument(record.id, ownerId, previous.id);
  return document;
}

export async function removeApplicationDocument(repo: ClubApplicationRepository,
  actor: AccessActor | null, id: string, documentId: string): Promise<ClubApplicationRecord> {
  const ownerId = owner(actor);
  const record = await owned(repo, id, ownerId);
  editable(record);
  if (!record.draft.documents.some((document) => document.id === documentId)) {
    throw new DomainError("document not found", "not_found");
  }
  return repo.removeDocument(record.id, ownerId, documentId);
}

export async function applicationDocumentAccess(repo: ClubApplicationRepository,
  storage: ApplicationFileStorage | null, actor: AccessActor | null, id: string,
  documentId: string): Promise<{ fileName: string; url: string }> {
  const ownerId = owner(actor);
  const record = await owned(repo, id, ownerId);
  const versions = await repo.versions(record.id);
  const document = [...record.draft.documents,
    ...versions.flatMap((version) => version.snapshot.documents)]
    .find((item) => item.id === documentId);
  if (!document) throw new DomainError("document not found", "not_found");
  if (!storage) throw new DomainError("file storage is not configured", "unavailable");
  return { fileName: document.fileName, url: await storage.accessUrl(document.assetId) };
}
