import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import {
  assertFinanceEditable,
  assertSettlementEvent,
  financeTotals,
  reconcileExpenses,
  type EventFinanceRepository,
  type Expense,
  type FinanceDetail,
} from "../../domain/event-finance.js";
import { assertEventWriteAccess } from "./club-event-access.js";
import {
  accountabilityAudit,
  accountabilityTask,
  assertAccountabilityOfficer,
  claimAccountabilityTask,
  decideAccountabilityTask,
  openAccountabilityTask,
} from "./accountability-workflow.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;
function oid(value: string) {
  return new Types.ObjectId(value);
}
function money(value: unknown) {
  return Number(String(value ?? 0));
}
function decimal(value: number) {
  return Types.Decimal128.fromString(String(value));
}
export function mongoEventFinanceRepository(rules: {
  recoveryDueDays: number;
  evidenceTypes: readonly string[];
}): EventFinanceRepository {
  if (
    !Number.isInteger(rules.recoveryDueDays) ||
    rules.recoveryDueDays <= 0 ||
    !rules.evidenceTypes.length
  ) {
    throw new Error(
      "financial evidence and recovery policy must be configured",
    );
  }
  async function detail(
    id: string,
    clubId?: string,
    session?: ClientSession,
  ): Promise<FinanceDetail | null> {
    const budget = await m
      .eventBudgets!.findOne({
        _id: oid(id),
        ...(clubId ? { clubId: oid(clubId) } : {}),
      })
      .session(session ?? null)
      .lean();
    if (!budget) return null;
    const [event, docs, flows, task, logs] = await Promise.all([
      m
        .events!.findById(budget.eventId)
        .session(session ?? null)
        .lean(),
      m
        .expenses!.find({ eventBudgetId: budget._id })
        .sort({ createdAt: 1, _id: 1 })
        .session(session ?? null)
        .lean(),
      m
        .budgetDisbursements!.find({
          eventBudgetId: budget._id,
          kind: "Advance",
        })
        .session(session ?? null)
        .lean(),
      m
        .approvalTasks!.findOne({
          entityType: "BUDGET_SETTLEMENT",
          entityId: budget._id,
          state: "Open",
        })
        .session(session ?? null)
        .lean(),
      m
        .auditLogs!.find({
          entityType: "EventBudget",
          entityId: budget._id,
          action: /^SETTLEMENT_/,
        })
        .sort({ at: 1, _id: 1 })
        .session(session ?? null)
        .lean(),
    ]);
    const evidence = await m
      .financialEvidences!.find({ expenseId: { $in: docs.map((d) => d._id) } })
      .session(session ?? null)
      .lean();
    const expenses: Expense[] = docs.map((d) => {
      const evidences = evidence
        .filter((e) => String(e.expenseId) === String(d._id))
        .map((e) => ({
          id: String(e._id),
          type: e.type as Expense["evidences"][number]["type"],
          externalLink: String(e.externalLink),
          uploadedBy: String(e.uploadedBy),
          uploadedAt: e.uploadedAt as Date,
        }));
      return {
        id: String(d._id),
        category: String(d.category),
        amount: money(d.amount),
        spentAt: d.spentAt as Date,
        description: d.description as string | undefined,
        isOutOfCategory: d.isOutOfCategory === true,
        isOverRemaining: d.isOverRemaining === true,
        hasEvidence: evidences.some((e) =>
          rules.evidenceTypes.includes(e.type),
        ),
        reviewOutcome: d.reviewOutcome as string | undefined,
        reviewReason: d.reviewReason as string | undefined,
        evidences,
      };
    });
    return {
      id,
      clubId: String(budget.clubId),
      eventId: String(budget.eventId),
      eventTitle: String(event?.title ?? ""),
      eventState: String(event?.state ?? ""),
      state: String(budget.state),
      revision: Number(budget.__v ?? 0),
      settlementDueAt: budget.settlementDueAt as Date | undefined,
      settlementSubmittedAt: budget.settlementSubmittedAt as Date | undefined,
      isSettlementLate: budget.isSettlementLate === true,
      acceptedTotal:
        budget.acceptedTotal == null ? undefined : money(budget.acceptedTotal),
      settlementBalance:
        budget.settlementBalance == null
          ? undefined
          : money(budget.settlementBalance),
      recoveryAmount:
        budget.recoveryAmount == null
          ? undefined
          : money(budget.recoveryAmount),
      recoveryDueAt: budget.recoveryDueAt as Date | undefined,
      refundedTotal: money(budget.refundedTotal),
      lines: ((budget.lines ?? []) as Doc[]).map((line) => ({
        category: String(line.category),
        approvedAmount: money(line.approvedAmount),
      })),
      expenses,
      totals: financeTotals(
        money(budget.approvedTotal),
        flows.reduce((sum, flow) => sum + money(flow.amount), 0),
        expenses,
      ),
      task: task
        ? {
            id: String(task._id),
            assigneeId: task.assigneeId ? String(task.assigneeId) : undefined,
          }
        : undefined,
      history: logs.map((l) => ({
        action: String(l.action),
        at: l.at as Date,
        snapshot: l.after,
        reason: l.reason as string | undefined,
      })),
    };
  }
  return {
    async list(clubId) {
      const docs = await m
        .eventBudgets!.find(clubId ? { clubId: oid(clubId) } : {})
        .sort({ createdAt: -1, _id: -1 })
        .select({ _id: 1 })
        .lean();
      return (
        await Promise.all(docs.map((d) => detail(String(d._id), clubId)))
      ).filter((d): d is FinanceDetail => d !== null);
    },
    find: detail,
    async act(id, clubId, actor, action, now) {
      await mongoose.connection.transaction(async (session) => {
        const actorId = oid(actor);
        const budgetId = oid(id);
        const found = await m
          .eventBudgets!.findOne({
            _id: budgetId,
            ...(clubId ? { clubId: oid(clubId) } : {}),
          })
          .session(session)
          .lean();
        if (!found) throw new DomainError("budget not found", "not_found");
        if (clubId)
          await assertEventWriteAccess(
            session,
            oid(clubId),
            actorId,
            "club.expense.record",
            now,
          );
        else await assertAccountabilityOfficer(session, actorId);
        const locked = await m
          .eventBudgets!.findOneAndUpdate(
            { _id: budgetId, __v: action.revision },
            { $inc: { __v: 1 } },
            { session },
          )
          .lean();
        if (!locked)
          throw new DomainError(
            "budget changed; reload before continuing",
            "conflict",
          );
        const event = await m
          .events!.findOneAndUpdate(
            { _id: found.eventId },
            { $inc: { __v: 1 } },
            { session },
          )
          .lean();
        if (!event) throw new DomainError("event not found", "not_found");
        const current = (await detail(id, clubId, session))!;
        const eventClub = oid(current.clubId);
        let after: unknown = {};
        let reason: string | undefined;
        if (action.kind === "expense") {
          assertFinanceEditable(current.state);
          const existing = action.expenseId
            ? await m
                .expenses!.findOne({
                  _id: oid(action.expenseId),
                  eventBudgetId: budgetId,
                })
                .session(session)
                .lean()
            : null;
          if (action.expenseId && !existing)
            throw new DomainError("expense not found", "not_found");
          const expenseId = existing?._id ?? new Types.ObjectId();
          const line = current.lines.find(
            (l) => l.category === action.input.category,
          );
          const prior = current.expenses
            .filter(
              (e) =>
                e.id !== String(expenseId) &&
                e.category === action.input.category,
            )
            .reduce((sum, e) => sum + e.amount, 0);
          const fields = {
            ...action.input,
            amount: decimal(action.input.amount),
            isOutOfCategory: !line,
            isOverRemaining:
              prior + action.input.amount > (line?.approvedAmount ?? 0),
          };
          if (existing)
            await m.expenses!.updateOne(
              { _id: expenseId },
              { $set: fields },
              { session },
            );
          else
            await m.expenses!.create(
              [
                {
                  _id: expenseId,
                  clubId: eventClub,
                  eventBudgetId: budgetId,
                  eventId: event._id,
                  ...fields,
                  recordedBy: actorId,
                  createdAt: now,
                },
              ],
              { session },
            );
          // Recompute every category flag so editing an earlier row cannot leave stale exceptions.
          const updated = await m
            .expenses!.find({ eventBudgetId: budgetId })
            .sort({ createdAt: 1, _id: 1 })
            .session(session)
            .lean();
          const accumulated = new Map<string, number>();
          for (const item of updated) {
            const category = String(item.category);
            const sum = (accumulated.get(category) ?? 0) + money(item.amount);
            accumulated.set(category, sum);
            const approved = current.lines.find((l) => l.category === category);
            await m.expenses!.updateOne(
              { _id: item._id },
              {
                $set: {
                  isOutOfCategory: !approved,
                  isOverRemaining: sum > (approved?.approvedAmount ?? 0),
                },
              },
              { session },
            );
          }
          after = { expenseId, before: existing, input: action.input };
        } else if (action.kind === "evidence") {
          assertFinanceEditable(current.state);
          const expense = await m
            .expenses!.findOne({
              _id: oid(action.expenseId),
              eventBudgetId: budgetId,
            })
            .session(session)
            .lean();
          if (!expense) throw new DomainError("expense not found", "not_found");
          await m.financialEvidences!.create(
            [
              {
                expenseId: expense._id,
                ...action.input,
                uploadedBy: actorId,
                uploadedAt: now,
              },
            ],
            { session },
          );
          await m.expenses!.updateOne(
            { _id: expense._id },
            { $set: { hasEvidence: true } },
            { session },
          );
          after = { expenseId: expense._id, input: action.input };
        } else if (action.kind === "submit") {
          assertFinanceEditable(current.state);
          assertSettlementEvent(String(event.state), event.endAt as Date, now);
          if (!current.settlementDueAt)
            throw new DomainError("settlement deadline is missing", "conflict");
          await m.eventBudgets!.updateOne(
            { _id: budgetId },
            {
              $set: {
                state: "Settlement Submitted",
                settlementSubmittedAt: now,
                isSettlementLate:
                  current.isSettlementLate || now > current.settlementDueAt,
              },
            },
            { session },
          );
          await openAccountabilityTask(
            session,
            "BUDGET_SETTLEMENT",
            budgetId,
            eventClub,
            current.eventTitle,
            now,
          );
          after = {
            totals: current.totals,
            expenses: current.expenses,
            submittedAt: now,
          };
        } else if (action.kind === "claim") {
          if (current.state !== "Settlement Submitted")
            throw new DomainError("no settlement awaits review", "conflict");
          await claimAccountabilityTask(
            session,
            "BUDGET_SETTLEMENT",
            budgetId,
            actorId,
          );
        } else if (action.kind === "return") {
          if (current.state !== "Settlement Submitted")
            throw new DomainError("no settlement awaits review", "conflict");
          reason = action.reason.trim();
          await decideAccountabilityTask(
            session,
            "BUDGET_SETTLEMENT",
            budgetId,
            actorId,
            "Request revision",
            reason,
            now,
          );
          await m.eventBudgets!.updateOne(
            { _id: budgetId },
            {
              $set: { state: "Reconciliation Pending" },
              $unset: { settlementSubmittedAt: "" },
            },
            { session },
          );
        } else {
          const overdue = action.overdue === true;
          if (overdue) {
            if (
              !["Disbursed", "Reconciliation Pending"].includes(
                current.state,
              ) ||
              !current.settlementDueAt ||
              now <= current.settlementDueAt
            ) {
              throw new DomainError("settlement is not overdue", "conflict");
            }
          } else if (current.state !== "Settlement Submitted")
            throw new DomainError("no settlement awaits review", "conflict");
          const result = reconcileExpenses(
            current.totals,
            current.expenses,
            action.reviews,
          );
          if (!overdue)
            await decideAccountabilityTask(
              session,
              "BUDGET_SETTLEMENT",
              budgetId,
              actorId,
              "Approve",
              "Settlement reconciled",
              now,
            );
          else if (
            await accountabilityTask(session, "BUDGET_SETTLEMENT", budgetId)
          )
            throw new DomainError(
              "submitted settlement requires normal review",
              "conflict",
            );
          for (const review of action.reviews)
            await m.expenses!.updateOne(
              { _id: oid(review.expenseId), eventBudgetId: budgetId },
              {
                $set: {
                  reviewOutcome: review.outcome,
                  reviewReason: review.reason.trim(),
                },
              },
              { session },
            );
          const recoveryDueAt =
            result.recoveryAmount > 0
              ? new Date(now.getTime() + rules.recoveryDueDays * 86400000)
              : undefined;
          await m.eventBudgets!.updateOne(
            { _id: budgetId },
            {
              $set: {
                state: result.state,
                acceptedTotal: decimal(result.acceptedTotal),
                settlementBalance: decimal(result.settlementBalance),
                recoveryAmount: decimal(result.recoveryAmount),
                ...(recoveryDueAt ? { recoveryDueAt } : {}),
                isSettlementLate: current.isSettlementLate || overdue,
              },
            },
            { session },
          );
          await m.financialReconciliations!.create(
            [
              {
                eventBudgetId: budgetId,
                ...Object.fromEntries(
                  Object.entries(current.totals)
                    .filter(([key]) => key !== "advanceTotal")
                    .map(([key, value]) => [key, decimal(value)]),
                ),
                disbursedTotal: decimal(current.totals.advanceTotal),
                acceptedTotal: decimal(result.acceptedTotal),
                settlementBalance: decimal(result.settlementBalance),
                outcome:
                  result.state === "Recovery Pending"
                    ? "Recovery Pending"
                    : "Reconciled",
                isOverdueSettlement: overdue,
                computedAt: now,
                ...(result.state === "Closed"
                  ? { closedBy: actorId, closedAt: now }
                  : {}),
              },
            ],
            { session },
          );
          after = {
            ...result,
            totals: current.totals,
            expenses: current.expenses,
            reviews: action.reviews,
            recoveryDueAt,
            overdue,
          };
        }
        await accountabilityAudit(
          session,
          "EventBudget",
          budgetId,
          eventClub,
          actorId,
          `SETTLEMENT_${action.kind.toUpperCase()}`,
          after,
          now,
          !clubId,
          reason,
        );
      });
      return (await detail(id, clubId))!;
    },
  };
}
