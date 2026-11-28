import { Types, type ClientSession } from 'mongoose'
import {
  requireClubPermission,
  resolveClubPermissions,
  type ClubAccessSnapshot,
  type ClubPermission,
} from '../../domain/access.js'
import { DomainError } from '../../domain/errors.js'
import {
  assignmentAccessFrom,
  positionAccessFrom,
  termAccessFrom,
} from './club-permission-holders.js'
import { ucmsModels as m } from './ucms-models.js'
import { found, lockActiveUser, lockIcpdpOfficerRole } from './repo-helpers.js'

// Kiểm tra quyền ghi sự kiện của actor và khóa các dòng cấp quyền
export async function assertEventWriteAccess(
  session: ClientSession,
  clubId: Types.ObjectId,
  actorId: Types.ObjectId,
  permission: ClubPermission | 'ICPDP_OFFICER',
  now: Date,
): Promise<ClubPermission[]> {
  // These writes serialize against lifecycle, account locking, role edits and membership changes.
  await lockActiveUser(session, actorId)
  const club = found(
    await m.clubs!.findOneAndUpdate({ _id: clubId }, { $inc: { __v: 1 } }, { session }).lean(),
    'club not found',
  )
  if (permission === 'ICPDP_OFFICER') {
    await lockIcpdpOfficerRole(session, actorId)
    return []
  }
  const membership = await m
    .clubMemberships!.findOneAndUpdate(
      { clubId, userId: actorId, state: 'Active' },
      { $inc: { __v: 1 } },
      { session },
    )
    .lean()
  if (!membership) {
    throw new DomainError('active club membership required', 'forbidden')
  }
  const terms = await m
    .clubTerms!.find({ clubId, state: 'Active', startAt: { $lte: now }, endAt: { $gt: now } })
    .session(session)
    .lean()
  const positions = await m.clubPositions!.find({ clubId, isActive: true }).session(session).lean()
  const assignments = await m
    .clubPositionAssignments!.find({ clubId, membershipId: membership._id })
    .session(session)
    .lean()
  const snapshot: ClubAccessSnapshot = {
    clubId: String(clubId),
    clubName: String(club.name),
    clubState: String(club.state),
    membership: {
      id: String(membership._id),
      clubId: String(clubId),
      state: String(membership.state),
    },
    terms: terms.map((t) => termAccessFrom(t, clubId)),
    positions: positions.map((p) => positionAccessFrom(p, clubId)),
    assignments: assignments.map((a) => assignmentAccessFrom(a, clubId)),
    isApprovedFounder: false,
  }
  requireClubPermission(snapshot, permission, now)
  // Khoá các dòng dùng để cấp quyền để việc thu hồi quyền buộc transaction phải thử lại.
  await m.clubPositions!.updateMany(
    { _id: { $in: positions.map((p) => p._id) } },
    { $inc: { __v: 1 } },
    { session },
  )
  await m.clubPositionAssignments!.updateMany(
    { _id: { $in: assignments.map((a) => a._id) } },
    { $inc: { __v: 1 } },
    { session },
  )
  await m.clubTerms!.updateMany(
    { _id: { $in: terms.map((t) => t._id) } },
    { $inc: { __v: 1 } },
    { session },
  )
  return resolveClubPermissions(snapshot, now)
}
