import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useMyApplications } from "@/hooks/useApplications";

export function ApplicationsPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const applications = useMyApplications(Boolean(auth.data));
  function stateLabel(state: string): string {
    switch (state) {
      case "Draft": return t("applications.statusDraft");
      case "Submitted": return t("applications.statusSubmitted");
      case "Under Review": return t("applications.statusUnderReview");
      case "Revision Requested": return t("applications.statusRevisionRequested");
      case "Approved": return t("applications.statusApproved");
      case "Rejected": return t("applications.statusRejected");
      case "Withdrawn": return t("applications.statusWithdrawn");
      case "Expired": return t("applications.statusExpired");
      default: return t("applications.state");
    }
  }

  function stateTone(state: string): AppBadgeTone {
    if (state === "Approved") return "success";
    if (state === "Rejected" || state === "Expired") return "danger";
    if (state === "Revision Requested") return "warning";
    if (state === "Draft" || state === "Withdrawn") return "neutral";
    return "info";
  }

  return (
    <>
      <PageHeader title={t("applications.title")} description={t("applications.description")} actions={
        <Link to="/workspace/applications/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary-app px-5 text-sm font-semibold text-on-primary-app shadow-sm transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none">
          <AppIcon name="plus" className="size-4" />{t("applications.new")}
        </Link>
      } />
      {auth.isPending || applications.isPending ? (
        <div className="space-y-2">{[0, 1, 2].map((item) => <AppSkeleton key={item} className="h-18 w-full" />)}</div>
      ) : auth.isError || applications.isError ? (
        <AppNotice tone="danger" role="alert" title={applications.error?.message ?? auth.error?.message ?? t("applications.loadError")}>
          <AppButton variant="secondary" onClick={() => void applications.refetch()}>{t("applications.retry")}</AppButton>
        </AppNotice>
      ) : !auth.data ? (
        <AppNotice>
          <p>{t("applications.signIn")}</p>
          <Link to="/login?returnTo=%2Fworkspace%2Fapplications" className="inline-block font-semibold text-accent-app">
            {t("applications.signInLink")}
          </Link>
        </AppNotice>
      ) : applications.data?.length ? (
        <ul className="divide-y divide-border-app border-y border-border-app">
          {applications.data.map((application) => (
            <li key={application.id}>
              <Link to={`/workspace/applications/${application.id}`} className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-2 py-4 transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app">
                <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft-app text-primary-app">
                  <AppIcon name="file" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold break-words text-text-app">{application.draft.clubName}</span>
                  {application.state !== "Draft" && <span className="mt-0.5 block text-sm text-muted-app">
                    {t("applications.version", { number: application.currentVersionNo })}</span>}
                </span>
                <AppBadge tone={stateTone(application.state)}>{stateLabel(application.state)}</AppBadge>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-app">
                  {t("applications.edit")}<AppIcon name="chevronRight" className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-16 text-center">
          <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-mint-soft-app text-mint-app"><AppIcon name="sparkles" className="size-7" /></span>
          <p className="mt-4 text-muted-app">{t("applications.none")}</p>
        </div>
      )}
    </>
  );
}
