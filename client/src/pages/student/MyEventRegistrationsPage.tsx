import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";

import { EventCheckInForm } from "@/components/custom/EventCheckInForm";
import { EventFeedbackForm, EventFeedbackSummary } from "@/components/custom/EventFeedbackForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useMyAttendances } from "@/hooks/useEventCheckIns";
import { useMyEventFeedback } from "@/hooks/useEventFeedback";
import { useEventRegistrationAction, useMyEventRegistrations } from "@/hooks/useEventRegistrations";
import type { Locale } from "@/i18n";
import type { Attendance, CheckInResult } from "@/services/eventCheckIns";
import type { MyEventFeedback } from "@/services/eventFeedback";
import type { EventRegistration } from "@/services/eventRegistrations";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/formatDate";

type Filter = "active" | "attended" | "cancelled";
const objectId = /^[0-9a-f]{24}$/i;

export function MyEventRegistrationsPage() {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const signedIn = Boolean(auth.data);
  const registrations = useMyEventRegistrations(signedIn);
  const attendances = useMyAttendances(signedIn);
  const feedback = useMyEventFeedback(signedIn);
  const action = useEventRegistrationAction();
  const inFlight = useRef(false);
  const [filter, setFilter] = useState<Filter>(() => (searchParams.get("tab") === "attended" ? "attended" : "active"));
  const [cancelledId, setCancelledId] = useState<string | null>(null);
  const [openCheckIn, setOpenCheckIn] = useState<string | null>(null);
  // The row's inline form unmounts once the list refreshes, so the confirmation lives at page level.
  const [lastCheckIn, setLastCheckIn] = useState<CheckInResult | null>(null);
  // Read once per visit: render must stay pure, and minute-level drift does not matter here.
  const [nowTime] = useState(() => Date.now());
  // A scanned QR opens /workspace/event-registrations?checkin=<eventId>&code=<code>.
  const deepLinkEvent = searchParams.get("checkin");
  const deepLink = deepLinkEvent && objectId.test(deepLinkEvent)
    ? { eventId: deepLinkEvent, code: searchParams.get("code") ?? "" } : null;

  async function cancel(registration: EventRegistration) {
    if (!auth.data || inFlight.current || !window.confirm(t("eventRegistrations.cancelConfirm"))) return;
    inFlight.current = true;
    setCancelledId(null);
    try {
      await action.mutateAsync({ kind: "cancel", registrationId: registration.id, csrfToken: auth.data.csrfToken });
      setCancelledId(registration.id);
    } catch {
      // action.isError renders the message.
    } finally {
      inFlight.current = false;
    }
  }

  function closeDeepLink() {
    setSearchParams((params) => {
      params.delete("checkin");
      params.delete("code");
      return params;
    }, { replace: true });
  }

  const all = registrations.data ?? [];
  const attended = attendances.data ?? [];
  const attendedEvents = new Set(attended.map((item) => item.eventId));
  const counts = { active: all.filter((item) => item.state !== "Cancelled").length,
    attended: attended.length, cancelled: all.filter((item) => item.state === "Cancelled").length };
  const items = all.filter((item) => (filter === "cancelled" ? item.state === "Cancelled" : item.state !== "Cancelled"));
  const deepLinkTitle = deepLink && all.find((item) => item.eventId === deepLink.eventId)?.eventTitle;
  const pending = registrations.isPending || attendances.isPending || feedback.isPending;
  const error = registrations.error ?? attendances.error ?? feedback.error;
  const feedbackByEvent = new Map((feedback.data ?? []).map((item) => [item.eventId, item]));

  return (
    <>
      <PageHeader title={t("eventRegistrations.title")} description={t("eventRegistrations.description")} />

      {deepLink && !pending && (
        <section aria-labelledby="deep-link-check-in" className="mb-8 rounded-3xl bg-primary-soft-app p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="deep-link-check-in" className="font-heading text-lg font-bold">{t("eventRegistrations.deepLinkTitle")}</h2>
              {deepLinkTitle && <p className="mt-1 text-sm break-words text-muted-app">{deepLinkTitle}</p>}
            </div>
            <AppButton variant="ghost" aria-label={t("eventRegistrations.closeCheckIn")} onClick={closeDeepLink} className="size-10 shrink-0 px-0">
              <AppIcon name="close" className="size-4" />
            </AppButton>
          </div>
          <div className="mt-4">
            <EventCheckInForm eventId={deepLink.eventId} initialCode={deepLink.code} autoFocus={!deepLink.code} />
          </div>
        </section>
      )}

      {pending ? (
        <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>
      ) : error ? (
        <AppNotice tone="danger" role="alert" title={t("eventRegistrations.loadError")}>
          <p>{error.message}</p>
          <AppButton variant="secondary" onClick={() => { void registrations.refetch(); void attendances.refetch(); void feedback.refetch(); }}>
            {t("eventRegistrations.retry")}</AppButton>
        </AppNotice>
      ) : (
        <>
          <div role="group" aria-label={t("eventRegistrations.title")} className="mb-4 inline-flex max-w-full flex-wrap rounded-3xl bg-surface-app p-1">
            {(["active", "attended", "cancelled"] as const).map((value) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
                className={cn("min-h-10 rounded-full px-4 text-sm font-semibold text-muted-app transition-colors focus-visible:outline-2 focus-visible:outline-ring-app", {
                  "bg-bg-app text-primary-app shadow-sm": filter === value,
                })}>
                {value === "active" ? t("eventRegistrations.filterActive")
                  : value === "attended" ? t("eventRegistrations.filterAttended") : t("eventRegistrations.filterCancelled")}
                <span className="ml-1.5 tabular-nums">{counts[value]}</span>
              </button>
            ))}
          </div>
          {action.isError && <AppNotice tone="danger" role="alert" title={t("eventRegistrations.actionError")} className="mb-4">
            <p>{action.error.message}</p></AppNotice>}
          {cancelledId && !action.isError && <p role="status" className="mb-4 text-sm font-semibold text-success-app">
            {t("eventRegistrations.cancelSuccess")}</p>}
          {lastCheckIn && (
            <AppNotice tone="success" role="status" className="mb-4"
              title={lastCheckIn.alreadyCheckedIn ? t("eventRegistrations.checkInAlready") : t("eventRegistrations.checkInSuccess")}>
              <p className="break-words">{lastCheckIn.eventTitle} · {t("eventRegistrations.checkedInAt", { date: formatDate(lastCheckIn.checkedInAt, locale) })}</p>
              <p>{lastCheckIn.feedbackClosesAt
                ? t("eventRegistrations.feedbackOpenUntil", { date: formatDate(lastCheckIn.feedbackClosesAt, locale) })
                : t("eventRegistrations.feedbackOpenNoDeadline")}</p>
            </AppNotice>
          )}

          {filter === "attended" ? (
            attended.length === 0 ? <EmptyState message={t("eventRegistrations.attendedEmpty")} />
              : <ul className="divide-y divide-border-app border-y border-border-app">
                {attended.map((item) => <AttendanceRow key={item.id} attendance={item} locale={locale} nowTime={nowTime}
                  feedback={feedbackByEvent.get(item.eventId)} />)}
              </ul>
          ) : items.length === 0 ? <EmptyState message={t("eventRegistrations.empty")} /> : (
            <ul className="divide-y divide-border-app border-y border-border-app">
              {items.map((registration) => {
                const started = new Date(registration.eventStartAt).getTime() <= nowTime;
                const checkedIn = attendedEvents.has(registration.eventId);
                const inCheckInWindow = new Date(registration.checkInOpensAt).getTime() <= nowTime
                  && nowTime < new Date(registration.checkInClosesAt).getTime();
                const canCheckIn = registration.state === "Confirmed" && !checkedIn && inCheckInWindow;
                return (
                  <li key={registration.id} className="px-2 py-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                      <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft-app text-primary-app">
                        <AppIcon name="calendar" /></span>
                      <div className="min-w-0 flex-1 basis-56">
                        <Link to={`/events/${registration.eventId}`} className="font-semibold break-words text-text-app hover:text-primary-app hover:underline">
                          {registration.eventTitle}</Link>
                        <p className="mt-0.5 text-sm text-muted-app">
                          {registration.clubName} · {t("eventRegistrations.starts", { date: formatDate(registration.eventStartAt, locale) })}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-app">
                          {registration.state === "Cancelled" && registration.cancelledAt
                            ? t("eventRegistrations.cancelledAt", { date: formatDate(registration.cancelledAt, locale) })
                            : t("eventRegistrations.registeredAt", { date: formatDate(registration.createdAt, locale) })}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {checkedIn && <AppBadge tone="success">{t("eventRegistrations.checkedInBadge")}</AppBadge>}
                        <AppBadge tone={registration.state === "Confirmed" ? "info" : registration.state === "Waitlisted" ? "warning" : "neutral"}>
                          {registration.state === "Confirmed" ? t("eventRegistrations.confirmed")
                            : registration.state === "Waitlisted"
                              ? t("eventRegistrations.waitlisted", { position: registration.waitlistPosition ?? "—" })
                              : t("eventRegistrations.cancelled")}
                        </AppBadge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canCheckIn && (
                          <AppButton aria-expanded={openCheckIn === registration.id}
                            onClick={() => setOpenCheckIn((current) => (current === registration.id ? null : registration.id))}>
                            {t("eventRegistrations.checkInTitle")}
                          </AppButton>
                        )}
                        {registration.state !== "Cancelled" && !started && (
                          <AppButton variant="secondary" disabled={action.isPending} onClick={() => void cancel(registration)}>
                            {t("eventRegistrations.cancel")}
                          </AppButton>
                        )}
                      </div>
                    </div>
                    {canCheckIn && openCheckIn === registration.id && (
                      <div className="mt-4 rounded-2xl bg-surface-app p-4">
                        <EventCheckInForm eventId={registration.eventId} autoFocus
                          onCheckedIn={(result) => { setLastCheckIn(result); setOpenCheckIn(null); }} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </>
  );
}

interface AttendanceRowProps {
  attendance: Attendance;
  locale: Locale;
  nowTime: number;
  feedback: MyEventFeedback | undefined;
}

function AttendanceRow({ attendance, locale, nowTime, feedback }: AttendanceRowProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const feedbackOpen = !attendance.feedbackClosesAt || new Date(attendance.feedbackClosesAt).getTime() > nowTime;
  return (
    <li className="px-2 py-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-mint-soft-app text-mint-app">
          <AppIcon name="badge" /></span>
        <div className="min-w-0 flex-1 basis-56">
          <Link to={`/events/${attendance.eventId}`} className="font-semibold break-words text-text-app hover:text-primary-app hover:underline">
            {attendance.eventTitle}</Link>
          <p className="mt-0.5 text-sm text-muted-app">
            {attendance.clubName} · {t("eventRegistrations.checkedInAt", { date: formatDate(attendance.checkedInAt, locale) })}
          </p>
          {!feedback && <p className={cn("mt-0.5 text-xs", feedbackOpen ? "text-success-app" : "text-muted-app")}>
            {!feedbackOpen ? t("eventRegistrations.feedbackClosed")
              : attendance.feedbackClosesAt
                ? t("eventRegistrations.feedbackOpenUntil", { date: formatDate(attendance.feedbackClosesAt, locale) })
                : t("eventRegistrations.feedbackOpenNoDeadline")}
          </p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AppBadge tone="success">{t("eventRegistrations.checkedInBadge")}</AppBadge>
          {attendance.method === "walk-in" && <AppBadge tone="warning">{t("eventRegistrations.walkInBadge")}</AppBadge>}
        </div>
        {!feedback && feedbackOpen && (
          <AppButton aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            <AppIcon name="star" className="size-4" />{t("eventFeedback.giveFeedback")}
          </AppButton>
        )}
      </div>
      {feedback ? (
        <div className="mt-3 space-y-2 rounded-2xl bg-surface-app p-4">
          {justSent && <p role="status" className="text-sm font-semibold text-success-app">{t("eventFeedback.submitted")}</p>}
          <EventFeedbackSummary feedback={feedback} />
        </div>
      ) : open && feedbackOpen && (
        <div className="mt-4 rounded-2xl bg-surface-app p-4">
          <EventFeedbackForm eventId={attendance.eventId} closesAt={attendance.feedbackClosesAt}
            onSubmitted={() => { setOpen(false); setJustSent(true); }} />
        </div>
      )}
    </li>
  );
}

function EmptyState({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <div className="py-16 text-center">
      <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-mint-soft-app text-mint-app">
        <AppIcon name="calendar" className="size-7" /></span>
      <p className="mt-4 text-muted-app">{message}</p>
      <Link to="/events" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary-app px-5 text-sm font-semibold text-on-primary-app hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
        {t("eventRegistrations.browseEvents")}</Link>
    </div>
  );
}
