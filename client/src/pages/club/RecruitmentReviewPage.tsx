import { useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useRecruitmentCampaigns } from "@/hooks/useRecruitmentCampaigns";
import { useApplicationsForReview, useRecruitmentOnboardingAction, useReviewAttachmentAccess, useReviewRecruitmentApplications } from "@/hooks/useRecruitmentApplications";
import type { RecruitmentApplication } from "@/services/recruitmentApplications";

export function RecruitmentReviewPage() {
  const { clubId, campaignId } = useParams();
  const { t } = useTranslation();
  const auth = useAuth();
  const query = useApplicationsForReview(clubId, campaignId);
  // Same cached list as the campaign page; used to show question labels instead of field keys.
  const campaigns = useRecruitmentCampaigns(clubId, Boolean(auth.data));
  const questionLabels = new Map((campaigns.data?.find((campaign) => campaign.id === campaignId)?.formSchema ?? [])
    .map((field) => [field.key, field.label]));
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

  if (query.isPending) return <div className="mx-auto max-w-6xl space-y-4"><AppSkeleton className="h-20 w-full" /><AppSkeleton className="h-80 w-full" /></div>;
  if (query.isError) return <AppCard className="mx-auto max-w-4xl"><p role="alert" className="text-danger-app">{query.error.message}</p>
    <AppButton className="mt-4" variant="secondary" onClick={() => void query.refetch()}>{t("recruitmentApplications.retry")}</AppButton></AppCard>;

  const applications = query.data ?? [];
  return <div className="mx-auto max-w-6xl space-y-5">
    <Link to={`/club/${clubId}/recruitment`} className="text-sm font-semibold text-accent-app">{t("recruitmentApplications.reviewBack")}</Link>
    <header><p className="text-xs font-bold uppercase tracking-widest text-accent-app">{t("recruitmentApplications.reviewLabel")}</p>
      <h1 className="mt-1 text-3xl font-bold font-heading">{t("recruitmentApplications.reviewTitle")}</h1>
      <p className="mt-2 text-muted-app">{t("recruitmentApplications.reviewDescription")}</p></header>
    {error && <p role="alert" className="rounded-lg bg-danger-app/10 p-4 text-danger-app">{error}</p>}
    <AppCard className="space-y-4">
      <label className="block text-sm font-semibold">{t("recruitmentApplications.reviewReason")}
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000}
          className="mt-2 min-h-20 w-full rounded-lg border border-border-app bg-surface-app p-3" />
        <span className="mt-1 block text-xs font-normal text-muted-app">{t("recruitmentApplications.reviewReasonHint")}</span></label>
      <div className="flex flex-wrap gap-2">
        <AppButton disabled={!selected.length || action.isPending || !reason.trim()} onClick={() => void bulk("shortlist")}>{t("recruitmentApplications.bulkShortlist")}</AppButton>
        <AppButton className="bg-danger-app text-white hover:opacity-90" disabled={!selected.length || action.isPending || !reason.trim()} onClick={() => void bulk("decide")}>{t("recruitmentApplications.bulkReject")}</AppButton>
        <span className="self-center text-sm text-muted-app">{selected.length} {t("recruitmentApplications.selected")}</span>
      </div>
      {!applications.length ? <p className="py-8 text-center text-muted-app">{t("recruitmentApplications.noReviewApplications")}</p> :
        <div className="space-y-3">{applications.map((item) => <article key={item.id} className="rounded-xl border border-border-app p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-3"><input aria-label={`${t("recruitmentApplications.selectApplication")}: ${item.applicantName ?? item.id.slice(-6)}`} type="checkbox"
              checked={selected.includes(item.id)} onChange={(event) => setSelected((old) => event.target.checked
                ? [...old, item.id] : old.filter((id) => id !== item.id))} />
              <div><h2 className="font-bold">{item.applicantName ?? `${t("recruitmentApplications.applicationNumber")} ${item.id.slice(-6)}`}</h2>
                <p className="text-sm text-muted-app">{item.position} · {t(`recruitmentApplications.state${item.state}`)}</p>
                {item.decisionReason && <p className="mt-2 text-sm">{t("recruitmentApplications.decisionReason")}: {item.decisionReason}</p>}
              </div></div>
            <div className="flex flex-wrap gap-2">
              {item.state === "Submitted" && <AppButton disabled={action.isPending} onClick={() => void run(item, "screen")}>{t("recruitmentApplications.startScreening")}</AppButton>}
              {item.state === "Screening" && <><AppButton disabled={action.isPending || !reason.trim()} onClick={() => void run(item, "shortlist")}>{t("recruitmentApplications.shortlist")}</AppButton>
                <AppButton className="bg-danger-app text-white hover:opacity-90" disabled={action.isPending || !reason.trim()} onClick={() => void run(item, "decide", "Rejected")}>{t("recruitmentApplications.reject")}</AppButton></>}
              {item.state === "Shortlisted" && <><AppButton disabled={action.isPending} onClick={() => void run(item, "decide", "Accepted")}>{t("recruitmentApplications.accept")}</AppButton>
                <AppButton variant="secondary" disabled={action.isPending} onClick={() => void run(item, "decide", "Waitlisted")}>{t("recruitmentApplications.waitlist")}</AppButton>
                <AppButton className="bg-danger-app text-white hover:opacity-90" disabled={action.isPending || !reason.trim()} onClick={() => void run(item, "decide", "Rejected")}>{t("recruitmentApplications.reject")}</AppButton></>}
              {item.state === "Waitlisted" && <AppButton disabled={action.isPending} onClick={() => void run(item, "promote", "Accepted")}>{t("recruitmentApplications.promote")}</AppButton>}
              {item.state === "Accepted" && <><AppButton disabled={onboarding.isPending} onClick={() => void onboard(item, "onboard")}>{t("recruitmentApplications.onboard")}</AppButton>
                <AppButton variant="secondary" disabled={onboarding.isPending} onClick={() => void onboard(item, "decline")}>{t("recruitmentApplications.recordDecline")}</AppButton></>}
            </div>
          </div>
          <details className="mt-4"><summary className="text-sm font-semibold">{t("recruitmentApplications.viewAnswers")}</summary>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(item.answers).map(([key, value]) => <div key={key} className="rounded-lg bg-surface-app p-3">
              <dt className="text-xs font-semibold text-muted-app">{questionLabels.get(key) ?? key}</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{Array.isArray(value) ? value.join(", ") : value}</dd></div>)}</dl>
            {item.attachments.map((attachment) => <div key={attachment.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-app p-3">
              <span className="min-w-0 break-words text-sm"><span className="font-semibold">{questionLabels.get(attachment.fieldKey) ?? attachment.fieldKey}</span>: {attachment.fileName}</span>
              <AppButton variant="secondary" disabled={attachmentAccess.isPending}
                onClick={() => void openAttachment(item, attachment.id)}>{t("recruitmentApplications.openAttachment")}</AppButton>
            </div>)}
          </details>
        </article>)}</div>}
    </AppCard>
  </div>;
}
