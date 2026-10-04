import { DomainError } from "../domain/errors.js";
import { GRANTABLE_CLUB_PERMISSIONS } from "../domain/access.js";
import type {
  ApplicationDocument, ApplicationFileStorage, ClubApplicationDraft,
  ClubApplicationRecord, ClubApplicationRepository, ClubApplicationVersion,
  ProposedClubRole,
} from "../domain/club-application.js";
import { validateClubApplicationSubmission } from "../domain/club-application.js";
import type { PolicyRepository } from "../domain/policy.js";
import type { AccessActor } from "./access.js";
import { foundingRequirementsAt } from "./policy.js";

const objectId = /^[0-9a-f]{24}$/i;
const allowedMimeTypes = new Set([
  "application/pdf", "image/png", "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const maxFileBytes = 10 * 1024 * 1024;

function fileSignatureMatches(mimeType: string, bytes: Buffer): boolean {
  if (mimeType === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (mimeType === "image/png") return bytes.subarray(0, 8).equals(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/jpeg") return bytes.length >= 3 &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) &&
      bytes.includes(Buffer.from("[Content_Types].xml"));
  }
  return false;
}

export interface DraftInput {
  clubName: string;
  field: string;
  objectives: string;
  foundingUserIds: string[];
  proposedRoles: ProposedClubRole[];
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

function draftFrom(input: DraftInput, documents: ApplicationDocument[]): ClubApplicationDraft {
  const clubName = input.clubName.trim();
  const field = input.field.trim();
  const objectives = input.objectives.trim();
  if (!clubName || !field || clubName.length > 200 || field.length > 100 ||
    objectives.length > 5000) {
    throw new DomainError("club name and field are required", "validation");
  }
  return { clubName, field, objectives,
    foundingUserIds: [...input.foundingUserIds],
    proposedRoles: input.proposedRoles.map((role) => ({ ...role,
      permissionCodes: [...role.permissionCodes] })), documents: [...documents] };
}

async function owned(repo: ClubApplicationRepository, id: string,
  ownerId: string): Promise<ClubApplicationRecord> {
  const record = await repo.findOwned(applicationId(id), ownerId);
  if (!record) throw new DomainError("application not found", "not_found");
  return record;
}

export async function createApplicationDraft(repo: ClubApplicationRepository,
  actor: AccessActor | null, input: DraftInput, now: Date): Promise<ClubApplicationRecord> {
  return repo.createDraft(owner(actor), draftFrom(input, []), now);
}

export async function saveApplicationDraft(repo: ClubApplicationRepository,
  actor: AccessActor | null, id: string, input: DraftInput,
  expectedDraftRevision: number): Promise<ClubApplicationRecord> {
  const ownerId = owner(actor);
  const record = await owned(repo, id, ownerId);
  editable(record);
  if (record.draftRevision !== expectedDraftRevision) {
    throw new DomainError("application draft changed; reload before saving", "conflict");
  }
  return repo.saveDraft(record.id, ownerId, draftFrom(input, record.draft.documents),
    expectedDraftRevision);
}

export async function listMyApplications(repo: ClubApplicationRepository,
  actor: AccessActor | null): Promise<ClubApplicationRecord[]> {
  return repo.listMine(owner(actor));
}

export async function getMyApplication(repo: ClubApplicationRepository,
  actor: AccessActor | null, id: string): Promise<{
  application: ClubApplicationRecord; versions: ClubApplicationVersion[];
}> {
  const record = await owned(repo, id, owner(actor));
  return { application: record, versions: await repo.versions(record.id) };
}

export async function applicationConfiguration(policy: PolicyRepository,
  actor: AccessActor | null, now: Date) {
  owner(actor);
  return {
    requirements: await foundingRequirementsAt(policy, now),
    grantablePermissions: GRANTABLE_CLUB_PERMISSIONS,
    defaultRoles: [
      { code: "CLUB_LEADER", name: "Chủ nhiệm", isBoardSeat: true,
        isLeaderRole: true, isDefaultMemberRole: false, isSingleHolder: true,
        permissionCodes: [] },
      { code: "MEMBERS", name: "Members", isBoardSeat: false,
        isLeaderRole: false, isDefaultMemberRole: true, isSingleHolder: false,
        permissionCodes: [] },
    ] satisfies ProposedClubRole[],
  };
}

export async function previewApplication(repo: ClubApplicationRepository, policy: PolicyRepository,
  actor: AccessActor | null, id: string, now: Date) {
  const record = await owned(repo, id, owner(actor));
  editable(record);
  return { requirements: await foundingRequirementsAt(policy, now),
    activeNameConflict: await repo.activeClubNameExists(record.draft.clubName) };
}

export async function submitApplication(repo: ClubApplicationRepository, policy: PolicyRepository,
  actor: AccessActor | null, id: string, now: Date): Promise<{
  version: ClubApplicationVersion; activeNameConflict: boolean;
}> {
  const ownerId = owner(actor);
  const record = await owned(repo, id, ownerId);
  editable(record);
  const requirements = await foundingRequirementsAt(policy, now);
  validateClubApplicationSubmission({ ...record.draft, founderUserId: ownerId,
    documentTypes: record.draft.documents.map((document) => document.documentType) }, requirements);
  if (!await repo.usersExist(record.draft.foundingUserIds)) {
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
  if (!documentType.trim() || documentType.length > 100 || !fileName.trim() ||
    fileName.length > 255 || !allowedMimeTypes.has(mimeType) ||
    bytes.length === 0 || bytes.length > maxFileBytes || !fileSignatureMatches(mimeType, bytes)) {
    throw new DomainError("invalid application document", "validation");
  }
  const document = await storage.upload({ ownerId, applicationId: record.id,
    documentType: documentType.trim(), fileName: fileName.trim(), mimeType, bytes, now });
  await repo.addDocument(record.id, ownerId, document);
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
