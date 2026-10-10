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
  useDecideEventReport, useEventReport, useEventReportQueue, useRecordMissingEventReport,
} from "@/hooks/useEventReports";
import type { MissingReport, PostEventOutcome, Severity } from "@/services/eventReports";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/formatMoney";

const severities: Severity[] = ["MINOR", "MODERATE", "SERIOUS"];
const outcomes: PostEventOutcome[] = ["Accept", "AcceptWithFinding", "Return"];

function severityLabel(t: TFunction, value: Severity): string {
  return value === "MINOR" ? t("violations.severityMINOR") : value === "MODERATE" ? t("violations.severityMODERATE")
    : t("violations.severitySERIOUS");
}

function stateLabel(t: TFunction, state: string): string {
  switch (state) {
    case "Submitted": return t("eventReports.stateSubmitted");
    case "Accepted": return t("eventReports.stateAccepted");
    case "Returned for correction": return t("eventReports.stateReturned");
    case "Draft": return t("eventReports.stateDraft");
    default: return state;
  }
}

function stateTone(state: string): AppBadgeTone {
  return state === "Accepted" ? "success" : state === "Returned for correction" ? "warning" : state === "Submitted" ? "info" : "neutral";
}

function outcomeLabel(t: TFunction, outcome: PostEventOutcome): string {
  return outcome === "Accept" ? t("eventReports.outcomeAccept") : outcome === "Return" ? t("eventReports.outcomeReturn")
    : t("eventReports.outcomeFinding");
}

function actionLabel(t: TFunction, action: string): string {
  switch (action) {
    case "POST_EVENT_REPORT_ACCEPTED": return t("eventReports.actionAccepted");
    case "POST_EVENT_REPORT_RETURNED": return t("eventReports.actionReturned");
    case "POST_EVENT_REPORT_ACCEPTED_WITH_FINDING": return t("eventReports.actionFinding");
    default: return action;
  }
}

function useDay() {
  const { i18n } = useTranslation();
  return function day(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  };
}

/** Sign-in and role gate shared by both report pages. */
function Gate({ children }: { children: (csrfToken: string) => ReactNode }) {
  const { t } = useTranslation();
  const auth = useAuth();
  if (auth.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>;
  if (!auth.data) return <AppNotice>
    <p>{t("eventReports.signIn")}</p>
    <Link className="inline-block font-semibold text-accent-app"
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>{t("eventReports.signInLink")}</Link>
  </AppNotice>;
  if (!auth.data.systemRoles.includes("ICPDP_OFFICER")) {
    return <AppNotice tone="danger" role="alert">{t("eventReports.unauthorized")}</AppNotice>;
  }
  return <>{children(auth.data.csrfToken)}</>;
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="py-16 text-center">
      <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-mint-soft-app text-mint-app"><AppIcon name="sparkles" className="size-7" /></span>
      <h2 className="mt-4 font-heading text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted-app">{hint}</p>
    </div>
  );
}

