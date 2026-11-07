import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import type {
  Complaint,
  ComplaintClubResponse,
  ComplaintEvidence,
  ComplaintForClub,
  ComplaintForIcpdp,
  ComplaintRepository,
  ComplaintState,
  ComplaintTriage,
} from "../../domain/complaint.js";
import { OPEN_COMPLAINT_STATES, UNDECIDED_COMPLAINT_STATES } from "../../domain/complaint.js";
import { DomainError } from "../../domain/errors.js";
import { queueNotifications } from "./club-board.js";
import { clubUserIdsWithPermission } from "./club-permission-holders.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;
const TASK = "COMPLAINT";
const ENTITY = "Complaint";

function oid(value: string | Types.ObjectId): Types.ObjectId {
  return value instanceof Types.ObjectId ? value : new Types.ObjectId(value);
}
function conflict(message: string): never {
  throw new DomainError(message, "conflict");
}
function optionalDate(value: unknown): Date | undefined {
  return value instanceof Date ? value : undefined;
}
function evidenceFrom(value: unknown): ComplaintEvidence[] {
  return Array.isArray(value) ? value.flatMap((item) => item && typeof item === "object"
    && typeof (item as Doc).url === "string" ? [{ label: String((item as Doc).label ?? ""), url: String((item as Doc).url) }] : []) : [];
}
function triageFrom(value: unknown): ComplaintTriage | undefined {
  if (!value || typeof value !== "object") return undefined;
  const doc = value as Doc;
  return { severity: doc.severity as ComplaintTriage["severity"], validity: doc.validity as ComplaintTriage["validity"],
    outcome: doc.outcome as ComplaintTriage["outcome"], reason: String(doc.reason ?? ""), actorId: String(doc.actorId ?? ""),
    at: doc.at as Date };
}
function responseFrom(value: unknown): ComplaintClubResponse | undefined {
  if (!value || typeof value !== "object") return undefined;
  const doc = value as Doc;
  return { text: String(doc.text ?? ""), action: String(doc.action ?? ""), evidence: evidenceFrom(doc.evidence), at: doc.at as Date };
}

