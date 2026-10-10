export interface ClubRoleDefinition {
  code: string;
  name: string;
  unit?: string;
  isBoardSeat: boolean;
  isLeaderRole: boolean;
  isDefaultMemberRole: boolean;
  isSingleHolder: boolean;
  permissionCodes: string[];
}

export interface ClubRoleHolder {
  assignmentId: string;
  membershipId: string;
  displayName: string;
  email: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface ClubRole extends ClubRoleDefinition {
  id: string;
  isActive: boolean;
  holders: ClubRoleHolder[];
}

export interface ClubRoleStructureVersion {
  id: string;
  versionNo: number;
  effectiveFrom: string;
  source: string;
  reason?: string;
  createdBy: string;
  createdAt: string;
  roles: Array<ClubRoleDefinition & { positionId: string }>;
}

export interface ClubRoleOverview {
  clubId: string;
  clubState: string;
  activeTermId: string | null;
  roles: ClubRole[];
  members: Array<{ membershipId: string; displayName: string; email: string; state: string }>;
  departments: string[];
  versions: ClubRoleStructureVersion[];
  grantablePermissions: string[];
}

export interface ClubRoleInput {
  name: string;
  unit?: string;
  isSingleHolder: boolean;
  permissionCodes: string[];
  reason?: string;
}

export interface ClubRoleAssignmentInput {
  membershipId: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

async function request(path: string, init?: RequestInit): Promise<ClubRoleOverview> {
  const response = await fetch(`/api/v1/clubs${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: ClubRoleOverview } = await response.json();
  return body.data;
}

function mutation(method: string, csrfToken: string, body?: object): RequestInit {
  return { method, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}) };
}

function rolePath(clubId: string, roleId?: string): string {
  return `/${encodeURIComponent(clubId)}/roles${roleId ? `/${encodeURIComponent(roleId)}` : ""}`;
}

export function fetchClubRoles(clubId: string, signal: AbortSignal): Promise<ClubRoleOverview> {
  return request(rolePath(clubId), { signal });
}

export function createClubRole(clubId: string, input: ClubRoleInput, csrfToken: string): Promise<ClubRoleOverview> {
  return request(rolePath(clubId), mutation("POST", csrfToken, input));
}

export function updateClubRole(clubId: string, roleId: string, input: ClubRoleInput,
  csrfToken: string): Promise<ClubRoleOverview> {
  return request(rolePath(clubId, roleId), mutation("PATCH", csrfToken, input));
}

export function deactivateClubRole(clubId: string, roleId: string, csrfToken: string): Promise<ClubRoleOverview> {
  return request(rolePath(clubId, roleId), mutation("DELETE", csrfToken));
}

export function assignClubRole(clubId: string, roleId: string, input: ClubRoleAssignmentInput,
  csrfToken: string): Promise<ClubRoleOverview> {
  return request(`${rolePath(clubId, roleId)}/assignments`, mutation("POST", csrfToken, input));
}

export function revokeClubRole(clubId: string, roleId: string, assignmentId: string,
  csrfToken: string): Promise<ClubRoleOverview> {
  return request(`${rolePath(clubId, roleId)}/assignments/${encodeURIComponent(assignmentId)}`,
    mutation("DELETE", csrfToken));
}
