import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
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
  return <div className="mx-auto max-w-6xl">
    <Link to="/icpdp" className="text-sm font-semibold text-accent-app">{t("boardNominations.queueBack")}</Link>
    <header className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-border-app pb-6">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-app">ICPDP</p>
        <h1 className="mt-2 text-3xl font-bold font-heading sm:text-4xl">{t("boardNominations.queueTitle")}</h1>
        <p className="mt-3 text-muted-app">{t("boardNominations.queueDescription")}</p></div>
      {queue.data && <span className="rounded-full border border-border-app bg-surface-app px-4 py-2 text-sm font-semibold">
        {t("boardNominations.openCount", { count: queue.data.length })}</span>}
    </header>
    {auth.isPending ? <div className="mt-8 grid gap-4 md:grid-cols-2">
      <AppSkeleton className="h-48 w-full" /><AppSkeleton className="h-48 w-full" />
    </div> : !auth.data ? <AppCard className="mt-8">{t("boardNominations.signIn")}</AppCard>
      : !isOfficer ? <AppCard className="mt-8"><p role="alert" className="text-danger-app">{t("boardNominations.unauthorized")}</p></AppCard>
        : queue.isPending ? <div className="mt-8 grid gap-4 md:grid-cols-2"><AppSkeleton className="h-48 w-full" /><AppSkeleton className="h-48 w-full" /></div>
        : queue.isError ? <AppCard className="mt-8 space-y-4"><p role="alert" className="text-danger-app">{queue.error.message || t("boardNominations.queueError")}</p>
          <AppButton variant="secondary" onClick={() => void queue.refetch()}>{t("boardNominations.retry")}</AppButton></AppCard>
          : queue.data?.length ? <div className="mt-8 grid gap-4 md:grid-cols-2">
            {queue.data.map((nomination) => <AppCard key={nomination.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3"><div>
                <h2 className="text-xl font-bold font-heading">{nomination.clubName}</h2>
                <p className="mt-1 text-sm text-muted-app">{nomination.term.name}</p></div>
                <span className="rounded-full bg-warning-app/15 px-3 py-1 text-xs font-semibold text-warning-app">{nomination.seats.length}</span></div>
              <p className="mt-4 text-sm text-muted-app">{t("boardNominations.waitingSince", { date: date(nomination.submittedAt) })}</p>
              <ul className="mt-4 space-y-1 text-sm">{nomination.seats.map((seat) => <li key={seat.id}>{seat.positionName} — {seat.displayName}</li>)}</ul>
              <AppButton className="mt-5 w-full" onClick={() => navigate(`/workspace/board-nominations/${nomination.id}`)}>
                {t("boardNominations.open")}</AppButton>
            </AppCard>)}</div> : <AppCard className="mt-8 py-14 text-center">
              <h2 className="text-xl font-bold font-heading">{t("boardNominations.queueEmpty")}</h2>
              <p className="mt-2 text-muted-app">{t("boardNominations.queueEmptyHint")}</p>
            </AppCard>}
  </div>;
}
