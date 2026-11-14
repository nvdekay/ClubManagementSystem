import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { RevisionChanges } from "@/components/custom/RevisionChanges";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useEventDefenseActions } from "@/hooks/useEventDefense";
import { useEventProposal, useEventProposalAction } from "@/hooks/useEventProposalReviews";
import { apiErrors } from "@/i18n/apiErrors";
import { ProposalDecisionPanel } from "@/pages/icpdp/ProposalDecisionPanel";
import { ScheduleDefenseDialog } from "@/pages/icpdp/ScheduleDefenseDialog";
import {
  type ClubObligation, type EventProposalVersion, type EventReviewOutcome,
} from "@/services/eventProposalReviews";
import { diffFields, type DiffField } from "@/utils/revisionDiff";
import { useConfirm } from "@/hooks/useConfirm";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function resolveI18nError(error: Error | null | undefined, fallback: string): string {
  if (!error) return fallback;
  if (error.message === apiErrors.vi.unknown || error.message === apiErrors.en.unknown) {
    return fallback;
  }
  return error.message || fallback;
}

export function EventProposalReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const askConfirm = useConfirm();
  const auth = useAuth();
  const isOfficer = Boolean(auth.data?.systemRoles.includes("ICPDP_OFFICER"));
  const review = useEventProposal(id, isOfficer);
  const action = useEventProposalAction();
  const defenseAction = useEventDefenseActions();

  const [scheduleDialogMode, setScheduleDialogMode] = useState<"schedule" | "reschedule" | null>(null);
  const [reasonModalKind, setReasonModalKind] = useState<"cancel" | "rejectReschedule" | "noShow" | null>(null);
  const [modalReason, setModalReason] = useState("");
  const [renderedAt] = useState(() => Date.now());
  const current = review.data?.versions.find((version) => version.revisionNo === review.data?.event.currentRevisionNo)
    ?? review.data?.versions.at(-1);
  const lines = current?.budgetLines ?? [];

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
      case "Re-defense Pending": return t("eventDefense.stateReDefensePending");
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
      : value === "Re-defense" ? t("eventDefense.outcomeReDefense") : t("eventReviews.requestRevision");
  }

  const back = { to: "/workspace/event-proposals", label: t("eventReviews.back") };
  const label = "text-xs text-muted-app";

  // A disabled query stays pending forever, so only wait for a proposal the user may load.
  if (auth.isPending || (isOfficer && review.isPending)) return <div className="space-y-4">
    <AppSkeleton className="h-10 w-1/2" /><AppSkeleton className="h-[28rem] w-full" />
  </div>;
  if (!auth.data) return <AppNotice>
    <p>{t("eventReviews.signIn")}</p>
    <Link className="inline-block font-semibold text-primary-app hover:underline"
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>{t("eventReviews.signInLink")}</Link>
  </AppNotice>;
  if (!isOfficer) return <AppNotice tone="danger" role="alert">{t("eventReviews.unauthorized")}</AppNotice>;
  if (review.isError || !review.data) return (
    <>
      <PageHeader title={t("eventReviews.proposal")} back={back} />
      <AppNotice tone="danger" role="alert" title={resolveI18nError(review.error, t("eventReviews.loadError"))}>
        <AppButton variant="secondary" onClick={() => void review.refetch()}>{t("eventReviews.retry")}</AppButton>
      </AppNotice>
    </>
  );

  const { event, task, club, decisions, versions, bookings, semesterBudgets, budget, activeDefenseSession, defenseHistory } = review.data;
  // The version submitted before the current one, and the revision request that sent it back.
  const previous = current && versions.filter((version) => version.revisionNo < current.revisionNo)
    .sort((a, b) => b.revisionNo - a.revisionNo)[0];
  const revisionRequest = current && [...decisions].reverse().find((decision) => decision.outcome === "Request revision"
    && new Date(decision.at) <= new Date(current.submittedAt));
  function range(start: unknown, end: unknown) {
    return typeof start === "string" && typeof end === "string" ? `${date(start)} – ${date(end)}` : "";
  }
  const versionFields: DiffField<EventProposalVersion>[] = [
    { key: "title", label: t("eventReviews.fieldTitle"), read: (v) => text(v.payload.title) ?? "" },
    { key: "when", label: t("eventReviews.when"), read: (v) => range(v.payload.startAt, v.payload.endAt) },
    { key: "property", label: t("eventReviews.fieldProperty"), read: (v) => {
      const id = text(v.payload.propertyId);
      return !id ? "" : id === event.property?.id ? event.property.name : t("eventReviews.otherProperty");
    } },
    { key: "venue", label: t("eventReviews.where"), read: (v) => text(v.payload.venueText) ?? "" },
    { key: "audience", label: t("eventReviews.audience"), read: (v) => v.payload.audienceScope === "MEMBERS_ONLY"
      ? t("eventReviews.audienceMembers") : t("eventReviews.audiencePublic") },
    { key: "capacity", label: t("eventReviews.capacity"), read: (v) => String(v.payload.capacity ?? "") },
    { key: "objective", label: t("eventReviews.objective"), read: (v) => text(v.payload.objective) ?? "" },
    { key: "plan", label: t("eventReviews.plan"), read: (v) => text(v.payload.plan) ?? "" },
    { key: "risk", label: t("eventReviews.risk"), read: (v) => riskLabel(text(v.payload.riskCategory) ?? "") },
    { key: "riskNote", label: t("eventReviews.riskNote"), read: (v) => text(v.payload.riskNote) ?? "" },
    { key: "facilityNeeds", label: t("eventReviews.facilityNeeds"), read: (v) => text(v.payload.facilityNeeds) ?? "" },
    { key: "occurrences", label: t("eventReviews.occurrences"), read: (v) => (Array.isArray(v.payload.occurrences)
      ? v.payload.occurrences as { startAt?: unknown; endAt?: unknown }[] : []).map((o) => range(o.startAt, o.endAt)).join("\n") },
    { key: "budget", label: t("eventReviews.budget"), read: (v) => v.budgetLines.map((line) =>
      `${line.category}: ${money(line.amount)} — ${line.purpose}${line.plannedItems ? `\n  ${line.plannedItems}` : ""}`).join("\n") },
    { key: "form", label: t("eventReviews.fieldForm"), read: (v) => (Array.isArray(v.payload.registrationForm)
      ? v.payload.registrationForm as { label?: string; required?: boolean }[] : [])
      .map((field) => `${field.label ?? ""}${field.required ? " *" : ""}`).join("\n") },
  ];
  const payload = current?.payload ?? {};
  const occurrences = Array.isArray(payload.occurrences) ? payload.occurrences as { startAt?: string; endAt?: string }[] : [];
  const conflictMessage = event.conflictDetail && typeof event.conflictDetail === "object"
    ? text((event.conflictDetail as Record<string, unknown>).message) : undefined;
  const mine = task.assigneeId === auth.data.user.id;
  const isOpen = task.state === "Open" && ["Pending Approval", "Under Review", "Re-defense Pending"].includes(event.state);
  const stateTone: AppBadgeTone = event.state === "Approved" ? "success"
    : ["Rejected", "Expired", "Cancelled"].includes(event.state) ? "danger"
      : event.state === "Revision Requested" ? "warning" : "info";
  const riskTone: AppBadgeTone = event.riskCategory === "HIGH" ? "danger" : event.riskCategory === "MEDIUM" ? "warning" : "success";
  const conflictTone: AppBadgeTone = event.conflictResult === "Blocking Conflict" ? "danger"
    : event.conflictResult === "Warning" ? "warning" : "success";
  const semesterTotal = semesterBudgets.reduce((sum, item) => sum + item.approvedTotal, 0);
  const confirmOverdue = Boolean(
    activeDefenseSession && activeDefenseSession.state === "SCHEDULED"
    && new Date(activeDefenseSession.startAt).getTime() - renderedAt < 24 * 3600_000,
  );

  async function claim() {
    if (!auth.data || !id) return;
    try { await action.mutateAsync({ kind: "claim", id, csrfToken: auth.data.csrfToken }); }
    catch (error) { console.error("[EventProposalReviewPage] claim failed:", error); }
  }

  async function handleStartDefense() {
    if (!auth.data || !id) return;
    defenseAction.reset();
    try {
      await defenseAction.mutateAsync({ kind: "start", eventId: id, csrfToken: auth.data.csrfToken });
      void navigate(`/workspace/event-proposals/${id}/defense`);
    } catch (error) {
      console.error("[EventProposalReviewPage] start defense failed:", error);
    }
  }

  async function submitReasonModal(e: FormEvent) {
    e.preventDefault();
    if (!auth.data || !id || !reasonModalKind) return;
    const trimmedReason = modalReason.trim();
    if (!trimmedReason) return;
    try {
      if (reasonModalKind === "cancel") {
        await defenseAction.mutateAsync({ kind: "cancel", eventId: id, reason: trimmedReason, csrfToken: auth.data.csrfToken });
      } else if (reasonModalKind === "rejectReschedule") {
        await defenseAction.mutateAsync({
          kind: "respondReschedule",
          eventId: id,
          input: { accept: false, reason: trimmedReason },
          csrfToken: auth.data.csrfToken,
        });
      } else {
        if (!(await askConfirm(t("eventDefense.noShowWarning")))) return;
        await defenseAction.mutateAsync({ kind: "noShow", eventId: id, reason: trimmedReason, csrfToken: auth.data.csrfToken });
      }
      setReasonModalKind(null);
      setModalReason("");
    } catch (error) {
      console.error("[EventProposalReviewPage] defense modal action failed:", reasonModalKind, error);
    }
  }

  return (
    <>
      <PageHeader title={event.title} back={back}
        description={`${event.clubName} · ${t("eventReviews.revision", { number: event.currentRevisionNo })}`}
        actions={<AppBadge tone={stateTone}>{t("eventReviews.status")}: {stateLabel(event.state)}</AppBadge>} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          {previous && current && <RevisionChanges previousNumber={previous.revisionNo}
            changes={diffFields(previous, current, versionFields)}
            requestedSections={revisionRequest?.sections.map(sectionLabel)} reason={revisionRequest?.reason} />}
          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("eventReviews.overview")}</h2>
            <dl className="mt-4 grid gap-5 sm:grid-cols-2">
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

          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("eventReviews.budget")}</h2>
            {budget && <Link className="mt-4 inline-flex rounded-lg border border-border-app px-4 py-2 text-sm font-medium text-primary-app hover:bg-surface-app"
              to={`/workspace/budgets/${budget.id}`}>{t("budgets.title")}</Link>}
            {lines.length ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-border-app bg-bg-app">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead className="bg-surface-app"><tr className="text-xs text-muted-app">
                    <th scope="col" className="px-4 py-2.5 font-medium">{t("eventReviews.category")}</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">{t("eventReviews.purpose")}</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">{t("eventReviews.requestedAmount")}</th>
                    {budget && <th scope="col" className="px-4 py-2.5 text-right font-medium">{t("eventReviews.approvedAmount")}</th>}
                  </tr></thead>
                  <tbody>{lines.map((line, index) => {
                    const approved = budget?.lines[index];
                    return <tr key={index} className="border-t border-border-app align-top">
                      <td className="px-4 py-3 font-medium">{line.category}</td>
                      <td className="px-4 py-3"><p className="break-words">{line.purpose}</p>
                        {line.plannedItems && <p className="mt-0.5 whitespace-pre-line text-xs text-muted-app">{line.plannedItems}</p>}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{money(line.amount)}</td>
                      {budget && <td className="px-4 py-3 text-right tabular-nums">{approved ? money(approved.approvedAmount) : "—"}
                        {approved?.reason && <p className="mt-0.5 text-xs text-muted-app">{approved.reason}</p>}</td>}
                    </tr>;
                  })}</tbody>
                  <tfoot><tr className="border-t border-border-app bg-surface-app font-semibold">
                    <td className="px-4 py-3" colSpan={2}>{t("eventReviews.total")}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(current?.requestedBudgetTotal ?? 0)}</td>
                    {budget && <td className="px-4 py-3 text-right tabular-nums">{money(budget.approvedTotal)}</td>}
                  </tr></tfoot>
                </table>
              </div>
            ) : <p className="mt-3 text-sm text-muted-app">{t("eventReviews.budgetNone")}</p>}
            <div className="mt-5 rounded-xl border border-border-app bg-surface-app p-4">
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

          <div className="grid gap-6 md:grid-cols-2">
            <section className="min-w-0 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
              <h2 className="font-heading text-base font-semibold">{t("eventReviews.clubSection")}</h2>
              <p className="mt-3 text-sm"><span className="text-muted-app">{t("eventReviews.clubState")}: </span>
                <span className="font-semibold">{club.name}</span> · {club.state}</p>
              {club.obligations.length ? <ul className="mt-3 space-y-2">{club.obligations.map((item) =>
                <li key={item}><AppBadge tone="danger">{obligationLabel(item)}</AppBadge></li>)}</ul>
                : <div className="mt-3"><AppEmptyState message={t("eventReviews.noObligations")} /></div>}
            </section>
            <section className="min-w-0 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
              <h2 className="font-heading text-base font-semibold">{t("eventReviews.bookings")}</h2>
              {bookings.length ? <ul className="mt-3 divide-y divide-border-app text-sm">{bookings.map((booking) =>
                <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="min-w-0"><span className="block font-medium break-words">
                    {[booking.propertyCode, booking.propertyName].filter(Boolean).join(" · ") || "—"}</span>
                  <span className="block text-xs text-muted-app">{date(booking.startAt)} – {date(booking.endAt)}</span></span>
                  <AppBadge>{booking.state}</AppBadge>
                </li>)}</ul>
                : <div className="mt-3"><AppEmptyState message={t("eventReviews.noBookings")} /></div>}
              <p className="mt-3 text-xs text-muted-app">{t("eventReviews.bookingsHint")}</p>
            </section>
          </div>

          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-base font-semibold">{t("eventDefense.sectionTitle")}</h2>
              {isOpen && mine && !activeDefenseSession && (
                <AppButton type="button" onClick={() => { defenseAction.reset(); setScheduleDialogMode("schedule"); }}>
                  {t("eventDefense.scheduleButton")}
                </AppButton>
              )}
            </div>

            {activeDefenseSession ? (
              <div className="space-y-3 rounded-xl border border-border-app bg-surface-app p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{activeDefenseSession.title}</span>
                  <AppBadge tone={activeDefenseSession.state === "CONFIRMED" || activeDefenseSession.state === "IN_PROGRESS" ? "success"
                    : activeDefenseSession.state === "RESCHEDULE_REQUESTED" ? "warning"
                      : activeDefenseSession.state === "DEFENDED" ? "info" : "neutral"}>
                    {t(`eventDefense.state_${activeDefenseSession.state}`)}
                  </AppBadge>
                </div>
                <p className="text-muted-app">
                  {date(activeDefenseSession.startAt)} · {t("eventDefense.durationValue", { minutes: activeDefenseSession.durationMinutes })} · {activeDefenseSession.propertyName}
                </p>
                {activeDefenseSession.note && (
                  <p className="whitespace-pre-wrap break-words text-muted-app">{activeDefenseSession.note}</p>
                )}

                {confirmOverdue && (
                  <AppNotice tone="warning">{t("eventDefense.overdueConfirmWarning")}</AppNotice>
                )}

                {activeDefenseSession.state === "RESCHEDULE_REQUESTED" && activeDefenseSession.rescheduleReason && (
                  <AppNotice tone="warning" title={t("eventDefense.reschedulePendingTitle")}>
                    <p>{t("eventDefense.rescheduleReasonLabel")}: {activeDefenseSession.rescheduleReason}</p>
                  </AppNotice>
                )}

                {defenseAction.isError && (
                  <p role="alert" className="text-danger-app">{resolveI18nError(defenseAction.error, t("eventDefense.defenseActionFailed"))}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {mine && (activeDefenseSession.state === "SCHEDULED" || activeDefenseSession.state === "CONFIRMED") && (
                    <AppButton type="button" disabled={defenseAction.isPending} onClick={() => void handleStartDefense()}>
                      {t("eventDefense.startDefenseButton")}
                    </AppButton>
                  )}
                  {(activeDefenseSession.state === "IN_PROGRESS" || activeDefenseSession.state === "DEFENDED") && (
                    <Link
                      className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary-app px-3.5 font-heading text-sm font-medium text-on-primary-app shadow-xs hover:opacity-90"
                      to={`/workspace/event-proposals/${event.id}/defense`}
                    >
                      {t("eventDefense.openLiveRoomButton")}
                    </Link>
                  )}
                  {mine && activeDefenseSession.state === "RESCHEDULE_REQUESTED" && (
                    <>
                      <AppButton type="button" onClick={() => { defenseAction.reset(); setScheduleDialogMode("reschedule"); }}>
                        {t("eventDefense.acceptReschedule")}
                      </AppButton>
                      <AppButton type="button" variant="secondary" onClick={() => { defenseAction.reset(); setModalReason(""); setReasonModalKind("rejectReschedule"); }}>
                        {t("eventDefense.rejectReschedule")}
                      </AppButton>
                    </>
                  )}
                  {mine && ["SCHEDULED", "CONFIRMED", "RESCHEDULE_REQUESTED"].includes(activeDefenseSession.state) && (
                    <AppButton type="button" variant="secondary" onClick={() => { defenseAction.reset(); setModalReason(""); setReasonModalKind("cancel"); }}>
                      {t("eventDefense.cancelButton")}
                    </AppButton>
                  )}
                  {mine && ["SCHEDULED", "CONFIRMED", "RESCHEDULE_REQUESTED", "IN_PROGRESS"].includes(activeDefenseSession.state) && (
                    <AppButton type="button" variant="ghost" onClick={() => { defenseAction.reset(); setModalReason(""); setReasonModalKind("noShow"); }}>
                      {t("eventDefense.noShowButton")}
                    </AppButton>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-app">{t("eventDefense.scheduleHint")}</p>
            )}

            {defenseHistory && defenseHistory.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold">{t("eventDefense.historyTitle")}</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {defenseHistory.map((item) => (
                    <li key={item.id} className="rounded-lg border border-border-app px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{item.title} · {t("eventDefense.revisionTag", { number: item.revisionNo })}</span>
                        <AppBadge>{t(`eventDefense.state_${item.state}`)}</AppBadge>
                      </div>
                      <p className="mt-1 text-xs text-muted-app">
                        {date(item.startAt)} · {item.propertyName}
                        {item.outcome ? ` · ${t(`eventDefense.outcome_${item.outcome}`)}` : ""}
                      </p>
                      {(item.cancelReason || item.outcomeReason) && (
                        <p className="mt-1 text-xs text-muted-app">{item.cancelReason ?? item.outcomeReason}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("eventReviews.history")}</h2>
            <ol className="mt-4 ml-1 space-y-4 border-l-2 border-border-app pl-5">{versions.map((version) =>
              <li key={version.id} className="relative">
                <span aria-hidden="true" className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-brand-app" />
                <p className="font-medium">{t("eventReviews.revision", { number: version.revisionNo })}
                  {version.requestedBudgetTotal > 0 && <span className="font-normal text-muted-app"> · {money(version.requestedBudgetTotal)}</span>}</p>
                <p className="text-sm text-muted-app">{t("eventReviews.submittedBy", {
                  name: version.submittedByName ?? version.submittedBy, date: date(version.submittedAt) })}</p>
              </li>)}</ol>
          </section>
        </div>

        <aside className="min-w-0 space-y-6 xl:sticky xl:top-24">
          {isOpen && !mine ? (
            <div className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
              <p className="text-sm text-muted-app">{task.assigneeId ? t("eventReviews.claimedByOther") : t("eventReviews.claimHint")}</p>
              {!task.assigneeId && <AppButton className="mt-5 w-full" disabled={action.isPending} onClick={() => void claim()}>
                {action.isPending ? t("eventReviews.claiming") : t("eventReviews.claim")}</AppButton>}
            </div>
          ) : isOpen ? (
            <ProposalDecisionPanel
              detail={review.data}
              csrfToken={auth.data.csrfToken}
              postDefense={Boolean(activeDefenseSession?.state === "DEFENDED" && !activeDefenseSession.outcome)}
            />
          ) : null}

          {event.approvalConditions.length > 0 && <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("eventReviews.conditions")}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{event.approvalConditions.map((item, index) => <li key={index} className="break-words">{item}</li>)}</ul>
          </section>}

          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <h2 className="font-heading text-base font-semibold">{t("eventReviews.decisions")}</h2>
            {decisions.length ? <ol className="mt-4 space-y-4">{[...decisions].reverse().map((decision) =>
              <li key={decision.id} className="border-l-2 border-brand-app pl-3">
                <p className="font-medium">{outcomeLabel(decision.outcome)}</p>
                <p className="mt-1 text-xs text-muted-app">{t("eventReviews.decidedAt", { date: date(decision.at) })}</p>
                {decision.sections.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{decision.sections.map((section) =>
                  <AppBadge key={section} tone="warning">{sectionLabel(section)}</AppBadge>)}</div>}
                {decision.reason && <p className="mt-2 text-sm break-words">{decision.reason}</p>}
              </li>)}</ol>
              : <div className="mt-3"><AppEmptyState message={t("eventReviews.noDecisions")} /></div>}
          </section>
        </aside>
      </div>

      {scheduleDialogMode !== null && (
        <ScheduleDefenseDialog
          open
          mode={scheduleDialogMode}
          eventId={event.id}
          eventTitle={event.title}
          csrfToken={auth.data.csrfToken}
          excludeDefenseId={scheduleDialogMode === "reschedule" ? activeDefenseSession?.id : undefined}
          onClose={() => setScheduleDialogMode(null)}
        />
      )}

      <AppDialog
        open={reasonModalKind !== null}
        title={reasonModalKind === "cancel"
          ? t("eventDefense.cancelTitle")
          : reasonModalKind === "noShow"
            ? t("eventDefense.noShowTitle")
            : t("eventDefense.rejectReschedule")}
        closeLabel={t("clubEvents.close")}
        onClose={() => { if (!defenseAction.isPending) setReasonModalKind(null); }}
        footer={(
          <AppButton type="submit" form="defense-reason-modal-form" disabled={defenseAction.isPending || !modalReason.trim()}>
            {t("clubEvents.confirm")}
          </AppButton>
        )}
      >
        <form id="defense-reason-modal-form" onSubmit={(e) => void submitReasonModal(e)} className="space-y-4">
          {reasonModalKind === "noShow" && <AppNotice tone="danger">{t("eventDefense.noShowWarning")}</AppNotice>}
          <label className="block text-sm font-medium text-text-app">
            {reasonModalKind === "cancel"
              ? t("eventDefense.cancelReasonLabel")
              : reasonModalKind === "noShow"
                ? t("eventDefense.noShowReasonLabel")
                : t("eventDefense.rejectRescheduleReasonLabel")}<AppRequiredMark />
            <AppTextarea
              value={modalReason}
              maxLength={2000}
              onChange={(e) => setModalReason(e.target.value)}
              className="mt-1.5 min-h-24 w-full font-normal"
            />
          </label>
          {defenseAction.isError && <p role="alert" className="text-sm text-danger-app">{resolveI18nError(defenseAction.error, t("eventDefense.defenseActionFailed"))}</p>}
        </form>
      </AppDialog>
    </>
  );
}
