import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useEventRegistrationAction, useMyEventRegistrations } from "@/hooks/useEventRegistrations";
import type { Locale } from "@/i18n";
import type { EventRegistration } from "@/services/eventRegistrations";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/formatDate";

type Filter = "active" | "cancelled";

export function MyEventRegistrationsPage() {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const auth = useAuth();
  const registrations = useMyEventRegistrations(Boolean(auth.data));
  const action = useEventRegistrationAction();
  const inFlight = useRef(false);
  const [filter, setFilter] = useState<Filter>("active");
  const [cancelledId, setCancelledId] = useState<string | null>(null);

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

  const all = registrations.data ?? [];
  const items = all.filter((item) => (filter === "active" ? item.state !== "Cancelled" : item.state === "Cancelled"));
  const counts = { active: all.filter((item) => item.state !== "Cancelled").length,
    cancelled: all.filter((item) => item.state === "Cancelled").length };

  return (
    <>
      <PageHeader title={t("eventRegistrations.title")} description={t("eventRegistrations.description")} />
      {registrations.isPending ? (
        <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-20 w-full" />)}</div>
      ) : registrations.isError ? (
        <AppNotice tone="danger" role="alert" title={t("eventRegistrations.loadError")}>
          <p>{registrations.error.message}</p>
          <AppButton variant="secondary" onClick={() => void registrations.refetch()}>{t("eventRegistrations.retry")}</AppButton>
        </AppNotice>
      ) : (
        <>
          <div role="group" aria-label={t("eventRegistrations.title")} className="mb-4 inline-flex rounded-full bg-surface-app p-1">
            {(["active", "cancelled"] as const).map((value) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
                className={cn("min-h-10 rounded-full px-4 text-sm font-semibold text-muted-app transition-colors focus-visible:outline-2 focus-visible:outline-ring-app", {
                  "bg-bg-app text-primary-app shadow-sm": filter === value,
                })}>
                {value === "active" ? t("eventRegistrations.filterActive") : t("eventRegistrations.filterCancelled")}
                <span className="ml-1.5 tabular-nums">{counts[value]}</span>
              </button>
            ))}
          </div>
          {action.isError && <AppNotice tone="danger" role="alert" title={t("eventRegistrations.actionError")} className="mb-4">
            <p>{action.error.message}</p></AppNotice>}
          {cancelledId && !action.isError && <p role="status" className="mb-4 text-sm font-semibold text-success-app">
            {t("eventRegistrations.cancelSuccess")}</p>}
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-mint-soft-app text-mint-app">
                <AppIcon name="calendar" className="size-7" /></span>
              <p className="mt-4 text-muted-app">{t("eventRegistrations.empty")}</p>
              <Link to="/events" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary-app px-5 text-sm font-semibold text-on-primary-app hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
                {t("eventRegistrations.browseEvents")}</Link>
            </div>
          ) : (
            <ul className="divide-y divide-border-app border-y border-border-app">
              {items.map((registration) => {
                const started = new Date(registration.eventStartAt) <= new Date();
                return (
                  <li key={registration.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-2 py-4">
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
                    <AppBadge tone={registration.state === "Confirmed" ? "success" : registration.state === "Waitlisted" ? "warning" : "neutral"}>
                      {registration.state === "Confirmed" ? t("eventRegistrations.confirmed")
                        : registration.state === "Waitlisted"
                          ? t("eventRegistrations.waitlisted", { position: registration.waitlistPosition ?? "—" })
                          : t("eventRegistrations.cancelled")}
                    </AppBadge>
                    {registration.state !== "Cancelled" && !started && (
                      <AppButton variant="secondary" disabled={action.isPending} onClick={() => void cancel(registration)}>
                        {t("eventRegistrations.cancel")}
                      </AppButton>
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
