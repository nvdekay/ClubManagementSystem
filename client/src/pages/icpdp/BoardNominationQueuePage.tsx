import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useBoardNominationQueue } from "@/hooks/useBoardNominations";

export function BoardNominationQueuePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();
  const isOfficer = Boolean(auth.data?.systemRoles.includes("ICPDP_OFFICER"));
  const queue = useBoardNominationQueue(isOfficer);
  function date(value: string) {
    return new Intl.DateTimeFormat(i18n.language,
      { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }
  const loading = <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-24 w-full" />)}</div>;
  return <>
    <PageHeader title={t("boardNominations.queueTitle")} description={t("boardNominations.queueDescription")}
      actions={queue.data && <AppBadge tone="info">{t("boardNominations.openCount", { count: queue.data.length })}</AppBadge>} />
    {auth.isPending ? loading
      : !auth.data ? <AppNotice>{t("boardNominations.signIn")}</AppNotice>
        : !isOfficer ? <AppNotice tone="danger" role="alert">{t("boardNominations.unauthorized")}</AppNotice>
          : queue.isPending ? loading
            : queue.isError ? <AppNotice tone="danger" role="alert" title={queue.error.message || t("boardNominations.queueError")}>
              <AppButton variant="secondary" onClick={() => void queue.refetch()}>{t("boardNominations.retry")}</AppButton>
            </AppNotice>
              : queue.data.length ? <ul className="divide-y divide-border-app border-y border-border-app">
                {queue.data.map((nomination) => <li key={nomination.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-2 py-5">
                  <div className="min-w-0 flex-1 basis-64">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-lg font-bold">{nomination.clubName}</h2>
                      <AppBadge tone="warning">{nomination.term.name}</AppBadge>
                    </div>
                    <p className="mt-1 text-sm text-muted-app">{t("boardNominations.waitingSince", { date: date(nomination.submittedAt) })}</p>
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">{nomination.seats.map((seat) =>
                      <li key={seat.id}><span className="text-muted-app">{seat.positionName}:</span> {seat.displayName}</li>)}</ul>
                  </div>
                  <AppButton onClick={() => navigate(`/workspace/board-nominations/${nomination.id}`)}>
                    {t("boardNominations.open")}<AppIcon name="chevronRight" className="size-4" /></AppButton>
                </li>)}
              </ul> : <div className="py-16 text-center">
                <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-mint-soft-app text-mint-app"><AppIcon name="badge" className="size-7" /></span>
                <h2 className="mt-4 font-heading text-xl font-bold">{t("boardNominations.queueEmpty")}</h2>
                <p className="mt-2 text-muted-app">{t("boardNominations.queueEmptyHint")}</p>
              </div>}
  </>;
}
