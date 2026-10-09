import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { appToast } from "@/components/ui/toast/AppToast";
import { useClubLifecycle, useClubLifecycleAction } from "@/hooks/useClubLifecycle";
import { cn } from "@/utils/cn";

type Decision = "suspend" | "reactivate" | "dissolve";
const dateInputClass = "mt-1 block min-h-11 rounded-xl border border-border-app bg-bg-app px-3 text-text-app focus-visible:border-ring-app focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:outline-none";
const choiceClass = "min-h-10 rounded-full border border-border-app px-4 text-sm text-muted-app";
const activeChoiceClass = "border-primary-app bg-primary-soft-app text-primary-app";

interface ClubLifecyclePanelProps {
  clubId: string;
  csrfToken: string;
  onClose: () => void;
}

export function ClubLifecyclePanel({ clubId, csrfToken, onClose }: ClubLifecyclePanelProps) {
  const { t, i18n } = useTranslation();
  const detail = useClubLifecycle(clubId);
  const action = useClubLifecycleAction();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [timed, setTimed] = useState(true);
  const [until, setUntil] = useState("");
  const [error, setError] = useState<string | null>(null);

  function date(value: string): string {
    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(new Date(value));
  }

  function actionLabel(value: string): string {
    switch (value) {
      case "CLUB_SUSPENDED": return t("clubLifecycle.action_CLUB_SUSPENDED");
      case "CLUB_REACTIVATED": return t("clubLifecycle.action_CLUB_REACTIVATED");
      case "CLUB_DISSOLUTION_DECIDED": return t("clubLifecycle.action_CLUB_DISSOLUTION_DECIDED");
      case "CLUB_DISSOLVING": return t("clubLifecycle.action_CLUB_DISSOLVING");
      case "CLUB_DISSOLVED": return t("clubLifecycle.action_CLUB_DISSOLVED");
      default: return value;
    }
  }

  function choose(value: Decision) {
    setDecision(value);
    setReason("");
    setError(null);
  }

  async function confirm() {
    if (!decision) return;
    if (!reason.trim()) { setError(t("clubLifecycle.reasonRequired")); return; }
    // The end date is a whole day: reactivate at the start of that local day.
    const untilIso = decision === "suspend" && timed && until ? new Date(`${until}T00:00:00`).toISOString() : undefined;
    if (decision === "suspend" && timed && (!untilIso || new Date(untilIso) <= new Date())) {
      setError(t("clubLifecycle.untilRequired"));
      return;
    }
    setError(null);
    try {
      const result = await action.mutateAsync(decision === "suspend"
        ? { kind: "suspend", id: clubId, reason, until: untilIso, csrfToken }
        : { kind: decision, id: clubId, reason, csrfToken });
      if (decision === "suspend" && "cancelledEvents" in result) {
        appToast.success(t("clubLifecycle.suspended", { events: result.cancelledEvents,
          registrations: result.cancelledRegistrations, bookings: result.cancelledBookings }));
      } else if (decision === "dissolve" && "effectiveSemester" in result && "cancelledEvents" in result) {
        appToast.success(t("clubLifecycle.dissolved", { semester: result.effectiveSemester,
          events: result.cancelledEvents, bookings: result.cancelledBookings }));
      } else {
        appToast.success(t("clubLifecycle.reactivated"));
      }
      setDecision(null);
    } catch (failure) {
      setError(`${t("clubLifecycle.failed")} ${(failure as Error).message}`);
    }
  }

  if (detail.isPending) return <AppSkeleton className="mt-4 h-64 w-full" />;
  if (detail.isError || !detail.data) {
    return <AppNotice tone="danger" role="alert" className="mt-4" title={t("clubLifecycle.detailLoadError")}>
      <AppButton variant="secondary" onClick={() => void detail.refetch()}>{t("clubLifecycle.retry")}</AppButton>
    </AppNotice>;
  }
  const { club, nextSemester } = detail.data;
  const canSuspend = club.state === "Active";
  const canReactivate = club.state === "Suspended";
  const canDissolve = ["Active", "Suspended"].includes(club.state) && !club.dissolution;

  return (
    <div className="mt-4 space-y-6 border-t border-border-app pt-4">
      {club.suspension && <AppNotice tone="warning">{t("clubLifecycle.suspendedSince", {
        date: date(club.suspension.suspendedAt), reason: club.suspension.reason })} · {club.suspension.until
        ? t("clubLifecycle.until", { date: date(club.suspension.until) }) : t("clubLifecycle.indefinite")}</AppNotice>}
      {club.dissolution && <AppNotice tone="danger">{t("clubLifecycle.dissolutionScheduled", {
        semester: club.dissolution.effectiveSemester, from: date(club.dissolution.effectiveFrom),
        to: date(club.dissolution.effectiveTo), reason: club.dissolution.reason })}</AppNotice>}

      <section className="grid gap-4 sm:grid-cols-3">
        <div><h3 className="text-sm font-semibold">{t("clubLifecycle.openCampaigns")}</h3>
          {club.openCampaigns.length ? <ul className="mt-1 space-y-1 text-sm">{club.openCampaigns.map((item) =>
            <li key={item.id}>{item.title} · {date(item.windowEnd)}</li>)}</ul>
            : <p className="mt-1 text-sm text-muted-app">{t("clubLifecycle.none")}</p>}</div>
        <div><h3 className="text-sm font-semibold">{t("clubLifecycle.upcomingEvents")}</h3>
          {club.upcomingEvents.length ? <ul className="mt-1 space-y-1 text-sm">{club.upcomingEvents.map((item) =>
            <li key={item.id}>{item.title} · {date(item.startAt)} · {t("clubLifecycle.registrations", { count: item.registrations })}</li>)}</ul>
            : <p className="mt-1 text-sm text-muted-app">{t("clubLifecycle.none")}</p>}</div>
        <div><h3 className="text-sm font-semibold">{t("clubLifecycle.activeTerm")}</h3>
          <p className="mt-1 text-sm">{club.activeTerm ? `${club.activeTerm.name} · ${date(club.activeTerm.startAt)} – ${date(club.activeTerm.endAt)}`
            : t("clubLifecycle.none")}</p></div>
      </section>

      {(canSuspend || canReactivate || canDissolve) && <div className="flex flex-wrap gap-2">
        {canSuspend && <AppButton variant={decision === "suspend" ? "primary" : "secondary"} onClick={() => choose("suspend")}>
          {t("clubLifecycle.suspend")}</AppButton>}
        {canReactivate && <AppButton variant={decision === "reactivate" ? "primary" : "secondary"} onClick={() => choose("reactivate")}>
          {t("clubLifecycle.reactivate")}</AppButton>}
        {canDissolve && <AppButton variant={decision === "dissolve" ? "primary" : "ghost"} onClick={() => choose("dissolve")}>
          {t("clubLifecycle.dissolve")}</AppButton>}
      </div>}

      {decision && <section className="space-y-4 rounded-2xl bg-surface-app p-4">
        <p className="text-sm text-muted-app">{decision === "suspend" ? t("clubLifecycle.suspendHint")
          : decision === "reactivate" ? t("clubLifecycle.reactivateHint")
            : nextSemester ? t("clubLifecycle.dissolveHint", { semester: nextSemester.code }) : t("clubLifecycle.noNextSemester")}</p>
        {decision === "suspend" && <fieldset className="space-y-3">
          <legend className="text-sm font-medium">{t("clubLifecycle.duration")}</legend>
          <div className="flex flex-wrap gap-2">{[true, false].map((value) => (
            <button key={String(value)} type="button" aria-pressed={timed === value} onClick={() => setTimed(value)}
              className={cn(choiceClass, { [activeChoiceClass]: timed === value })}>
              {value ? t("clubLifecycle.durationUntil") : t("clubLifecycle.durationOpen")}</button>))}
          </div>
          {timed && <label className="block text-sm">{t("clubLifecycle.untilDate")}
            <input type="date" className={dateInputClass} value={until} onChange={(event) => setUntil(event.target.value)} /></label>}
        </fieldset>}
        <label className="block text-sm font-medium">{t("clubLifecycle.reason")}
          <AppTextarea className="mt-2 min-h-24 w-full font-normal" maxLength={2000} value={reason}
            onChange={(event) => setReason(event.target.value)} /></label>
        {error && <p role="alert" className="text-sm text-danger-app">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <AppButton disabled={action.isPending || (decision === "dissolve" && !nextSemester)} onClick={() => void confirm()}>
            {action.isPending ? t("clubLifecycle.working") : t("clubLifecycle.confirm")}</AppButton>
          <AppButton variant="ghost" onClick={() => setDecision(null)}>{t("clubLifecycle.cancel")}</AppButton>
        </div>
      </section>}

      <section><h3 className="font-heading font-bold">{t("clubLifecycle.history")}</h3>
        {club.history.length ? <ol className="mt-3 space-y-3 border-l-2 border-border-app pl-4">{club.history.map((item, index) => (
          <li key={`${item.action}-${item.at}-${index}`} className="text-sm">
            <p><span className="font-semibold">{actionLabel(item.action)}</span> · {date(item.at)} · {item.actorName
              ? t("clubLifecycle.by", { name: item.actorName }) : t("clubLifecycle.system")}</p>
            {item.reason && <p className="mt-0.5 text-muted-app">{item.reason}</p>}
          </li>))}</ol> : <p className="mt-2 text-sm text-muted-app">{t("clubLifecycle.noHistory")}</p>}
      </section>
      <AppButton variant="ghost" onClick={onClose}>{t("clubLifecycle.close")}</AppButton>
    </div>
  );
}
