import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { appToast } from "@/components/ui/toast/AppToast";
import { AppInput } from "@/components/ui/input/AppInput";
import { useAuth } from "@/hooks/useAuth";
import { useExportDownload, useExportOptions, useExportPreview } from "@/hooks/useExports";
import { ExportRequestError, type ExportFilter, type ExportFormat, type ExportPreview, type ExportType } from "@/services/exports";
import { cn } from "@/utils/cn";
import { saveFile } from "@/utils/saveFile";

import { AnnualReportSection } from "./AnnualReportSection";

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
  const [types, setTypes] = useState<ExportType[]>(["CLUBS"]);
  const [mode, setMode] = useState<PeriodMode>("all");
  const [semester, setSemester] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clubId, setClubId] = useState("");
  const [status, setStatus] = useState("");
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [result, setResult] = useState<ExportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const csrfToken = auth.data?.csrfToken ?? "";
  const data = options.data;
  const semesterCode = semester || data?.periods.at(-1)?.code || "";
  // FR-UC55-12: several types go in one xlsx, and a status filter belongs to exactly one type.
  const single = types.length === 1 ? types[0] : null;
  const fileFormat: ExportFormat = single ? format : "xlsx";
  const rowCount = result?.rowCount ?? null;

  function reset() {
    setResult(null);
    setError(null);
  }

  function choose(next: ExportType[]) {
    // Keep the catalogue order, so the sheets follow the order of the cards.
    setTypes(data ? data.types.map((item) => item.type).filter((value) => next.includes(value)) : next);
    setStatus("");
    reset();
  }

  function filter(): ExportFilter {
    return {
      ...(mode === "semester" && semesterCode ? { periodCode: semesterCode } : {}),
      // Whole days in local time: from the start of `from` to the end of `to`.
      ...(mode === "range" && from ? { from: new Date(`${from}T00:00:00`).toISOString() } : {}),
      ...(mode === "range" && to ? { to: new Date(`${to}T23:59:59`).toISOString() } : {}),
      ...(clubId ? { clubId } : {}), ...(single && status ? { status } : {}),
    };
  }

  async function count() {
    reset();
    try { setResult(await preview.mutateAsync({ types, filter: filter(), csrfToken })); }
    catch (failure) { setError(`${t("exports.failed")} ${(failure as Error).message}`); }
  }

  async function save() {
    reset();
    try {
      saveFile(await download.mutateAsync({ types, filter: filter(), format: fileFormat, csrfToken }));
      appToast.success(t("exports.downloaded"));
    } catch (failure) {
      if (failure instanceof ExportRequestError && failure.status === 404) setResult({ rowCount: 0, types: [] });
      else setError(`${t("exports.failed")} ${(failure as Error).message}`);
    }
  }

  const statuses = data?.types.find((item) => item.type === single)?.statuses ?? [];
  const allSelected = data ? types.length === data.types.length : false;

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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 basis-56 text-sm text-muted-app">{t("exports.typesHint")}</p>
                    <AppButton variant="secondary" onClick={() => choose(allSelected ? [] : data.types.map((item) => item.type))}>
                      {allSelected ? t("exports.clearTypes") : t("exports.selectAllTypes")}</AppButton>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">{data.types.map((item) => {
                    const selected = types.includes(item.type);
                    return (
                      <button key={item.type} type="button" aria-pressed={selected}
                        onClick={() => choose(selected ? types.filter((value) => value !== item.type) : [...types, item.type])}
                        className={cn("flex gap-3 rounded-xl border border-border-app bg-bg-app p-4 text-left transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app", { [activeTypeClass]: selected })}>
                        <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border border-border-app", { "border-brand-app bg-brand-app text-on-brand-app": selected })}>
                          {selected && <AppIcon name="check" className="size-3.5" />}</span>
                        <span className="min-w-0">
                          <span className="block font-medium">{t(`exports.type_${item.type}`)}</span>
                          <span className="mt-1 block text-sm text-muted-app">{t(`exports.hint_${item.type}`)}</span>
                        </span>
                      </button>);
                  })}
                  </div>
                  {!types.length && <p className="text-sm text-danger-app" role="alert">{t("exports.noTypes")}</p>}
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
                    <AppSelect className="mt-1.5 block w-full font-normal" label={t("exports.status")} value={single ? status : ""}
                      disabled={!statuses.length} onChange={(value) => { setStatus(value); reset(); }}
                      options={[{ value: "", label: t("exports.allStatuses") }, ...statuses.map((value) => ({ value, label: value }))]} />
                    {types.length > 1 && <p className="mt-1 text-xs font-normal text-muted-app">{t("exports.statusSingleOnly")}</p>}
                  </div>
                </div>

                <fieldset className="space-y-3">
                  <legend className="font-heading text-base font-semibold">{t("exports.format")}</legend>
                  <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border-app bg-surface-app p-1">{data.formats.map((value) => (
                    <button key={value} type="button" aria-pressed={fileFormat === value} onClick={() => setFormat(value)}
                      disabled={!single && value !== "xlsx"}
                      className={cn(choiceClass, "uppercase disabled:opacity-50 disabled:hover:text-muted-app", { [activeChoiceClass]: fileFormat === value })}>{value}</button>))}
                  </div>
                  {types.length > 1 && <p className="text-sm text-muted-app">{t("exports.formatMultiHint")}</p>}
                </fieldset>

                {result && <AppNotice tone={result.rowCount ? "info" : "warning"} role="status">
                  {result.rowCount ? t("exports.rows", { count: result.rowCount }) : t("exports.noRows")}
                  {result.rowCount > 0 && result.types.length > 1 && <ul className="mt-2 space-y-1">{result.types.map((item) => (
                    <li key={item.type} className="flex flex-wrap justify-between gap-x-3">
                      <span>{t(`exports.type_${item.type}`)}</span>
                      <span className="font-medium">{item.rowCount ? t("exports.typeRows", { count: item.rowCount }) : t("exports.typeEmpty")}</span>
                    </li>))}</ul>}
                </AppNotice>}
                {error && <AppNotice tone="danger" role="alert">{error}</AppNotice>}
                <div className="flex flex-wrap gap-3 border-t border-border-app pt-6">
                  <AppButton variant="secondary" disabled={preview.isPending || !types.length} onClick={() => void count()}>
                    {preview.isPending ? t("exports.previewing") : t("exports.preview")}</AppButton>
                  <AppButton disabled={download.isPending || rowCount === 0 || !types.length} onClick={() => void save()}>
                    {download.isPending ? t("exports.downloading") : t("exports.download")}</AppButton>
                </div>
                <p className="text-xs text-muted-app">{t("exports.auditNote")}</p>
              </div>}
      {isOfficer && data && <AnnualReportSection years={data.annualYears} csrfToken={csrfToken} />}
    </>
  );
}
