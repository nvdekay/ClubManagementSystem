import { useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useRecruitmentCampaigns } from "@/hooks/useRecruitmentCampaigns";
import { useApplicationsForReview, useCandidateEvaluations, useRecruitmentOnboardingAction, useReviewAttachmentAccess, useReviewRecruitmentApplications } from "@/hooks/useRecruitmentApplications";
import type { CandidateEvaluationGroup, RecruitmentApplication } from "@/services/recruitmentApplications";
import { CandidateEvaluationPanel } from "./CandidateEvaluationPanel";

export function RecruitmentReviewPage() {
  const { clubId, campaignId } = useParams();
  const { t } = useTranslation();
  const auth = useAuth();
  const query = useApplicationsForReview(clubId, campaignId);
  // Same cached list as the campaign page; used to show question labels instead of field keys.
  const campaigns = useRecruitmentCampaigns(clubId, Boolean(auth.data));
  const questionLabels = new Map((campaigns.data?.find((campaign) => campaign.id === campaignId)?.formSchema ?? [])
    .map((field) => [field.key, field.label]));
  const evaluations = useCandidateEvaluations(clubId, campaignId);
  const evaluationGroups = new Map((evaluations.data?.applications ?? []).map((group) => [group.applicationId, group]));
  const action = useReviewRecruitmentApplications();
  const onboarding = useRecruitmentOnboardingAction();
  const attachmentAccess = useReviewAttachmentAccess();
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function run(item: RecruitmentApplication, kind: "screen" | "shortlist" | "decide" | "promote", outcome?: "Accepted" | "Rejected" | "Waitlisted") {
    if (!clubId || !campaignId || !auth.data) return;
    setError("");
    try {
      await action.mutateAsync({ clubId, campaignId, action: kind, applicationIds: [item.id],
        ...(outcome ? { outcome } : {}), ...(reason.trim() ? { reason: reason.trim() } : {}),
        csrfToken: auth.data.csrfToken });
      setSelected([]);
      setReason("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("recruitmentApplications.reviewError")); }
  }

  async function bulk(actionName: "shortlist" | "decide") {
    if (!clubId || !campaignId || !auth.data || !selected.length) return;
    setError("");
    try {
      await action.mutateAsync({ clubId, campaignId, action: actionName, applicationIds: selected,
        ...(actionName === "shortlist" ? { reason: reason.trim() } : { outcome: "Rejected" as const, reason: reason.trim() }),
        csrfToken: auth.data.csrfToken });
      setSelected([]);
      setReason("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("recruitmentApplications.reviewError")); }
  }

  async function openAttachment(item: RecruitmentApplication, attachmentId: string) {
    if (!clubId || !campaignId) return;
    setError("");
    try {
      const access = await attachmentAccess.mutateAsync({ clubId, campaignId, applicationId: item.id, attachmentId });
      // The signed URL is a download (attachment=true), so the reviewer stays on this page.
      window.location.assign(access.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("recruitmentApplications.reviewError"));
    }
  }

  async function onboard(item: RecruitmentApplication, kind: "onboard" | "decline") {
    if (!clubId || !campaignId || !auth.data) return;
    const message = kind === "onboard" ? t("recruitmentApplications.onboardConfirm")
      : t("recruitmentApplications.declineConfirm");
    if (!window.confirm(message)) return;
    setError("");
    try {
      await onboarding.mutateAsync({ kind, clubId, campaignId, applicationId: item.id,
        csrfToken: auth.data.csrfToken });
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("recruitmentApplications.reviewError")); }
  }

  const back = { to: `/club/${clubId ?? ""}/recruitment`, label: t("recruitmentApplications.reviewBack") };
  const header = <PageHeader back={back} title={t("recruitmentApplications.reviewTitle")}
    description={t("recruitmentApplications.reviewDescription")} />;
  const danger = "bg-danger-app text-bg-app hover:opacity-90";
  if (query.isPending) return <><AppSkeleton className="h-20 w-full" /><AppSkeleton className="mt-4 h-80 w-full" /></>;
  if (query.isError) return <>{header}<AppNotice tone="danger" role="alert" title={query.error.message}>
    <AppButton variant="secondary" onClick={() => void query.refetch()}>{t("recruitmentApplications.retry")}</AppButton></AppNotice></>;

  const applications = query.data ?? [];
  return <>
    {header}
    {error && <AppNotice tone="danger" role="alert" className="mb-6">{error}</AppNotice>}
    <section aria-label={t("recruitmentApplications.reviewReason")} className="space-y-4 rounded-2xl bg-surface-app p-5">
      <label className="block text-sm font-semibold">{t("recruitmentApplications.reviewReason")}
        <AppTextarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000}
          className="mt-2 block min-h-20 w-full font-normal" />
        <span className="mt-1 block text-xs font-normal text-muted-app">{t("recruitmentApplications.reviewReasonHint")}</span></label>
      <div className="flex flex-wrap items-center gap-2">
        <AppButton disabled={!selected.length || action.isPending || !reason.trim()} onClick={() => void bulk("shortlist")}>{t("recruitmentApplications.bulkShortlist")}</AppButton>
        <AppButton className={danger} disabled={!selected.length || action.isPending || !reason.trim()} onClick={() => void bulk("decide")}>{t("recruitmentApplications.bulkReject")}</AppButton>
        <AppBadge tone={selected.length ? "info" : "neutral"}>{selected.length} {t("recruitmentApplications.selected")}</AppBadge>
      </div>
    </section>
    {!applications.length ? <div className="py-16 text-center">
      <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-mint-soft-app text-mint-app"><AppIcon name="inbox" className="size-7" /></span>
      <p className="mt-4 text-muted-app">{t("recruitmentApplications.noReviewApplications")}</p>
    </div> :
      <ul className="mt-8 divide-y divide-border-app border-y border-border-app">{applications.map((item) => <li key={item.id}>
        <article className="px-1 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 basis-64 gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center">
                <input className="size-5 accent-primary-app" aria-label={`${t("recruitmentApplications.selectApplication")}: ${item.applicantName ?? item.id.slice(-6)}`} type="checkbox"
                  checked={selected.includes(item.id)} onChange={(event) => setSelected((old) => event.target.checked
                    ? [...old, item.id] : old.filter((id) => id !== item.id))} />
              </span>
              <div className="min-w-0 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading font-bold break-words">{item.applicantName ?? `${t("recruitmentApplications.applicationNumber")} ${item.id.slice(-6)}`}</h2>
                  <AppBadge tone={stateTone(item.state)}>{t(`recruitmentApplications.state${item.state}`)}</AppBadge>
                </div>
                <p className="mt-0.5 text-sm text-muted-app">{item.position}</p>
                {item.decisionReason && <p className="mt-2 text-sm">{t("recruitmentApplications.decisionReason")}: {item.decisionReason}</p>}
                {evaluationGroups.get(item.id) && <p className="mt-1 text-sm font-semibold">{evaluationSummary(evaluationGroups.get(item.id)!.summary, t)}</p>}
              </div></div>
            <div className="flex flex-wrap gap-2">
              {item.state === "Submitted" && <AppButton disabled={action.isPending} onClick={() => void run(item, "screen")}>{t("recruitmentApplications.startScreening")}</AppButton>}
              {item.state === "Screening" && <><AppButton disabled={action.isPending || !reason.trim()} onClick={() => void run(item, "shortlist")}>{t("recruitmentApplications.shortlist")}</AppButton>
                <AppButton className={danger} disabled={action.isPending || !reason.trim()} onClick={() => void run(item, "decide", "Rejected")}>{t("recruitmentApplications.reject")}</AppButton></>}
              {item.state === "Shortlisted" && <><AppButton disabled={action.isPending} onClick={() => void run(item, "decide", "Accepted")}>{t("recruitmentApplications.accept")}</AppButton>
                <AppButton variant="secondary" disabled={action.isPending} onClick={() => void run(item, "decide", "Waitlisted")}>{t("recruitmentApplications.waitlist")}</AppButton>
                <AppButton className={danger} disabled={action.isPending || !reason.trim()} onClick={() => void run(item, "decide", "Rejected")}>{t("recruitmentApplications.reject")}</AppButton></>}
              {item.state === "Waitlisted" && <AppButton disabled={action.isPending} onClick={() => void run(item, "promote", "Accepted")}>{t("recruitmentApplications.promote")}</AppButton>}
              {item.state === "Accepted" && <><AppButton disabled={onboarding.isPending} onClick={() => void onboard(item, "onboard")}>{t("recruitmentApplications.onboard")}</AppButton>
                <AppButton variant="secondary" disabled={onboarding.isPending} onClick={() => void onboard(item, "decline")}>{t("recruitmentApplications.recordDecline")}</AppButton></>}
            </div>
          </div>
          <details className="group mt-3 sm:pl-14">
            <summary className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-semibold text-accent-app focus-visible:outline-2 focus-visible:outline-ring-app">
              <AppIcon name="chevronRight" className="size-4 transition-transform group-open:rotate-90" />{t("recruitmentApplications.viewAnswers")}</summary>
            <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">{Object.entries(item.answers).map(([key, value]) => <div key={key} className="min-w-0 border-l-2 border-primary-app/40 pl-3">
              <dt className="text-xs font-semibold text-muted-app">{questionLabels.get(key) ?? key}</dt><dd className="mt-1 text-sm break-words whitespace-pre-wrap">{Array.isArray(value) ? value.join(", ") : value}</dd></div>)}</dl>
            {item.attachments.map((attachment) => <div key={attachment.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-app px-4 py-3">
              <span className="flex min-w-0 items-center gap-2 text-sm break-words"><AppIcon name="file" className="size-4 text-primary-app" />
                <span className="min-w-0"><span className="font-semibold">{questionLabels.get(attachment.fieldKey) ?? attachment.fieldKey}</span>: {attachment.fileName}</span></span>
              <AppButton variant="secondary" disabled={attachmentAccess.isPending}
                onClick={() => void openAttachment(item, attachment.id)}>{t("recruitmentApplications.openAttachment")}</AppButton>
            </div>)}
          </details>
          {(item.state === "Shortlisted" || evaluationGroups.has(item.id)) && clubId && campaignId && auth.data && <details className="group mt-1 sm:pl-14">
            <summary className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-semibold text-accent-app focus-visible:outline-2 focus-visible:outline-ring-app">
              <AppIcon name="chevronRight" className="size-4 transition-transform group-open:rotate-90" />{t("recruitmentApplications.evaluations")}</summary>
            {evaluations.isPending ? <AppSkeleton className="mt-3 h-24 w-full" />
              : evaluations.isError ? <AppNotice tone="danger" role="alert" className="mt-3" title={t("recruitmentApplications.evaluationLoadError")}>
                <AppButton variant="secondary" onClick={() => void evaluations.refetch()}>{t("recruitmentApplications.retry")}</AppButton></AppNotice>
                : <CandidateEvaluationPanel key={evaluationGroups.get(item.id)?.evaluations.find((evaluation) => evaluation.reviewerId === auth.data?.user.id)?.id ?? "new"}
                  clubId={clubId} campaignId={campaignId} applicationId={item.id} editable={item.state === "Shortlisted"}
                  rubric={evaluations.data.rubric} group={evaluationGroups.get(item.id)}
                  userId={auth.data.user.id} csrfToken={auth.data.csrfToken} />}
          </details>}
        </article></li>)}</ul>}
  </>;
}

function evaluationSummary(summary: CandidateEvaluationGroup["summary"], t: TFunction) {
  return summary.mean === undefined ? t("recruitmentApplications.evaluationCount", { count: summary.count })
    : t("recruitmentApplications.evaluationAggregate", { mean: summary.mean.toFixed(1),
      max: summary.maxTotal, count: summary.scoredCount });
}

function stateTone(state: RecruitmentApplication["state"]): AppBadgeTone {
  if (state === "Accepted") return "success";
  if (state === "Rejected") return "danger";
  if (state === "Waitlisted" || state === "Shortlisted") return "warning";
  return "info";
}
