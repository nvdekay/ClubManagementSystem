import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
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

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/workspace" className="text-sm font-semibold text-accent-app">{t("applications.back")}</Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading">{t("applications.title")}</h1>
          <p className="mt-2 text-muted-app">{t("applications.description")}</p>
        </div>
        <Link to="/workspace/applications/new" className="inline-flex h-11 items-center justify-center rounded-md bg-primary-app px-3 text-on-primary-app transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none">
          {t("applications.new")}
        </Link>
      </div>
      {auth.isPending || applications.isPending ? (
        <AppSkeleton className="mt-8 h-48 w-full" />
      ) : auth.isError || applications.isError ? (
        <AppCard className="mt-8 space-y-3">
          <p role="alert" className="text-danger-app">{applications.error?.message ?? auth.error?.message ?? t("applications.loadError")}</p>
          <AppButton variant="secondary" onClick={() => void applications.refetch()}>{t("applications.retry")}</AppButton>
        </AppCard>
      ) : !auth.data ? (
        <AppCard className="mt-8">
          <p>{t("applications.signIn")}</p>
          <Link to="/login?returnTo=%2Fworkspace%2Fapplications" className="mt-3 inline-block font-semibold text-accent-app">
            {t("applications.signInLink")}
          </Link>
        </AppCard>
      ) : applications.data?.length ? (
        <div className="mt-8 space-y-3">
          {applications.data.map((application) => (
            <AppCard key={application.id} className="flex-row flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="break-words font-semibold font-heading">{application.draft.clubName}</h2>
                <p className="mt-1 text-sm text-muted-app">
                  {t("applications.state")}: {stateLabel(application.state)}
                  {application.state !== "Draft" && ` · ${t("applications.version", { number: application.currentVersionNo })}`}
                </p>
              </div>
              <Link to={`/workspace/applications/${application.id}`} className="inline-flex h-11 items-center justify-center rounded-md border border-border-app px-3 text-text-app transition-colors hover:bg-surface-app focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none">
                {t("applications.edit")}
              </Link>
            </AppCard>
          ))}
        </div>
      ) : <p className="mt-8 text-muted-app">{t("applications.none")}</p>}
    </div>
  );
}
