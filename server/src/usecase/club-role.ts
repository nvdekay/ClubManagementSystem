import { GRANTABLE_CLUB_PERMISSIONS, resolveClubPermissions, type ClubAccessRepository } from "../domain/access.js";
import {
  assertClubRoleAssignable,
  assertClubRoleDeactivatable,
  assertClubRoleHoldersManaged,
  assertClubRoleNameFree,
  assertClubRoleUpdatable,
  findClubRole,
  normalizeClubRoleInput,
  type ClubRoleInput,
  type ClubRoleOverview,
  type ClubRoleRepository,
} from "../domain/club-role.js";
import { DomainError } from "../domain/errors.js";
import { assertClubSettingsRead, assertClubAccess, type AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;
const editableClubStates = new Set(["Active", "Pending Setup"]);

export interface ClubRoleAssignmentRequest {
  membershipId: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

function id(value: string, label: string): string {
  if (!objectId.test(value)) throw new DomainError(`invalid ${label}`, "validation");
  return value;
}

async function load(repo: ClubRoleRepository, access: ClubAccessRepository, actor: AccessActor | null,
  clubId: string, now: Date) {
  await assertClubAccess(access, actor, id(clubId, "club id"), "club.role.manage", now); // E5
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  const overview = await repo.overview(clubId, now);
  if (!overview) throw new DomainError("club not found", "not_found");
  return { actorId: actor.id, overview };
}

async function loadForChange(repo: ClubRoleRepository, access: ClubAccessRepository,
  actor: AccessActor | null, clubId: string, now: Date) {
  const loaded = await load(repo, access, actor, clubId, now);
  if (!editableClubStates.has(loaded.overview.clubState)) {
    throw new DomainError("club roles can change only while the club is Active or Pending Setup", "conflict");
  }
  return loaded;
}

async function result(repo: ClubRoleRepository, clubId: string, now: Date) {
  const overview = await repo.overview(clubId, now);
  if (!overview) throw new DomainError("club not found", "not_found");
  return withCatalog(overview);
}

function withCatalog(overview: ClubRoleOverview) {
  return { ...overview, grantablePermissions: [...GRANTABLE_CLUB_PERMISSIONS] };
}

export async function getClubRoles(repo: ClubRoleRepository, access: ClubAccessRepository,
  actor: AccessActor | null, clubId: string, now = new Date()) {
  const snapshot = await assertClubSettingsRead(access, actor, id(clubId, "club id"), now);
  const overview = await repo.overview(clubId, now);
  if (!overview) throw new DomainError("club not found", "not_found");
  if (resolveClubPermissions(snapshot, now).includes("club.role.manage")) return withCatalog(overview);
  return withCatalog({ ...overview, members: [], versions: [],
    roles: overview.roles.map((role) => ({ ...role, holders: [] })) });
}

export async function createClubRole(repo: ClubRoleRepository, access: ClubAccessRepository,
  actor: AccessActor | null, clubId: string, input: ClubRoleInput, now: Date) {
  const { actorId, overview } = await loadForChange(repo, access, actor, clubId, now);
  const role = normalizeClubRoleInput(input, overview.departments);
  assertClubRoleNameFree(overview, role.name);
  await repo.createRole(clubId, actorId, role, now);
  return result(repo, clubId, now);
}

export async function updateClubRole(repo: ClubRoleRepository, access: ClubAccessRepository,
  actor: AccessActor | null, clubId: string, roleId: string, input: ClubRoleInput, now: Date) {
  const { actorId, overview } = await loadForChange(repo, access, actor, clubId, now);
  const current = findClubRole(overview, id(roleId, "role id"));
  const role = normalizeClubRoleInput(input, overview.departments);
  assertClubRoleUpdatable(current, role);
  assertClubRoleNameFree(overview, role.name, current.id);
  await repo.updateRole(clubId, current.id, actorId, role, now);
  return result(repo, clubId, now);
}

export async function deactivateClubRole(repo: ClubRoleRepository, access: ClubAccessRepository,
  actor: AccessActor | null, clubId: string, roleId: string, now: Date) {
  const { actorId, overview } = await loadForChange(repo, access, actor, clubId, now);
  const role = findClubRole(overview, id(roleId, "role id"));
  assertClubRoleDeactivatable(role);
  await repo.deactivateRole(clubId, role.id, actorId, now);
  return result(repo, clubId, now);
}

export async function assignClubRole(repo: ClubRoleRepository, access: ClubAccessRepository,
  actor: AccessActor | null, clubId: string, roleId: string, input: ClubRoleAssignmentRequest, now: Date) {
  const { actorId, overview } = await loadForChange(repo, access, actor, clubId, now);
  const role = findClubRole(overview, id(roleId, "role id"));
  // A start date already in the past (e.g. "today" from a date picker) means "from now".
  const assignment = { membershipId: id(input.membershipId, "membership id"),
    effectiveFrom: input.effectiveFrom && input.effectiveFrom > now ? input.effectiveFrom : now,
    ...(input.effectiveTo ? { effectiveTo: input.effectiveTo } : {}) };
  assertClubRoleAssignable(overview, role, assignment);
  if (!overview.activeTermId) throw new DomainError("club has no active term to assign roles in", "conflict");
  await repo.assign(clubId, role.id, overview.activeTermId, actorId, assignment, now);
  return result(repo, clubId, now);
}

export async function revokeClubRole(repo: ClubRoleRepository, access: ClubAccessRepository,
  actor: AccessActor | null, clubId: string, roleId: string, assignmentId: string, now: Date) {
  const { actorId, overview } = await loadForChange(repo, access, actor, clubId, now);
  const role = findClubRole(overview, id(roleId, "role id"));
  assertClubRoleHoldersManaged(role);
  if (!role.holders.some((holder) => holder.assignmentId === assignmentId)) {
    throw new DomainError("role assignment not found", "not_found");
  }
  await repo.revoke(clubId, role.id, id(assignmentId, "assignment id"), actorId, now);
  return result(repo, clubId, now);
}
