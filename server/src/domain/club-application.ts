import { GRANTABLE_CLUB_PERMISSIONS } from "./access.js";
import { DomainError } from "./errors.js";
import type { FoundingRequirements } from "./policy.js";

export interface ProposedClubRole {
  code: string;
  name: string;
  unit?: string;
  isBoardSeat: boolean;
  isLeaderRole: boolean;
  isDefaultMemberRole: boolean;
  isSingleHolder: boolean;
  permissionCodes: readonly string[];
}

export interface ClubApplicationSubmission {
  clubName: string;
  field: string;
  objectives: string;
  founderUserId: string;
  foundingUserIds: readonly string[];
  documentTypes: readonly string[];
  proposedRoles: readonly ProposedClubRole[];
}

export interface ApplicationDocument {
  id: string;
  documentType: string;
  fileName: string;
  mimeType: string;
  bytes: number;
  assetId: string;
  uploadedAt: Date;
}

export interface ClubApplicationDraft {
  clubName: string;
  field: string;
  objectives: string;
  foundingUserIds: string[];
  proposedRoles: ProposedClubRole[];
  documents: ApplicationDocument[];
}

export type ClubApplicationState = "Draft" | "Submitted" | "Under Review" |
  "Revision Requested" | "Approved" | "Rejected" | "Withdrawn" | "Expired";

export interface ClubApplicationRecord {
  id: string;
  founderUserId: string;
  state: ClubApplicationState;
  currentVersionNo: number;
  draftRevision: number;
  draft: ClubApplicationDraft;
  submittedAt?: Date;
  /** Set by the ICPDP revision request (UC08); the applicant must resubmit before it. */
  revisionDeadlineAt?: Date;
  createdAt: Date;
}

/** Identity shown for a founding member instead of a raw user id. */
export interface FounderProfile {
  id: string;
  displayName: string;
  email: string;
}

/** What the applicant may see of an ICPDP decision: never the internal review note or reviewer. */
export interface ApplicantDecisionFeedback {
  outcome: "Approve" | "Request revision" | "Reject";
  reason?: string;
  sections: string[];
  decidedAt: Date;
}

export interface ClubApplicationVersion {
  id: string;
  applicationId: string;
  versionNo: number;
  policyVersionId: string;
  snapshot: ClubApplicationDraft;
  submittedAt: Date;
}

export interface ClubApplicationRepository {
  createDraft(ownerId: string, draft: ClubApplicationDraft, now: Date): Promise<ClubApplicationRecord>;
  listMine(ownerId: string): Promise<ClubApplicationRecord[]>;
  findOwned(id: string, ownerId: string): Promise<ClubApplicationRecord | null>;
  versions(id: string): Promise<ClubApplicationVersion[]>;
  decisionFeedback(id: string): Promise<ApplicantDecisionFeedback[]>;
  /** Exact, case-insensitive email match among Active accounts (no partial search). */
  findActiveUserByEmail(email: string): Promise<FounderProfile | null>;
  founderProfiles(ids: string[]): Promise<FounderProfile[]>;
  saveDraft(id: string, ownerId: string, draft: ClubApplicationDraft,
    expectedDraftRevision: number): Promise<ClubApplicationRecord>;
  addDocument(id: string, ownerId: string, document: ApplicationDocument): Promise<ClubApplicationRecord>;
  removeDocument(id: string, ownerId: string, documentId: string): Promise<ClubApplicationRecord>;
  usersExist(ids: readonly string[]): Promise<boolean>;
  activeClubNameExists(name: string): Promise<boolean>;
  submit(input: { id: string; ownerId: string; snapshot: ClubApplicationDraft;
    expectedDraftRevision: number; policyVersionId: string; now: Date }): Promise<ClubApplicationVersion>;
  withdraw(id: string, ownerId: string, now: Date): Promise<ClubApplicationRecord>;
}

export interface ApplicationFileStorage {
  upload(input: { ownerId: string; applicationId: string; documentType: string;
    fileName: string; mimeType: string; bytes: Buffer; now: Date }): Promise<ApplicationDocument>;
  accessUrl(assetId: string): Promise<string>;
}

const objectId = /^[0-9a-f]{24}$/i;
const grantablePermissions: ReadonlySet<string> = new Set(GRANTABLE_CLUB_PERMISSIONS);

export function validateClubApplicationSubmission(
  input: ClubApplicationSubmission,
  requirements: FoundingRequirements,
): void {
  if (!input.clubName.trim() || !input.field.trim() || !input.objectives.trim()) {
    throw new DomainError("club name, field and objectives are required", "validation");
  }
  if (!objectId.test(input.founderUserId) ||
    input.foundingUserIds.some((id) => !objectId.test(id))) {
    throw new DomainError("invalid founding member identifier", "validation");
  }
  const founderIds = input.foundingUserIds.map((id) => id.toLowerCase());
  if (new Set(founderIds).size !== founderIds.length) {
    throw new DomainError("founding members must be unique", "validation");
  }
  if (!founderIds.includes(input.founderUserId.toLowerCase())) {
    throw new DomainError("applicant must be a founding member", "validation");
  }
  if (founderIds.length < requirements.minFoundingMembers) {
    throw new DomainError("not enough founding members", "validation", {
      required: requirements.minFoundingMembers,
    });
  }

  const documents = new Set(input.documentTypes);
  const missingDocuments = requirements.mandatoryApplicationDocuments
    .filter((documentType) => !documents.has(documentType));
  if (missingDocuments.length) {
    throw new DomainError("mandatory application documents are missing", "validation", {
      missingDocuments,
    });
  }
  if (!input.proposedRoles.length ||
    input.proposedRoles.filter((role) => role.isLeaderRole).length !== 1 ||
    input.proposedRoles.filter((role) => role.isDefaultMemberRole).length !== 1) {
    throw new DomainError("leader and Members roles are required exactly once", "validation");
  }
  const roleCodes = new Set<string>();
  for (const role of input.proposedRoles) {
    const code = role.code.trim().toUpperCase();
    if (!code || !role.name.trim() || roleCodes.has(code)) {
      throw new DomainError("role codes and names must be unique and nonempty", "validation");
    }
    roleCodes.add(code);
    if ((role.isLeaderRole !== (code === "CLUB_LEADER")) ||
      (role.isDefaultMemberRole !== (code === "MEMBERS"))) {
      throw new DomainError("reserved role codes cannot be changed", "validation");
    }
    if ((role.isLeaderRole && (!role.isBoardSeat || !role.isSingleHolder || role.isDefaultMemberRole)) ||
      (role.isDefaultMemberRole && (role.isBoardSeat || role.isSingleHolder))) {
      throw new DomainError("leader or Members role structure is invalid", "validation");
    }
    if (new Set(role.permissionCodes).size !== role.permissionCodes.length ||
      role.permissionCodes.some((code) => !grantablePermissions.has(code))) {
      throw new DomainError("role permission is not grantable", "validation");
    }
  }
}
