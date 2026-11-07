import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { grantablePermissions, isClubLeaderSeat } from "../../domain/access.js";
import { roleSnapshot } from "./mongo-leadership-transition-repository.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;

/** The codes a stored role may carry under BR55: none for the leader seats and Members, catalogued non-reserved otherwise. */
function cleanCodes(position: Doc): string[] {
  const codes = Array.isArray(position.permissionCodes) ? position.permissionCodes.map(String) : [];
  if (position.isDefaultMemberRole === true || isClubLeaderSeat({ isLeaderRole: position.isLeaderRole === true,
    isBoardSeat: position.isBoardSeat === true, code: String(position.code) })) return [];
  return grantablePermissions(codes);
}

function sameRoles(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function byPosition<T extends { positionId: string }>(items: readonly T[]): T[] {
  return [...items].sort((x, y) => x.positionId.localeCompare(y.positionId));
}

/**
 * Idempotent upgrade for data written while roles carried no permissions (13/10–07/11/2026):
 * drops unknown and leader-reserved codes from roles, clears the leader seats and Members, and
 * appends one MIGRATION structure version (with an audit row) only when the live roles differ
 * from the latest version. It never touches assignments or earlier versions, so a rerun is a no-op.
 */
/** Thrown inside the transaction to roll a club back when its change could not be versioned. */
class NoVersionAuthor extends Error {}

export async function upgradeClubRoles(now: Date = new Date()): Promise<{ clubs: number; roles: number; skippedClubIds: string[] }> {
  let clubs = 0;
  let roles = 0;
  const skippedClubIds: string[] = [];
  const clubIds = await m.clubPositions!.distinct("clubId");
  for (const clubId of clubIds as Types.ObjectId[]) {
    try {
    await mongoose.connection.transaction(async (session) => {
      const positions = await m.clubPositions!.find({ clubId }).session(session).lean();
      let changed = 0;
      for (const position of positions as Doc[]) {
        const clean = cleanCodes(position);
        const current = Array.isArray(position.permissionCodes) ? position.permissionCodes.map(String) : [];
        if (sameRoles(clean, current)) continue;
        await m.clubPositions!.updateOne({ _id: position._id }, { $set: { permissionCodes: clean } }, { session });
        changed += 1;
      }
      const active = await m.clubPositions!.find({ clubId, isActive: true }).session(session).lean();
      const latest = await m.clubRoleStructureVersions!.findOne({ clubId }).sort({ versionNo: -1 }).session(session).lean();
      const snapshot = active.map((doc) => roleSnapshot(doc as Doc));
      const latestRoles = Array.isArray(latest?.roles)
        ? (latest.roles as Doc[]).map((role) => roleSnapshot({ ...role, _id: role.positionId })) : null;
      if (!changed && latestRoles && sameRoles(byPosition(latestRoles), byPosition(snapshot))) return;
      const versionNo = Number(latest?.versionNo ?? 0) + 1;
      // A structure version needs a creator: the author of the previous version, else whoever assigned a seat.
      const systemActor = latest?.createdBy
        ?? (await m.clubPositionAssignments!.findOne({ clubId }).sort({ effectiveFrom: 1 }).session(session).lean())?.assignedBy;
      // Never change roles without the version and audit that explain it: roll this club back instead.
      if (!systemActor) throw new NoVersionAuthor();
      await m.clubRoleStructureVersions!.create([{ clubId, versionNo, effectiveFrom: now, source: "MIGRATION",
        roles: snapshot, createdBy: systemActor, reason: "BR55 permission catalogue clean-up", createdAt: now }], { session });
      await m.auditLogs!.create([{ entityType: "Club", entityId: clubId, action: "CLUB_ROLE_STRUCTURE_MIGRATED",
        actorRole: "SYSTEM", after: { versionNo, changedRoles: changed }, reason: "BR55 permission catalogue clean-up",
        correlationId: randomUUID(), at: now }], { session });
      clubs += 1;
      roles += changed;
    });
    } catch (error) {
      if (!(error instanceof NoVersionAuthor)) throw error;
      skippedClubIds.push(String(clubId));
    }
  }
  return { clubs, roles, skippedClubIds };
}
