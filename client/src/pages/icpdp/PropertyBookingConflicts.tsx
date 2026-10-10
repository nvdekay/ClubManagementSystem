import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useBlackoutBookings } from "@/hooks/useFacilityBookings";

interface PropertyBookingConflictsProps { propertyId: string; blackoutKey: string }
export function PropertyBookingConflicts({ propertyId, blackoutKey }: PropertyBookingConflictsProps) {
  const { t, i18n } = useTranslation();
  const bookings = useBlackoutBookings(propertyId, blackoutKey);
  function date(value: string) {
    return new Intl.DateTimeFormat(i18n.language === "vi" ? "vi-VN" : "en-GB", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
  }
  return <section className="mt-4 space-y-3">
    <h3 className="font-semibold">{t("facilityBookings.blackoutTitle")}</h3>
    {bookings.isPending ? <AppSkeleton className="h-20 w-full" /> : bookings.isError ? <AppNotice tone="danger" role="alert">
      <p>{bookings.error.message}</p><AppButton onClick={() => void bookings.refetch()}>{t("facilityBookings.retry")}</AppButton>
    </AppNotice> : !bookings.data.length ? <p className="text-sm text-muted-app">{t("facilityBookings.noBlackoutConflicts")}</p>
      : bookings.data.map((item) => <AppNotice key={item.id} tone="warning">
        <Link to={`/workspace/bookings?id=${encodeURIComponent(item.id)}`} className="font-medium text-primary-app underline">{item.clubName} · {item.purpose}</Link>
        <p>{date(item.startAt)} – {date(item.endAt)}</p>
      </AppNotice>)}
  </section>;
}
