import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { ClubLogo } from "@/components/custom/ClubLogo";
import { AppIcon, type AppIconName } from "@/components/ui/icon/AppIcon";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubs, useEvents } from "@/hooks/useDiscovery";
import type { PublicEventStatus } from "@/services/discovery";
import { cn } from "@/utils/cn";

const audiences = [
  { icon: "graduationCap", title: "discovery.audienceStudentTitle", text: "discovery.audienceStudentText" },
  { icon: "users", title: "discovery.audienceClubTitle", text: "discovery.audienceClubText" },
  { icon: "shield", title: "discovery.audienceIcpdpTitle", text: "discovery.audienceIcpdpText" },
] as const satisfies ReadonlyArray<{ icon: AppIconName; title: string; text: string }>;

const steps = [
  { icon: "compass", title: "discovery.step1Title", text: "discovery.step1Text" },
  { icon: "send", title: "discovery.step2Title", text: "discovery.step2Text" },
  { icon: "calendar", title: "discovery.step3Title", text: "discovery.step3Text" },
  { icon: "star", title: "discovery.step4Title", text: "discovery.step4Text" },
] as const satisfies ReadonlyArray<{ icon: AppIconName; title: string; text: string }>;

const eventTabs = [
  { value: "ongoing", label: "discovery.statusOngoing" },
  { value: "upcoming", label: "discovery.statusUpcoming" },
  { value: "ended", label: "discovery.statusEnded" },
] as const satisfies ReadonlyArray<{ value: PublicEventStatus; label: string }>;

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app";
const moreLink = "inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary-app no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app";

