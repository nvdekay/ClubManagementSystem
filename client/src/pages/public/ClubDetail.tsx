import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

import { PublicEventCard } from "@/components/custom/PublicEventCard";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useClub } from "@/hooks/useDiscovery";
import { PublicApiError } from "@/services/discovery";
import { formatDate } from "@/utils/formatDate";

export function ClubDetail() {
  const { t, i18n } = useTranslation();
  const { id = "" } = useParams();
  const detail = useClub(id);
  const locale = i18n.language === "vi" ? "vi" : "en";

  return (
    <section>
      <Link to="/clubs" className="text-sm font-semibold text-accent-app">
        ← {t("discovery.backToClubs")}
      </Link>
      {detail.isPending ? (
        <div role="status" className="mt-8 space-y-4">
          <span className="sr-only">{t("discovery.loading")}</span>
          <AppSkeleton className="h-40 w-full" />
          <AppSkeleton className="h-36 w-full" />
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
        <div className="mt-7 space-y-10">
          <header className="rounded-2xl border border-border-app bg-surface-app p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold uppercase tracking-wide text-primary-app">
                {detail.data.club.field}
              </span>
              <span className="rounded-full border border-border-app px-3 py-1 text-xs">
                {detail.data.club.state === "Suspended" ? t("discovery.suspended") : t("discovery.active")}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold sm:text-5xl font-heading">{detail.data.club.name}</h1>
            <p className="mt-2 text-sm text-muted-app">{detail.data.club.code}</p>
            {detail.data.club.description && <p className="mt-6 max-w-3xl text-muted-app">
              {detail.data.club.description}
            </p>}
            {detail.data.club.operatingScope && <p className="mt-4 text-sm text-muted-app">
              {detail.data.club.operatingScope}
            </p>}
            {detail.data.club.state === "Suspended" && <p className="mt-5 text-sm font-medium text-warning-app">
              {t("discovery.suspendedHint")}
            </p>}
          </header>

          <section>
            <h2 className="text-2xl font-semibold font-heading">{t("discovery.board")}</h2>
            {detail.data.board.length === 0 ? (
              <div className="mt-4"><AppEmptyState message={t("discovery.noBoard")} /></div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {detail.data.board.map((seat) => (
                  <AppCard key={`${seat.termName}:${seat.positionName}:${seat.memberName}`}>
                    <h3 className="font-semibold font-heading">{seat.memberName}</h3>
                    <p className="mt-2 text-sm text-muted-app">{seat.positionName}</p>
                    <p className="mt-1 text-xs text-muted-app">{seat.termName}</p>
                  </AppCard>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-semibold font-heading">{t("discovery.recruitment")}</h2>
            {detail.data.campaigns.length === 0 ? (
              <div className="mt-4"><AppEmptyState message={t("discovery.noRecruitment")} /></div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {detail.data.campaigns.map((campaign) => (
                  <AppCard key={campaign.id}>
                    <h3 className="font-semibold font-heading">{campaign.title}</h3>
                    <p className="mt-2 text-sm text-muted-app">
                      {formatDate(campaign.windowStart, locale)} — {formatDate(campaign.windowEnd, locale)}
                    </p>
                    <p className="mt-3 text-xs text-muted-app">{t("discovery.applicationLater")}</p>
                  </AppCard>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-semibold font-heading">{t("discovery.upcoming")}</h2>
            {detail.data.upcomingEvents.length === 0 ? (
              <div className="mt-4"><AppEmptyState message={t("discovery.noUpcoming")} /></div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {detail.data.upcomingEvents.map((event) => <PublicEventCard key={event.id} event={event} />)}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-semibold font-heading">{t("discovery.history")}</h2>
            {detail.data.history.length === 0 ? (
              <div className="mt-4"><AppEmptyState message={t("discovery.noHistory")} /></div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {detail.data.history.map((event) => (
                  <AppCard key={event.id}>
                    <h3 className="font-semibold font-heading">{event.title}</h3>
                    <p className="mt-2 text-sm text-muted-app">{formatDate(event.endAt, locale)}</p>
                  </AppCard>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : <p className="mt-8">{t("discovery.notFound")}</p>}
    </section>
  );
}
