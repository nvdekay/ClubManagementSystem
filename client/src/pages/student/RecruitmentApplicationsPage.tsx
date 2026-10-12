import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
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

  function stateTone(state: RecruitmentApplication["state"]): AppBadgeTone {
    if (state === "Accepted" || state === "Onboarded") return "success";
    if (state === "Rejected" || state === "Declined") return "danger";
    if (state === "Waitlisted") return "warning";
    if (state === "Draft" || state === "Withdrawn") return "neutral";
    return "info";
  }

  const header = <PageHeader title={t("recruitmentApplications.title")} description={t("recruitmentApplications.description")} />;

  if (auth.isPending || (auth.data && applications.isPending)) {
    return <>{header}<div className="space-y-2"><AppSkeleton className="h-28 w-full" />
      <AppSkeleton className="h-28 w-full" /></div></>;
  }
  if (!auth.data) return <>{header}<AppNotice>
    <p>{t("recruitmentApplications.signIn")}</p>
    <Link className="inline-block font-semibold text-accent-app"
      to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>
      {t("recruitmentApplications.signInLink")}</Link>
  </AppNotice></>;
  if (applications.isError || !applications.data) return <>{header}
    <AppNotice tone="danger" role="alert" title={applications.error?.message ?? t("recruitmentApplications.listError")}>
      <AppButton variant="secondary" onClick={() => void applications.refetch()}>{t("recruitmentApplications.retry")}</AppButton>
    </AppNotice></>;

  return <>
    {header}
    {action.isError && <AppNotice tone="danger" role="alert" className="mb-5">{action.error.message || t("recruitmentApplications.actionError")}</AppNotice>}
    {applications.data.length === 0 ? <div className="py-16 text-center">
      <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-mint-soft-app text-mint-app"><AppIcon name="send" className="size-7" /></span>
      <p className="mt-4 font-semibold">{t("recruitmentApplications.noApplications")}</p>
      <Link to="/clubs" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-app px-5 text-sm font-semibold text-on-primary-app shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
        <AppIcon name="compass" className="size-4" />{t("recruitmentApplications.explore")}</Link>
    </div> : <ul className="divide-y divide-border-app border-y border-border-app">
      {applications.data.map((application) => <li key={application.id} className="flex flex-wrap items-start gap-x-4 gap-y-3 px-2 py-5">
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft-app text-primary-app">
          <AppIcon name="send" />
        </span>
        <div className="min-w-0 flex-1 basis-60">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 font-heading text-lg font-bold break-words">{application.campaignTitle ?? application.position}</h2>
            <AppBadge tone={stateTone(application.state)}>{stateLabel(application.state)}</AppBadge>
          </div>
          <p className="mt-1 text-sm text-muted-app">
            {application.clubName ?? t("recruitmentApplications.campaign")} · {t("recruitmentApplications.positions")}: {application.position}
          </p>
          {application.decisionReason && <AppNotice className="mt-3">
            <p><span className="font-semibold">{t("recruitmentApplications.decisionReason")}: </span>{application.decisionReason}</p>
          </AppNotice>}
          <p className="mt-2 text-sm text-muted-app">{t("recruitmentApplications.statusHint")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {application.state === "Draft" && <Link to={`/workspace/recruitment/${application.campaignId}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary-app px-5 text-sm font-semibold text-on-primary-app shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-app">
            {t("recruitmentApplications.formTitle")}<AppIcon name="chevronRight" className="size-4" /></Link>}
          {["Submitted", "Screening", "Shortlisted"].includes(application.state)
            && <AppButton variant="secondary" disabled={action.isPending}
              onClick={() => void withdraw(application.id)}>{t("recruitmentApplications.withdraw")}</AppButton>}
        </div>
      </li>)}
    </ul>}
  </>;
}