function MissingRow({ item, csrfToken }: { item: MissingReport; csrfToken: string }) {
  const { t } = useTranslation();
  const day = useDay();
  const record = useRecordMissingEventReport();
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<Severity>("MINOR");
  const [note, setNote] = useState("");

  async function submit() {
    try {
      await record.mutateAsync({ eventId: item.eventId, csrfToken, input: { severity, note: note.trim() || undefined } });
      setOpen(false);
    } catch { /* Mutation state is rendered below. */ }
  }

  return (
    <li className="px-2 py-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-app text-danger-app">
          <AppIcon name="calendar" />
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <h2 className="font-heading text-lg font-bold break-words">{item.eventTitle}</h2>
          <p className="mt-1 text-sm text-muted-app">{item.clubName} · {t("eventReports.eventEnded", { date: day(item.eventEndAt) })}
            {" · "}{t("eventReports.dueOn", { date: day(item.dueAt) })}</p>
        </div>
        {item.violationId ? <Link className="font-semibold text-accent-app" to={`/workspace/violations/${item.violationId}`}>
          {t("eventReports.recorded")} · {t("eventReports.viewCase")}</Link>
          : !open && <AppButton variant="secondary" onClick={() => setOpen(true)}>{t("eventReports.recordMissing")}</AppButton>}
      </div>
      {open && !item.violationId && (
        <div className="mt-4 rounded-2xl bg-surface-app p-4">
          <p className="text-sm text-muted-app">{t("eventReports.missingHint")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <AppSelect className="w-full" label={t("eventReports.severity")} value={severity} onChange={setSeverity}
              options={severities.map((value) => ({ value, label: severityLabel(t, value) }))} />
            <AppInput value={note} maxLength={2000} aria-label={t("eventReports.note")} placeholder={t("eventReports.notePlaceholder")}
              onChange={(e) => setNote(e.target.value)} className="w-full" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <AppButton disabled={record.isPending} onClick={() => void submit()}>{t("eventReports.confirmMissing")}</AppButton>
            <AppButton variant="secondary" onClick={() => setOpen(false)}>{t("eventReports.cancel")}</AppButton>
          </div>
          {record.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{record.error.message}</p>}
        </div>
      )}
    </li>
  );
}

function Queue({ csrfToken }: { csrfToken: string }) {
  const { t } = useTranslation();
  const day = useDay();
  const queue = useEventReportQueue(true);
  const [tab, setTab] = useState<"submitted" | "missing">("submitted");

  if (queue.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>;
  if (queue.isError) return <AppNotice tone="danger" role="alert" title={queue.error.message || t("eventReports.loadError")}>
    <AppButton variant="secondary" onClick={() => void queue.refetch()}>{t("eventReports.retry")}</AppButton>
  </AppNotice>;
  const { submitted, missing } = queue.data;
  const pending = missing.filter((item) => !item.violationId).length;
  return (
    <>
      <div role="group" aria-label={t("eventReports.title")} className="mb-6 flex flex-wrap gap-2">
        {(["submitted", "missing"] as const).map((value) => <button key={value} type="button" aria-pressed={tab === value}
          onClick={() => setTab(value)}
          className={cn("min-h-11 rounded-full border border-border-app px-4 text-sm font-semibold text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app", {
            "border-primary-app bg-primary-soft-app text-primary-app hover:text-primary-app": tab === value,
          })}>{value === "submitted" ? `${t("eventReports.tabSubmitted")} · ${submitted.length}`
            : `${t("eventReports.tabMissing")} · ${pending}`}</button>)}
      </div>
      {tab === "submitted" ? submitted.length ? (
        <ul className="divide-y divide-border-app border-y border-border-app">{submitted.map((item) =>
          <li key={item.id}>
            <Link to={`/workspace/event-reports/${item.id}`}
              className="flex flex-wrap items-center gap-x-6 gap-y-3 px-2 py-5 hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app">
              <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft-app text-primary-app">
                <AppIcon name="file" />
              </span>
              <span className="min-w-0 flex-1 basis-64">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-heading text-lg font-bold break-words">{item.eventTitle}</span>
                  {item.lateFlag && <AppBadge tone="warning">{t("eventReports.late")}</AppBadge>}
                  {item.versionNo > 1 && <AppBadge tone="neutral">{t("eventReports.version", { number: item.versionNo })}</AppBadge>}
                </span>
                <span className="mt-1 block text-sm text-muted-app">{item.clubName} · {t("eventReports.eventEnded", { date: day(item.eventEndAt) })}
                  {item.submittedAt && ` · ${t("eventReports.submittedOn", { date: day(item.submittedAt) })}`}</span>
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-primary-app">{t("eventReports.open")}<AppIcon name="chevronRight" className="size-4" /></span>
            </Link>
          </li>)}</ul>
      ) : <Empty title={t("eventReports.none")} hint={t("eventReports.noneHint")} />
        : missing.length ? <ul className="divide-y divide-border-app border-y border-border-app">
          {missing.map((item) => <MissingRow key={item.eventId} item={item} csrfToken={csrfToken} />)}</ul>
          : <Empty title={t("eventReports.noneMissing")} hint={t("eventReports.noneMissingHint")} />}
    </>
  );
}

export function EventReportsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("eventReports.title")} description={t("eventReports.description")} />
      <Gate>{(csrfToken) => <Queue csrfToken={csrfToken} />}</Gate>
    </>
  );
}

