import { Types, type ClientSession } from "mongoose";
import { requireClubPermission, type ClubAccessSnapshot, type ClubPermission } from "../../domain/access.js";
import { DomainError } from "../../domain/errors.js";
import { ucmsModels as m } from "./ucms-models.js";

export async function assertEventWriteAccess(session: ClientSession, clubId: Types.ObjectId, actorId: Types.ObjectId,
  permission: ClubPermission | "ATTENDANCE_UNLOCK", now: Date): Promise<void> {
  // These writes serialize against lifecycle, account locking, role edits and membership changes.
  const user = await m.users!.findOneAndUpdate({ _id: actorId, accountState: "Active" }, { $inc: { __v: 1 } }, { session }).lean();
  if (!user) throw new DomainError("account is not active", "locked");
  const club = await m.clubs!.findOneAndUpdate({ _id: clubId }, { $inc: { __v: 1 } }, { session }).lean();
  if (!club) throw new DomainError("club not found", "not_found");
  if (permission === "ATTENDANCE_UNLOCK") {
    const roles = await m.roles!.find({ code: permission, scope: "system" }).session(session).lean();
    const assignment = await m.userRoleAssignments!.findOneAndUpdate({ userId: actorId,
      roleId: { $in: roles.map((r) => r._id) }, revokedAt: null }, { $inc: { __v: 1 } }, { session }).lean();
    if (!assignment) throw new DomainError("attendance unlock role required", "forbidden");
    return;
  }
  const membership = await m.clubMemberships!.findOneAndUpdate({ clubId, userId: actorId, state: "Active" },
    { $inc: { __v: 1 } }, { session }).lean();
  if (!membership) throw new DomainError("active club membership required", "forbidden");
  const terms = await m.clubTerms!.find({ clubId, state: "Active", startAt: { $lte: now }, endAt: { $gt: now } }).session(session).lean();
  const positions = await m.clubPositions!.find({ clubId, isActive: true }).session(session).lean();
  const assignments = await m.clubPositionAssignments!.find({ clubId, membershipId: membership._id }).session(session).lean();
  const snapshot: ClubAccessSnapshot = { clubId: String(clubId), clubName: String(club.name), clubState: String(club.state),
    membership: { id: String(membership._id), clubId: String(clubId), state: String(membership.state) },
    terms: terms.map((t) => ({ id: String(t._id), clubId: String(clubId), state: String(t.state), startAt: t.startAt as Date, endAt: t.endAt as Date })),
    positions: positions.map((p) => ({ id: String(p._id), clubId: String(clubId), isActive: p.isActive === true,
      isLeaderRole: p.isLeaderRole === true, isBoardSeat: p.isBoardSeat === true })),
    assignments: assignments.map((a) => ({ clubId: String(clubId), membershipId: String(a.membershipId), termId: String(a.termId),
      positionId: String(a.positionId), effectiveFrom: a.effectiveFrom as Date, effectiveTo: a.effectiveTo as Date | undefined,
      confirmedBy: a.confirmedBy ? String(a.confirmedBy) : undefined })), isApprovedFounder: false };
  requireClubPermission(snapshot, permission, now);
  // Lock the rows used to grant access so a revoke forces a transaction retry.
  await m.clubPositions!.updateMany({ _id: { $in: positions.map((p) => p._id) } }, { $inc: { __v: 1 } }, { session });
  await m.clubPositionAssignments!.updateMany({ _id: { $in: assignments.map((a) => a._id) } }, { $inc: { __v: 1 } }, { session });
  await m.clubTerms!.updateMany({ _id: { $in: terms.map((t) => t._id) } }, { $inc: { __v: 1 } }, { session });
}
