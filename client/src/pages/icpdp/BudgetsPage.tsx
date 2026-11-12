import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppMoneyInput } from "@/components/ui/money-input/AppMoneyInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useBudget, useBudgets, useRecordBudgetFlow } from "@/hooks/useBudgets";
import type { BudgetFlowKind, BudgetSummary } from "@/services/budgets";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/formatMoney";
import { useConfirm } from "@/hooks/useConfirm";
import { useFieldValidation } from "@/hooks/useFieldValidation";

const filters = ["all", "toAdvance", "disbursed", "reconcile", "topUp", "refund", "closed"] as const;
type Filter = typeof filters[number];

function matches(filter: Filter, budget: BudgetSummary): boolean {
  switch (filter) {
    case "toAdvance": return budget.state === "Approved";
    case "disbursed": return ["Disbursed", "Settlement Submitted", "Reconciliation Pending"].includes(budget.state);
    // UC37: a submitted settlement, or an advance whose settlement deadline has passed (A2).
    case "reconcile": return budget.state === "Settlement Submitted" || (["Disbursed", "Reconciliation Pending"].includes(budget.state)
      && Boolean(budget.settlementDueAt && new Date(budget.settlementDueAt) < new Date()));
    case "topUp": return budget.state === "Reconciled";
    case "refund": return budget.state === "Recovery Pending";
    case "closed": return ["Closed", "Cancelled"].includes(budget.state);
    default: return true;
  }
}

function stateLabel(t: TFunction, state: string): string {
  switch (state) {
    case "Approved": return t("budgets.stateApproved");
    case "Disbursed": return t("budgets.stateDisbursed");
    case "Settlement Submitted": return t("budgets.stateSettlementSubmitted");
    case "Reconciliation Pending": return t("budgets.stateReconciliationPending");
    case "Reconciled": return t("budgets.stateReconciled");
    case "Recovery Pending": return t("budgets.stateRecoveryPending");
    case "Closed": return t("budgets.stateClosed");
    case "Cancelled": return t("budgets.stateCancelled");
    default: return state;
  }
}

function stateTone(state: string): AppBadgeTone {
  return state === "Approved" ? "info" : state === "Recovery Pending" || state === "Reconciled" ? "warning"
    : state === "Closed" ? "success" : state === "Cancelled" ? "danger" : "neutral";
}

function kindLabel(t: TFunction, kind: BudgetFlowKind): string {
  return kind === "Advance" ? t("budgets.kindAdvance") : kind === "TopUp" ? t("budgets.kindTopUp") : t("budgets.kindRefund");
}

function filterLabel(t: TFunction, filter: Filter): string {
  switch (filter) {
    case "toAdvance": return t("budgets.filterToAdvance");
    case "disbursed": return t("budgets.filterDisbursed");
    case "reconcile": return t("budgets.filterReconcile");
    case "topUp": return t("budgets.filterTopUp");
    case "refund": return t("budgets.filterRefund");
    case "closed": return t("budgets.filterClosed");
    default: return t("budgets.filterAll");
  }
}

