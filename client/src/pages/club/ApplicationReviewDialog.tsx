import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { appToast } from "@/components/ui/toast/AppToast";
import { useRecruitmentOnboardingAction, useReviewAttachmentAccess, useReviewRecruitmentApplications } from "@/hooks/useRecruitmentApplications";
import type { CandidateEvaluationGroup, RecruitmentApplication } from "@/services/recruitmentApplications";
import type { RecruitmentRubricCriterion } from "@/services/recruitmentCampaigns";
import { CandidateEvaluationPanel } from "./CandidateEvaluationPanel";
import { formatDate, stateTone } from "./recruitmentReviewFormat";

interface ApplicationReviewDialogProps {
  onClose: () => void;
  clubId: string;
  campaignId: string;
  application: RecruitmentApplication;
  group?: CandidateEvaluationGroup;
  /** Undefined while the evaluations query is loading or failed. */
  rubric?: RecruitmentRubricCriterion[];
  evaluationsLoading: boolean;
  canReview: boolean;
  questionLabels: Map<string, string>;
  userId: string;
  csrfToken: string;
}

const DANGER = "bg-danger-app text-bg-app hover:opacity-90";

/** UC18 detail for one application: answers, screening actions and the UC19 evaluations. */
export function ApplicationReviewDialog({ onClose, clubId, campaignId, application, group, rubric,
  evaluationsLoading, canReview, questionLabels, userId, csrfToken }: ApplicationReviewDialogProps) {
  const { t, i18n } = useTranslation();
  const action = useReviewRecruitmentApplications();
  const onboarding = useRecruitmentOnboardingAction();
  const attachmentAccess = useReviewAttachmentAccess();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const busy = action.isPending || onboarding.isPending;
  const state = application.state;

  async function run(kind: "screen" | "shortlist" | "decide" | "promote", outcome?: "Accepted" | "Rejected" | "Waitlisted") {
    setError("");
    try {
      await action.mutateAsync({ clubId, campaignId, action: kind, applicationIds: [application.id],
        ...(outcome ? { outcome } : {}), ...(reason.trim() ? { reason: reason.trim() } : {}), csrfToken });
      setReason("");
      appToast.success(t("recruitmentApplications.actionDone"));
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("recruitmentApplications.reviewError")); }
  }

  async function onboard(kind: "onboard" | "decline") {
    if (!window.confirm(t(kind === "onboard" ? "recruitmentApplications.onboardConfirm" : "recruitmentApplications.declineConfirm"))) return;
    setError("");
    try {
      await onboarding.mutateAsync({ kind, clubId, campaignId, applicationId: application.id, csrfToken });
      appToast.success(t("recruitmentApplications.actionDone"));
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("recruitmentApplications.reviewError")); }
  }

  async function openAttachment(attachmentId: string) {
    setError("");
    try {
      const access = await attachmentAccess.mutateAsync({ clubId, campaignId, applicationId: application.id, attachmentId });
      // The signed URL is a download (attachment=true), so the reviewer stays on this page.
      window.location.assign(access.url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("recruitmentApplications.reviewError")); }
  }

  const needsReason = state === "Screening" || state === "Shortlisted";
  const answers = Object.entries(application.answers);

  return <AppDialog open onClose={onClose} closeLabel={t("recruitmentApplications.close")}
    title={application.applicantName ?? t("recruitmentApplications.applicationNumber") + " " + application.id.slice(-6)}
    className="w-[min(100%-2rem,56rem)]">
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-app">
        <AppBadge tone={stateTone(state)}>{t(`recruitmentApplications.state${state}`)}</AppBadge>
        <span className="break-words">{application.position}</span>
        <span>{t("recruitmentApplications.colSubmitted")}: {formatDate(application.submittedAt, i18n.language)}</span>
      </div>
      {application.decisionReason && <p className="text-sm break-words">
        <span className="font-semibold">{t("recruitmentApplications.decisionReason")}:</span> {application.decisionReason}</p>}

      <section aria-labelledby="review-decision" className="space-y-3 rounded-2xl bg-surface-app p-4">
        <h3 id="review-decision" className="font-heading font-bold">{t("recruitmentApplications.decisionSection")}</h3>
        {needsReason && <label className="block text-sm font-semibold">{t("recruitmentApplications.actionReason")}
          <AppTextarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000}
            className="mt-2 block min-h-16 w-full font-normal" /></label>}
        {error && <AppNotice tone="danger" role="alert">{error}</AppNotice>}
        <div className="flex flex-wrap gap-2">
          {state === "Submitted" && <AppButton disabled={busy} onClick={() => void run("screen")}>{t("recruitmentApplications.startScreening")}</AppButton>}
          {state === "Screening" && <><AppButton disabled={busy || !reason.trim()} onClick={() => void run("shortlist")}>{t("recruitmentApplications.shortlist")}</AppButton>
            <AppButton className={DANGER} disabled={busy || !reason.trim()} onClick={() => void run("decide", "Rejected")}>{t("recruitmentApplications.reject")}</AppButton></>}
          {state === "Shortlisted" && <><AppButton disabled={busy} onClick={() => void run("decide", "Accepted")}>{t("recruitmentApplications.accept")}</AppButton>
            <AppButton variant="secondary" disabled={busy} onClick={() => void run("decide", "Waitlisted")}>{t("recruitmentApplications.waitlist")}</AppButton>
            <AppButton className={DANGER} disabled={busy || !reason.trim()} onClick={() => void run("decide", "Rejected")}>{t("recruitmentApplications.reject")}</AppButton></>}
          {state === "Waitlisted" && <AppButton disabled={busy} onClick={() => void run("promote", "Accepted")}>{t("recruitmentApplications.promote")}</AppButton>}
          {state === "Accepted" && <><AppButton disabled={busy} onClick={() => void onboard("onboard")}>{t("recruitmentApplications.onboard")}</AppButton>
            <AppButton variant="secondary" disabled={busy} onClick={() => void onboard("decline")}>{t("recruitmentApplications.recordDecline")}</AppButton></>}
        </div>
        {!["Submitted", "Screening", "Shortlisted", "Waitlisted", "Accepted"].includes(state)
          && <p className="text-sm text-muted-app">{t("recruitmentApplications.noActions")}</p>}
      </section>

      <section aria-labelledby="review-answers" className="space-y-3">
        <h3 id="review-answers" className="font-heading font-bold">{t("recruitmentApplications.answersTitle")}</h3>
        {!answers.length && !application.attachments.length && <p className="text-sm text-muted-app">{t("recruitmentApplications.noAnswers")}</p>}
        {answers.length > 0 && <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{answers.map(([key, value]) =>
          <div key={key} className="min-w-0 border-l-2 border-primary-app/40 pl-3">
            <dt className="text-xs font-semibold text-muted-app">{questionLabels.get(key) ?? key}</dt>
            <dd className="mt-1 text-sm break-words whitespace-pre-wrap">{Array.isArray(value) ? value.join(", ") : value}</dd></div>)}</dl>}
        {application.attachments.map((attachment) => <div key={attachment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-app px-4 py-3">
          <span className="flex min-w-0 items-center gap-2 text-sm break-words"><AppIcon name="file" className="size-4 shrink-0 text-primary-app" />
            <span className="min-w-0"><span className="font-semibold">{questionLabels.get(attachment.fieldKey) ?? attachment.fieldKey}</span>: {attachment.fileName}</span></span>
          <AppButton variant="secondary" disabled={attachmentAccess.isPending}
            onClick={() => void openAttachment(attachment.id)}>{t("recruitmentApplications.openAttachment")}</AppButton>
        </div>)}
      </section>

      <section aria-labelledby="review-evaluations" className="space-y-3">
        <h3 id="review-evaluations" className="font-heading font-bold">{t("recruitmentApplications.evaluations")}</h3>
        {evaluationsLoading ? <AppSkeleton className="h-32 w-full" />
          : !rubric ? <AppNotice tone="danger" role="alert">{t("recruitmentApplications.evaluationLoadError")}</AppNotice>
            : <CandidateEvaluationPanel clubId={clubId} campaignId={campaignId} applicationId={application.id}
              state={state} canReview={canReview} rubric={rubric} group={group} userId={userId} csrfToken={csrfToken} />}
      </section>
    </div>
  </AppDialog>;
}
