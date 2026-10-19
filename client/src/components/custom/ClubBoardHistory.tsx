import { useTranslation } from "react-i18next";

import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useClubBoardHistory } from "@/hooks/useDashboard";
import type { Locale } from "@/i18n";
import { formatDay } from "@/utils/formatDate";
import { cn } from "@/utils/cn";

interface ClubBoardHistoryProps {
  clubId: string;
  /** Extra classes for the two section titles, so the block fits a page or a dialog. */
  headingClassName?: string;
}

/**
 * BR56, FR-UC02-02/03: a club's role-structure versions and who held each board seat in every
 * term, with the step that confirmed the seat. Read-only for ICPDP and the club's Club Leader.
 */
export function ClubBoardHistory({ clubId, headingClassName }: ClubBoardHistoryProps) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const history = useClubBoardHistory(clubId, true);

  function source(value: string): string {
    return t(`clubOversight.source_${value}` as "clubOversight.source_APPLICATION", { defaultValue: value });
  }

  if (history.isPending) return <AppSkeleton className="h-48 w-full" />;
  if (history.isError) {
    return <AppNotice tone="danger" role="alert" title={t("clubOversight.historyLoadError")}>
      <AppButton variant="secondary" onClick={() => void history.refetch()}>{t("clubOversight.retry")}</AppButton>
    </AppNotice>;
  }
  const heading = cn("font-heading text-lg font-bold text-text-app", headingClassName);
  const { structures, terms } = history.data;

  return (
    <div className="space-y-8">
      <section>
        <h3 className={heading}>{t("clubOversight.structuresTitle")}</h3>
        {structures.length === 0 ? <p className="mt-2 text-sm text-muted-app">{t("clubOversight.structuresEmpty")}</p>
          : <ol className="mt-3 space-y-3">
            {structures.map((version, index) => <li key={version.versionNo}
              className={cn("rounded-xl border border-border-app p-4", { "border-primary-app bg-primary-soft-app": index === 0 })}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-text-app">{t("clubOversight.version", { number: version.versionNo })}</span>
                {index === 0 && <AppBadge tone="success">{t("clubOversight.currentVersion")}</AppBadge>}
                <span className="text-sm text-muted-app">
                  {t("clubOversight.since", { date: formatDay(version.effectiveFrom, locale) })} · {source(version.source)}</span>
              </div>
              {version.reason && <p className="mt-1 text-sm break-words text-muted-app">{version.reason}</p>}
              <ul className="mt-2 flex flex-wrap gap-2">
                {version.roles.map((role) => <li key={role.code}>
                  <AppBadge tone={role.isLeaderRole ? "info" : role.isBoardSeat ? "warning" : "neutral"}>
                    {role.unit ? `${role.name} · ${role.unit}` : role.name}</AppBadge>
                </li>)}
              </ul>
            </li>)}
          </ol>}
      </section>

      <section>
        <h3 className={heading}>{t("clubOversight.termsTitle")}</h3>
        {terms.length === 0 ? <p className="mt-2 text-sm text-muted-app">{t("clubOversight.termsEmpty")}</p>
          : <ol className="mt-3 space-y-4">
            {terms.map((term) => <li key={term.id} className="rounded-xl border border-border-app p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold break-words text-text-app">{term.name}</span>
                <AppBadge tone={term.state === "Active" ? "success" : term.state === "Planned" ? "info" : "neutral"}>
                  {t(`clubOversight.term_${term.state}` as "clubOversight.term_Active", { defaultValue: term.state })}</AppBadge>
                <span className="text-sm text-muted-app">{t("clubOversight.seatPeriod", {
                  from: formatDay(term.startAt, locale), to: formatDay(term.endAt, locale) })}</span>
              </div>
              {term.seats.length === 0 ? <p className="mt-2 text-sm text-muted-app">{t("clubOversight.seatsEmpty")}</p>
                : <ul className="mt-2 divide-y divide-border-app">
                  {term.seats.map((seat, index) => <li key={`${seat.positionName}-${seat.memberName}-${index}`}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2 text-sm">
                    <span className="min-w-0 flex-1 basis-48">
                      <span className="text-muted-app">{seat.positionName}:</span>{" "}
                      <span className="font-semibold break-words text-text-app">{seat.memberName}</span>
                    </span>
                    <span className="text-muted-app">{t("clubOversight.seatPeriod", { from: formatDay(seat.effectiveFrom, locale),
                      to: seat.effectiveTo ? formatDay(seat.effectiveTo, locale) : t("clubOversight.seatOngoing") })}</span>
                    {seat.source && <span className="basis-full text-xs text-muted-app">
                      {t("clubOversight.confirmedVia", { source: source(seat.source) })}
                      {seat.confirmedAt ? ` · ${formatDay(seat.confirmedAt, locale)}` : ""}
                      {seat.confirmedByName ? ` · ${t("clubOversight.confirmedBy", { name: seat.confirmedByName })}` : ""}
                    </span>}
                  </li>)}
                </ul>}
            </li>)}
          </ol>}
      </section>
    </div>
  );
}
