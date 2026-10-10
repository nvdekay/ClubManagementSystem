import { useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useEventProposal, useEventProposalAction } from "@/hooks/useEventProposalReviews";
import {
  EVENT_REVIEW_SECTIONS,
  type ClubObligation, type EventReviewOutcome, type EventReviewSection,
} from "@/services/eventProposalReviews";
import { cn } from "@/utils/cn";

const outcomes: EventReviewOutcome[] = ["Request revision", "Approve", "Reject"];

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function EventProposalReviewPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const isOfficer = Boolean(auth.data?.systemRoles.includes("ICPDP_OFFICER"));
  const review = useEventProposal(id, isOfficer);
  const action = useEventProposalAction();
  const [outcome, setOutcome] = useState<EventReviewOutcome>("Approve");
  const [reason, setReason] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sections, setSections] = useState<EventReviewSection[]>([]);
  const [conditions, setConditions] = useState("");
  // Per-line edits keyed by line index; an untouched line approves what the club asked for.
  const [amounts, setAmounts] = useState<Record<number, { amount?: string; reason?: string }>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function date(value: string) {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }

  function money(value: number) {
    return new Intl.NumberFormat(i18n.language, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
  }

  function riskLabel(value: string) {
    return value === "HIGH" ? t("eventReviews.riskHIGH") : value === "MEDIUM" ? t("eventReviews.riskMEDIUM")
      : value === "LOW" ? t("eventReviews.riskLOW") : value;
  }

  function stateLabel(value: string) {
    switch (value) {
      case "Pending Approval": return t("eventReviews.statePendingApproval");
      case "Under Review": return t("eventReviews.stateUnderReview");
      case "Revision Requested": return t("eventReviews.stateRevisionRequested");
      case "Approved": return t("eventReviews.stateApproved");
      case "Rejected": return t("eventReviews.stateRejected");
      case "Expired": return t("eventReviews.stateExpired");
      case "Cancelled": return t("eventReviews.stateCancelled");
      default: return value;
    }
  }

  function sectionLabel(value: string) {
    switch (value) {
      case "schedule": return t("eventReviews.sectionschedule");
      case "venue": return t("eventReviews.sectionvenue");
      case "content": return t("eventReviews.sectioncontent");
      case "risk": return t("eventReviews.sectionrisk");
      case "budget": return t("eventReviews.sectionbudget");
      default: return t("eventReviews.sectionother");
    }
  }

  function obligationLabel(value: ClubObligation) {
    return value === "overdueSettlement" ? t("eventReviews.overdueSettlement")
      : value === "overdueRefund" ? t("eventReviews.overdueRefund") : t("eventReviews.overdueReport");
  }

  function outcomeLabel(value: EventReviewOutcome) {
    return value === "Approve" ? t("eventReviews.approve") : value === "Reject" ? t("eventReviews.reject")
      : t("eventReviews.requestRevision");
  }

  function toggleSection(section: EventReviewSection) {
    setSections((current) => current.includes(section)
      ? current.filter((item) => item !== section) : [...current, section]);
  }

  function editLine(index: number, change: { amount?: string; reason?: string }) {
    setAmounts((current) => ({ ...current, [index]: { ...current[index], ...change } }));
  }

  const back = { to: "/workspace/event-proposals", label: t("eventReviews.back") };
  const label = "text-xs font-semibold tracking-wide text-muted-app uppercase";

  // A disabled query stays pending forever, so only wait for a proposal the user may load.
  if (auth.isPending || (isOfficer && review.isPending)) return <div className="space-y-4">
    <AppSkeleton className="h-10 w-1/2" /><AppSkeleton className="h-[28rem] w-full" />
  </div>;
  if (!auth.data) return <AppNotice>
    <p>{t("eventReviews.signIn")}</p>
    <Link className="inline-block font-semibold text-accent-app"
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>{t("eventReviews.signInLink")}</Link>
  </AppNotice>;
  if (!isOfficer) return <AppNotice tone="danger" role="alert">{t("eventReviews.unauthorized")}</AppNotice>;
  if (review.isError || !review.data) return (
    <>
      <PageHeader title={t("eventReviews.proposal")} back={back} />
      <AppNotice tone="danger" role="alert" title={review.error?.message ?? t("eventReviews.loadError")}>
        <AppButton variant="secondary" onClick={() => void review.refetch()}>{t("eventReviews.retry")}</AppButton>
      </AppNotice>
    </>
  );

  const { event, task, club, decisions, versions, bookings, semesterBudgets, budget } = review.data;
  const current = versions.find((version) => version.revisionNo === event.currentRevisionNo) ?? versions.at(-1);
  const payload = current?.payload ?? {};
  const lines = current?.budgetLines ?? [];
  const occurrences = Array.isArray(payload.occurrences) ? payload.occurrences as { startAt?: string; endAt?: string }[] : [];
  const conflictMessage = event.conflictDetail && typeof event.conflictDetail === "object"
    ? text((event.conflictDetail as Record<string, unknown>).message) : undefined;
  const mine = task.assigneeId === auth.data.user.id;
  const isOpen = task.state === "Open" && ["Pending Approval", "Under Review"].includes(event.state);
  const stateTone: AppBadgeTone = event.state === "Approved" ? "success"
    : ["Rejected", "Expired", "Cancelled"].includes(event.state) ? "danger"
      : event.state === "Revision Requested" ? "warning" : "info";
  const riskTone: AppBadgeTone = event.riskCategory === "HIGH" ? "danger" : event.riskCategory === "MEDIUM" ? "warning" : "success";
  const conflictTone: AppBadgeTone = event.conflictResult === "Blocking Conflict" ? "danger"
    : event.conflictResult === "Warning" ? "warning" : "success";
  const approvedAmounts = lines.map((line, index) => {
    const raw = amounts[index]?.amount;
    return raw === undefined ? line.amount : Number(raw);
  });
  const approvedTotal = approvedAmounts.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
  const semesterTotal = semesterBudgets.reduce((sum, item) => sum + item.approvedTotal, 0);

  async function claim() {
    if (!auth.data || !id) return;
    try { await action.mutateAsync({ kind: "claim", id, csrfToken: auth.data.csrfToken }); }
    catch { /* Mutation state is rendered below. */ }
  }

  async function decide() {
    if (!auth.data || !id) return;
    // Same rules the server enforces, checked before asking for confirmation.
    const badAmount = outcome === "Approve" && approvedAmounts.some((value, index) =>
      !Number.isInteger(value) || value < 0 || value > lines[index]!.amount);
    const missingLineReason = outcome === "Approve" && approvedAmounts.some((value, index) =>
      value < lines[index]!.amount && !amounts[index]?.reason?.trim());
    const missing = outcome !== "Approve" && !reason.trim() ? t("eventReviews.reasonRequired")
      : outcome === "Request revision" && !sections.length ? t("eventReviews.sectionsRequired")
        : outcome === "Request revision" && (!deadline || new Date(deadline) <= new Date()) ? t("eventReviews.deadlineRequired")
          : badAmount ? t("eventReviews.amountInvalid") : missingLineReason ? t("eventReviews.amountReasonRequired") : null;
    setFormError(missing);
    if (missing) return;
    const prompt = outcome === "Approve" ? t("eventReviews.confirmApprove")
      : outcome === "Reject" ? t("eventReviews.confirmReject") : t("eventReviews.confirmRevision");
    if (!window.confirm(prompt)) return;
    try {
      await action.mutateAsync({ kind: "decide", id, csrfToken: auth.data.csrfToken, input: {
        outcome, reason: reason.trim() || undefined, reviewNote: reviewNote.trim() || undefined,
        ...(outcome === "Request revision" ? { sections, revisionDeadlineAt: new Date(deadline).toISOString() } : {}),
        ...(outcome === "Approve" ? {
          conditions: conditions.split("\n").map((item) => item.trim()).filter(Boolean),
          budgetLines: approvedAmounts.map((approvedAmount, index) => ({ approvedAmount,
            ...(approvedAmount < lines[index]!.amount ? { reason: amounts[index]?.reason?.trim() } : {}) })),
        } : {}),
      } });
    } catch { /* Mutation state is rendered below. */ }
  }

  return (
    <>
      <PageHeader title={event.title} back={back}
        description={`${event.clubName} · ${t("eventReviews.revision", { number: event.currentRevisionNo })}`}
        actions={<AppBadge tone={stateTone}>{t("eventReviews.status")}: {stateLabel(event.state)}</AppBadge>} />

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="font-heading text-xl font-bold">{t("eventReviews.overview")}</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div><dt className={label}>{t("eventReviews.when")}</dt><dd className="mt-1 font-medium">{date(event.startAt)} – {date(event.endAt)}</dd></div>
              <div><dt className={label}>{t("eventReviews.where")}</dt><dd className="mt-1 font-medium break-words">
                {event.property ? `${event.property.code} · ${event.property.name}` : event.venueText ?? "—"}</dd></div>
              <div><dt className={label}>{t("eventReviews.audience")}</dt><dd className="mt-1 font-medium">
                {event.audienceScope === "MEMBERS_ONLY" ? t("eventReviews.audienceMembers") : t("eventReviews.audiencePublic")}</dd></div>
              <div><dt className={label}>{t("eventReviews.capacity")}</dt><dd className="mt-1 font-medium">{t("eventReviews.capacityValue", { count: event.capacity })}</dd></div>
              <div><dt className={label}>{t("eventReviews.risk")}</dt><dd className="mt-1">
                {event.riskCategory ? <AppBadge tone={riskTone}>{riskLabel(event.riskCategory)}</AppBadge> : "—"}</dd></div>
              <div><dt className={label}>{t("eventReviews.conflict")}</dt><dd className="mt-1 space-y-1">
                <AppBadge tone={conflictTone}>{event.conflictResult === "Blocking Conflict" ? t("eventReviews.conflictBlocking")
                  : event.conflictResult === "Warning" ? t("eventReviews.conflictWarning") : t("eventReviews.conflictNone")}</AppBadge>
                {conflictMessage && <p className="text-sm text-muted-app">{conflictMessage}</p>}</dd></div>
              {([["objective", text(payload.objective) ?? event.objective], ["plan", text(payload.plan)],
                ["riskNote", text(payload.riskNote)], ["facilityNeeds", text(payload.facilityNeeds)]] as const)
                .filter(([, value]) => value).map(([key, value]) => (
                  <div key={key} className="sm:col-span-2"><dt className={label}>{key === "objective" ? t("eventReviews.objective")
                    : key === "plan" ? t("eventReviews.plan") : key === "riskNote" ? t("eventReviews.riskNote") : t("eventReviews.facilityNeeds")}</dt>
                  <dd className="mt-2 leading-7 break-words whitespace-pre-wrap">{value}</dd></div>))}
              {occurrences.length > 0 && <div className="sm:col-span-2"><dt className={label}>{t("eventReviews.occurrences")}</dt>
                <dd className="mt-2"><ul className="space-y-1 text-sm">{occurrences.map((item, index) =>
                  <li key={index}>{item.startAt ? date(item.startAt) : "—"} – {item.endAt ? date(item.endAt) : "—"}</li>)}</ul></dd></div>}
            </dl>
          </section>

          <section className="border-t border-border-app pt-8">
            <h2 className="font-heading text-xl font-bold">{t("eventReviews.budget")}</h2>
            {lines.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead><tr className="border-b border-border-app text-muted-app">
                    <th scope="col" className="py-2 pr-3 font-semibold">{t("eventReviews.category")}</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">{t("eventReviews.purpose")}</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">{t("eventReviews.requestedAmount")}</th>
                    {budget && <th scope="col" className="py-2 text-right font-semibold">{t("eventReviews.approvedAmount")}</th>}
                  </tr></thead>
                  <tbody className="divide-y divide-border-app">{lines.map((line, index) => {
                    const approved = budget?.lines[index];
                    return <tr key={index} className="align-top">
                      <td className="py-2.5 pr-3 font-medium">{line.category}</td>
                      <td className="py-2.5 pr-3"><p className="break-words">{line.purpose}</p>
                        {line.plannedItems && <p className="mt-0.5 text-xs text-muted-app">{line.plannedItems}</p>}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{money(line.amount)}</td>
                      {budget && <td className="py-2.5 text-right tabular-nums">{approved ? money(approved.approvedAmount) : "—"}
                        {approved?.reason && <p className="mt-0.5 text-xs text-muted-app">{approved.reason}</p>}</td>}
                    </tr>;
                  })}</tbody>
                  <tfoot><tr className="border-t border-border-app font-semibold">
                    <td className="py-2.5 pr-3" colSpan={2}>{t("eventReviews.total")}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{money(current?.requestedBudgetTotal ?? 0)}</td>
                    {budget && <td className="py-2.5 text-right tabular-nums">{money(budget.approvedTotal)}</td>}
                  </tr></tfoot>
                </table>
              </div>
            ) : <p className="mt-3 text-sm text-muted-app">{t("eventReviews.budgetNone")}</p>}
            <div className="mt-6 rounded-2xl bg-surface-app p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{t("eventReviews.semesterBudgets")}</h3>
                {semesterBudgets.length > 0 && <AppBadge tone="info">{t("eventReviews.semesterTotal", { amount: money(semesterTotal) })}</AppBadge>}
              </div>
              {semesterBudgets.length ? <ul className="mt-3 divide-y divide-border-app text-sm">{semesterBudgets.map((item) =>
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="min-w-0 break-words">{item.eventTitle ?? item.eventId}</span>
                  <span className="tabular-nums">{money(item.approvedTotal)}</span>
                </li>)}</ul>
                : <p className="mt-2 text-sm text-muted-app">{t("eventReviews.semesterBudgetsNone")}</p>}
            </div>
          </section>

          <div className="grid gap-10 border-t border-border-app pt-8 md:grid-cols-2">
            <section className="min-w-0">
              <h2 className="font-heading text-lg font-bold">{t("eventReviews.clubSection")}</h2>
              <p className="mt-3 text-sm"><span className="text-muted-app">{t("eventReviews.clubState")}: </span>
                <span className="font-semibold">{club.name}</span> · {club.state}</p>
              {club.obligations.length ? <ul className="mt-3 space-y-2">{club.obligations.map((item) =>
                <li key={item}><AppBadge tone="danger">{obligationLabel(item)}</AppBadge></li>)}</ul>
                : <p className="mt-3 text-sm text-muted-app">{t("eventReviews.noObligations")}</p>}
            </section>
            <section className="min-w-0">
              <h2 className="font-heading text-lg font-bold">{t("eventReviews.bookings")}</h2>
              {bookings.length ? <ul className="mt-3 divide-y divide-border-app text-sm">{bookings.map((booking) =>
                <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="min-w-0"><span className="block font-medium break-words">
                    {[booking.propertyCode, booking.propertyName].filter(Boolean).join(" · ") || "—"}</span>
                  <span className="block text-xs text-muted-app">{date(booking.startAt)} – {date(booking.endAt)}</span></span>
                  <AppBadge>{booking.state}</AppBadge>
                </li>)}</ul>
                : <p className="mt-3 text-sm text-muted-app">{t("eventReviews.noBookings")}</p>}
              <p className="mt-3 text-xs text-muted-app">{t("eventReviews.bookingsHint")}</p>
            </section>
          </div>

          <section className="border-t border-border-app pt-8">
            <h2 className="font-heading text-xl font-bold">{t("eventReviews.history")}</h2>
            <ol className="mt-5 space-y-4 border-l-2 border-border-app pl-5">{versions.map((version) =>
              <li key={version.id} className="relative">
                <span aria-hidden="true" className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-primary-app" />
                <p className="font-semibold">{t("eventReviews.revision", { number: version.revisionNo })}
                  {version.requestedBudgetTotal > 0 && <span className="font-normal text-muted-app"> · {money(version.requestedBudgetTotal)}</span>}</p>
                <p className="text-sm text-muted-app">{t("eventReviews.submittedBy", {
                  name: version.submittedByName ?? version.submittedBy, date: date(version.submittedAt) })}</p>
              </li>)}</ol>
          </section>
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-6">
          {isOpen && !mine ? (
            <div className="rounded-2xl bg-surface-app p-5">
              <p className="text-sm text-muted-app">{task.assigneeId ? t("eventReviews.claimedByOther") : t("eventReviews.claimHint")}</p>
              {!task.assigneeId && <AppButton className="mt-5 w-full" disabled={action.isPending} onClick={() => void claim()}>
                {action.isPending ? t("eventReviews.claiming") : t("eventReviews.claim")}</AppButton>}
            </div>
          ) : isOpen ? (
            <section className="rounded-2xl bg-surface-app p-5">
              <h2 className="font-heading text-lg font-bold">{t("eventReviews.decisionPanel")}</h2>
              <p className="mt-1 text-sm text-muted-app">{t("eventReviews.decisionHint")}</p>
              <div className="mt-5 grid grid-cols-3 gap-1 rounded-full bg-surface-strong-app p-1">{outcomes.map((value) =>
                <button key={value} type="button" aria-pressed={outcome === value} onClick={() => { setOutcome(value); setFormError(null); }}
                  className={cn("min-h-11 rounded-full px-2 py-2 text-xs font-semibold text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app", {
                    "bg-bg-app text-primary-app shadow-sm hover:text-primary-app": outcome === value,
                  })}>{outcomeLabel(value)}</button>)}</div>

              {outcome === "Request revision" && <fieldset className="mt-5">
                <legend className="text-sm font-semibold">{t("eventReviews.sections")}</legend>
                <div className="mt-3 space-y-1">{EVENT_REVIEW_SECTIONS.map((section) =>
                  <label key={section} className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm hover:bg-surface-strong-app">
                    <input type="checkbox" checked={sections.includes(section)} onChange={() => toggleSection(section)} className="size-4 accent-primary-app" />
                    {sectionLabel(section)}</label>)}</div>
                <label className="mt-4 block text-sm font-semibold">{t("eventReviews.deadline")}
                  <AppInput type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-2 w-full font-normal" /></label>
              </fieldset>}

              {outcome === "Approve" && lines.length > 0 && <fieldset className="mt-5">
                <legend className="text-sm font-semibold">{t("eventReviews.approveAmounts")}</legend>
                <p className="mt-1 text-xs text-muted-app">{t("eventReviews.approveAmountsHint")}</p>
                <div className="mt-3 space-y-4">{lines.map((line, index) => {
                  const lowered = approvedAmounts[index]! < line.amount;
                  return <div key={index}>
                    <label className="block text-sm"><span className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium break-words">{line.category}</span>
                      <span className="text-xs text-muted-app">{t("eventReviews.requestedAmount")}: {money(line.amount)}</span></span>
                      <AppInput type="number" min={0} max={line.amount} step={1000} inputMode="numeric"
                        value={amounts[index]?.amount ?? String(line.amount)}
                        onChange={(e) => editLine(index, { amount: e.target.value })} className="mt-1.5 w-full tabular-nums" /></label>
                    {lowered && <AppInput aria-label={t("eventReviews.reductionReason")} placeholder={t("eventReviews.reductionReason")}
                      value={amounts[index]?.reason ?? ""} maxLength={500}
                      onChange={(e) => editLine(index, { reason: e.target.value })} className="mt-2 w-full" />}
                  </div>;
                })}</div>
                <p className="mt-3 text-sm font-semibold">{t("eventReviews.approvedTotal", { amount: money(approvedTotal) })}</p>
              </fieldset>}

              {outcome === "Approve" && <label className="mt-5 block text-sm font-semibold">{t("eventReviews.conditions")}
                <AppTextarea className="mt-2 min-h-24 w-full font-normal" value={conditions}
                  onChange={(e) => setConditions(e.target.value)} placeholder={t("eventReviews.conditionsHint")} /></label>}

              <label className="mt-5 block text-sm font-semibold">{t("eventReviews.reason")}
                <AppTextarea className="mt-2 min-h-24 w-full font-normal" value={reason} maxLength={5000}
                  onChange={(e) => setReason(e.target.value)} placeholder={t("eventReviews.reasonHint")} /></label>
              <label className="mt-5 block text-sm font-semibold">{t("eventReviews.reviewNote")}
                <AppTextarea className="mt-2 min-h-24 w-full font-normal" value={reviewNote} maxLength={10000}
                  onChange={(e) => setReviewNote(e.target.value)} placeholder={t("eventReviews.reviewNoteHint")} /></label>
              <AppButton className="mt-6 w-full" disabled={action.isPending} onClick={() => void decide()}>
                {action.isPending ? t("eventReviews.submitting") : t("eventReviews.submit")}</AppButton>
              {formError && <p role="alert" className="mt-3 text-sm text-danger-app">{formError}</p>}
              {action.isError && <p role="alert" className="mt-3 text-sm text-danger-app">{action.error.message || t("eventReviews.actionError")}</p>}
            </section>
          ) : null}
          {action.isSuccess && action.variables?.kind === "decide" && <AppNotice role="status">{t("eventReviews.success")}</AppNotice>}

          {event.approvalConditions.length > 0 && <section>
            <h2 className="font-heading text-lg font-bold">{t("eventReviews.conditions")}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{event.approvalConditions.map((item, index) => <li key={index} className="break-words">{item}</li>)}</ul>
          </section>}

          <section>
            <h2 className="font-heading text-lg font-bold">{t("eventReviews.decisions")}</h2>
            {decisions.length ? <ol className="mt-4 space-y-4">{[...decisions].reverse().map((decision) =>
              <li key={decision.id} className="border-l-2 border-primary-app pl-3">
                <p className="font-semibold">{outcomeLabel(decision.outcome)}</p>
                <p className="mt-1 text-xs text-muted-app">{t("eventReviews.decidedAt", { date: date(decision.at) })}</p>
                {decision.sections.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{decision.sections.map((section) =>
                  <AppBadge key={section} tone="warning">{sectionLabel(section)}</AppBadge>)}</div>}
                {decision.reason && <p className="mt-2 text-sm break-words">{decision.reason}</p>}
              </li>)}</ol>
              : <p className="mt-3 text-sm text-muted-app">{t("eventReviews.noDecisions")}</p>}
          </section>
        </aside>
      </div>
    </>
  );
}