/** Sign-in and role gate shared by both budget pages. */
function Gate({ children }: { children: (csrfToken: string) => ReactNode }) {
  const { t } = useTranslation();
  const auth = useAuth();
  if (auth.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>;
  if (!auth.data) return <AppNotice>
    <p>{t("budgets.signIn")}</p>
    <Link className="inline-block font-semibold text-primary-app hover:underline"
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>{t("budgets.signInLink")}</Link>
  </AppNotice>;
  if (!auth.data.systemRoles.includes("ICPDP_OFFICER")) {
    return <AppNotice tone="danger" role="alert">{t("budgets.unauthorized")}</AppNotice>;
  }
  return <>{children(auth.data.csrfToken)}</>;
}

function BudgetList() {
  const { t, i18n } = useTranslation();
  const list = useBudgets(true);
  const [filter, setFilter] = useState<Filter>("all");
  function money(value: number) {
    return formatMoney(value, i18n.language);
  }
  function day(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  }

  if (list.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>;
  if (list.isError) return <AppNotice tone="danger" role="alert" title={list.error.message || t("budgets.loadError")}>
    <AppButton variant="secondary" onClick={() => void list.refetch()}>{t("budgets.retry")}</AppButton>
  </AppNotice>;
  const shown = list.data.filter((budget) => matches(filter, budget));
  return (
    <>
      <div role="group" aria-label={t("budgets.title")} className="mb-5 inline-flex flex-wrap gap-1 rounded-lg border border-border-app bg-surface-app p-1">{filters.map((value) => {
        const count = list.data.filter((budget) => matches(value, budget)).length;
        return <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
          className={cn("inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app sm:min-h-9", {
            "bg-segment-app text-text-app shadow-xs": filter === value,
          })}>{filterLabel(t, value)} · {count}</button>;
      })}</div>
      {shown.length ? (
        <ul className="divide-y divide-border-app rounded-2xl border border-border-app bg-bg-app shadow-xs">{shown.map((budget) => {
          const remaining = budget.approvedTotal - budget.disbursedTotal;
          return <li key={budget.id}>
            <Link to={`/workspace/budgets/${budget.id}`}
              className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-app bg-bg-app text-muted-app">
                <AppIcon name="file" />
              </span>
              <span className="min-w-0 flex-1 basis-64">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-heading text-base font-semibold break-words">{budget.eventTitle}</span>
                  <AppBadge tone={stateTone(budget.state)}>{stateLabel(t, budget.state)}</AppBadge>
                </span>
                <span className="mt-1 block text-sm text-muted-app">
                  {budget.clubName} · {t("budgets.eventOn", { date: day(budget.eventStartAt) })}
                  {budget.settlementDueAt && ` · ${t("budgets.settlementDueValue", { date: day(budget.settlementDueAt) })}`}
                </span>
              </span>
              {/* Same minimum width on every row so the amount columns line up down the list. */}
              <span className="grid w-full grid-cols-[1fr_auto] gap-x-6 text-sm tabular-nums sm:w-auto sm:min-w-72">
                <span className="text-muted-app">{t("budgets.approved")}</span><span className="text-right font-semibold">{money(budget.approvedTotal)}</span>
                <span className="text-muted-app">{t("budgets.transferred")}</span><span className="text-right">{money(budget.disbursedTotal)}</span>
                {remaining > 0 && ["Approved", "Disbursed"].includes(budget.state) && <>
                  <span className="text-muted-app">{t("budgets.remaining")}</span><span className="text-right">{money(remaining)}</span></>}
              </span>
            </Link>
          </li>;
        })}</ul>
      ) : (
        <AppEmptyState variant="boxed" icon="sparkles" title={t("budgets.none")} message={t("budgets.noneHint")} />
      )}
    </>
  );
}

export function BudgetsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("budgets.title")} description={t("budgets.description")} />
      <Gate>{() => <BudgetList />}</Gate>
    </>
  );
}

