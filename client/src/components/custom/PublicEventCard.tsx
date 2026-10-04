import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AppCard } from "@/components/ui/card/AppCard";
import type { PublicEvent } from "@/services/discovery";
import { formatDate } from "@/utils/formatDate";

interface PublicEventCardProps {
  event: PublicEvent;
}

export function PublicEventCard({ event }: PublicEventCardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "vi" ? "vi" : "en";
  return (
    <Link to={`/events/${event.id}`} className="block h-full">
      <AppCard className="h-full p-5 transition-colors hover:border-primary-app">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-app">{event.clubName}</p>
        <h3 className="mt-2 text-lg font-semibold">{event.title}</h3>
        <p className="mt-3 text-sm text-muted-app">
          {t("discovery.starts")}: {formatDate(event.startAt, locale)}
        </p>
        {event.venueText && <p className="mt-1 text-sm text-muted-app">{event.venueText}</p>}
        <span className="mt-4 inline-block text-sm font-semibold text-accent-app">
          {t("discovery.viewEvent")} →
        </span>
      </AppCard>
    </Link>
  );
}
