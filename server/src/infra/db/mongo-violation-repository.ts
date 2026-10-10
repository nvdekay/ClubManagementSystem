import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import {
  applyViolationStep, normalizedEvidence,
  type ClubResponse, type CorrectiveAction, type ViolationCase, type ViolationDetail, type ViolationEvidence,
  type ViolationOrigin, type ViolationRepository, type ViolationSeverity, type ViolationState, type ViolationSummary,
} from "../../domain/violation.js";
import { clubBoardUserIds, queueNotifications } from "./club-board.js";
import { ucmsModels } from "./ucms-models.js";

type Doc = Record<string, unknown>;

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function optionalId(value: unknown): string | undefined {
  return value ? String(value) : undefined;
}

function evidenceFrom(raw: unknown): ViolationEvidence[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: Doc) => ({ note: String(item.note ?? ""), ...(optionalText(item.url) ? { url: String(item.url) } : {}),
    addedBy: String(item.addedBy ?? ""), addedAt: item.addedAt as Date }));
}

function evidenceDoc(items: ViolationEvidence[]) {
  return items.map((item) => ({ note: item.note, ...(item.url ? { url: item.url } : {}),
    addedBy: new Types.ObjectId(item.addedBy), addedAt: item.addedAt }));
}

function responseFrom(raw: unknown): ClubResponse | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const doc = raw as Doc;
  return { requestMessage: String(doc.requestMessage ?? ""), requestedBy: String(doc.requestedBy ?? ""),
    requestedAt: doc.requestedAt as Date, dueAt: doc.dueAt as Date,
    ...(optionalText(doc.source) ? { source: doc.source as ClubResponse["source"] } : {}),
    ...(optionalText(doc.text) ? { text: String(doc.text) } : {}),
    ...(optionalId(doc.respondedBy) ? { respondedBy: String(doc.respondedBy) } : {}),
    ...(doc.respondedAt instanceof Date ? { respondedAt: doc.respondedAt } : {}),
    ...(optionalId(doc.recordedBy) ? { recordedBy: String(doc.recordedBy) } : {}) };
}

function responseDoc(response: ClubResponse) {
  return { requestMessage: response.requestMessage, requestedBy: new Types.ObjectId(response.requestedBy),
    requestedAt: response.requestedAt, dueAt: response.dueAt,
    ...(response.source ? { source: response.source } : {}), ...(response.text ? { text: response.text } : {}),
    ...(response.respondedBy ? { respondedBy: new Types.ObjectId(response.respondedBy) } : {}),
    ...(response.respondedAt ? { respondedAt: response.respondedAt } : {}),
    ...(response.recordedBy ? { recordedBy: new Types.ObjectId(response.recordedBy) } : {}) };
}

function actionFrom(doc: Doc): CorrectiveAction {
  return { id: String(doc._id), description: String(doc.description), dueAt: doc.dueAt as Date,
    state: doc.state as CorrectiveAction["state"],
    ...(optionalText(doc.linkedLifecycleAction) ? { linkedLifecycleAction: doc.linkedLifecycleAction as "SUSPEND" | "DISSOLVE" } : {}),
    ...(optionalId(doc.verifiedBy) ? { verifiedBy: String(doc.verifiedBy) } : {}),
    ...(doc.verifiedAt instanceof Date ? { verifiedAt: doc.verifiedAt } : {}) };
}

function caseFrom(doc: Doc, clubName: string, actions: CorrectiveAction[]): ViolationCase {
  const response = responseFrom(doc.clubResponse);
  return {
    id: String(doc._id), clubId: String(doc.clubId), clubName, originType: doc.originType as ViolationOrigin,
    ...(optionalId(doc.originRefId) ? { originRefId: String(doc.originRefId) } : {}),
    severity: doc.severity as ViolationSeverity, title: String(doc.title),
    ...(optionalText(doc.description) ? { description: String(doc.description) } : {}),
    evidence: evidenceFrom(doc.evidence), state: doc.state as ViolationState,
    ...(response ? { clubResponse: response } : {}),
    ...(optionalText(doc.decisionReason) ? { decisionReason: String(doc.decisionReason) } : {}),
    decisionEvidence: evidenceFrom(doc.decisionEvidence),
    openedBy: String(doc.openedBy), openedAt: doc.openedAt as Date,
    ...(optionalId(doc.decidedBy) ? { decidedBy: String(doc.decidedBy) } : {}),
    ...(doc.decidedAt instanceof Date ? { decidedAt: doc.decidedAt } : {}),
    ...(doc.responseDueAt instanceof Date ? { responseDueAt: doc.responseDueAt } : {}),
    ...(doc.resolvedAt instanceof Date ? { resolvedAt: doc.resolvedAt } : {}),
    actions,
  };
}

