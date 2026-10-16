import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import type { MembershipReconfirmation, MembershipReconfirmationRepository } from "../../domain/membership-reconfirmation.js";
import { queueNotifications } from "./club-board.js";
import { ucmsModels as m } from "./ucms-models.js";
type Doc = Record<string, unknown>;
export function mongoMembershipReconfirmationRepository(): MembershipReconfirmationRepository {
  async function mapped(d: Doc): Promise<MembershipReconfirmation> {
    const club = await m.clubs!.findById(d.clubId).select({ name: 1 }).lean();
    return { id: String(d._id), membershipId: String(d.membershipId), clubName: String(club?.name ?? ""), periodCode: String(d.periodCode),
      dueAt: d.dueAt as Date, state: d.state as MembershipReconfirmation["state"], ...(d.confirmedAt ? { confirmedAt: d.confirmedAt as Date } : {}) };
  }
  async function isLeader(session: ClientSession, member: Doc, now: Date) {
    const terms = await m.clubTerms!.find({ clubId: member.clubId, state: "Active", startAt: { $lte: now }, endAt: { $gt: now } }).session(session).lean();
    const positions = await m.clubPositions!.find({ clubId: member.clubId, isActive: true, $or: [{ isLeaderRole: true }, { isBoardSeat: true }] }).session(session).lean();
    const assignment = await m.clubPositionAssignments!.findOne({ membershipId: member._id, clubId: member.clubId, termId: { $in: terms.map((t) => t._id) },
      positionId: { $in: positions.map((p) => p._id) }, confirmedBy: { $ne: null }, effectiveFrom: { $lte: now }, $or: [{ effectiveTo: null }, { effectiveTo: { $gt: now } }] }).session(session).lean();
    if (assignment) {
      await m.clubTerms!.updateMany({ _id: { $in: terms.map((t) => t._id) } }, { $inc: { __v: 1 } }, { session });
      await m.clubPositions!.updateMany({ _id: { $in: positions.map((p) => p._id) } }, { $inc: { __v: 1 } }, { session });
      await m.clubPositionAssignments!.updateOne({ _id: assignment._id }, { $inc: { __v: 1 } }, { session });
    }
    return Boolean(assignment);
  }
  async function audit(session: ClientSession, member: Doc, action: string, after: unknown, now: Date, actorId?: string) {
    await m.auditLogs!.create([{ entityType: "ClubMembership", entityId: member._id, action,
      ...(actorId ? { actorId: new Types.ObjectId(actorId), actorRole: "Student" } : { actorRole: "SYSTEM" }), after, correlationId: randomUUID(), at: now }], { session });
  }
  /** Exempts a current Leader, otherwise expires the request and makes the membership Inactive. */
  async function close(session: ClientSession, member: Doc, request: Doc, now: Date, changes: { expired: number; exempt: number }) {
    const periodCode = String(request.periodCode);
    if (await isLeader(session, member, now)) {
      await m.membershipReconfirmations!.updateOne({ _id: request._id, state: "Pending" }, { $set: { state: "Exempt" } }, { session });
      changes.exempt = 1;
      await audit(session, member, "MEMBERSHIP_RECONFIRMATION_EXEMPT", { periodCode }, now);
      return;
    }
    await m.membershipReconfirmations!.updateOne({ _id: request._id, state: "Pending" }, { $set: { state: "Expired" } }, { session });
    await m.clubMemberships!.updateOne({ _id: member._id, state: "Active" }, { $set: { state: "Inactive" }, $push: { statusHistory: {
      fromState: "Active", toState: "Inactive", effectiveDate: now, reason: "Semester reconfirmation deadline expired", actorId: null, actorRole: "SYSTEM", at: now } } }, { session });
    await audit(session, member, "MEMBERSHIP_RECONFIRMATION_EXPIRED", { periodCode, fromState: "Active", toState: "Inactive", effectiveDate: now }, now);
    await queueNotifications(session, [member.userId], "MEMBERSHIP_RECONFIRMATION_EXPIRED", "ClubMembership", member._id as Types.ObjectId, { periodCode }, now);
    changes.expired = 1;
  }
  return {
    async listMine(userId) {
      const ids = await m.clubMemberships!.find({ userId: new Types.ObjectId(userId) }).distinct("_id");
      return Promise.all((await m.membershipReconfirmations!.find({ membershipId: { $in: ids } }).sort({ openedAt: -1 }).lean()).map(mapped));
    },
    async confirm(id, userId, now) {
      const requestId = new Types.ObjectId(id);
      await mongoose.connection.transaction(async (session) => {
        const actor = await m.users!.findOneAndUpdate({ _id: new Types.ObjectId(userId), accountState: "Active" }, { $inc: { __v: 1 } }, { session });
        if (!actor) throw new DomainError("account locked", "locked");
        const request = await m.membershipReconfirmations!.findOne({ _id: requestId }).session(session).lean();
        if (!request) throw new DomainError("reconfirmation request not found", "not_found");
        const member = await m.clubMemberships!.findOneAndUpdate({ _id: request.membershipId, userId: new Types.ObjectId(userId), state: "Active" }, { $inc: { __v: 1 } }, { session }).lean();
        if (!member) throw new DomainError("active membership owned by you required", "forbidden");
        const changed = await m.membershipReconfirmations!.updateOne({ _id: requestId, state: "Pending", dueAt: { $gt: now } },
          { $set: { state: "Confirmed", confirmedAt: now, confirmedBy: new Types.ObjectId(userId) } }, { session });
        if (changed.modifiedCount !== 1) throw new DomainError("reconfirmation is closed or past its deadline", "conflict");
        await audit(session, member, "MEMBERSHIP_RECONFIRMED", { periodCode: request.periodCode }, now, userId);
      });
      return mapped((await m.membershipReconfirmations!.findById(requestId).lean())!);
    },
    async run(period, dueAt, now) {
      const result = { opened: 0, expired: 0, exempt: 0 };
      const candidates = await m.clubMemberships!.find({ state: "Active", joinedAt: { $lte: period.startAt } }).lean();
      for (const candidate of candidates) {
        const outcome = await mongoose.connection.transaction(async (session) => {
          const member = await m.clubMemberships!.findOneAndUpdate({ _id: candidate._id, state: "Active" }, { $inc: { __v: 1 } }, { session }).lean();
          if (!member) return { opened: 0, expired: 0, exempt: 0 };
          // The club write serializes a concurrent nomination/transition with the exemption check.
          await m.clubs!.updateOne({ _id: member.clubId }, { $inc: { __v: 1 } }, { session });
          let request: Doc | null = await m.membershipReconfirmations!.findOne({ membershipId: member._id, periodCode: period.code }).session(session).lean();
          const changes = { opened: 0, expired: 0, exempt: 0 };
          if (request && request.state !== "Pending") return changes;
          const exempt = await isLeader(session, member, now);
          if (!request) {
            const docs = await m.membershipReconfirmations!.create([{ membershipId: member._id, clubId: member.clubId, periodCode: period.code, openedAt: now, dueAt, state: exempt ? "Exempt" : "Pending" }], { session });
            request = docs[0]!.toObject(); changes.opened = 1;
            if (!exempt) await queueNotifications(session, [member.userId], "MEMBERSHIP_RECONFIRMATION_REQUIRED", "ClubMembership", member._id as Types.ObjectId, { periodCode: period.code, dueAt }, now);
          }
          if (!request) throw new Error("reconfirmation creation failed");
          if (exempt) {
            if (request.state !== "Exempt") await m.membershipReconfirmations!.updateOne({ _id: request._id }, { $set: { state: "Exempt" } }, { session });
            changes.exempt = 1;
            await audit(session, member, "MEMBERSHIP_RECONFIRMATION_EXEMPT", { periodCode: period.code }, now);
          } else if ((request.dueAt as Date) <= now) {
            await close(session, member, request, now, changes);
          }
          return changes;
        });
        result.opened += outcome.opened; result.expired += outcome.expired; result.exempt += outcome.exempt;
      }
      return result;
    },
    async expireOverdue(now) {
      const result = { expired: 0, exempt: 0 };
      const overdue = await m.membershipReconfirmations!.find({ state: "Pending", dueAt: { $lte: now } }).select({ _id: 1 }).lean();
      for (const { _id } of overdue) {
        const outcome = await mongoose.connection.transaction(async (session) => {
          const changes = { expired: 0, exempt: 0 };
          const request = await m.membershipReconfirmations!.findOne({ _id, state: "Pending", dueAt: { $lte: now } }).session(session).lean();
          if (!request) return changes;
          const member = await m.clubMemberships!.findOneAndUpdate({ _id: request.membershipId, state: "Active" }, { $inc: { __v: 1 } }, { session }).lean();
          if (!member) {
            // The membership already left Active by another path; the request just closes.
            await m.membershipReconfirmations!.updateOne({ _id, state: "Pending" }, { $set: { state: "Expired" } }, { session });
            return changes;
          }
          await m.clubs!.updateOne({ _id: member.clubId }, { $inc: { __v: 1 } }, { session });
          await close(session, member, request, now, changes);
          return changes;
        });
        result.expired += outcome.expired; result.exempt += outcome.exempt;
      }
      return result;
    },
  };
}