function Figure({ label, frozen, live, warn }: { label: string; frozen: ReactNode; live: ReactNode; warn?: boolean }) {
  return (
    <tr className="align-top">
      <th scope="row" className="py-2.5 pr-3 text-left font-medium">{label}</th>
      <td className={cn("py-2.5 pr-3 text-right tabular-nums", { "font-semibold text-danger-app": warn })}>{frozen ?? "—"}</td>
      <td className="py-2.5 text-right tabular-nums">{live ?? "—"}</td>
    </tr>
  );
}

function Review({ id, csrfToken }: { id: string; csrfToken: string }) {
  const { t, i18n } = useTranslation();
  const day = useDay();
  const report = useEventReport(id, true);
  const decide = useDecideEventReport();
  const [outcome, setOutcome] = useState<PostEventOutcome>("Accept");
  const [reason, setReason] = useState("");
  const [severity, setSeverity] = useState<Severity>("MINOR");
  const [findingTitle, setFindingTitle] = useState("");
  const [findingDescription, setFindingDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const back = { to: "/workspace/event-reports", label: t("eventReports.back") };
  function money(value: number | undefined) {
    return value === undefined ? undefined : formatMoney(value, i18n.language);
  }

  if (report.isPending) return <div className="space-y-4"><AppSkeleton className="h-10 w-1/2" /><AppSkeleton className="h-96 w-full" /></div>;
  if (report.isError) return <>
    <PageHeader title={t("eventReports.report")} back={back} />
    <AppNotice tone="danger" role="alert" title={report.error.message || t("eventReports.loadError")}>
      <AppButton variant="secondary" onClick={() => void report.refetch()}>{t("eventReports.retry")}</AppButton>
    </AppNotice>
  </>;

  const data = report.data;
  const { preloadedFigures: frozen, live } = data;
  const waiting = data.state === "Submitted";
  const chosen = data.attendanceMismatch ? "Return" : outcome;
  const label = "text-xs font-semibold tracking-wide text-muted-app uppercase";

  async function submit() {
    const invalid = chosen !== "Accept" && !reason.trim() ? t("eventReports.reasonMissing")
      : chosen === "AcceptWithFinding" && !findingTitle.trim() ? t("eventReports.findingMissing") : null;
    setFormError(invalid);
    if (invalid) return;
    const question = chosen === "Accept" ? t("eventReports.confirmAccept") : chosen === "Return" ? t("eventReports.confirmReturn")
      : t("eventReports.confirmFinding");
    if (!window.confirm(question)) return;
    try {
      await decide.mutateAsync({ id, csrfToken, input: { outcome: chosen, reason: reason.trim() || undefined,
        ...(chosen === "AcceptWithFinding" ? { finding: { severity, title: findingTitle.trim(),
          description: findingDescription.trim() || undefined } } : {}) } });
    } catch { /* Mutation state is rendered below. */ }
  }

  return (
    <>
      <PageHeader title={data.eventTitle} back={back}
        description={`${data.clubName} · ${t("eventReports.eventEnded", { date: day(data.eventEndAt) })} · ${t("eventReports.version", { number: data.versionNo })}`}
        actions={<span className="flex flex-wrap gap-2">
          {data.lateFlag && <AppBadge tone="warning">{t("eventReports.late")}</AppBadge>}
          <AppBadge tone={stateTone(data.state)}>{stateLabel(t, data.state)}</AppBadge></span>} />
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-10">
          {data.attendanceMismatch && <AppNotice tone="danger">{t("eventReports.mismatch")}</AppNotice>}

          <section>
            <h2 className="font-heading text-xl font-bold">{t("eventReports.planVsActual")}</h2>
            <dl className="mt-4 grid gap-5 sm:grid-cols-2">
              {data.event.objective && <div className="sm:col-span-2"><dt className={label}>{t("eventReports.objective")}</dt>
                <dd className="mt-1 break-words">{data.event.objective}</dd></div>}
              <div><dt className={label}>{t("eventReports.capacity")}</dt><dd className="mt-1 tabular-nums">{data.event.capacity}</dd></div>
              {data.event.venue && <div><dt className={label}>{t("eventReports.venue")}</dt><dd className="mt-1 break-words">{data.event.venue}</dd></div>}
              <div className="sm:col-span-2"><dt className={label}>{t("eventReports.conditions")}</dt>
                <dd className="mt-1">{data.event.approvalConditions.length
                  ? <ul className="list-disc space-y-1 pl-5">{data.event.approvalConditions.map((item) => <li key={item} className="break-words">{item}</li>)}</ul>
                  : <span className="text-muted-app">{t("eventReports.noConditions")}</span>}</dd></div>
            </dl>
          </section>

          <section className="border-t border-border-app pt-8">
            <h2 className="font-heading text-xl font-bold">{t("eventReports.figures")}</h2>
            {!live.attendanceFinalized && <AppNotice tone="warning" className="mt-3">{t("eventReports.attendanceNotFinal")}</AppNotice>}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[26rem] text-sm">
                <thead><tr className="border-b border-border-app text-muted-app">
                  <th scope="col" className="py-2 pr-3 text-left font-semibold"><span className="sr-only">{t("eventReports.figures")}</span></th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("eventReports.frozen")}</th>
                  <th scope="col" className="py-2 text-right font-semibold">{t("eventReports.system")}</th>
                </tr></thead>
                <tbody className="divide-y divide-border-app">
                  <Figure label={t("eventReports.registered")} frozen={frozen.attendance?.registered} live={live.registered} />
                  <Figure label={t("eventReports.checkedIn")} frozen={frozen.attendance?.checkedIn} live={live.checkedIn} warn={data.attendanceMismatch} />
                  <Figure label={t("eventReports.feedbackCount")} frozen={frozen.feedback?.count} live={live.feedback.count} />
                  <Figure label={t("eventReports.feedbackAverage")} frozen={frozen.feedback?.average} live={live.feedback.average} />
                  {(frozen.budget || live.budget) && <>
                    <Figure label={t("eventReports.approvedBudget")} frozen={money(frozen.budget?.approvedTotal)} live={money(live.budget?.approvedTotal)} />
                    <Figure label={t("eventReports.disbursed")} frozen={money(frozen.budget?.disbursedTotal)} live={money(live.budget?.disbursedTotal)} />
                    <Figure label={t("eventReports.spent")} frozen={money(frozen.budget?.expenseTotal)} live={undefined} />
                  </>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border-t border-border-app pt-8">
            <h2 className="font-heading text-xl font-bold">{t("eventReports.content")}</h2>
            <dl className="mt-4 space-y-5">
              <div><dt className={label}>{t("eventReports.actualResult")}</dt><dd className="mt-1 break-words whitespace-pre-line">{data.actualResult}</dd></div>
              {data.incidents && <div><dt className={label}>{t("eventReports.incidents")}</dt><dd className="mt-1 break-words whitespace-pre-line">{data.incidents}</dd></div>}
              {data.lessonsLearned && <div><dt className={label}>{t("eventReports.lessons")}</dt><dd className="mt-1 break-words whitespace-pre-line">{data.lessonsLearned}</dd></div>}
              <div><dt className={label}>{t("eventReports.evidence")}</dt><dd className="mt-1">{data.evidence.length
                ? <ul className="space-y-1">{data.evidence.map((item, index) => <li key={index} className="break-words">
                  {item.url ? <a className="font-semibold text-accent-app" href={item.url} target="_blank" rel="noreferrer">{item.note || item.url}</a> : item.note}
                </li>)}</ul> : <span className="text-muted-app">{t("eventReports.noEvidence")}</span>}</dd></div>
            </dl>
          </section>

          <section className="border-t border-border-app pt-8">
            <h2 className="font-heading text-xl font-bold">{t("eventReports.history")}</h2>
            {data.history.length ? <ol className="mt-5 space-y-4 border-l-2 border-border-app pl-5">{data.history.map((item, index) =>
              <li key={index} className="relative">
                <span aria-hidden="true" className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-primary-app" />
                <p className="font-semibold">{actionLabel(t, item.action)}</p>
                <p className="text-sm text-muted-app">{day(item.at)}{item.actorName && ` · ${item.actorName}`}</p>
                {item.reason && <p className="mt-1 text-sm break-words">{item.reason}</p>}
              </li>)}</ol>
              : <p className="mt-3 text-sm text-muted-app">{t("eventReports.noHistory")}</p>}
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6">
          {waiting ? (
            <section className="rounded-2xl bg-surface-app p-5">
              <h2 className="font-heading text-lg font-bold">{t("eventReports.decide")}</h2>
              <div role="radiogroup" aria-label={t("eventReports.decide")} className="mt-4 grid gap-2">{outcomes.map((value) =>
                <button key={value} type="button" role="radio" aria-checked={chosen === value}
                  disabled={data.attendanceMismatch && value !== "Return"} onClick={() => setOutcome(value)}
                  className={cn("min-h-11 rounded-xl border border-border-app px-4 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring-app disabled:cursor-not-allowed disabled:opacity-50", {
                    "border-primary-app bg-primary-soft-app text-primary-app": chosen === value,
                  })}>{outcomeLabel(t, value)}</button>)}</div>
              {chosen === "AcceptWithFinding" && <div className="mt-5 space-y-3">
                <p className="text-xs text-muted-app">{t("eventReports.findingHint")}</p>
                <AppSelect className="w-full" label={t("eventReports.severity")} value={severity} onChange={setSeverity}
                  options={severities.map((value) => ({ value, label: severityLabel(t, value) }))} />
                <label className="block text-sm font-semibold">{t("eventReports.findingTitle")}
                  <AppInput value={findingTitle} maxLength={200} onChange={(e) => setFindingTitle(e.target.value)} className="mt-2 w-full font-normal" /></label>
                <label className="block text-sm font-semibold">{t("eventReports.findingDescription")}
                  <AppTextarea value={findingDescription} maxLength={5000} onChange={(e) => setFindingDescription(e.target.value)}
                    className="mt-2 min-h-20 w-full font-normal" /></label>
              </div>}
              <label className="mt-5 block text-sm font-semibold">{t("eventReports.reason")}
                <AppTextarea className="mt-2 min-h-24 w-full font-normal" value={reason} maxLength={5000}
                  onChange={(e) => setReason(e.target.value)} />
                <span className="mt-1 block text-xs font-normal text-muted-app">
                  {chosen === "Accept" ? t("eventReports.reasonOptional") : t("eventReports.reasonRequired")}</span></label>
              <AppButton className="mt-6 w-full" disabled={decide.isPending} onClick={() => void submit()}>
                {decide.isPending ? t("eventReports.submitting") : t("eventReports.submit")}</AppButton>
              {formError && <p role="alert" className="mt-3 text-sm text-danger-app">{formError}</p>}
              {decide.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{decide.error.message}</p>}
            </section>
          ) : data.decision ? (
            <section className="rounded-2xl bg-surface-app p-5">
              <h2 className="font-heading text-lg font-bold">{outcomeLabel(t, data.decision.outcome)}</h2>
              <p className="mt-1 text-sm text-muted-app">{t("eventReports.decisionBy", { name: data.decision.decidedByName ?? "—",
                date: day(data.decision.decidedAt) })}</p>
              {data.decision.reason && <p className="mt-3 text-sm break-words">{data.decision.reason}</p>}
              {data.decision.findingViolationId && <Link className="mt-3 inline-block font-semibold text-accent-app"
                to={`/workspace/violations/${data.decision.findingViolationId}`}>{t("eventReports.openCase")}</Link>}
            </section>
          ) : <AppNotice>{t("eventReports.notWaiting")}</AppNotice>}
          {decide.isSuccess && <AppNotice role="status" className="mt-4">{t("eventReports.decided")}</AppNotice>}
        </aside>
      </div>
    </>
  );
}

export function EventReportReviewPage() {
  const { id } = useParams();
  return <Gate>{(csrfToken) => id ? <Review id={id} csrfToken={csrfToken} /> : null}</Gate>;
}
