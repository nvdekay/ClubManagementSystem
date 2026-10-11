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
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import {
  useDecidePeriodicReport, usePeriodicOverview, usePeriodicReport, useRecordMissingPeriodicReport,
} from "@/hooks/usePeriodicReports";
import {
  RETURN_SECTIONS, type PeriodicOutcome, type PeriodicReportRow, type ReturnSection, type Severity,
} from "@/services/periodicReports";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/formatMoney";

const filters = ["all", "waiting", "overdue", "accepted"] as const;
type Filter = typeof filters[number];
const severities: Severity[] = ["MINOR", "MODERATE", "SERIOUS"];

function matches(filter: Filter, row: PeriodicReportRow): boolean {
  switch (filter) {
    case "waiting": return row.state === "Submitted";
    case "overdue": return row.overdue;
    case "accepted": return row.state === "Accepted";
    default: return true;
  }
}

function filterLabel(t: TFunction, filter: Filter): string {
  return filter === "waiting" ? t("periodicReports.filterWaiting") : filter === "overdue" ? t("periodicReports.filterOverdue")
    : filter === "accepted" ? t("periodicReports.filterAccepted") : t("periodicReports.filterAll");
}

function stateLabel(t: TFunction, state: string | undefined): string {
  switch (state) {
    case "Draft": return t("periodicReports.stateDraft");
    case "Submitted": return t("periodicReports.stateSubmitted");
    case "Accepted": return t("periodicReports.stateAccepted");
    case "Returned for correction": return t("periodicReports.stateReturned");
    case undefined: return t("periodicReports.notSubmitted");
    default: return state;
  }
}

function stateTone(state: string | undefined): AppBadgeTone {
  return state === "Accepted" ? "success" : state === "Submitted" ? "info" : state === "Returned for correction" ? "warning" : "neutral";
}

function sectionLabel(t: TFunction, section: ReturnSection): string {
  switch (section) {
    case "narrative": return t("periodicReports.sectionNarrative");
    case "nextPlan": return t("periodicReports.sectionNextPlan");
    case "figures": return t("periodicReports.sectionFigures");
    case "evidence": return t("periodicReports.sectionEvidence");
    default: return t("periodicReports.sectionOther");
  }
}

function severityLabel(t: TFunction, value: Severity): string {
  return value === "MINOR" ? t("violations.severityMINOR") : value === "MODERATE" ? t("violations.severityMODERATE")
    : t("violations.severitySERIOUS");
}

function useDay() {
  const { i18n } = useTranslation();
  return function day(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  };
}

