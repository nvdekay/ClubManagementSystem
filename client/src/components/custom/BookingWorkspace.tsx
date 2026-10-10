import { useCallback, useMemo, useState, type FormEvent } from "react";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppTable, appTableFeatures, type AppTableFeatures } from "@/components/ui/table/AppTable";
import { AppTableLimitSelect } from "@/components/ui/table/AppTableLimitSelect";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { appToast } from "@/components/ui/toast/AppToast";
import { useAuth } from "@/hooks/useAuth";
import { useBooking, useBookingAction, useBookingAvailability, useBookingEvents, useBookingSlots, useBookingProperties, useBookings } from "@/hooks/useFacilityBookings";
import type { Booking, BookingAction, BookingDecisionInput, BookingInput, BookingSlot } from "@/services/facilityBookings";
import { cn } from "@/utils/cn";

interface BookingWorkspaceProps { clubId: string | null }
const emptyBookings: Booking[] = [];
const column = createColumnHelper<AppTableFeatures, Booking>();
const emptyInput: BookingInput = { propertyId: "", purpose: "", startAt: "", endAt: "", headcount: 1, equipment: [] };
function localTime(value: string) {
  return value ? new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16) : "";
}
function slotNumber(value: { startAt: string; endAt: string }, slots: BookingSlot[]): string {
  return String(slots.find((slot) => localTime(value.startAt).slice(11) === slot.start
    && localTime(value.endAt).slice(11) === slot.end
    && localTime(value.startAt).slice(0, 10) === localTime(value.endAt).slice(0, 10))?.number ?? "");
}
function slotInterval(day: string, number: string, slots: BookingSlot[]) {
  const slot = slots.find((item) => String(item.number) === number);
  if (!day || !slot) return { startAt: "", endAt: "" };
  return { startAt: new Date(`${day}T${slot.start}:00+07:00`).toISOString(),
    endAt: new Date(`${day}T${slot.end}:00+07:00`).toISOString() };
}

