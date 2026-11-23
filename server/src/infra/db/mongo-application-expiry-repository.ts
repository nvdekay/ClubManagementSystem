import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import type { ApplicationExpiryRepository } from "../../domain/application-expiry.js";
import { queueNotifications } from "./club-board.js";
import { ucmsModels as m } from "./ucms-models.js";
export function mongoApplicationExpiryRepository(): ApplicationExpiryRepository {
  return { async expire(now) {
    const ids = await m.clubApplications!.find({ state: "Revision Requested", revisionDeadlineAt: { $lte: now } }).distinct("_id"); let count = 0;
    for (const id of ids) {
      const changed = await mongoose.connection.transaction(async (session) => {
        const doc = await m.clubApplications!.findOneAndUpdate({ _id: id, state: "Revision Requested", revisionDeadlineAt: { $lte: now } }, { $set: { state: "Expired" } }, { session }).lean();
        if (!doc) return false;
        await m.approvalTasks!.updateMany({ entityType: "CLUB_APPLICATION", entityId: id, state: { $in: ["Open", "Escalated"] } }, { $set: { state: "Closed", closedAt: now } }, { session });
        await m.auditLogs!.create([{ entityType: "ClubApplication", entityId: id, action: "CLUB_APPLICATION_EXPIRED", actorRole: "SYSTEM", before: { state: "Revision Requested" }, after: { state: "Expired", revisionDeadlineAt: doc.revisionDeadlineAt }, correlationId: randomUUID(), at: now }], { session });
        await queueNotifications(session, [doc.founderUserId], "CLUB_APPLICATION_EXPIRED", "ClubApplication", id as Types.ObjectId, { clubName: doc.clubName }, now);
        return true;
      });
      if (changed) count++;
    }
    return count;
  } };
}
