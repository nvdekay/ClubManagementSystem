import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { appToast } from "@/components/ui/toast/AppToast";
import { useAnnualReportDownload, useAnnualReportPreview } from "@/hooks/useExports";
import type { DimensionCode } from "@/services/evaluationSchemes";
import type { Classification } from "@/services/evaluations";
import {
  ExportRequestError, MAX_ACHIEVEMENTS, MAX_REMARKS, type AnnualFormat, type AnnualYearOption, type Season, type Trend,
} from "@/services/exports";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/formatMoney";
import { saveFile } from "@/utils/saveFile";

const SEASONS: Season[] = ["SPRING", "SUMMER", "FALL"];
const CLASSIFICATIONS: Classification[] = ["EXCELLENT", "GOOD", "FAIR", "NEEDS_IMPROVEMENT"];
const FORMATS: AnnualFormat[] = ["pdf", "xlsx"];
const choiceClass = "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-app uppercase transition-colors hover:text-text-app sm:min-h-9";
const activeChoiceClass = "bg-segment-app text-text-app shadow-xs";

function seasonLabel(t: TFunction, season: Season): string {
  switch (season) {
    case "SPRING": return t("exports.season_SPRING");
    case "SUMMER": return t("exports.season_SUMMER");
    default: return t("exports.season_FALL");
  }
}

function trendLabel(t: TFunction, trend: Trend): string {
  switch (trend) {
    case "UP": return t("exports.trend_UP");
    case "DOWN": return t("exports.trend_DOWN");
    default: return t("exports.trend_STABLE");
  }
}

function ratingLabel(t: TFunction, value: Classification): string {
  switch (value) {
    case "EXCELLENT": return t("evaluations.ratingEXCELLENT");
    case "GOOD": return t("evaluations.ratingGOOD");
    case "FAIR": return t("evaluations.ratingFAIR");
    default: return t("evaluations.ratingNEEDS_IMPROVEMENT");
  }
}

function ratingTone(value: Classification): AppBadgeTone {
  return value === "EXCELLENT" ? "success" : value === "GOOD" ? "info" : value === "FAIR" ? "warning" : "danger";
}

function stateLabel(t: TFunction, state: string): string {
  switch (state) {
    case "Active": return t("clubLifecycle.state_Active");
    case "Suspended": return t("clubLifecycle.state_Suspended");
    case "Dissolving": return t("clubLifecycle.state_Dissolving");
    case "Dissolved": return t("clubLifecycle.state_Dissolved");
    case "Pending Setup": return t("clubLifecycle.state_Pending Setup");
    default: return state;
  }
}

function dimensionLabel(t: TFunction, code: DimensionCode): string {
  return t(`evaluationSchemes.dim_${code}`);
}

function score(value: number | null): string {
  return value === null ? "—" : String(value);
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-3 border-t border-border-app pt-5">
    <h3 className="font-heading text-base font-semibold">{title}</h3>
    {children}
  </section>;
}

function Figures({ items }: { items: [string, ReactNode][] }) {
  return <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(([label, value]) =>
    <div key={label} className="rounded-xl border border-border-app bg-surface-app px-4 py-3">
      <dt className="text-xs text-muted-app">{label}</dt>
      <dd className="mt-1 font-heading text-xl font-semibold tabular-nums">{value}</dd>
    </div>)}</dl>;
}

function ClubList({ label, clubs }: { label: string; clubs: string[] }) {
  const { t } = useTranslation();
  return <div><p className="text-sm font-medium">{label}</p>
    <p className="mt-1 text-sm break-words text-muted-app">{clubs.length ? clubs.join(", ") : t("exports.annualNone")}</p></div>;
}

interface AnnualReportSectionProps {
  years: AnnualYearOption[];
  csrfToken: string;
}