/** Shared club and ICPDP workspace for the same booking lifecycle. */
export function BookingWorkspace({ clubId }: BookingWorkspaceProps) {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const can = Boolean(auth.data && (clubId ? auth.data.workspaces.some((item) => item.clubId === clubId
    && item.permissions.includes("club.booking.manage")) : auth.data.systemRoles.includes("ICPDP_OFFICER")));
  const slots = useBookingSlots(can);
  const list = useBookings(clubId, can);
  const properties = useBookingProperties(clubId, can);
  const events = useBookingEvents(clubId, can);
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = searchParams.get("id");
  function setSelected(value: string | null) { setSearchParams(value ? { id: value } : {}, { replace: true }); }
  const detail = useBooking(clubId, can ? selected : null);
  const action = useBookingAction(auth.data?.csrfToken ?? "");
  const resetAction = action.reset;
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<BookingInput>(emptyInput);
  const [formError, setFormError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [outcome, setOutcome] = useState<BookingDecisionInput["outcome"]>("Approve");
  const [suggest, setSuggest] = useState(false);
  const [alternative, setAlternative] = useState({ propertyId: "", startAt: "", endAt: "" });
  const availability = useBookingAvailability(editing ? clubId : null, form.propertyId, form.startAt, form.endAt);
  const booking = detail.data?.booking;
  const property = properties.data?.find((item) => item.id === form.propertyId);
  const states = ["Draft", "Requested", "Under Review", "Revision Requested", "Approved", "Rejected", "In Use", "Completed", "Cancelled", "Released"] as const;
  const stateLabel = useCallback((state: string) => t(`facilityBookings.states.${state as typeof states[number]}`), [t]);
  const date = useCallback((value: string) => new Intl.DateTimeFormat(i18n.language === "vi" ? "vi-VN" : "en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)), [i18n.language]);
  const interval = useCallback((value: { startAt: string; endAt: string }) => {
    const number = slotNumber(value, slots.data ?? []);
    return `${number ? `${t("facilityBookings.slot", { number })} · ` : ""}${date(value.startAt)} – ${date(value.endAt)}`;
  }, [slots.data, t, date]);
  async function mutate(value: BookingAction) {
    setFormError(null);
    try {
      const result = await action.mutateAsync(value);
      setSelected(result.booking.id); setEditing(false); setReason("");
      appToast.success(t("facilityBookings.changed"));
    } catch { /* action.error is displayed below. */ }
  }
  function openEditor() {
    if (!booking) return;
    setForm({ propertyId: booking.propertyId, purpose: booking.purpose, startAt: booking.startAt,
      endAt: booking.endAt, headcount: booking.headcount, equipment: booking.equipment, eventId: booking.eventId });
    setEditing(true); setFormError(null); action.reset();
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!clubId || !form.propertyId || !form.purpose.trim() || !form.startAt || !form.endAt || !slotNumber(form, slots.data ?? [])) {
      setFormError(t("facilityBookings.invalidForm")); return;
    }
    void mutate({ kind: "save", clubId, ...(selected ? { id: selected } : {}),
      input: { ...form, ...(form.eventId?.trim() ? { eventId: form.eventId.trim() } : { eventId: undefined }) },
      expectedVersion: booking?.currentVersionNo ?? 0 });
  }
  function decide(event: FormEvent) {
    event.preventDefault();
    if (outcome === "Request revision" && suggest && (!alternative.propertyId || !slotNumber(alternative, slots.data ?? []))) {
      setFormError(t("facilityBookings.invalidForm")); return;
    }
    if (!selected || !window.confirm(t("facilityBookings.confirmDecision"))) return;
    void mutate({ kind: "decision", id: selected, input: { outcome, reason, reviewNote,
      ...(outcome === "Request revision" && suggest ? { alternative } : {}) } });
  }
  const propertyOptions = [{ value: "", label: t("facilityBookings.select") },
    ...(properties.data ?? []).filter((item) => item.isActive).map((item) => ({ value: item.id, label: `${item.name} · ${item.location}` }))];
  const slotOptions = [{ value: "", label: t("facilityBookings.selectSlot") },
    ...(slots.data ?? []).map((slot) => ({ value: String(slot.number), label: `${t("facilityBookings.slot", { number: slot.number })} · ${slot.start}–${slot.end}` }))];
  const filteredBookings = useMemo(() => (list.data ?? emptyBookings).filter((item) => !filter || item.state === filter), [list.data, filter]);
  const columns = useMemo(() => column.columns([
    column.accessor("purpose", { header: t("facilityBookings.purpose"), cell: (cell) => <button type="button"
      aria-pressed={selected === cell.row.original.id} className={cn("text-left font-semibold break-words text-primary-app underline", {
        "text-text-app": selected === cell.row.original.id,
      })} onClick={() => { setSearchParams({ id: cell.row.original.id }, { replace: true }); setEditing(false); setReason(""); setSuggest(false); resetAction(); }}>
      {!clubId && <span className="block text-sm text-muted-app">{cell.row.original.clubName}</span>}{cell.getValue()}</button> }),
    column.accessor("propertyId", { header: t("facilityBookings.property"), cell: (cell) => properties.data?.find((item) => item.id === cell.getValue())?.name ?? "—" }),
    column.accessor("startAt", { header: t("facilityBookings.slotLabel"), cell: (cell) => interval(cell.row.original) }),
    column.accessor("state", { header: t("facilityBookings.status"), cell: (cell) => <span>{stateLabel(cell.getValue())}
      {cell.row.original.isLateCancellation && <span className="block text-warning-app">{t("facilityBookings.late")}</span>}</span> }),
  ]), [t, selected, clubId, properties.data, setSearchParams, resetAction, interval, stateLabel]);
  const table = useTable({ features: appTableFeatures, columns, data: filteredBookings,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } } });
  if (auth.isPending) return <AppSkeleton className="h-64 w-full" />;
  if (!can) return <AppNotice tone="danger" role="alert">{t("facilityBookings.denied")}</AppNotice>;
  return <>
    <PageHeader title={t("facilityBookings.title")} description={t(clubId ? "facilityBookings.description" : "facilityBookings.officerDescription")}
      actions={clubId ? <AppButton onClick={() => { setSelected(null); setForm(emptyInput); setEditing(true); setFormError(null); action.reset(); }}>
        {t("facilityBookings.newBooking")}</AppButton> : undefined} />
    <p className="mb-5 text-sm text-muted-app">{t("facilityBookings.timeZone")}</p>
    {(slots.isPending || list.isPending || properties.isPending || (clubId && events.isPending)) ? <AppSkeleton className="h-48 w-full" />
      : slots.isError || list.isError || properties.isError || (clubId && events.isError) ? <AppNotice tone="danger" role="alert" title={t("facilityBookings.loadError")}>
        <p>{slots.error?.message ?? list.error?.message ?? properties.error?.message ?? events.error?.message}</p>
        <AppButton onClick={() => { void slots.refetch(); void list.refetch(); void properties.refetch(); if (clubId) void events.refetch(); }}>{t("facilityBookings.retry")}</AppButton>
      </AppNotice> : <div className="min-w-0 space-y-8">
        <section className="min-w-0 space-y-3">
          <h2 className="text-xl font-bold">{t("facilityBookings.bookingHistory")}</h2>
          <AppSelect className="w-full sm:max-w-xs" label={t("facilityBookings.status")} value={filter}
            onChange={(value) => { setFilter(value); table.setPageIndex(0); }} options={[
              { value: "", label: t("facilityBookings.all") }, ...states.map((state) => ({ value: state, label: stateLabel(state) })),
            ]} />
          <AppTable table={table} emptyMessage={t("facilityBookings.empty")} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-app">{t("facilityBookings.bookingCount", { count: filteredBookings.length })}</p>
            <div className="flex flex-wrap items-center gap-3">
              <AppTableLimitSelect value={table.state.pagination.pageSize} onChange={(size) => table.setPageSize(size)}
                label={t("facilityBookings.rowsPerPage")} options={[5, 10, 20, 50]} />
              <AppPagination pageIndex={table.state.pagination.pageIndex} pageCount={table.getPageCount()}
                onPageChange={(index) => table.setPageIndex(index)} prevLabel={t("facilityBookings.prevPage")}
                nextLabel={t("facilityBookings.nextPage")} pageLabel={(page) => t("facilityBookings.pageLabel", { page })}
                navLabel={t("facilityBookings.pages")} />
            </div>
          </div>
        </section>
        <section className="min-w-0 space-y-5">
          {!editing && action.isError && <AppNotice tone="danger" role="alert">{action.error.message}</AppNotice>}
          {!editing && formError && <AppNotice tone="danger" role="alert">{formError}</AppNotice>}
          {editing && clubId ? <AppDialog open title={t(selected ? "facilityBookings.edit" : "facilityBookings.newBooking")}
            closeLabel={t("facilityBookings.close")} onClose={() => setEditing(false)}>
            <form onSubmit={save} className="space-y-4">
            {action.isError && <AppNotice tone="danger" role="alert">{action.error.message}</AppNotice>}
            {formError && <AppNotice tone="danger" role="alert">{formError}</AppNotice>}
            {!properties.data?.some((item) => item.isActive) && <AppNotice>{t("facilityBookings.noProperties")}</AppNotice>}
            <div className="block text-sm font-medium"><span>{t("facilityBookings.property")}</span>
              <AppSelect className="mt-1 w-full" label={t("facilityBookings.property")} value={form.propertyId}
                onChange={(value) => setForm({ ...form, propertyId: value, equipment: [] })} options={propertyOptions} /></div>
            {property && <div className="space-y-2 text-sm text-muted-app"><p>{property.location}</p>
              <details><summary>{t("facilityBookings.hours")}</summary><p>{t("facilityBookings.hours")}: {property.bookableHours.map((item) => `${t(`properties.day${item.day as 1 | 2 | 3 | 4 | 5 | 6 | 7}`)}: ${item.open}–${item.close}`).join("; ")}</p>
              {property.blackouts.map((item, index) => <p key={index}>{t("facilityBookings.blackout")}: {interval(item)} · {item.reason}</p>)}</details>
            </div>}
            <label className="block text-sm font-medium">{t("facilityBookings.purpose")}
              <AppInput className="mt-1 w-full" required maxLength={2000} value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })} /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">{t("facilityBookings.bookingDate")}
                <AppInput type="date" className="mt-1 w-full min-w-0" required value={localTime(form.startAt).slice(0, 10)}
                  onChange={(event) => setForm({ ...form, ...slotInterval(event.target.value, slotNumber(form, slots.data ?? []) || "1", slots.data ?? []) })} /></label>
              <div className="block text-sm font-medium"><span>{t("facilityBookings.slotLabel")}</span>
                <AppSelect className="mt-1 w-full" label={t("facilityBookings.slotLabel")} value={slotNumber(form, slots.data ?? [])}
                  disabled={!form.startAt} onChange={(value) => setForm({ ...form,
                    ...slotInterval(localTime(form.startAt).slice(0, 10), value, slots.data ?? []) })} options={slotOptions} /></div>
            </div>
            <p className="text-sm text-muted-app">{t("facilityBookings.noticeRule")}</p>
            {form.startAt && !slotNumber(form, slots.data ?? []) && <AppNotice tone="warning">{t("facilityBookings.legacySlot")}</AppNotice>}
            <label className="block text-sm font-medium">{t("facilityBookings.headcount")}
              <AppInput type="number" min={1} max={10000} required className="mt-1 w-full" value={form.headcount}
                onChange={(event) => setForm({ ...form, headcount: Number(event.target.value) })} /></label>
            {property?.capacity !== undefined && form.headcount > property.capacity && <AppNotice tone="warning">{t("facilityBookings.capacityWarning")}</AppNotice>}
            <details className="space-y-3"><summary className="text-sm font-medium">{t("facilityBookings.optionalFields")}</summary>
            {!!property?.equipment.length && <fieldset><legend className="text-sm font-medium">{t("facilityBookings.equipment")}</legend>
              <div className="mt-2 flex flex-wrap gap-4">{property.equipment.map((item) => <label key={item} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.equipment.includes(item)} onChange={(event) => setForm({ ...form,
                  equipment: event.target.checked ? [...form.equipment, item] : form.equipment.filter((value) => value !== item) })} />{item}</label>)}</div></fieldset>}
            <div className="block text-sm font-medium"><span>{t("facilityBookings.eventId")}</span>
              <AppSelect className="mt-1 w-full" label={t("facilityBookings.eventId")} value={form.eventId ?? ""}
                onChange={(value) => setForm({ ...form, eventId: value })} options={[
                  { value: "", label: t("facilityBookings.noEvent") },
                  ...(form.eventId && !events.data?.some((item) => item.id === form.eventId)
                    ? [{ value: form.eventId, label: t("facilityBookings.eventUnavailable") }] : []),
                  ...(events.data ?? []).map((item) => ({ value: item.id, label: `${item.title} · ${date(item.startAt)}` })),
                ]} /></div>
            </details>
            {form.propertyId && form.startAt && form.endAt && <div role="status">
              {availability.isFetching ? <p>{t("facilityBookings.checking")}</p> : availability.isError ? <AppNotice tone="danger">{availability.error.message}</AppNotice>
                : availability.data && <AppNotice tone={availability.data.conflictResult === "Blocking Conflict" ? "danger" : availability.data.conflicts.length ? "warning" : "success"}>
                  {t(availability.data.conflictResult === "Blocking Conflict" ? "facilityBookings.blocking" : availability.data.conflicts.length ? "facilityBookings.warning" : "facilityBookings.available")}
                  {availability.data.conflicts.map((item) => <p key={item.id}>{interval(item)}</p>)}
                </AppNotice>}
            </div>}
            <div className="flex flex-wrap gap-3"><AppButton type="submit" disabled={action.isPending}>{t("facilityBookings.save")}</AppButton>
              <AppButton type="button" variant="secondary" onClick={() => setEditing(false)}>{t("facilityBookings.close")}</AppButton></div>
          </form></AppDialog> : selected && detail.isPending ? <AppSkeleton className="h-64 w-full" />
            : detail.isError ? <AppNotice tone="danger" role="alert">{detail.error.message}
              <AppButton onClick={() => void detail.refetch()}>{t("facilityBookings.retry")}</AppButton></AppNotice>
              : booking && detail.data && <>
                <h2 className="text-xl font-bold break-words">{booking.purpose}</h2>
                <div className="flex flex-wrap gap-3"><span>{stateLabel(booking.state)}</span><span>{t("facilityBookings.version", { number: booking.currentVersionNo })}</span></div>
                <p className="text-sm text-muted-app">{interval(booking)}</p>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div><dt className="text-sm text-muted-app">{t("facilityBookings.property")}</dt><dd>{detail.data.property?.name} · {detail.data.property?.location}</dd></div>
                  <div><dt className="text-sm text-muted-app">{t("facilityBookings.headcount")}</dt><dd>{booking.headcount}</dd></div>
                  <div><dt className="text-sm text-muted-app">{t("facilityBookings.startAt")}</dt><dd>{date(booking.startAt)}</dd></div>
                  <div><dt className="text-sm text-muted-app">{t("facilityBookings.endAt")}</dt><dd>{date(booking.endAt)}</dd></div>
                  <div><dt className="text-sm text-muted-app">{t("facilityBookings.equipment")}</dt><dd>{booking.equipment.join(", ") || "—"}</dd></div>
                  <div><dt className="text-sm text-muted-app">{t("facilityBookings.clubState")}</dt><dd>{detail.data.club?.name} · {t(`clubLifecycle.state_${detail.data.club?.state as "Active" | "Suspended" | "Dissolving" | "Dissolved" | "Pending Setup"}`)}</dd></div>
                </dl>
                {booking.decisionReason && <AppNotice>{booking.decisionReason}</AppNotice>}
                {booking.cancelReason && <AppNotice>{booking.cancelReason}</AppNotice>}
                {detail.data.check?.capacityWarning && <AppNotice tone="warning">{t("facilityBookings.capacityWarning")}</AppNotice>}
                {!!detail.data.check?.conflicts.length && <AppNotice tone="warning" title={t("facilityBookings.conflicts")}>
                  {detail.data.check.conflicts.map((item) => <p key={item.id}>{interval(item)}</p>)}</AppNotice>}
                {!clubId && !!detail.data.obligations.length && <AppNotice tone="warning" title={t("facilityBookings.obligations")}>
                  {detail.data.obligations.map((item) => <p key={item}>{t(`facilityBookings.${item as "overdueReport" | "overdueSettlement" | "overdueRefund"}`)}</p>)}</AppNotice>}
                {clubId && ["Draft", "Revision Requested"].includes(booking.state) && <div className="flex flex-wrap gap-3">
                  <AppButton variant="secondary" onClick={openEditor}>{t("facilityBookings.edit")}</AppButton>
                  <AppButton disabled={action.isPending} onClick={() => { if (window.confirm(t("facilityBookings.confirmSubmit"))) void mutate({ kind: "submit", clubId,
                    id: booking.id, expectedVersion: booking.currentVersionNo }); }}>{t("facilityBookings.submit")}</AppButton>
                </div>}
                {clubId && ["Requested", "Approved"].includes(booking.state) && <form className="space-y-3" onSubmit={(event) => {
                  event.preventDefault(); if (window.confirm(t("facilityBookings.confirmCancel"))) void mutate({ kind: "cancel", clubId, id: booking.id, reason });
                }}><p className="text-sm text-muted-app">{t("facilityBookings.cancelNotice")}</p>
                  <label className="block text-sm font-medium">{t("facilityBookings.cancelReason")}<AppInput className="mt-1 w-full" required maxLength={2000}
                    value={reason} onChange={(event) => setReason(event.target.value)} /></label>
                  <AppButton type="submit" variant="secondary" disabled={action.isPending}>{t("facilityBookings.cancel")}</AppButton></form>}
                {!clubId && booking.state === "Requested" && <AppButton disabled={action.isPending}
                  onClick={() => void mutate({ kind: "claim", id: booking.id })}>{t("facilityBookings.claim")}</AppButton>}
                {!clubId && booking.state === "Under Review" && detail.data.task?.assigneeId !== auth.data?.user.id && <AppNotice>{t("facilityBookings.assigned")}</AppNotice>}
                {!clubId && booking.state === "Under Review" && detail.data.task?.assigneeId === auth.data?.user.id && <form onSubmit={decide} className="space-y-4 rounded-xl border border-border-app p-5">
                  <div className="block text-sm font-medium"><span>{t("facilityBookings.outcome")}</span><AppSelect<BookingDecisionInput["outcome"]> className="mt-1 w-full" label={t("facilityBookings.outcome")}
                    value={outcome} onChange={setOutcome} options={[
                      { value: "Approve", label: t("facilityBookings.approve") },
                      { value: "Reject", label: t("facilityBookings.reject") },
                      { value: "Request revision", label: t("facilityBookings.revision") },
                    ]} /></div>
                  <label className="block text-sm font-medium">{t("facilityBookings.reason")}<AppInput className="mt-1 w-full" required maxLength={2000}
                    value={reason} onChange={(event) => setReason(event.target.value)} /></label>
                  <label className="block text-sm font-medium">{t("facilityBookings.reviewNote")}<AppInput className="mt-1 w-full" maxLength={2000}
                    value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /></label>
                  {outcome === "Request revision" && <><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={suggest}
                    onChange={(event) => setSuggest(event.target.checked)} />{t("facilityBookings.alternative")}</label>
                    {suggest && <div className="space-y-3"><div className="block text-sm"><span>{t("facilityBookings.property")}</span><AppSelect className="mt-1 w-full" label={t("facilityBookings.property")}
                      value={alternative.propertyId} onChange={(value) => setAlternative({ ...alternative, propertyId: value })}
                      options={propertyOptions} /></div>
                      <label className="block text-sm">{t("facilityBookings.bookingDate")}
                        <AppInput type="date" className="mt-1 w-full" required value={localTime(alternative.startAt).slice(0, 10)}
                          onChange={(event) => setAlternative({ ...alternative, ...slotInterval(event.target.value, slotNumber(alternative, slots.data ?? []) || "1", slots.data ?? []) })} /></label>
                      <div className="block text-sm"><span>{t("facilityBookings.slotLabel")}</span><AppSelect className="mt-1 w-full" label={t("facilityBookings.slotLabel")}
                        value={slotNumber(alternative, slots.data ?? [])} disabled={!alternative.startAt}
                        onChange={(value) => setAlternative({ ...alternative,
                          ...slotInterval(localTime(alternative.startAt).slice(0, 10), value, slots.data ?? []) })} options={slotOptions} /></div>
                    </div>}</>}
                  <AppButton type="submit" disabled={action.isPending}>{t("facilityBookings.decide")}</AppButton>
                </form>}
                <section className="space-y-3"><h3 className="font-bold">{t("facilityBookings.decisions")}</h3>
                  {detail.data.decisions.map((item) => <div key={item.id} className="space-y-2 rounded-xl bg-surface-app p-4">
                    <p>{t(item.outcome === "Approve" ? "facilityBookings.approve" : item.outcome === "Reject" ? "facilityBookings.reject" : "facilityBookings.revision")} · {date(item.at)}</p>
                    <p className="break-words">{item.reason}</p>{item.reviewNote && <p className="break-words">{item.reviewNote}</p>}
                    {item.alternative && <><p>{t("facilityBookings.alternative")}: {properties.data?.find((value) => value.id === item.alternative?.propertyId)?.name}
                      · {interval(item.alternative)}</p>
                      {clubId && booking.state === "Revision Requested" && <AppButton variant="secondary" onClick={() => {
                        openEditor(); setForm((previous) => ({ ...previous, ...item.alternative!, equipment: [] }));
                      }}>{t("facilityBookings.useAlternative")}</AppButton>}</>}
                  </div>)}</section>
                <section className="space-y-3"><h3 className="font-bold">{t("facilityBookings.history")}</h3>
                  {detail.data.versions.map((item) => <details key={item.versionNo} className="rounded-xl border border-border-app p-4">
                    <summary>{t("facilityBookings.version", { number: item.versionNo })} · {date(item.submittedAt)}</summary>
                    <div className="mt-3 space-y-2 text-sm"><p className="break-words">{item.payload.purpose}</p>
                      <p>{properties.data?.find((value) => value.id === item.payload.propertyId)?.name ?? item.payload.propertyId}</p>
                      <p>{interval(item.payload)}</p>
                      <p>{t("facilityBookings.headcount")}: {item.payload.headcount}</p><p>{item.payload.equipment.join(", ")}</p>
                      {item.payload.eventId && <Link className="text-primary-app underline" to={`/events/${item.payload.eventId}`}>{t("facilityBookings.eventId")}</Link>}
                    </div></details>)}</section>
              </>}
        </section>
      </div>}
  </>;
}
