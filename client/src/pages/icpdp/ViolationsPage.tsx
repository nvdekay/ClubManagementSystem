import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useClubLifecycles } from "@/hooks/useClubLifecycle";
import { useOpenViolation, useViolation, useViolations, useViolationSources, useViolationStep } from "@/hooks/useViolations";
import {
  VIOLATION_ORIGINS, VIOLATION_SEVERITIES,
  type EvidenceInput, type ViolationEvidence, type ViolationOrigin, type ViolationSeverity, type ViolationStep, type ViolationSummary,
} from "@/services/violations";
import { cn } from "@/utils/cn";
import { useConfirm } from "@/hooks/useConfirm";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";

const filters = ["active", "awaiting", "actions", "closed", "all"] as const;
type Filter = typeof filters[number];

function matches(filter: Filter, item: ViolationSummary): boolean {
  switch (filter) {
    case "active": return ["Open", "Under Investigation", "Decision Issued"].includes(item.state);
    case "awaiting": return item.state === "Awaiting Club Response";
    case "actions": return item.state === "Corrective Action";
    case "closed": return ["Resolved", "Closed"].includes(item.state);
    default: return true;
  }
}

function filterLabel(t: TFunction, filter: Filter): string {
  switch (filter) {
    case "active": return t("violations.filterActive");
    case "awaiting": return t("violations.filterAwaiting");
    case "actions": return t("violations.filterActions");
    case "closed": return t("violations.filterClosed");
    default: return t("violations.filterAll");
  }
}

function originLabel(t: TFunction, origin: ViolationOrigin): string {
  switch (origin) {
    case "COMPLAINT": return t("violations.originCOMPLAINT");
    case "REPORT_FINDING": return t("violations.originREPORT_FINDING");
    case "OVERDUE_REPORT": return t("violations.originOVERDUE_REPORT");
    case "FINANCIAL_EXCEPTION": return t("violations.originFINANCIAL_EXCEPTION");
    case "UNAUTHORIZED_EVENT": return t("violations.originUNAUTHORIZED_EVENT");
    case "LATE_BOOKING_CANCELLATION": return t("violations.originLATE_BOOKING_CANCELLATION");
    default: return t("violations.originOTHER");
  }
}

function severityLabel(t: TFunction, severity: ViolationSeverity): string {
  return severity === "SERIOUS" ? t("violations.severitySERIOUS") : severity === "MODERATE"
    ? t("violations.severityMODERATE") : t("violations.severityMINOR");
}

function severityTone(severity: ViolationSeverity): AppBadgeTone {
  return severity === "SERIOUS" ? "danger" : severity === "MODERATE" ? "warning" : "neutral";
}

function stateLabel(t: TFunction, state: string): string {
  switch (state) {
    case "Open": return t("violations.stateOpen");
    case "Under Investigation": return t("violations.stateUnderInvestigation");
    case "Awaiting Club Response": return t("violations.stateAwaitingClubResponse");
    case "Decision Issued": return t("violations.stateDecisionIssued");
    case "Corrective Action": return t("violations.stateCorrectiveAction");
    case "Resolved": return t("violations.stateResolved");
    case "Closed": return t("violations.stateClosed");
    default: return state;
  }
}

function stateTone(state: string): AppBadgeTone {
  return state === "Resolved" || state === "Closed" ? "success" : state === "Awaiting Club Response" ? "warning"
    : state === "Decision Issued" || state === "Corrective Action" ? "danger" : "info";
}

function historyLabel(t: TFunction, action: string): string {
  switch (action) {
    case "VIOLATION_OPENED": return t("violations.historyVIOLATION_OPENED");
    case "VIOLATION_INVESTIGATING": return t("violations.historyVIOLATION_INVESTIGATING");
    case "VIOLATION_EVIDENCE_ADDED": return t("violations.historyVIOLATION_EVIDENCE_ADDED");
    case "VIOLATION_RESPONSE_REQUESTED": return t("violations.historyVIOLATION_RESPONSE_REQUESTED");
    case "VIOLATION_RESPONSE_RECORDED": return t("violations.historyVIOLATION_RESPONSE_RECORDED");
    case "VIOLATION_NO_RESPONSE_RECORDED": return t("violations.historyVIOLATION_NO_RESPONSE_RECORDED");
    case "VIOLATION_DECIDED": return t("violations.historyVIOLATION_DECIDED");
    case "VIOLATION_CLOSED_NO_VIOLATION": return t("violations.historyVIOLATION_CLOSED_NO_VIOLATION");
    case "VIOLATION_ACTIONS_ASSIGNED": return t("violations.historyVIOLATION_ACTIONS_ASSIGNED");
    case "VIOLATION_ACTION_VERIFIED": return t("violations.historyVIOLATION_ACTION_VERIFIED");
    case "VIOLATION_ACTION_FAILED": return t("violations.historyVIOLATION_ACTION_FAILED");
    case "VIOLATION_RESOLVED": return t("violations.historyVIOLATION_RESOLVED");
    case "VIOLATION_RESPONSE_SUBMITTED": return t("violations.historyVIOLATION_RESPONSE_SUBMITTED");
    case "CORRECTIVE_ACTION_SUBMITTED": return t("violations.historyCORRECTIVE_ACTION_SUBMITTED");
    case "VIOLATION_ACCOUNT_LOCKED": return t("violations.historyVIOLATION_ACCOUNT_LOCKED");
    default: return action;
  }
}

