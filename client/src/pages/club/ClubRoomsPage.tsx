import { useMemo } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useBookingSlots } from "@/hooks/useFacilityBookings";
import { useAuth } from "@/hooks/useAuth";
import { useClubRoomAllocations } from "@/hooks/useRoomAllocations";
import { slotLabel, weekdayLabel } from "@/utils/roomSchedule";

function vietnamDay(value: string | Date): string {
  return new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 10);
}

/** Read-only view of the rooms ICPDP allocated to the club; shown as proof when collecting the key. */
export function ClubRoomsPage() {
  const { clubId = "" } = useParams();
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const can = Boolean(auth.data?.workspaces.some((item) => item.clubId === clubId
    && item.permissions.includes("club.booking.manage")));
  const allocations = useClubRoomAllocations(clubId, can);
  const slots = useBookingSlots(can);
  const slotList = slots.data ?? [];
  const locale = i18n.language === "vi" ? "vi-VN" : "en-GB";
  const date = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "numeric", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }), [locale]);
  const time = useMemo(() => new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }), [locale]);
  const shortDate = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }), [locale]);
  const today = vietnamDay(new Date());
  const items = useMemo(() => [...(allocations.data ?? [])]
    .sort((a, b) => (a.occurrences[0]?.startAt ?? "").localeCompare(b.occurrences[0]?.startAt ?? "")), [allocations.data]);
  const todays = items.flatMap((item) => item.occurrences.filter((occurrence) => vietnamDay(occurrence.startAt) === today)
    .map((occurrence) => ({ item, occurrence })));

  if (auth.isPending) return <AppSkeleton className="h-48 w-full" />;
  if (!can) return <AppNotice tone="danger" role="alert">{t("roomAllocations.clubDenied")}</AppNotice>;

  return <>
    <PageHeader title={t("roomAllocations.clubTitle")} description={t("roomAllocations.clubDescription")} />
    <p className="mb-5 text-sm text-muted-app">{t("roomAllocations.timeZone")}</p>
    {allocations.isPending ? <AppSkeleton className="h-48 w-full" />
      : allocations.isError ? <AppNotice tone="danger" role="alert" title={t("roomAllocations.loadError")}>
        <p>{allocations.error.message}</p>
        <AppButton onClick={() => void allocations.refetch()}>{t("roomAllocations.retry")}</AppButton>
      </AppNotice> : !items.length ? <AppEmptyState message={t("roomAllocations.clubEmpty")} /> : <div className="space-y-6">
        {todays.length > 0 && <section className="space-y-3 rounded-2xl border border-primary-app bg-primary-soft-app p-5">
          <h2 className="text-lg font-bold">{t("roomAllocations.todayTitle")} · {date.format(new Date())}</h2>
          {todays.map(({ item, occurrence }) => <div key={occurrence.bookingId} className="space-y-1">
            <p className="text-2xl font-bold break-words">{item.propertyName}</p>
            <p className="break-words">{item.location}</p>
            <p className="font-medium">{slotLabel(t, item.slot, slotList)} · {time.format(new Date(occurrence.startAt))}–{time.format(new Date(occurrence.endAt))}</p>
            <p className="text-sm text-muted-app">{t("roomAllocations.semesterLabel", { code: item.semesterCode })}</p>
          </div>)}
        </section>}
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const next = item.occurrences[0]!;
            return <AppCard key={item.id} className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xl font-bold break-words">{item.propertyName}</p>
                  <p className="text-sm break-words text-muted-app">{item.location}</p>
                </div>
                <AppBadge tone="info">{t("roomAllocations.semesterLabel", { code: item.semesterCode })}</AppBadge>
              </div>
              <p className="font-medium">{weekdayLabel(t, item.weekday)} · {slotLabel(t, item.slot, slotList)}</p>
              {item.note && <p className="text-sm break-words">{item.note}</p>}
              <p className="text-sm">
                <span className="text-muted-app">{t("roomAllocations.nextSession")}: </span>
                {vietnamDay(next.startAt) === today ? t("roomAllocations.today") : date.format(new Date(next.startAt))}
              </p>
              <details className="text-sm"><summary className="text-primary-app">{t("roomAllocations.upcoming")} ({item.occurrences.length})</summary>
                <ul className="mt-2 space-y-1">{item.occurrences.map((occurrence) => <li key={occurrence.bookingId}>{date.format(new Date(occurrence.startAt))}</li>)}</ul>
              </details>
              <p className="text-xs text-muted-app">{t("roomAllocations.allocatedOn", { name: t("roomAllocations.icpdp"),
                date: shortDate.format(new Date(item.allocatedAt)) })}</p>
            </AppCard>;
          })}
        </div>
      </div>}
  </>;
}
