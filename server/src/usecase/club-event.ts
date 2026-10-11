import { resolveClubPermissions } from "../domain/access.js";
import type { ClubAccessRepository } from "../domain/access.js";
import type { AuthRepository } from "../domain/auth.js";
import { eventActionPermission, type ClubEventAction, type ClubEventInput, type ClubEventRepository } from "../domain/club-event.js";
import { DomainError } from "../domain/errors.js";
import { assertClubAccess, type AccessActor } from "./access.js";

export interface ClubEventDeps {
  repo: ClubEventRepository; access: ClubAccessRepository; auth: Pick<AuthRepository, "systemRoleCodes">;
}
export function clubEventId(value: string): string {
  if (!/^[0-9a-f]{24}$/i.test(value)) throw new DomainError("invalid event or club id", "validation");
  return value;
}
export async function listClubEvents(deps: ClubEventDeps, actor: AccessActor | null, clubId: string, now: Date) {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") throw new DomainError("account locked", "locked");
  const snapshot = await deps.access.findSnapshot(clubEventId(actor.id), clubEventId(clubId));
  const permissions = snapshot ? resolveClubPermissions(snapshot, now) : [];
  if (!["club.event.manage", "club.attendance.manage", "club.feedback.view"].some((p) => permissions.includes(p as typeof permissions[number]))) {
    throw new DomainError("club access denied", "forbidden");
  }
  const events = await deps.repo.list(clubId);
  return permissions.includes("club.event.manage") ? events : events.map((event) => ({ ...event,
    objective: "", plan: "", budgetLines: [], bookingIds: [], registrationForm: [], riskNote: undefined,
    checkInCode: permissions.includes("club.attendance.manage") ? event.checkInCode : undefined }));
}
export async function getClubEvent(deps: ClubEventDeps, actor: AccessActor | null, clubId: string, id: string, now: Date) {
  await assertClubAccess(deps.access, actor, clubId, "club.event.manage", now);
  const found = await deps.repo.find(clubEventId(clubId), clubEventId(id));
  if (!found) throw new DomainError("event not found", "not_found");
  return found;
}
export async function createClubEvent(deps: ClubEventDeps, actor: AccessActor | null, clubId: string, input: ClubEventInput, now: Date) {
  await assertClubAccess(deps.access, actor, clubId, "club.event.manage", now);
  return deps.repo.create(clubEventId(clubId), input, actor!.id, now);
}
export async function actOnClubEvent(deps: ClubEventDeps, actor: AccessActor | null, clubId: string,
  id: string, action: ClubEventAction, now: Date) {
  if (action.kind === "unlock") {
    if (!actor) throw new DomainError("authentication required", "unauthorized");
    if (actor.accountState === "Locked") throw new DomainError("account locked", "locked");
    if (!(await deps.auth.systemRoleCodes(clubEventId(actor.id))).includes("ATTENDANCE_UNLOCK")) {
      throw new DomainError("attendance unlock role required", "forbidden");
    }
  } else await assertClubAccess(deps.access, actor, clubId, eventActionPermission(action), now);
  const detail = await deps.repo.act(clubEventId(clubId), clubEventId(id), action, actor!.id, now);
  return eventActionPermission(action) === "club.event.manage" ? detail : { ...detail,
    event: { ...detail.event, objective: "", plan: "", budgetLines: [], bookingIds: [], registrationForm: [] },
    versions: [], decisions: [], bookings: [], budget: undefined };

}
export async function clubEventParticipants(deps: ClubEventDeps, actor: AccessActor | null, clubId: string, id: string, now: Date) {
  await assertClubAccess(deps.access, actor, clubId, "club.attendance.manage", now);
  return deps.repo.participants(clubEventId(clubId), clubEventId(id));
}
export async function clubEventFeedback(deps: ClubEventDeps, actor: AccessActor | null, clubId: string, ids: string[], now: Date) {
  await assertClubAccess(deps.access, actor, clubId, "club.feedback.view", now);
  if (!ids.length || ids.length > 20) throw new DomainError("choose between one and twenty events", "validation");
  return deps.repo.feedback(clubEventId(clubId), [...new Set(ids.map(clubEventId))], now);
}

export async function clubEventOptions(deps: ClubEventDeps, actor: AccessActor | null, clubId: string, now: Date) {
  await assertClubAccess(deps.access, actor, clubId, "club.event.manage", now);
  return deps.repo.options(clubEventId(clubId));
}
