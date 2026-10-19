import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useInternalEvent, useInternalEvents } from "@/hooks/useDashboard";
import { DashboardRequestError, type InternalEventSummary } from "@/services/dashboard";
import { formatDate } from "@/utils/formatDate";

const stateTones: Record<string, AppBadgeTone> = {
  Approved: "info", Upcoming: "info", Ongoing: "success", Completed: "neutral",
  "Report Submitted": "neutral", Closed: "neutral", Cancelled: "danger",
};

function useStateLabel() {
  const { t } = useTranslation();
  return function stateLabel(state: string): string {
    return t(`clubOversight.state_${state}` as "clubOversight.state_Approved", { defaultValue: state });
  };
}

/** Wraps a page body in the officer check every ICPDP drill-down needs. */
function OfficerOnly({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const auth = useAuth();
  if (auth.isPending) return <AppSkeleton className="h-40 w-full" />;
  if (!auth.data) return <AppNotice>{t("clubOversight.signIn")}</AppNotice>;
  if (!auth.data.systemRoles.includes("ICPDP_OFFICER")) {
    return <AppNotice tone="danger" role="alert">{t("clubOversight.forbidden")}</AppNotice>;
  }
  return <>{children}</>;
}

function EventFacts({ event }: { event: InternalEventSummary }) {
  const { t, i18n } = useTranslation();
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-app">
      <li>{formatDate(event.startAt, i18n.language)}</li>
      {event.venueText && <li>{event.venueText}</li>}
      <li>{t("clubOversight.registered", { count: event.registrations })}</li>
      <li>{t("clubOversight.attended", { count: event.attendances })}</li>
      <li>{t("clubOversight.capacity", { count: event.capacity })}</li>
    </ul>
  );
}

/** FR-UC02-02, BR53: every recorded internal event, filtered by club and semester. */
export function InternalEventsPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const stateLabel = useStateLabel();
  const [params, setParams] = useSearchParams();
  const [clubId, setClubId] = useState(() => params.get("clubId") ?? "");
  const [semesterCode, setSemesterCode] = useState(() => params.get("semester") ?? "");
  const isOfficer = Boolean(auth.data?.systemRoles.includes("ICPDP_OFFICER"));
  const events = useInternalEvents({ clubId, semesterCode }, isOfficer);

  function filter(next: { clubId: string; semesterCode: string }) {
    setClubId(next.clubId);
    setSemesterCode(next.semesterCode);
    const query = new URLSearchParams();
    if (next.clubId) query.set("clubId", next.clubId);
    if (next.semesterCode) query.set("semester", next.semesterCode);
    setParams(query, { replace: true });
  }

  return <>
    <PageHeader title={t("clubOversight.internalTitle")} description={t("clubOversight.internalDescription")}
      actions={events.data && <AppBadge tone="info">{t("clubOversight.internalCount", { count: events.data.items.length })}</AppBadge>} />
    <OfficerOnly>
      <div className="flex flex-wrap gap-3">
        <AppSelect className="w-full sm:w-64" label={t("clubOversight.filterClub")} value={clubId}
          options={[{ value: "", label: t("clubOversight.allClubs") },
            ...(events.data?.clubs ?? []).map((club) => ({ value: club.id, label: club.name }))]}
          onChange={(value) => filter({ clubId: value, semesterCode })} />
        <AppSelect className="w-full sm:w-56" label={t("clubOversight.filterSemester")} value={semesterCode}
          options={[{ value: "", label: t("clubOversight.allSemesters") },
            ...(events.data?.semesters ?? []).map((value) => ({ value, label: value }))]}
          onChange={(value) => filter({ clubId, semesterCode: value })} />
      </div>
      {events.isPending ? <div className="mt-6 space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>
        : events.isError ? <AppNotice tone="danger" role="alert" className="mt-6" title={t("clubOversight.internalLoadError")}>
          <AppButton variant="secondary" onClick={() => void events.refetch()}>{t("clubOversight.retry")}</AppButton>
        </AppNotice>
          : events.data.items.length === 0 ? <p className="py-16 text-center text-muted-app">{t("clubOversight.internalEmpty")}</p>
            : <ul className="mt-6 divide-y divide-border-app border-y border-border-app">
              {events.data.items.map((event) => <li key={event.id}>
                <Link to={`/workspace/internal-events/${event.id}`}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 px-2 py-4 hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app">
                  <span className="min-w-0 flex-1 basis-64">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-base font-bold break-words text-text-app">{event.title}</span>
                      <AppBadge tone={stateTones[event.state] ?? "neutral"}>{stateLabel(event.state)}</AppBadge>
                    </span>
                    <span className="mt-0.5 block text-sm font-semibold text-primary-app">{event.clubName} · {event.semesterCode}</span>
                    <span className="mt-1 block"><EventFacts event={event} /></span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-app">
                    {t("clubOversight.open")}<AppIcon name="chevronRight" className="size-4" /></span>
                </Link>
              </li>)}
            </ul>}
    </OfficerOnly>
  </>;
}

