import { z } from "zod";
import { requireClubPermission, resolveClubPermissions, type ClubAccessRepository } from "../domain/access.js";
import type { AuthRepository, AuthUser } from "../domain/auth.js";
import type {
  ClubBoardHistory, DashboardRepository, DashboardSnapshot, InternalEventDetail, InternalEventFilter, InternalEventList,
} from "../domain/dashboard.js";
import { DomainError } from "../domain/errors.js";

const mongoId = z.string().regex(/^[0-9a-f]{24}$/i);

export type DashboardContext =
  | { workspace: "student" }
  | { workspace: "icpdp" }
  | { workspace: "club"; clubId: string };

function assertActor(actor: AuthUser | null): asserts actor is AuthUser {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") {
    throw new DomainError(actor.lockReason || "account locked", "locked");
  }
}

export async function getDashboard(
  repo: DashboardRepository,
  authRepo: AuthRepository,
  accessRepo: ClubAccessRepository,
  actor: AuthUser | null,
  context: DashboardContext,
  now: Date = new Date(),
): Promise<DashboardSnapshot> {
  assertActor(actor);
  if (context.workspace === "student") return repo.student(actor.id, now);
  if (context.workspace === "icpdp") {
    const roles = await authRepo.systemRoleCodes(actor.id);
    if (!roles.includes("ICPDP_OFFICER")) {
      throw new DomainError("ICPDP role required", "forbidden");
    }
    return repo.icpdp(now);
  }
  if (!mongoId.safeParse(context.clubId).success) {
    throw new DomainError("invalid club identifier", "validation");
  }
  const snapshot = await accessRepo.findSnapshot(actor.id, context.clubId);
  const activeMember = snapshot?.clubId === context.clubId
    && snapshot.membership?.clubId === context.clubId && snapshot.membership.state === "Active";
  const pendingFounder = snapshot?.clubId === context.clubId
    && snapshot.clubState === "Pending Setup" && snapshot.isApprovedFounder;
  if (!snapshot || (!activeMember && !pendingFounder)) {
    throw new DomainError("club access denied", "forbidden");
  }
  return repo.club(context.clubId, resolveClubPermissions(snapshot, now), now);
}

async function isOfficer(authRepo: Pick<AuthRepository, "systemRoleCodes">, actor: AuthUser): Promise<boolean> {
  return (await authRepo.systemRoleCodes(actor.id)).includes("ICPDP_OFFICER");
}

async function assertOfficer(authRepo: Pick<AuthRepository, "systemRoleCodes">, actor: AuthUser | null): Promise<void> {
  assertActor(actor);
  if (!(await isOfficer(authRepo, actor))) throw new DomainError("ICPDP role required", "forbidden");
}

/** FR-UC02-02, BR53: ICPDP's list of recorded internal events, filtered by club and semester. */
export async function listInternalEvents(repo: DashboardRepository, authRepo: Pick<AuthRepository, "systemRoleCodes">,
  actor: AuthUser | null, filter: InternalEventFilter): Promise<InternalEventList> {
  await assertOfficer(authRepo, actor);
  if (filter.clubId && !mongoId.safeParse(filter.clubId).success) {
    throw new DomainError("invalid club identifier", "validation", { field: "clubId" });
  }
  return repo.internalEvents(filter);
}

/** FR-UC02-02: one internal event with its attendance, read-only. */
export async function getInternalEvent(repo: DashboardRepository, authRepo: Pick<AuthRepository, "systemRoleCodes">,
  actor: AuthUser | null, eventId: string): Promise<InternalEventDetail> {
  await assertOfficer(authRepo, actor);
  if (!mongoId.safeParse(eventId).success) throw new DomainError("invalid event identifier", "validation");
  const event = await repo.internalEvent(eventId);
  if (!event) throw new DomainError("internal event not found", "not_found");
  return event;
}

/**
 * BR56: the club's structure versions and board by term, for ICPDP on any club (FR-UC02-02) and
 * for the club's own Club Leader (FR-UC02-03), the only role holding club.board.nominate.
 */
export async function getClubBoardHistory(repo: DashboardRepository, authRepo: Pick<AuthRepository, "systemRoleCodes">,
  accessRepo: ClubAccessRepository, actor: AuthUser | null, clubId: string, now: Date = new Date()): Promise<ClubBoardHistory> {
  assertActor(actor);
  if (!mongoId.safeParse(clubId).success) throw new DomainError("invalid club identifier", "validation");
  if (!(await isOfficer(authRepo, actor))) {
    const snapshot = await accessRepo.findSnapshot(actor.id, clubId);
    if (!snapshot || snapshot.clubId !== clubId) throw new DomainError("club access denied", "forbidden");
    requireClubPermission(snapshot, "club.board.nominate", now);
  }
  const history = await repo.boardHistory(clubId);
  if (!history) throw new DomainError("club not found", "not_found");
  return history;
}
