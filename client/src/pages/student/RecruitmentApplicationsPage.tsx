import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useMyRecruitmentApplications, useRecruitmentApplicationAction } from "@/hooks/useRecruitmentApplications";
import type { RecruitmentApplication } from "@/services/recruitmentApplications";

export function RecruitmentApplicationsPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const applications = useMyRecruitmentApplications(Boolean(auth.data));
  const action = useRecruitmentApplicationAction();
  function stateLabel(state: RecruitmentApplication["state"]): string {
    switch (state) {
      case "Draft": return t("recruitmentApplications.stateDraft");
      case "Submitted": return t("recruitmentApplications.stateSubmitted");
      case "Screening": return t("recruitmentApplications.stateScreening");
      case "Shortlisted": return t("recruitmentApplications.stateShortlisted");
      case "Accepted": return t("recruitmentApplications.stateAccepted");
      case "Rejected": return t("recruitmentApplications.stateRejected");
      case "Waitlisted": return t("recruitmentApplications.stateWaitlisted");
      case "Onboarded": return t("recruitmentApplications.stateOnboarded");
      case "Withdrawn": return t("recruitmentApplications.stateWithdrawn");
      case "Declined": return t("recruitmentApplications.stateDeclined");
    }
  }

  async function withdraw(applicationId: string) {
    if (!auth.data || !window.confirm(t("recruitmentApplications.withdrawConfirm"))) return;
    try {
      await action.mutateAsync({ kind: "withdraw", applicationId,
        csrfToken: auth.data.csrfToken });
    } catch { /* The mutation error is rendered in the page. */ }
  }

  if (auth.isPending || (auth.data && applications.isPending)) {
    return <div className="mx-auto max-w-4xl space-y-4"><AppSkeleton className="h-28 w-full" />
      <AppSkeleton className="h-28 w-full" /></div>;
  }
  if (!auth.data) return <AppCard className="mx-auto max-w-3xl">
    <p>{t("recruitmentApplications.signIn")}</p>
    <Link className="mt-3 inline-block font-semibold text-accent-app"
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>
      {t("recruitmentApplications.signInLink")}</Link>
  </AppCard>;
  if (applications.isError || !applications.data) return <AppCard className="mx-auto max-w-3xl space-y-4">
    <p role="alert" className="text-danger-app">{applications.error?.message ?? t("recruitmentApplications.listError")}</p>
    <AppButton variant="secondary" onClick={() => void applications.refetch()}>{t("recruitmentApplications.retry")}</AppButton>
  </AppCard>;

  return <div className="mx-auto max-w-4xl">
    <Link to="/student" className="text-sm font-semibold text-accent-app">{t("recruitmentApplications.back")}</Link>
    <header className="mt-5 border-b border-border-app pb-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-app">{t("recruitmentApplications.campaign")}</p>
      <h1 className="mt-2 text-3xl font-bold font-heading sm:text-4xl">{t("recruitmentApplications.title")}</h1>
      <p className="mt-3 text-muted-app">{t("recruitmentApplications.description")}</p>
    </header>
    {action.isError && <p role="alert" className="mt-5 text-danger-app">{action.error.message || t("recruitmentApplications.actionError")}</p>}
    {applications.data.length === 0 ? <AppCard className="mt-6 p-6">
      <p className="font-semibold">{t("recruitmentApplications.noApplications")}</p>
      <Link to="/clubs" className="mt-4 inline-block font-semibold text-accent-app">{t("recruitmentApplications.explore")}</Link>
    </AppCard> : <div className="mt-6 space-y-4">
      {applications.data.map((application) => <AppCard key={application.id} className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-app">{application.clubName ?? t("recruitmentApplications.campaign")}</p>
            <h2 className="mt-1 break-words text-xl font-bold font-heading">{application.campaignTitle ?? application.position}</h2>
            <p className="mt-2 text-sm text-muted-app">{t("recruitmentApplications.positions")}: {application.position}</p>
          </div>
          <span className="rounded-full border border-border-app px-3 py-1 text-sm font-semibold">{stateLabel(application.state)}</span>
        </div>
        {application.decisionReason && <p className="mt-4 rounded-lg bg-surface-app p-3 text-sm">
          <span className="font-semibold">{t("recruitmentApplications.decisionReason")}: </span>{application.decisionReason}</p>}
        <p className="mt-4 text-sm text-muted-app">{t("recruitmentApplications.statusHint")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {application.state === "Draft" && <Link to={`/workspace/recruitment/${application.campaignId}`}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary-app px-4 py-2 font-semibold text-on-primary-app">
            {t("recruitmentApplications.formTitle")}</Link>}
          {["Submitted", "Screening", "Shortlisted"].includes(application.state)
            && <AppButton variant="secondary" disabled={action.isPending}
              onClick={() => void withdraw(application.id)}>{t("recruitmentApplications.withdraw")}</AppButton>}
        </div>
      </AppCard>)}
    </div>}
  </div>;
}
