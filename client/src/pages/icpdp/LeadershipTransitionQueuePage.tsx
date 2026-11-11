import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useLeadershipTransitionQueue } from "@/hooks/useLeadershipTransitions";

export function LeadershipTransitionQueuePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const isOfficer = Boolean(auth.data?.systemRoles.includes("ICPDP_OFFICER"));
  const queue = useLeadershipTransitionQueue(isOfficer);
  function date(value: string) {
    return new Intl.DateTimeFormat(i18n.language,
      { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }
  const loading = <div className="space-y-2">{[0, 1, 2].map((item) =>
    <AppSkeleton key={item} className="h-28 w-full" />)}</div>;
  return <>
    <PageHeader title={t("leadershipTransitions.queueTitle")}
      description={t("leadershipTransitions.queueDescription")}
      actions={queue.data && <AppBadge tone="info">{t("leadershipTransitions.openCount", { count: queue.data.length })}</AppBadge>} />
    {auth.isPending ? loading : !auth.data ? <AppNotice>{t("leadershipTransitions.signIn")}</AppNotice>
      : !isOfficer ? <AppNotice tone="danger">{t("leadershipTransitions.unauthorized")}</AppNotice>
        : queue.isPending ? loading : queue.isError ? <AppNotice tone="danger" role="alert"
          title={queue.error.message || t("leadershipTransitions.loadError")}>
          <AppButton variant="secondary" onClick={() => void queue.refetch()}>{t("leadershipTransitions.retry")}</AppButton>
        </AppNotice> : queue.data.length ? <ul className="divide-y divide-border-app overflow-hidden rounded-2xl border border-border-app bg-bg-app shadow-xs">
          {queue.data.map((plan) => <li key={plan.id} className="flex flex-wrap items-center gap-5 px-5 py-4">
            <div className="min-w-0 flex-1 basis-64">
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-heading text-base font-semibold">{plan.clubName}</h2>
                <AppBadge tone={plan.clubState === "Suspended" ? "danger" : "warning"}>{plan.clubState}</AppBadge></div>
              <p className="mt-1 text-sm text-muted-app">{plan.fromTerm.name} → {plan.toTerm.name}</p>
              <p className="mt-2 text-sm text-muted-app">{t("leadershipTransitions.waitingSince", { date: date(plan.submittedAt) })}
                {" · "}{t("leadershipTransitions.conditional", { count: plan.outstandingObligations.length })}</p>
            </div>
            <AppButton variant="secondary" onClick={() => navigate(`/workspace/leadership-transitions/${plan.id}`)}>
              {t("leadershipTransitions.open")}<AppIcon name="chevronRight" className="size-4" /></AppButton>
          </li>)}</ul> : <div className="rounded-xl border border-dashed border-border-app px-4 py-12 text-center">
          <span aria-hidden="true" className="mx-auto flex size-12 items-center justify-center rounded-xl border border-border-app bg-bg-app text-muted-app">
            <AppIcon name="badge" className="size-6" /></span>
          <h2 className="mt-4 font-heading text-base font-semibold">{t("leadershipTransitions.empty")}</h2>
          <p className="mt-1 text-sm text-muted-app">{t("leadershipTransitions.emptyHint")}</p>
        </div>}
  </>;
}