/** UC55 A2: pick an academic year, preview the six report parts, choose achievements and download. */
export function AnnualReportSection({ years, csrfToken }: AnnualReportSectionProps) {
  const { t, i18n } = useTranslation();
  const preview = useAnnualReportPreview();
  const download = useAnnualReportDownload();
  const [year, setYear] = useState(years[0]?.year ?? 0);
  const [selected, setSelected] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");
  const [format, setFormat] = useState<AnnualFormat>("pdf");
  const option = years.find((item) => item.year === year);
  // Guard against a preview that resolved after the year changed.
  const report = preview.data?.year === year ? preview.data : undefined;
  const failure = preview.error ?? download.error;

  function changeYear(value: number) {
    setYear(value);
    setSelected([]);
    preview.reset();
    download.reset();
  }

  function toggle(key: string) {
    setSelected((current) => current.includes(key) ? current.filter((item) => item !== key)
      : current.length < MAX_ACHIEVEMENTS ? [...current, key] : current);
  }

  async function save() {
    try {
      const text = remarks.trim();
      saveFile(await download.mutateAsync({ year, format, csrfToken,
        ...(text ? { remarks: text } : {}), ...(selected.length ? { achievementKeys: selected } : {}) }));
      appToast.success(t("exports.downloaded"));
    } catch {
      // Shown inline from download.error.
    }
  }

  return (
    <section aria-labelledby="annual-report-title" className="mt-8 max-w-4xl space-y-6 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:p-6">
      <div>
        <h2 id="annual-report-title" className="font-heading text-lg font-semibold">{t("exports.annualTitle")}</h2>
        <p className="mt-1 text-sm text-muted-app">{t("exports.annualDescription")}</p>
      </div>
      {!option ? <AppNotice role="status">{t("exports.annualNoYears")}</AppNotice> : <>
        <div className="flex flex-wrap items-end gap-4">
          <div className="text-sm font-medium text-text-app">{t("exports.annualYear")}
            <AppSelect className="mt-1.5 block w-32 font-normal" label={t("exports.annualYear")} value={year}
              onChange={changeYear} options={years.map((item) => ({ value: item.year, label: String(item.year) }))} />
          </div>
          <AppButton variant="secondary" disabled={preview.isPending}
            onClick={() => preview.mutate({ year, csrfToken })}>
            {preview.isPending ? t("exports.annualPreviewing") : t("exports.annualPreview")}</AppButton>
        </div>
        <div>
          <p className="text-sm font-medium">{t("exports.annualTerms")}</p>
          <ul className="mt-2 flex flex-wrap gap-2">{option.terms.map((term) => <li key={term.season}>
            <AppBadge tone={term.published ? "success" : "neutral"}>{term.published
              ? t("exports.annualTermReady", { season: seasonLabel(t, term.season) })
              : t("exports.annualTermMissing", { season: seasonLabel(t, term.season) })}</AppBadge></li>)}</ul>
        </div>

        {failure && <AppNotice tone="danger" role="alert">
          {failure instanceof ExportRequestError && failure.status === 404 ? t("exports.annualNotFound")
            : `${t("exports.failed")} ${failure.message}`}</AppNotice>}
        {preview.isPending && <AppSkeleton className="h-96 w-full" />}

        {report && <>
          {report.provisional && <AppNotice tone="warning" role="status" title={t("exports.annualProvisional")}>
            {t("exports.annualMissingTerms", { terms: report.missingTerms.map((season) => seasonLabel(t, season)).join(", ") })}
          </AppNotice>}

          <Part title={t("exports.annualOverview")}>
            <Figures items={[
              [t("exports.annualClubsCreated"), report.overview.clubsCreated],
              [t("exports.annualActiveMembers"), report.overview.activeMembers],
              [t("exports.annualCompletedEvents"), report.overview.completedEvents],
              [t("exports.annualParticipations"), report.overview.participations],
            ]} />
            <div><p className="text-sm font-medium">{t("exports.annualClubsByState")}</p>
              <ul className="mt-2 flex flex-wrap gap-2">{Object.entries(report.overview.clubsByState).map(([state, count]) =>
                <li key={state}><AppBadge>{stateLabel(t, state)}: {count}</AppBadge></li>)}</ul></div>
          </Part>

          <Part title={t("exports.annualEvaluation")}>
            <Figures items={[
              [t("exports.annualEvaluatedClubs"), report.evaluation.evaluatedClubs],
              [t("exports.annualAverageYear"), score(report.evaluation.averageYearScore)],
              ...SEASONS.map((season): [string, ReactNode] =>
                [t("exports.annualAverageTerm", { season: seasonLabel(t, season) }), score(report.evaluation.averageByTerm[season])]),
            ]} />
            <ul className="flex flex-wrap gap-2">{CLASSIFICATIONS.map((value) => <li key={value}>
              <AppBadge tone={ratingTone(value)}>{ratingLabel(t, value)}: {report.evaluation.byClassification[value]}</AppBadge></li>)}</ul>
            {report.evaluation.top.length > 0 && <div><p className="text-sm font-medium">{t("exports.annualTop")}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{report.evaluation.top.map((club) =>
                <li key={club.clubId} className="break-words">{club.clubName} <span className="text-muted-app tabular-nums">· {club.yearScore}</span></li>)}</ol></div>}
            {report.evaluation.rows.length ? <div className="overflow-x-auto rounded-xl border border-border-app">
              <table className="w-full min-w-[56rem] text-left text-sm">
                <thead className="bg-surface-app"><tr className="text-xs text-muted-app">
                  <th scope="col" className="px-3 py-2.5 font-medium">{t("exports.club")}</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">{t("exports.annualField")}</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">{t("exports.annualState")}</th>
                  {SEASONS.map((season) => <th key={season} scope="col" className="px-3 py-2.5 text-right font-medium">{seasonLabel(t, season)}</th>)}
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">{t("exports.annualEvaluatedTerms")}</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">{t("exports.annualYearScore")}</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">{t("exports.annualYearRating")}</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">{t("exports.annualTrend")}</th>
                </tr></thead>
                <tbody>{report.evaluation.rows.map((row) =>
                  <tr key={row.clubId} className="border-t border-border-app align-top">
                    <td className="px-3 py-2.5"><p className="font-medium break-words">{row.clubName}</p>
                      {row.evaluatedTerms === 0 && <p className="text-xs text-muted-app">{t("exports.annualNotEvaluated")}</p>}</td>
                    <td className="px-3 py-2.5 break-words text-muted-app">{row.field ?? "—"}</td>
                    <td className="px-3 py-2.5">{stateLabel(t, row.state)}</td>
                    {SEASONS.map((season) => {
                      const term = row.terms[season];
                      return <td key={season} className="px-3 py-2.5 text-right">{term ? <>
                        <span className="font-medium tabular-nums">{term.score}</span>
                        <span className="block text-xs text-muted-app">{ratingLabel(t, term.classification)}</span>
                      </> : "—"}</td>;
                    })}
                    <td className="px-3 py-2.5 text-right tabular-nums">{row.evaluatedTerms}/3</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{score(row.yearScore)}</td>
                    <td className="px-3 py-2.5">{row.yearClassification
                      ? <AppBadge tone={ratingTone(row.yearClassification)}>{ratingLabel(t, row.yearClassification)}</AppBadge> : "—"}</td>
                    <td className="px-3 py-2.5">{row.trend ? trendLabel(t, row.trend) : "—"}</td>
                  </tr>)}</tbody>
              </table>
            </div> : <AppNotice>{t("exports.annualNoRows")}</AppNotice>}
          </Part>

          <Part title={t("exports.annualDimensions")}>
            <ul className="grid gap-2 sm:grid-cols-2">{report.dimensions.averages.map((item) =>
              <li key={item.code} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-app px-3 py-2 text-sm">
                <span className="min-w-0 break-words">{item.code} · {dimensionLabel(t, item.code)}</span>
                <span className="flex flex-wrap items-center gap-2">
                  {item.code === report.dimensions.highest && <AppBadge tone="success">{t("exports.annualHighest")}</AppBadge>}
                  {item.code === report.dimensions.lowest && <AppBadge tone="warning">{t("exports.annualLowest")}</AppBadge>}
                  <span className="font-semibold tabular-nums">{score(item.average)}</span>
                </span>
              </li>)}</ul>
          </Part>

          <Part title={t("exports.annualFinance")}>
            {report.finance.hasData ? <Figures items={[
              [t("exports.annualApproved"), formatMoney(report.finance.approvedTotal, i18n.language)],
              [t("exports.annualDisbursed"), formatMoney(report.finance.disbursedTotal, i18n.language)],
              [t("exports.annualRate"), report.finance.disbursementRate === null ? "—" : `${report.finance.disbursementRate}%`],
              [t("exports.annualWithoutReport"), report.finance.clubsWithoutAcceptedReport],
            ]} /> : <AppNotice role="status">{t("exports.annualNoFinance")}</AppNotice>}
          </Part>

          <Part title={t("exports.annualCompliance")}>
            <Figures items={[[t("exports.annualOpenViolations"), report.compliance.openViolations]]} />
            <ClubList label={t("exports.annualNeedsImprovement")} clubs={report.compliance.needsImprovement.map((club) => club.clubName)} />
            <ClubList label={t("exports.annualDeclining")} clubs={report.compliance.declining.map((club) => club.clubName)} />
            <ClubList label={t("exports.annualSuspended")} clubs={report.compliance.suspendedOrDissolving
              .map((club) => `${club.clubName} (${stateLabel(t, club.state)})`)} />
          </Part>

          <Part title={t("exports.annualAchievements")}>
            {report.achievements.length ? <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-muted-app">{t("exports.annualAchievementsHint", { max: MAX_ACHIEVEMENTS })}</p>
                <p className="font-medium tabular-nums" aria-live="polite">{t("exports.annualSelected", { count: selected.length, max: MAX_ACHIEVEMENTS })}</p>
              </div>
              <ul className="space-y-2">{report.achievements.map((item) => {
                const checked = selected.includes(item.key);
                const full = !checked && selected.length >= MAX_ACHIEVEMENTS;
                return <li key={item.key}>
                  <label className={cn("flex gap-3 rounded-lg border border-border-app px-3 py-2.5 text-sm", { "opacity-60": full })}>
                    <input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={checked} disabled={full} onChange={() => toggle(item.key)} />
                    <span className="min-w-0 break-words">
                      <span className="font-medium">{item.title}</span>
                      <span className="block text-xs text-muted-app">{item.clubName} · {item.periodCode}</span>
                      {item.description && <span className="mt-1 block text-muted-app">{item.description}</span>}
                    </span>
                  </label>
                </li>;
              })}</ul>
            </> : <AppNotice role="status">{t("exports.annualNoAchievements")}</AppNotice>}
            <label className="block text-sm font-medium text-text-app">{t("exports.annualRemarks")}
              <AppTextarea className="mt-1.5 block w-full font-normal" rows={5} maxLength={MAX_REMARKS} value={remarks}
                onChange={(event) => setRemarks(event.target.value.slice(0, MAX_REMARKS))} />
            </label>
            <p className="text-right text-xs text-muted-app tabular-nums">{t("exports.annualRemarksCount", { count: remarks.length, max: MAX_REMARKS })}</p>
          </Part>

          <div className="flex flex-wrap items-center gap-3 border-t border-border-app pt-6">
            <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border-app bg-surface-app p-1" role="group" aria-label={t("exports.format")}>
              {FORMATS.map((value) => <button key={value} type="button" aria-pressed={format === value} onClick={() => setFormat(value)}
                className={cn(choiceClass, { [activeChoiceClass]: format === value })}>{value}</button>)}
            </div>
            <AppButton disabled={download.isPending} onClick={() => void save()}>
              {download.isPending ? t("exports.downloading") : t("exports.annualDownload")}</AppButton>
          </div>
          <p className="text-xs text-muted-app">{t("exports.auditNote")}</p>
        </>}
      </>}
    </section>
  );
}