/** Sign-in and role gate shared by both periodic report pages. */
function Gate({ children }: { children: (csrfToken: string) => ReactNode }) {
  const { t } = useTranslation();
  const auth = useAuth();
  if (auth.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>;
  if (!auth.data) return <AppNotice>
    <p>{t("periodicReports.signIn")}</p>
    <Link className="inline-block font-semibold text-accent-app"
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>{t("periodicReports.signInLink")}</Link>
  </AppNotice>;
  if (!auth.data.systemRoles.includes("ICPDP_OFFICER")) {
    return <AppNotice tone="danger" role="alert">{t("periodicReports.unauthorized")}</AppNotice>;
  }
  return <>{children(auth.data.csrfToken)}</>;
}

function Row({ row, periodCode, csrfToken }: { row: PeriodicReportRow; periodCode: string; csrfToken: string }) {
  const { t } = useTranslation();
  const day = useDay();
  const record = useRecordMissingPeriodicReport();
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<Severity>("MINOR");
  const [note, setNote] = useState("");

  async function submit() {
    try {
      await record.mutateAsync({ csrfToken, input: { clubId: row.clubId, periodCode, severity, note: note.trim() || undefined } });
      setOpen(false);
    } catch { /* Mutation state is rendered below. */ }
  }

  return (
    <li className="px-2 py-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft-app text-primary-app">
          <AppIcon name="file" />
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-bold break-words">{row.clubName}</h2>
            <AppBadge tone={stateTone(row.state)}>{stateLabel(t, row.state)}</AppBadge>
            {row.overdue && <AppBadge tone="danger">{t("periodicReports.overdue")}</AppBadge>}
            {row.lateFlag && <AppBadge tone="warning">{t("periodicReports.late")}</AppBadge>}
          </div>
          <p className="mt-1 text-sm text-muted-app">{t("periodicReports.dueOn", { date: day(row.dueAt) })}
            {row.submittedAt && ` · ${t("periodicReports.submittedOn", { date: day(row.submittedAt) })}`}
            {row.versionNo && row.versionNo > 1 && ` · ${t("periodicReports.version", { number: row.versionNo })}`}</p>
        </div>
        {row.reportId && row.state !== "Draft" ? (
          <Link to={`/workspace/periodic-reports/${row.reportId}`} className="inline-flex items-center gap-1 font-semibold text-primary-app">
            {row.state === "Submitted" ? t("periodicReports.open") : t("periodicReports.view")}<AppIcon name="chevronRight" className="size-4" />
          </Link>
        ) : row.violationId ? (
          <Link className="font-semibold text-accent-app" to={`/workspace/violations/${row.violationId}`}>
            {t("periodicReports.recorded")} · {t("periodicReports.viewCase")}</Link>
        ) : row.overdue && !open && <AppButton variant="secondary" onClick={() => setOpen(true)}>{t("periodicReports.recordMissing")}</AppButton>}
      </div>
      {open && !row.violationId && (
        <div className="mt-4 rounded-2xl bg-surface-app p-4">
          <p className="text-sm text-muted-app">{t("periodicReports.missingHint")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <AppSelect className="w-full" label={t("periodicReports.severity")} value={severity} onChange={setSeverity}
              options={severities.map((value) => ({ value, label: severityLabel(t, value) }))} />
            <AppInput value={note} maxLength={2000} aria-label={t("periodicReports.note")} placeholder={t("periodicReports.notePlaceholder")}
              onChange={(e) => setNote(e.target.value)} className="w-full" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <AppButton disabled={record.isPending} onClick={() => void submit()}>{t("periodicReports.confirmMissing")}</AppButton>
            <AppButton variant="secondary" onClick={() => setOpen(false)}>{t("periodicReports.cancel")}</AppButton>
          </div>
          {record.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{record.error.message}</p>}
        </div>
      )}
    </li>
  );
}

function Overview({ csrfToken }: { csrfToken: string }) {
  const { t } = useTranslation();
  const day = useDay();
  const [period, setPeriod] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<Filter>("all");
  const overview = usePeriodicOverview(period, true);

  if (overview.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>;
  if (overview.isError) return <AppNotice tone="danger" role="alert" title={overview.error.message || t("periodicReports.loadError")}>
    <AppButton variant="secondary" onClick={() => void overview.refetch()}>{t("periodicReports.retry")}</AppButton>
  </AppNotice>;
  const data = overview.data;
  if (!data.periodCode) return <AppNotice>{t("periodicReports.noCalendar")}</AppNotice>;
  const periodCode = data.periodCode;
  const shown = data.rows.filter((row) => matches(filter, row));
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <AppSelect className="w-56" label={t("periodicReports.period")} value={periodCode} onChange={setPeriod}
          options={data.periods.map((item) => ({ value: item.code, label: item.code }))} />
        {data.dueAt && <span className="text-sm text-muted-app">{t("periodicReports.dueOn", { date: day(data.dueAt) })}</span>}
      </div>
      <div role="group" aria-label={t("periodicReports.title")} className="mb-6 flex flex-wrap gap-2">{filters.map((value) =>
        <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
          className={cn("min-h-11 rounded-full border border-border-app px-4 text-sm font-semibold text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app", {
            "border-primary-app bg-primary-soft-app text-primary-app hover:text-primary-app": filter === value,
          })}>{filterLabel(t, value)} · {data.rows.filter((row) => matches(value, row)).length}</button>)}</div>
      {shown.length ? <ul className="divide-y divide-border-app border-y border-border-app">
        {shown.map((row) => <Row key={row.clubId} row={row} periodCode={periodCode} csrfToken={csrfToken} />)}</ul>
        : <div className="py-16 text-center">
          <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-mint-soft-app text-mint-app"><AppIcon name="sparkles" className="size-7" /></span>
          <h2 className="mt-4 font-heading text-xl font-bold">{t("periodicReports.none")}</h2>
          <p className="mt-2 text-sm text-muted-app">{t("periodicReports.noneHint")}</p>
        </div>}
    </>
  );
}

export function PeriodicReportsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("periodicReports.title")} description={t("periodicReports.description")} />
      <Gate>{(csrfToken) => <Overview csrfToken={csrfToken} />}</Gate>
    </>
  );
}

