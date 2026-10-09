import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

import { PublicEventCard } from "@/components/custom/PublicEventCard";
import { ClubLogo } from "@/components/custom/ClubLogo";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useClub } from "@/hooks/useDiscovery";
import { useAuth } from "@/hooks/useAuth";
import { PublicApiError } from "@/services/discovery";
import { formatDate } from "@/utils/formatDate";

export function ClubDetail() {
  const { t, i18n } = useTranslation();
  const { id = "" } = useParams();
  const detail = useClub(id);
  const auth = useAuth();
  const locale = i18n.language === "vi" ? "vi" : "en";

  return (
    <section>
      <Link to="/clubs" className="inline-flex min-h-10 items-center gap-1.5 rounded-full text-sm font-semibold text-accent-app hover:underline focus-visible:outline-2 focus-visible:outline-ring-app">
        <AppIcon name="arrowLeft" className="size-4" />{t("discovery.backToClubs")}
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
          <header className="relative overflow-hidden rounded-[2rem] bg-primary-soft-app p-6 sm:p-10">
            <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full bg-auth-orb-small-app opacity-60 blur-3xl" />
            <div className="relative">
            <ClubLogo name={detail.data.club.name} logoUrl={detail.data.club.logoUrl} size={96} className="mb-6 rounded-3xl shadow-md" />
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold tracking-wide text-primary-app uppercase">
                {detail.data.club.field}
              </span>
              <AppBadge tone={detail.data.club.state === "Suspended" ? "warning" : "success"}>
                {detail.data.club.state === "Suspended" ? t("discovery.suspended") : t("discovery.active")}
              </AppBadge>
            </div>
            <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-balance sm:text-5xl">{detail.data.club.name}</h1>
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
            </div>
          </header>

          <section>
            <h2 className="font-heading text-2xl font-bold">{t("discovery.board")}</h2>
            {detail.data.board.length === 0 ? (
              <div className="mt-4"><AppEmptyState message={t("discovery.noBoard")} /></div>
            ) : (
              <ul className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {detail.data.board.map((seat) => (
                  <li key={`${seat.termName}:${seat.positionName}:${seat.memberName}`} className="flex items-center gap-3">
                    <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-mint-soft-app font-heading font-bold text-mint-app">
                      {seat.memberName.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{seat.memberName}</span>
                      <span className="block text-sm text-muted-app">{seat.positionName} · {seat.termName}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-heading text-2xl font-bold">{t("discovery.recruitment")}</h2>
            {detail.data.campaigns.length === 0 ? (
              <div className="mt-4"><AppEmptyState message={t("discovery.noRecruitment")} /></div>
            ) : (
              <ul className="mt-4 divide-y divide-border-app border-y border-border-app">
                {detail.data.campaigns.map((campaign) => (
                  <li key={campaign.id} className="flex flex-wrap items-center justify-between gap-4 px-2 py-4">
                    <div className="min-w-0">
                    <h3 className="font-heading font-semibold">{campaign.title}</h3>
                    <p className="mt-1 text-sm text-muted-app">
                      {formatDate(campaign.windowStart, locale)} — {formatDate(campaign.windowEnd, locale)}
                    </p>
                    </div>
                    <Link to={auth.data
                      ? `/workspace/recruitment/${campaign.id}`
                      : `/login?returnTo=${encodeURIComponent(`/workspace/recruitment/${campaign.id}`)}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary-app px-5 text-sm font-semibold text-on-primary-app shadow-sm hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
                      {t("discovery.apply")}<AppIcon name="send" className="size-4" /></Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-heading text-2xl font-bold">{t("discovery.upcoming")}</h2>
            {detail.data.upcomingEvents.length === 0 ? (
              <div className="mt-4"><AppEmptyState message={t("discovery.noUpcoming")} /></div>
            ) : (
              <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {detail.data.upcomingEvents.map((event) => <PublicEventCard key={event.id} event={event} />)}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-heading text-2xl font-bold">{t("discovery.history")}</h2>
            {detail.data.history.length === 0 ? (
              <div className="mt-4"><AppEmptyState message={t("discovery.noHistory")} /></div>
            ) : (
              <ol className="mt-4 space-y-4 border-l-2 border-border-app pl-6">
                {detail.data.history.map((event) => (
                  <li key={event.id} className="relative">
                    <span aria-hidden="true" className="absolute top-1.5 -left-[1.95rem] size-3 rounded-full border-2 border-bg-app bg-primary-app" />
                    <h3 className="font-heading font-semibold">{event.title}</h3>
                    <p className="mt-0.5 text-sm text-muted-app">{formatDate(event.endAt, locale)}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      ) : <p className="mt-8">{t("discovery.notFound")}</p>}
    </section>
  );
}