/** One evidence item per non-empty line; a line that is a link is kept as the link. */
function evidenceLines(value: string): EvidenceInput[] {
  return value.split("\n").map((line) => line.trim()).filter(Boolean)
    .map((line) => /^https?:\/\//i.test(line) ? { note: line, url: line } : { note: line });
}

function inputDate(daysAhead: number): string {
  const day = new Date(Date.now() + daysAhead * 86_400_000);
  return new Date(day.getTime() - day.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function endOfDay(value: string): string {
  return new Date(`${value}T23:59:00`).toISOString();
}

function Gate({ children }: { children: (csrfToken: string) => ReactNode }) {
  const { t } = useTranslation();
  const auth = useAuth();
  if (auth.isPending) return <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>;
  if (!auth.data) return <AppNotice>
    <p>{t("violations.signIn")}</p>
    <Link className="inline-block font-semibold text-primary-app hover:underline"
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>{t("violations.signInLink")}</Link>
  </AppNotice>;
  if (!auth.data.systemRoles.includes("ICPDP_OFFICER")) {
    return <AppNotice tone="danger" role="alert">{t("violations.unauthorized")}</AppNotice>;
  }
  return <>{children(auth.data.csrfToken)}</>;
}

function SeverityPicker({ value, onChange }: { value: ViolationSeverity; onChange: (value: ViolationSeverity) => void }) {
  const { t } = useTranslation();
  return <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg border border-border-app bg-surface-app p-1">{VIOLATION_SEVERITIES.map((item) =>
    <button key={item} type="button" aria-pressed={value === item} onClick={() => onChange(item)}
      className={cn("min-h-11 rounded-md px-2 text-xs font-medium text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app sm:min-h-9", {
        "bg-segment-app text-text-app shadow-xs hover:text-text-app": value === item,
      })}>{severityLabel(t, item)}</button>)}</div>;
}

function OpenCaseForm({ csrfToken, onCancel }: { csrfToken: string; onCancel: () => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const clubs = useClubLifecycles(true);
  const open = useOpenViolation();
  const [clubId, setClubId] = useState("");
  const [originType, setOriginType] = useState<ViolationOrigin>("OTHER");
  const [severity, setSeverity] = useState<ViolationSeverity>("MINOR");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [related, setRelated] = useState("");
  const [evidence, setEvidence] = useState("");
  const sources = useViolationSources(clubId);
  const field = useFieldValidation({
    clubId: clubId ? null : t("common.chooseRequired"),
    title: title.trim() ? null : t("common.fieldRequired"),
  });

  const relatedOptions = [{ value: "", label: t("violations.relatedNone") },
    ...(sources.data?.events ?? []).map((event) => ({ value: event.id, label: t("violations.relatedEvent", {
      title: `${event.title} (${new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(event.startAt))})` }) })),
    ...(sources.data?.budgets ?? []).map((budget) => ({ value: budget.id, label: t("violations.relatedBudget", { title: budget.eventTitle }) }))];

  async function submit() {
    if (!field.touchAll()) return;
    try {
      const created = await open.mutateAsync({ csrfToken, input: { clubId, originType, severity, title: title.trim(),
        description: description.trim() || undefined, originRefId: related || undefined, evidence: evidenceLines(evidence) } });
      navigate(`/workspace/violations/${created.id}`);
    } catch { /* Mutation state is rendered below. */ }
  }

  return (
    <section className="mb-8 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      <h2 className="font-heading text-base font-semibold">{t("violations.openCase")}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="block text-sm font-medium text-text-app">{t("violations.club")}<AppRequiredMark />
          <AppSelect className="mt-1.5 w-full" label={t("violations.club")} value={clubId}
            required invalid={Boolean(field.error("clubId"))}
            onChange={(value) => { setClubId(value); setRelated(""); field.touch("clubId"); }}
            options={[{ value: "", label: t("violations.chooseClub") },
              ...(clubs.data?.clubs ?? []).map((club) => ({ value: club.id, label: club.name }))]} />
          <AppFieldError message={field.error("clubId")} /></div>
        <div className="block text-sm font-medium text-text-app">{t("violations.origin")}
          <AppSelect className="mt-1.5 w-full" label={t("violations.origin")} value={originType} onChange={setOriginType}
            options={VIOLATION_ORIGINS.map((origin) => ({ value: origin, label: originLabel(t, origin) }))} /></div>
        <div className="block text-sm font-medium text-text-app md:col-span-2">{t("violations.severity")}
          <SeverityPicker value={severity} onChange={setSeverity} /></div>
        <label className="block text-sm md:col-span-2 font-medium text-text-app">{t("violations.caseTitle")}<AppRequiredMark />
          <AppInput className="mt-1.5 w-full font-normal" value={title} maxLength={200} placeholder={t("violations.caseTitleHint")}
            {...field.control("title")} onChange={(e) => setTitle(e.target.value)} />
          <AppFieldError message={field.error("title")} /></label>
        <label className="block text-sm md:col-span-2 font-medium text-text-app">{t("violations.caseDescription")}
          <AppTextarea className="mt-1.5 min-h-24 w-full font-normal" value={description} maxLength={5000}
            onChange={(e) => setDescription(e.target.value)} /></label>
        {clubId && <div className="block text-sm font-medium text-text-app md:col-span-2">{t("violations.related")}
          <AppSelect className="mt-1.5 w-full" label={t("violations.related")} value={related} onChange={setRelated}
            options={relatedOptions} /></div>}
        <label className="block text-sm md:col-span-2 font-medium text-text-app">{t("violations.evidence")}
          <AppTextarea className="mt-1.5 min-h-20 w-full font-normal" value={evidence} placeholder={t("violations.decisionEvidenceHint")}
            onChange={(e) => setEvidence(e.target.value)} /></label>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <AppButton disabled={open.isPending} onClick={() => void submit()}>{open.isPending ? t("violations.saving") : t("violations.submitOpen")}</AppButton>
        <AppButton variant="secondary" onClick={onCancel}>{t("violations.cancel")}</AppButton>
      </div>
      {open.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{open.error.message}</p>}
    </section>
  );
}

function ViolationList({ csrfToken }: { csrfToken: string }) {
  const { t, i18n } = useTranslation();
  const list = useViolations(true);
  const [filter, setFilter] = useState<Filter>("active");
  const [opening, setOpening] = useState(false);
  function day(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  }

  return (
    <>
      {opening ? <OpenCaseForm csrfToken={csrfToken} onCancel={() => setOpening(false)} />
        : <AppButton className="mb-6" onClick={() => setOpening(true)}><AppIcon name="plus" className="size-4" />{t("violations.openCase")}</AppButton>}
      {list.isPending ? <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>
        : list.isError ? <AppNotice tone="danger" role="alert" title={list.error.message || t("violations.loadError")}>
          <AppButton variant="secondary" onClick={() => void list.refetch()}>{t("violations.retry")}</AppButton></AppNotice>
          : <>
            <div role="group" aria-label={t("violations.title")} className="mb-5 flex w-fit max-w-full flex-wrap gap-1 rounded-lg border border-border-app bg-surface-app p-1">{filters.map((value) =>
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
                className={cn("inline-flex min-h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app", {
                  "bg-segment-app text-text-app shadow-xs hover:text-text-app": filter === value,
                })}>{filterLabel(t, value)} · {list.data.filter((item) => matches(value, item)).length}</button>)}</div>
            {list.data.some((item) => matches(filter, item)) ? (
              <ul className="divide-y divide-border-app overflow-hidden rounded-2xl border border-border-app bg-bg-app shadow-xs">{list.data.filter((item) => matches(filter, item)).map((item) =>
                <li key={item.id}>
                  <Link to={`/workspace/violations/${item.id}`}
                    className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 hover:bg-surface-app focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring-app">
                    <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-app bg-bg-app text-muted-app">
                      <AppIcon name="shield" /></span>
                    <span className="min-w-0 flex-1 basis-64">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-heading text-base font-semibold break-words">{item.title}</span>
                        <AppBadge tone={stateTone(item.state)}>{stateLabel(t, item.state)}</AppBadge>
                      </span>
                      <span className="mt-1 block text-sm text-muted-app">{item.clubName} · {originLabel(t, item.originType)} · {t("violations.openedOn", { date: day(item.openedAt) })}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-2">
                        <AppBadge tone={severityTone(item.severity)}>{severityLabel(t, item.severity)}</AppBadge>
                        {item.responseOverdue ? <AppBadge tone="danger">{t("violations.responseOverdue")}</AppBadge>
                          : item.state === "Awaiting Club Response" && item.responseDueAt
                            && <span className="text-xs text-muted-app">{t("violations.responseDue", { date: day(item.responseDueAt) })}</span>}
                        {item.pendingActions > 0 && <AppBadge tone="warning">{t("violations.pendingActions", { count: item.pendingActions })}</AppBadge>}
                      </span>
                    </span>
                    <AppIcon name="chevronRight" className="size-4 text-muted-app" />
                  </Link>
                </li>)}</ul>
            ) : (
              <AppEmptyState variant="boxed" icon="sparkles" title={t("violations.none")} message={t("violations.noneHint")} />
            )}
          </>}
    </>
  );
}

export function ViolationsPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("violations.title")} description={t("violations.description")} />
      <Gate>{(csrfToken) => <ViolationList csrfToken={csrfToken} />}</Gate>
    </>
  );
}

