import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { ClubLogo } from "@/components/custom/ClubLogo";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useClubs, useEvents } from "@/hooks/useDiscovery";
import { cn } from "@/utils/cn";
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

  function dayParts(value: string) {
    const date = new Date(value);
    return {
      day: new Intl.DateTimeFormat(locale, { day: "2-digit" }).format(date),
      month: new Intl.DateTimeFormat(locale, { month: "short" }).format(date),
    };
  }

  return (
    <div className="-mx-4 -mt-8 sm:-mx-8 sm:-mt-12">
      <section className="relative overflow-hidden">
        <span aria-hidden="true" className="pointer-events-none absolute top-20 right-20 size-96 rounded-full bg-auth-orb-large-app opacity-60 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-20 left-20 size-56 rounded-full bg-auth-orb-small-app opacity-40 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:py-20">
          <div className="flex min-w-0 flex-col items-start gap-6">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-bg-app/80 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur">
              <span aria-hidden="true" className="size-2 rounded-full bg-success-app" />
              <span>{t("discovery.term")}</span>
              <span className="text-muted-app">· {clubs.data?.total ?? "—"} {t("discovery.activeClubs")}</span>
              <span className="text-muted-app">· {events.data?.total ?? "—"} {t("discovery.upcomingCount")}</span>
            </span>
            <div>
              <h1 className="max-w-2xl font-heading text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                {t("discovery.heroTitle")}
              </h1>
              <p className="mt-5 max-w-xl text-lg text-pretty text-muted-app sm:text-xl">{t("discovery.heroDescription")}</p>
            </div>
            <form role="search" onSubmit={submitSearch} className="flex w-full max-w-xl flex-wrap items-center gap-2 rounded-3xl border border-border-app bg-bg-app p-2 shadow-lg sm:rounded-full">
              <label htmlFor="home-search" className="pl-3 text-muted-app"><SearchIcon /></label>
              <input
                id="home-search"
                type="search"
                aria-label={t("discovery.searchPlaceholder")}
                placeholder={t("discovery.homeSearchPlaceholder")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 min-w-0 flex-1 basis-48 bg-transparent px-1 text-base outline-none placeholder:text-muted-app"
              />
              <AppButton type="submit" className="min-h-11 px-6">{t("discovery.searchAction")}</AppButton>
            </form>
            {clubs.data?.fields.length ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-sm text-muted-app">{t("discovery.popularFields")}</span>
                {clubs.data.fields.slice(0, 4).map((field) => (
                  <Link key={field} to={`/clubs?field=${encodeURIComponent(field)}`} className="inline-flex min-h-10 items-center rounded-full bg-bg-app/80 px-4 text-sm font-medium shadow-sm transition-colors hover:bg-primary-soft-app hover:text-primary-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
                    {field}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative min-w-0 pb-10">
            <div aria-label={t("discovery.heroImagePlaceholder")} role="img" className="relative flex h-72 items-center justify-center overflow-hidden rounded-[2.5rem] bg-primary-soft-app sm:h-96 lg:h-[440px]">
              <span aria-hidden="true" className="absolute top-10 left-10 size-40 rounded-full bg-brand-blue-app opacity-30 blur-2xl" />
              <span aria-hidden="true" className="absolute right-8 bottom-8 size-48 rounded-full bg-brand-green-app opacity-30 blur-2xl" />
              <div aria-hidden="true" className="relative grid grid-cols-3 gap-3 sm:gap-4">
                {(["users", "megaphone", "calendar", "sparkles", "compass", "badge"] as const).map((icon, index) => (
                  <span key={icon} className={cn("flex size-16 items-center justify-center rounded-2xl bg-bg-app text-primary-app shadow-md sm:size-20", {
                    "translate-y-4": index % 3 === 1,
                    "text-mint-app": index % 2 === 1,
                  })}>
                    <AppIcon name={icon} className="size-7 sm:size-8" />
                  </span>
                ))}
              </div>
            </div>
            {upcomingEvents[0] && (
              <Link to={`/events/${upcomingEvents[0].id}`} className="absolute bottom-0 left-3 flex w-[min(300px,85%)] flex-col gap-1.5 rounded-2xl border border-border-app bg-bg-app p-4 text-text-app shadow-xl transition-colors hover:border-primary-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app sm:left-0">
                <span className="text-xs font-semibold tracking-wide text-primary-app uppercase">{t("discovery.featuredEvent")}</span>
                <strong className="line-clamp-2 text-lg leading-snug">{upcomingEvents[0].title}</strong>
                <span className="text-sm text-muted-app">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(upcomingEvents[0].startAt))}</span>
              </Link>
            )}
            <Link to="/clubs" className="absolute top-4 right-2 flex min-h-11 flex-wrap items-center gap-2 rounded-full bg-bg-app px-4 text-sm font-semibold text-text-app shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app sm:right-4">
              <span aria-hidden="true" className="size-2 rounded-full bg-success-app" />
              {t("discovery.openRecruitment")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-8 sm:pt-14">
        <p className="text-xs font-semibold tracking-widest text-primary-app uppercase">{t("discovery.directoryEyebrow")}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">{t("discovery.clubsTitle")}</h2>
          <Link to="/clubs" className="inline-flex min-h-10 items-center gap-1 rounded-full text-sm font-semibold text-accent-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
            {t("discovery.viewDirectory")}<AppIcon name="chevronRight" className="size-4" /></Link>
        </div>
        {clubs.isPending ? (
          <div role="status" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><AppSkeleton className="h-36" /><AppSkeleton className="h-36" /><AppSkeleton className="h-36" /></div>
        ) : clubs.isError ? (
          <p role="alert" className="mt-6 text-sm text-danger-app">{t("discovery.loadError")}</p>
        ) : featuredClubs.length ? (
          <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {featuredClubs.map((club) => (
              <li key={club.id}>
                <Link to={`/clubs/${club.id}`} className="group flex h-full gap-4 rounded-2xl p-4 transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
                  <ClubLogo name={club.name} logoUrl={club.logoUrl} />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-xs font-semibold tracking-wide text-mint-app uppercase">{club.field}</span>
                    <span className="font-heading text-lg font-bold text-text-app group-hover:text-primary-app">{club.name}</span>
                    <span className="line-clamp-2 text-sm text-muted-app">{club.description || club.code}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="mt-6 text-sm text-muted-app">{t("discovery.noClubs")}</p>}
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-8 sm:pt-16 sm:pb-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary-app uppercase">{t("discovery.eventsEyebrow")}</p>
            <h2 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">{t("discovery.eventsTitle")}</h2>
          </div>
          <Link to="/events" className="inline-flex min-h-10 items-center gap-1 rounded-full text-sm font-semibold text-accent-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
            {t("discovery.viewAllEvents")}<AppIcon name="chevronRight" className="size-4" /></Link>
        </div>
        {events.isPending ? (
          <div role="status" className="mt-6 space-y-2"><AppSkeleton className="h-20" /><AppSkeleton className="h-20" /><AppSkeleton className="h-20" /></div>
        ) : events.isError ? (
          <p role="alert" className="mt-6 text-sm text-danger-app">{t("discovery.loadError")}</p>
        ) : upcomingEvents.length ? (
          <ul className="mt-6 divide-y divide-border-app border-y border-border-app">
            {upcomingEvents.map((event) => {
              const parts = dayParts(event.startAt);
              return (
                <li key={event.id}>
                  <Link to={`/events/${event.id}`} className="group flex items-center gap-4 px-2 py-4 transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app sm:gap-6">
                    <span aria-hidden="true" className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-mint-soft-app text-mint-app">
                      <span className="font-heading text-2xl leading-none font-bold">{parts.day}</span>
                      <span className="mt-1 text-xs font-semibold uppercase">{parts.month}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold tracking-wide text-primary-app uppercase">{event.clubName}</span>
                      <span className="mt-0.5 block font-heading text-lg font-bold text-text-app group-hover:text-primary-app">{event.title}</span>
                      <span className="mt-0.5 block text-sm text-muted-app">
                        {formatDate(event.startAt, i18n.language === "vi" ? "vi" : "en")}{event.venueText && ` · ${event.venueText}`}
                      </span>
                    </span>
                    <AppIcon name="chevronRight" className="hidden size-5 text-muted-app sm:block" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : <p className="mt-6 text-sm text-muted-app">{t("discovery.noEvents")}</p>}
      </section>
    </div>
  );
}
