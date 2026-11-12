import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { ClubLogo } from "@/components/custom/ClubLogo";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppIcon, type AppIconName } from "@/components/ui/icon/AppIcon";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubs, useEvents } from "@/hooks/useDiscovery";
import type { PublicClub, PublicEventStatus } from "@/services/discovery";
import { CAMPUS_IMAGE_URL } from "@/utils/campusImage";
import { cn } from "@/utils/cn";
import { formatDayBadge, formatEventWhen } from "@/utils/formatDate";

const audiences = [
  { icon: "graduationCap", title: "discovery.audienceStudentTitle", text: "discovery.audienceStudentText" },
  { icon: "building", title: "discovery.audienceClubTitle", text: "discovery.audienceClubText" },
  { icon: "shield", title: "discovery.audienceIcpdpTitle", text: "discovery.audienceIcpdpText" },
] as const satisfies ReadonlyArray<{ icon: AppIconName; title: string; text: string }>;

const steps = [
  { icon: "compass", title: "discovery.step1Title", text: "discovery.step1Text" },
  { icon: "send", title: "discovery.step2Title", text: "discovery.step2Text" },
  { icon: "ticket", title: "discovery.step3Title", text: "discovery.step3Text" },
  { icon: "star", title: "discovery.step4Title", text: "discovery.step4Text" },
] as const satisfies ReadonlyArray<{ icon: AppIconName; title: string; text: string }>;

const eventTabs = [
  { value: "ongoing", label: "discovery.statusOngoing" },
  { value: "upcoming", label: "discovery.statusUpcoming" },
  { value: "ended", label: "discovery.statusEnded" },
] as const satisfies ReadonlyArray<{ value: PublicEventStatus; label: string }>;

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app";
const moreLink = cn("group inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-text-app no-underline hover:text-primary-app", focusRing);