function Figure({ label, frozen, live }: { label: string; frozen: ReactNode; live: ReactNode }) {
  const differs = frozen !== undefined && live !== undefined && frozen !== live;
  return (
    <tr className="align-top">
      <th scope="row" className="py-2.5 pr-3 text-left font-medium">{label}</th>
      <td className={cn("py-2.5 pr-3 text-right tabular-nums", { "font-semibold text-warning-app": differs })}>{frozen ?? "—"}</td>
      <td className="py-2.5 text-right tabular-nums">{live ?? "—"}</td>
    </tr>
  );
}

function Review({ id, csrfToken }: { id: string; csrfToken: string }) {
  const { t, i18n } = useTranslation();
  const day = useDay();
  const report = usePeriodicReport(id, true);
  const decide = useDecidePeriodicReport();
  const [outcome, setOutcome] = useState<PeriodicOutcome>("Accept");
  const [observation, setObservation] = useState("");
  const [reason, setReason] = useState("");
  const [sections, setSections] = useState<ReturnSection[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const back = { to: "/workspace/periodic-reports", label: t("periodicReports.back") };
  function money(value: number | undefined) {
    return value === undefined ? undefined : formatMoney(value, i18n.language);
  }

  if (report.isPending) return <div className="space-y-4"><AppSkeleton className="h-10 w-1/2" /><AppSkeleton className="h-96 w-full" /></div>;
  if (report.isError) return <>
    <PageHeader title={t("periodicReports.report")} back={back} />
    <AppNotice tone="danger" role="alert" title={report.error.message || t("periodicReports.loadError")}>
      <AppButton variant="secondary" onClick={() => void report.refetch()}>{t("periodicReports.retry")}</AppButton>
    </AppNotice>
  </>;

  const data = report.data;
  const { preloadedFigures: frozen, live } = data;
  const label = "text-xs font-semibold tracking-wide text-muted-app uppercase";

  function toggle(section: ReturnSection) {
    setSections((current) => current.includes(section) ? current.filter((item) => item !== section) : [...current, section]);
  }

  async function submit() {
    const invalid = outcome === "Return" && !reason.trim() ? t("periodicReports.reasonMissing")
      : outcome === "Return" && !sections.length ? t("periodicReports.sectionsMissing") : null;
    setFormError(invalid);
    if (invalid || !window.confirm(outcome === "Accept" ? t("periodicReports.confirmAccept") : t("periodicReports.confirmReturn"))) return;
    try {
      await decide.mutateAsync({ id, csrfToken, input: outcome === "Accept"
        ? { outcome, observation: observation.trim() || undefined } : { outcome, reason: reason.trim(), sections } });
    } catch { /* Mutation state is rendered below. */ }
  }

  return (
    <>
      <PageHeader title={`${data.clubName} · ${data.periodCode}`} back={back}
        description={`${t("periodicReports.dueOn", { date: day(data.dueAt) })}${data.submittedAt
          ? ` · ${t("periodicReports.submittedOn", { date: day(data.submittedAt) })}` : ""} · ${t("periodicReports.version", { number: data.versionNo })}`}
        actions={<span className="flex flex-wrap gap-2">
          {data.lateFlag && <AppBadge tone="warning">{t("periodicReports.late")}</AppBadge>}
          <AppBadge tone={stateTone(data.state)}>{stateLabel(t, data.state)}</AppBadge></span>} />
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="font-heading text-xl font-bold">{t("periodicReports.figures")}</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[26rem] text-sm">
                <thead><tr className="border-b border-border-app text-muted-app">
                  <th scope="col" className="py-2 pr-3 text-left font-semibold"><span className="sr-only">{t("periodicReports.figures")}</span></th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("periodicReports.frozen")}</th>
                  <th scope="col" className="py-2 text-right font-semibold">{t("periodicReports.system")}</th>
                </tr></thead>
                <tbody className="divide-y divide-border-app">
                  <Figure label={t("periodicReports.eventsHeld")} frozen={frozen.events?.completed} live={live.events?.completed} />
                  <Figure label={t("periodicReports.eventsCancelled")} frozen={frozen.events?.cancelled} live={live.events?.cancelled} />
                  <Figure label={t("periodicReports.attendance")} frozen={frozen.attendance?.total} live={live.attendance?.total} />
                  <Figure label={t("periodicReports.activeMembers")} frozen={frozen.members?.active} live={live.members?.active} />
                  <Figure label={t("periodicReports.budgets")} frozen={frozen.finance?.budgets} live={live.finance?.budgets} />
                  <Figure label={t("periodicReports.approvedTotal")} frozen={money(frozen.finance?.approvedTotal)} live={money(live.finance?.approvedTotal)} />
                  <Figure label={t("periodicReports.disbursedTotal")} frozen={money(frozen.finance?.disbursedTotal)} live={money(live.finance?.disbursedTotal)} />
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-app">{t("periodicReports.activeMembersHint")}</p>
          </section>

          <section className="border-t border-border-app pt-8">
            <h2 className="font-heading text-xl font-bold">{t("periodicReports.content")}</h2>
            <dl className="mt-4 space-y-5">
              <div><dt className={label}>{t("periodicReports.narrative")}</dt>
                <dd className="mt-1 break-words whitespace-pre-line">{data.narrative ?? t("periodicReports.empty")}</dd></div>
              <div><dt className={label}>{t("periodicReports.nextPlan")}</dt>
                <dd className="mt-1 break-words whitespace-pre-line">{data.nextPlan ?? t("periodicReports.empty")}</dd></div>
              <div><dt className={label}>{t("periodicReports.evidence")}</dt><dd className="mt-1">{data.evidence.length
                ? <ul className="space-y-1">{data.evidence.map((item, index) => <li key={index} className="break-words">
                  {item.url ? <a className="font-semibold text-accent-app" href={item.url} target="_blank" rel="noreferrer">{item.note || item.url}</a> : item.note}
                </li>)}</ul> : <span className="text-muted-app">{t("periodicReports.noEvidence")}</span>}</dd></div>
            </dl>
          </section>

          <section className="border-t border-border-app pt-8">
            <h2 className="font-heading text-xl font-bold">{t("periodicReports.history")}</h2>
            {data.history.length ? <ol className="mt-5 space-y-4 border-l-2 border-border-app pl-5">{data.history.map((item, index) =>
              <li key={index} className="relative">
                <span aria-hidden="true" className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-primary-app" />
                <p className="font-semibold">{item.action === "PERIODIC_REPORT_ACCEPTED" ? t("periodicReports.actionAccepted")
                  : item.action === "PERIODIC_REPORT_RETURNED" ? t("periodicReports.actionReturned") : item.action}</p>
                <p className="text-sm text-muted-app">{day(item.at)}{item.actorName && ` · ${item.actorName}`}</p>
                {item.reason && <p className="mt-1 text-sm break-words">{item.reason}</p>}
              </li>)}</ol>
              : <p className="mt-3 text-sm text-muted-app">{t("periodicReports.noHistory")}</p>}
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6">
          {data.state === "Submitted" ? (
            <section className="rounded-2xl bg-surface-app p-5">
              <h2 className="font-heading text-lg font-bold">{t("periodicReports.decide")}</h2>
              <div role="radiogroup" aria-label={t("periodicReports.decide")} className="mt-4 grid gap-2">
                {(["Accept", "Return"] as const).map((value) => <button key={value} type="button" role="radio" aria-checked={outcome === value}
                  onClick={() => setOutcome(value)}
                  className={cn("min-h-11 rounded-xl border border-border-app px-4 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring-app", {
                    "border-primary-app bg-primary-soft-app text-primary-app": outcome === value,
                  })}>{value === "Accept" ? t("periodicReports.outcomeAccept") : t("periodicReports.outcomeReturn")}</button>)}
              </div>
              {outcome === "Accept" ? (
                <label className="mt-5 block text-sm font-semibold">{t("periodicReports.observation")}
                  <AppTextarea className="mt-2 min-h-20 w-full font-normal" value={observation} maxLength={2000}
                    onChange={(e) => setObservation(e.target.value)} />
                  <span className="mt-1 block text-xs font-normal text-muted-app">{t("periodicReports.observationHint")}</span></label>
              ) : <>
                <fieldset className="mt-5">
                  <legend className="text-sm font-semibold">{t("periodicReports.sections")}</legend>
                  <div className="mt-2 flex flex-wrap gap-2">{RETURN_SECTIONS.map((section) =>
                    <button key={section} type="button" aria-pressed={sections.includes(section)} onClick={() => toggle(section)}
                      className={cn("min-h-11 rounded-full border border-border-app px-4 text-sm font-semibold text-muted-app transition-colors focus-visible:outline-2 focus-visible:outline-ring-app", {
                        "border-primary-app bg-primary-soft-app text-primary-app": sections.includes(section),
                      })}>{sectionLabel(t, section)}</button>)}</div>
                </fieldset>
                <label className="mt-5 block text-sm font-semibold">{t("periodicReports.reason")}
                  <AppTextarea className="mt-2 min-h-24 w-full font-normal" value={reason} maxLength={5000}
                    onChange={(e) => setReason(e.target.value)} />
                  <span className="mt-1 block text-xs font-normal text-muted-app">{t("periodicReports.reasonHint")}</span></label>
              </>}
              <AppButton className="mt-6 w-full" disabled={decide.isPending} onClick={() => void submit()}>
                {decide.isPending ? t("periodicReports.submitting") : t("periodicReports.submit")}</AppButton>
              {formError && <p role="alert" className="mt-3 text-sm text-danger-app">{formError}</p>}
              {decide.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{decide.error.message}</p>}
            </section>
          ) : data.decision ? (
            <section className="rounded-2xl bg-surface-app p-5">
              <h2 className="font-heading text-lg font-bold">{data.decision.outcome === "Accept" ? t("periodicReports.outcomeAccept")
                : t("periodicReports.outcomeReturn")}</h2>
              <p className="mt-1 text-sm text-muted-app">{t("periodicReports.decisionBy", { name: data.decision.decidedByName ?? "—",
                date: day(data.decision.decidedAt) })}</p>
              {data.decision.sections.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
                {data.decision.sections.map((section) => <AppBadge key={section} tone="warning">{sectionLabel(t, section)}</AppBadge>)}</div>}
              {(data.decision.reason ?? data.decision.observation) && <p className="mt-3 text-sm break-words">
                {data.decision.reason ?? data.decision.observation}</p>}
            </section>
          ) : <AppNotice>{t("periodicReports.notWaiting")}</AppNotice>}
          {decide.isSuccess && <AppNotice role="status" className="mt-4">{t("periodicReports.decided")}</AppNotice>}
        </aside>
      </div>
    </>
  );
}

export function PeriodicReportReviewPage() {
  const { id } = useParams();
  return <Gate>{(csrfToken) => id ? <Review id={id} csrfToken={csrfToken} /> : null}</Gate>;
}
