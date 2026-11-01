import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { appToast } from "@/components/ui/toast/AppToast";
import { useAuth } from "@/hooks/useAuth";
import { useExportDownload, useExportOptions, useExportPreview } from "@/hooks/useExports";
import { ExportRequestError, type ExportFilter, type ExportFormat, type ExportType } from "@/services/exports";
import { cn } from "@/utils/cn";

type PeriodMode = "all" | "semester" | "range";
const dateInputClass = "mt-1 block min-h-11 rounded-xl border border-border-app bg-bg-app px-3 text-text-app focus-visible:border-ring-app focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:outline-none";
const choiceClass = "min-h-10 rounded-full border border-border-app px-4 text-sm text-muted-app";
const activeChoiceClass = "border-primary-app bg-primary-soft-app text-primary-app";

export function DataExportPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const isOfficer = auth.data?.systemRoles.includes("ICPDP_OFFICER") ?? false;
  const options = useExportOptions(isOfficer);
  const preview = useExportPreview();
  const download = useExportDownload();
  const [type, setType] = useState<ExportType>("CLUBS");
  const [mode, setMode] = useState<PeriodMode>("all");
  const [semester, setSemester] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clubId, setClubId] = useState("");
  const [status, setStatus] = useState("");
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const csrfToken = auth.data?.csrfToken ?? "";
  const data = options.data;
  const semesterCode = semester || data?.periods.at(-1)?.code || "";

  function reset() {
    setRowCount(null);
    setError(null);
  }

  function filter(): ExportFilter {
    return {
      ...(mode === "semester" && semesterCode ? { periodCode: semesterCode } : {}),
      // Whole days in local time: from the start of `from` to the end of `to`.
      ...(mode === "range" && from ? { from: new Date(`${from}T00:00:00`).toISOString() } : {}),
      ...(mode === "range" && to ? { to: new Date(`${to}T23:59:59`).toISOString() } : {}),
      ...(clubId ? { clubId } : {}), ...(status ? { status } : {}),
    };
  }

  async function count() {
    reset();
    try { setRowCount(await preview.mutateAsync({ type, filter: filter(), csrfToken })); }
    catch (failure) { setError(`${t("exports.failed")} ${(failure as Error).message}`); }
  }

  async function save() {
    reset();
    try {
      const file = await download.mutateAsync({ type, filter: filter(), format, csrfToken });
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.fileName;
      link.click();
      URL.revokeObjectURL(url);
      appToast.success(t("exports.downloaded"));
    } catch (failure) {
      if (failure instanceof ExportRequestError && failure.status === 404) setRowCount(0);
      else setError(`${t("exports.failed")} ${(failure as Error).message}`);
    }
  }

  const statuses = data?.types.find((item) => item.type === type)?.statuses ?? [];

  return (
    <>
      <PageHeader title={t("exports.title")} description={t("exports.description")} />
      {auth.isPending ? <AppSkeleton className="h-44 w-full" />
        : !auth.data ? <AppNotice>
          <p>{t("exports.signIn")}</p>
          <Link className="font-semibold text-accent-app" to="/login?returnTo=%2Fworkspace%2Fexports">{t("exports.signInLink")}</Link>
        </AppNotice>
          : !isOfficer ? <AppNotice tone="danger" role="alert">{t("exports.forbidden")}</AppNotice>
            : options.isPending ? <AppSkeleton className="h-44 w-full" />
              : options.isError || !data ? <AppNotice tone="danger" role="alert"
                title={`${t("exports.loadError")} ${options.error?.message ?? ""}`}>
                <AppButton onClick={() => void options.refetch()}>{t("exports.retry")}</AppButton>
              </AppNotice> : <div className="max-w-4xl space-y-8">
                <fieldset className="space-y-3">
                  <legend className="font-heading text-lg font-bold">{t("exports.dataType")}</legend>
                  <div className="grid gap-3 sm:grid-cols-2">{data.types.map((item) => (
                    <button key={item.type} type="button" aria-pressed={type === item.type}
                      onClick={() => { setType(item.type); setStatus(""); reset(); }}
                      className={cn("rounded-2xl border border-border-app p-4 text-left", { [activeChoiceClass]: type === item.type })}>
                      <span className="block font-semibold">{t(`exports.type_${item.type}`)}</span>
                      <span className="mt-1 block text-sm text-muted-app">{t(`exports.hint_${item.type}`)}</span>
                    </button>))}
                  </div>
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="font-heading text-lg font-bold">{t("exports.period")}</legend>
                  <div className="flex flex-wrap gap-2">{(["all", "semester", "range"] as const).map((value) => (
                    <button key={value} type="button" aria-pressed={mode === value}
                      onClick={() => { setMode(value); reset(); }} className={cn(choiceClass, { [activeChoiceClass]: mode === value })}>
                      {t(value === "all" ? "exports.periodAll" : value === "semester" ? "exports.periodSemester" : "exports.periodRange")}
                    </button>))}
                  </div>
                  {mode === "semester" && data.periods.length > 0 && <div className="text-sm">{t("exports.semester")}
                    <AppSelect className="mt-1 w-40" label={t("exports.semester")} value={semesterCode}
                      onChange={(value) => { setSemester(value); reset(); }}
                      options={data.periods.map((item) => ({ value: item.code, label: item.code }))} /></div>}
                  {mode === "range" && <div className="flex flex-wrap gap-4">
                    <label className="text-sm">{t("exports.from")}<input type="date" className={dateInputClass} value={from}
                      onChange={(event) => { setFrom(event.target.value); reset(); }} /></label>
                    <label className="text-sm">{t("exports.to")}<input type="date" className={dateInputClass} value={to}
                      onChange={(event) => { setTo(event.target.value); reset(); }} /></label>
                  </div>}
                </fieldset>

                <div className="flex flex-wrap gap-4">
                  <div className="min-w-0 flex-1 basis-56 text-sm">{t("exports.club")}
                    <AppSelect className="mt-1 w-full" label={t("exports.club")} value={clubId}
                      onChange={(value) => { setClubId(value); reset(); }}
                      options={[{ value: "", label: t("exports.allClubs") }, ...data.clubs.map((club) => ({ value: club.id, label: club.name }))]} />
                  </div>
                  <div className="min-w-0 flex-1 basis-56 text-sm">{t("exports.status")}
                    <AppSelect className="mt-1 w-full" label={t("exports.status")} value={status}
                      onChange={(value) => { setStatus(value); reset(); }}
                      options={[{ value: "", label: t("exports.allStatuses") }, ...statuses.map((value) => ({ value, label: value }))]} />
                  </div>
                </div>

                <fieldset className="space-y-3">
                  <legend className="font-heading text-lg font-bold">{t("exports.format")}</legend>
                  <div className="flex flex-wrap gap-2">{data.formats.map((value) => (
                    <button key={value} type="button" aria-pressed={format === value} onClick={() => setFormat(value)}
                      className={cn(choiceClass, "uppercase", { [activeChoiceClass]: format === value })}>{value}</button>))}
                  </div>
                </fieldset>

                {rowCount !== null && <AppNotice tone={rowCount ? "info" : "warning"} role="status">
                  {rowCount ? t("exports.rows", { count: rowCount }) : t("exports.noRows")}</AppNotice>}
                {error && <AppNotice tone="danger" role="alert">{error}</AppNotice>}
                <div className="flex flex-wrap gap-3 border-t border-border-app pt-6">
                  <AppButton variant="secondary" disabled={preview.isPending} onClick={() => void count()}>
                    {preview.isPending ? t("exports.previewing") : t("exports.preview")}</AppButton>
                  <AppButton disabled={download.isPending || rowCount === 0} onClick={() => void save()}>
                    {download.isPending ? t("exports.downloading") : t("exports.download")}</AppButton>
                </div>
                <p className="text-xs text-muted-app">{t("exports.auditNote")}</p>
              </div>}
    </>
  );
}
