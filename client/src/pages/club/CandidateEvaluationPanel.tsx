import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import type { CandidateEvaluationGroup, RecruitmentApplication } from "@/services/recruitmentApplications";
import type { RecruitmentRubricCriterion } from "@/services/recruitmentCampaigns";
import { CandidateEvaluationForm } from "./CandidateEvaluationForm";
import { formatDate, formatScore } from "./recruitmentReviewFormat";

interface CandidateEvaluationPanelProps {
  clubId: string;
  campaignId: string;
  applicationId: string;
  state: RecruitmentApplication["state"];
  canReview: boolean;
  rubric: RecruitmentRubricCriterion[];
  group?: CandidateEvaluationGroup;
  userId: string;
  csrfToken: string;
}

/** UC19: score summary, every reviewer's evaluation, and the caller's own evaluation form. */
export function CandidateEvaluationPanel({ clubId, campaignId, applicationId, state, canReview, rubric, group,
  userId, csrfToken }: CandidateEvaluationPanelProps) {
  const { t, i18n } = useTranslation();
  const [editing, setEditing] = useState(false);
  const evaluations = group?.evaluations ?? [];
  const mine = evaluations.find((evaluation) => evaluation.reviewerId === userId);
  const summary = group?.summary;
  const labels = new Map(rubric.map((criterion) => [criterion.key, criterion]));
  // Evaluations lock as soon as a decision is made: only Shortlisted applications accept writes.
  const lockedReason = !canReview ? t("recruitmentApplications.evaluationNoPermission")
    : state === "Submitted" || state === "Screening" ? t("recruitmentApplications.evaluationNotYet")
      : state !== "Shortlisted" ? t("recruitmentApplications.evaluationLocked") : "";
  const averages = rubric.map((criterion) => {
    const values = evaluations.map((evaluation) => evaluation.scores[criterion.key]).filter((value) => value !== undefined);
    return { criterion, average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined };
  });
  const stats = summary?.mean === undefined ? [] : [
    [t("recruitmentApplications.statMean"), formatScore(summary.mean) + "/" + formatScore(summary.maxTotal)],
    [t("recruitmentApplications.statMin"), formatScore(summary.min ?? 0)],
    [t("recruitmentApplications.statMax"), formatScore(summary.max ?? 0)],
    [t("recruitmentApplications.statStdDev"), formatScore(summary.stdDev ?? 0)],
    [t("recruitmentApplications.statCount"), String(summary.scoredCount)],
  ];

  return <div className="space-y-5">
    {stats.length > 0 && <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{stats.map(([label, value]) =>
      <div key={label} className="rounded-xl border border-border-app px-3 py-2">
        <dt className="text-xs text-muted-app">{label}</dt>
        <dd className="mt-0.5 font-heading text-lg font-bold tabular-nums">{value}</dd></div>)}</dl>}

    {stats.length > 0 && rubric.length > 0 && <div>
      <h4 className="mb-2 text-sm font-semibold">{t("recruitmentApplications.criterionAverages")}</h4>
      <ul className="space-y-2">{averages.map(({ criterion, average }) => <li key={criterion.key} className="text-sm">
        <div className="flex flex-wrap justify-between gap-x-3">
          <span className="min-w-0 break-words">{criterion.label}</span>
          <span className="tabular-nums text-muted-app">{average === undefined ? "—" : formatScore(average)}/{formatScore(criterion.maxScore)}</span>
        </div>
        <div aria-hidden="true" className="mt-1 h-2 overflow-hidden rounded-full bg-surface-strong-app">
          <div className="h-full rounded-full bg-primary-app"
            style={{ width: Math.min(100, ((average ?? 0) / (criterion.maxScore || 1)) * 100) + "%" }} />
        </div>
      </li>)}</ul>
    </div>}

    {!evaluations.length ? <p className="text-sm text-muted-app">{t("recruitmentApplications.evaluationNone")}</p>
      : <ul className="space-y-3">{evaluations.map((evaluation) => <li key={evaluation.id} className="rounded-xl bg-surface-app px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold break-words">{evaluation.reviewerName || t("recruitmentApplications.evaluationReviewer")}</span>
            {evaluation.reviewerId === userId && <AppBadge tone="info">{t("recruitmentApplications.you")}</AppBadge>}
            <span className="text-xs text-muted-app">{formatDate(evaluation.createdAt, i18n.language)}</span>
          </span>
          {evaluation.totalScore !== undefined && <span className="font-semibold tabular-nums">
            {t("recruitmentApplications.evaluationTotal")}: {formatScore(evaluation.totalScore)}/{formatScore(summary?.maxTotal ?? 0)}</span>}
        </div>
        {Object.keys(evaluation.scores).length > 0 && <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-app">
          {Object.entries(evaluation.scores).map(([key, score]) => <li key={key}>
            {labels.get(key)?.label ?? key}: <span className="tabular-nums">{formatScore(score)}/{formatScore(labels.get(key)?.maxScore ?? 0)}</span></li>)}</ul>}
        {evaluation.comment && <p className="mt-2 break-words whitespace-pre-wrap">{evaluation.comment}</p>}
      </li>)}</ul>}

    {editing && !lockedReason ? <CandidateEvaluationForm key={mine?.id ?? "new"} clubId={clubId} campaignId={campaignId}
      applicationId={applicationId} rubric={rubric} mine={mine} csrfToken={csrfToken}
      onDone={() => setEditing(false)} />
      : <div className="space-y-2">
        <AppButton disabled={Boolean(lockedReason)} onClick={() => setEditing(true)}>
          {t(mine ? "recruitmentApplications.editEvaluation" : "recruitmentApplications.evaluate")}</AppButton>
        {lockedReason && <AppNotice tone="neutral" role="status">{lockedReason}</AppNotice>}
      </div>}
  </div>;
}
