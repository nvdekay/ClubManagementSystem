export type FounderRole = "LEADER" | "VICE_LEADER" | "MEMBER";
export type ApplicationDocumentType = "PROPOSAL" | "LOGO";

export interface FoundingMember {
  userId: string;
  role: FounderRole;
}

export interface ApplicationDocument {
  id: string;
  documentType: ApplicationDocumentType;
  fileName: string;
  mimeType: string;
  bytes: number;
  /** Only set for the proposed logo, which is stored publicly so it can be previewed. */
  publicUrl?: string;
  uploadedAt: string;
}

export interface DraftInput {
  clubName: string;
  fieldId: string;
  summary: string;
  objectives: string;
  fanpageUrl: string;
  contactEmail: string;
  founders: FoundingMember[];
}

export interface ApplicationDraft extends DraftInput {
  /** Catalog name of the chosen field, resolved by the server. */
  field: string;
  documents: ApplicationDocument[];
}

export type FoundingField = "summary" | "objectives" | "proposal" | "logo" | "fanpageUrl" | "contactEmail";

/** Everything that blocks submission, as reported by the server preview or a rejected submit. */
export type FoundingIssue = "clubName" | "field" | FoundingField | "foundersTooFew" | "applicantNotFounder"
  | "duplicateFounder" | "leaderCount" | "viceLeaderCount" | "fieldUnavailable" | "leaderHoldsAnotherClub";

export interface FoundingRequirements {
  policyVersionId: string;
  minFoundingMembers: number;
  required: Record<FoundingField, boolean>;
}

export interface ClubFieldOption {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ApplicationRecord {
  id: string;
  founderUserId: string;
  state: string;
  currentVersionNo: number;
  draftRevision: number;
  draft: ApplicationDraft;
  submittedAt?: string;
  revisionDeadlineAt?: string;
  createdAt: string;
}

/** A founding member shown by name and email instead of a raw account id. */
export interface FounderProfile {
  id: string;
  displayName: string;
  email: string;
}

/** ICPDP decision as shown to the applicant (no internal review note). */
export interface ApplicantDecision {
  outcome: "Approve" | "Request revision" | "Reject";
  reason?: string;
  sections: string[];
  decidedAt: string;
}

export interface ApplicationVersion {
  id: string;
  applicationId: string;
  versionNo: number;
  policyVersionId: string;
  snapshot: ApplicationDraft;
  submittedAt: string;
}

export interface ApplicationConfig {
  requirements: FoundingRequirements;
  fields: ClubFieldOption[];
  positions: { code: string; name: string; founderRole: FounderRole }[];
  maxViceLeaders: number;
}

/** Thrown for non-2xx responses; keeps the status and the server's `details` (e.g. founding issues). */
export interface ApplicationRequestError extends Error {
  status: number;
  details?: { issues?: FoundingIssue[]; required?: number };
}

export interface ApplicationDetail {
  application: ApplicationRecord;
  versions: ApplicationVersion[];
  decisions: ApplicantDecision[];
  founders: FounderProfile[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/applications${path}`, {
    credentials: "same-origin", ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      { message?: string; details?: unknown } | null;
    // Keep the status so callers can tell "not found" apart from other failures.
    throw Object.assign(new Error(body?.message ?? `HTTP ${response.status}`), {
      status: response.status,
      ...(body?.details && typeof body.details === "object" ? { details: body.details } : {}),
    });
  }
  const body: { data: T } = await response.json();
  return body.data;
}

function mutation(method: string, csrfToken: string, body?: object): RequestInit {
  return { method, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}) };
}

export function fetchApplicationConfig(signal: AbortSignal): Promise<ApplicationConfig> {
  return request<ApplicationConfig>("/config", { signal });
}

export function fetchMyApplications(signal: AbortSignal): Promise<ApplicationRecord[]> {
  return request<ApplicationRecord[]>("/mine", { signal });
}

export function fetchApplication(id: string, signal: AbortSignal): Promise<ApplicationDetail> {
  return request<ApplicationDetail>(`/${encodeURIComponent(id)}`, { signal });
}

export function previewApplication(id: string, signal: AbortSignal): Promise<{
  requirements: FoundingRequirements; issues: FoundingIssue[]; activeNameConflict: boolean;
}> {
  return request(`/${encodeURIComponent(id)}/preview`, { signal });
}

export function createDraft(input: DraftInput, csrfToken: string): Promise<ApplicationRecord> {
  return request("", mutation("POST", csrfToken, input));
}

export function saveDraft(id: string, input: DraftInput, draftRevision: number,
  csrfToken: string): Promise<ApplicationRecord> {
  return request(`/${encodeURIComponent(id)}/draft`, mutation("PATCH", csrfToken,
    { ...input, draftRevision }));
}

export function submitDraft(id: string, csrfToken: string): Promise<{
  version: ApplicationVersion; activeNameConflict: boolean;
}> {
  return request(`/${encodeURIComponent(id)}/submit`, mutation("POST", csrfToken));
}

export function withdrawDraft(id: string, csrfToken: string): Promise<ApplicationRecord> {
  return request(`/${encodeURIComponent(id)}/withdraw`, mutation("POST", csrfToken));
}

export function uploadDocument(id: string, documentType: ApplicationDocumentType, file: File,
  csrfToken: string): Promise<ApplicationDocument> {
  return request(`/${encodeURIComponent(id)}/documents`, {
    method: "POST", headers: { "Content-Type": file.type,
      "X-CSRF-Token": csrfToken, "X-Document-Type": encodeURIComponent(documentType),
      "X-Filename": encodeURIComponent(file.name) }, body: file,
  });
}

export function removeDocument(id: string, documentId: string,
  csrfToken: string): Promise<ApplicationRecord> {
  return request(`/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`,
    mutation("DELETE", csrfToken));
}

export function lookupFounder(email: string): Promise<FounderProfile> {
  return request(`/founder-lookup?email=${encodeURIComponent(email)}`);
}

export function documentAccess(id: string, documentId: string): Promise<{ url: string; fileName: string }> {
  return request(`/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/access`);
}
