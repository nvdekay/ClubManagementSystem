import { GRANTABLE_CLUB_PERMISSIONS } from "./access.js";
import { DomainError } from "./errors.js";
import type { FoundingRequirements } from "./policy.js";

export const FOUNDER_ROLES = ["LEADER", "VICE_LEADER", "MEMBER"] as const;
export type FounderRole = (typeof FOUNDER_ROLES)[number];
export const MAX_VICE_LEADERS = 2;

export interface FoundingMember {
  userId: string;
  role: FounderRole;
}

export const APPLICATION_DOCUMENT_TYPES = ["PROPOSAL", "LOGO"] as const;
export type ApplicationDocumentType = (typeof APPLICATION_DOCUMENT_TYPES)[number];

export interface ApplicationDocument {
  id: string;
  documentType: string;
  fileName: string;
  mimeType: string;
  bytes: number;
  assetId: string;
  /** Only the logo is stored publicly, so it can be previewed and become the club logo. */
  publicUrl?: string;
  uploadedAt: Date;
}

export interface ClubApplicationDraft {
  clubName: string;
  /** Catalog id of the chosen club field; `field` keeps its name for lists and the created club. */
  fieldId: string;
  field: string;
  summary: string;
  objectives: string;
  fanpageUrl: string;
  contactEmail: string;
  founders: FoundingMember[];
  documents: ApplicationDocument[];
}

/** A position of the fixed founding structure; students only pick who holds what. */
export interface FoundingPosition {
  code: string;
  name: string;
  founderRole: FounderRole;
  isBoardSeat: boolean;
  isLeaderRole: boolean;
  isDefaultMemberRole: boolean;
  isSingleHolder: boolean;
  permissionCodes: readonly string[];
}

export const FOUNDING_POSITIONS: readonly FoundingPosition[] = [
  { code: "CLUB_LEADER", name: "Chủ nhiệm", founderRole: "LEADER", isBoardSeat: true,
    isLeaderRole: true, isDefaultMemberRole: false, isSingleHolder: true, permissionCodes: [] },
  { code: "VICE_LEADER", name: "Phó chủ nhiệm", founderRole: "VICE_LEADER", isBoardSeat: true,
    isLeaderRole: false, isDefaultMemberRole: false, isSingleHolder: false,
    permissionCodes: GRANTABLE_CLUB_PERMISSIONS },
  { code: "MEMBERS", name: "Thành viên", founderRole: "MEMBER", isBoardSeat: false,
    isLeaderRole: false, isDefaultMemberRole: true, isSingleHolder: false, permissionCodes: [] },
];

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
  /** Users among `userIds` holding a confirmed club-leader seat in a term still running at `at`. */
  activeLeaderUserIds(userIds: readonly string[], at: Date): Promise<string[]>;
  submit(input: { id: string; ownerId: string; snapshot: ClubApplicationDraft;
    expectedDraftRevision: number; policyVersionId: string; now: Date }): Promise<ClubApplicationVersion>;
  withdraw(id: string, ownerId: string, now: Date): Promise<ClubApplicationRecord>;
}

export interface ApplicationFileStorage {
  /** `visibility: "public"` returns a `publicUrl` (used for the proposed logo only). */
  upload(input: { ownerId: string; applicationId: string; documentType: string;
    fileName: string; mimeType: string; bytes: Buffer; visibility: "private" | "public";
    now: Date }): Promise<ApplicationDocument>;
  accessUrl(assetId: string): Promise<string>;
}

const objectId = /^[0-9a-f]{24}$/i;

export type FoundingIssue =
  | "clubName" | "field" | "summary" | "objectives" | "fanpageUrl" | "contactEmail"
  | "proposal" | "logo" | "foundersTooFew" | "applicantNotFounder" | "duplicateFounder"
  | "leaderCount" | "viceLeaderCount";

/**
 * Everything that blocks submitting a founding application, so the review step can point at each
 * gap instead of failing on the first one. Catalog and cross-club checks live in the use case.
 */
export function foundingSubmissionIssues(draft: ClubApplicationDraft, applicantId: string,
  requirements: FoundingRequirements): FoundingIssue[] {
  const issues: FoundingIssue[] = [];
  if (!draft.clubName.trim()) issues.push("clubName");
  if (!objectId.test(draft.fieldId)) issues.push("field");
  for (const field of ["summary", "objectives", "fanpageUrl", "contactEmail"] as const) {
    if (requirements.required[field] && !draft[field].trim()) issues.push(field);
  }
  const documentTypes = new Set(draft.documents.map((document) => document.documentType));
  if (requirements.required.proposal && !documentTypes.has("PROPOSAL")) issues.push("proposal");
  if (requirements.required.logo && !documentTypes.has("LOGO")) issues.push("logo");

  const founderIds = draft.founders.map((founder) => founder.userId.toLowerCase());
  if (founderIds.length < requirements.minFoundingMembers) issues.push("foundersTooFew");
  if (!founderIds.includes(applicantId.toLowerCase())) issues.push("applicantNotFounder");
  if (new Set(founderIds).size !== founderIds.length) issues.push("duplicateFounder");
  const leaders = draft.founders.filter((founder) => founder.role === "LEADER").length;
  const viceLeaders = draft.founders.filter((founder) => founder.role === "VICE_LEADER").length;
  if (leaders !== 1) issues.push("leaderCount");
  if (viceLeaders < 1 || viceLeaders > MAX_VICE_LEADERS) issues.push("viceLeaderCount");
  return issues;
}

export function validateClubApplicationSubmission(draft: ClubApplicationDraft, applicantId: string,
  requirements: FoundingRequirements): void {
  const issues = foundingSubmissionIssues(draft, applicantId, requirements);
  if (issues.length) {
    throw new DomainError("club application is incomplete", "validation", {
      issues, required: requirements.minFoundingMembers,
    });
  }
}
