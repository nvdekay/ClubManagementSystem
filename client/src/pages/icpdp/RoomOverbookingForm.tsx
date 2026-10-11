import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { appToast } from "@/components/ui/toast/AppToast";
import { useAuth } from "@/hooks/useAuth";
import { useClubLifecycles } from "@/hooks/useClubLifecycle";
import { useBookingAction, useBookingAvailability, useBookingProperties, useBookingResponsible, useBookingSlots } from "@/hooks/useFacilityBookings";

export function RoomOverbookingForm() {
  const { t } = useTranslation();
  const auth = useAuth();
  const can = auth.data?.systemRoles.includes("ICPDP_OFFICER") ?? false;
  const [open, setOpen] = useState(false);
  const [clubId, setClubId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [day, setDay] = useState("");
  const [slotNo, setSlotNo] = useState("");
  const [reason, setReason] = useState("");
  const clubs = useClubLifecycles(can && open);
  const properties = useBookingProperties(null, can && open);
  const slots = useBookingSlots(can && open);
  const slot = slots.data?.find((item) => String(item.number) === slotNo);
  const startAt = day && slot ? new Date(`${day}T${slot.start}:00+07:00`).toISOString() : "";
  const endAt = day && slot ? new Date(`${day}T${slot.end}:00+07:00`).toISOString() : "";
  const check = useBookingAvailability(open && can ? clubId : null, propertyId, startAt, endAt, true);
  const responsible = useBookingResponsible(clubId || null, can && open, true);
  const action = useBookingAction(auth.data?.csrfToken ?? "");
  const allowed = check.isSuccess && !check.isFetching && check.data.conflicts.length > 0
    && check.data.conflictResult === "Warning" && responsible.isSuccess && !responsible.isFetching && !!reason.trim();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!allowed) return;
    try {
      await action.mutateAsync({ kind: "overbook", clubId, input: { propertyId, startAt, endAt, reason } });
      setOpen(false); appToast.success(t("facilityBookings.reserved"));
    } catch { /* Mutation errors are displayed in the dialog. */ }
  }
  if (!can) return null;
  return <div className="mb-5">
    <AppButton variant="secondary" onClick={() => {
      setClubId(""); setPropertyId(""); setDay(""); setSlotNo(""); setReason(""); action.reset(); setOpen(true);
    }}>{t("facilityBookings.overbooking")}</AppButton>
    <AppDialog open={open} title={t("facilityBookings.overbooking")} closeLabel={t("facilityBookings.close")} onClose={() => setOpen(false)}>
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <AppNotice tone="warning">{t("facilityBookings.overbookingRule")}</AppNotice>
        {clubs.isPending || properties.isPending || slots.isPending ? <AppSkeleton className="h-32 w-full" />
          : clubs.isError || properties.isError || slots.isError ? <AppNotice tone="danger">
            <p>{clubs.error?.message ?? properties.error?.message ?? slots.error?.message}</p>
            <AppButton type="button" onClick={() => { void clubs.refetch(); void properties.refetch(); void slots.refetch(); }}>{t("facilityBookings.retry")}</AppButton>
          </AppNotice> : <>
            <AppSelect label={t("facilityBookings.club")} value={clubId} onChange={setClubId} options={[
              { value: "", label: t("facilityBookings.selectClub") },
              ...(clubs.data?.clubs ?? []).filter((item) => ["Active", "Dissolving"].includes(item.state))
                .map((item) => ({ value: item.id, label: item.name })),
            ]} />
            <label className="block text-sm font-medium">{t("facilityBookings.bookingDate")}
              <AppInput type="date" required className="mt-1 w-full" value={day} onChange={(event) => setDay(event.target.value)} /></label>
            <AppSelect label={t("facilityBookings.slotLabel")} value={slotNo} onChange={setSlotNo} options={[
              { value: "", label: t("facilityBookings.selectSlot") },
              ...(slots.data ?? []).map((item) => ({ value: String(item.number), label: `${t("facilityBookings.slot", { number: item.number })} · ${item.start}–${item.end}` })),
            ]} />
            <AppSelect label={t("facilityBookings.property")} value={propertyId} onChange={setPropertyId} options={[
              { value: "", label: t("facilityBookings.select") },
              ...(properties.data ?? []).filter((item) => item.isActive && item.type === "ROOM")
                .map((item) => ({ value: item.id, label: `${item.name} · ${item.location}` })),
            ]} />
          </>}
        {clubId && (responsible.isPending ? <AppSkeleton className="h-12 w-full" /> : responsible.isError
          ? <AppNotice tone="danger">{responsible.error.message}</AppNotice> : responsible.data && <p className="break-words">
            {t("facilityBookings.responsible")}: {responsible.data.displayName} · {responsible.data.email}</p>)}
        {clubId && propertyId && startAt && endAt && (check.isFetching ? <p>{t("facilityBookings.checking")}</p>
          : check.isError ? <AppNotice tone="danger">{check.error.message}</AppNotice> : check.data && <AppNotice tone="warning">
            <p>{t(!check.data.conflicts.length ? "facilityBookings.noOverbookingConflict"
              : check.data.conflictResult === "Blocking Conflict" ? "facilityBookings.overbookingDisabled" : "facilityBookings.overbookingRule")}</p>
            {check.data.conflicts.map((item) => <p key={`${item.source}-${item.id}`} className="break-words">
              {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(item.startAt))}</p>)}
          </AppNotice>)}
        <label className="block text-sm font-medium">{t("facilityBookings.overbookingReason")}
          <AppInput required maxLength={2000} className="mt-1 w-full" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        {action.isError && <AppNotice tone="danger" role="alert">{action.error.message}</AppNotice>}
        <div className="flex flex-wrap gap-3">
          <AppButton type="submit" disabled={!allowed || action.isPending}>{t("facilityBookings.permitOverbooking")}</AppButton>
          <AppButton type="button" variant="secondary" onClick={() => setOpen(false)}>{t("facilityBookings.close")}</AppButton>
        </div>
      </form>
    </AppDialog>
  </div>;
}