function todayInput(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function BudgetDetailView({ id, csrfToken }: { id: string; csrfToken: string }) {
  const { t, i18n } = useTranslation();
  const askConfirm = useConfirm();
  const budget = useBudget(id, true);
  const record = useRecordBudgetFlow();
  const [amount, setAmount] = useState<string | null>(null);
  const [date, setDate] = useState(todayInput());
  const [paymentReference, setPaymentReference] = useState("");
  const [note, setNote] = useState("");
  const allowedFlow = budget.data?.allowed;
  const amountValue = amount ?? String(allowedFlow?.exact ?? allowedFlow?.max ?? "");
  const amountNumber = Number(amountValue);
  const field = useFieldValidation(allowedFlow ? {
    amount: !amountValue.trim() ? t("common.fieldRequired") : !Number.isInteger(amountNumber) || amountNumber <= 0
      || amountNumber > allowedFlow.max || (allowedFlow.exact !== undefined && amountNumber !== allowedFlow.exact)
      ? t("budgets.amountInvalid") : null,
    date: !date ? t("common.fieldRequired") : date > todayInput() ? t("budgets.dateInvalid") : null,
  } : {});
  function money(value: number) {
    return formatMoney(value, i18n.language);
  }
  function day(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  }
  const back = { to: "/workspace/budgets", label: t("budgets.back") };

  if (budget.isPending) return <div className="space-y-4"><AppSkeleton className="h-10 w-1/2" /><AppSkeleton className="h-96 w-full" /></div>;
  if (budget.isError) return <>
    <PageHeader title={t("budgets.budget")} back={back} />
    <AppNotice tone="danger" role="alert" title={budget.error.message || t("budgets.loadError")}>
      <AppButton variant="secondary" onClick={() => void budget.refetch()}>{t("budgets.retry")}</AppButton>
    </AppNotice>
  </>;

  const data = budget.data;
  const allowed = data.allowed;
  const label = "text-xs text-muted-app";
  const remaining = data.approvedTotal - data.disbursedTotal;
  const eventClosed = ["Cancelled", "Rejected", "Expired"].includes(data.eventState);

  async function submit() {
    if (!allowed || !field.touchAll()) return;
    const value = amountNumber;
    if (!(await askConfirm(t("budgets.confirm", { kind: kindLabel(t, allowed.kind).toLowerCase(), amount: money(value) })))) return;
    // Noon local time keeps the chosen calendar day whatever the time zone.
    const disbursedAt = date === todayInput() ? new Date() : new Date(`${date}T12:00:00`);
    try {
      await record.mutateAsync({ id, csrfToken, input: { kind: allowed.kind, amount: value,
        disbursedAt: disbursedAt.toISOString(), paymentReference: paymentReference.trim() || undefined,
        note: note.trim() || undefined } });
      setAmount(null); setPaymentReference(""); setNote("");
      field.reset();
    } catch { /* Mutation state is rendered below. */ }
  }

  const heading = allowed?.kind === "TopUp" ? t("budgets.recordTopUp") : allowed?.kind === "Refund"
    ? t("budgets.recordRefund") : t("budgets.recordAdvance");
  const hint = allowed?.kind === "TopUp" ? t("budgets.topUpHint", { amount: money(allowed.exact ?? allowed.max) })
    : allowed?.kind === "Refund" ? t("budgets.refundHint", { amount: money(allowed.max) }) : t("budgets.advanceHint");

  return (
    <>
      <PageHeader title={data.eventTitle} back={back}
        description={`${data.clubName} · ${t("budgets.eventOn", { date: day(data.eventStartAt) })}`}
        actions={<>
          <AppBadge tone={stateTone(data.state)}>{stateLabel(t, data.state)}</AppBadge>
          <Link className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border-app bg-bg-app px-3.5 text-sm font-medium text-text-app shadow-xs transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app sm:min-h-9"
            to={`/workspace/budgets/${id}/reconciliation`}>{t("accountability.review")}<AppIcon name="chevronRight" className="size-4" /></Link>
        </>} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <dl className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
            <div className="rounded-xl border border-border-app bg-bg-app p-4 shadow-xs"><dt className={label}>{t("budgets.approved")}</dt><dd className="mt-1 text-lg font-semibold break-words tabular-nums sm:text-xl">{money(data.approvedTotal)}</dd></div>
            <div className="rounded-xl border border-border-app bg-bg-app p-4 shadow-xs"><dt className={label}>{t("budgets.transferred")}</dt><dd className="mt-1 text-lg font-semibold break-words tabular-nums sm:text-xl">{money(data.disbursedTotal)}</dd></div>
            {data.refundedTotal > 0 || data.state === "Recovery Pending"
              ? <div className="rounded-xl border border-border-app bg-bg-app p-4 shadow-xs"><dt className={label}>{t("budgets.refunded")}</dt><dd className="mt-1 text-lg font-semibold break-words tabular-nums sm:text-xl">{money(data.refundedTotal)}</dd></div>
              : <div className="rounded-xl border border-border-app bg-bg-app p-4 shadow-xs"><dt className={label}>{t("budgets.remaining")}</dt><dd className="mt-1 text-lg font-semibold break-words tabular-nums sm:text-xl">{money(Math.max(remaining, 0))}</dd></div>}
            <div className="rounded-xl border border-border-app bg-bg-app p-4 shadow-xs"><dt className={label}>{t("budgets.settlementDue")}</dt><dd className="mt-1 text-lg font-semibold break-words tabular-nums sm:text-xl">{data.settlementDueAt ? day(data.settlementDueAt) : "—"}</dd></div>
          </dl>

          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("budgets.lines")}</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border-app bg-bg-app">
              <table className="w-full min-w-[22rem] text-left text-sm">
                <thead className="bg-surface-app"><tr className="text-xs text-muted-app">
                  <th scope="col" className="px-4 py-2.5 font-medium">{t("budgets.category")}</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">{t("budgets.requestedAmount")}</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">{t("budgets.approvedAmount")}</th>
                </tr></thead>
                <tbody>{data.lines.map((line, index) =>
                  <tr key={index} className="border-t border-border-app align-top">
                    <td className="px-4 py-3 font-medium break-words">{line.category}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(line.requestedAmount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(line.approvedAmount)}
                      {line.reason && <p className="mt-0.5 text-xs text-muted-app">{line.reason}</p>}</td>
                  </tr>)}</tbody>
                <tfoot><tr className="border-t border-border-app bg-surface-app font-semibold">
                  <td className="px-4 py-3">{t("budgets.total")}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(data.requestedTotal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(data.approvedTotal)}</td>
                </tr></tfoot>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("budgets.flows")}</h2>
            {data.flows.length ? <ol className="mt-4 ml-1 space-y-4 border-l-2 border-border-app pl-5">{[...data.flows].reverse().map((flow) =>
              <li key={flow.id} className="relative">
                <span aria-hidden="true" className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-brand-app" />
                <p className="font-medium">{kindLabel(t, flow.kind)} · <span className="tabular-nums">{money(flow.amount)}</span></p>
                <p className="text-sm text-muted-app">{day(flow.disbursedAt)}
                  {flow.paymentReference && ` · ${t("budgets.reference", { value: flow.paymentReference })}`}
                  {` · ${t("budgets.flowBy", { name: flow.recordedByName ?? flow.recordedBy })}`}</p>
                {flow.note && <p className="mt-1 text-sm break-words">{flow.note}</p>}
              </li>)}</ol>
              : <div className="mt-3"><AppEmptyState message={t("budgets.noFlows")} /></div>}
          </section>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-24">
          {allowed ? (
            <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
              <h2 className="font-heading text-base font-semibold">{heading}</h2>
              <p className="mt-1 text-sm text-muted-app">{hint}</p>
              <label className="mt-4 block text-sm font-medium text-text-app">{t("budgets.amount")}<AppRequiredMark />
                <AppMoneyInput value={amountValue}
                  readOnly={allowed.exact !== undefined} {...field.control("amount")} onValueChange={setAmount}
                  className="mt-1.5 w-full font-normal tabular-nums" />
                <AppFieldError message={field.error("amount")} />
                <span className="mt-1 block text-xs font-normal text-muted-app">{t("budgets.amountMax", { amount: money(allowed.max) })}</span></label>
              <label className="mt-4 block text-sm font-medium text-text-app">{t("budgets.date")}<AppRequiredMark />
                <AppInput type="date" value={date} max={todayInput()} {...field.control("date")}
                  onChange={(e) => setDate(e.target.value)} className="mt-1.5 block w-full font-normal" />
                <AppFieldError message={field.error("date")} /></label>
              <label className="mt-4 block text-sm font-medium text-text-app">{t("budgets.paymentReference")}
                <AppInput value={paymentReference} maxLength={100} placeholder={t("budgets.paymentReferenceHint")}
                  onChange={(e) => setPaymentReference(e.target.value)} className="mt-1.5 block w-full font-normal" /></label>
              <label className="mt-4 block text-sm font-medium text-text-app">{t("budgets.note")}
                <AppInput value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className="mt-1.5 block w-full font-normal" /></label>
              <AppButton className="mt-6 w-full" disabled={record.isPending} onClick={() => void submit()}>
                {record.isPending ? t("budgets.submitting") : t("budgets.submit")}</AppButton>
              {record.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{record.error.message}</p>}
            </section>
          ) : (
            <AppNotice>{eventClosed ? t("budgets.eventClosed") : t("budgets.nothingToRecord")}</AppNotice>
          )}
          {record.isSuccess && <AppNotice role="status" className="mt-4">{t("budgets.success")}</AppNotice>}
        </aside>
      </div>
    </>
  );
}

export function BudgetDetailPage() {
  const { id } = useParams();
  return <Gate>{(csrfToken) => id ? <BudgetDetailView id={id} csrfToken={csrfToken} /> : null}</Gate>;
}
