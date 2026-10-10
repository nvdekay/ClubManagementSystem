import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useBudget, useBudgets, useRecordBudgetFlow } from "@/hooks/useBudgets";
import type { BudgetFlowKind, BudgetSummary } from "@/services/budgets";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/formatMoney";

const filters = ["all", "toAdvance", "disbursed", "topUp", "refund", "closed"] as const;
type Filter = typeof filters[number];

function matches(filter: Filter, budget: BudgetSummary): boolean {
  switch (filter) {
    case "toAdvance": return budget.state === "Approved";
    case "disbursed": return ["Disbursed", "Settlement Submitted", "Reconciliation Pending"].includes(budget.state);
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
    <Link className="inline-block font-semibold text-accent-app"
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
      <div role="group" aria-label={t("budgets.title")} className="mb-6 flex flex-wrap gap-2">{filters.map((value) => {
        const count = list.data.filter((budget) => matches(value, budget)).length;
        return <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
          className={cn("min-h-11 rounded-full border border-border-app px-4 text-sm font-semibold text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app", {
            "border-primary-app bg-primary-soft-app text-primary-app hover:text-primary-app": filter === value,
          })}>{filterLabel(t, value)} · {count}</button>;
      })}</div>
      {shown.length ? (
        <ul className="divide-y divide-border-app border-y border-border-app">{shown.map((budget) => {
          const remaining = budget.approvedTotal - budget.disbursedTotal;
          return <li key={budget.id}>
            <Link to={`/workspace/budgets/${budget.id}`}
              className="flex flex-wrap items-center gap-x-6 gap-y-3 px-2 py-5 hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app">
              <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft-app text-primary-app">
                <AppIcon name="file" />
              </span>
              <span className="min-w-0 flex-1 basis-64">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-heading text-lg font-bold break-words">{budget.eventTitle}</span>
                  <AppBadge tone={stateTone(budget.state)}>{stateLabel(t, budget.state)}</AppBadge>
                </span>
                <span className="mt-1 block text-sm text-muted-app">
                  {budget.clubName} · {t("budgets.eventOn", { date: day(budget.eventStartAt) })}
                  {budget.settlementDueAt && ` · ${t("budgets.settlementDueValue", { date: day(budget.settlementDueAt) })}`}
                </span>
              </span>
              <span className="grid grid-cols-2 gap-x-6 text-right text-sm tabular-nums">
                <span className="text-muted-app">{t("budgets.approved")}</span><span className="font-semibold">{money(budget.approvedTotal)}</span>
                <span className="text-muted-app">{t("budgets.transferred")}</span><span>{money(budget.disbursedTotal)}</span>
                {remaining > 0 && ["Approved", "Disbursed"].includes(budget.state) && <>
                  <span className="text-muted-app">{t("budgets.remaining")}</span><span>{money(remaining)}</span></>}
              </span>
            </Link>
          </li>;
        })}</ul>
      ) : (
        <div className="py-16 text-center">
          <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-mint-soft-app text-mint-app"><AppIcon name="sparkles" className="size-7" /></span>
          <h2 className="mt-4 font-heading text-xl font-bold">{t("budgets.none")}</h2>
          <p className="mt-2 text-sm text-muted-app">{t("budgets.noneHint")}</p>
        </div>
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
  const budget = useBudget(id, true);
  const record = useRecordBudgetFlow();
  const [amount, setAmount] = useState<string | null>(null);
  const [date, setDate] = useState(todayInput());
  const [paymentReference, setPaymentReference] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
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
  const amountValue = amount ?? String(allowed?.exact ?? allowed?.max ?? "");
  const label = "text-xs font-semibold tracking-wide text-muted-app uppercase";
  const remaining = data.approvedTotal - data.disbursedTotal;
  const eventClosed = ["Cancelled", "Rejected", "Expired"].includes(data.eventState);

  async function submit() {
    if (!allowed) return;
    const value = Number(amountValue);
    const invalid = !Number.isInteger(value) || value <= 0 || value > allowed.max
      || (allowed.exact !== undefined && value !== allowed.exact) ? t("budgets.amountInvalid")
      : !date || date > todayInput() ? t("budgets.dateInvalid") : null;
    setFormError(invalid);
    if (invalid) return;
    if (!window.confirm(t("budgets.confirm", { kind: kindLabel(t, allowed.kind).toLowerCase(), amount: money(value) }))) return;
    // Noon local time keeps the chosen calendar day whatever the time zone.
    const disbursedAt = date === todayInput() ? new Date() : new Date(`${date}T12:00:00`);
    try {
      await record.mutateAsync({ id, csrfToken, input: { kind: allowed.kind, amount: value,
        disbursedAt: disbursedAt.toISOString(), paymentReference: paymentReference.trim() || undefined,
        note: note.trim() || undefined } });
      setAmount(null); setPaymentReference(""); setNote("");
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
        actions={<AppBadge tone={stateTone(data.state)}>{stateLabel(t, data.state)}</AppBadge>} />
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-10">
          <dl className="grid gap-5 sm:grid-cols-4">
            <div><dt className={label}>{t("budgets.approved")}</dt><dd className="mt-1 font-heading text-xl font-bold tabular-nums">{money(data.approvedTotal)}</dd></div>
            <div><dt className={label}>{t("budgets.transferred")}</dt><dd className="mt-1 font-heading text-xl font-bold tabular-nums">{money(data.disbursedTotal)}</dd></div>
            {data.refundedTotal > 0 || data.state === "Recovery Pending"
              ? <div><dt className={label}>{t("budgets.refunded")}</dt><dd className="mt-1 font-heading text-xl font-bold tabular-nums">{money(data.refundedTotal)}</dd></div>
              : <div><dt className={label}>{t("budgets.remaining")}</dt><dd className="mt-1 font-heading text-xl font-bold tabular-nums">{money(Math.max(remaining, 0))}</dd></div>}
            <div><dt className={label}>{t("budgets.settlementDue")}</dt><dd className="mt-1 font-medium">{data.settlementDueAt ? day(data.settlementDueAt) : "—"}</dd></div>
          </dl>

          <section className="border-t border-border-app pt-8">
            <h2 className="font-heading text-xl font-bold">{t("budgets.lines")}</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead><tr className="border-b border-border-app text-muted-app">
                  <th scope="col" className="py-2 pr-3 font-semibold">{t("budgets.category")}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("budgets.requestedAmount")}</th>
                  <th scope="col" className="py-2 text-right font-semibold">{t("budgets.approvedAmount")}</th>
                </tr></thead>
                <tbody className="divide-y divide-border-app">{data.lines.map((line, index) =>
                  <tr key={index} className="align-top">
                    <td className="py-2.5 pr-3 font-medium break-words">{line.category}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{money(line.requestedAmount)}</td>
                    <td className="py-2.5 text-right tabular-nums">{money(line.approvedAmount)}
                      {line.reason && <p className="mt-0.5 text-xs text-muted-app">{line.reason}</p>}</td>
                  </tr>)}</tbody>
                <tfoot><tr className="border-t border-border-app font-semibold">
                  <td className="py-2.5 pr-3">{t("budgets.total")}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{money(data.requestedTotal)}</td>
                  <td className="py-2.5 text-right tabular-nums">{money(data.approvedTotal)}</td>
                </tr></tfoot>
              </table>
            </div>
          </section>

          <section className="border-t border-border-app pt-8">
            <h2 className="font-heading text-xl font-bold">{t("budgets.flows")}</h2>
            {data.flows.length ? <ol className="mt-5 space-y-4 border-l-2 border-border-app pl-5">{[...data.flows].reverse().map((flow) =>
              <li key={flow.id} className="relative">
                <span aria-hidden="true" className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-primary-app" />
                <p className="font-semibold">{kindLabel(t, flow.kind)} · <span className="tabular-nums">{money(flow.amount)}</span></p>
                <p className="text-sm text-muted-app">{day(flow.disbursedAt)}
                  {flow.paymentReference && ` · ${t("budgets.reference", { value: flow.paymentReference })}`}
                  {` · ${t("budgets.flowBy", { name: flow.recordedByName ?? flow.recordedBy })}`}</p>
                {flow.note && <p className="mt-1 text-sm break-words">{flow.note}</p>}
              </li>)}</ol>
              : <p className="mt-3 text-sm text-muted-app">{t("budgets.noFlows")}</p>}
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6">
          {allowed ? (
            <section className="rounded-2xl bg-surface-app p-5">
              <h2 className="font-heading text-lg font-bold">{heading}</h2>
              <p className="mt-1 text-sm text-muted-app">{hint}</p>
              <label className="mt-5 block text-sm font-semibold">{t("budgets.amount")}
                <AppInput type="number" min={1} max={allowed.max} step={1000} inputMode="numeric" value={amountValue}
                  readOnly={allowed.exact !== undefined} onChange={(e) => setAmount(e.target.value)}
                  className="mt-2 w-full font-normal tabular-nums" />
                <span className="mt-1 block text-xs font-normal text-muted-app">{t("budgets.amountMax", { amount: money(allowed.max) })}</span></label>
              <label className="mt-4 block text-sm font-semibold">{t("budgets.date")}
                <AppInput type="date" value={date} max={todayInput()} onChange={(e) => setDate(e.target.value)} className="mt-2 w-full font-normal" /></label>
              <label className="mt-4 block text-sm font-semibold">{t("budgets.paymentReference")}
                <AppInput value={paymentReference} maxLength={100} placeholder={t("budgets.paymentReferenceHint")}
                  onChange={(e) => setPaymentReference(e.target.value)} className="mt-2 w-full font-normal" /></label>
              <label className="mt-4 block text-sm font-semibold">{t("budgets.note")}
                <AppInput value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className="mt-2 w-full font-normal" /></label>
              <AppButton className="mt-6 w-full" disabled={record.isPending} onClick={() => void submit()}>
                {record.isPending ? t("budgets.submitting") : t("budgets.submit")}</AppButton>
              {formError && <p role="alert" className="mt-3 text-sm text-danger-app">{formError}</p>}
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
