import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import type { PublicEvent, PublicEventStatus } from "@/services/discovery";

interface PublicEventCardProps {
  event: PublicEvent;
}

/** Cloudinary covers are requested at card size (2x for dense screens) in an automatic format. */
function coverUrl(url: string): string {
  const marker = "/image/upload/";
  if (!url.includes("res.cloudinary.com") || !url.includes(marker)) return url;
  return url.replace(marker, `${marker}c_fill,w_720,h_400,f_auto,q_auto/`);
}

/** PDP-style date range: "08/09/2026 - 19/09/2026" (a single date when the event fits in one day). */
export function eventDateRange(startAt: string, endAt: string): string {
  const format = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const start = format.format(new Date(startAt));
  const end = format.format(new Date(endAt));
  return start === end ? start : `${start} - ${end}`;
}

export function EventStatusBadge({ status }: { status: PublicEventStatus }) {
  const { t } = useTranslation();
  const tone: AppBadgeTone = status === "ongoing" ? "success" : status === "upcoming" ? "info" : "neutral";
  const label = status === "ongoing" ? t("discovery.statusOngoing")
    : status === "upcoming" ? t("discovery.statusUpcoming") : t("discovery.statusEnded");
  return <AppBadge tone={tone}>{label}</AppBadge>;
}

export function PublicEventCard({ event }: PublicEventCardProps) {
  const { t } = useTranslation();
  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative h-40 overflow-hidden rounded-xl bg-primary-soft-app">
        {event.coverImageUrl ? (
          <img src={coverUrl(event.coverImageUrl)} alt="" loading="lazy" decoding="async"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-110 group-hover:rotate-2" />
        ) : (
          <div aria-hidden="true" className="flex size-full flex-col items-center justify-center gap-2 text-primary-app">
            <AppIcon name="calendar" className="size-9" />
            <span className="px-4 text-center text-xs font-semibold tracking-wide uppercase">{event.clubName}</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <EventStatusBadge status={event.status} />
      </div>
      <h3 className="mt-3 line-clamp-2 min-h-12 font-heading text-lg leading-6 font-bold break-words text-text-app transition-colors group-hover:text-primary-app">
        {event.title}
      </h3>
      <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 break-words whitespace-pre-line text-muted-app">
        {event.objective || event.clubName}
      </p>
      <p className="mt-3 flex items-center gap-2 text-sm text-text-app">
        <AppIcon name="calendar" className="size-4 text-primary-app" />
        <span>{eventDateRange(event.startAt, event.endAt)}</span>
      </p>
      <p className="mt-1.5 flex min-h-10 items-start gap-2 text-sm text-text-app">
        <AppIcon name="mapPin" className="mt-0.5 size-4 text-primary-app" />
        <span className="line-clamp-2">{event.venueText || event.clubName}</span>
      </p>
      {/* The link covers the whole card (like PDP's stretched link) while its text stays the accessible name. */}
      <Link to={`/events/${event.id}`}
        className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-accent-app after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring-app">
        <span>{t("discovery.eventDetails")}</span>
        <span className="sr-only">: {event.title}</span>
        <AppIcon name="chevronRight" className="size-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </article>
  );
}
