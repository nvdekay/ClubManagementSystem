import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
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
      <Link to="/events" className="text-sm font-semibold text-accent-app">
        ← {t("discovery.backToEvents")}
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
        <div className="mt-7 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-app">
            {t("discovery.upcoming")}
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">{detail.data.event.title}</h1>
          <p className="mt-4 text-muted-app">
            {t("discovery.hostedBy")}: <Link to={`/clubs/${detail.data.club.id}`} className="font-semibold text-accent-app">
              {detail.data.club.name}
            </Link>
          </p>
          <AppCard className="mt-8 space-y-3 p-6">
            <p>{t("discovery.starts")}: {formatDate(detail.data.event.startAt, locale)}</p>
            <p>{t("discovery.ends")}: {formatDate(detail.data.event.endAt, locale)}</p>
            {detail.data.event.venueText && <p>
              {t("discovery.venue")}: {detail.data.event.venueText}
            </p>}
            <p>{t("discovery.capacity")}: {detail.data.event.capacity}</p>
          </AppCard>
          <p className="mt-6 text-sm text-muted-app">{t("discovery.registrationLater")}</p>
        </div>
      ) : <p className="mt-8">{t("discovery.notFound")}</p>}
    </section>
  );
}
