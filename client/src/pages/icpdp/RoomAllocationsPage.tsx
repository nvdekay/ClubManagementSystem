import { useMemo, useState, type FormEvent } from "react";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppPagination } from "@/components/ui/pagination/AppPagination";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTable, appTableFeatures, type AppTableFeatures } from "@/components/ui/table/AppTable";
import { appToast } from "@/components/ui/toast/AppToast";
import { useAuth } from "@/hooks/useAuth";
import { useBookingSlots } from "@/hooks/useFacilityBookings";
import { useAllocateRoom, useRevokeRoomAllocation, useRoomAllocationOptions, useRoomAllocations, useRoomOccupancy } from "@/hooks/useRoomAllocations";
import { RoomAllocationError, type RoomAllocation, type RoomAllocationConflict, type RoomAllocationOptions } from "@/services/roomAllocations";
import { cn } from "@/utils/cn";
import { WEEKDAYS, slotLabel, weekdayLabel } from "@/utils/roomSchedule";

const statuses = ["active", "revoked", "all"] as const;
type Status = typeof statuses[number];
const column = createColumnHelper<AppTableFeatures, RoomAllocation>();
const emptyAllocations: RoomAllocation[] = [];
const emptyForm = { clubId: "", building: "", propertyId: "", weekday: "", slot: "", note: "" };

function statusLabel(t: TFunction, status: Status): string {
  return status === "active" ? t("roomAllocations.statusActive") : status === "revoked" ? t("roomAllocations.statusRevoked")
    : t("roomAllocations.statusAll");
}
function occurrenceLabel(t: TFunction, state: string): string {
  switch (state) {
    case "Approved": return t("roomAllocations.states.Approved");
    case "In Use": return t("roomAllocations.states.In Use");
    case "Completed": return t("roomAllocations.states.Completed");
    case "Released": return t("roomAllocations.states.Released");
    case "Cancelled": return t("roomAllocations.states.Cancelled");
    default: return state;
  }
}
function currentSemester(options: RoomAllocationOptions | undefined): string {
  const now = new Date().toISOString();
  const sorted = [...(options?.semesters ?? [])].sort((a, b) => a.startAt.localeCompare(b.startAt));
  return (sorted.find((item) => item.startAt <= now && now <= item.endAt) ?? sorted[0])?.code ?? "";
}
function isConflictList(details: unknown): details is RoomAllocationConflict[] {
  return Array.isArray(details) && details.every((item) => typeof item === "object" && item !== null && "startAt" in item);
}