export function mongoViolationRepository(): ViolationRepository {
  const m = ucmsModels;
  const violations = m.violations!;
  const actions = m.correctiveActions!;

  async function audit(session: ClientSession, id: Types.ObjectId, action: string, actorId: string,
    before: unknown, after: unknown, reason: string | undefined, now: Date): Promise<void> {
    await m.auditLogs!.create([{ entityType: "Violation", entityId: id, action, actorId: new Types.ObjectId(actorId),
      actorRole: "ICPDP_OFFICER", before, after, ...(reason ? { reason } : {}), correlationId: randomUUID(), at: now }],
    { session });
  }

  async function loadCase(id: Types.ObjectId, session?: ClientSession): Promise<{ doc: Doc; current: ViolationCase } | null> {
    const doc = await violations.findById(id).session(session ?? null).lean();
    if (!doc) return null;
    const [club, actionDocs] = await Promise.all([
      m.clubs!.findById(doc.clubId).select({ name: 1 }).session(session ?? null).lean(),
      actions.find({ violationId: id }).sort({ dueAt: 1, _id: 1 }).session(session ?? null).lean(),
    ]);
    return { doc, current: caseFrom(doc, String(club?.name ?? ""), actionDocs.map(actionFrom)) };
  }

  async function detail(id: Types.ObjectId): Promise<ViolationDetail | null> {
    const loaded = await loadCase(id);
    if (!loaded) return null;
    const { current } = loaded;
    const [club, audits] = await Promise.all([
      m.clubs!.findById(current.clubId).select({ state: 1 }).lean(),
      m.auditLogs!.find({ entityType: "Violation", entityId: id }).sort({ at: 1, _id: 1 }).lean(),
    ]);
    let source: ViolationDetail["source"];
    if (current.originRefId) {
      const refId = new Types.ObjectId(current.originRefId);
      const event = await m.events!.findById(refId).select({ title: 1 }).lean();
      if (event) source = { kind: "event", id: current.originRefId, label: String(event.title) };
      else {
        const budget = await m.eventBudgets!.findById(refId).select({ eventId: 1 }).lean();
        const budgetEvent = budget ? await m.events!.findById(budget.eventId).select({ title: 1 }).lean() : null;
        if (budget) source = { kind: "budget", id: current.originRefId, label: String(budgetEvent?.title ?? "") };
      }
    }
    const userIds = new Set<string>([current.openedBy, current.decidedBy ?? "", current.clubResponse?.requestedBy ?? "",
      current.clubResponse?.recordedBy ?? "", current.clubResponse?.respondedBy ?? "",
      ...current.evidence.map((item) => item.addedBy), ...current.decisionEvidence.map((item) => item.addedBy),
      ...current.actions.map((item) => item.verifiedBy ?? ""), ...audits.map((item) => optionalId(item.actorId) ?? "")]);
    const users = await m.users!.find({ _id: { $in: [...userIds].filter((value) => /^[0-9a-f]{24}$/i.test(value)) } })
      .select({ displayName: 1, email: 1 }).lean();
    const names = Object.fromEntries(users.map((user) => [String(user._id), optionalText(user.displayName) ?? String(user.email)]));
    return { ...current, clubState: String(club?.state ?? ""), ...(source ? { source } : {}), names,
      history: audits.map((item) => ({ action: String(item.action), at: item.at as Date,
        ...(optionalId(item.actorId) && names[String(item.actorId)] ? { actorName: names[String(item.actorId)] } : {}),
        ...(optionalText(item.reason) ? { reason: String(item.reason) } : {}) })) };
  }

  return {
    async list() {
      const docs = await violations.find().sort({ openedAt: -1, _id: -1 }).lean();
      const [clubs, pending] = await Promise.all([
        m.clubs!.find({ _id: { $in: docs.map((doc) => doc.clubId) } }).select({ name: 1 }).lean(),
        actions.aggregate<{ _id: Types.ObjectId; count: number }>([
          { $match: { violationId: { $in: docs.map((doc) => doc._id) }, state: "Pending" } },
          { $group: { _id: "$violationId", count: { $sum: 1 } } }]),
      ]);
      const clubName = new Map(clubs.map((club) => [String(club._id), String(club.name)]));
      const pendingById = new Map(pending.map((item) => [String(item._id), item.count]));
      const now = new Date();
      return docs.map((doc): ViolationSummary => {
        const response = responseFrom(doc.clubResponse);
        return { id: String(doc._id), clubId: String(doc.clubId), clubName: clubName.get(String(doc.clubId)) ?? "",
          originType: doc.originType as ViolationOrigin, severity: doc.severity as ViolationSeverity,
          title: String(doc.title), state: doc.state as ViolationState, openedAt: doc.openedAt as Date,
          ...(doc.responseDueAt instanceof Date ? { responseDueAt: doc.responseDueAt } : {}),
          responseOverdue: doc.state === "Awaiting Club Response" && !response?.source
            && doc.responseDueAt instanceof Date && doc.responseDueAt < now,
          pendingActions: pendingById.get(String(doc._id)) ?? 0 };
      });
    },

    async find(id) {
      return detail(new Types.ObjectId(id));
    },

    async sources(clubId) {
      const id = new Types.ObjectId(clubId);
      if (!(await m.clubs!.exists({ _id: id }))) return null;
      const [eventDocs, budgetDocs] = await Promise.all([
        m.events!.find({ clubId: id, state: { $ne: "Draft" } }).sort({ startAt: -1 }).limit(50)
          .select({ title: 1, startAt: 1, state: 1 }).lean(),
        m.eventBudgets!.find({ clubId: id }).sort({ createdAt: -1 }).limit(50).select({ eventId: 1, state: 1 }).lean(),
      ]);
      const titles = new Map((await m.events!.find({ _id: { $in: budgetDocs.map((budget) => budget.eventId) } })
        .select({ title: 1 }).lean()).map((event) => [String(event._id), String(event.title)]));
      return {
        events: eventDocs.map((event) => ({ id: String(event._id), title: String(event.title), startAt: event.startAt as Date,
          state: String(event.state) })),
        budgets: budgetDocs.map((budget) => ({ id: String(budget._id), eventTitle: titles.get(String(budget.eventId)) ?? "",
          state: String(budget.state) })),
      };
    },

    async open(input, officerId, now) {
      const clubId = new Types.ObjectId(input.clubId);
      const id = new Types.ObjectId();
      await mongoose.connection.transaction(async (session) => {
        if (!(await m.clubs!.exists({ _id: clubId }).session(session))) throw new DomainError("club not found", "not_found");
        if (input.originRefId) {
          const refId = new Types.ObjectId(input.originRefId);
          const belongs = await m.events!.exists({ _id: refId, clubId }).session(session)
            || await m.eventBudgets!.exists({ _id: refId, clubId }).session(session);
          if (!belongs) throw new DomainError("the source record does not belong to this club", "validation", { field: "originRefId" });
        }
        await violations.create([{ _id: id, clubId, originType: input.originType,
          ...(input.originRefId ? { originRefId: new Types.ObjectId(input.originRefId) } : {}),
          severity: input.severity, title: input.title, description: input.description,
          evidence: evidenceDoc(normalizedEvidence(input.evidence, officerId, now)), state: "Open",
          openedBy: new Types.ObjectId(officerId), openedAt: now }], { session });
        await audit(session, id, "VIOLATION_OPENED", officerId, null,
          { state: "Open", severity: input.severity, originType: input.originType }, input.title, now);
      });
      return (await detail(id))!;
    },

    async apply(id, officerId, step, now) {
      const caseId = new Types.ObjectId(id);
      await mongoose.connection.transaction(async (session) => {
        const loaded = await loadCase(caseId, session);
        if (!loaded) throw new DomainError("violation case not found", "not_found");
        const { current } = loaded;
        const result = applyViolationStep(current, step, officerId, now);
        const { next } = result;
        const changed = await violations.updateOne({ _id: caseId, state: current.state }, {
          $set: { state: next.state, evidence: evidenceDoc(next.evidence), decisionEvidence: evidenceDoc(next.decisionEvidence),
            ...(next.clubResponse ? { clubResponse: responseDoc(next.clubResponse) } : {}),
            ...(next.decisionReason ? { decisionReason: next.decisionReason } : {}),
            ...(next.decidedBy ? { decidedBy: new Types.ObjectId(next.decidedBy), decidedAt: next.decidedAt } : {}),
            ...(next.responseDueAt ? { responseDueAt: next.responseDueAt } : {}),
            ...(next.resolvedAt ? { resolvedAt: next.resolvedAt } : {}) },
        }, { session });
        if (changed.matchedCount !== 1) throw new DomainError("the case changed while saving", "conflict");
        const created = next.actions.filter((item) => item.id.startsWith("new-"));
        if (created.length) {
          await actions.insertMany(created.map((item) => ({ violationId: caseId, description: item.description,
            dueAt: item.dueAt, state: item.state, ...(item.linkedLifecycleAction ? { linkedLifecycleAction: item.linkedLifecycleAction } : {}) })),
          { session });
        }
        for (const item of next.actions) {
          const before = current.actions.find((action) => action.id === item.id);
          if (before && before.state !== item.state) {
            await actions.updateOne({ _id: new Types.ObjectId(item.id), state: "Pending" }, { $set: { state: item.state,
              verifiedBy: new Types.ObjectId(officerId), verifiedAt: now } }, { session });
          }
        }
        await audit(session, caseId, result.action, officerId, { state: current.state },
          { state: next.state, step: step.type }, result.reason, now);
        if (result.notifyClub) {
          await queueNotifications(session, await clubBoardUserIds(new Types.ObjectId(current.clubId), session),
            result.action, "Violation", caseId, { title: current.title, state: next.state, reason: result.reason,
              ...(next.responseDueAt && step.type === "requestResponse" ? { responseDueAt: next.responseDueAt } : {}) }, now);
        }
      });
      return (await detail(caseId))!;
    },
  };
}