/** One block of the "next step" panel: a numbered marker, highlighted while it is the step the case is at. */
function Step({ number, current, children }: { number: number; current: boolean; children: ReactNode }) {
  return <div className="flex gap-3" aria-current={current ? "step" : undefined}>
    <span aria-hidden="true" className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border border-border-app text-xs font-semibold text-muted-app",
      { "border-brand-app text-brand-app": current })}>{number}</span>
    <div className={cn("min-w-0 flex-1", { "[&>h3]:text-muted-app": !current })}>{children}</div>
  </div>;
}

function EvidenceList({ items, names }: { items: ViolationEvidence[]; names: Record<string, string> }) {
  const { t, i18n } = useTranslation();
  if (!items.length) return <div className="mt-3"><AppEmptyState message={t("violations.noEvidence")} /></div>;
  return <ul className="mt-3 space-y-2 text-sm">{items.map((item, index) =>
    <li key={index} className="rounded-xl border border-border-app px-3 py-2">
      {item.url ? <a href={item.url} target="_blank" rel="noreferrer noopener" className="font-medium break-all text-primary-app hover:underline">{item.note}</a>
        : <p className="break-words">{item.note}</p>}
      <p className="mt-0.5 text-xs text-muted-app">{names[item.addedBy] ?? item.addedBy} · {new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(item.addedAt))}</p>
    </li>)}</ul>;
}

