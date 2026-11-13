import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { NavLink, useParams } from "react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppMoneyInput } from "@/components/ui/money-input/AppMoneyInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTable, appTableFeatures, type AppTableFeatures } from "@/components/ui/table/AppTable";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useClubEventDefense, useEventDefenseActions } from "@/hooks/useEventDefense";
import { useClubEvent, useClubEventFeedback, useClubEventMutation, useClubEventOptions, useClubEvents, useEventParticipants } from "@/hooks/useClubEvents";
import type { ClubEvent, ClubEventError, ClubEventInput, EventParticipant } from "@/services/clubEvents";
import { useConfirm } from "@/hooks/useConfirm";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { cn } from "@/utils/cn";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";

const eventsEmpty: ClubEvent[] = [];
const stateTones: Record<string, AppBadgeTone> = {
  Draft: "neutral", "Pending Approval": "warning", "Revision Requested": "warning", "Re-defense Pending": "info", Approved: "success", Upcoming: "success",
  Ongoing: "success", Completed: "neutral", "Report Submitted": "neutral", Closed: "neutral", Rejected: "danger", Cancelled: "danger",
};
const tabClass = "inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium text-muted-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app";
const activeTabClass = "bg-segment-app text-text-app shadow-xs";
const participantsEmpty: EventParticipant[] = [];
const eventColumns = createColumnHelper<AppTableFeatures, ClubEvent>();
const participantColumns = createColumnHelper<AppTableFeatures, EventParticipant>();
function localTime(value: string) { return new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16); }
function iso(value: string) { return new Date(`${value}:00+07:00`).toISOString(); }
function freshEvent(): ClubEventInput {
  const start = new Date(Date.now() + 10 * 86400000); start.setUTCMinutes(0, 0, 0);
  return { title: "", objective: "", plan: "", startAt: start.toISOString(), endAt: new Date(start.getTime() + 2 * 3600000).toISOString(),
    venueText: "", audienceScope: "PUBLIC", capacity: 40, riskCategory: "LOW", budgetLines: [], bookingIds: [], registrationForm: [], occurrences: [] };
}
function Field({ label, required, error, flagged, children }: { label: string; required?: boolean; error?: string | null; flagged?: string; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-sm"><span className="flex flex-wrap items-center gap-2 font-medium text-text-app"><span>{label}{required && <AppRequiredMark />}</span>
    {flagged && <AppBadge tone="warning">{flagged}</AppBadge>}</span>{children}<AppFieldError message={error} /></label>;
}
/** Comments ICPDP stores on a decision (UC26): the parts to revise and any approval conditions. */
type DecisionComments = { sections?: string[]; conditions?: string[] };
function numberError(t: TFunction, value: number, min: number, max: number) {
  if (!Number.isInteger(value)) return t("common.invalidNumber");
  if (value < min) return t("common.numberMin", { min });
  return value > max ? t("common.numberMax", { max }) : null;
}
function obligationLabel(t: TFunction, item: string) {
  const [key, value] = item.split(":", 2);
  switch (key) {
    case "overdueSettlement": return t("clubEvents.overdueSettlement");
    case "overdueRefund": return t("clubEvents.overdueRefund");
    case "overduePeriodicReport": return t("clubEvents.overduePeriodicReport", { period: value ?? "" });
    case "overduePostEventReport": return t("clubEvents.overduePostEventReport");
    default: return item;
  }
}
// Spells out what the server named (UC25 E2 obligations, UC30 E1 affected registrations) instead of its raw message.
function ErrorMessage({ error }: { error: unknown }) {
  const { t } = useTranslation();
  if (!error) return null;
  const details = error instanceof Error && "details" in error ? (error as ClubEventError).details : undefined;
  const className = "break-words text-sm text-danger-app";
  if (details?.obligations?.length) {
    return <div role="alert" className={className}><p>{t("clubEvents.blockedByObligations")}</p>
      <ul className="mt-1 list-disc pl-5">{details.obligations.map((item) => <li key={item}>{obligationLabel(t, item)}</li>)}</ul></div>;
  }
  if (details?.registrationIds?.length) return <p role="alert" className={className}>{t("clubEvents.capacityBelowConfirmed", { count: details.registrationIds.length })}</p>;
  if (details?.conflicts?.length) return <p role="alert" className={className}>{t("clubEvents.blockingConflicts", { count: details.conflicts.length })}</p>;
  return <p role="alert" className={className}>{error instanceof Error ? error.message : String(error)}</p>;
}
function TablePager({ pageIndex, pageCount, onChange }: { pageIndex: number; pageCount: number; onChange: (value: number) => void }) {
  const { t } = useTranslation();
  return <AppPagination pageIndex={pageIndex} pageCount={pageCount} onPageChange={onChange} prevLabel={t("clubEvents.previous")} nextLabel={t("clubEvents.next")}
    pageLabel={(page) => t("clubEvents.page", { page })} navLabel={t("clubEvents.pagination")} />;
}

export function ClubEventsPage({ mode = "events" }: { mode?: "events" | "attendance" | "feedback" }) {
  const { clubId = "" } = useParams();
  const { t, i18n } = useTranslation();
  const askConfirm = useConfirm();
  const auth = useAuth();
  const permissions = auth.data?.workspaces.find((w) => w.kind === "club" && w.clubId === clubId)?.permissions ?? [];
  const allowed = permissions.includes(mode === "events" ? "club.event.manage" : mode === "attendance" ? "club.attendance.manage" : "club.feedback.view");
  const events = useClubEvents(clubId, allowed);
  const mutation = useClubEventMutation(clubId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState("");
  // The detail panel renders under the table, off-screen on most laptops; bring it into view on pick.
  function revealDetail() {
    requestAnimationFrame(() => document.getElementById("club-event-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  const [compare, setCompare] = useState<string[]>([]);
  const [editing, setEditing] = useState<ClubEvent | "new" | null>(null);
  const [draft, setDraft] = useState<ClubEventInput>(freshEvent);
  const [editorOpenedAt, setEditorOpenedAt] = useState(0); // "now" for the start-in-future check; render must stay pure
  const [operation, setOperation] = useState<"publish" | "cancel" | "reschedule" | "capacity" | "check-in" | "correct" | "unlock" | null>(null);
  const [target, setTarget] = useState<EventParticipant | null>(null);
  const [reason, setReason] = useState("");
  const [studentId, setStudentId] = useState("");
  const [capacity, setCapacity] = useState(40);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [venue, setVenue] = useState("");
  const [property, setProperty] = useState("");
  const [noRegistration, setNoRegistration] = useState(false);
  const [walkIn, setWalkIn] = useState(false);
  const [waitlist, setWaitlist] = useState(true);
  const [registrationOpen, setRegistrationOpen] = useState("");
  const [registrationClose, setRegistrationClose] = useState("");
  const [checkOpen, setCheckOpen] = useState("");
  const [checkClose, setCheckClose] = useState("");
  const [corrected, setCorrected] = useState("");
  const [absent, setAbsent] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [renderedAt] = useState(() => Date.now());
  const detail = useClubEvent(clubId, selected, allowed && mode === "events");
  const defense = useClubEventDefense(clubId, selected || undefined, allowed && mode === "events" && Boolean(selected));
  const defenseAction = useEventDefenseActions();
  const options = useClubEventOptions(clubId, allowed && mode === "events");
  const participants = useEventParticipants(clubId, selected, allowed && mode === "attendance");
  const feedback = useClubEventFeedback(clubId, compare, allowed && mode === "feedback");
  const rows = events.data ?? eventsEmpty;
  const active = mode === "events" ? detail.data?.event : rows.find((e) => e.id === selected);
  // The latest revision request on the open proposal: which parts ICPDP asked the club to fix.
  const revisionRequest = [...(detail.data?.decisions ?? [])].reverse().find((d) => d.outcome === "Request revision");
  const revisionSections = active?.state === "Revision Requested" ? (revisionRequest?.comments as DecisionComments | undefined)?.sections ?? [] : [];
  function flag(...parts: string[]) {
    return editing !== "new" && parts.some((part) => revisionSections.includes(part)) ? t("common.revisionFlagged") : undefined;
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
  const format = useMemo(() => new Intl.DateTimeFormat(i18n.language === "vi" ? "vi-VN" : "en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }), [i18n.language]);
  const filtered = useMemo(() => rows.filter((e) => (!filter || e.state === filter) && e.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [rows, filter, search]);
  const columns = useMemo(() => eventColumns.columns([
    eventColumns.accessor("title", { header: t("clubEvents.titleField"), cell: (info) => <button type="button" className="text-left font-medium text-text-app hover:text-primary-app" onClick={() => { setSelected(info.row.original.id); mutation.reset(); setSuccess(false); revealDetail(); }}>{info.getValue()}</button> }),
    eventColumns.accessor("state", { header: t("clubEvents.state"), cell: (info) => <AppBadge tone={stateTones[info.getValue()] ?? "neutral"}>{t(`clubEvents.${info.getValue()}`, { defaultValue: info.getValue() ?? "" })}</AppBadge> }),
    eventColumns.accessor("startAt", { header: t("clubEvents.start"), cell: (info) => format.format(new Date(info.getValue())) }),
    eventColumns.accessor("capacity", { header: t("clubEvents.capacity"), cell: (info) => `${info.row.original.confirmedRegistrationCount} / ${info.getValue()}` }),
  ]), [t, format, mutation]);
  const table = useTable({ features: appTableFeatures, columns, data: filtered, initialState: { pagination: { pageIndex: 0, pageSize: 10 } } });
  const people = participants.data ?? participantsEmpty;
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "checked" | "missing">("all");
  // Check-in is open once the event is published and running, until attendance is finalized (UC31, UC32).
  const canCheckIn = Boolean(active && !active.attendanceFinalized && ["Upcoming", "Ongoing", "Completed"].includes(active.state));
  const confirmedPeople = people.filter((p) => p.state === "Confirmed" || p.attendanceId);
  const checkedCount = people.filter((p) => p.attendanceId && !p.abnormalFlags.includes("no-show")).length;
  const shownPeople = attendanceFilter === "all" ? people
    : attendanceFilter === "checked" ? people.filter((p) => p.attendanceId && !p.abnormalFlags.includes("no-show"))
      : people.filter((p) => p.state === "Confirmed" && (!p.attendanceId || p.abnormalFlags.includes("no-show")));


  const runAction = useCallback(async function runAction(action: string, body: object) {
    if (!auth.data || !selected) return;
    setSuccess(false); setFormError(null);
    try { await mutation.mutateAsync({ kind: "action", id: selected, action, body, csrfToken: auth.data.csrfToken }); setSuccess(true); setOperation(null); }
    catch (error) { setFormError(error); }
  }, [auth.data, selected, mutation, setSuccess, setFormError, setOperation]);
  function openEditor(event: ClubEvent | "new") {
    setEditing(event); setDraft(event === "new" ? freshEvent() : { title: event.title, objective: event.objective, plan: event.plan, startAt: event.startAt, endAt: event.endAt,
      venueText: event.venueText, propertyId: event.propertyId, audienceScope: event.audienceScope, capacity: event.capacity, riskCategory: event.riskCategory,
      riskNote: event.riskNote, facilityNeeds: event.facilityNeeds, occurrences: event.occurrences ?? [], budgetLines: event.budgetLines, bookingIds: event.bookingIds, registrationForm: event.registrationForm ?? [] });
    mutation.reset(); setFormError(null); setSuccess(false); eventField.reset(); setEditorOpenedAt(new Date().getTime());
  }
  const openOperation = useCallback(function openOperation(kind: NonNullable<typeof operation>, participant: EventParticipant | null = null) {
    if (!active) return;
    mutation.reset(); setFormError(null); setSuccess(false); setOperation(kind); setReason(""); setTarget(participant); setCorrected(""); setAbsent(participant?.abnormalFlags.includes("no-show") ?? false);
    setCapacity(active.capacity); setNewStart(localTime(active.startAt)); setNewEnd(localTime(active.endAt)); setVenue(active.venueText ?? ""); setProperty(active.propertyId ?? "");
    setRegistrationOpen(localTime(new Date().toISOString())); setRegistrationClose(localTime(active.startAt)); setCheckOpen(localTime(active.checkInOpenAt ?? active.startAt)); setCheckClose(localTime(active.checkInCloseAt ?? active.endAt));
    setWalkIn(active.allowWalkIn); setWaitlist(active.waitlistEnabled); setNoRegistration(false); setStudentId(participant?.studentId ?? "");
  }, [active, mutation, setOperation, setFormError, setSuccess, setReason, setTarget, setCorrected, setAbsent, setCapacity, setNewStart, setNewEnd, setVenue, setProperty, setRegistrationOpen, setRegistrationClose, setCheckOpen, setCheckClose, setWalkIn, setWaitlist, setNoRegistration, setStudentId]);
  const pcolumns = useMemo(() => participantColumns.columns([
    participantColumns.accessor("name", { header: t("clubEvents.name"), cell: (info) => <span className="block min-w-40 font-medium break-words">{info.getValue()}<span className="block text-xs font-normal whitespace-nowrap text-muted-app">{info.row.original.email}</span></span> }),
    participantColumns.accessor("state", { header: t("clubEvents.state"), cell: (info) => <span>{info.getValue() ? t(`clubEvents.${info.getValue()}`, { defaultValue: info.getValue() ?? "" }) : "—"}{info.row.original.waitlistPosition ? ` #${info.row.original.waitlistPosition}` : ""}</span> }),
    participantColumns.accessor("checkedInAt", { header: t("clubEvents.checkInColumn"), cell: (info) => {
      const row = info.row.original;
      if (!row.attendanceId) return <span className="text-muted-app">{t("clubEvents.notCheckedIn")}</span>;
      if (row.abnormalFlags.includes("no-show")) return <span className="text-danger-app">{t("clubEvents.noShow")}</span>;
      return <span className="text-success-app">{row.checkedInAt ? format.format(new Date(row.checkedInAt)) : "✓"}
        <br /><span className="text-muted-app">{row.method === "self" ? t("clubEvents.methodSelf") : t("clubEvents.methodManual")}</span></span>;
    } }),
    participantColumns.accessor("abnormalFlags", { header: t("clubEvents.flags"), cell: (info) => <div className="flex flex-col gap-1">{info.getValue().map((flag) => <span key={flag}>{t(`clubEvents.${flag}`, { defaultValue: flag })}</span>)}{info.row.original.correctionReason && <p className="text-muted-app">{info.row.original.correctionReason}</p>}</div> }),
    participantColumns.display({ id: "actions", header: t("clubEvents.action"), cell: (info) => <div className="flex flex-wrap gap-2">
      {canCheckIn && info.row.original.state === "Confirmed" && !info.row.original.attendanceId && <AppButton onClick={() => openOperation("check-in", info.row.original)}>{t("clubEvents.checkInRow")}</AppButton>}
      {info.row.original.state === "Waitlisted" && active?.state === "Upcoming" && <AppButton disabled={mutation.isPending} onClick={() => void runAction("promote", { registrationId: info.row.original.registrationId })}>{t("clubEvents.promote")}</AppButton>}
      {active?.state === "Completed" && !active.attendanceFinalized && <AppButton onClick={() => openOperation("correct", info.row.original)}>{t("clubEvents.correct")}</AppButton>}
    </div> }),
  ]), [t, active, mutation.isPending, runAction, openOperation, canCheckIn, format]);
  const ptable = useTable({ features: appTableFeatures, columns: pcolumns, data: shownPeople, initialState: { pagination: { pageIndex: 0, pageSize: 10 } } });
  async function save(event: FormEvent) {
    event.preventDefault(); if (!auth.data || !eventField.touchAll()) return;
    setFormError(null);
    try {
      const result = editing === "new" ? await mutation.mutateAsync({ kind: "create", input: draft, csrfToken: auth.data.csrfToken }) :
        await mutation.mutateAsync({ kind: "action", id: editing!.id, action: "save", body: { ...draft, expectedVersion: editing!.version }, csrfToken: auth.data.csrfToken });
      setEditing(null); setSelected(result.event.id); setSuccess(true);
    } catch (error) { setFormError(error); }
  }
  async function execute(event: FormEvent) {
    event.preventDefault(); if (!active || !operation || !opField.touchAll()) return;
    opField.reset(); // valid now; a later failure is a server error, shown above the form
    try {
      const version = { expectedVersion: active.version };
      if (operation === "publish") await runAction("publish", { ...version, ...(!noRegistration ? { registrationOpenAt: iso(registrationOpen), registrationCloseAt: iso(registrationClose) } : {}),
        checkInOpenAt: iso(checkOpen), checkInCloseAt: iso(checkClose), allowWalkIn: noRegistration || walkIn, waitlistEnabled: !noRegistration && waitlist });
      else if (operation === "reschedule") await runAction("reschedule", { ...version, reason, startAt: iso(newStart), endAt: iso(newEnd), venueText: venue, ...(property ? { propertyId: property } : {}) });
      else if (operation === "cancel") await runAction("cancel", { ...version, reason });
      else if (operation === "capacity") await runAction("capacity", { capacity });
      else if (operation === "check-in") await runAction("check-ins", { studentId, ...(reason.trim() ? { reason } : {}) });
      else if (operation === "correct") await runAction("attendance/correct", { studentId: target!.studentId, reason, absent, ...(corrected ? { checkedInAt: iso(corrected) } : {}) });
      else await runAction("attendance/unlock", { reason });
    } catch (error) { setFormError(error); }
  }
  const required = t("common.fieldRequired");
  const eventErrors: Record<string, string | null> = {
    title: draft.title.trim() ? null : required, objective: draft.objective.trim() ? null : required, plan: draft.plan.trim() ? null : required,
    startAt: new Date(draft.startAt).getTime() > editorOpenedAt ? null : t("common.dateNotPast"),
    endAt: Date.parse(draft.endAt) > Date.parse(draft.startAt) ? null : t("common.endAfterStart"),
    venue: draft.venueText?.trim() || draft.propertyId ? null : t("clubEvents.venueRequired"),
    capacity: numberError(t, draft.capacity, 1, 100000),
  };
  draft.budgetLines.forEach((line, index) => {
    eventErrors[`budget.${index}.category`] = line.category.trim() ? null : required;
    eventErrors[`budget.${index}.purpose`] = line.purpose.trim() ? null : required;
    eventErrors[`budget.${index}.amount`] = numberError(t, line.amount, 1, 1000000000000);
  });
  draft.registrationForm?.forEach((field, index) => {
    eventErrors[`form.${index}.label`] = field.label.trim() ? null : required;
    eventErrors[`form.${index}.options`] = ["select", "radio", "checkbox"].includes(field.type) && !field.options?.some((option) => option.trim()) ? required : null;
  });
  draft.occurrences?.forEach((occurrence, index) => { eventErrors[`occurrence.${index}.endAt`] = Date.parse(occurrence.endAt) > Date.parse(occurrence.startAt) ? null : t("common.endAfterStart"); });
  const eventField = useFieldValidation(eventErrors);
  const publishing = operation === "publish" && !noRegistration;
  const opField = useFieldValidation({
    registrationOpen: publishing && !registrationOpen ? required : null,
    registrationClose: !publishing ? null : !registrationClose ? required : registrationOpen && registrationClose <= registrationOpen ? t("common.endAfterStart") : null,
    checkOpen: operation === "publish" && !checkOpen ? required : null,
    checkClose: operation !== "publish" ? null : !checkClose ? required : checkOpen && checkClose <= checkOpen ? t("common.endAfterStart") : null,
    newStart: operation === "reschedule" && !newStart ? required : null,
    newEnd: operation !== "reschedule" ? null : !newEnd ? required : newStart && newEnd <= newStart ? t("common.endAfterStart") : null,
    capacity: operation === "capacity" ? numberError(t, capacity, 1, 100000) : null,
    studentId: operation === "check-in" && !studentId ? t("common.chooseRequired") : null,
    reason: ["cancel", "reschedule", "unlock", "correct"].includes(operation ?? "") && !reason.trim() ? required : null,
  });
  function closeOperation() { setOperation(null); opField.reset(); }
  const linkableBookings = (options.data?.bookings ?? []).filter((b) => b.propertyId === draft.propertyId || b.propertyType === "EQUIPMENT");
  const roomOptions = [{ value: "", label: t("clubEvents.none") }, ...(options.data?.properties ?? []).map((p) => ({ value: p.id, label: p.name }))];
  if (auth.isPending) return <AppSkeleton className="h-40 w-full" />;
  if (!allowed) return <p role="alert">{t("clubEvents.noAccess")}</p>;
  return <>
    <PageHeader title={t(`clubEvents.${mode === "events" ? "title" : mode}`)} description={t("clubEvents.description")} />
    <nav aria-label={t("clubEvents.title")} className="mb-5 inline-flex flex-wrap gap-1 rounded-lg border border-border-app bg-surface-app p-1">
      {permissions.includes("club.event.manage") && <NavLink end className={({ isActive }) => cn(tabClass, { [activeTabClass]: isActive })} to={`/club/${clubId}/events`}>{t("clubEvents.title")}</NavLink>}
      {permissions.includes("club.attendance.manage") && <NavLink end className={({ isActive }) => cn(tabClass, { [activeTabClass]: isActive })} to={`/club/${clubId}/event-attendance`}>{t("clubEvents.attendance")}</NavLink>}
      {permissions.includes("club.feedback.view") && <NavLink end className={({ isActive }) => cn(tabClass, { [activeTabClass]: isActive })} to={`/club/${clubId}/event-feedback`}>{t("clubEvents.feedback")}</NavLink>}
    </nav>
    <ErrorMessage error={events.error ?? formError} />
    {success && <p role="status" className="mb-3 text-success-app">{t("clubEvents.success")}</p>}
    {mode !== "feedback" && <>
      <div className="mb-4 flex flex-wrap items-center gap-3"><AppInput aria-label={t("clubEvents.search")} placeholder={t("clubEvents.search")} value={search} onChange={(e) => { setSearch(e.target.value); table.setPageIndex(0); }} />
        <AppSelect label={t("clubEvents.state")} value={filter} onChange={(v) => { setFilter(v); table.setPageIndex(0); }} options={[{ value: "", label: t("clubEvents.all") }, ...[...new Set(rows.map((e) => e.state))].map((s) => ({ value: s, label: t(`clubEvents.${s}`, { defaultValue: s }) }))]} />
        {mode === "events" && <AppButton onClick={() => openEditor("new")}>{t("clubEvents.create")}</AppButton>}
      </div>
      <AppTable table={table} emptyMessage={t("clubEvents.empty")} loading={events.isPending} />
      <TablePager pageIndex={table.state.pagination.pageIndex} pageCount={table.getPageCount()} onChange={(v) => table.setPageIndex(v)} />
    </>}
    {mode === "events" && selected && <section id="club-event-detail" className="mt-6 scroll-mt-24 rounded-2xl border border-border-app bg-bg-app p-5 text-sm shadow-xs">
      <ErrorMessage error={detail.error} />
      {detail.isPending ? <AppSkeleton className="h-48" /> : detail.data && active && <>
        <h2 className="mb-2 font-heading text-base font-semibold break-words">{active.title}</h2><p className="flex flex-wrap items-center gap-2 text-sm text-muted-app"><AppBadge tone={stateTones[active.state] ?? "neutral"}>{t(`clubEvents.${active.state}`, { defaultValue: active.state })}</AppBadge> {format.format(new Date(active.startAt))} – {format.format(new Date(active.endAt))}</p>
        <p className="mt-2 break-words">{active.objective}</p><p className="mt-2 whitespace-pre-wrap break-words">{active.plan}</p>
        <p className="mt-2">{t("clubEvents.venue")}: {active.venueText ?? options.data?.properties.find((p) => p.id === active.propertyId)?.name ?? "—"} · {t(`clubEvents.${active.audienceScope}`)}</p>
        {active.state === "Revision Requested" && revisionRequest ? <div role="status" className="mt-4 rounded-xl border-l-4 border-warning-app bg-warning-app/10 px-4 py-3 text-sm">
          <p className="font-semibold">{t("clubEvents.revisionTitle")}</p>
          {revisionSections.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-2"><span>{t("clubEvents.revisionSections")}:</span>
            {revisionSections.map((section) => <AppBadge key={section} tone="warning">{sectionLabel(section)}</AppBadge>)}</div>}
          {revisionRequest.reason && <p className="mt-2 whitespace-pre-wrap break-words">{revisionRequest.reason}</p>}
          {active.revisionDeadlineAt && <p className="mt-2"><span className="font-semibold">{t("clubEvents.revisionDeadline")}:</span> {format.format(new Date(active.revisionDeadlineAt))}</p>}
          <p className="mt-2 text-muted-app">{t("clubEvents.revisionHint")}</p>
        </div> : active.revisionDeadlineAt && <p className="mt-2">{t("clubEvents.revisionDeadline")}: {format.format(new Date(active.revisionDeadlineAt))}</p>}
        {active.approvalConditions?.length > 0 && <div className="mt-3"><h3 className="font-semibold">{t("clubEvents.conditions")}</h3><ul className="mt-2 list-inside list-disc">{active.approvalConditions.map((condition, index) => <li key={index}>{condition}</li>)}</ul></div>}
        {active.conflictResult && <p className="mt-3">{t(`clubEvents.${active.conflictResult}`, { defaultValue: active.conflictResult })}</p>}
        {detail.data.budget && <p className="mt-2">{t("clubEvents.approvedBudget")}: {new Intl.NumberFormat(i18n.language === "vi" ? "vi-VN" : "en-GB", { style: "currency", currency: "VND" }).format(detail.data.budget.approvedTotal)}</p>}
        {active.state === "Re-defense Pending" && (
          <div className="mt-4">
            <AppNotice tone="info">{t("eventDefense.clubReDefenseBanner")}</AppNotice>
          </div>
        )}
        {defense.isError && (
          <div className="mt-4">
            <AppNotice tone="danger" role="alert">{t("eventDefense.loadClubDefenseFailed")}</AppNotice>
          </div>
        )}
        {defense.data?.activeSession && (() => {
          const ds = defense.data.activeSession;
          const within24h = new Date(ds.startAt).getTime() - renderedAt < 24 * 3600_000;
          return (
            <div className="mt-4 space-y-3 rounded-xl border border-border-app bg-surface-app p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading text-sm font-semibold">{t("eventDefense.clubCardTitle")}</h3>
                <AppBadge tone={ds.state === "CONFIRMED" || ds.state === "IN_PROGRESS" ? "success" : ds.state === "RESCHEDULE_REQUESTED" ? "warning" : ds.state === "NO_SHOW" ? "danger" : "info"}>
                  {t(`eventDefense.state_${ds.state}`)}
                </AppBadge>
              </div>
              <p className="font-medium">{ds.title}</p>
              <p className="text-muted-app">
                {format.format(new Date(ds.startAt))} · {t("eventDefense.durationValue", { minutes: ds.durationMinutes })} · {ds.propertyName}
              </p>
              {ds.note && <p className="whitespace-pre-wrap break-words text-muted-app">{ds.note}</p>}
              {ds.state === "SCHEDULED" && (
                <AppNotice tone={within24h ? "warning" : "info"}>{t("eventDefense.clubConfirmNotice")}</AppNotice>
              )}
              {ds.confirmedAt && (
                <p className="text-xs text-success-app">{t("eventDefense.clubConfirmedLabel", { time: format.format(new Date(ds.confirmedAt)) })}</p>
              )}
              {ds.state === "RESCHEDULE_REQUESTED" && ds.rescheduleReason && (
                <p className="text-xs text-muted-app">{t("eventDefense.rescheduleReasonLabel")}: {ds.rescheduleReason}</p>
              )}
              {ds.state === "NO_SHOW" && <AppNotice tone="danger">{t("eventDefense.clubNoShowBanner")}</AppNotice>}
              {defenseAction.isError && <p role="alert" className="text-danger-app">{defenseAction.error.message}</p>}
              <div className="flex flex-wrap gap-2">
                {ds.state === "SCHEDULED" && auth.data && (
                  <AppButton
                    type="button"
                    disabled={within24h || defenseAction.isPending}
                    onClick={() => {
                      defenseAction.reset();
                      void defenseAction
                        .mutateAsync({ kind: "confirmClub", clubId, eventId: active.id, csrfToken: auth.data!.csrfToken })
                        .catch((error) => console.error("[ClubEventsPage] confirm defense failed:", error));
                    }}
                  >
                    {t("eventDefense.clubConfirmButton")}
                  </AppButton>
                )}
                {(ds.state === "SCHEDULED" || ds.state === "CONFIRMED") && auth.data && (
                  <AppButton
                    type="button"
                    variant="secondary"
                    disabled={within24h || defenseAction.isPending}
                    onClick={() => { defenseAction.reset(); setRescheduleReason(""); setRescheduleOpen(true); }}
                  >
                    {t("eventDefense.clubRequestRescheduleButton")}
                  </AppButton>
                )}
              </div>
            </div>
          );
        })()}
        <div className="my-4 flex flex-wrap gap-2">
          {["Draft", "Revision Requested"].includes(active.state) && <><AppButton onClick={() => openEditor(active)}>{t("clubEvents.edit")}</AppButton><AppButton disabled={mutation.isPending} onClick={() => void runAction("submit", { expectedVersion: active.version })}>{t("clubEvents.submit")}</AppButton></>}
          {active.state === "Approved" && <AppButton onClick={() => openOperation("publish")}>{t("clubEvents.publish")}</AppButton>}
          {["Approved", "Upcoming"].includes(active.state) && <AppButton onClick={() => openOperation("reschedule")}>{t("clubEvents.reschedule")}</AppButton>}
          {["Approved", "Upcoming", "Ongoing"].includes(active.state) && !active.attendanceFinalized && <AppButton variant="ghost" onClick={() => openOperation("cancel")}>{t("clubEvents.cancel")}</AppButton>}
        </div>
        {active.checkInCode && <p>{t("clubEvents.code")}: <strong>{active.checkInCode}</strong></p>}
        <h3 className="mt-5 text-sm font-semibold">{t("clubEvents.versions")}</h3>
        {detail.data.versions.map((v) => <details key={v.revisionNo} className="mt-2 rounded-lg border border-border-app p-3"><summary>#{v.revisionNo} · {format.format(new Date(v.submittedAt))}</summary>
          <p className="mt-2 whitespace-pre-wrap break-words">{String((v.payload as { plan?: string })?.plan ?? "")}</p>
          {v.budgetLines.map((line, index) => <p key={index} className="mt-2">{line.category}: {line.amount.toLocaleString(i18n.language)} VND — {line.purpose}</p>)}</details>)}
        <h3 className="mt-5 text-sm font-semibold">{t("clubEvents.decisions")}</h3>
        {detail.data.decisions.map((d, index) => <div key={index} className="mt-2"><p>{d.outcome === "Re-defense" ? t("eventDefense.outcomeReDefense") : t(`eventReviews.${d.outcome === "Approve" ? "approve" : d.outcome === "Reject" ? "reject" : "requestRevision"}`)} · {format.format(new Date(d.at))}{d.reason ? ` · ${d.reason}` : ""}</p>
          {((d.comments as DecisionComments | undefined)?.sections ?? []).length > 0 && <div className="mt-1 flex flex-wrap gap-2">{(d.comments as DecisionComments).sections!.map((section) =>
            <AppBadge key={section} tone="warning">{sectionLabel(section)}</AppBadge>)}</div>}</div>)}
      </>}
    </section>}
    {mode === "attendance" && active && <section id="club-event-detail" className="mt-6 scroll-mt-24 space-y-4 rounded-2xl border border-border-app bg-bg-app p-5 text-sm shadow-xs">
      <h2 className="font-heading text-base font-semibold break-words">{active.title}</h2>
      <p>{t("clubEvents.registeredOfCapacity", { count: active.confirmedRegistrationCount, capacity: active.capacity })}
        {" · "}<strong>{t("clubEvents.checkInStats", { checked: checkedCount, confirmed: confirmedPeople.length })}</strong></p>
      {active.checkInOpenAt && active.checkInCloseAt && <p className="text-sm text-muted-app">{t("clubEvents.checkInWindow")}: {format.format(new Date(active.checkInOpenAt))} – {format.format(new Date(active.checkInCloseAt))}</p>}
      {!canCheckIn && !active.attendanceFinalized && <AppNotice tone="warning">{active.state === "Approved" && active.publishedAt
        ? t("clubEvents.checkInRepublish") : t("clubEvents.checkInNotOpen")}</AppNotice>}
      {active.checkInCode && <p>{t("clubEvents.code")}: <strong>{active.checkInCode}</strong></p>}
      {active.attendanceFinalized && <p>{t("clubEvents.attendanceLocked")}</p>}
      <ErrorMessage error={participants.error} />
      <div className="flex flex-wrap gap-2">
        {active.state === "Upcoming" && <AppButton onClick={() => openOperation("capacity")}>{t("clubEvents.capacity")}</AppButton>}
        {!active.attendanceFinalized && ["Upcoming", "Ongoing", "Completed"].includes(active.state) && <AppButton onClick={() => openOperation("check-in")}>{t("clubEvents.checkin")}</AppButton>}
        {active.state === "Completed" && !active.attendanceFinalized && <AppButton disabled={mutation.isPending} onClick={async () => { if (await askConfirm(t("clubEvents.confirmFinalize"))) void runAction("attendance/finalize", {}); }}>{t("clubEvents.finalize")}</AppButton>}
        {active.attendanceFinalized && auth.data?.systemRoles.includes("ATTENDANCE_UNLOCK") && <AppButton onClick={() => openOperation("unlock")}>{t("clubEvents.unlock")}</AppButton>}
      </div>
      <div className="w-full sm:w-64"><AppSelect label={t("clubEvents.attendanceFilter")} value={attendanceFilter}
        onChange={(value) => { setAttendanceFilter(value as typeof attendanceFilter); ptable.setPageIndex(0); }}
        options={[{ value: "all", label: t("clubEvents.filterAll") }, { value: "checked", label: t("clubEvents.filterChecked") },
          { value: "missing", label: t("clubEvents.filterMissing") }]} /></div>
      <AppTable table={ptable} emptyMessage={t("clubEvents.noParticipants")} loading={participants.isPending} />
      <TablePager pageIndex={ptable.state.pagination.pageIndex} pageCount={ptable.getPageCount()} onChange={(v) => ptable.setPageIndex(v)} />
    </section>}
    {mode === "feedback" && <section className="space-y-5">
      <div className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      <h2 className="font-heading text-base font-semibold">{t("clubEvents.compare")}</h2>
      {events.isPending && <AppSkeleton className="mt-4 h-32" />}
      <div className="mt-4 flex flex-wrap gap-2">{rows.map((e) => <label key={e.id} className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border border-border-app bg-bg-app px-3 py-1.5 text-sm break-words transition-colors hover:bg-surface-app has-checked:border-brand-app has-checked:bg-primary-soft-app has-disabled:opacity-50"><input type="checkbox" className="accent-primary-app" checked={compare.includes(e.id)} disabled={!compare.includes(e.id) && compare.length >= 20}
        onChange={(change) => setCompare(change.target.checked ? [...compare, e.id] : compare.filter((id) => id !== e.id))} /><span className="min-w-0">{e.title}</span></label>)}</div>
      {!events.isPending && !rows.length && <div className="mt-4"><AppEmptyState variant="boxed" message={t("clubEvents.empty")} /></div>}
      </div>
      <ErrorMessage error={feedback.error} />{feedback.isPending && compare.length > 0 && <AppSkeleton className="h-40" />}
      <div className="grid gap-4 md:grid-cols-2">{feedback.data?.map((f) => <article key={f.eventId} className="min-w-0 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs"><h3 className="font-heading text-base font-semibold break-words">{f.title}</h3><p className="mt-1 text-sm text-muted-app">{t("clubEvents.responses")}: {f.respondents}</p>
        {!f.visible ? <p className="mt-3 text-muted-app">{t("clubEvents.noFeedback")}</p> : <><p className="mt-3">{t("clubEvents.average")}: <strong>{f.averageRating?.toLocaleString(i18n.language)} / 5</strong></p>
          <div className="mt-3 space-y-2">{[1, 2, 3, 4, 5].map((score) => <div key={score} className="flex items-center gap-3"><span>{score} ★</span><div role="meter" aria-label={`${score} / 5`} aria-valuemin={0} aria-valuemax={f.respondents || 1} aria-valuenow={f.distribution?.[score] ?? 0} className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-app"><div className="h-full rounded-full bg-primary-app" style={{ width: `${100 * (f.distribution?.[score] ?? 0) / (f.respondents || 1)}%` }} /></div><span>{f.distribution?.[score] ?? 0}</span></div>)}</div>
          <h4 className="mt-4 text-sm font-semibold">{t("clubEvents.comments")}</h4>{f.comments?.map((c, index) => <p key={index} className="mt-2 whitespace-pre-wrap break-words text-muted-app">{c}</p>)}</>}
      </article>)}</div>
    </section>}
    <AppDialog open={editing !== null} title={t(editing === "new" ? "clubEvents.create" : "clubEvents.edit")} closeLabel={t("clubEvents.close")} onClose={() => { if (!mutation.isPending) setEditing(null); }}
      footer={<AppButton type="submit" form="club-event-form" disabled={mutation.isPending}>{t("clubEvents.save")}</AppButton>}>
      <form id="club-event-form" noValidate onSubmit={(event) => void save(event)} className="space-y-4">
        <p className="text-sm text-muted-app">{t("clubEvents.notice")}</p><ErrorMessage error={formError ?? options.error} />
        {editing !== "new" && revisionSections.length > 0 && <div role="status" className="rounded-xl border-l-4 border-warning-app bg-warning-app/10 px-4 py-3 text-sm">
          <p className="font-semibold">{t("clubEvents.revisionSections")}: {revisionSections.map(sectionLabel).join(", ")}</p>
          {revisionRequest?.reason && <p className="mt-1 whitespace-pre-wrap break-words">{revisionRequest.reason}</p>}</div>}
        <Field flagged={flag("content")} label={t("clubEvents.titleField")} required error={eventField.error("title")}><AppInput {...eventField.control("title")} maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
        <Field flagged={flag("content")} label={t("clubEvents.objective")} required error={eventField.error("objective")}><AppTextarea {...eventField.control("objective")} maxLength={5000} value={draft.objective} onChange={(e) => setDraft({ ...draft, objective: e.target.value })} /></Field>
        <Field flagged={flag("content")} label={t("clubEvents.plan")} required error={eventField.error("plan")}><AppTextarea {...eventField.control("plan")} maxLength={20000} value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field flagged={flag("schedule")} label={t("clubEvents.start")} required error={eventField.error("startAt")}><AppInput {...eventField.control("startAt")} type="datetime-local" value={localTime(draft.startAt)} onChange={(e) => { if (e.target.value) setDraft({ ...draft, startAt: iso(e.target.value) }); }} /></Field>
          <Field flagged={flag("schedule")} label={t("clubEvents.end")} required error={eventField.error("endAt")}><AppInput {...eventField.control("endAt")} type="datetime-local" value={localTime(draft.endAt)} onChange={(e) => { if (e.target.value) setDraft({ ...draft, endAt: iso(e.target.value) }); }} /></Field></div>
        <Field flagged={flag("venue")} label={t("clubEvents.property")}><AppSelect label={t("clubEvents.property")} value={draft.propertyId ?? ""} options={roomOptions} onChange={(value) => setDraft({ ...draft, propertyId: value || undefined, bookingIds: [] })} /></Field>
        <Field flagged={flag("venue")} label={t("clubEvents.venue")} required={!draft.propertyId} error={eventField.error("venue")}><AppInput {...eventField.control("venue", !draft.propertyId)} value={draft.venueText ?? ""} onChange={(e) => setDraft({ ...draft, venueText: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field flagged={flag("content")} label={t("clubEvents.scope")}><AppSelect label={t("clubEvents.scope")} value={draft.audienceScope} options={(["PUBLIC", "MEMBERS_ONLY"] as const).map((v) => ({ value: v, label: t(`clubEvents.${v}`) }))} onChange={(value) => setDraft({ ...draft, audienceScope: value })} /></Field>
          <Field flagged={flag("content")} label={t("clubEvents.capacity")} required error={eventField.error("capacity")}><AppInput {...eventField.control("capacity")} type="number" min={1} max={100000} value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) })} /></Field></div>
        <Field flagged={flag("risk")} label={t("clubEvents.risk")}><AppSelect label={t("clubEvents.risk")} value={draft.riskCategory} options={(["LOW", "MEDIUM", "HIGH"] as const).map((v) => ({ value: v, label: t(`clubEvents.${v}`) }))} onChange={(value) => setDraft({ ...draft, riskCategory: value })} /></Field>
        <Field flagged={flag("risk")} label={t("clubEvents.riskNote")}><AppTextarea value={draft.riskNote ?? ""} onChange={(e) => setDraft({ ...draft, riskNote: e.target.value })} /></Field>
        <Field flagged={flag("venue")} label={t("clubEvents.facilityNeeds")}><AppTextarea value={draft.facilityNeeds ?? ""} onChange={(e) => setDraft({ ...draft, facilityNeeds: e.target.value })} /></Field>
        <details><summary className="font-semibold">{t("clubEvents.bookings")}{flag("venue") && <AppBadge tone="warning" className="ml-2">{flag("venue")}</AppBadge>}</summary><p className="mt-2 text-sm text-muted-app">{t("clubEvents.bookingsHint")}</p>{!permissions.includes("club.booking.manage") && <p className="mt-2 text-sm text-muted-app">{t("clubEvents.bookingPermissionHint")}</p>}<div className="mt-3 space-y-2">{!linkableBookings.length && <p className="text-sm text-muted-app">{t("clubEvents.bookingsEmpty")}</p>}{linkableBookings.map((b) => <label key={b.id} className="flex items-start gap-2"><input type="checkbox" checked={draft.bookingIds.includes(b.id)} disabled={!permissions.includes("club.booking.manage")} onChange={(e) => setDraft({ ...draft, bookingIds: e.target.checked ? [...draft.bookingIds, b.id] : draft.bookingIds.filter((id) => id !== b.id) })} /><span>{b.title} · {format.format(new Date(b.startAt))}</span></label>)}</div></details>
        <details><summary className="font-semibold">{t("clubEvents.budget")}{flag("budget") && <AppBadge tone="warning" className="ml-2">{flag("budget")}</AppBadge>}</summary><p className="mt-2 text-sm text-muted-app">{t("clubEvents.budgetHint")}</p><div className="mt-3 space-y-4">{draft.budgetLines.map((line, index) => <div key={index} className="space-y-2 rounded-lg border border-border-app p-3">
          {(["category", "purpose"] as const).map((key) => <Field key={key} label={t(`clubEvents.${key}`)} required error={eventField.error(`budget.${index}.${key}`)}><AppInput {...eventField.control(`budget.${index}.${key}`)} value={line[key]} onChange={(e) => setDraft({ ...draft, budgetLines: draft.budgetLines.map((l, i) => i === index ? { ...l, [key]: e.target.value } : l) })} /></Field>)}
          <Field label={t("clubEvents.planItems")}><AppTextarea value={line.plannedItems ?? ""} onChange={(e) => setDraft({ ...draft, budgetLines: draft.budgetLines.map((l, i) => i === index ? { ...l, plannedItems: e.target.value } : l) })} /></Field>
          <Field label={t("clubEvents.amount")} required error={eventField.error(`budget.${index}.amount`)}><AppMoneyInput {...eventField.control(`budget.${index}.amount`)} value={line.amount ? line.amount : ""} onValueChange={(digits) => setDraft({ ...draft, budgetLines: draft.budgetLines.map((l, i) => i === index ? { ...l, amount: Number(digits) } : l) })} /></Field>
          <AppButton type="button" variant="ghost" onClick={() => setDraft({ ...draft, budgetLines: draft.budgetLines.filter((_, i) => i !== index) })}>{t("clubEvents.remove")}</AppButton>
        </div>)}<AppButton type="button" onClick={() => setDraft({ ...draft, budgetLines: [...draft.budgetLines, { category: "", purpose: "", amount: 0 }] })}>{t("clubEvents.addLine")}</AppButton></div></details>
        <details><summary className="font-semibold">{t("clubEvents.form")}</summary><p className="mt-2 text-sm text-muted-app">{t("clubEvents.formHint")}</p><div className="mt-3 space-y-4">{draft.registrationForm?.map((field, index) => <div key={index} className="space-y-2 rounded-lg border border-border-app p-3">
          {(["label"] as const).map((key) => <Field key={key} label={t(`clubEvents.${key === "label" ? "question" : key}`)} required error={eventField.error(`form.${index}.${key}`)}><AppInput {...eventField.control(`form.${index}.${key}`)} value={field[key]} onChange={(e) => setDraft({ ...draft, registrationForm: draft.registrationForm?.map((f, i) => i === index ? { ...f, [key]: e.target.value } : f) })} /></Field>)}
          <Field label={t("clubEvents.type")}><AppSelect label={t("clubEvents.type")} value={field.type} options={(["text", "textarea", "select", "radio", "checkbox"] as const).map((v) => ({ value: v, label: t(`clubEvents.${v}`) }))} onChange={(value) => setDraft({ ...draft, registrationForm: draft.registrationForm?.map((f, i) => i === index ? { ...f, type: value } : f) })} /></Field>
          <label className="flex items-center gap-2"><input type="checkbox" checked={field.required} onChange={(e) => setDraft({ ...draft, registrationForm: draft.registrationForm?.map((f, i) => i === index ? { ...f, required: e.target.checked } : f) })} />{t("clubEvents.required")}</label>
          {["select", "radio", "checkbox"].includes(field.type) && <Field label={t("clubEvents.options")} required error={eventField.error(`form.${index}.options`)}><AppTextarea {...eventField.control(`form.${index}.options`)} value={field.options?.join("\n") ?? ""} onChange={(e) => setDraft({ ...draft, registrationForm: draft.registrationForm?.map((f, i) => i === index ? { ...f, options: e.target.value.split("\n") } : f) })} /></Field>}
          <AppButton type="button" variant="ghost" onClick={() => setDraft({ ...draft, registrationForm: draft.registrationForm?.filter((_, i) => i !== index) })}>{t("clubEvents.remove")}</AppButton>
        </div>)}<AppButton type="button" onClick={() => setDraft({ ...draft, registrationForm: [...draft.registrationForm ?? [], { key: `field_${crypto.randomUUID().replaceAll("-", "")}`, label: "", type: "text", required: true }] })}>{t("clubEvents.addField")}</AppButton></div></details>
        <details><summary className="font-semibold">{t("clubEvents.occurrences")}{flag("schedule") && <AppBadge tone="warning" className="ml-2">{flag("schedule")}</AppBadge>}</summary><p className="mt-2 text-sm text-muted-app">{t("clubEvents.occurrencesHint")}</p><div className="mt-3 space-y-3">{draft.occurrences?.map((o, index) => <div key={index} className="space-y-2 rounded-lg border border-border-app p-3">
          {(["startAt", "endAt"] as const).map((key) => <Field key={key} label={t(`clubEvents.${key === "startAt" ? "start" : "end"}`)} required error={eventField.error(`occurrence.${index}.${key}`)}><AppInput {...eventField.control(`occurrence.${index}.${key}`)} type="datetime-local" value={localTime(o[key])} onChange={(e) => { if (e.target.value) setDraft({ ...draft, occurrences: draft.occurrences?.map((item, i) => i === index ? { ...item, [key]: iso(e.target.value) } : item) }); }} /></Field>)}
          <AppButton type="button" variant="ghost" onClick={() => setDraft({ ...draft, occurrences: draft.occurrences?.filter((_, i) => i !== index) })}>{t("clubEvents.remove")}</AppButton>
        </div>)}<AppButton type="button" onClick={() => setDraft({ ...draft, occurrences: [...draft.occurrences ?? [], { startAt: draft.startAt, endAt: draft.endAt }] })}>{t("clubEvents.addOccurrence")}</AppButton></div></details>
      </form>
    </AppDialog>
    <AppDialog open={operation !== null} title={t(`clubEvents.${operation === "check-in" ? "checkin" : operation ?? "details"}`)} closeLabel={t("clubEvents.close")} onClose={() => { if (!mutation.isPending) closeOperation(); }}
      footer={<AppButton type="submit" form="club-event-operation-form" disabled={mutation.isPending}>{t("clubEvents.confirm")}</AppButton>}>
      <form id="club-event-operation-form" noValidate onSubmit={(event) => void execute(event)} className="space-y-4"><ErrorMessage error={formError} />
        {operation === "publish" && <>
          <label className="flex items-center gap-2"><input type="checkbox" checked={noRegistration} onChange={(e) => setNoRegistration(e.target.checked)} />{t("clubEvents.noRegistration")}</label>
          {!noRegistration && <><Field label={t("clubEvents.registrationOpen")} required error={opField.error("registrationOpen")}><AppInput {...opField.control("registrationOpen")} type="datetime-local" value={registrationOpen} onChange={(e) => setRegistrationOpen(e.target.value)} /></Field><Field label={t("clubEvents.registrationClose")} required error={opField.error("registrationClose")}><AppInput {...opField.control("registrationClose")} type="datetime-local" value={registrationClose} onChange={(e) => setRegistrationClose(e.target.value)} /></Field></>}
          <Field label={t("clubEvents.checkInOpen")} required error={opField.error("checkOpen")}><AppInput {...opField.control("checkOpen")} type="datetime-local" value={checkOpen} onChange={(e) => setCheckOpen(e.target.value)} /></Field><Field label={t("clubEvents.checkInClose")} required error={opField.error("checkClose")}><AppInput {...opField.control("checkClose")} type="datetime-local" value={checkClose} onChange={(e) => setCheckClose(e.target.value)} /></Field>
          <label className="flex items-center gap-2"><input type="checkbox" checked={noRegistration || walkIn} disabled={noRegistration} onChange={(e) => setWalkIn(e.target.checked)} />{t("clubEvents.walkIn")}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={waitlist} onChange={(e) => setWaitlist(e.target.checked)} />{t("clubEvents.waitlist")}</label>
        </>}
        {operation === "reschedule" && <><Field label={t("clubEvents.start")} required error={opField.error("newStart")}><AppInput {...opField.control("newStart")} type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} /></Field><Field label={t("clubEvents.end")} required error={opField.error("newEnd")}><AppInput {...opField.control("newEnd")} type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} /></Field>
          <AppSelect label={t("clubEvents.property")} value={property} options={roomOptions} onChange={setProperty} /><Field label={t("clubEvents.venue")}><AppInput value={venue} onChange={(e) => setVenue(e.target.value)} /></Field></>}
        {operation === "capacity" && <Field label={t("clubEvents.capacity")} required error={opField.error("capacity")}><AppInput {...opField.control("capacity")} type="number" min={1} max={100000} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></Field>}
        {operation === "check-in" && <><Field label={t("clubEvents.studentId")} required error={opField.error("studentId")}><AppSelect required invalid={Boolean(opField.error("studentId"))} label={t("clubEvents.studentId")} value={studentId} onChange={(value) => { setStudentId(value); opField.touch("studentId"); }} options={[{ value: "", label: t("clubEvents.none") }, ...people.filter((p) => p.state === "Confirmed" && !p.attendanceId).map((p) => ({ value: p.studentId, label: `${p.name} · ${p.email}` }))]} /></Field><p className="text-sm text-muted-app">{t("clubEvents.manualReason")}</p></>}
        {operation === "correct" && <><p>{target?.name}</p><label className="flex items-center gap-2"><input type="checkbox" checked={absent} disabled={Boolean(target?.attendanceId && !target.abnormalFlags.includes("no-show"))} onChange={(e) => setAbsent(e.target.checked)} />{t("clubEvents.absent")}</label>
          {!absent && <Field label={t("clubEvents.correctedTime")}><AppInput type="datetime-local" value={corrected} onChange={(e) => setCorrected(e.target.value)} /></Field>}</>}
        {["cancel", "reschedule", "unlock", "correct", "check-in"].includes(operation ?? "") && <Field label={t("clubEvents.reason")} required={operation !== "check-in"} error={opField.error("reason")}><AppTextarea {...opField.control("reason", operation !== "check-in")} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}
      </form>
    </AppDialog>
    <AppDialog
      open={rescheduleOpen}
      title={t("eventDefense.clubRescheduleDialogTitle")}
      closeLabel={t("clubEvents.close")}
      onClose={() => { if (!defenseAction.isPending) setRescheduleOpen(false); }}
      footer={(
        <AppButton
          type="submit"
          form="club-defense-reschedule-form"
          disabled={defenseAction.isPending || !rescheduleReason.trim()}
        >
          {t("clubEvents.confirm")}
        </AppButton>
      )}
    >
      <form
        id="club-defense-reschedule-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!auth.data || !active || !rescheduleReason.trim()) return;
          defenseAction.reset();
          void defenseAction.mutateAsync({
            kind: "requestReschedule",
            clubId,
            eventId: active.id,
            reason: rescheduleReason.trim(),
            csrfToken: auth.data.csrfToken,
          })
            .then(() => setRescheduleOpen(false))
            .catch((error) => console.error("[ClubEventsPage] request reschedule failed:", error));
        }}
        className="space-y-4"
      >
        <p className="text-sm text-muted-app">{t("eventDefense.clubRescheduleDeadlineHint")}</p>
        <Field label={t("eventDefense.clubRescheduleReasonLabel")} required>
          <AppTextarea
            maxLength={2000}
            value={rescheduleReason}
            onChange={(e) => setRescheduleReason(e.target.value)}
          />
        </Field>
        {defenseAction.isError && <p role="alert" className="text-sm text-danger-app">{defenseAction.error.message}</p>}
      </form>
    </AppDialog>
  </>;
}
