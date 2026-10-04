export interface ProposedRole {
  code: string;
  name: string;
  unit?: string;
  isBoardSeat: boolean;
  isLeaderRole: boolean;
  isDefaultMemberRole: boolean;
  isSingleHolder: boolean;
  permissionCodes: string[];
}

export interface ApplicationDocument {
  id: string;
  documentType: string;
  fileName: string;
  mimeType: string;
  bytes: number;
  uploadedAt: string;
}

export interface DraftInput {
  clubName: string;
  field: string;
  objectives: string;
  foundingUserIds: string[];
  proposedRoles: ProposedRole[];
}

export interface ApplicationDraft extends DraftInput {
  documents: ApplicationDocument[];
}

export interface ApplicationRecord {
  id: string;
  founderUserId: string;
  state: string;
  currentVersionNo: number;
  draftRevision: number;
  draft: ApplicationDraft;
  submittedAt?: string;
  createdAt: string;
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
  requirements: { policyVersionId: string; minFoundingMembers: number;
    mandatoryApplicationDocuments: string[] };
  grantablePermissions: string[];
  defaultRoles: ProposedRole[];
}

export interface ApplicationDetail {
  application: ApplicationRecord;
  versions: ApplicationVersion[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/applications${path}`, {
    credentials: "same-origin", ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
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
  requirements: ApplicationConfig["requirements"]; activeNameConflict: boolean;
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

export function uploadDocument(id: string, documentType: string, file: File,
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

export function documentAccess(id: string, documentId: string): Promise<{ url: string; fileName: string }> {
  return request(`/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/access`);
}
