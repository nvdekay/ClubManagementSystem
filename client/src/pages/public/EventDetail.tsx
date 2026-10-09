import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

import { EventStatusBadge } from "@/components/custom/PublicEventCard";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useEvent } from "@/hooks/useDiscovery";
import { PublicApiError } from "@/services/discovery";
import { formatDate } from "@/utils/formatDate";

export function EventDetail() {
  const { t, i18n } = useTranslation();
  const { id = "" } = useParams();
  const detail = useEvent(id);
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
      ) : detail.isError && detail.error instanceof PublicApiError
        && detail.error.statusCode === 404 ? (
        <p className="mt-8" role="alert">{t("discovery.notFound")}</p>
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
            {t("discovery.hostedBy")}: <Link to={`/clubs/${detail.data.club.id}`} className="font-semibold text-accent-app">
              {detail.data.club.name}
            </Link>
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
          {detail.data.event.status === "upcoming" && <p className="mt-6 text-sm text-muted-app">{t("discovery.registrationLater")}</p>}
        </div>
      ) : <p className="mt-8">{t("discovery.notFound")}</p>}
    </section>
  );
}