interface SectionHeadProps {
  kicker: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Landing page in an editorial style: a full-bleed campus hero under a transparent header, a sliding strip of
 * club logos, events as a featured story plus a list, then who the system serves and how to start.
 */
export function PublicHome() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<PublicEventStatus>("upcoming");
  const clubs = useClubs("", "", 1);
  const moreClubs = useClubs("", "", 2);
  const upcoming = useEvents(1);
  const events = useEvents(1, tab);
  const locale = i18n.language === "vi" ? "vi-VN" : "en-GB";
  const clubList = clubs.data?.items ?? [];
  // Two rows for the strip: the second page when there is one, otherwise the first row reversed.
  const secondRow = moreClubs.data?.items.length ? moreClubs.data.items : [...clubList].reverse();
  const eventList = events.data?.items.slice(0, 4) ?? [];
  const [featured, ...rest] = eventList;
  const nextEvent = upcoming.data?.items[0];
  const firstName = auth.data?.user.displayName.trim().split(/\s+/).at(-1) ?? "";

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    void navigate(query ? `/clubs?search=${encodeURIComponent(query)}` : "/clubs");
  }
  function dayParts(value: string) { return formatDayBadge(value, locale); }
  function when(value: string) { return formatEventWhen(value, locale); }
  function sectionHead({ kicker, title, description, action }: SectionHeadProps) {
    return (
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-primary-app uppercase">
            <span aria-hidden="true" className="h-px w-8 bg-primary-app" />{kicker}
          </p>
          <h2 className="mt-4 font-heading text-3xl leading-tight font-semibold tracking-tight text-balance text-text-app sm:text-4xl">{title}</h2>
          {description && <p className="mt-3 text-pretty text-muted-app">{description}</p>}
        </div>
        {action}
      </div>
    );
  }
  function logoRow(items: PublicClub[], reverse: boolean) {
    // The list is drawn twice so the -50% loop is seamless; the copy is hidden from assistive tech and focus.
    return (
      <div className="flex overflow-hidden mask-x-from-90% mask-x-to-100%">
        <ul className={cn("flex w-max shrink-0 animate-marquee gap-4 pr-4 hover:[animation-play-state:paused] motion-reduce:animate-none",
          { "[animation-direction:reverse]": reverse })}>
          {[...items, ...items].map((club, index) => {
            const copy = index >= items.length;
            return (
              <li key={`${club.id}-${index}`} aria-hidden={copy || undefined}>
                <Link to={`/clubs/${club.id}`} tabIndex={copy ? -1 : undefined}
                  className={cn("group flex w-64 items-center gap-3 rounded-2xl border border-border-app bg-bg-app p-3 no-underline shadow-xs transition-[border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-primary-app/50", focusRing)}>
                  <ClubLogo name={club.name} logoUrl={club.logoUrl} size={48} className="shrink-0 rounded-full ring-1 ring-border-app" />
                  <span className="min-w-0">
                    <span className="line-clamp-1 font-heading text-sm font-semibold text-text-app group-hover:text-primary-app">{club.name}</span>
                    <span className="line-clamp-1 text-xs text-muted-app">{club.field || club.code}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const stats = [
    { value: clubs.data?.total, label: t("discovery.activeClubs") },
    { value: upcoming.data?.total, label: t("discovery.upcomingCount") },
    { value: clubs.data?.fields.length, label: t("discovery.fieldsCount") },
  ];

  return (
    <div className="overflow-x-clip">
      {/* Hero: full-bleed campus photo, framed by hairlines; the header floats over it (PublicLayout). ---------- */}
      <section className="relative isolate flex min-h-[max(40rem,100dvh)] flex-col overflow-hidden bg-black text-white">
        {/* The photo (3:1) has a printed campus banner on its left ~40%. A box 173% as wide as the hero, anchored
            right, keeps that part off-screen at every aspect ratio while the building fills the frame. */}
        <img src={CAMPUS_IMAGE_URL} alt="" aria-hidden="true" fetchPriority="high"
          className="absolute inset-y-0 right-0 -z-20 h-full w-[173%] max-w-none origin-right animate-hero-settle object-cover object-right motion-reduce:animate-none" />
        {/* Darken the bottom-left where the copy sits, and the top where the header sits. */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-black/85 via-black/35 to-black/45" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-black/55 via-black/10 to-transparent" />

        {/* Copy sits a little above the vertical middle; the live numbers and next event share a bar at the bottom. */}
        <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-6 pt-36 pb-10 sm:px-12 md:pt-28 lg:px-16">
          <div className="max-w-3xl lg:-translate-y-[4vh]">
            <p className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium backdrop-blur-md">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-app" />
              {firstName ? t("discovery.heroGreeting", { name: firstName }) : t("discovery.heroEyebrow")}
              <span className="text-white/60">· {t("discovery.term")}</span>
            </p>
            <h1 className="mt-6 font-heading text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {t("discovery.heroTitleLead")}{" "}
              <span className="font-normal text-white/70">{t("discovery.heroTitleAccent")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-pretty text-white/80 sm:text-lg">{t("discovery.heroDescription")}</p>
            <form role="search" onSubmit={submitSearch}
              className="mt-8 flex w-full max-w-xl flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-black/45 p-2 shadow-2xl backdrop-blur-md">
              <label htmlFor="home-search" className="pl-2.5 text-white/60"><AppIcon name="search" className="size-5" /></label>
              <input id="home-search" type="search" aria-label={t("discovery.searchPlaceholder")} placeholder={t("discovery.homeSearchPlaceholder")}
                value={search} onChange={(event) => setSearch(event.target.value)}
                className="h-11 min-w-0 flex-1 basis-40 bg-transparent px-1 text-base text-white outline-none placeholder:text-white/50" />
              <button type="submit" className={cn("inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-neutral-900 transition-[background-color,scale] hover:bg-white/90 active:scale-[0.98]", focusRing)}>
                {t("discovery.searchAction")}<AppIcon name="chevronRight" className="size-4" />
              </button>
            </form>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium">
              <Link to="/clubs" className={cn("group inline-flex min-h-10 items-center gap-2 text-white no-underline", focusRing)}>
                <AppIcon name="compass" className="size-4.5" />{t("discovery.exploreClubs")}
                <AppIcon name="chevronRight" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link to="/events" className={cn("group inline-flex min-h-10 items-center gap-2 text-white/80 no-underline hover:text-white", focusRing)}>
                <AppIcon name="ticket" className="size-4.5" />{t("discovery.heroEventsCta")}
                <AppIcon name="chevronRight" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/15 bg-black/20 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-10 gap-y-5 px-6 py-6 sm:px-12 lg:px-16">
            <ul aria-label={t("discovery.statsLabel")} className="grid w-full grid-cols-3 gap-4 sm:flex sm:w-auto sm:flex-wrap sm:gap-x-10 sm:gap-y-3">
              {stats.map((stat) => (
                <li key={stat.label} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2.5">
                  <span className="font-heading text-3xl leading-none font-semibold tabular-nums">{stat.value ?? "—"}</span>
                  <span className="text-xs text-white/70 sm:text-sm">{stat.label}</span>
                </li>
              ))}
            </ul>
            {nextEvent ? (
              <Link to={`/events/${nextEvent.id}`}
                className={cn("group flex min-w-0 items-center gap-3 rounded-xl py-1 pr-1 text-white no-underline", focusRing)}>
                <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-white/10">
                  {nextEvent.coverImageUrl
                    ? <img src={nextEvent.coverImageUrl} alt="" className="size-full object-cover" />
                    : <span aria-hidden="true" className="flex size-full items-center justify-center"><AppIcon name="sparkles" className="size-5 text-white/80" /></span>}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-white/60">{t("discovery.featuredEvent")} · {when(nextEvent.startAt)}</span>
                  <span className="line-clamp-1 font-heading text-sm font-semibold group-hover:underline">{nextEvent.title}</span>
                </span>
                <AppIcon name="chevronRight" className="size-4 shrink-0 text-white/60 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : upcoming.isPending ? <AppSkeleton className="h-12 w-64 rounded-xl bg-white/10" /> : null}
          </div>
        </div>
      </section>

      {/* Sliding club strip: two rows drifting in opposite directions; hover pauses, reduced motion stops. -------- */}
      <section aria-labelledby="clubs-strip-title" className="border-b border-border-app bg-surface-app py-14 sm:py-16">
        <div className="reveal mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 sm:px-8">
          <div>
            <h2 id="clubs-strip-title" className="font-heading text-2xl font-semibold tracking-tight text-text-app sm:text-3xl">
              {clubs.data ? t("discovery.marqueeTitle", { count: clubs.data.total }) : t("discovery.logoWallTitle")}
            </h2>
            <p className="mt-2 text-sm text-muted-app">{t("discovery.logoWallText")}</p>
          </div>
          <Link to="/clubs" className={moreLink}>{t("discovery.viewDirectory")}
            <AppIcon name="chevronRight" className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>
        </div>
        {clubs.isPending ? (
          <div role="status" className="mx-auto mt-8 flex max-w-7xl gap-4 overflow-hidden px-4 sm:px-8">
            {[0, 1, 2, 3, 4].map((item) => <AppSkeleton key={item} className="h-18 w-64 shrink-0 rounded-2xl" />)}
          </div>
        ) : clubs.isError ? (
          <p role="alert" className="mx-auto mt-8 max-w-7xl px-4 text-sm text-danger-app sm:px-8">{t("discovery.loadError")}</p>
        ) : clubList.length ? (
          <div className="mt-8 space-y-4">
            {logoRow(clubList, false)}
            {logoRow(secondRow, true)}
          </div>
        ) : <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-8"><AppEmptyState variant="boxed" message={t("discovery.noClubs")} /></div>}
      </section>

      {/* Events: one featured story and a list beside it. ------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8 sm:py-24">
        <div className="reveal">
          {sectionHead({ kicker: t("discovery.eventsKicker"), title: t("discovery.eventsForYou"),
            action: <Link to="/events" className={moreLink}>{t("discovery.viewAllEvents")}
              <AppIcon name="chevronRight" className="size-4 transition-transform group-hover:translate-x-0.5" /></Link> })}
          <div role="tablist" aria-label={t("discovery.eventStatusLabel")} className="mt-8 inline-flex flex-wrap gap-1 rounded-full border border-border-app bg-surface-app p-1">
            {eventTabs.map((item) => (
              <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} onClick={() => setTab(item.value)}
                className={cn("min-h-10 rounded-full px-4 text-sm font-medium text-muted-app transition-colors hover:text-text-app", focusRing, {
                  "bg-segment-app text-text-app shadow-xs": tab === item.value,
                })}>
                {t(item.label)}
              </button>
            ))}
          </div>
        </div>
        {events.isPending ? (
          <div role="status" className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]"><AppSkeleton className="h-96 rounded-3xl" /><AppSkeleton className="h-96 rounded-3xl" /></div>
        ) : events.isError ? (
          <p role="alert" className="mt-8 text-sm text-danger-app">{t("discovery.loadError")}</p>
        ) : featured ? (
          <div role="tabpanel" className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Link to={`/events/${featured.id}`}
              className={cn("reveal group relative isolate flex min-h-96 flex-col justify-end overflow-hidden rounded-3xl bg-black p-6 text-white no-underline sm:p-8", focusRing)}>
              {featured.coverImageUrl
                ? <img src={featured.coverImageUrl} alt="" className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                : <span aria-hidden="true" className="absolute inset-0 -z-20 flex items-start justify-end bg-linear-to-br from-brand-app via-primary-app to-neutral-950 p-8 transition-transform duration-700 group-hover:scale-105">
                  <AppIcon name="sparkles" className="size-24 text-white/25" /></span>}
              <span aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-black/85 via-black/30 to-transparent" />
              <span className="absolute top-5 left-5 flex flex-col items-center rounded-xl bg-white px-3 py-1.5 text-neutral-900 shadow-md">
                <span className="font-heading text-xl leading-none font-semibold">{dayParts(featured.startAt).day}</span>
                <span className="text-xs font-semibold text-primary-app">{dayParts(featured.startAt).month}</span>
              </span>
              <span className="text-xs font-semibold tracking-[0.16em] text-white/70 uppercase">{featured.clubName}</span>
              <span className="mt-2 font-heading text-2xl leading-tight font-semibold text-balance sm:text-3xl">{featured.title}</span>
              <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/80">
                <span className="inline-flex items-center gap-1.5"><AppIcon name="calendar" className="size-4" />{when(featured.startAt)}</span>
                {featured.venueText && <span className="inline-flex min-w-0 items-center gap-1.5 break-words"><AppIcon name="mapPin" className="size-4 shrink-0" />{featured.venueText}</span>}
              </span>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
                {t("discovery.eventDetails")}<AppIcon name="chevronRight" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
            <ul className="flex flex-col divide-y divide-border-app rounded-3xl border border-border-app bg-bg-app">
              {rest.length ? rest.map((event) => {
                const parts = dayParts(event.startAt);
                return (
                  <li key={event.id} className="reveal">
                    <Link to={`/events/${event.id}`} className={cn("group flex items-start gap-4 p-5 no-underline transition-colors hover:bg-surface-app", focusRing)}>
                      <span className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-border-app py-2">
                        <span className="font-heading text-xl leading-none font-semibold text-text-app">{parts.day}</span>
                        <span className="mt-1 text-xs font-semibold text-primary-app">{parts.month}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium break-words text-muted-app">{event.clubName}</span>
                        <span className="mt-0.5 block font-heading leading-snug font-semibold break-words text-text-app group-hover:text-primary-app">{event.title}</span>
                        <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-app">
                          <span className="inline-flex items-center gap-1"><AppIcon name="calendar" className="size-3.5" />{when(event.startAt)}</span>
                          {event.venueText && <span className="inline-flex min-w-0 items-center gap-1 break-words"><AppIcon name="mapPin" className="size-3.5 shrink-0" />{event.venueText}</span>}
                        </span>
                      </span>
                      <AppIcon name="chevronRight" className="mt-1 size-4 shrink-0 text-muted-app transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                );
              }) : <li className="flex flex-1 items-center p-5"><AppEmptyState message={t("discovery.noEventsFound")} /></li>}
            </ul>
          </div>
        ) : <div role="tabpanel" className="mt-8"><AppEmptyState variant="boxed" icon="ticket" message={t("discovery.noEventsFound")} /></div>}
      </section>

      {/* Who it is for: large numbered columns. --------------------------------------------------------------- */}
      <section className="border-y border-border-app bg-surface-app">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8 sm:py-24">
          <div className="reveal">{sectionHead({ kicker: t("discovery.audienceKicker"), title: t("discovery.audienceTitle"), description: t("discovery.audienceText") })}</div>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-border-app bg-border-app md:grid-cols-3">
            {audiences.map((item, index) => (
              <li key={item.title} className="reveal group flex flex-col gap-4 bg-bg-app p-7 transition-colors hover:bg-primary-soft-app/40">
                <span className="flex items-center justify-between">
                  <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-xl border border-border-app text-brand-app">
                    <AppIcon name={item.icon} className="size-5" />
                  </span>
                  <span aria-hidden="true" className="font-heading text-3xl font-semibold text-muted-app/30 tabular-nums">0{index + 1}</span>
                </span>
                <h3 className="font-heading text-xl font-semibold text-text-app">{t(item.title)}</h3>
                <p className="text-pretty text-muted-app">{t(item.text)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How to start: a numbered path joined by a line. ---------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8 sm:py-24">
        <div className="reveal">{sectionHead({ kicker: t("discovery.journeyKicker"), title: t("discovery.journeyTitle") })}</div>
        <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <span aria-hidden="true" className="absolute top-5 right-[12%] left-[12%] hidden h-px bg-linear-to-r from-transparent via-border-app to-transparent lg:block" />
          {steps.map((step, index) => (
            <li key={step.title} className="reveal relative flex flex-col items-start gap-3 lg:items-center lg:text-center">
              <span className="relative flex size-10 items-center justify-center rounded-full border border-border-app bg-bg-app font-heading text-sm font-semibold text-text-app shadow-xs">
                {index + 1}
              </span>
              <span aria-hidden="true" className="flex items-center gap-2 text-brand-app"><AppIcon name={step.icon} className="size-5" /></span>
              <h3 className="font-heading text-lg font-semibold text-text-app">{t(step.title)}</h3>
              <p className="max-w-64 text-sm text-pretty text-muted-app">{t(step.text)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Call to action on the campus photo. ------------------------------------------------------------------- */}
      <section className="px-4 pb-20 sm:px-8 sm:pb-24">
        <div className="reveal relative isolate mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-black px-6 py-14 text-white sm:px-12 sm:py-20">
          {/* Anchored right: the photo carries a printed campus banner on its left half that would clash with the copy. */}
          <img src={CAMPUS_IMAGE_URL} alt="" aria-hidden="true" className="absolute inset-y-0 right-0 -z-20 h-full w-[173%] max-w-none object-cover object-right" />
          <span aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-black/90 via-black/70 to-black/30" />
          <div className="grid items-end gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="font-heading text-3xl leading-tight font-semibold text-balance sm:text-4xl">{t("discovery.ctaTitle")}</h2>
              <p className="mt-3 max-w-xl text-pretty text-white/80">{t("discovery.ctaText")}</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link to="/workspace/applications" className={cn("inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-neutral-900 no-underline transition-[background-color,scale] hover:bg-white/90 active:scale-[0.98]", focusRing)}>
                <AppIcon name="plus" className="size-4.5" />{t("discovery.ctaFound")}
              </Link>
              <Link to="/workspace" className={cn("inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white no-underline backdrop-blur-md transition-colors hover:bg-white/20", focusRing)}>
                <AppIcon name="briefcase" className="size-4.5" />{t("common.myWorkspace")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
