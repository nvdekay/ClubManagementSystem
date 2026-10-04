import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useClubs, useEvents } from "@/hooks/useDiscovery";
import { formatDate } from "@/utils/formatDate";

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function PublicHome() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const clubs = useClubs("", "", 1);
  const events = useEvents(1);
  const locale = i18n.language === "vi" ? "vi-VN" : "en-US";
  const featuredClubs = clubs.data?.items.slice(0, 3) ?? [];
  const upcomingEvents = events.data?.items.slice(0, 3) ?? [];

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    void navigate(query ? `/clubs?search=${encodeURIComponent(query)}` : "/clubs");
  }

  return (
    <div className="-mx-4 -mt-8 sm:-mx-8 sm:-mt-12">
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20">
        <div className="flex min-w-0 flex-col items-start gap-5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border-app bg-bg-app px-3 py-2 text-sm font-medium">
            <span aria-hidden="true" className="size-2 rounded-full bg-success-app" />
            <span>{t("discovery.term")}</span>
            <span className="text-muted-app">· {clubs.data?.total ?? "—"} {t("discovery.activeClubs")}</span>
            <span className="text-muted-app">· {events.data?.total ?? "—"} {t("discovery.upcomingCount")}</span>
          </span>
          <div>
            <h1 className="max-w-2xl font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {t("discovery.heroTitle")}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-app sm:text-xl">{t("discovery.heroDescription")}</p>
          </div>
          <form role="search" onSubmit={submitSearch} className="flex w-full max-w-xl flex-wrap items-center gap-2 rounded-lg border border-border-app bg-bg-app p-2 shadow-md">
            <label htmlFor="home-search" className="pl-2 text-muted-app"><SearchIcon /></label>
            <input
              id="home-search"
              type="search"
              aria-label={t("discovery.searchPlaceholder")}
              placeholder={t("discovery.homeSearchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 min-w-0 flex-1 basis-48 bg-transparent px-1 text-base outline-none placeholder:text-muted-app"
            />
            <AppButton type="submit" className="min-h-11 px-5">{t("discovery.searchAction")}</AppButton>
          </form>
          {clubs.data?.fields.length ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm text-muted-app">{t("discovery.popularFields")}</span>
              {clubs.data.fields.slice(0, 4).map((field) => (
                <Link key={field} to={`/clubs?field=${encodeURIComponent(field)}`} className="rounded-full border border-border-app bg-bg-app px-3 py-2 text-sm transition-colors hover:border-primary-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
                  {field}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative min-w-0 pb-8 lg:pl-2">
          <div aria-label={t("discovery.heroImagePlaceholder")} className="flex h-72 items-center justify-center overflow-hidden rounded-lg border border-border-app bg-surface-app p-8 text-center text-muted-app sm:h-96 lg:h-[440px]">
            <div className="max-w-xs">
              <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-bg-app text-2xl font-normal text-primary-app">F</span>
              <p className="text-sm">{t("discovery.heroImagePlaceholder")}</p>
            </div>
          </div>
          {upcomingEvents[0] && (
            <Link to={`/events/${upcomingEvents[0].id}`} className="absolute bottom-0 left-3 flex w-[min(300px,85%)] flex-col gap-2 rounded-lg border border-border-app bg-bg-app p-4 text-text-app shadow-lg transition-colors hover:border-primary-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app sm:left-0">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary-app">{t("discovery.featuredEvent")}</span>
              <strong className="text-lg leading-snug">{upcomingEvents[0].title}</strong>
              <span className="text-sm text-muted-app">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(upcomingEvents[0].startAt))}</span>
            </Link>
          )}
          <Link to="/clubs" className="absolute right-2 top-4 flex flex-wrap items-center gap-2 rounded-full border border-border-app bg-bg-app px-4 py-3 text-sm font-medium text-text-app shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app sm:right-4">
            <span aria-hidden="true" className="size-2 rounded-full bg-primary-app" />
            {t("discovery.openRecruitment")}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-8 sm:pt-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-app">{t("discovery.directoryEyebrow")}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">{t("discovery.clubsTitle")}</h2>
          <Link to="/clubs" className="rounded text-sm font-semibold text-accent-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">{t("discovery.viewDirectory")} →</Link>
        </div>
        {clubs.isPending ? (
          <div role="status" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><AppSkeleton className="h-36" /><AppSkeleton className="h-36" /><AppSkeleton className="h-36" /></div>
        ) : clubs.isError ? (
          <p role="alert" className="mt-6 text-sm text-danger-app">{t("discovery.loadError")}</p>
        ) : featuredClubs.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredClubs.map((club) => (
              <Link key={club.id} to={`/clubs/${club.id}`} className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
                <AppCard className="h-full gap-3 p-6 transition-colors hover:border-primary-app">
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary-app">{club.field}</span>
                  <h3 className="font-heading text-xl font-bold">{club.name}</h3>
                  <p className="line-clamp-2 text-sm text-muted-app">{club.description || club.code}</p>
                  <span className="mt-auto text-sm font-semibold text-accent-app">{t("discovery.viewClub")} →</span>
                </AppCard>
              </Link>
            ))}
          </div>
        ) : <p className="mt-6 text-sm text-muted-app">{t("discovery.noClubs")}</p>}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-app">{t("discovery.eventsEyebrow")}</p>
            <h2 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">{t("discovery.eventsTitle")}</h2>
          </div>
          <Link to="/events" className="rounded text-sm font-semibold text-accent-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">{t("discovery.viewAllEvents")} →</Link>
        </div>
        {events.isPending ? (
          <div role="status" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><AppSkeleton className="h-36" /><AppSkeleton className="h-36" /><AppSkeleton className="h-36" /></div>
        ) : events.isError ? (
          <p role="alert" className="mt-6 text-sm text-danger-app">{t("discovery.loadError")}</p>
        ) : upcomingEvents.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <Link key={event.id} to={`/events/${event.id}`} className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
                <AppCard className="h-full gap-3 p-6 transition-colors hover:border-primary-app">
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary-app">{event.clubName}</span>
                  <h3 className="font-heading text-xl font-bold">{event.title}</h3>
                  <p className="text-sm text-muted-app">{formatDate(event.startAt, i18n.language === "vi" ? "vi" : "en")}</p>
                  {event.venueText && <p className="text-sm text-muted-app">{event.venueText}</p>}
                </AppCard>
              </Link>
            ))}
          </div>
        ) : <p className="mt-6 text-sm text-muted-app">{t("discovery.noEvents")}</p>}
      </section>
    </div>
  );
}