export function mongoComplaintRepository(): ComplaintRepository {
  const complaints = m.complaints!;
  const tasks = m.approvalTasks!;
  const audits = m.auditLogs!;

  async function officers(session?: ClientSession): Promise<Types.ObjectId[]> {
    const roles = await m.roles!.find({ code: "ICPDP_OFFICER", scope: "system" }).session(session ?? null).lean();
    const ids = await m.userRoleAssignments!.distinct("userId", { roleId: { $in: roles.map((role) => role._id) }, revokedAt: null })
      .session(session ?? null);
    return ids.map((value) => oid(String(value)));
  }
  async function audit(session: ClientSession, id: Types.ObjectId, action: string, actorId: string | null, actorRole: string,
    before: Doc | null, after: Doc, reason: string | undefined, now: Date) {
    await audits.create([{ entityType: ENTITY, entityId: id, action, ...(actorId ? { actorId: oid(actorId) } : {}), actorRole,
      ...(before ? { before } : {}), after, ...(reason ? { reason } : {}), correlationId: randomUUID(), at: now }], { session });
  }
  async function closeTask(session: ClientSession, ids: Types.ObjectId[], now: Date) {
    await tasks.updateMany({ entityType: TASK, entityId: { $in: ids }, state: "Open" }, { $set: { state: "Closed", closedAt: now } },
      { session });
  }

  /** Names for a page of complaints in three queries. */
  async function base(docs: Doc[]): Promise<Complaint[]> {
    const clubIds = docs.flatMap((doc) => (doc.clubId ? [doc.clubId] : []));
    const eventIds = docs.flatMap((doc) => (doc.eventId ? [doc.eventId] : []));
    const [clubDocs, eventDocs] = await Promise.all([
      clubIds.length ? m.clubs!.find({ _id: { $in: clubIds } }).select({ name: 1, state: 1 }).lean() : [],
      eventIds.length ? m.events!.find({ _id: { $in: eventIds } }).select({ title: 1 }).lean() : [],
    ]);
    const clubById = new Map(clubDocs.map((club) => [String(club._id), club]));
    const eventTitle = new Map(eventDocs.map((event) => [String(event._id), String(event.title)]));
    return docs.map((doc) => {
      const club = doc.clubId ? clubById.get(String(doc.clubId)) : undefined;
      const triage = triageFrom(doc.triage);
      const clubResponse = responseFrom(doc.clubResponse);
      const closure = doc.closure && typeof doc.closure === "object"
        ? { reason: String((doc.closure as Doc).reason ?? ""), at: (doc.closure as Doc).at as Date } : undefined;
      return { id: String(doc._id),
        ...(doc.clubId ? { clubId: String(doc.clubId), clubName: String(club?.name ?? ""), clubState: String(club?.state ?? "") } : {}),
        ...(doc.eventId ? { eventId: String(doc.eventId), eventTitle: eventTitle.get(String(doc.eventId)) ?? "" } : {}),
        type: String(doc.type), description: String(doc.description), evidence: evidenceFrom(doc.evidence),
        state: doc.state as ComplaintState, ...(triage ? { triage } : {}), ...(clubResponse ? { clubResponse } : {}),
        ...(closure ? { closure } : {}),
        ...(optionalDate(doc.forwardedAt) ? { forwardedAt: optionalDate(doc.forwardedAt) } : {}),
        ...(optionalDate(doc.respondedAt) ? { respondedAt: optionalDate(doc.respondedAt) } : {}),
        ...(optionalDate(doc.responseDueAt) ? { responseDueAt: optionalDate(doc.responseDueAt) } : {}),
        ...(doc.violationId ? { violationId: String(doc.violationId) } : {}),
        ...(doc.linkedComplaintId ? { linkedComplaintId: String(doc.linkedComplaintId) } : {}),
        submittedAt: doc.submittedAt as Date,
        ...(optionalDate(doc.withdrawnAt) ? { withdrawnAt: optionalDate(doc.withdrawnAt) } : {}),
        ...(optionalDate(doc.closedAt) ? { closedAt: optionalDate(doc.closedAt) } : {}) };
    });
  }
  async function forIcpdp(docs: Doc[]): Promise<ComplaintForIcpdp[]> {
    const named = await base(docs);
    const userDocs = await m.users!.find({ _id: { $in: docs.map((doc) => doc.complainantId) } })
      .select({ displayName: 1, email: 1 }).lean();
    const userById = new Map(userDocs.map((user) => [String(user._id), user]));
    const linked = await complaints.find({ linkedComplaintId: { $in: docs.map((doc) => doc._id) } })
      .select({ linkedComplaintId: 1 }).lean();
    return named.map((item, index) => {
      const user = userById.get(String(docs[index]!.complainantId));
      return { ...item, complainant: { id: String(docs[index]!.complainantId), displayName: String(user?.displayName ?? ""),
        email: String(user?.email ?? "") },
      linkedComplaintIds: linked.filter((row) => String(row.linkedComplaintId) === item.id).map((row) => String(row._id)) };
    });
  }
  /** D5: built only from fields the club may read; the complainant is never loaded. */
  async function forClub(docs: Doc[]): Promise<ComplaintForClub[]> {
    const named = await base(docs);
    return named.map((item) => ({ id: item.id, clubId: item.clubId!, ...(item.eventTitle ? { eventTitle: item.eventTitle } : {}),
      type: item.type, description: item.description, evidence: item.evidence,
      state: item.state as ComplaintForClub["state"], forwardNote: item.triage?.reason ?? "", forwardedAt: item.forwardedAt!,
      ...(item.responseDueAt ? { responseDueAt: item.responseDueAt } : {}),
      ...(item.clubResponse ? { clubResponse: item.clubResponse } : {}) }));
  }
  async function icpdpDetail(id: Types.ObjectId): Promise<ComplaintForIcpdp> {
    const doc = await complaints.findById(id).lean();
    if (!doc) throw new DomainError("complaint not found", "not_found");
    return (await forIcpdp([doc as Doc]))[0]!;
  }

  /** Opens a UC40 case linked both ways (BR28, FR-UC51-02) inside the caller's transaction. */
  async function openViolation(session: ClientSession, complaint: Doc, severity: string, reason: string, officerId: string,
    now: Date): Promise<Types.ObjectId> {
    const violationId = new Types.ObjectId();
    await m.violations!.create([{ _id: violationId, clubId: complaint.clubId, originType: "COMPLAINT", originRefId: complaint._id,
      severity, title: `Khiếu nại: ${String(complaint.description).slice(0, 80)}`, description: String(complaint.description),
      evidence: evidenceFrom(complaint.evidence).map((item) => ({ note: item.label, url: item.url,
        addedBy: oid(officerId), addedAt: now })),
      state: "Open", openedBy: oid(officerId), openedAt: now }], { session });
    await audits.create([{ entityType: "Violation", entityId: violationId, action: "VIOLATION_OPENED", actorId: oid(officerId),
      actorRole: "ICPDP Officer", after: { state: "Open", severity, originType: "COMPLAINT", originRefId: String(complaint._id) },
      reason, correlationId: randomUUID(), at: now }], { session });
    return violationId;
  }

  return {
    async club(clubId) {
      const club = await m.clubs!.findById(oid(clubId)).select({ name: 1, state: 1 }).lean();
      return club ? { id: String(club._id), name: String(club.name), state: String(club.state) } : null;
    },
    async eventBelongsToClub(eventId, clubId) {
      return Boolean(await m.events!.exists({ _id: oid(eventId), clubId: oid(clubId) }));
    },

    async submit(input) {
      const id = new Types.ObjectId();
      await mongoose.connection.transaction(async (session) => {
        // UC50 E1: a new complaint of the same student about the same club (and event) links to the open one.
        const duplicate = await complaints.findOne({ complainantId: oid(input.studentId), clubId: oid(input.clubId),
          ...(input.eventId ? { eventId: oid(input.eventId) } : {}), state: { $in: [...OPEN_COMPLAINT_STATES] },
          linkedComplaintId: { $exists: false } }).sort({ submittedAt: 1 }).session(session).lean();
        await complaints.create([{ _id: id, complainantId: oid(input.studentId), clubId: oid(input.clubId),
          ...(input.eventId ? { eventId: oid(input.eventId) } : {}), type: input.type, description: input.description,
          evidence: input.evidence, isAnonymous: false, state: "Submitted", submittedAt: input.now,
          ...(duplicate ? { linkedComplaintId: duplicate._id } : {}) }], { session });
        const club = await m.clubs!.findById(oid(input.clubId)).select({ name: 1 }).session(session).lean();
        await tasks.create([{ entityType: TASK, entityId: id, clubId: oid(input.clubId),
          title: `Khiếu nại về ${String(club?.name ?? "")}`, state: "Open", openedAt: input.now }], { session });
        // The audit and ICPDP notification never carry the complaint text.
        await audit(session, id, "COMPLAINT_SUBMITTED", input.studentId, "STUDENT", null,
          { state: "Submitted", clubId: input.clubId, type: input.type, ...(duplicate ? { linkedComplaintId: String(duplicate._id) } : {}) },
          undefined, input.now);
        await queueNotifications(session, await officers(session), "COMPLAINT_SUBMITTED", ENTITY, id,
          { clubName: String(club?.name ?? ""), type: input.type }, input.now);
      });
      return (await base([(await complaints.findById(id).lean()) as Doc]))[0]!;
    },

    async listMine(studentId) {
      return base(await complaints.find({ complainantId: oid(studentId) }).sort({ submittedAt: -1, _id: -1 }).limit(200).lean());
    },

    async withdraw(studentId, complaintId, now) {
      let withdrawn: Doc | null = null;
      await mongoose.connection.transaction(async (session) => {
        withdrawn = await complaints.findOneAndUpdate({ _id: oid(complaintId), complainantId: oid(studentId),
          state: { $in: [...UNDECIDED_COMPLAINT_STATES] } }, { $set: { state: "Withdrawn", withdrawnAt: now } },
        { session, new: true }).lean();
        if (!withdrawn) return;
        await closeTask(session, [oid(complaintId)], now);
        await audit(session, oid(complaintId), "COMPLAINT_WITHDRAWN", studentId, "STUDENT", null, { state: "Withdrawn" }, undefined, now);
      });
      return withdrawn ? (await base([withdrawn]))[0]! : null;
    },

    async queue(filter) {
      const docs = await complaints.find(filter.state ? { state: filter.state } : {}).sort({ submittedAt: -1, _id: -1 }).limit(300).lean();
      return forIcpdp(docs);
    },
    async findForIcpdp(complaintId) {
      const doc = await complaints.findById(oid(complaintId)).lean();
      return doc ? (await forIcpdp([doc as Doc]))[0]! : null;
    },

    async decide(complaintId, officerId, decision, now) {
      const id = oid(complaintId);
      await mongoose.connection.transaction(async (session) => {
        const current = await complaints.findById(id).session(session).lean();
        if (!current) throw new DomainError("complaint not found", "not_found");
        const from = String(current.state) as ComplaintState;
        // Every write below is conditional on the state just read, so two officers cannot both win.
        async function move(ids: Types.ObjectId[], states: readonly ComplaintState[], set: Doc) {
          const changed = await complaints.updateMany({ _id: { $in: ids }, state: { $in: [...states] } }, { $set: set }, { session });
          if (changed.matchedCount < 1) conflict("the complaint changed meanwhile; reload and retry");
        }
        const student = [current.complainantId];
        switch (decision.kind) {
          case "open": {
            await move([id], ["Submitted"], { state: "Under Triage" });
            await tasks.updateOne({ entityType: TASK, entityId: id, state: "Open" }, { $set: { assigneeId: oid(officerId) } }, { session });
            await audit(session, id, "COMPLAINT_TRIAGE_OPENED", officerId, "ICPDP Officer", { state: from }, { state: "Under Triage" },
              undefined, now);
            return;
          }
          case "triage": {
            // UC50 E1: undecided duplicates linked to this complaint share its outcome.
            const linked = await complaints.find({ linkedComplaintId: id, state: { $in: [...UNDECIDED_COMPLAINT_STATES] } })
              .session(session).lean();
            const group = [id, ...linked.map((row) => row._id as Types.ObjectId)];
            const triage = { severity: decision.severity, validity: decision.validity, outcome: decision.outcome,
              reason: decision.reason, actorId: oid(officerId), at: now };
            if (decision.outcome === "Forwarded") {
              await move([id], ["Under Triage"], { state: "Forwarded", triage, forwardedAt: now, responseDueAt: decision.responseDueAt });
              if (linked.length) await complaints.updateMany({ _id: { $in: group.slice(1) } }, { $set: { state: "Forwarded", triage,
                forwardedAt: now, responseDueAt: decision.responseDueAt } }, { session });
              await queueNotifications(session, await clubUserIdsWithPermission(current.clubId as Types.ObjectId,
                "club.complaint.respond", now, session), "COMPLAINT_FORWARDED", ENTITY, id,
              { responseDueAt: decision.responseDueAt }, now);
            } else if (decision.outcome === "Dismissed") {
              await move([id], ["Under Triage"], { state: "Dismissed", triage, closedAt: now });
              if (linked.length) await complaints.updateMany({ _id: { $in: group.slice(1) } }, { $set: { state: "Dismissed", triage,
                closedAt: now } }, { session });
              await closeTask(session, group, now);
            } else {
              const violationId = await openViolation(session, current as Doc, decision.severity, decision.reason, officerId, now);
              await move([id], ["Under Triage"], { state: "Escalated", triage, violationId, closedAt: now });
              if (linked.length) await complaints.updateMany({ _id: { $in: group.slice(1) } }, { $set: { state: "Escalated", triage,
                violationId, closedAt: now } }, { session });
              await closeTask(session, group, now);
            }
            for (const target of group) {
              await audit(session, target, `COMPLAINT_${decision.outcome.toUpperCase()}`, officerId, "ICPDP Officer", { state: from },
                { state: decision.outcome, severity: decision.severity, validity: decision.validity }, decision.reason, now);
            }
            const students = [...student, ...linked.map((row) => row.complainantId)];
            // The student hears the outcome under its own code; COMPLAINT_FORWARDED belongs to the club inbox.
            await queueNotifications(session, students, "COMPLAINT_TRIAGED", ENTITY, id, { outcome: decision.outcome }, now);
            return;
          }
          case "close": {
            await move([id], ["Club Responded"], { state: "Closed", closedAt: now, closure: { reason: decision.reason,
              actorId: oid(officerId), at: now } });
            await closeTask(session, [id], now);
            await audit(session, id, "COMPLAINT_CLOSED", officerId, "ICPDP Officer", { state: from }, { state: "Closed" },
              decision.reason, now);
            await queueNotifications(session, student, "COMPLAINT_CLOSED", ENTITY, id, { outcome: "Closed" }, now);
            return;
          }
          case "escalate": {
            const violationId = await openViolation(session, current as Doc, decision.severity, decision.reason, officerId, now);
            await move([id], ["Club Responded"], { state: "Escalated", violationId, closedAt: now,
              closure: { reason: decision.reason, actorId: oid(officerId), at: now } });
            await closeTask(session, [id], now);
            await audit(session, id, "COMPLAINT_ESCALATED", officerId, "ICPDP Officer", { state: from },
              { state: "Escalated", violationId: String(violationId) }, decision.reason, now);
            await queueNotifications(session, student, "COMPLAINT_ESCALATED", ENTITY, id, { outcome: "Escalated" }, now);
          }
        }
      });
      return icpdpDetail(id);
    },

    async clubInbox(clubId) {
      // BR38: Submitted, Under Triage, Dismissed and Withdrawn complaints never reach the club.
      const docs = await complaints.find({ clubId: oid(clubId), forwardedAt: { $exists: true },
        state: { $in: ["Forwarded", "Club Responded", "Closed", "Escalated"] } }).sort({ forwardedAt: -1, _id: -1 }).limit(200).lean();
      return forClub(docs);
    },

    async respond(clubId, complaintId, actorId, response, now) {
      const id = oid(complaintId);
      await mongoose.connection.transaction(async (session) => {
        const changed = await complaints.updateOne({ _id: id, clubId: oid(clubId), state: "Forwarded" },
          { $set: { state: "Club Responded", respondedAt: now, clubResponse: { ...response, actorId: oid(actorId), at: now } } },
          { session });
        if (changed.matchedCount !== 1) conflict("only a forwarded complaint of this club can be answered, once");
        await audit(session, id, "COMPLAINT_CLUB_RESPONDED", actorId, "Club", { state: "Forwarded" }, { state: "Club Responded" },
          undefined, now);
        const task = await tasks.findOne({ entityType: TASK, entityId: id, state: "Open" }).session(session).lean();
        await queueNotifications(session, task?.assigneeId ? [task.assigneeId] : await officers(session), "COMPLAINT_CLUB_RESPONDED",
          ENTITY, id, {}, now);
      });
      return (await forClub([(await complaints.findById(id).lean()) as Doc]))[0]!;
    },

    async flagOverdueResponses(now) {
      const overdue = await complaints.find({ state: "Forwarded", responseDueAt: { $lt: now } }).select({ _id: 1 }).lean();
      let flagged = 0;
      for (const row of overdue) {
        await mongoose.connection.transaction(async (session) => {
          // Idempotent: one audit row per complaint marks the signal as raised.
          if (await audits.exists({ entityType: ENTITY, entityId: row._id, action: "COMPLAINT_RESPONSE_OVERDUE" }).session(session)) return;
          await audit(session, row._id as Types.ObjectId, "COMPLAINT_RESPONSE_OVERDUE", null, "SYSTEM", null,
            { state: "Forwarded", complianceSignal: true }, "UC52 E1", now);
          await queueNotifications(session, await officers(session), "COMPLAINT_RESPONSE_OVERDUE", ENTITY, row._id as Types.ObjectId,
            {}, now);
          flagged += 1;
        });
      }
      return flagged;
    },
  };
}