/** One internal event and its attendance, read-only (FR-UC02-02). */
export function InternalEventDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const auth = useAuth();
  const stateLabel = useStateLabel();
  const isOfficer = Boolean(auth.data?.systemRoles.includes("ICPDP_OFFICER"));
  const event = useInternalEvent(id, isOfficer);
  const back = <Link to="/workspace/internal-events" className="inline-flex items-center gap-1 text-sm font-semibold text-accent-app hover:underline">
    <AppIcon name="arrowLeft" className="size-4" />{t("clubOversight.back")}</Link>;

  function method(value: string): string {
    return t(`clubOversight.method_${value}` as "clubOversight.method_self", { defaultValue: value });
  }

  return <OfficerOnly>
    <div className="mb-4">{back}</div>
    {event.isPending ? <AppSkeleton className="h-64 w-full" />
      : event.isError ? <AppNotice tone="danger" role="alert"
        title={event.error instanceof DashboardRequestError && event.error.status === 404 ? t("clubOversight.eventNotFound") : t("clubOversight.internalLoadError")}>
        <AppButton variant="secondary" onClick={() => void event.refetch()}>{t("clubOversight.retry")}</AppButton>
      </AppNotice>
        : <>
          <PageHeader title={event.data.title} description={`${event.data.clubName} · ${event.data.semesterCode}`}
            actions={<AppBadge tone={stateTones[event.data.state] ?? "neutral"}>{stateLabel(event.data.state)}</AppBadge>} />
          <EventFacts event={event.data} />
          {event.data.objective && <section className="mt-6">
            <h2 className="font-heading text-lg font-bold">{t("clubOversight.objective")}</h2>
            <p className="mt-1 whitespace-pre-line text-text-app">{event.data.objective}</p>
          </section>}
          <section className="mt-8">
            <h2 className="font-heading text-lg font-bold">{t("clubOversight.attendanceTitle")}</h2>
            <p className="mt-1 text-sm text-muted-app">{t("clubOversight.attendanceHint")}</p>
            {event.data.attendance.length === 0 ? <p className="py-8 text-center text-muted-app">{t("clubOversight.attendanceEmpty")}</p>
              : <ul className="mt-3 divide-y divide-border-app border-y border-border-app">
                {event.data.attendance.map((row, index) => <li key={`${row.email}-${index}`} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-2 py-3">
                  <span className="min-w-0 flex-1 basis-56">
                    <span className="block font-semibold break-words text-text-app">{row.studentName}</span>
                    <span className="block text-sm break-all text-muted-app">{row.email}</span>
                  </span>
                  <span className="text-sm text-muted-app">{formatDate(row.checkedInAt, i18n.language)} · {method(row.method)}</span>
                  <AppBadge tone={row.finalized ? "success" : "warning"}>
                    {row.finalized ? t("clubOversight.finalized") : t("clubOversight.notFinalized")}</AppBadge>
                </li>)}
              </ul>}
          </section>
        </>}
  </OfficerOnly>;
}