function ViolationDetailView({ id, csrfToken }: { id: string; csrfToken: string }) {
  const { t, i18n } = useTranslation();
  const askConfirm = useConfirm();
  const query = useViolation(id, true);
  const step = useViolationStep();
  const [message, setMessage] = useState("");
  const [dueAt, setDueAt] = useState(inputDate(7));
  const [responseText, setResponseText] = useState("");
  const [finding, setFinding] = useState<"VIOLATION" | "NO_VIOLATION">("VIOLATION");
  const [reason, setReason] = useState("");
  const [decisionEvidence, setDecisionEvidence] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [rows, setRows] = useState([{ description: "", dueAt: inputDate(14), link: "" }]);
  const requestField = useFieldValidation({
    message: message.trim() ? null : t("common.fieldRequired"),
    dueAt: !dueAt ? t("common.fieldRequired") : new Date(endOfDay(dueAt)) <= new Date() ? t("common.dateNotPast") : null,
  });
  const responseField = useFieldValidation({ responseText: responseText.trim() ? null : t("common.fieldRequired") });
  const decideField = useFieldValidation({
    reason: reason.trim() ? null : t("violations.decisionReasonRequired"),
    evidence: finding === "VIOLATION" && !evidenceLines(decisionEvidence).length ? t("violations.decisionEvidenceRequired") : null,
  });
  // Blank rows are skipped on save, so only the first description is required, and only while every row is blank.
  const anyAction = rows.some((row) => row.description.trim());
  const actionsField = useFieldValidation(Object.fromEntries(rows.flatMap((row, index) => [
    [`description${index}`, index === 0 && !anyAction ? t("common.fieldRequired") : null],
    [`dueAt${index}`, !row.description.trim() ? null : !row.dueAt ? t("common.fieldRequired")
      : new Date(endOfDay(row.dueAt)) <= new Date() ? t("common.dateNotPast") : null],
  ])));
  function day(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  }
  const back = { to: "/workspace/violations", label: t("violations.back") };

  if (query.isPending) return <div className="space-y-4"><AppSkeleton className="h-10 w-1/2" /><AppSkeleton className="h-96 w-full" /></div>;
  if (query.isError) return <>
    <PageHeader title={t("violations.case")} back={back} />
    <AppNotice tone="danger" role="alert" title={query.error.message || t("violations.loadError")}>
      <AppButton variant="secondary" onClick={() => void query.refetch()}>{t("violations.retry")}</AppButton></AppNotice>
  </>;
  const item = query.data;
  const final = item.state === "Resolved" || item.state === "Closed";
  const response = item.clubResponse;
  const responseOverdue = Boolean(response && !response.source && new Date(response.dueAt) < new Date());
  const decided = item.state === "Decision Issued" || item.state === "Corrective Action";
  const canDecideViolation = item.state === "Awaiting Club Response" && Boolean(response?.source);
  const label = "text-xs text-muted-app";
  // The panel's blocks read as numbered steps; the record's state decides which one is current.
  const steps = [item.state === "Open" && "investigate", (item.state === "Open" || item.state === "Under Investigation") && "request",
    item.state === "Awaiting Club Response" && response && !response.source && "record", !decided && "decide", decided && "actions"]
    .filter((key): key is string => Boolean(key));
  const currentStep = item.state === "Open" ? "investigate" : item.state === "Under Investigation" ? "request"
    : item.state === "Awaiting Club Response" ? (response && !response.source ? "record" : "decide") : decided ? "actions" : "";
  function stepProps(key: string) {
    return { number: steps.indexOf(key) + 1, current: currentStep === key };
  }

  async function run(next: ViolationStep, confirmText?: string): Promise<boolean> {
    if (confirmText && !(await askConfirm(confirmText))) return false;
    try { await step.mutateAsync({ id, csrfToken, step: next }); return true; }
    catch { return false; }
  }

  async function decide() {
    if (!decideField.touchAll()) return;
    const evidence = evidenceLines(decisionEvidence);
    if (await run({ type: "decide", finding, reason: reason.trim(), evidence },
      finding === "VIOLATION" ? t("violations.confirmDecision") : t("violations.confirmClose"))) {
      setReason(""); setDecisionEvidence(""); decideField.reset();
    }
  }

  async function assign() {
    if (!actionsField.touchAll()) return;
    const actions = rows.filter((row) => row.description.trim());
    if (await run({ type: "addActions", actions: actions.map((row) => ({ description: row.description.trim(), dueAt: endOfDay(row.dueAt),
      ...(row.link === "SUSPEND" || row.link === "DISSOLVE" ? { linkedLifecycleAction: row.link } : {}) })) })) {
      setRows([{ description: "", dueAt: inputDate(14), link: "" }]); actionsField.reset();
    }
  }

  function actionStateLabel(state: string) {
    return state === "Verified" ? t("violations.actionVerified") : state === "Failed" ? t("violations.actionFailed") : t("violations.actionPending");
  }

  return (
    <>
      <PageHeader title={item.title} back={back}
        description={`${item.clubName} · ${originLabel(t, item.originType)} · ${t("violations.openedOn", { date: day(item.openedAt) })}`}
        actions={<div className="flex flex-wrap gap-2"><AppBadge tone={severityTone(item.severity)}>{severityLabel(t, item.severity)}</AppBadge>
          <AppBadge tone={stateTone(item.state)}>{stateLabel(t, item.state)}</AppBadge></div>} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <dl className="grid gap-5 sm:grid-cols-2">
              <div><dt className={label}>{t("violations.club")}</dt><dd className="mt-1 font-medium">{item.clubName} · {item.clubState}</dd></div>
              <div><dt className={label}>{t("violations.related")}</dt><dd className="mt-1 font-medium break-words">
                {item.source ? (item.source.kind === "event" ? t("violations.relatedEvent", { title: item.source.label })
                  : t("violations.relatedBudget", { title: item.source.label })) : t("violations.relatedNone")}</dd></div>
              {item.description && <div className="sm:col-span-2"><dt className={label}>{t("violations.caseDescription")}</dt>
                <dd className="mt-2 leading-7 break-words whitespace-pre-wrap">{item.description}</dd></div>}
            </dl>
          </section>

          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("violations.evidence")}</h2>
            <EvidenceList items={item.evidence} names={item.names} />
            {!final && <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <AppInput aria-label={t("violations.evidenceNote")} placeholder={t("violations.evidenceNote")} value={evidenceNote}
                maxLength={1000} onChange={(e) => setEvidenceNote(e.target.value)} />
              <AppInput aria-label={t("violations.evidenceUrl")} placeholder={t("violations.evidenceUrl")} value={evidenceUrl}
                maxLength={500} onChange={(e) => setEvidenceUrl(e.target.value)} />
              <AppButton variant="secondary" disabled={step.isPending || (!evidenceNote.trim() && !evidenceUrl.trim())}
                onClick={() => void run({ type: "addEvidence", evidence: { note: evidenceNote.trim(), url: evidenceUrl.trim() || undefined } })
                  .then((done) => { if (done) { setEvidenceNote(""); setEvidenceUrl(""); } })}>{t("violations.addEvidence")}</AppButton>
            </div>}
          </section>

          {response && <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("violations.clubResponse")}</h2>
            <p className="mt-2 text-sm text-muted-app">{t("violations.requestedOn", { date: day(response.requestedAt), due: day(response.dueAt) })}</p>
            <p className="mt-2 text-sm break-words whitespace-pre-wrap">{response.requestMessage}</p>
            {response.source ? <div className="mt-4 rounded-2xl border border-border-app bg-bg-app p-4 shadow-xs">
              <AppBadge tone={response.source === "NO_RESPONSE" ? "danger" : "info"}>{response.source === "CLUB" ? t("violations.responseByClub")
                : response.source === "RECORDED_BY_ICPDP" ? t("violations.responseRecorded") : t("violations.responseNone")}</AppBadge>
              {response.text && <p className="mt-3 leading-7 break-words whitespace-pre-wrap">{response.text}</p>}
            </div> : <p className="mt-3 text-sm text-muted-app">{responseOverdue ? t("violations.responseOverdue") : t("violations.waitingForClub")}</p>}
          </section>}

          {item.decisionReason && <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("violations.decide")}</h2>
            {item.decidedAt && <p className="mt-2 text-sm text-muted-app">{t("violations.decisionOn", { date: day(item.decidedAt) })}</p>}
            <p className="mt-2 leading-7 break-words whitespace-pre-wrap">{item.decisionReason}</p>
            {item.decisionEvidence.length > 0 && <EvidenceList items={item.decisionEvidence} names={item.names} />}
          </section>}

          {(decided || item.actions.length > 0) && <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("violations.actions")}</h2>
            {item.actions.length ? <ul className="mt-4 divide-y divide-border-app overflow-hidden rounded-2xl border border-border-app bg-bg-app shadow-xs">{item.actions.map((action) =>
              <li key={action.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-medium break-words">{action.description}</p>
                  {action.submission && <div className="my-2 rounded-lg bg-surface-app p-3"><p className="whitespace-pre-wrap break-words">{action.submission.note}</p>{action.submission.evidence.map((e, n) => <p key={n} className="break-words">{e.note !== e.url && e.note} {e.url && <a href={e.url} target="_blank" rel="noreferrer" className="text-primary-app hover:underline">{e.url}</a>}</p>)}</div>}
                  <p className="text-xs text-muted-app">{t("violations.actionDue")}: {day(action.dueAt)}
                    {action.linkedLifecycleAction && ` · ${action.linkedLifecycleAction === "SUSPEND" ? t("violations.actionLinkSUSPEND") : t("violations.actionLinkDISSOLVE")}`}</p>
                </div>
                {action.state === "Pending" && item.state === "Corrective Action" ? (action.submission || new Date(action.dueAt) <= new Date()) ? <div className="flex flex-wrap gap-2">
                  {action.submission && <AppButton variant="secondary" disabled={step.isPending}
                    onClick={() => void run({ type: "verifyAction", actionId: action.id, outcome: "Verified" })}>{t("violations.markVerified")}</AppButton>}
                  <AppButton variant="secondary" disabled={step.isPending}
                    onClick={() => void run({ type: "verifyAction", actionId: action.id, outcome: "Failed" })}>{t("violations.markFailed")}</AppButton>
                </div> : <p className="text-sm text-muted-app">{t("violations.awaitingEvidence")}</p> : <AppBadge tone={action.state === "Verified" ? "success" : action.state === "Failed" ? "danger" : "warning"}>{actionStateLabel(action.state)}</AppBadge>}
              </li>)}</ul> : <div className="mt-3"><AppEmptyState message={t("violations.noActions")} /></div>}
            {item.actions.some((action) => action.linkedLifecycleAction) && <Link to="/icpdp/clubs"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-app hover:underline">
              {t("violations.manageClub")}<AppIcon name="external" className="size-3.5" /></Link>}
          </section>}

          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("violations.history")}</h2>
            <ol className="mt-5 space-y-4 border-l-2 border-border-app pl-5">{item.history.map((entry, index) =>
              <li key={index} className="relative">
                <span aria-hidden="true" className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-brand-app" />
                <p className="font-semibold">{historyLabel(t, entry.action)}</p>
                <p className="text-sm text-muted-app">{entry.actorName ? `${entry.actorName} · ` : ""}{day(entry.at)}</p>
                {entry.reason && <p className="mt-1 text-sm break-words">{entry.reason}</p>}
              </li>)}</ol>
          </section>
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24">
          {final ? <AppNotice role="status">{stateLabel(t, item.state)}{item.resolvedAt && ` · ${t("violations.resolvedOn", { date: day(item.resolvedAt) })}`}</AppNotice> : (
            <section className="space-y-6 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
              <h2 className="font-heading text-base font-semibold">{t("violations.nextStep")}</h2>

              {item.state === "Open" && <Step {...stepProps("investigate")}>
                <p className="text-sm text-muted-app">{t("violations.investigateHint")}</p>
                <AppButton className="mt-3 w-full" variant="secondary" disabled={step.isPending}
                  onClick={() => void run({ type: "investigate" })}>{t("violations.investigate")}</AppButton>
              </Step>}

              {(item.state === "Open" || item.state === "Under Investigation") && <Step {...stepProps("request")}>
                <h3 className="text-sm font-semibold">{t("violations.requestResponse")}</h3>
                <label className="mt-3 block text-sm font-medium text-text-app">{t("violations.requestMessage")}<AppRequiredMark />
                  <AppTextarea className="mt-1.5 min-h-24 w-full" value={message} maxLength={2000} {...requestField.control("message")}
                    onChange={(e) => setMessage(e.target.value)} />
                  <AppFieldError message={requestField.error("message")} /></label>
                <label className="mt-3 block text-sm font-medium text-text-app">{t("violations.responseDueAt")}<AppRequiredMark />
                  <AppInput type="date" className="mt-1.5 w-full" value={dueAt} min={inputDate(1)} {...requestField.control("dueAt")}
                    onChange={(e) => setDueAt(e.target.value)} />
                  <AppFieldError message={requestField.error("dueAt")} />
                  <span className="mt-1 block text-xs text-muted-app">{t("violations.responseDueHint")}</span></label>
                <AppButton className="mt-3 w-full" disabled={step.isPending}
                  onClick={() => {
                    if (!requestField.touchAll()) return;
                    void run({ type: "requestResponse", message: message.trim(), dueAt: endOfDay(dueAt) })
                      .then((done) => { if (done) { setMessage(""); requestField.reset(); } });
                  }}>{t("violations.sendRequest")}</AppButton>
              </Step>}

              {item.state === "Awaiting Club Response" && response && !response.source && <Step {...stepProps("record")}>
                <h3 className="text-sm font-semibold">{t("violations.recordResponse")}<AppRequiredMark /></h3>
                <p className="mt-1 text-xs text-muted-app">{t("violations.recordResponseHint")}</p>
                <AppTextarea aria-label={t("violations.responseText")} className="mt-3 min-h-24 w-full" value={responseText} maxLength={5000}
                  {...responseField.control("responseText")} onChange={(e) => setResponseText(e.target.value)} />
                <AppFieldError message={responseField.error("responseText")} />
                <AppButton className="mt-3 w-full" variant="secondary" disabled={step.isPending}
                  onClick={() => {
                    if (!responseField.touchAll()) return;
                    void run({ type: "recordResponse", text: responseText.trim() })
                      .then((done) => { if (done) { setResponseText(""); responseField.reset(); } });
                  }}>{t("violations.saveResponse")}</AppButton>
                {responseOverdue && <AppButton className="mt-2 w-full" variant="secondary" disabled={step.isPending}
                  onClick={() => void run({ type: "recordResponse", noResponse: true })}>{t("violations.noResponse")}</AppButton>}
              </Step>}

              {!decided && <Step {...stepProps("decide")}>
                <h3 className="text-sm font-semibold">{t("violations.decide")}</h3>
                <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-border-app bg-surface-app p-1">{(["VIOLATION", "NO_VIOLATION"] as const).map((value) =>
                  <button key={value} type="button" aria-pressed={finding === value} onClick={() => setFinding(value)}
                    className={cn("min-h-11 rounded-md px-2 text-xs font-medium text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app sm:min-h-9", {
                      "bg-segment-app text-text-app shadow-xs hover:text-text-app": finding === value,
                    })}>{value === "VIOLATION" ? t("violations.findViolation") : t("violations.findNoViolation")}</button>)}</div>
                {finding === "VIOLATION" && !canDecideViolation ? <p className="mt-3 text-sm text-muted-app">{t("violations.needsResponseFirst")}</p> : <>
                  {finding === "NO_VIOLATION" && <p className="mt-3 text-xs text-muted-app">{t("violations.closeNoViolationHint")}</p>}
                  <label className="mt-3 block text-sm font-medium text-text-app">{t("violations.decisionReason")}<AppRequiredMark />
                    <AppTextarea className="mt-1.5 min-h-24 w-full" value={reason} maxLength={5000} {...decideField.control("reason")}
                      onChange={(e) => setReason(e.target.value)} />
                    <AppFieldError message={decideField.error("reason")} /></label>
                  <label className="mt-3 block text-sm font-medium text-text-app">{t("violations.decisionEvidence")}{finding === "VIOLATION" && <AppRequiredMark />}
                    <AppTextarea className="mt-1.5 min-h-20 w-full" value={decisionEvidence} placeholder={t("violations.decisionEvidenceHint")}
                      {...decideField.control("evidence", finding === "VIOLATION")} onChange={(e) => setDecisionEvidence(e.target.value)} />
                    <AppFieldError message={decideField.error("evidence")} /></label>
                  <AppButton className="mt-3 w-full" disabled={step.isPending} onClick={() => void decide()}>
                    {finding === "VIOLATION" ? t("violations.saveDecision") : t("violations.closeNoViolation")}</AppButton>
                </>}
              </Step>}

              {decided && <Step {...stepProps("actions")}>
                <h3 className="text-sm font-semibold">{t("violations.addActions")}<AppRequiredMark /></h3>
                <div className="mt-3 space-y-4">{rows.map((row, index) => <div key={index} className="space-y-2">
                  <div>
                    <AppInput aria-label={t("violations.actionDescription")} placeholder={t("violations.actionDescription")} value={row.description}
                      maxLength={1000} className="w-full" {...actionsField.control(`description${index}`, index === 0)}
                      onChange={(e) => setRows((current) => current.map((item, at) => at === index ? { ...item, description: e.target.value } : item))} />
                    <AppFieldError message={actionsField.error(`description${index}`)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <AppInput type="date" aria-label={t("violations.actionDue")} value={row.dueAt} min={inputDate(1)} className="w-full"
                        {...actionsField.control(`dueAt${index}`, Boolean(row.description.trim()))}
                        onChange={(e) => setRows((current) => current.map((item, at) => at === index ? { ...item, dueAt: e.target.value } : item))} />
                      <AppFieldError message={actionsField.error(`dueAt${index}`)} />
                    </div>
                    <AppSelect label={t("violations.actionLink")} value={row.link} className="w-full"
                      onChange={(value) => setRows((current) => current.map((item, at) => at === index ? { ...item, link: value } : item))}
                      options={[{ value: "", label: t("violations.actionLinkNone") }, { value: "SUSPEND", label: t("violations.actionLinkSUSPEND") },
                        { value: "DISSOLVE", label: t("violations.actionLinkDISSOLVE") }]} />
                  </div>
                </div>)}</div>
                <button type="button" className="mt-3 text-sm font-semibold text-primary-app hover:underline rounded-sm focus-visible:outline-2 focus-visible:outline-ring-app"
                  onClick={() => setRows((current) => [...current, { description: "", dueAt: inputDate(14), link: "" }])}>{t("violations.addActionRow")}</button>
                <AppButton className="mt-3 w-full" disabled={step.isPending} onClick={() => void assign()}>{t("violations.saveActions")}</AppButton>
                <p className="mt-5 text-xs text-muted-app">{t("violations.resolveHint")}</p>
                <AppButton className="mt-2 w-full" variant="secondary"
                  disabled={step.isPending || item.actions.some((action) => action.state === "Pending")}
                  onClick={() => void run({ type: "resolve" }, t("violations.confirmResolve"))}>{t("violations.resolve")}</AppButton>
              </Step>}
              {step.isError && <p role="alert" className="text-sm text-danger-app">{step.error.message}</p>}
            </section>
          )}
          {step.isSuccess && <AppNotice role="status">{t("violations.success")}</AppNotice>}
        </aside>
      </div>
    </>
  );
}

export function ViolationDetailPage() {
  const { id } = useParams();
  return <Gate>{(csrfToken) => id ? <ViolationDetailView id={id} csrfToken={csrfToken} /> : null}</Gate>;
}
