import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { appToast } from "@/components/ui/toast/AppToast";
import { useSaveCandidateEvaluation } from "@/hooks/useRecruitmentApplications";
import type { CandidateEvaluationGroup } from "@/services/recruitmentApplications";
import type { RecruitmentRubricCriterion } from "@/services/recruitmentCampaigns";

interface CandidateEvaluationPanelProps {
  clubId: string;
  campaignId: string;
  applicationId: string;
  editable: boolean;
  rubric: RecruitmentRubricCriterion[];
  group?: CandidateEvaluationGroup;
  userId: string;
  csrfToken: string;
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** UC19: every reviewer's evaluation of one application, plus the caller's own editable evaluation. */
export function CandidateEvaluationPanel({ clubId, campaignId, applicationId, editable, rubric, group,
  userId, csrfToken }: CandidateEvaluationPanelProps) {
  const { t } = useTranslation();
  const save = useSaveCandidateEvaluation();
  const evaluations = group?.evaluations ?? [];
  const mine = evaluations.find((evaluation) => evaluation.reviewerId === userId);
  const [scores, setScores] = useState<Record<string, string>>(() => Object.fromEntries(rubric.map((criterion) =>
    [criterion.key, mine?.scores[criterion.key] === undefined ? "" : String(mine.scores[criterion.key])])));
  const [comment, setComment] = useState(mine?.comment ?? "");
  const [error, setError] = useState("");
  const labels = new Map(rubric.map((criterion) => [criterion.key, criterion.label]));
  const summary = group?.summary;
  const ready = rubric.length ? rubric.every((criterion) => scores[criterion.key] !== "") : Boolean(comment.trim());

  async function submit() {
    setError("");
    try {
      await save.mutateAsync({ clubId, campaignId, applicationId, csrfToken, comment: comment.trim(),
        scores: Object.fromEntries(rubric.map((criterion) => [criterion.key, Number(scores[criterion.key])])) });
      appToast.success(t("recruitmentApplications.evaluationSaved"));
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("recruitmentApplications.reviewError")); }
  }

  return <section aria-label={t("recruitmentApplications.evaluations")} className="mt-3 space-y-4">
    {summary && summary.mean !== undefined && <p className="text-sm text-muted-app">
      {t("recruitmentApplications.evaluationDispersion", { min: formatScore(summary.min ?? 0),
        max: formatScore(summary.max ?? 0), stdDev: formatScore(summary.stdDev ?? 0) })}</p>}
    {!evaluations.length ? <p className="text-sm text-muted-app">{t("recruitmentApplications.evaluationNone")}</p>
      : <ul className="space-y-3">{evaluations.map((evaluation) => <li key={evaluation.id} className="rounded-xl bg-surface-app px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold break-words">{evaluation.reviewerName || t("recruitmentApplications.evaluationReviewer")}</span>
          {evaluation.totalScore !== undefined && <span className="font-semibold">
            {t("recruitmentApplications.evaluationTotal")}: {formatScore(evaluation.totalScore)}/{formatScore(summary?.maxTotal ?? 0)}</span>}
        </div>
        {Object.keys(evaluation.scores).length > 0 && <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-app">
          {Object.entries(evaluation.scores).map(([key, score]) => <li key={key}>{labels.get(key) ?? key}: {formatScore(score)}</li>)}</ul>}
        {evaluation.comment && <p className="mt-2 break-words whitespace-pre-wrap">{evaluation.comment}</p>}
      </li>)}</ul>}
    {editable ? <form className="space-y-3 rounded-xl border border-border-app p-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <h3 className="font-heading font-bold">{t("recruitmentApplications.evaluationYours")}</h3>
      {!rubric.length && <p className="text-sm text-muted-app">{t("recruitmentApplications.evaluationNoRubric")}</p>}
      {rubric.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{rubric.map((criterion) =>
        <label key={criterion.key} className="block text-sm font-semibold">{criterion.label} (0–{criterion.maxScore})
          <AppInput type="number" min={0} max={criterion.maxScore} step="any" required value={scores[criterion.key] ?? ""}
            onChange={(event) => setScores((old) => ({ ...old, [criterion.key]: event.target.value }))}
            className="mt-1 block w-full font-normal" /></label>)}</div>}
      <label className="block text-sm font-semibold">{t("recruitmentApplications.evaluationComment")}
        <AppTextarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000}
          required={!rubric.length} className="mt-1 block min-h-20 w-full font-normal" /></label>
      {error && <AppNotice tone="danger" role="alert">{error}</AppNotice>}
      <AppButton type="submit" disabled={!ready || save.isPending}>{t("recruitmentApplications.evaluationSave")}</AppButton>
    </form> : <p className="text-sm text-muted-app">{t("recruitmentApplications.evaluationLocked")}</p>}
  </section>;
}