/** UC58: ICPDP gives clubs a room for one weekday and slot of every week of a semester. */
export function RoomAllocationsPage() {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const can = auth.data?.systemRoles.includes("ICPDP_OFFICER") ?? false;
  const options = useRoomAllocationOptions(can);
  const slots = useBookingSlots(can);
  const [chosenSemester, setChosenSemester] = useState("");
  const semester = chosenSemester || currentSemester(options.data);
  const list = useRoomAllocations(can ? semester : "");
  const allocate = useAllocateRoom();
  const revoke = useRevokeRoomAllocation();
  const [status, setStatus] = useState<Status>("active");
  const [building, setBuilding] = useState("");
  const [clubFilter, setClubFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<RoomAllocation | null>(null);
  const [reason, setReason] = useState("");
  const slotList = useMemo(() => slots.data ?? [], [slots.data]);
  const rooms = useMemo(() => options.data?.rooms ?? [], [options.data]);
  const buildings = useMemo(() => [...new Set(rooms.map((item) => item.location))]
    .sort((a, b) => a.localeCompare(b, "vi")), [rooms]);
  const date = useMemo(() => new Intl.DateTimeFormat(i18n.language === "vi" ? "vi-VN" : "en-GB",
    { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }), [i18n.language]);
  const dateTime = useMemo(() => new Intl.DateTimeFormat(i18n.language === "vi" ? "vi-VN" : "en-GB",
    { weekday: "short", day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }), [i18n.language]);
  const allocations = list.data ?? emptyAllocations;
  const filtered = useMemo(() => allocations.filter((item) => (status === "all" || (status === "active") === !item.revokedAt)
    && (!building || item.location === building) && (!clubFilter || item.clubId === clubFilter))
    .sort((a, b) => a.clubName.localeCompare(b.clubName, "vi") || a.weekday - b.weekday || a.slot - b.slot),
  [allocations, status, building, clubFilter]);
  const takenCells = useMemo(() => new Map(allocations.filter((item) => !item.revokedAt && item.propertyId === form.propertyId)
    .map((item) => [`${item.weekday}-${item.slot}`, item.clubName])), [allocations, form.propertyId]);
  // UC58 A3/E1: a cell an approved event or booking blocks on any remaining date would be rejected.
  const occupancy = useRoomOccupancy(creating ? semester : "", form.propertyId);
  const busyCells = useMemo(() => new Map((occupancy.data ?? []).map((cell) => [`${cell.weekday}-${cell.slot}`, cell.items])),
    [occupancy.data]);
  const columns = useMemo(() => column.columns([
    column.accessor("clubName", { header: t("roomAllocations.club"), cell: (cell) => <span className="font-semibold break-words">{cell.getValue()}</span> }),
    column.accessor("propertyName", { header: t("roomAllocations.room"), cell: (cell) => <span className="break-words">
      {cell.getValue()}<span className="block text-sm text-muted-app">{cell.row.original.location}</span></span> }),
    column.accessor("weekday", { header: t("roomAllocations.schedule"), cell: (cell) => <span>
      {weekdayLabel(t, cell.getValue())}<span className="block text-sm text-muted-app">{slotLabel(t, cell.row.original.slot, slotList)}</span>
      {cell.row.original.note && <span className="block text-sm break-words text-muted-app">{cell.row.original.note}</span>}</span> }),
    column.display({ id: "remaining", header: t("roomAllocations.remaining"), cell: (cell) => {
      const item = cell.row.original;
      const remaining = item.occurrences.filter((value) => value.state === "Approved").length;
      return <div className="space-y-1">
        {item.revokedAt ? <AppBadge tone="neutral">{t("roomAllocations.revoked", { date: date.format(new Date(item.revokedAt)) })}</AppBadge>
          : <span>{t("roomAllocations.remainingCount", { remaining, total: item.occurrences.length })}</span>}
        {item.revokeReason && <p className="text-sm break-words text-muted-app">{item.revokeReason}</p>}
        <details className="text-sm"><summary className="text-primary-app">{t("roomAllocations.sessions", { count: item.occurrences.length })}</summary>
          <ul className="mt-2 space-y-1">{item.occurrences.map((value) => <li key={value.bookingId}>
            {dateTime.format(new Date(value.startAt))} · {occurrenceLabel(t, value.state)}</li>)}</ul></details>
      </div>;
    } }),
    column.accessor("allocatedByName", { header: t("roomAllocations.allocatedBy"), cell: (cell) => <span className="text-sm">
      {cell.getValue() ?? t("roomAllocations.icpdp")}<span className="block text-muted-app">{date.format(new Date(cell.row.original.allocatedAt))}</span></span> }),
    column.display({ id: "actions", header: t("roomAllocations.actions"), cell: (cell) => cell.row.original.revokedAt ? null
      : <AppButton variant="secondary" onClick={() => { setRevoking(cell.row.original); setReason(""); revoke.reset(); }}>
        {t("roomAllocations.revoke")}</AppButton> }),
  ]), [t, slotList, date, dateTime, revoke]);
  const table = useTable({ features: appTableFeatures, columns, data: filtered, initialState: { pagination: { pageIndex: 0, pageSize: 20 } } });

  function openCreate() {
    setForm({ ...emptyForm, building: building }); setFormError(null); allocate.reset(); setCreating(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.clubId || !form.propertyId || !form.weekday || !form.slot || !auth.data) {
      setFormError(t("roomAllocations.invalidForm")); return;
    }
    setFormError(null);
    try {
      await allocate.mutateAsync({ csrfToken: auth.data.csrfToken, input: { semesterCode: semester, clubId: form.clubId,
        propertyId: form.propertyId, weekday: Number(form.weekday), slot: Number(form.slot), ...(form.note.trim() ? { note: form.note.trim() } : {}) } });
      setCreating(false); appToast.success(t("roomAllocations.saved"));
    } catch { /* The mutation error and clashing dates are shown in the dialog. */ }
  }
  async function confirmRevoke(event: FormEvent) {
    event.preventDefault();
    if (!revoking || !auth.data || !reason.trim()) return;
    try {
      await revoke.mutateAsync({ id: revoking.id, reason: reason.trim(), csrfToken: auth.data.csrfToken });
      setRevoking(null); appToast.success(t("roomAllocations.revokedToast"));
    } catch { /* Shown in the dialog. */ }
  }

  if (auth.isPending) return <AppSkeleton className="h-64 w-full" />;
  if (!can) return <AppNotice tone="danger" role="alert">{t("roomAllocations.denied")}</AppNotice>;
  const conflicts = allocate.error instanceof RoomAllocationError && isConflictList(allocate.error.details) ? allocate.error.details : [];
  const roomsInBuilding = rooms.filter((item) => !form.building || item.location === form.building);
  return <>
    <PageHeader title={t("roomAllocations.title")} description={t("roomAllocations.description")}
      actions={semester ? <AppButton onClick={openCreate}>{t("roomAllocations.allocate")}</AppButton> : undefined} />
    <p className="mb-5 text-sm text-muted-app">{t("roomAllocations.timeZone")}</p>
    {options.isPending || slots.isPending ? <AppSkeleton className="h-48 w-full" />
      : options.isError || slots.isError ? <AppNotice tone="danger" role="alert" title={t("roomAllocations.loadError")}>
        <p>{options.error?.message ?? slots.error?.message}</p>
        <AppButton onClick={() => { void options.refetch(); void slots.refetch(); }}>{t("roomAllocations.retry")}</AppButton>
      </AppNotice> : !semester ? <AppNotice tone="warning">{t("roomAllocations.noSemester")}</AppNotice> : <div className="min-w-0 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AppSelect label={t("roomAllocations.semester")} value={semester} onChange={(value) => { setChosenSemester(value); table.setPageIndex(0); }}
            options={options.data.semesters.map((item) => ({ value: item.code, label: item.code }))} />
          <AppSelect label={t("roomAllocations.building")} value={building} onChange={(value) => { setBuilding(value); table.setPageIndex(0); }}
            options={[{ value: "", label: t("roomAllocations.allBuildings") }, ...buildings.map((item) => ({ value: item, label: item }))]} />
          <AppSelect label={t("roomAllocations.club")} value={clubFilter} onChange={(value) => { setClubFilter(value); table.setPageIndex(0); }}
            options={[{ value: "", label: t("roomAllocations.allClubs") }, ...options.data.clubs.map((item) => ({ value: item.id, label: item.name }))]} />
          <AppSelect<Status> label={t("roomAllocations.status")} value={status} onChange={(value) => { setStatus(value); table.setPageIndex(0); }}
            options={statuses.map((item) => ({ value: item, label: statusLabel(t, item) }))} />
        </div>
        {list.isPending ? <AppSkeleton className="h-48 w-full" /> : list.isError ? <AppNotice tone="danger" role="alert">
          <p>{list.error.message}</p><AppButton onClick={() => void list.refetch()}>{t("roomAllocations.retry")}</AppButton></AppNotice>
          : <>
            <AppTable table={table} emptyMessage={t("roomAllocations.empty")} />
            <AppPagination pageIndex={table.state.pagination.pageIndex} pageCount={table.getPageCount()}
              onPageChange={(index) => table.setPageIndex(index)} prevLabel={t("facilityBookings.prevPage")}
              nextLabel={t("facilityBookings.nextPage")} pageLabel={(page) => t("facilityBookings.pageLabel", { page })}
              navLabel={t("facilityBookings.pages")} />
          </>}
      </div>}
    {creating && options.data && <AppDialog open title={t("roomAllocations.allocate")} closeLabel={t("roomAllocations.close")} onClose={() => setCreating(false)}>
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <p className="text-sm text-muted-app">{t("roomAllocations.semester")}: <span className="font-semibold text-text-app">{semester}</span></p>
        <AppSelect label={t("roomAllocations.club")} value={form.clubId} onChange={(value) => setForm({ ...form, clubId: value })}
          options={[{ value: "", label: t("roomAllocations.selectClub") }, ...options.data.clubs.map((item) => ({ value: item.id, label: item.name }))]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <AppSelect label={t("roomAllocations.building")} value={form.building} onChange={(value) => setForm({ ...form, building: value, propertyId: "" })}
            options={[{ value: "", label: t("roomAllocations.allBuildings") }, ...buildings.map((item) => ({ value: item, label: item }))]} />
          <AppSelect label={t("roomAllocations.room")} value={form.propertyId} onChange={(value) => setForm({ ...form, propertyId: value })}
            options={[{ value: "", label: t("roomAllocations.selectRoom") }, ...roomsInBuilding.map((item) => ({ value: item.id,
              label: `${item.name} · ${item.location}${item.capacity ? ` · ${item.capacity}` : ""}` }))]} />
        </div>
        {form.propertyId && <div className="space-y-2">
          <p className="text-sm font-medium">{t("roomAllocations.gridTitle", { semester })}</p>
          <p className="text-sm text-muted-app">{t("roomAllocations.gridHint")}</p>
          {occupancy.isError && <p role="alert" className="text-sm text-danger-app">{t("roomAllocations.gridLoadError")}</p>}
          <div className="overflow-x-auto"><table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead><tr><th className="p-1" />{WEEKDAYS.map((day) => <th key={day} className="p-1 font-medium">{weekdayLabel(t, day)}</th>)}</tr></thead>
            <tbody>{slotList.map((slot) => <tr key={slot.number}>
              <th className="p-1 text-left font-medium whitespace-nowrap">{t("facilityBookings.slot", { number: slot.number })}
                <span className="block font-normal text-muted-app">{slot.start}–{slot.end}</span></th>
              {WEEKDAYS.map((day) => {
                const takenBy = takenCells.get(`${day}-${slot.number}`);
                const busy = takenBy ? undefined : busyCells.get(`${day}-${slot.number}`);
                const chosen = form.weekday === String(day) && form.slot === String(slot.number);
                const busyDetail = busy ? t("roomAllocations.gridBusyDetail", { items: busy.map((item) =>
                  `${item.title} · ${dateTime.format(new Date(item.startAt))}`).join("; ") }) : undefined;
                return <td key={day} className="p-1"><button type="button" disabled={Boolean(takenBy) || Boolean(busy)} aria-pressed={chosen}
                  title={busyDetail} aria-description={busyDetail}
                  onClick={() => setForm({ ...form, weekday: String(day), slot: String(slot.number) })}
                  className={cn("min-h-12 w-full rounded-lg border px-1 py-2 text-xs break-words", {
                    "border-primary-app bg-primary-soft-app font-semibold text-primary-app": chosen,
                    "cursor-not-allowed border-border-app bg-surface-strong-app text-muted-app": Boolean(takenBy),
                    "cursor-not-allowed border-warning-app bg-warning-app/10 text-text-app": Boolean(busy),
                    "border-border-app hover:border-primary-app": !chosen && !takenBy && !busy,
                  })}>{takenBy ? t("roomAllocations.gridTaken", { club: takenBy })
                    : busy ? t("roomAllocations.gridBusy", { count: busy.length })
                      : chosen ? t("roomAllocations.gridChosen") : t("roomAllocations.gridFree")}</button></td>;
              })}
            </tr>)}</tbody>
          </table></div>
        </div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <AppSelect label={t("roomAllocations.weekday")} value={form.weekday} onChange={(value) => setForm({ ...form, weekday: value })}
            options={[{ value: "", label: t("roomAllocations.weekday") }, ...WEEKDAYS.map((day) => ({ value: String(day), label: weekdayLabel(t, day) }))]} />
          <AppSelect label={t("roomAllocations.slot")} value={form.slot} onChange={(value) => setForm({ ...form, slot: value })}
            options={[{ value: "", label: t("facilityBookings.selectSlot") }, ...slotList.map((slot) => ({ value: String(slot.number), label: slotLabel(t, slot.number, slotList) }))]} />
        </div>
        <label className="block text-sm font-medium">{t("roomAllocations.note")}
          <AppInput className="mt-1 w-full" maxLength={500} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
        <p className="text-sm text-muted-app">{t("roomAllocations.rule")}</p>
        {formError && <AppNotice tone="danger" role="alert">{formError}</AppNotice>}
        {allocate.isError && <AppNotice tone="danger" role="alert" title={conflicts.length ? t("roomAllocations.conflictTitle") : undefined}>
          {conflicts.length ? <ul className="space-y-1">{conflicts.map((item, index) => <li key={`${item.startAt}-${index}`} className="break-words">
            {dateTime.format(new Date(item.startAt))} · {item.source === "event" ? t("roomAllocations.conflictEvent") : t("roomAllocations.conflictBooking")}
            {item.clubName ? ` · ${item.clubName}` : ""}</li>)}</ul> : <p>{allocate.error.message}</p>}
        </AppNotice>}
        <div className="flex flex-wrap gap-3">
          <AppButton type="submit" disabled={allocate.isPending}>{t("roomAllocations.save")}</AppButton>
          <AppButton type="button" variant="secondary" onClick={() => setCreating(false)}>{t("roomAllocations.close")}</AppButton>
        </div>
      </form>
    </AppDialog>}
    {revoking && <AppDialog open title={t("roomAllocations.revokeTitle")} closeLabel={t("roomAllocations.close")} onClose={() => setRevoking(null)}>
      <form className="space-y-4" onSubmit={(event) => void confirmRevoke(event)}>
        <p className="font-semibold break-words">{revoking.clubName} · {revoking.propertyName} · {weekdayLabel(t, revoking.weekday)} · {slotLabel(t, revoking.slot, slotList)}</p>
        <p className="text-sm text-muted-app">{t("roomAllocations.revokeRule")}</p>
        <label className="block text-sm font-medium">{t("roomAllocations.revokeReason")}
          <AppInput className="mt-1 w-full" required maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        {revoke.isError && <AppNotice tone="danger" role="alert">{revoke.error.message}</AppNotice>}
        <div className="flex flex-wrap gap-3">
          <AppButton type="submit" disabled={revoke.isPending || !reason.trim()}>{t("roomAllocations.revokeConfirm")}</AppButton>
          <AppButton type="button" variant="secondary" onClick={() => setRevoking(null)}>{t("roomAllocations.close")}</AppButton>
        </div>
      </form>
    </AppDialog>}
  </>;
}
