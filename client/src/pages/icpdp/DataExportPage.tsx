import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { appToast } from "@/components/ui/toast/AppToast";
import { AppInput } from "@/components/ui/input/AppInput";
import { useAuth } from "@/hooks/useAuth";
import { useExportDownload, useExportOptions, useExportPreview } from "@/hooks/useExports";
import { ExportRequestError, type ExportFilter, type ExportFormat, type ExportType } from "@/services/exports";
import { cn } from "@/utils/cn";

type PeriodMode = "all" | "semester" | "range";
const choiceClass = "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-app transition-colors hover:text-text-app sm:min-h-9";
const activeChoiceClass = "bg-segment-app text-text-app shadow-xs";
const activeTypeClass = "border-brand-app bg-primary-soft-app ring-1 ring-brand-app";

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
          <Link className="font-semibold text-primary-app hover:underline" to="/login?returnTo=%2Fworkspace%2Fexports">{t("exports.signInLink")}</Link>
        </AppNotice>
          : !isOfficer ? <AppNotice tone="danger" role="alert">{t("exports.forbidden")}</AppNotice>
            : options.isPending ? <AppSkeleton className="h-44 w-full" />
              : options.isError || !data ? <AppNotice tone="danger" role="alert"
                title={`${t("exports.loadError")} ${options.error?.message ?? ""}`}>
                <AppButton onClick={() => void options.refetch()}>{t("exports.retry")}</AppButton>
              </AppNotice> : <div className="max-w-4xl space-y-6 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:p-6">
                <fieldset className="space-y-3">
                  <legend className="font-heading text-base font-semibold">{t("exports.dataType")}</legend>
                  <div className="grid gap-3 sm:grid-cols-2">{data.types.map((item) => (
                    <button key={item.type} type="button" aria-pressed={type === item.type}
                      onClick={() => { setType(item.type); setStatus(""); reset(); }}
                      className={cn("rounded-xl border border-border-app bg-bg-app p-4 text-left transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app", { [activeTypeClass]: type === item.type })}>
                      <span className="block font-medium">{t(`exports.type_${item.type}`)}</span>
                      <span className="mt-1 block text-sm text-muted-app">{t(`exports.hint_${item.type}`)}</span>
                    </button>))}
                  </div>
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="font-heading text-base font-semibold">{t("exports.period")}</legend>
                  <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border-app bg-surface-app p-1">{(["all", "semester", "range"] as const).map((value) => (
                    <button key={value} type="button" aria-pressed={mode === value}
                      onClick={() => { setMode(value); reset(); }} className={cn(choiceClass, { [activeChoiceClass]: mode === value })}>
                      {t(value === "all" ? "exports.periodAll" : value === "semester" ? "exports.periodSemester" : "exports.periodRange")}
                    </button>))}
                  </div>
                  {mode === "semester" && data.periods.length > 0 && <div className="text-sm font-medium text-text-app">{t("exports.semester")}
                    <AppSelect className="mt-1.5 block w-40 font-normal" label={t("exports.semester")} value={semesterCode}
                      onChange={(value) => { setSemester(value); reset(); }}
                      options={data.periods.map((item) => ({ value: item.code, label: item.code }))} /></div>}
                  {mode === "range" && <div className="flex flex-wrap gap-4">
                    <label className="block text-sm font-medium text-text-app">{t("exports.from")}<AppInput type="date" className="mt-1.5 block font-normal" value={from}
                      onChange={(event) => { setFrom(event.target.value); reset(); }} /></label>
                    <label className="block text-sm font-medium text-text-app">{t("exports.to")}<AppInput type="date" className="mt-1.5 block font-normal" value={to}
                      onChange={(event) => { setTo(event.target.value); reset(); }} /></label>
                  </div>}
                </fieldset>

                <div className="flex flex-wrap gap-4">
                  <div className="min-w-0 flex-1 basis-56 text-sm font-medium text-text-app">{t("exports.club")}
                    <AppSelect className="mt-1.5 block w-full font-normal" label={t("exports.club")} value={clubId}
                      onChange={(value) => { setClubId(value); reset(); }}
                      options={[{ value: "", label: t("exports.allClubs") }, ...data.clubs.map((club) => ({ value: club.id, label: club.name }))]} />
                  </div>
                  <div className="min-w-0 flex-1 basis-56 text-sm font-medium text-text-app">{t("exports.status")}
                    <AppSelect className="mt-1.5 block w-full font-normal" label={t("exports.status")} value={status}
                      onChange={(value) => { setStatus(value); reset(); }}
                      options={[{ value: "", label: t("exports.allStatuses") }, ...statuses.map((value) => ({ value, label: value }))]} />
                  </div>
                </div>

                <fieldset className="space-y-3">
                  <legend className="font-heading text-base font-semibold">{t("exports.format")}</legend>
                  <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border-app bg-surface-app p-1">{data.formats.map((value) => (
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
