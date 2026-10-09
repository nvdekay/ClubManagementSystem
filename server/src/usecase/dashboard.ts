import { z } from "zod";
import { resolveClubPermissions, type ClubAccessRepository } from "../domain/access.js";
import type { AuthRepository, AuthUser } from "../domain/auth.js";
import type { DashboardRepository, DashboardSnapshot } from "../domain/dashboard.js";
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
