import { z } from "zod";
import {
  requireClubPermission,
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
