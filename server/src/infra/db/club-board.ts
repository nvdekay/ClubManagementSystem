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

export type ClubObligationCode = "overdueSettlement" | "overdueRefund" | "overdueReport";

/** Overdue duties ICPDP weighs before granting a club anything new (UC26 FR-05, UC46 FR-02). */
export async function clubObligations(clubId: Types.ObjectId, now: Date): Promise<ClubObligationCode[]> {
  const m = ucmsModels;
  const [settlement, refund, report] = await Promise.all([
    m.eventBudgets!.exists({ clubId, settlementDueAt: { $lt: now }, settlementSubmittedAt: { $exists: false },
      state: { $nin: ["Cancelled", "Closed"] } }),
    m.eventBudgets!.exists({ clubId, recoveryDueAt: { $lt: now }, state: "Recovery Pending" }),
    m.periodicReports!.exists({ clubId, dueAt: { $lt: now }, state: { $in: ["Draft", "Returned for correction"] } }),
  ]);
  return [...(settlement ? ["overdueSettlement" as const] : []), ...(refund ? ["overdueRefund" as const] : []),
    ...(report ? ["overdueReport" as const] : [])];
}
