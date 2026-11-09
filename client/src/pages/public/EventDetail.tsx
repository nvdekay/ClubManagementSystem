import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

import { EventFeedbackPanel } from "@/components/custom/EventFeedbackPanel";
import { EventRegistrationPanel } from "@/components/custom/EventRegistrationPanel";
import { EventStatusBadge } from "@/components/custom/PublicEventCard";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useEvent } from "@/hooks/useDiscovery";
import { useEventRegistrationContext } from "@/hooks/useEventRegistrations";
import type { EventRegistrationContext } from "@/services/eventRegistrations";
import { PublicApiError } from "@/services/discovery";
import { formatDate } from "@/utils/formatDate";

/**
 * A student who registered keeps access to an event the public page hides: one moved back to approval
 * after a reschedule (UC28), a cancelled one, or one limited to club members. It reads the student's
 * own registration context, which the API returns in any event state.
 */
function RegisteredEventView({ context }: { context: EventRegistrationContext }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "vi" ? "vi" : "en";
  const { event } = context;
  const ended = new Date(event.endAt) <= new Date();
  const notice = ["Cancelled", "Expired", "Rejected"].includes(event.state) ? t("discovery.registeredCancelled")
    : ["Approved", "Pending Approval", "Under Review", "Revision Requested"].includes(event.state) ? t("discovery.registeredRescheduling")
      : event.audienceScope === "MEMBERS_ONLY" ? t("discovery.registeredMembersOnly") : null;
  return <div className="mt-7 max-w-4xl">
    <h1 className="font-heading text-3xl font-bold tracking-tight text-balance sm:text-5xl">{event.title}</h1>
    <p className="mt-4 text-muted-app">{t("discovery.hostedBy")}: {event.clubId
      ? <Link to={`/clubs/${event.clubId}`} className="font-semibold text-accent-app">{event.clubName}</Link>
      : <span className="font-semibold">{event.clubName}</span>}</p>
    {notice && <AppNotice tone="warning" className="mt-6">{notice}</AppNotice>}
    <dl className="mt-8 grid gap-x-8 gap-y-5 border-y border-border-app py-6 sm:grid-cols-2">
      <div><dt className="text-sm text-muted-app">{t("discovery.starts")}</dt><dd className="font-semibold">{formatDate(event.startAt, locale)}</dd></div>
      <div><dt className="text-sm text-muted-app">{t("discovery.ends")}</dt><dd className="font-semibold">{formatDate(event.endAt, locale)}</dd></div>
    </dl>
    {!ended && !["Cancelled", "Expired", "Rejected"].includes(event.state) && <EventRegistrationPanel eventId={event.id} />}
    <EventFeedbackPanel eventId={event.id} />
  </div>;
}

export function EventDetail() {
  const { t, i18n } = useTranslation();
  const { id = "" } = useParams();
  const detail = useEvent(id);
  const auth = useAuth();
  const hidden = detail.isError && detail.error instanceof PublicApiError && detail.error.statusCode === 404;
  const registered = useEventRegistrationContext(id, hidden && Boolean(auth.data));
  const locale = i18n.language === "vi" ? "vi" : "en";
  return (
    <section>
      <Link to="/events" className="inline-flex min-h-10 items-center gap-1.5 rounded-full text-sm font-semibold text-accent-app hover:underline focus-visible:outline-2 focus-visible:outline-ring-app">
        <AppIcon name="arrowLeft" className="size-4" />{t("discovery.backToEvents")}
      </Link>
      {detail.isPending ? (
        <div role="status" className="mt-8 space-y-4">
          <span className="sr-only">{t("discovery.loading")}</span>
          <AppSkeleton className="h-40 w-full" />
          <AppSkeleton className="h-48 w-full" />
        </div>
      ) : hidden ? (
        auth.isPending || (auth.data && registered.isPending) ? <AppSkeleton className="mt-8 h-40 w-full" />
          : registered.data && (registered.data.registration || registered.data.isActiveClubMember)
            ? <RegisteredEventView context={registered.data} />
            : <p className="mt-8" role="alert">{t("discovery.notFound")}</p>
      ) : detail.isError ? (
        <div role="alert" className="mt-8 space-y-3">
          <p className="text-danger-app">{t("discovery.loadError")}</p>
          <AppButton onClick={() => void detail.refetch()}>{t("discovery.retry")}</AppButton>
        </div>
      ) : detail.data ? (
        <div className="mt-7 max-w-4xl">
          {detail.data.event.coverImageUrl && (
            <img src={detail.data.event.coverImageUrl} alt="" decoding="async"
              className="mb-8 aspect-video w-full rounded-3xl bg-primary-soft-app object-cover shadow-sm" />
          )}
          <EventStatusBadge status={detail.data.event.status} />
          <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-balance sm:text-5xl">{detail.data.event.title}</h1>
          <p className="mt-4 text-muted-app">
            {t("discovery.hostedBy")}: {detail.data.club ? <Link to={`/clubs/${detail.data.club.id}`} className="font-semibold text-accent-app">
              {detail.data.club.name}
            </Link> : <span className="font-semibold">{detail.data.event.clubName}</span>}
          </p>
          <dl className="mt-8 grid gap-x-8 gap-y-5 border-y border-border-app py-6 sm:grid-cols-2">
            <div className="flex gap-3">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint-soft-app text-mint-app"><AppIcon name="calendar" className="size-5" /></span>
              <div><dt className="text-sm text-muted-app">{t("discovery.starts")}</dt><dd className="font-semibold">{formatDate(detail.data.event.startAt, locale)}</dd></div>
            </div>
            <div className="flex gap-3">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint-soft-app text-mint-app"><AppIcon name="calendar" className="size-5" /></span>
              <div><dt className="text-sm text-muted-app">{t("discovery.ends")}</dt><dd className="font-semibold">{formatDate(detail.data.event.endAt, locale)}</dd></div>
            </div>
            {detail.data.event.venueText && <div className="flex gap-3 sm:col-span-2">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft-app text-primary-app"><AppIcon name="mapPin" className="size-5" /></span>
              <div><dt className="text-sm text-muted-app">{t("discovery.venue")}</dt><dd className="font-semibold">{detail.data.event.venueText}</dd></div>
            </div>}
          </dl>
          {detail.data.event.objective && (
            <section className="mt-8">
              <h2 className="font-heading text-xl font-bold">{t("discovery.eventAbout")}</h2>
              <p className="mt-3 leading-7 break-words whitespace-pre-line text-text-app">{detail.data.event.objective}</p>
            </section>
          )}
          {detail.data.event.status !== "ended" && <EventRegistrationPanel eventId={detail.data.event.id} />}
          <EventFeedbackPanel eventId={detail.data.event.id} />
        </div>
      ) : <p className="mt-8">{t("discovery.notFound")}</p>}
    </section>
  );
}