interface SectionTitleProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Landing page modelled on pdp.fpt.edu.vn: brand hero, club logos, events by status, and who the system serves. */
export function PublicHome() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<PublicEventStatus>("upcoming");
  const clubs = useClubs("", "", 1);
  const upcoming = useEvents(1);
  const events = useEvents(1, tab);
  const locale = i18n.language === "vi" ? "vi-VN" : "en-GB";
  const clubList = clubs.data?.items ?? [];
  const eventList = events.data?.items.slice(0, 3) ?? [];
  const nextEvent = upcoming.data?.items[0];
  const firstName = auth.data?.user.displayName.trim().split(/\s+/).at(-1) ?? "";

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    void navigate(query ? `/clubs?search=${encodeURIComponent(query)}` : "/clubs");
  }
  function dayParts(value: string) {
    const date = new Date(value);
    return {
      day: new Intl.DateTimeFormat(locale, { day: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(date),
      month: new Intl.DateTimeFormat(locale, { month: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(date),
    };
  }
  function when(value: string) {
    return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
  }
  // A section heading with the short orange underline used across the PDP site.
  function sectionTitle({ title, description, action }: SectionTitleProps) {
    return (
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-text-app uppercase sm:text-3xl">{title}</h2>
          <span aria-hidden="true" className="mt-3 block h-1 w-14 rounded-full bg-primary-app" />
          {description && <p className="mt-4 text-pretty text-muted-app">{description}</p>}
        </div>
        {action}
      </div>
    );
  }

  const stats = [
    { value: clubs.data?.total, label: t("discovery.activeClubs"), icon: "users" as const },
    { value: upcoming.data?.total, label: t("discovery.upcomingCount"), icon: "calendar" as const },
    { value: clubs.data?.fields.length, label: t("discovery.fieldsCount"), icon: "layers" as const },
  ];

  return (
    <div>
      {/* Hero banner ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-hero-app text-on-hero-app">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-24 sm:px-8 sm:pt-20 sm:pb-28 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex min-w-0 flex-col items-start gap-7">
            <span className="inline-flex flex-wrap items-center gap-2 rounded-full bg-on-hero-app/10 px-4 py-2 text-sm font-medium ring-1 ring-on-hero-app/40">
              <span aria-hidden="true" className="size-2 rounded-full bg-primary-app" />
              {firstName ? t("discovery.heroGreeting", { name: firstName }) : t("discovery.heroEyebrow")}
              <span className="opacity-70">· {t("discovery.term")}</span>
            </span>
            <div className="space-y-5">
              <h1 className="max-w-2xl font-heading text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">
                {t("discovery.heroTitle")}
              </h1>
              <p className="max-w-xl text-lg font-medium text-pretty text-on-hero-app">{t("discovery.heroDescription")}</p>
            </div>
            <form role="search" onSubmit={submitSearch} className="flex w-full max-w-xl flex-wrap items-center gap-2 rounded-3xl bg-bg-app p-2 shadow-xl sm:rounded-full">
              <label htmlFor="home-search" className="pl-3 text-muted-app"><AppIcon name="search" className="size-5" /></label>
              <input id="home-search" type="search" aria-label={t("discovery.searchPlaceholder")} placeholder={t("discovery.homeSearchPlaceholder")}
                value={search} onChange={(event) => setSearch(event.target.value)}
                className="h-11 min-w-0 flex-1 basis-48 bg-transparent px-1 text-base text-text-app outline-none placeholder:text-muted-app" />
              <button type="submit" className={cn("inline-flex min-h-11 items-center rounded-full bg-primary-app px-6 text-sm font-semibold text-on-primary-app transition-opacity hover:opacity-90", focusRing)}>
                {t("discovery.searchAction")}
              </button>
            </form>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/clubs" className={cn("inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-app px-5 text-sm font-semibold text-on-primary-app no-underline shadow-sm transition-opacity hover:opacity-90", focusRing)}>
                <AppIcon name="compass" className="size-4.5" />{t("discovery.exploreClubs")}
              </Link>
              <Link to="/events" className={cn("inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-on-hero-app no-underline ring-2 ring-on-hero-app/70 transition-colors hover:bg-on-hero-app/10", focusRing)}>
                <AppIcon name="calendar" className="size-4.5" />{t("discovery.heroEventsCta")}
              </Link>
            </div>
          </div>

          {/* Featured event and the clubs on the platform */}
          <div className="min-w-0 space-y-4">
            {nextEvent ? (
              <Link to={`/events/${nextEvent.id}`} className={cn("group block overflow-hidden rounded-3xl bg-bg-app text-text-app no-underline shadow-2xl", focusRing)}>
                <div className="relative h-48 overflow-hidden bg-primary-soft-app sm:h-56">
                  {nextEvent.coverImageUrl
                    ? <img src={nextEvent.coverImageUrl} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    : <span aria-hidden="true" className="flex size-full items-center justify-center bg-primary-soft-app text-primary-app"><AppIcon name="sparkles" className="size-14 opacity-80" /></span>}
                  <span className="absolute top-4 left-4 rounded-full bg-primary-app px-3 py-1 text-xs font-bold tracking-wide text-on-primary-app uppercase">{t("discovery.featuredEvent")}</span>
                </div>
                <div className="space-y-1.5 p-5">
                  <span className="block text-xs font-semibold tracking-wide break-words text-primary-app uppercase">{nextEvent.clubName}</span>
                  <span className="block font-heading text-xl leading-snug font-bold break-words group-hover:text-primary-app">{nextEvent.title}</span>
                  <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-app">
                    <span className="inline-flex items-center gap-1"><AppIcon name="calendar" className="size-4" />{when(nextEvent.startAt)}</span>
                    {nextEvent.venueText && <span className="inline-flex items-center gap-1 break-words"><AppIcon name="mapPin" className="size-4 shrink-0" />{nextEvent.venueText}</span>}
                  </span>
                </div>
              </Link>
            ) : upcoming.isPending ? <AppSkeleton className="h-80 rounded-3xl" /> : null}
          </div>
        </div>
      </section>

      {/* Stats overlapping the banner ------------------------------------------------------ */}
      <div className="relative mx-auto -mt-12 max-w-7xl px-4 sm:px-8">
        <ul className="grid gap-3 rounded-3xl border border-border-app bg-bg-app p-3 shadow-xl sm:grid-cols-3">
          {stats.map((stat) => (
            <li key={stat.label} className="flex items-center gap-4 rounded-2xl p-4">
              <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft-app text-primary-app">
                <AppIcon name={stat.icon} className="size-6" />
              </span>
              <span className="min-w-0">
                <span className="block font-heading text-3xl leading-none font-extrabold text-text-app">{stat.value ?? "—"}</span>
                <span className="mt-1 block text-sm text-muted-app">{stat.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Club logos ------------------------------------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-8 sm:pt-20">
        {sectionTitle({ title: t("discovery.logoWallTitle"), description: t("discovery.logoWallText"),
          action: <Link to="/clubs" className={moreLink}>{t("discovery.viewDirectory")}<AppIcon name="chevronRight" className="size-4" /></Link> })}
        {clubs.isPending ? (
          <div role="status" className="mt-8 flex flex-wrap gap-6">{[0, 1, 2, 3, 4, 5].map((item) => <AppSkeleton key={item} className="size-20 rounded-full" />)}</div>
        ) : clubs.isError ? (
          <p role="alert" className="mt-8 text-sm text-danger-app">{t("discovery.loadError")}</p>
        ) : (
          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-6 sm:justify-start">
            {(clubList.length > 6 ? clubList.slice(6, 18) : clubList).map((club) => (
              <li key={club.id} className="w-24">
                <Link to={`/clubs/${club.id}`} title={club.name} className={cn("group flex flex-col items-center gap-2 rounded-2xl text-center no-underline", focusRing)}>
                  <span className="rounded-full p-1 ring-2 ring-border-app transition-colors group-hover:ring-primary-app">
                    <ClubLogo name={club.name} logoUrl={club.logoUrl} size={72} className="rounded-full" />
                  </span>
                  <span className="line-clamp-2 text-xs font-semibold break-words text-text-app group-hover:text-primary-app">{club.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Featured clubs --------------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-8 sm:pt-20">
        {sectionTitle({ title: t("discovery.clubsTitle"),
          action: <Link to="/clubs" className={moreLink}>{t("discovery.viewDirectory")}<AppIcon name="chevronRight" className="size-4" /></Link> })}
        {clubs.isPending ? (
          <div role="status" className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-48 rounded-3xl" />)}</div>
        ) : clubs.isError ? null : clubList.length ? (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {clubList.slice(0, 6).map((club) => (
              <li key={club.id}>
                <Link to={`/clubs/${club.id}`} className={cn("group flex h-full flex-col gap-4 rounded-3xl border border-border-app bg-bg-app p-6 no-underline transition-all hover:-translate-y-1 hover:border-primary-app hover:shadow-xl", focusRing)}>
                  <div className="flex items-start gap-4">
                    <ClubLogo name={club.name} logoUrl={club.logoUrl} size={64} />
                    <span className="min-w-0 flex-1">
                      <span className="inline-flex rounded-full bg-primary-soft-app px-2.5 py-0.5 text-xs font-semibold text-primary-app">{club.field}</span>
                      <span className="mt-1.5 block font-heading text-lg leading-snug font-bold break-words text-text-app group-hover:text-primary-app">{club.name}</span>
                    </span>
                  </div>
                  <p className="line-clamp-3 flex-1 text-sm text-muted-app">{club.description || club.code}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-app">
                    {t("discovery.clubCardCta")}<AppIcon name="chevronRight" className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="mt-8 text-sm text-muted-app">{t("discovery.noClubs")}</p>}
      </section>

      {/* Events by status --------------------------------------------------------------------- */}
      <section className="mt-16 bg-surface-app py-16 sm:mt-20 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          {sectionTitle({ title: t("discovery.eventsForYou"),
            action: <Link to="/events" className={moreLink}>{t("discovery.viewAllEvents")}<AppIcon name="chevronRight" className="size-4" /></Link> })}
          <div role="tablist" aria-label={t("discovery.eventStatusLabel")} className="mt-8 inline-flex flex-wrap gap-1 rounded-full border border-border-app bg-bg-app p-1">
            {eventTabs.map((item) => (
              <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} onClick={() => setTab(item.value)}
                className={cn("min-h-10 rounded-full px-4 text-sm font-semibold text-muted-app transition-colors hover:text-text-app", focusRing, {
                  "bg-primary-app text-on-primary-app hover:text-on-primary-app": tab === item.value,
                })}>
                {t(item.label)}
              </button>
            ))}
          </div>
          {events.isPending ? (
            <div role="status" className="mt-8 grid gap-5 md:grid-cols-3">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-80 rounded-3xl" />)}</div>
          ) : events.isError ? (
            <p role="alert" className="mt-8 text-sm text-danger-app">{t("discovery.loadError")}</p>
          ) : eventList.length ? (
            <ul role="tabpanel" className="mt-8 grid gap-5 md:grid-cols-3">
              {eventList.map((event) => {
                const parts = dayParts(event.startAt);
                return (
                  <li key={event.id}>
                    <Link to={`/events/${event.id}`} className={cn("group flex h-full flex-col overflow-hidden rounded-3xl border border-border-app bg-bg-app no-underline transition-all hover:-translate-y-1 hover:shadow-xl", focusRing)}>
                      <div className="relative h-44 overflow-hidden bg-primary-soft-app">
                        {event.coverImageUrl
                          ? <img src={event.coverImageUrl} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          : <span aria-hidden="true" className="flex size-full items-center justify-center bg-primary-soft-app text-primary-app"><AppIcon name="calendar" className="size-10 opacity-80" /></span>}
                        <span className="absolute top-3 left-3 flex flex-col items-center rounded-xl bg-bg-app px-3 py-1.5 text-text-app shadow-md">
                          <span className="font-heading text-xl leading-none font-bold">{parts.day}</span>
                          <span className="text-xs font-semibold text-primary-app uppercase">{parts.month}</span>
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5 p-5">
                        <span className="text-xs font-semibold tracking-wide break-words text-primary-app uppercase">{event.clubName}</span>
                        <span className="font-heading text-lg leading-snug font-bold break-words text-text-app group-hover:text-primary-app">{event.title}</span>
                        <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-sm text-muted-app">
                          <span className="inline-flex items-center gap-1"><AppIcon name="calendar" className="size-4" />{when(event.startAt)}</span>
                          {event.venueText && <span className="inline-flex min-w-0 items-center gap-1 break-words"><AppIcon name="mapPin" className="size-4 shrink-0" />{event.venueText}</span>}
                        </span>
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-app">
                          {t("discovery.eventDetails")}<AppIcon name="chevronRight" className="size-4" />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : <p role="tabpanel" className="mt-8 rounded-3xl border border-dashed border-border-app bg-bg-app p-8 text-center text-sm text-muted-app">{t("discovery.noEventsFound")}</p>}
        </div>
      </section>

      {/* Who it is for --------------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-8 sm:pt-20">
        {sectionTitle({ title: t("discovery.audienceTitle"), description: t("discovery.audienceText") })}
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {audiences.map((item) => (
            <li key={item.title} className="flex flex-col gap-3 rounded-3xl border border-border-app bg-bg-app p-6 transition-colors hover:border-primary-app">
              <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft-app text-primary-app">
                <AppIcon name={item.icon} className="size-6" />
              </span>
              <h3 className="font-heading text-xl font-bold">{t(item.title)}</h3>
              <p className="text-pretty text-muted-app">{t(item.text)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How to start ----------------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-8 sm:pt-20">
        {sectionTitle({ title: t("discovery.journeyTitle") })}
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="relative flex flex-col gap-3 overflow-hidden rounded-3xl bg-surface-app p-6">
              <span aria-hidden="true" className="absolute -top-3 -right-1 font-heading text-7xl font-extrabold text-primary-app opacity-15">{index + 1}</span>
              <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-2xl bg-primary-app text-on-primary-app shadow-sm">
                <AppIcon name={step.icon} className="size-5" />
              </span>
              <h3 className="font-heading text-lg font-bold">{t(step.title)}</h3>
              <p className="text-sm text-pretty text-muted-app">{t(step.text)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Call to action --------------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-8 sm:pt-20 sm:pb-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-hero-app px-6 py-10 text-on-hero-app sm:px-12 sm:py-14">
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-3">
              <h2 className="font-heading text-2xl font-bold text-balance sm:text-3xl">{t("discovery.ctaTitle")}</h2>
              <p className="max-w-xl font-medium text-pretty text-on-hero-app">{t("discovery.ctaText")}</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link to="/workspace/applications" className={cn("inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-app px-5 text-sm font-semibold text-on-primary-app no-underline shadow-sm transition-opacity hover:opacity-90", focusRing)}>
                <AppIcon name="plus" className="size-4.5" />{t("discovery.ctaFound")}
              </Link>
              <Link to="/workspace" className={cn("inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-on-hero-app no-underline ring-2 ring-on-hero-app/70 transition-colors hover:bg-on-hero-app/10", focusRing)}>
                <AppIcon name="briefcase" className="size-4.5" />{t("common.myWorkspace")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
