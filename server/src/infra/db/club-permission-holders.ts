import { Types, type ClientSession } from "mongoose";
import { resolveClubPermissions, type ClubAccessSnapshot, type ClubPermission } from "../../domain/access.js";
import { ucmsModels as m } from "./ucms-models.js";

/** User ids of the club's Active members who hold `permission` right now — the same rule as every access check. */
export async function clubUserIdsWithPermission(clubId: Types.ObjectId, permission: ClubPermission, now: Date,
  session?: ClientSession): Promise<Types.ObjectId[]> {
  const [club, memberships, terms, positions] = await Promise.all([
    m.clubs!.findById(clubId).select({ name: 1, state: 1 }).session(session ?? null).lean(),
    m.clubMemberships!.find({ clubId, state: "Active" }).session(session ?? null).lean(),
    m.clubTerms!.find({ clubId, state: "Active" }).session(session ?? null).lean(),
    m.clubPositions!.find({ clubId, isActive: true }).session(session ?? null).lean(),
  ]);
  if (!club || !memberships.length) return [];
  const assignments = await m.clubPositionAssignments!.find({ clubId, membershipId: { $in: memberships.map((row) => row._id) } })
    .session(session ?? null).lean();
  const base = { clubId: String(clubId), clubName: String(club.name), clubState: String(club.state), isApprovedFounder: false,
    terms: terms.map((t) => ({ id: String(t._id), clubId: String(clubId), state: String(t.state), startAt: t.startAt as Date, endAt: t.endAt as Date })),
    positions: positions.map((p) => ({ id: String(p._id), clubId: String(clubId), code: String(p.code), isActive: true,
      isLeaderRole: p.isLeaderRole === true, isBoardSeat: p.isBoardSeat === true })) };
  return memberships.filter((membership) => {
    const snapshot: ClubAccessSnapshot = { ...base,
      membership: { id: String(membership._id), clubId: String(clubId), state: "Active" },
      assignments: assignments.filter((a) => String(a.membershipId) === String(membership._id)).map((a) => ({
        clubId: String(clubId), termId: String(a.termId), positionId: String(a.positionId), membershipId: String(a.membershipId),
        effectiveFrom: a.effectiveFrom as Date, effectiveTo: (a.effectiveTo as Date | undefined) ?? null,
        confirmedBy: a.confirmedBy ? String(a.confirmedBy) : null })) };
    return resolveClubPermissions(snapshot, now).includes(permission);
  }).map((membership) => membership.userId as Types.ObjectId);
}
