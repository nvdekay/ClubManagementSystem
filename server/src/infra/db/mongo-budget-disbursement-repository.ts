import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import {
  allowedFlow, checkFlow, settlementDueAt, stateAfterFlow,
  type BudgetDetail, type BudgetDisbursementRepository, type BudgetFlow, type BudgetFlowKind, type BudgetSummary,
} from "../../domain/budget-disbursement.js";
import { DomainError } from "../../domain/errors.js";
import { clubBoardUserIds, queueNotifications } from "./club-board.js";
import { ucmsModels } from "./ucms-models.js";

type Doc = Record<string, unknown>;

function money(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalMoney(value: unknown): number | undefined {
  return value === null || value === undefined ? undefined : money(value);
}

function decimal(value: number) {
  return Types.Decimal128.fromString(String(value));
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function summaryFrom(doc: Doc, event: Doc | undefined, clubName: string | undefined): BudgetSummary {
  return {
    id: String(doc._id), eventId: String(doc.eventId), eventTitle: String(event?.title ?? ""),
    eventState: String(event?.state ?? ""), eventStartAt: event?.startAt as Date, eventEndAt: event?.endAt as Date,
    clubId: String(doc.clubId), clubName: clubName ?? String(event?.clubName ?? ""), state: String(doc.state),
    ...(optionalText(doc.periodCode) ? { periodCode: String(doc.periodCode) } : {}),
    requestedTotal: money(doc.requestedTotal), approvedTotal: money(doc.approvedTotal),
    disbursedTotal: money(doc.disbursedTotal), refundedTotal: money(doc.refundedTotal),
    ...(doc.settlementDueAt instanceof Date ? { settlementDueAt: doc.settlementDueAt } : {}),
    ...(optionalMoney(doc.settlementBalance) !== undefined ? { settlementBalance: money(doc.settlementBalance) } : {}),
    ...(optionalMoney(doc.recoveryAmount) !== undefined ? { recoveryAmount: money(doc.recoveryAmount) } : {}),
    ...(doc.recoveryDueAt instanceof Date ? { recoveryDueAt: doc.recoveryDueAt } : {}),
    createdAt: doc.createdAt as Date,
  };
}

export function mongoBudgetDisbursementRepository(): BudgetDisbursementRepository {
  const m = ucmsModels;
  const budgets = m.eventBudgets!;
  const flows = m.budgetDisbursements!;

  async function summaries(docs: Doc[]): Promise<BudgetSummary[]> {
    const [eventDocs, clubDocs] = await Promise.all([
      m.events!.find({ _id: { $in: docs.map((doc) => doc.eventId) } })
        .select({ title: 1, state: 1, startAt: 1, endAt: 1, clubName: 1 }).lean(),
      m.clubs!.find({ _id: { $in: docs.map((doc) => doc.clubId) } }).select({ name: 1 }).lean(),
    ]);
    const eventById = new Map(eventDocs.map((event) => [String(event._id), event as Doc]));
    const clubById = new Map(clubDocs.map((club) => [String(club._id), String(club.name)]));
    return docs.map((doc) => summaryFrom(doc, eventById.get(String(doc.eventId)), clubById.get(String(doc.clubId))));
  }

  async function detail(id: Types.ObjectId): Promise<BudgetDetail | null> {
    const doc = await budgets.findById(id).lean();
    if (!doc) return null;
    const [summary] = await summaries([doc]);
    const flowDocs = await flows.find({ eventBudgetId: id }).sort({ disbursedAt: 1, _id: 1 }).lean();
    const users = await m.users!.find({ _id: { $in: flowDocs.map((flow) => flow.recordedBy) } })
      .select({ displayName: 1, email: 1 }).lean();
    const nameById = new Map(users.map((user) => [String(user._id), optionalText(user.displayName) ?? String(user.email)]));
    const mapped: BudgetFlow[] = flowDocs.map((flow) => ({
      id: String(flow._id), kind: flow.kind as BudgetFlowKind, amount: money(flow.amount),
      disbursedAt: flow.disbursedAt as Date,
      ...(optionalText(flow.paymentReference) ? { paymentReference: String(flow.paymentReference) } : {}),
      ...(optionalText(flow.note) ? { note: String(flow.note) } : {}),
      recordedBy: String(flow.recordedBy), recordedByName: nameById.get(String(flow.recordedBy)),
    }));
    const lines = Array.isArray(doc.lines) ? doc.lines.map((line: Doc) => ({
      category: String(line.category ?? ""), requestedAmount: money(line.requestedAmount),
      approvedAmount: money(line.approvedAmount), ...(optionalText(line.reason) ? { reason: String(line.reason) } : {}),
    })) : [];
    const allowed = allowedFlow(summary!);
    return { ...summary!, lines, flows: mapped, ...(allowed ? { allowed } : {}) };
  }

  return {
    async list() {
      return summaries(await budgets.find().sort({ createdAt: -1, _id: -1 }).lean());
    },

    async find(id) {
      return detail(new Types.ObjectId(id));
    },

    async record(id, officerId, flow, now) {
      const budgetObjectId = new Types.ObjectId(id);
      const actorId = new Types.ObjectId(officerId);
      await mongoose.connection.transaction(async (session) => {
        const doc = await budgets.findById(budgetObjectId).session(session).lean();
        if (!doc) throw new DomainError("budget not found", "not_found");
        const event = await m.events!.findById(doc.eventId).session(session).lean();
        const current = summaryFrom(doc, event as Doc | undefined, undefined);
        checkFlow(current, flow);
        const nextState = stateAfterFlow(current, flow);
        const flowId = new Types.ObjectId();
        await flows.create([{ _id: flowId, eventBudgetId: budgetObjectId, kind: flow.kind,
          amount: decimal(flow.amount), disbursedAt: flow.disbursedAt, paymentReference: flow.paymentReference,
          recordedBy: actorId, note: flow.note }], { session });
        const due = flow.kind === "Advance" && !current.settlementDueAt && event?.endAt instanceof Date
          ? settlementDueAt(event.endAt) : undefined;
        await budgets.updateOne({ _id: budgetObjectId }, { $set: {
          state: nextState,
          ...(flow.kind === "Refund" ? { refundedTotal: decimal(current.refundedTotal + flow.amount) }
            : { disbursedTotal: decimal(current.disbursedTotal + flow.amount) }),
          ...(due ? { settlementDueAt: due } : {}),
        } }, { session });
        const action = `BUDGET_${flow.kind.toUpperCase()}_RECORDED`;
        await m.auditLogs!.create([{ entityType: "EventBudget", entityId: budgetObjectId, action, actorId,
          actorRole: "ICPDP_OFFICER", before: { state: current.state },
          after: { state: nextState, flowId, kind: flow.kind, amount: flow.amount }, correlationId: randomUUID(),
          at: now }], { session });
        const version = await m.eventProposalVersions!.findOne({ eventId: doc.eventId })
          .sort({ revisionNo: -1 }).session(session).lean();
        const recipients = [...await clubBoardUserIds(doc.clubId as Types.ObjectId, session), version?.submittedBy];
        await queueNotifications(session, recipients, action, "EventBudget", budgetObjectId, {
          eventTitle: event?.title, kind: flow.kind, amount: flow.amount, disbursedAt: flow.disbursedAt,
          settlementDueAt: due ?? current.settlementDueAt, state: nextState }, now);
      });
      return (await detail(budgetObjectId))!;
    },
  };
}
