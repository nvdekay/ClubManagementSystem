import { useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppEmptyState } from "@/components/ui/empty-state/AppEmptyState";
import { AppFieldError } from "@/components/ui/field/AppFieldError";
import { AppRequiredMark } from "@/components/ui/field/AppRequiredMark";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubPeriodicReports, useChangePeriodicReport } from "@/hooks/useClubPeriodicReports";
import { useFieldValidation } from "@/hooks/useFieldValidation";
import { ClubPeriodicReportEditor } from "./ClubPeriodicReportEditor";

export function ClubPeriodicReportsPage() {
  const { clubId = "" } = useParams();
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const allowed = Boolean(auth.data?.workspaces.some((w) => w.kind === "club" && w.clubId === clubId && w.permissions.includes("club.report.submit")));
  const query = useClubPeriodicReports(clubId, allowed);
  const action = useChangePeriodicReport(clubId);
  const [period, setPeriod] = useState("");
  const field = useFieldValidation({ period: period ? null : t("common.chooseRequired") });

  async function create() {
    if (!field.touchAll() || !auth.data) return;
    try {
      await action.mutateAsync({ csrfToken: auth.data.csrfToken, action: { kind: "create", periodCode: period } });
      setPeriod("");
      field.reset();
    } catch { /* The mutation error is displayed below. */ }
  }

  if (auth.isPending) return <AppSkeleton className="h-64 w-full" />;
  if (!allowed) return <AppNotice tone="danger">{t("clubPeriodicReports.denied")}</AppNotice>;

  const now = new Date();
  const availablePeriods = (query.data?.periods ?? []).filter((p) => {
    const alreadyExists = query.data?.reports.some((r) => r.periodCode === p.code);
    return !alreadyExists && Boolean(p.isOpen) && new Date(p.dueAt) >= now;
  });
  const selectedMeta = query.data?.periods.find((p) => p.code === period);

  return <>
    <PageHeader title={t("clubPeriodicReports.title")} description={t("clubPeriodicReports.description")} />
    {query.isPending && <AppSkeleton className="h-64 w-full" />}
    {query.isError && <AppNotice tone="danger" role="alert">{query.error.message}<AppButton onClick={() => void query.refetch()}>{t("clubPeriodicReports.retry")}</AppButton></AppNotice>}
    {query.data && (
      <div className="mb-6 space-y-4 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {query.data.periods.map((p) => {
            const expired = new Date(p.dueAt) < now;
            return (
              <span key={p.code} className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-border-app bg-surface-app px-3 py-1.5 text-sm">
                <span className="font-semibold">{p.code}</span>
                {!p.isOpen ? (
                  <AppBadge tone="neutral">{t("clubPeriodicReports.periodClosedBadge")}</AppBadge>
                ) : expired ? (
                  <AppBadge tone="danger">{t("clubPeriodicReports.periodExpiredBadge")}</AppBadge>
                ) : (
                  <AppBadge tone="success">{t("clubPeriodicReports.periodOpenBadge", { date: new Date(p.dueAt).toLocaleDateString(i18n.language) })}</AppBadge>
                )}
              </span>
            );
          })}
        </div>
        {availablePeriods.length > 0 ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56">
              <p className="text-sm font-medium text-text-app">{t("clubPeriodicReports.period")}<AppRequiredMark /></p>
              <AppSelect
                className="mt-1.5 block w-full"
                label={t("clubPeriodicReports.period")}
                value={period}
                required
                invalid={Boolean(field.error("period"))}
                options={[{ value: "", label: "—" }, ...availablePeriods.map((p) => ({ value: p.code, label: p.code }))]}
                onChange={(value) => { setPeriod(value); field.touch("period"); }}
              />
              <AppFieldError message={field.error("period")} />
            </div>
            <AppButton disabled={action.isPending} onClick={() => void create()}>{t("clubPeriodicReports.create")}</AppButton>
          </div>
        ) : (
          <p className="text-sm text-muted-app">{t("clubPeriodicReports.notOpenedHint")}</p>
        )}
        {selectedMeta?.announcement && (
          <AppNotice title={t("clubPeriodicReports.announcementTitle")}>
            <p className="whitespace-pre-wrap break-words">{selectedMeta.announcement}</p>
          </AppNotice>
        )}
      </div>
    )}
    {action.isError && <AppNotice tone="danger" role="alert">{action.error.message}</AppNotice>}
    {query.data?.reports.length === 0 && <AppEmptyState variant="boxed" message={t("clubPeriodicReports.empty")} />}
    <div className="space-y-6">
      {query.data?.reports.map((r) => (
        <ClubPeriodicReportEditor
          key={`${r.id}:${r.revision ?? 0}`}
          clubId={clubId}
          csrfToken={auth.data!.csrfToken}
          report={r}
        />
      ))}
    </div>
  </>;
}
