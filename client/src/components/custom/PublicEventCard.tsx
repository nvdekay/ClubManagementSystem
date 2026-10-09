import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AppIcon } from "@/components/ui/icon/AppIcon";
import type { PublicEvent } from "@/services/discovery";
import { formatDate } from "@/utils/formatDate";

interface PublicEventCardProps {
  event: PublicEvent;
}

export function PublicEventCard({ event }: PublicEventCardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "vi" ? "vi" : "en";
  const date = new Date(event.startAt);
  const day = new Intl.DateTimeFormat(locale, { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
  return (
    <Link to={`/events/${event.id}`} className="group flex h-full gap-4 rounded-2xl p-4 transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
      <span aria-hidden="true" className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-mint-soft-app text-mint-app">
        <span className="font-heading text-2xl leading-none font-bold">{day}</span>
        <span className="mt-1 text-xs font-semibold uppercase">{month}</span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-xs font-semibold tracking-wide text-primary-app uppercase">{event.clubName}</span>
        <span className="mt-1 font-heading text-lg font-bold text-text-app group-hover:text-primary-app">{event.title}</span>
        <span className="mt-1 text-sm text-muted-app">{t("discovery.starts")}: {formatDate(event.startAt, locale)}</span>
        {event.venueText && <span className="mt-0.5 text-sm text-muted-app">{event.venueText}</span>}
        <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent-app">
          {t("discovery.viewEvent")}<AppIcon name="chevronRight" className="size-4" />
        </span>
      </span>
    </Link>
  );
}
