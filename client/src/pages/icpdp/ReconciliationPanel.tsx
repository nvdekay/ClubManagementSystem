import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useReconciliation, useReconciliationAction } from "@/hooks/useBudgets";
import type { ExpenseReviewOutcome, ReconciliationExpense } from "@/services/budgets";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/formatMoney";

type Severity = "MINOR" | "MODERATE" | "SERIOUS";
type Review = { outcome: ExpenseReviewOutcome; reason: string };

function flagged(expense: ReconciliationExpense): boolean {
  return expense.isOutOfCategory || expense.isOverRemaining;
}

/** UC37: totals, per-expense review and the settlement result, shown under a budget. */
export function ReconciliationPanel({ id, csrfToken }: { id: string; csrfToken: string }) {
  const { t, i18n } = useTranslation();
  const view = useReconciliation(id, true);
  const action = useReconciliationAction();
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [message, setMessage] = useState("");
  const [asking, setAsking] = useState(false);
  const [severity, setSeverity] = useState<Severity>("MODERATE");
  const [formError, setFormError] = useState<string | null>(null);
  function money(value: number) {
    return formatMoney(value, i18n.language);
  }
  function day(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  }

  if (view.isPending) return <AppSkeleton className="h-64 w-full" />;
  if (view.isError) return <AppNotice tone="danger" role="alert">{view.error.message}</AppNotice>;
  const data = view.data;
  const { totals } = data;
  const label = "text-xs font-semibold tracking-wide text-muted-app uppercase";

  function reviewOf(expense: ReconciliationExpense): Review {
    if (!expense.hasEvidence) return { outcome: "Rejected", reason: "" };
    return reviews[expense.id] ?? { outcome: "Accepted", reason: "" };
  }
  function setReview(expenseId: string, change: Partial<Review>) {
    setReviews((current) => ({ ...current, [expenseId]: { ...(current[expenseId] ?? { outcome: "Accepted", reason: "" }), ...change } }));
  }

  const acceptedRaw = data.expenses.filter((item) => reviewOf(item).outcome === "Accepted").reduce((sum, item) => sum + item.amount, 0);
  const accepted = Math.min(acceptedRaw, totals.approvedTotal);
  const balance = accepted - totals.advancedTotal;

  async function reconcile() {
    const missing = data.expenses.some((item) => item.hasEvidence
      && (flagged(item) || reviewOf(item).outcome === "Rejected") && !reviewOf(item).reason.trim());
    setFormError(missing ? t("budgets.recMissingReason") : null);
    if (missing || !window.confirm(t("budgets.recConfirm"))) return;
    const payload = data.expenses.filter((item) => item.hasEvidence && (flagged(item) || reviews[item.id]))
      .map((item) => ({ expenseId: item.id, outcome: reviewOf(item).outcome, reason: reviewOf(item).reason.trim() || undefined }));
    try {
      await action.mutateAsync({ id, csrfToken, action: { kind: "reconcile", reviews: payload } });
      setReviews({});
    } catch { /* Mutation state is rendered below. */ }
  }

  async function askEvidence() {
    if (!message.trim()) {
      setFormError(t("budgets.recAskEvidenceMissing"));
      return;
    }
    setFormError(null);
    try {
      await action.mutateAsync({ id, csrfToken, action: { kind: "evidence", message: message.trim() } });
      setMessage(""); setAsking(false);
    } catch { /* Mutation state is rendered below. */ }
  }

  const figures: [string, number][] = [
    [t("budgets.recApproved"), totals.approvedTotal], [t("budgets.recAdvanced"), totals.advancedTotal],
    [t("budgets.recRecorded"), totals.recordedTotal], [t("budgets.recSupported"), totals.supportedTotal],
    [t("budgets.recUnsupported"), totals.unsupportedTotal], [t("budgets.recRemaining"), totals.remaining],
  ];

  return (
    <section className="border-t border-border-app pt-8">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-heading text-xl font-bold">{t("budgets.recTitle")}</h2>
        {data.isSettlementLate && <AppBadge tone="warning">{t("budgets.recLate")}</AppBadge>}
      </div>
      <p className="mt-1 text-sm text-muted-app">{data.settlementSubmittedAt
        ? t("budgets.recSubmittedOn", { date: day(data.settlementSubmittedAt) }) : t("budgets.recHint")}</p>

      <dl className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3">{figures.map(([name, value]) =>
        <div key={name}><dt className={label}>{name}</dt><dd className="mt-1 font-heading text-lg font-bold tabular-nums">{money(value)}</dd></div>)}</dl>

      {data.lastEvidenceRequest && <p className="mt-4 text-sm break-words text-muted-app">
        {t("budgets.recLastRequest", { date: day(data.lastEvidenceRequest.at), message: data.lastEvidenceRequest.message })}</p>}
      {data.mode === "overdue" && <AppNotice tone="warning" className="mt-4">{t("budgets.recOverdue")}</AppNotice>}
      {!data.mode && !data.result && <p className="mt-4 text-sm text-muted-app">{t("budgets.recNotYet")}</p>}

      <h3 className="mt-8 font-heading text-lg font-bold">{t("budgets.recExpenses")}</h3>
      {data.expenses.length ? <ul className="mt-3 divide-y divide-border-app border-y border-border-app">{data.expenses.map((expense) => {
        const review = reviewOf(expense);
        return <li key={expense.id} className="py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold break-words">{expense.category}</p>
              <p className="text-sm text-muted-app">{t("budgets.recSpentOn", { date: day(expense.spentAt) })}
                {expense.description && ` · ${expense.description}`}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {!expense.hasEvidence && <AppBadge tone="danger">{t("budgets.recNoEvidence")}</AppBadge>}
                {expense.isOutOfCategory && <AppBadge tone="warning">{t("budgets.recOutOfCategory")}</AppBadge>}
                {expense.isOverRemaining && <AppBadge tone="warning">{t("budgets.recOverRemaining")}</AppBadge>}
                {expense.evidence.map((item) => <a key={item.id} href={item.externalLink} target="_blank" rel="noreferrer"
                  className="text-sm font-semibold text-accent-app">{item.type}</a>)}
              </div>
            </div>
            <span className="font-heading font-bold tabular-nums">{money(expense.amount)}</span>
          </div>
          {data.mode ? (expense.hasEvidence ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
              <div role="radiogroup" aria-label={t("budgets.recDecision")} className="flex gap-2">
                {(["Accepted", "Rejected"] as const).map((value) => <button key={value} type="button" role="radio"
                  aria-checked={review.outcome === value} onClick={() => setReview(expense.id, { outcome: value })}
                  className={cn("min-h-11 rounded-xl border border-border-app px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring-app", {
                    "border-primary-app bg-primary-soft-app text-primary-app": review.outcome === value,
                  })}>{value === "Accepted" ? t("budgets.recAccept") : t("budgets.recReject")}</button>)}
              </div>
              <AppInput value={review.reason} maxLength={1000} onChange={(e) => setReview(expense.id, { reason: e.target.value })}
                aria-label={t("budgets.recReason")} className="w-full"
                placeholder={flagged(expense) || review.outcome === "Rejected" ? t("budgets.recReasonFlagged") : t("budgets.recReason")} />
            </div>
          ) : <p className="mt-2 text-sm text-danger-app">{t("budgets.recAlwaysRejected")}</p>)
            : expense.reviewOutcome && <p className="mt-2 text-sm text-muted-app">{t("budgets.recReviewed", {
              outcome: expense.reviewOutcome === "Accepted" ? t("budgets.outcomeAccepted") : t("budgets.outcomeRejected") })}
            {expense.reviewReason && ` · ${expense.reviewReason}`}</p>}
        </li>;
      })}</ul> : <p className="mt-3 text-sm text-muted-app">{t("budgets.recNoExpenses")}</p>}

      {data.mode && <div className="mt-6 rounded-2xl bg-surface-app p-5">
        <h3 className="font-heading text-lg font-bold">{t("budgets.recPreview")}</h3>
        <dl className="mt-3 grid grid-cols-2 gap-4">
          <div><dt className={label}>{t("budgets.recAccepted")}</dt><dd className="mt-1 font-bold tabular-nums">{money(accepted)}</dd></div>
          <div><dt className={label}>{t("budgets.recBalance")}</dt><dd className="mt-1 font-bold tabular-nums">{money(balance)}</dd></div>
        </dl>
        <p className="mt-3 text-sm">{balance === 0 ? t("budgets.recOutcomeClosed") : balance > 0
          ? t("budgets.recOutcomeTopUp", { amount: money(balance) }) : t("budgets.recOutcomeRefund", { amount: money(-balance) })}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <AppButton disabled={action.isPending} onClick={() => void reconcile()}>
            {action.isPending ? t("budgets.recSubmitting") : t("budgets.recSubmit")}</AppButton>
          {data.canRequestEvidence && !asking && <AppButton variant="secondary" onClick={() => setAsking(true)}>{t("budgets.recAskEvidence")}</AppButton>}
        </div>
        {asking && <div className="mt-4">
          <p className="text-xs text-muted-app">{t("budgets.recAskEvidenceHint")}</p>
          <label className="mt-2 block text-sm font-semibold">{t("budgets.recAskEvidenceMessage")}
            <AppTextarea className="mt-2 min-h-20 w-full font-normal" value={message} maxLength={2000} onChange={(e) => setMessage(e.target.value)} /></label>
          <AppButton className="mt-3" variant="secondary" disabled={action.isPending} onClick={() => void askEvidence()}>{t("budgets.recAskEvidenceSubmit")}</AppButton>
        </div>}
      </div>}

      {data.result && <div className="mt-6 rounded-2xl bg-surface-app p-5">
        <h3 className="font-heading text-lg font-bold">{t("budgets.recResult")}</h3>
        <p className="mt-1 text-sm text-muted-app">{t("budgets.recComputedOn", { date: day(data.result.computedAt) })}</p>
        <dl className="mt-3 grid grid-cols-2 gap-4">
          <div><dt className={label}>{t("budgets.recAccepted")}</dt><dd className="mt-1 font-bold tabular-nums">{money(data.result.acceptedTotal)}</dd></div>
          <div><dt className={label}>{t("budgets.recBalance")}</dt><dd className="mt-1 font-bold tabular-nums">{money(data.result.settlementBalance)}</dd></div>
        </dl>
        {data.result.recoveryDueAt && <p className="mt-3 text-sm">{t("budgets.recRecoveryDue", { date: day(data.result.recoveryDueAt) })}</p>}
        {data.caseId ? <Link className="mt-3 inline-block font-semibold text-accent-app" to={`/workspace/violations/${data.caseId}`}>{t("budgets.recCaseOpened")}</Link>
          : data.recoveryOverdue && <div className="mt-4">
            <AppNotice tone="danger">{t("budgets.recRecoveryOverdue")}</AppNotice>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <AppSelect className="w-48" label={t("budgets.recSeverity")} value={severity} onChange={setSeverity}
                options={(["MINOR", "MODERATE", "SERIOUS"] as const).map((value) => ({ value, label: value === "MINOR"
                  ? t("violations.severityMINOR") : value === "MODERATE" ? t("violations.severityMODERATE") : t("violations.severitySERIOUS") }))} />
              <AppButton variant="secondary" disabled={action.isPending}
                onClick={() => void action.mutateAsync({ id, csrfToken, action: { kind: "case", severity } }).catch(() => undefined)}>
                {t("budgets.recOpenCase")}</AppButton>
            </div>
          </div>}
      </div>}
      {formError && <p role="alert" className="mt-3 text-sm text-danger-app">{formError}</p>}
      {action.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{action.error.message}</p>}
      {action.isSuccess && <AppNotice role="status" className="mt-4">{t("budgets.recDone")}</AppNotice>}
    </section>
  );
}
