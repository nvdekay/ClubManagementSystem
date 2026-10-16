import { useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubPeriodicReports, useChangePeriodicReport } from "@/hooks/useClubPeriodicReports";
import { ClubPeriodicReportEditor } from "./ClubPeriodicReportEditor";

export function ClubPeriodicReportsPage() {
  const { clubId = "" } = useParams();
  const { t } = useTranslation();
  const auth = useAuth();
  const allowed = Boolean(auth.data?.workspaces.some((w) => w.kind === "club" && w.clubId === clubId && w.permissions.includes("club.report.submit")));
  const query = useClubPeriodicReports(clubId, allowed);
  const action = useChangePeriodicReport(clubId);
  const [period, setPeriod] = useState("");
  async function create() {
    if (!auth.data || !period) return;
    try { await action.mutateAsync({ csrfToken: auth.data.csrfToken, action: { kind: "create", periodCode: period } }); }
    catch { /* The mutation error is displayed below. */ }
  }
  if (auth.isPending) return <AppSkeleton className="h-64 w-full" />;
  if (!allowed) return <AppNotice tone="danger">{t("clubPeriodicReports.denied")}</AppNotice>;
  return <>
    <PageHeader title={t("clubPeriodicReports.title")} description={t("clubPeriodicReports.description")} />
    {query.isPending && <AppSkeleton className="h-64 w-full" />}
    {query.isError && <AppNotice tone="danger" role="alert">{query.error.message}<AppButton onClick={() => void query.refetch()}>{t("clubPeriodicReports.retry")}</AppButton></AppNotice>}
    {query.data && <div className="mb-6 flex flex-wrap items-end gap-3"><label>{t("clubPeriodicReports.period")}<select className="block min-h-11 rounded-xl border border-border-app bg-bg-app p-3" value={period} onChange={(e) => setPeriod(e.target.value)}>
      <option value="">—</option>{query.data.periods.filter((p) => !query.data.reports.some((r) => r.periodCode === p.code)).map((p) => <option key={p.code}>{p.code}</option>)}
    </select></label><AppButton disabled={!period || action.isPending} onClick={() => void create()}>{t("clubPeriodicReports.create")}</AppButton></div>}
    {action.isError && <AppNotice tone="danger" role="alert">{action.error.message}</AppNotice>}
    {query.data?.reports.length === 0 && <AppNotice>{t("clubPeriodicReports.empty")}</AppNotice>}
    <div className="space-y-6">{query.data?.reports.map((r) => <ClubPeriodicReportEditor key={`${r.id}:${r.revision ?? 0}`} clubId={clubId} csrfToken={auth.data!.csrfToken} report={r} />)}</div>
  </>;
}
