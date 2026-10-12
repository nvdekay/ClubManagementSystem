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
        </AppNotice> : queue.data.length ? <ul className="divide-y divide-border-app border-y border-border-app">
          {queue.data.map((plan) => <li key={plan.id} className="flex flex-wrap items-center gap-5 px-2 py-5">
            <div className="min-w-0 flex-1 basis-64">
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-heading text-lg font-bold">{plan.clubName}</h2>
                <AppBadge tone={plan.clubState === "Suspended" ? "danger" : "warning"}>{plan.clubState}</AppBadge></div>
              <p className="mt-1 text-sm text-muted-app">{plan.fromTerm.name} → {plan.toTerm.name}</p>
              <p className="mt-2 text-sm text-muted-app">{t("leadershipTransitions.waitingSince", { date: date(plan.submittedAt) })}
                {" · "}{t("leadershipTransitions.conditional", { count: plan.outstandingObligations.length })}</p>
            </div>
            <AppButton onClick={() => navigate(`/workspace/leadership-transitions/${plan.id}`)}>
              {t("leadershipTransitions.open")}<AppIcon name="chevronRight" className="size-4" /></AppButton>
          </li>)}</ul> : <div className="py-16 text-center">
          <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-mint-soft-app text-mint-app">
            <AppIcon name="badge" className="size-7" /></span>
          <h2 className="mt-4 font-heading text-xl font-bold">{t("leadershipTransitions.empty")}</h2>
          <p className="mt-2 text-muted-app">{t("leadershipTransitions.emptyHint")}</p>
        </div>}
  </>;
}
