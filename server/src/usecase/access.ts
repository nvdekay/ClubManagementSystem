import { z } from "zod";
import {
  requireClubPermission,
  resolveClubPermissions,
  type ClubAccessRepository,
  type ClubPermission,
} from "../domain/access.js";
import { DomainError } from "../domain/errors.js";

const mongoId = z.string().regex(/^[0-9a-f]{24}$/i);

export interface AccessActor {
  id: string;
  accountState: "Active" | "Locked";
  lockReason?: string | null;
}

export async function assertClubAccess(
  repo: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  permission: ClubPermission,
  now: Date = new Date(),
): Promise<void> {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") {
    throw new DomainError(actor.lockReason || "account locked", "locked");
  }
  const userIdResult = mongoId.safeParse(actor.id);
  const clubIdResult = mongoId.safeParse(clubId);
  if (!userIdResult.success || !clubIdResult.success) {
    throw new DomainError("invalid identifier", "validation");
  }
  const snapshot = await repo.findSnapshot(userIdResult.data, clubIdResult.data);
  if (!snapshot) throw new DomainError("club access denied", "forbidden");
  requireClubPermission(snapshot, permission, now);
}

/** Current members may inspect settings; approved founders retain setup access. */
export async function assertClubSettingsRead(repo: ClubAccessRepository, actor: AccessActor | null,
  clubId: string, now = new Date()) {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") throw new DomainError(actor.lockReason || "account locked", "locked");
  if (!mongoId.safeParse(actor.id).success || !mongoId.safeParse(clubId).success) {
    throw new DomainError("invalid identifier", "validation");
  }
  const snapshot = await repo.findSnapshot(actor.id, clubId);
  if (!snapshot || snapshot.clubId !== clubId) throw new DomainError("club access denied", "forbidden");
  const member = snapshot.membership;
  if (!(member?.clubId === clubId && ["Active", "Inactive"].includes(member.state))
    && !resolveClubPermissions(snapshot, now).includes("club.profile.manage")) {
    throw new DomainError("club access denied", "forbidden");
  }
  return snapshot;
}
