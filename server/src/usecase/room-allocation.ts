import type { ClubAccessRepository } from "../domain/access.js";
import type { AuthRepository } from "../domain/auth.js";
import { DomainError } from "../domain/errors.js";
import type { PolicyRepository } from "../domain/policy.js";
import type { PropertyRepository } from "../domain/property.js";
import { allocationId, allocationReason, planRoomAllocation, validateRoomAllocationInput,
  type RoomAllocation, type RoomAllocationInput, type RoomAllocationOptions, type RoomAllocationRepository } from "../domain/room-allocation.js";
import { assertClubAccess, type AccessActor } from "./access.js";

export interface RoomAllocationDeps {
  repo: RoomAllocationRepository; properties: PropertyRepository; policy: PolicyRepository;
  auth: Pick<AuthRepository, "systemRoleCodes">; access: ClubAccessRepository;
}

async function officer(deps: RoomAllocationDeps, actor: AccessActor | null): Promise<string> {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") throw new DomainError("account locked", "locked");
  if (!(await deps.auth.systemRoleCodes(allocationId(actor.id))).includes("ICPDP_OFFICER")) {
    throw new DomainError("ICPDP officer role required", "forbidden");
  }
  return actor.id;
}
async function effectivePolicy(deps: RoomAllocationDeps, now: Date) {
  const policy = await deps.policy.findEffective(now);
  if (!policy) throw new DomainError("policy is not configured", "unavailable");
  return policy;
}

/** Semesters that have not ended, clubs that may receive rooms, and the active room catalogue. */
export async function roomAllocationOptions(deps: RoomAllocationDeps, actor: AccessActor | null,
  now: Date): Promise<RoomAllocationOptions> {
  await officer(deps, actor);
  const policy = await effectivePolicy(deps, now);
  const [clubs, properties] = await Promise.all([deps.repo.clubs(), deps.properties.list()]);
  return { clubs, rooms: properties.filter((item) => item.type === "ROOM" && item.isActive),
    semesters: policy.academicCalendar.filter((item) => item.endAt > now) };
}

export async function listRoomAllocations(deps: RoomAllocationDeps, actor: AccessActor | null, semesterCode?: string) {
  await officer(deps, actor);
  return deps.repo.list(semesterCode ? { semesterCode } : {});
}

export async function allocateRoom(deps: RoomAllocationDeps, actor: AccessActor | null,
  raw: RoomAllocationInput, now: Date): Promise<RoomAllocation> {
  const officerId = await officer(deps, actor);
  const input = validateRoomAllocationInput(raw);
  const [property, club, policy] = await Promise.all([deps.properties.find(input.propertyId),
    deps.repo.club(input.clubId), effectivePolicy(deps, now)]);
  const plan = planRoomAllocation(input, property, club, policy.academicCalendar, now);
  return deps.repo.allocate(plan, club!.name, policy.conflictThresholdMinutes, officerId, now);
}

export async function revokeRoomAllocation(deps: RoomAllocationDeps, actor: AccessActor | null,
  id: string, reason: string, now: Date): Promise<RoomAllocation> {
  const officerId = await officer(deps, actor);
  return deps.repo.revoke(allocationId(id), allocationReason(reason), officerId, now);
}

/** Read-only club view: active allocations with their remaining usable dates, shown when collecting the key. */
export async function clubRoomAllocations(deps: RoomAllocationDeps, actor: AccessActor | null,
  clubId: string, now: Date): Promise<RoomAllocation[]> {
  await assertClubAccess(deps.access, actor, clubId, "club.booking.manage", now);
  const allocations = await deps.repo.list({ clubId: allocationId(clubId) });
  return allocations.filter((item) => !item.revokedAt).map((item) => ({ ...item,
    occurrences: item.occurrences.filter((occurrence) => occurrence.endAt > now
      && ["Approved", "In Use"].includes(occurrence.state)) }))
    .filter((item) => item.occurrences.length);
}
