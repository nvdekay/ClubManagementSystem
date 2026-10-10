import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import {
  decideReconciliation, reconciliationMode, totalsOf,
  type BudgetReconciliationRepository, type Expense, type ExpenseReviewOutcome, type ReconciliationResult,
  type ReconciliationView,
} from "../../domain/budget-reconciliation.js";
import { DomainError } from "../../domain/errors.js";
import { clubBoardUserIds, queueNotifications } from "./club-board.js";
import { ucmsModels } from "./ucms-models.js";
import { insertViolationCase } from "./violation-case.js";

type Doc = Record<string, unknown>;

function money(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function decimal(value: number) {
  return Types.Decimal128.fromString(String(value));
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function conflict(message: string): never {
  throw new DomainError(message, "conflict");
}

export function mongoBudgetReconciliationRepository(): BudgetReconciliationRepository {
  const m = ucmsModels;
  const budgets = m.eventBudgets!;
  const expenses = m.expenses!;
  const results = m.financialReconciliations!;

  async function expensesOf(budgetId: Types.ObjectId, session?: ClientSession): Promise<Expense[]> {
    const docs = await expenses.find({ eventBudgetId: budgetId }).sort({ spentAt: 1, _id: 1 }).session(session ?? null).lean();
    const evidenceDocs = await m.financialEvidences!.find({ expenseId: { $in: docs.map((doc) => doc._id) } })
      .sort({ uploadedAt: 1 }).session(session ?? null).lean();
    const users = await m.users!.find({ _id: { $in: evidenceDocs.map((doc) => doc.uploadedBy) } })
      .select({ displayName: 1, email: 1 }).session(session ?? null).lean();
    const nameById = new Map(users.map((user) => [String(user._id), optionalText(user.displayName) ?? String(user.email)]));
    return docs.map((doc) => {
      const evidence = evidenceDocs.filter((item) => String(item.expenseId) === String(doc._id)).map((item) => ({
        id: String(item._id), type: String(item.type), externalLink: String(item.externalLink),
        uploadedAt: item.uploadedAt as Date, uploadedByName: nameById.get(String(item.uploadedBy)) }));
      return { id: String(doc._id), category: String(doc.category), amount: money(doc.amount), spentAt: doc.spentAt as Date,
        ...(optionalText(doc.description) ? { description: String(doc.description) } : {}),
        isOutOfCategory: doc.isOutOfCategory === true, isOverRemaining: doc.isOverRemaining === true,
        // The flag is what the club side maintains; an attached evidence row counts as well.
        hasEvidence: doc.hasEvidence === true || evidence.length > 0, evidence,
        ...(doc.reviewOutcome ? { reviewOutcome: doc.reviewOutcome as ExpenseReviewOutcome } : {}),
        ...(optionalText(doc.reviewReason) ? { reviewReason: String(doc.reviewReason) } : {}) };
    });
  }

  async function advancedTotal(budgetId: Types.ObjectId, session?: ClientSession): Promise<number> {
    const flows = await m.budgetDisbursements!.find({ eventBudgetId: budgetId, kind: "Advance" }).select({ amount: 1 })
      .session(session ?? null).lean();
    return flows.reduce((sum, flow) => sum + money(flow.amount), 0);
  }

  async function view(budgetId: Types.ObjectId, now: Date): Promise<ReconciliationView | null> {
    const budget = await budgets.findById(budgetId).lean();
    if (!budget) return null;
    const [event, club, list, advanced, stored, request, existingCase] = await Promise.all([
      m.events!.findById(budget.eventId).select({ title: 1, clubName: 1 }).lean(),
      m.clubs!.findById(budget.clubId).select({ name: 1 }).lean(),
      expensesOf(budgetId),
      advancedTotal(budgetId),
      results.findOne({ eventBudgetId: budgetId }).lean(),
      m.auditLogs!.findOne({ entityType: "EventBudget", entityId: budgetId, action: "BUDGET_EVIDENCE_REQUESTED" }).sort({ at: -1 }).lean(),
      m.violations!.findOne({ originType: "FINANCIAL_EXCEPTION", originRefId: budgetId }).select({ _id: 1 }).lean(),
    ]);
    const state = String(budget.state);
    const settlementDueAt = budget.settlementDueAt instanceof Date ? budget.settlementDueAt : undefined;
    const result: ReconciliationResult | undefined = stored ? {
      acceptedTotal: money(stored.acceptedTotal), settlementBalance: money(stored.settlementBalance),
      outcome: stored.outcome as ReconciliationResult["outcome"], isOverdueSettlement: stored.isOverdueSettlement === true,
      computedAt: stored.computedAt as Date, ...(stored.closedAt ? { closedAt: stored.closedAt as Date } : {}),
      ...(budget.recoveryAmount !== undefined && budget.recoveryAmount !== null ? { recoveryAmount: money(budget.recoveryAmount) } : {}),
      ...(budget.recoveryDueAt instanceof Date ? { recoveryDueAt: budget.recoveryDueAt } : {}),
    } : undefined;
    const mode = reconciliationMode({ state, settlementDueAt }, now);
    return {
      budgetId: String(budgetId), eventTitle: String(event?.title ?? ""),
      clubName: String(club?.name ?? event?.clubName ?? ""), state,
      ...(settlementDueAt ? { settlementDueAt } : {}),
      ...(budget.settlementSubmittedAt instanceof Date ? { settlementSubmittedAt: budget.settlementSubmittedAt } : {}),
      isSettlementLate: budget.isSettlementLate === true,
      ...(mode ? { mode } : {}), canRequestEvidence: state === "Settlement Submitted",
      totals: totalsOf(list, money(budget.approvedTotal), advanced), expenses: list,
      ...(request ? { lastEvidenceRequest: { message: String(request.reason ?? ""), at: request.at as Date } } : {}),
      ...(result ? { result } : {}),
      recoveryOverdue: state === "Recovery Pending" && budget.recoveryDueAt instanceof Date && budget.recoveryDueAt < now
        && money(budget.refundedTotal) < money(budget.recoveryAmount),
      ...(existingCase ? { caseId: String(existingCase._id) } : {}),
    };
  }

  async function required(budgetId: Types.ObjectId, now: Date): Promise<ReconciliationView> {
    const found = await view(budgetId, now);
    if (!found) throw new DomainError("budget not found", "not_found");
    return found;
  }

  async function notify(session: ClientSession, budget: Doc, code: string, payload: Record<string, unknown>, now: Date) {
    const version = await m.eventProposalVersions!.findOne({ eventId: budget.eventId }).sort({ revisionNo: -1 }).session(session).lean();
    await queueNotifications(session, [...await clubBoardUserIds(budget.clubId as Types.ObjectId, session), version?.submittedBy],
      code, "EventBudget", budget._id as Types.ObjectId, payload, now);
  }

  return {
    async find(id, now) {
      return view(new Types.ObjectId(id), now);
    },

    async reconcile(id, officerId, reviews, now) {
      const budgetId = new Types.ObjectId(id);
      const actorId = new Types.ObjectId(officerId);
      await mongoose.connection.transaction(async (session) => {
        const budget = await budgets.findById(budgetId).session(session).lean();
        if (!budget) throw new DomainError("budget not found", "not_found");
        const state = String(budget.state);
        const mode = reconciliationMode({ state,
          settlementDueAt: budget.settlementDueAt instanceof Date ? budget.settlementDueAt : undefined }, now);
        if (!mode) return conflict("this budget cannot be reconciled now");
        const list = await expensesOf(budgetId, session);
        const advanced = await advancedTotal(budgetId, session);
        const totals = totalsOf(list, money(budget.approvedTotal), advanced);
        const decision = decideReconciliation({ expenses: list, reviews, approvedTotal: totals.approvedTotal,
          advancedTotal: advanced, mode }, now);
        for (const review of decision.reviews) {
          await expenses.updateOne({ _id: new Types.ObjectId(review.expenseId), eventBudgetId: budgetId },
            { $set: { reviewOutcome: review.outcome, ...(review.reason ? { reviewReason: review.reason } : {}) },
              ...(!review.reason ? { $unset: { reviewReason: "" } } : {}) }, { session });
        }
        const { result } = decision;
        const closed = result.outcome === "Closed";
        await results.updateOne({ eventBudgetId: budgetId }, { $set: {
          approvedTotal: decimal(totals.approvedTotal), disbursedTotal: decimal(advanced),
          recordedTotal: decimal(totals.recordedTotal), supportedTotal: decimal(totals.supportedTotal),
          unsupportedTotal: decimal(totals.unsupportedTotal), remaining: decimal(totals.remaining),
          acceptedTotal: decimal(result.acceptedTotal), settlementBalance: decimal(result.settlementBalance),
          outcome: closed ? "Reconciled" : result.outcome, isOverdueSettlement: result.isOverdueSettlement, computedAt: now,
          ...(closed ? { closedBy: actorId, closedAt: now } : {}) } }, { upsert: true, session });
        // BR26: a zero balance closes at once; anything else waits for UC35 (top-up or refund).
        const changed = await budgets.updateOne({ _id: budgetId, state }, { $set: { state: result.outcome,
          acceptedTotal: decimal(result.acceptedTotal), settlementBalance: decimal(result.settlementBalance),
          ...(result.isOverdueSettlement ? { isSettlementLate: true } : {}),
          ...(result.recoveryAmount !== undefined ? { recoveryAmount: decimal(result.recoveryAmount),
            recoveryDueAt: result.recoveryDueAt } : {}) } }, { session });
        if (changed.modifiedCount !== 1) return conflict("the budget changed while reconciling");
        const event = await m.events!.findById(budget.eventId).select({ title: 1 }).session(session).lean();
        await m.auditLogs!.create([{ entityType: "EventBudget", entityId: budgetId, action: "BUDGET_RECONCILED", actorId,
          actorRole: "ICPDP_OFFICER", before: { state }, after: { state: result.outcome, mode, ...totals,
            acceptedTotal: result.acceptedTotal, settlementBalance: result.settlementBalance,
            recoveryAmount: result.recoveryAmount, rejected: decision.reviews.filter((item) => item.outcome === "Rejected").length },
          correlationId: randomUUID(), at: now }], { session });
        await notify(session, budget, "BUDGET_RECONCILED", { eventTitle: event?.title, state: result.outcome,
          acceptedTotal: result.acceptedTotal, settlementBalance: result.settlementBalance,
          recoveryAmount: result.recoveryAmount, recoveryDueAt: result.recoveryDueAt }, now);
      });
      return required(budgetId, now);
    },

    async requestEvidence(id, officerId, message, now) {
      const budgetId = new Types.ObjectId(id);
      await mongoose.connection.transaction(async (session) => {
        const budget = await budgets.findOne({ _id: budgetId, state: "Settlement Submitted" }).session(session).lean();
        if (!budget) return conflict("only a submitted settlement can be sent back for evidence");
        await budgets.updateOne({ _id: budgetId, state: "Settlement Submitted" }, { $set: { state: "Reconciliation Pending" } }, { session });
        await m.auditLogs!.create([{ entityType: "EventBudget", entityId: budgetId, action: "BUDGET_EVIDENCE_REQUESTED",
          actorId: new Types.ObjectId(officerId), actorRole: "ICPDP_OFFICER", before: { state: "Settlement Submitted" },
          after: { state: "Reconciliation Pending" }, reason: message, correlationId: randomUUID(), at: now }], { session });
        const event = await m.events!.findById(budget.eventId).select({ title: 1 }).session(session).lean();
        await notify(session, budget, "BUDGET_EVIDENCE_REQUESTED", { eventTitle: event?.title, message }, now);
      });
      return required(budgetId, now);
    },

    async openCase(id, officerId, severity, now) {
      const budgetId = new Types.ObjectId(id);
      let violationId: Types.ObjectId | undefined;
      await mongoose.connection.transaction(async (session) => {
        const budget = await budgets.findById(budgetId).session(session).lean();
        if (!budget) throw new DomainError("budget not found", "not_found");
        const overdue = budget.state === "Recovery Pending" && budget.recoveryDueAt instanceof Date && budget.recoveryDueAt < now;
        if (!overdue) return conflict("the refund is not overdue");
        if (await m.violations!.exists({ originType: "FINANCIAL_EXCEPTION", originRefId: budgetId }).session(session)) {
          return conflict("a case is already open for this budget");
        }
        const owed = money(budget.recoveryAmount) - money(budget.refundedTotal);
        const event = await m.events!.findById(budget.eventId).select({ title: 1 }).session(session).lean();
        violationId = await insertViolationCase(session, { clubId: budget.clubId as Types.ObjectId,
          originType: "FINANCIAL_EXCEPTION", originRefId: budgetId, severity,
          title: `Quá hạn hoàn trả kinh phí: ${String(event?.title ?? "")}`,
          description: `CLB còn phải hoàn ${owed.toLocaleString("vi-VN")} đ, hạn ${(budget.recoveryDueAt as Date).toISOString().slice(0, 10)}.` },
        officerId, now);
        await notify(session, budget, "BUDGET_RECOVERY_CASE_OPENED", { eventTitle: event?.title, owed, violationId }, now);
      });
      return { violationId: String(violationId) };
    },
  };
}
