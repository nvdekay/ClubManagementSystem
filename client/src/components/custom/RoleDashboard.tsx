import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useDashboard } from "@/hooks/useDashboard";
import type { DashboardContext, DashboardPanelKey } from "@/services/dashboard";

function panelHref(key: DashboardPanelKey, context: DashboardContext): string | null {
  if (key === "foundingApplications") return "/workspace/applications";
  if (key === "recruitmentApplications") return "/workspace/recruitment";
  if (key === "openRecruitment" || key === "activeClubs" || key === "suspendedClubs") return "/clubs";
  if (key === "upcomingEvents") return "/events";
  if (context.workspace === "student" && key === "registrations") return "/workspace/event-registrations";
  if (key === "pendingClubApplications" || key === "approvalTasks") return "/workspace/reviews";
  if (context.workspace === "club" && key === "openCampaigns") {
    return `/club/${encodeURIComponent(context.clubId)}/recruitment`;
  }
  if (context.workspace === "club" && key === "structureHistory") {
    return `/club/${encodeURIComponent(context.clubId)}/settings`;
  }
  return null;
}

export function RoleDashboard({ context }: { context: DashboardContext }) {
  const { t, i18n } = useTranslation();
  const dashboard = useDashboard(context);

  if (dashboard.isPending) {
    return <section aria-label={t("dashboard.title")} className="mt-8">
      <p role="status" className="text-sm text-muted-app">{t("dashboard.loading")}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <AppSkeleton key={item} className="h-32" />)}
      </div>
    </section>;
  }

  if (dashboard.isError) {
    return <AppNotice tone="danger" role="alert" title={t("dashboard.loadError")} className="mt-8">
      <p>{dashboard.error.message}</p>
      <AppButton variant="secondary" onClick={() => void dashboard.refetch()}>{t("dashboard.retry")}</AppButton>
    </AppNotice>;
  }

  const allEmpty = dashboard.data.panels.every((item) => item.status === "ready" && item.count === 0);
  return <section aria-labelledby="dashboard-title" className="mt-8">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 id="dashboard-title" className="font-heading text-2xl font-bold">{t("dashboard.title")}</h2>
        <p className="mt-1 text-sm text-muted-app">{t("dashboard.description")}</p>
      </div>
      <p className="text-xs text-muted-app">{t("dashboard.generatedAt", {
        time: new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" })
          .format(new Date(dashboard.data.generatedAt)),
      })}</p>
    </div>

    {allEmpty && <AppNotice tone="info" title={t("dashboard.emptyTitle")} className="mt-5">
      <p>{t("dashboard.emptyDescription")}</p>
    </AppNotice>}

    <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {dashboard.data.panels.map((item) => {
        const href = panelHref(item.key, context);
        const labelKey: `dashboard.${DashboardPanelKey}` = `dashboard.${item.key}`;
        const content = <>
          <p className="text-sm font-semibold text-muted-app">
            {t(labelKey)}
          </p>
          {item.status === "ready" ? <p className="mt-3 font-heading text-3xl font-bold text-text-app">
            {item.count}<span className="sr-only"> {t("dashboard.itemCount", { count: item.count })}</span>
          </p> : <p role="status" className="mt-3 text-sm text-danger-app">{t("dashboard.panelError")}</p>}
        </>;
        return <li key={item.key} className="min-w-0">
          {href && item.status === "ready" ? <Link to={href}
            className="block h-full rounded-2xl border border-border-app bg-bg-app p-5 transition-colors hover:border-primary-app hover:bg-primary-soft-app focus-visible:outline-2 focus-visible:outline-ring-app">
            {content}
          </Link> : <div className="h-full rounded-2xl border border-border-app bg-bg-app p-5">{content}</div>}
        </li>;
      })}
    </ul>
  </section>;
}
