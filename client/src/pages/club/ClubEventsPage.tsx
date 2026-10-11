import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTable, appTableFeatures, type AppTableFeatures } from "@/components/ui/table/AppTable";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useClubEvent, useClubEventFeedback, useClubEventMutation, useClubEventOptions, useClubEvents, useEventParticipants } from "@/hooks/useClubEvents";
import type { ClubEvent, ClubEventInput, EventParticipant } from "@/services/clubEvents";

const eventsEmpty: ClubEvent[] = [];
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
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-sm"><span className="font-medium">{label}</span>{children}</label>;
}
function ErrorMessage({ error }: { error: unknown }) {
  return error ? <p role="alert" className="break-words text-sm text-danger-app">{error instanceof Error ? error.message : String(error)}</p> : null;
}
function TablePager({ pageIndex, pageCount, onChange }: { pageIndex: number; pageCount: number; onChange: (value: number) => void }) {
  const { t } = useTranslation();
  return <AppPagination pageIndex={pageIndex} pageCount={pageCount} onPageChange={onChange} prevLabel={t("clubEvents.previous")} nextLabel={t("clubEvents.next")}
    pageLabel={(page) => t("clubEvents.page", { page })} navLabel={t("clubEvents.pagination")} />;
}

export function ClubEventsPage({ mode = "events" }: { mode?: "events" | "attendance" | "feedback" }) {
  const { clubId = "" } = useParams();
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const permissions = auth.data?.workspaces.find((w) => w.kind === "club" && w.clubId === clubId)?.permissions ?? [];
  const allowed = permissions.includes(mode === "events" ? "club.event.manage" : mode === "attendance" ? "club.attendance.manage" : "club.feedback.view");
  const events = useClubEvents(clubId, allowed);
  const mutation = useClubEventMutation(clubId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState("");
  const [compare, setCompare] = useState<string[]>([]);
  const [editing, setEditing] = useState<ClubEvent | "new" | null>(null);
  const [draft, setDraft] = useState<ClubEventInput>(freshEvent);
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
  const detail = useClubEvent(clubId, selected, allowed && mode === "events");
  const options = useClubEventOptions(clubId, allowed && mode === "events");
  const participants = useEventParticipants(clubId, selected, allowed && mode === "attendance");
  const feedback = useClubEventFeedback(clubId, compare, allowed && mode === "feedback");
  const rows = events.data ?? eventsEmpty;
  const active = mode === "events" ? detail.data?.event : rows.find((e) => e.id === selected);
  const format = useMemo(() => new Intl.DateTimeFormat(i18n.language === "vi" ? "vi-VN" : "en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }), [i18n.language]);
  const filtered = useMemo(() => rows.filter((e) => (!filter || e.state === filter) && e.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [rows, filter, search]);
  const columns = useMemo(() => eventColumns.columns([
    eventColumns.accessor("title", { header: t("clubEvents.titleField"), cell: (info) => <button className="text-left font-medium text-primary-app underline" onClick={() => { setSelected(info.row.original.id); mutation.reset(); setSuccess(false); }}>{info.getValue()}</button> }),
    eventColumns.accessor("state", { header: t("clubEvents.state"), cell: (info) => t(`clubEvents.${info.getValue()}`, { defaultValue: info.getValue() ?? "" }) }),
    eventColumns.accessor("startAt", { header: t("clubEvents.start"), cell: (info) => format.format(new Date(info.getValue())) }),
    eventColumns.accessor("capacity", { header: t("clubEvents.capacity"), cell: (info) => `${info.row.original.confirmedRegistrationCount} / ${info.getValue()}` }),
  ]), [t, format, mutation]);
  const table = useTable({ features: appTableFeatures, columns, data: filtered, initialState: { pagination: { pageIndex: 0, pageSize: 10 } } });
  const people = participants.data ?? participantsEmpty;


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
    mutation.reset(); setFormError(null); setSuccess(false);
  }
  const openOperation = useCallback(function openOperation(kind: NonNullable<typeof operation>, participant: EventParticipant | null = null) {
    if (!active) return;
    mutation.reset(); setFormError(null); setSuccess(false); setOperation(kind); setReason(""); setTarget(participant); setCorrected(""); setAbsent(participant?.abnormalFlags.includes("no-show") ?? false);
    setCapacity(active.capacity); setNewStart(localTime(active.startAt)); setNewEnd(localTime(active.endAt)); setVenue(active.venueText ?? ""); setProperty(active.propertyId ?? "");
    setRegistrationOpen(localTime(new Date().toISOString())); setRegistrationClose(localTime(active.startAt)); setCheckOpen(localTime(active.checkInOpenAt ?? active.startAt)); setCheckClose(localTime(active.checkInCloseAt ?? active.endAt));
    setWalkIn(active.allowWalkIn); setWaitlist(active.waitlistEnabled); setNoRegistration(false); setStudentId(participant?.studentId ?? "");
  }, [active, mutation, setOperation, setFormError, setSuccess, setReason, setTarget, setCorrected, setAbsent, setCapacity, setNewStart, setNewEnd, setVenue, setProperty, setRegistrationOpen, setRegistrationClose, setCheckOpen, setCheckClose, setWalkIn, setWaitlist, setNoRegistration, setStudentId]);
  const pcolumns = useMemo(() => participantColumns.columns([
    participantColumns.accessor("name", { header: t("clubEvents.name"), cell: (info) => <span className="break-words">{info.getValue()}<br /><span className="text-muted-app">{info.row.original.email}</span></span> }),
    participantColumns.accessor("state", { header: t("clubEvents.state"), cell: (info) => <span>{info.getValue() ? t(`clubEvents.${info.getValue()}`, { defaultValue: info.getValue() ?? "" }) : "—"}{info.row.original.waitlistPosition ? ` #${info.row.original.waitlistPosition}` : ""}</span> }),
    participantColumns.accessor("abnormalFlags", { header: t("clubEvents.flags"), cell: (info) => <div className="flex flex-col gap-1">{info.getValue().map((flag) => <span key={flag}>{t(`clubEvents.${flag}`, { defaultValue: flag })}</span>)}{info.row.original.correctionReason && <p className="text-muted-app">{info.row.original.correctionReason}</p>}</div> }),
    participantColumns.display({ id: "actions", header: t("clubEvents.action"), cell: (info) => <div className="flex flex-wrap gap-2">
      {info.row.original.state === "Waitlisted" && active?.state === "Upcoming" && <AppButton disabled={mutation.isPending} onClick={() => void runAction("promote", { registrationId: info.row.original.registrationId })}>{t("clubEvents.promote")}</AppButton>}
      {active?.state === "Completed" && !active.attendanceFinalized && <AppButton onClick={() => openOperation("correct", info.row.original)}>{t("clubEvents.correct")}</AppButton>}
    </div> }),
  ]), [t, active, mutation.isPending, runAction, openOperation]);
  const ptable = useTable({ features: appTableFeatures, columns: pcolumns, data: people, initialState: { pagination: { pageIndex: 0, pageSize: 10 } } });
  async function save(event: FormEvent) {
    event.preventDefault(); if (!auth.data) return;
    setFormError(null);
    try {
      const result = editing === "new" ? await mutation.mutateAsync({ kind: "create", input: draft, csrfToken: auth.data.csrfToken }) :
        await mutation.mutateAsync({ kind: "action", id: editing!.id, action: "save", body: { ...draft, expectedVersion: editing!.version }, csrfToken: auth.data.csrfToken });
      setEditing(null); setSelected(result.event.id); setSuccess(true);
    } catch (error) { setFormError(error); }
  }
  async function execute(event: FormEvent) {
    event.preventDefault(); if (!active || !operation) return;
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
  const roomOptions = [{ value: "", label: t("clubEvents.none") }, ...(options.data?.properties ?? []).map((p) => ({ value: p.id, label: p.name }))];
  if (auth.isPending) return <AppSkeleton className="h-40 w-full" />;
  if (!allowed) return <p role="alert">{t("clubEvents.noAccess")}</p>;
  return <>
    <PageHeader title={t(`clubEvents.${mode === "events" ? "title" : mode}`)} description={t("clubEvents.description")} />
    <div className="mb-5 flex flex-wrap gap-3">
      {permissions.includes("club.event.manage") && <Link className="text-primary-app underline" to={`/club/${clubId}/events`}>{t("clubEvents.title")}</Link>}
      {permissions.includes("club.attendance.manage") && <Link className="text-primary-app underline" to={`/club/${clubId}/event-attendance`}>{t("clubEvents.attendance")}</Link>}
      {permissions.includes("club.feedback.view") && <Link className="text-primary-app underline" to={`/club/${clubId}/event-feedback`}>{t("clubEvents.feedback")}</Link>}
    </div>
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
    {mode === "events" && selected && <section className="mt-6 rounded-xl border border-border-app p-5">
      <ErrorMessage error={detail.error} />
      {detail.isPending ? <AppSkeleton className="h-48" /> : detail.data && active && <>
        <h2 className="mb-2 text-xl font-semibold">{active.title}</h2><p>{t(`clubEvents.${active.state}`, { defaultValue: active.state })} · {format.format(new Date(active.startAt))} – {format.format(new Date(active.endAt))}</p>
        <p className="mt-2 break-words">{active.objective}</p><p className="mt-2 whitespace-pre-wrap break-words">{active.plan}</p>
        <p className="mt-2">{t("clubEvents.venue")}: {active.venueText ?? options.data?.properties.find((p) => p.id === active.propertyId)?.name ?? "—"} · {t(`clubEvents.${active.audienceScope}`)}</p>
        {active.revisionDeadlineAt && <p className="mt-2">{t("clubEvents.revisionDeadline")}: {format.format(new Date(active.revisionDeadlineAt))}</p>}
        {active.approvalConditions?.length > 0 && <div className="mt-3"><h3 className="font-semibold">{t("clubEvents.conditions")}</h3><ul className="mt-2 list-inside list-disc">{active.approvalConditions.map((condition, index) => <li key={index}>{condition}</li>)}</ul></div>}
        {active.conflictResult && <p className="mt-3">{t(`clubEvents.${active.conflictResult}`, { defaultValue: active.conflictResult })}</p>}
        {detail.data.budget && <p className="mt-2">{t("clubEvents.approvedBudget")}: {new Intl.NumberFormat(i18n.language === "vi" ? "vi-VN" : "en-GB", { style: "currency", currency: "VND" }).format(detail.data.budget.approvedTotal)}</p>}
        <div className="my-4 flex flex-wrap gap-2">
          {["Draft", "Revision Requested"].includes(active.state) && <><AppButton onClick={() => openEditor(active)}>{t("clubEvents.edit")}</AppButton><AppButton disabled={mutation.isPending} onClick={() => void runAction("submit", { expectedVersion: active.version })}>{t("clubEvents.submit")}</AppButton></>}
          {active.state === "Approved" && <AppButton onClick={() => openOperation("publish")}>{t("clubEvents.publish")}</AppButton>}
          {["Approved", "Upcoming"].includes(active.state) && <AppButton onClick={() => openOperation("reschedule")}>{t("clubEvents.reschedule")}</AppButton>}
          {["Approved", "Upcoming", "Ongoing"].includes(active.state) && !active.attendanceFinalized && <AppButton variant="ghost" onClick={() => openOperation("cancel")}>{t("clubEvents.cancel")}</AppButton>}
        </div>
        {active.checkInCode && <p>{t("clubEvents.code")}: <strong>{active.checkInCode}</strong></p>}
        <h3 className="mt-5 font-semibold">{t("clubEvents.versions")}</h3>
        {detail.data.versions.map((v) => <details key={v.revisionNo} className="mt-2 rounded border border-border-app p-3"><summary>#{v.revisionNo} · {format.format(new Date(v.submittedAt))}</summary>
          <p className="mt-2 whitespace-pre-wrap break-words">{String((v.payload as { plan?: string })?.plan ?? "")}</p>
          {v.budgetLines.map((line, index) => <p key={index} className="mt-2">{line.category}: {line.amount.toLocaleString(i18n.language)} VND — {line.purpose}</p>)}</details>)}
        <h3 className="mt-5 font-semibold">{t("clubEvents.decisions")}</h3>
        {detail.data.decisions.map((d, index) => <p key={index} className="mt-2">{t(`eventReviews.${d.outcome === "Approve" ? "approve" : d.outcome === "Reject" ? "reject" : "requestRevision"}`)} · {d.reason ?? ""}</p>)}
      </>}
    </section>}
    {mode === "attendance" && active && <section className="mt-6 space-y-4 rounded-xl border border-border-app p-5">
      <h2 className="text-xl font-semibold">{active.title}</h2><p>{active.confirmedRegistrationCount} / {active.capacity}</p>
      {active.checkInCode && <p>{t("clubEvents.code")}: <strong>{active.checkInCode}</strong></p>}
      {active.attendanceFinalized && <p>{t("clubEvents.attendanceLocked")}</p>}
      <ErrorMessage error={participants.error} />
      <div className="flex flex-wrap gap-2">
        {active.state === "Upcoming" && <AppButton onClick={() => openOperation("capacity")}>{t("clubEvents.capacity")}</AppButton>}
        {!active.attendanceFinalized && ["Upcoming", "Ongoing", "Completed"].includes(active.state) && <AppButton onClick={() => openOperation("check-in")}>{t("clubEvents.checkin")}</AppButton>}
        {active.state === "Completed" && !active.attendanceFinalized && <AppButton disabled={mutation.isPending} onClick={() => void runAction("attendance/finalize", {})}>{t("clubEvents.finalize")}</AppButton>}
        {active.attendanceFinalized && auth.data?.systemRoles.includes("ATTENDANCE_UNLOCK") && <AppButton onClick={() => openOperation("unlock")}>{t("clubEvents.unlock")}</AppButton>}
      </div>
      <AppTable table={ptable} emptyMessage={t("clubEvents.noParticipants")} loading={participants.isPending} />
      <TablePager pageIndex={ptable.state.pagination.pageIndex} pageCount={ptable.getPageCount()} onChange={(v) => ptable.setPageIndex(v)} />
    </section>}
    {mode === "feedback" && <section className="space-y-5">
      <h2 className="font-semibold">{t("clubEvents.compare")}</h2>
      {events.isPending && <AppSkeleton className="h-32" />}
      <div className="flex flex-wrap gap-3">{rows.map((e) => <label key={e.id} className="flex items-center gap-2"><input type="checkbox" checked={compare.includes(e.id)} disabled={!compare.includes(e.id) && compare.length >= 20}
        onChange={(change) => setCompare(change.target.checked ? [...compare, e.id] : compare.filter((id) => id !== e.id))} />{e.title}</label>)}</div>
      {!events.isPending && !rows.length && <p>{t("clubEvents.empty")}</p>}
      <ErrorMessage error={feedback.error} />{feedback.isPending && compare.length > 0 && <AppSkeleton className="h-40" />}
      <div className="grid gap-4 md:grid-cols-2">{feedback.data?.map((f) => <article key={f.eventId} className="min-w-0 rounded-xl border border-border-app p-5"><h3 className="font-semibold">{f.title}</h3><p>{t("clubEvents.responses")}: {f.respondents}</p>
        {!f.visible ? <p className="mt-3 text-muted-app">{t("clubEvents.noFeedback")}</p> : <><p className="mt-3">{t("clubEvents.average")}: <strong>{f.averageRating?.toLocaleString(i18n.language)} / 5</strong></p>
          <div className="mt-3 space-y-2">{[1, 2, 3, 4, 5].map((score) => <div key={score} className="flex items-center gap-3"><span>{score} ★</span><div role="meter" aria-label={`${score} / 5`} aria-valuemin={0} aria-valuemax={f.respondents || 1} aria-valuenow={f.distribution?.[score] ?? 0} className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-app"><div className="h-full rounded-full bg-primary-app" style={{ width: `${100 * (f.distribution?.[score] ?? 0) / (f.respondents || 1)}%` }} /></div><span>{f.distribution?.[score] ?? 0}</span></div>)}</div>
          <h4 className="mt-4 font-semibold">{t("clubEvents.comments")}</h4>{f.comments?.map((c, index) => <p key={index} className="mt-2 whitespace-pre-wrap break-words text-muted-app">{c}</p>)}</>}
      </article>)}</div>
    </section>}
    <AppDialog open={editing !== null} title={t(editing === "new" ? "clubEvents.create" : "clubEvents.edit")} closeLabel={t("clubEvents.close")} onClose={() => { if (!mutation.isPending) setEditing(null); }}>
      <form onSubmit={(event) => void save(event)} className="space-y-4">
        <p className="text-sm text-muted-app">{t("clubEvents.notice")}</p><ErrorMessage error={formError ?? options.error} />
        <Field label={t("clubEvents.titleField")}><AppInput required maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
        <Field label={t("clubEvents.objective")}><AppTextarea required maxLength={5000} value={draft.objective} onChange={(e) => setDraft({ ...draft, objective: e.target.value })} /></Field>
        <Field label={t("clubEvents.plan")}><AppTextarea required maxLength={20000} value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label={t("clubEvents.start")}><AppInput required type="datetime-local" value={localTime(draft.startAt)} onChange={(e) => { if (e.target.value) setDraft({ ...draft, startAt: iso(e.target.value) }); }} /></Field>
          <Field label={t("clubEvents.end")}><AppInput required type="datetime-local" value={localTime(draft.endAt)} onChange={(e) => { if (e.target.value) setDraft({ ...draft, endAt: iso(e.target.value) }); }} /></Field></div>
        <Field label={t("clubEvents.property")}><AppSelect label={t("clubEvents.property")} value={draft.propertyId ?? ""} options={roomOptions} onChange={(value) => setDraft({ ...draft, propertyId: value || undefined, bookingIds: [] })} /></Field>
        <Field label={t("clubEvents.venue")}><AppInput value={draft.venueText ?? ""} onChange={(e) => setDraft({ ...draft, venueText: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label={t("clubEvents.scope")}><AppSelect label={t("clubEvents.scope")} value={draft.audienceScope} options={(["PUBLIC", "MEMBERS_ONLY"] as const).map((v) => ({ value: v, label: t(`clubEvents.${v}`) }))} onChange={(value) => setDraft({ ...draft, audienceScope: value })} /></Field>
          <Field label={t("clubEvents.capacity")}><AppInput required type="number" min={1} max={100000} value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) })} /></Field></div>
        <Field label={t("clubEvents.risk")}><AppSelect label={t("clubEvents.risk")} value={draft.riskCategory} options={(["LOW", "MEDIUM", "HIGH"] as const).map((v) => ({ value: v, label: t(`clubEvents.${v}`) }))} onChange={(value) => setDraft({ ...draft, riskCategory: value })} /></Field>
        <Field label={t("clubEvents.riskNote")}><AppTextarea value={draft.riskNote ?? ""} onChange={(e) => setDraft({ ...draft, riskNote: e.target.value })} /></Field>
        <Field label={t("clubEvents.facilityNeeds")}><AppTextarea value={draft.facilityNeeds ?? ""} onChange={(e) => setDraft({ ...draft, facilityNeeds: e.target.value })} /></Field>
        <details><summary className="font-semibold">{t("clubEvents.bookings")}</summary>{!permissions.includes("club.booking.manage") && <p className="mt-2 text-sm text-muted-app">{t("clubEvents.bookingPermissionHint")}</p>}<div className="mt-3 space-y-2">{options.data?.bookings.filter((b) => b.propertyId === draft.propertyId || b.propertyType === "EQUIPMENT").map((b) => <label key={b.id} className="flex items-start gap-2"><input type="checkbox" checked={draft.bookingIds.includes(b.id)} disabled={!permissions.includes("club.booking.manage")} onChange={(e) => setDraft({ ...draft, bookingIds: e.target.checked ? [...draft.bookingIds, b.id] : draft.bookingIds.filter((id) => id !== b.id) })} /><span>{b.title} · {format.format(new Date(b.startAt))}</span></label>)}</div></details>
        <details><summary className="font-semibold">{t("clubEvents.budget")}</summary><div className="mt-3 space-y-4">{draft.budgetLines.map((line, index) => <div key={index} className="space-y-2 rounded border border-border-app p-3">
          {(["category", "purpose", "plannedItems"] as const).map((key) => <Field key={key} label={t(`clubEvents.${key === "plannedItems" ? "planItems" : key}`)}><AppInput required={key !== "plannedItems"} value={line[key] ?? ""} onChange={(e) => setDraft({ ...draft, budgetLines: draft.budgetLines.map((l, i) => i === index ? { ...l, [key]: e.target.value } : l) })} /></Field>)}
          <Field label={t("clubEvents.amount")}><AppInput required type="number" min={1} step={1} value={line.amount} onChange={(e) => setDraft({ ...draft, budgetLines: draft.budgetLines.map((l, i) => i === index ? { ...l, amount: Number(e.target.value) } : l) })} /></Field>
          <AppButton type="button" variant="ghost" onClick={() => setDraft({ ...draft, budgetLines: draft.budgetLines.filter((_, i) => i !== index) })}>{t("clubEvents.remove")}</AppButton>
        </div>)}<AppButton type="button" onClick={() => setDraft({ ...draft, budgetLines: [...draft.budgetLines, { category: "", purpose: "", amount: 1 }] })}>{t("clubEvents.addLine")}</AppButton></div></details>
        <details><summary className="font-semibold">{t("clubEvents.form")}</summary><div className="mt-3 space-y-4">{draft.registrationForm?.map((field, index) => <div key={index} className="space-y-2 rounded border border-border-app p-3">
          {(["label"] as const).map((key) => <Field key={key} label={t(`clubEvents.${key === "label" ? "question" : key}`)}><AppInput required value={field[key]} onChange={(e) => setDraft({ ...draft, registrationForm: draft.registrationForm?.map((f, i) => i === index ? { ...f, [key]: e.target.value } : f) })} /></Field>)}
          <Field label={t("clubEvents.type")}><AppSelect label={t("clubEvents.type")} value={field.type} options={(["text", "textarea", "select", "radio", "checkbox"] as const).map((v) => ({ value: v, label: t(`clubEvents.${v}`) }))} onChange={(value) => setDraft({ ...draft, registrationForm: draft.registrationForm?.map((f, i) => i === index ? { ...f, type: value } : f) })} /></Field>
          <label className="flex items-center gap-2"><input type="checkbox" checked={field.required} onChange={(e) => setDraft({ ...draft, registrationForm: draft.registrationForm?.map((f, i) => i === index ? { ...f, required: e.target.checked } : f) })} />{t("clubEvents.required")}</label>
          {["select", "radio", "checkbox"].includes(field.type) && <Field label={t("clubEvents.options")}><AppTextarea required value={field.options?.join("\n") ?? ""} onChange={(e) => setDraft({ ...draft, registrationForm: draft.registrationForm?.map((f, i) => i === index ? { ...f, options: e.target.value.split("\n") } : f) })} /></Field>}
          <AppButton type="button" variant="ghost" onClick={() => setDraft({ ...draft, registrationForm: draft.registrationForm?.filter((_, i) => i !== index) })}>{t("clubEvents.remove")}</AppButton>
        </div>)}<AppButton type="button" onClick={() => setDraft({ ...draft, registrationForm: [...draft.registrationForm ?? [], { key: `field_${crypto.randomUUID().replaceAll("-", "")}`, label: "", type: "text", required: true }] })}>{t("clubEvents.addField")}</AppButton></div></details>
        <details><summary className="font-semibold">{t("clubEvents.occurrences")}</summary><div className="mt-3 space-y-3">{draft.occurrences?.map((o, index) => <div key={index} className="space-y-2 rounded border border-border-app p-3">
          {(["startAt", "endAt"] as const).map((key) => <Field key={key} label={t(`clubEvents.${key === "startAt" ? "start" : "end"}`)}><AppInput required type="datetime-local" value={localTime(o[key])} onChange={(e) => { if (e.target.value) setDraft({ ...draft, occurrences: draft.occurrences?.map((item, i) => i === index ? { ...item, [key]: iso(e.target.value) } : item) }); }} /></Field>)}
          <AppButton type="button" variant="ghost" onClick={() => setDraft({ ...draft, occurrences: draft.occurrences?.filter((_, i) => i !== index) })}>{t("clubEvents.remove")}</AppButton>
        </div>)}<AppButton type="button" onClick={() => setDraft({ ...draft, occurrences: [...draft.occurrences ?? [], { startAt: draft.startAt, endAt: draft.endAt }] })}>{t("clubEvents.addOccurrence")}</AppButton></div></details>
        <AppButton type="submit" disabled={mutation.isPending}>{t("clubEvents.save")}</AppButton>
      </form>
    </AppDialog>
    <AppDialog open={operation !== null} title={t(`clubEvents.${operation === "check-in" ? "checkin" : operation ?? "details"}`)} closeLabel={t("clubEvents.close")} onClose={() => { if (!mutation.isPending) setOperation(null); }}>
      <form onSubmit={(event) => void execute(event)} className="space-y-4"><ErrorMessage error={formError} />
        {operation === "publish" && <>
          <label className="flex items-center gap-2"><input type="checkbox" checked={noRegistration} onChange={(e) => setNoRegistration(e.target.checked)} />{t("clubEvents.noRegistration")}</label>
          {!noRegistration && <><Field label={t("clubEvents.registrationOpen")}><AppInput required type="datetime-local" value={registrationOpen} onChange={(e) => setRegistrationOpen(e.target.value)} /></Field><Field label={t("clubEvents.registrationClose")}><AppInput required type="datetime-local" value={registrationClose} onChange={(e) => setRegistrationClose(e.target.value)} /></Field></>}
          <Field label={t("clubEvents.checkInOpen")}><AppInput required type="datetime-local" value={checkOpen} onChange={(e) => setCheckOpen(e.target.value)} /></Field><Field label={t("clubEvents.checkInClose")}><AppInput required type="datetime-local" value={checkClose} onChange={(e) => setCheckClose(e.target.value)} /></Field>
          <label className="flex items-center gap-2"><input type="checkbox" checked={noRegistration || walkIn} disabled={noRegistration} onChange={(e) => setWalkIn(e.target.checked)} />{t("clubEvents.walkIn")}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={waitlist} onChange={(e) => setWaitlist(e.target.checked)} />{t("clubEvents.waitlist")}</label>
        </>}
        {operation === "reschedule" && <><Field label={t("clubEvents.start")}><AppInput required type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} /></Field><Field label={t("clubEvents.end")}><AppInput required type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} /></Field>
          <AppSelect label={t("clubEvents.property")} value={property} options={roomOptions} onChange={setProperty} /><Field label={t("clubEvents.venue")}><AppInput value={venue} onChange={(e) => setVenue(e.target.value)} /></Field></>}
        {operation === "capacity" && <Field label={t("clubEvents.capacity")}><AppInput required type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></Field>}
        {operation === "check-in" && <><AppSelect label={t("clubEvents.studentId")} value={studentId} onChange={setStudentId} options={[{ value: "", label: t("clubEvents.none") }, ...people.filter((p) => p.state === "Confirmed" && !p.attendanceId).map((p) => ({ value: p.studentId, label: `${p.name} · ${p.email}` }))]} /><p className="text-sm text-muted-app">{t("clubEvents.manualReason")}</p></>}
        {operation === "correct" && <><p>{target?.name}</p><label className="flex items-center gap-2"><input type="checkbox" checked={absent} disabled={Boolean(target?.attendanceId && !target.abnormalFlags.includes("no-show"))} onChange={(e) => setAbsent(e.target.checked)} />{t("clubEvents.absent")}</label>
          {!absent && <Field label={t("clubEvents.correctedTime")}><AppInput type="datetime-local" value={corrected} onChange={(e) => setCorrected(e.target.value)} /></Field>}</>}
        {["cancel", "reschedule", "unlock", "correct", "check-in"].includes(operation ?? "") && <Field label={t("clubEvents.reason")}><AppTextarea required={operation !== "check-in"} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}
        <AppButton type="submit" disabled={mutation.isPending || (operation === "check-in" && !studentId)}>{t("clubEvents.confirm")}</AppButton>
      </form>
    </AppDialog>
  </>;
}
