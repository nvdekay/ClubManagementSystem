import { GRANTABLE_CLUB_PERMISSIONS, LEADER_ONLY_CLUB_PERMISSIONS } from "./access.js";
import { DomainError } from "./errors.js";

/** The shape of one role, as stored on `clubPositions` and snapshotted into each structure version. */
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
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface ClubRole extends ClubRoleDefinition {
  id: string;
  isActive: boolean;
  /** Assignments in the current term that have not ended (includes future-dated ones). */
  holders: ClubRoleHolder[];
}

export interface ClubRoleCandidate {
  membershipId: string;
  displayName: string;
  email: string;
  state: string;
}

export interface ClubRoleStructureVersion {
  id: string;
  versionNo: number;
  effectiveFrom: Date;
  source: string;
  reason?: string;
  createdBy: string;
  createdAt: Date;
  roles: Array<ClubRoleDefinition & { positionId: string }>;
}

export interface ClubRoleOverview {
  clubId: string;
  clubState: string;
  activeTermId: string | null;
  roles: ClubRole[];
  /** Memberships of the club (any state) so the rules can tell "not Active" from "not a member". */
  members: ClubRoleCandidate[];
  /** Names of active departments (UC09) a role may belong to. */
  departments: string[];
  versions: ClubRoleStructureVersion[];
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
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface ClubRoleRepository {
  overview(clubId: string, now: Date): Promise<ClubRoleOverview | null>;
  /** Each structural write appends a new `clubRoleStructureVersions` document in the same transaction. */
  createRole(clubId: string, actorId: string, input: ClubRoleInput, now: Date): Promise<void>;
  updateRole(clubId: string, roleId: string, actorId: string, input: ClubRoleInput, now: Date): Promise<void>;
  deactivateRole(clubId: string, roleId: string, actorId: string, now: Date): Promise<void>;
  assign(clubId: string, roleId: string, termId: string, actorId: string,
    input: ClubRoleAssignmentInput, now: Date): Promise<void>;
  revoke(clubId: string, roleId: string, assignmentId: string, actorId: string, now: Date): Promise<void>;
}

function conflict(message: string): never {
  throw new DomainError(message, "conflict");
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("vi-VN") === b.trim().toLocaleLowerCase("vi-VN");
}

/** Trims and checks a role, and keeps only catalogued grantable permissions (E3, BR55). */
export function normalizeClubRoleInput(input: ClubRoleInput, departments: readonly string[]): ClubRoleInput {
  const name = input.name.trim();
  const unit = input.unit?.trim() || undefined;
  const reason = input.reason?.trim() || undefined;
  if (!name || name.length > 120 || (reason && reason.length > 500)) {
    throw new DomainError("invalid club role", "validation");
  }
  if (unit && !departments.some((department) => sameName(department, unit))) {
    throw new DomainError("role unit must be an active club department", "validation");
  }
  const leaderOnly = input.permissionCodes.filter((code) =>
    LEADER_ONLY_CLUB_PERMISSIONS.some((permission) => permission === code));
  if (leaderOnly.length) {
    throw new DomainError("leader-only permissions cannot be granted", "validation", { permissions: leaderOnly });
  }
  const unknown = input.permissionCodes.filter((code) =>
    !GRANTABLE_CLUB_PERMISSIONS.some((permission) => permission === code));
  if (unknown.length) {
    throw new DomainError("unknown club permissions", "validation", { permissions: unknown });
  }
  return {
    name, unit, isSingleHolder: input.isSingleHolder, reason,
    permissionCodes: GRANTABLE_CLUB_PERMISSIONS.filter((code) => input.permissionCodes.includes(code)),
  };
}

export function findClubRole(overview: ClubRoleOverview, roleId: string): ClubRole {
  const role = overview.roles.find((item) => item.id === roleId && item.isActive);
  if (!role) throw new DomainError("club role not found", "not_found");
  return role;
}

export function assertClubRoleNameFree(overview: ClubRoleOverview, name: string, exceptRoleId?: string): void {
  if (overview.roles.some((role) => role.isActive && role.id !== exceptRoleId && sameName(role.name, name))) {
    conflict("club role name already exists");
  }
}

export function assertClubRoleUpdatable(role: ClubRole, input: ClubRoleInput): void {
  if (role.isLeaderRole) conflict("the club leader role is fixed"); // E7
  if (role.isDefaultMemberRole && role.isSingleHolder !== input.isSingleHolder) {
    conflict("the members role is held by every member"); // E7
  }
  if (role.isBoardSeat && role.isSingleHolder !== input.isSingleHolder) {
    conflict("board roles change only through a leadership transition"); // E6
  }
  if (input.isSingleHolder && role.holders.length > 1) {
    conflict("role has several holders; revoke them before making it single-holder"); // E2
  }
}

export function assertClubRoleDeactivatable(role: ClubRole): void {
  if (role.isLeaderRole || role.isDefaultMemberRole) conflict("leader and members roles cannot be removed"); // E7
  if (role.isBoardSeat) conflict("board roles change only through a leadership transition"); // E6
  if (role.holders.length) conflict("role still has holders; revoke them first"); // E4
}

/** Board seats, the leader role and the default members role are never held through UC23. */
export function assertClubRoleHoldersManaged(role: ClubRole): void {
  if (role.isDefaultMemberRole) conflict("the members role is assigned automatically"); // E7
  if (role.isLeaderRole || role.isBoardSeat) conflict("board role holders come from board nomination"); // A4, E6
}

export function assertClubRoleAssignable(overview: ClubRoleOverview, role: ClubRole,
  input: ClubRoleAssignmentInput): void {
  assertClubRoleHoldersManaged(role);
  const member = overview.members.find((item) => item.membershipId === input.membershipId);
  if (member?.state !== "Active") conflict("only Active members can hold a club role"); // E1
  if (role.holders.some((holder) => holder.membershipId === input.membershipId)) {
    conflict("member already holds this role");
  }
  if (role.isSingleHolder && role.holders.length) conflict("role already has a holder; revoke it first"); // E2
  if (input.effectiveTo && input.effectiveTo <= input.effectiveFrom) {
    throw new DomainError("role assignment must end after it starts", "validation");
  }
}
