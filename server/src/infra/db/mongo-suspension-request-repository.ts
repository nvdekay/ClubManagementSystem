import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import { normalizedSuspensionRequest, type SuspensionImpact, type SuspensionRequest, type SuspensionRequestRepository } from "../../domain/suspension-request.js";
import { assertAccountabilityOfficer, openAccountabilityTask } from "./accountability-workflow.js";
import { assertEventWriteAccess } from "./club-event-access.js";
import { queueNotifications, clubBoardUserIds } from "./club-board.js";
import { mongoClubLifecycleRepository } from "./mongo-club-lifecycle-repository.js";
import { ucmsModels as m } from "./ucms-models.js";
type Doc = Record<string, unknown>;
export function mongoSuspensionRequestRepository(): SuspensionRequestRepository {
  async function mapped(d: Doc): Promise<SuspensionRequest> {
    const club = await m.clubs!.findById(d.clubId).select({ name: 1 }).lean();
    return { id: String(d._id), clubId: String(d.clubId), clubName: String(club?.name ?? ""), reason: String(d.reason),
      until: d.until as Date, obligationsPlan: String(d.obligationsPlan), recoveryPlan: String(d.recoveryPlan), acknowledgedImpactIds: d.acknowledgedImpactIds as string[],
      state: d.state as SuspensionRequest["state"], submittedAt: d.submittedAt as Date, submittedBy: String(d.submittedBy),
      ...(d.decisionReason ? { decisionReason: String(d.decisionReason) } : {}), ...(d.decidedAt ? { decidedAt: d.decidedAt as Date } : {}) };
  }
  async function impacts(clubId: Types.ObjectId, now: Date, session?: ClientSession): Promise<SuspensionImpact[]> {
    const [events, bookings] = await Promise.all([
      m.events!.find({ clubId, state: { $in: ["Approved", "Upcoming"] }, startAt: { $gt: now } }).session(session ?? null).lean(),
      m.propertyBookings!.find({ clubId, state: "Approved", startAt: { $gt: now } }).session(session ?? null).lean(),
    ]);
    return [...events.map((e) => ({ id: `event:${String(e._id)}`, kind: "event" as const, title: String(e.title), startAt: e.startAt as Date })),
      ...bookings.map((b) => ({ id: `booking:${String(b._id)}`, kind: "booking" as const, title: String(b.purpose), startAt: b.startAt as Date }))];
  }
  return {
    async context(clubId, now) {
      const docs = await m.suspensionRequests!.find({ clubId: new Types.ObjectId(clubId) }).sort({ submittedAt: -1 }).lean();
      return { impacts: await impacts(new Types.ObjectId(clubId), now), requests: await Promise.all(docs.map(mapped)) };
    },
    async list() { return Promise.all((await m.suspensionRequests!.find().sort({ submittedAt: -1 }).lean()).map(mapped)); },
    async submit(clubId, raw, userId, now) {
      const input = normalizedSuspensionRequest(raw, now); const id = new Types.ObjectId(); const club = new Types.ObjectId(clubId);
      await mongoose.connection.transaction(async (session) => {
        await assertEventWriteAccess(session, club, new Types.ObjectId(userId), "club.suspension.request", now);
        if (!(await m.clubs!.exists({ _id: club, state: "Active" }).session(session))) throw new DomainError("only active clubs can request suspension", "conflict");
        if (await m.suspensionRequests!.exists({ clubId: club, state: "Pending" }).session(session)) throw new DomainError("a suspension request is already pending", "conflict");
        const actual = (await impacts(club, now, session)).map((i) => i.id).sort();
        if (JSON.stringify(actual) !== JSON.stringify(input.acknowledgedImpactIds)) throw new DomainError("affected events or bookings changed; reload and acknowledge again", "conflict");
        await m.suspensionRequests!.create([{ _id: id, clubId: club, ...input, state: "Pending", submittedBy: new Types.ObjectId(userId), submittedAt: now }], { session });
        await openAccountabilityTask(session, "SUSPENSION_REQUEST", id, club, "Club suspension request", now);
        await m.auditLogs!.create([{ entityType: "SuspensionRequest", entityId: id, action: "SUSPENSION_REQUEST_SUBMITTED", actorId: new Types.ObjectId(userId), actorRole: "Club Leader", after: input, correlationId: randomUUID(), at: now }], { session });
        const roleIds = await m.roles!.find({ code: "ICPDP_OFFICER", scope: "system" }).session(session).distinct("_id");
        const officerIds = await m.userRoleAssignments!.find({ roleId: { $in: roleIds }, revokedAt: null }).session(session).distinct("userId");
        await queueNotifications(session, officerIds, "SUSPENSION_REQUEST_SUBMITTED", "SuspensionRequest", id, { clubId }, now);
      });
      return mapped((await m.suspensionRequests!.findById(id).lean())!);
    },
    async decide(id, outcome, reason, officerId, now) {
      const requestId = new Types.ObjectId(id);
      if (outcome === "Approve") {
        const request = await m.suspensionRequests!.findById(requestId).lean();
        if (!request) throw new DomainError("suspension request not found", "not_found");
        await mongoClubLifecycleRepository().suspend(String(request.clubId), { requestId: id, decisionReason: reason, reason: String(request.reason), until: request.until as Date }, officerId, now);
        return;
      }
      await mongoose.connection.transaction(async (session) => {
        const actorId = new Types.ObjectId(officerId); await assertAccountabilityOfficer(session, actorId);
        const request = await m.suspensionRequests!.findOneAndUpdate({ _id: requestId, state: "Pending" }, { $set: { state: "Rejected", decisionReason: reason, decidedBy: actorId, decidedAt: now } }, { session }).lean();
        if (!request) throw new DomainError("suspension request is no longer pending", "conflict");
        const task = await m.approvalTasks!.findOneAndUpdate({ entityType: "SUSPENSION_REQUEST", entityId: requestId, state: "Open" }, { $set: { state: "Decided", assigneeId: actorId, closedAt: now } }, { session }).lean();
        if (!task) throw new DomainError("suspension review task not found", "conflict");
        await m.approvalDecisions!.create([{ approvalTaskId: task._id, outcome: "Reject", reason, actorId, at: now }], { session });
        await m.auditLogs!.create([{ entityType: "SuspensionRequest", entityId: requestId, action: "SUSPENSION_REQUEST_REJECTED", actorId, actorRole: "ICPDP_OFFICER", reason, correlationId: randomUUID(), at: now }], { session });
        await queueNotifications(session, [request.submittedBy, ...await clubBoardUserIds(request.clubId as Types.ObjectId, session)], "SUSPENSION_REQUEST_REJECTED", "SuspensionRequest", requestId, { reason }, now);
      });
    },
  };
}
