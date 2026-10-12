import type { ClubProfileFormField } from "@/services/policy";

export interface ClubChannel {
  label: string;
  url: string;
}

export interface ClubProfile {
  id: string;
  code: string;
  name: string;
  field: string;
  state: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  charterUrl?: string;
  channels: ClubChannel[];
  operatingScope?: string;
  institutionalFields?: unknown;
  updatedAt?: string;
}

export interface ClubProfileInput {
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  charterUrl?: string;
  channels: ClubChannel[];
  operatingScope?: string;
}

export interface ClubDepartment {
  id: string;
  clubId: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ClubDepartmentInput {
  name: string;
  description?: string;
  sortOrder: number;
}

export interface ClubSettings {
  profile: ClubProfile;
  departments: ClubDepartment[];
  /** Profile fields the effective school policy requires (true) before a save is accepted. */
  requiredProfileFields: Record<ClubProfileFormField, boolean>;
}

/** 400 listing the profile fields school policy requires but the save left empty. */
export class MissingProfileFieldsError extends Error {
  constructor(message: string, readonly missing: ClubProfileFormField[]) {
    super(message);
    this.name = "MissingProfileFieldsError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/clubs${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string; details?: { missing?: ClubProfileFormField[] };
    } | null;
    const message = body?.message ?? `HTTP ${response.status}`;
    if (Array.isArray(body?.details?.missing)) throw new MissingProfileFieldsError(message, body.details.missing);
    throw new Error(message);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

function mutation(method: string, csrfToken: string, body?: object): RequestInit {
  return { method, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}) };
}

export function fetchClubSettings(clubId: string, signal: AbortSignal): Promise<ClubSettings> {
  return request(`/${encodeURIComponent(clubId)}/settings`, { signal });
}

export function saveClubProfile(clubId: string, input: ClubProfileInput,
  csrfToken: string): Promise<ClubProfile> {
  return request(`/${encodeURIComponent(clubId)}/profile`, mutation("PATCH", csrfToken, input));
}

export function applyDepartmentTemplate(clubId: string,
  csrfToken: string): Promise<ClubDepartment[]> {
  return request(`/${encodeURIComponent(clubId)}/departments/template`, mutation("POST", csrfToken));
}

export function createDepartment(clubId: string, input: ClubDepartmentInput,
  csrfToken: string): Promise<ClubDepartment> {
  return request(`/${encodeURIComponent(clubId)}/departments`, mutation("POST", csrfToken, input));
}

export function updateDepartment(clubId: string, departmentId: string,
  input: ClubDepartmentInput, csrfToken: string): Promise<ClubDepartment> {
  return request(`/${encodeURIComponent(clubId)}/departments/${encodeURIComponent(departmentId)}`,
    mutation("PATCH", csrfToken, input));
}

export function deactivateDepartment(clubId: string, departmentId: string,
  csrfToken: string): Promise<ClubDepartment> {
  return request(`/${encodeURIComponent(clubId)}/departments/${encodeURIComponent(departmentId)}`,
    mutation("DELETE", csrfToken));
}
