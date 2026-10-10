import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { appToast } from "@/components/ui/toast/AppToast";
import { useSaveCandidateEvaluation } from "@/hooks/useRecruitmentApplications";
import type { CandidateEvaluation } from "@/services/recruitmentApplications";
import type { RecruitmentRubricCriterion } from "@/services/recruitmentCampaigns";
import { cn } from "@/utils/cn";
import { formatScore } from "./recruitmentReviewFormat";

interface CandidateEvaluationFormProps {
  clubId: string;
  campaignId: string;
  applicationId: string;
  rubric: RecruitmentRubricCriterion[];
  mine?: CandidateEvaluation;
  csrfToken: string;
  onDone: () => void;
}

/** UC19 create/edit of the caller's own evaluation; E1 (no rubric) makes the comment the evaluation. */
export function CandidateEvaluationForm({ clubId, campaignId, applicationId, rubric, mine, csrfToken,
  onDone }: CandidateEvaluationFormProps) {
  const { t } = useTranslation();
  const id = useId();
  const save = useSaveCandidateEvaluation();
  const [scores, setScores] = useState<Record<string, string>>(() => Object.fromEntries(rubric.map((criterion) =>
    [criterion.key, mine?.scores[criterion.key] === undefined ? "" : String(mine.scores[criterion.key])])));
  const [comment, setComment] = useState(mine?.comment ?? "");
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState("");

  function scoreError(criterion: RecruitmentRubricCriterion) {
    const raw = scores[criterion.key] ?? "";
    if (raw === "") return attempted ? t("recruitmentApplications.evaluationScoreRequired") : "";
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 && value <= criterion.maxScore ? ""
      : t("recruitmentApplications.evaluationScoreRange", { max: criterion.maxScore });
  }

  const commentError = attempted && !rubric.length && !comment.trim() ? t("recruitmentApplications.evaluationCommentRequired") : "";
  const total = rubric.reduce((sum, criterion) => sum + (scoreError(criterion) || scores[criterion.key] === "" ? 0 : Number(scores[criterion.key])), 0);
  const maxTotal = rubric.reduce((sum, criterion) => sum + criterion.maxScore, 0);

  async function submit() {
    setAttempted(true);
    setError("");
    const invalid = rubric.some((criterion) => scores[criterion.key] === "" || scoreError(criterion))
      || (!rubric.length && !comment.trim());
    if (invalid) return;
    try {
      await save.mutateAsync({ clubId, campaignId, applicationId, csrfToken, comment: comment.trim(),
        scores: Object.fromEntries(rubric.map((criterion) => [criterion.key, Number(scores[criterion.key])])) });
      appToast.success(t("recruitmentApplications.evaluationSaved"));
      onDone();
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("recruitmentApplications.reviewError")); }
  }

  return <form noValidate className="space-y-4 rounded-xl border border-border-app p-4"
    onSubmit={(event) => { event.preventDefault(); void submit(); }}>
    <h4 className="font-heading font-bold">{t("recruitmentApplications.evaluationYours")}</h4>
    {!rubric.length && <p className="text-sm text-muted-app">{t("recruitmentApplications.evaluationNoRubric")}</p>}
    {rubric.map((criterion) => {
      const fieldError = scoreError(criterion);
      const value = scores[criterion.key] ?? "";
      const quickPicks = criterion.maxScore <= 10 && Number.isInteger(criterion.maxScore);
      return <div key={criterion.key} className="space-y-2 border-b border-border-app pb-4 last:border-b-0">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <label htmlFor={id + criterion.key} className="min-w-0 text-sm font-semibold break-words">
            {criterion.label} <span className="font-normal text-muted-app">({t("recruitmentApplications.evaluationMax", { max: criterion.maxScore })})</span></label>
          <AppInput id={id + criterion.key} type="number" inputMode="decimal" min={0} max={criterion.maxScore} step="any"
            value={value} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? id + criterion.key + "-error" : undefined}
            onChange={(event) => setScores((old) => ({ ...old, [criterion.key]: event.target.value }))}
            className={cn("w-24 tabular-nums", { "border-danger-app": Boolean(fieldError) })} />
        </div>
        {quickPicks && <div role="group" aria-label={t("recruitmentApplications.evaluationQuickPick", { label: criterion.label })}
          className="flex flex-wrap gap-1.5">
          {Array.from({ length: criterion.maxScore + 1 }, (_, score) => <button key={score} type="button"
            aria-pressed={value !== "" && Number(value) === score}
            onClick={() => setScores((old) => ({ ...old, [criterion.key]: String(score) }))}
            className={cn("min-h-11 min-w-11 rounded-lg border border-border-app bg-bg-app text-sm tabular-nums transition-colors hover:border-primary-app focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:outline-none sm:min-h-9 sm:min-w-9", {
              "border-primary-app bg-primary-app text-on-primary-app": value !== "" && Number(value) === score,
            })}>{score}</button>)}
        </div>}
        {fieldError && <p id={id + criterion.key + "-error"} className="text-sm text-danger-app">{fieldError}</p>}
      </div>;
    })}
    {rubric.length > 0 && <p className="text-sm font-semibold tabular-nums" aria-live="polite">
      {t("recruitmentApplications.evaluationTotal")}: {formatScore(total)}/{formatScore(maxTotal)}</p>}
    <label className="block text-sm font-semibold">{t("recruitmentApplications.evaluationComment")}
      <AppTextarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000}
        aria-invalid={Boolean(commentError)} aria-describedby={commentError ? id + "comment-error" : undefined}
        className={cn("mt-1 block min-h-20 w-full font-normal", { "border-danger-app": Boolean(commentError) })} /></label>
    {commentError && <p id={id + "comment-error"} className="-mt-2 text-sm text-danger-app">{commentError}</p>}
    {error && <AppNotice tone="danger" role="alert">{error}</AppNotice>}
    <div className="flex flex-wrap gap-2">
      <AppButton type="submit" disabled={save.isPending}>{t("recruitmentApplications.evaluationSave")}</AppButton>
      <AppButton type="button" variant="secondary" disabled={save.isPending} onClick={onDone}>{t("recruitmentApplications.cancel")}</AppButton>
    </div>
  </form>;
}
