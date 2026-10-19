import { Types, type ClientSession } from "mongoose";
import { notificationChannels } from "../../domain/notification.js";
import { ucmsModels } from "./ucms-models.js";

/** User ids currently holding the leader role or a board seat of the club — who ICPDP notifies. */
export async function clubBoardUserIds(clubId: Types.ObjectId, session?: ClientSession): Promise<Types.ObjectId[]> {
  const m = ucmsModels;
  const positionIds = await m.clubPositions!.find({ clubId, isActive: true,
    $or: [{ isBoardSeat: true }, { isLeaderRole: true }] }).session(session ?? null).distinct("_id");
  if (!positionIds.length) return [];
  const membershipIds = await m.clubPositionAssignments!.find({ clubId, positionId: { $in: positionIds },
    effectiveTo: null }).session(session ?? null).distinct("membershipId");
  if (!membershipIds.length) return [];
  const userIds = await m.clubMemberships!.find({ _id: { $in: membershipIds }, state: "Active" })
    .session(session ?? null).distinct("userId");
  return userIds.map((userId) => new Types.ObjectId(String(userId)));
}

/** Queues one notification per distinct recipient inside the caller's transaction (email too for SRS §8.2 events). */
export async function queueNotifications(session: ClientSession, recipients: readonly unknown[], eventCode: string,
  entityType: string, entityId: Types.ObjectId, payload: Record<string, unknown>, now: Date): Promise<void> {
  const unique = [...new Set(recipients.filter(Boolean).map(String))];
  if (!unique.length) return;
  await ucmsModels.notifications!.insertMany(unique.map((userId) => ({ recipientUserId: new Types.ObjectId(userId),
    eventCode, entityType, entityId, channels: notificationChannels(eventCode), payload, state: "Queued", dueAt: now, attempts: 0,
    createdAt: now })), { session });
}

/**
 * BR06: the users behind these memberships who already hold the leader role of another club in a
 * term overlapping [startAt, endAt). The club's own outgoing term is ignored, so a re-elected
 * leader stays eligible.
 */
export async function otherClubLeaderUserIds(session: ClientSession, clubId: Types.ObjectId,
  membershipIds: readonly Types.ObjectId[], startAt: Date, endAt: Date): Promise<Set<string>> {
  const m = ucmsModels;
  if (!membershipIds.length) return new Set();
  const userIds = await m.clubMemberships!.find({ _id: { $in: membershipIds } }).session(session).distinct("userId");
  const termIds = await m.clubTerms!.find({ clubId: { $ne: clubId }, state: { $in: ["Active", "Planned"] },
    startAt: { $lt: endAt }, endAt: { $gt: startAt } }).session(session).distinct("_id");
  if (!userIds.length || !termIds.length) return new Set();
  const leaderPositionIds = await m.clubPositions!.find({ clubId: { $ne: clubId }, isLeaderRole: true, isActive: true })
    .session(session).distinct("_id");
  const heldBy = await m.clubPositionAssignments!.find({ termId: { $in: termIds }, positionId: { $in: leaderPositionIds },
    effectiveTo: null }).session(session).distinct("membershipId");
  if (!heldBy.length) return new Set();
  const users = await m.clubMemberships!.find({ _id: { $in: heldBy }, userId: { $in: userIds } }).session(session).distinct("userId");
  return new Set(users.map(String));
}
