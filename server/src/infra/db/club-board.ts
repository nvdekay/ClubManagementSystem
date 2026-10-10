import { Types, type ClientSession } from "mongoose";
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

/** Queues one in-app notification per distinct recipient inside the caller's transaction. */
export async function queueNotifications(session: ClientSession, recipients: readonly unknown[], eventCode: string,
  entityType: string, entityId: Types.ObjectId, payload: Record<string, unknown>, now: Date): Promise<void> {
  const unique = [...new Set(recipients.filter(Boolean).map(String))];
  if (!unique.length) return;
  await ucmsModels.notifications!.insertMany(unique.map((userId) => ({ recipientUserId: new Types.ObjectId(userId),
    eventCode, entityType, entityId, channels: ["IN_APP"], payload, state: "Queued", dueAt: now, attempts: 0,
    createdAt: now })), { session });
}
