import { useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useMyCampaignApplication, useRecruitmentApplicationAction } from "@/hooks/useRecruitmentApplications";
import { usePublicRecruitmentCampaign } from "@/hooks/useRecruitmentCampaigns";
import type { RecruitmentApplication } from "@/services/recruitmentApplications";
import type { RecruitmentAnswer } from "@/services/recruitmentApplications";

function stateLabel(state: RecruitmentApplication["state"], t: TFunction): string {
  switch (state) {
    case "Draft": return t("recruitmentApplications.stateDraft");
    case "Submitted": return t("recruitmentApplications.stateSubmitted");
    case "Screening": return t("recruitmentApplications.stateScreening");
    case "Shortlisted": return t("recruitmentApplications.stateShortlisted");
    case "Accepted": return t("recruitmentApplications.stateAccepted");
    case "Rejected": return t("recruitmentApplications.stateRejected");
    case "Waitlisted": return t("recruitmentApplications.stateWaitlisted");
    case "Onboarded": return t("recruitmentApplications.stateOnboarded");
    case "Withdrawn": return t("recruitmentApplications.stateWithdrawn");
    case "Declined": return t("recruitmentApplications.stateDeclined");
  }
}

function isApplication(value: unknown): value is RecruitmentApplication {
  return Boolean(value && typeof value === "object" && "id" in value && "attachments" in value);
}

export function RecruitmentApplicationPage() {
  const { campaignId } = useParams();
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const campaignQuery = usePublicRecruitmentCampaign(campaignId);
  const applicationQuery = useMyCampaignApplication(campaignId, Boolean(auth.data));
  const action = useRecruitmentApplicationAction();
  const [formState, setFormState] = useState<{ campaignId: string; position: string;
    answers: Record<string, RecruitmentAnswer> } | null>(null);
  const [createdApplication, setCreatedApplication] = useState<RecruitmentApplication | null>(null);
  const [notice, setNotice] = useState("");
  const [pageError, setPageError] = useState("");
  // A double click would run two confirm prompts and two concurrent draft saves (409).
  const submitting = useRef(false);
  const campaign = campaignQuery.data;
  const application = applicationQuery.data ?? createdApplication;
  const editable = !application || application.state === "Draft";
  const canWithdraw = Boolean(application && ["Submitted", "Screening", "Shortlisted"].includes(application.state));
  const dateLocale = i18n.language === "vi" ? "vi-VN" : "en-US";

  const form = campaign && formState?.campaignId === campaign.id ? formState : null;
  const position = form?.position || application?.position || campaign?.positions[0] || "";
  const answers = form?.answers ?? application?.answers ?? {};

  function changeAnswer(key: string, value: RecruitmentAnswer) {
    if (!campaign) return;
    setFormState((current) => ({ campaignId: campaign.id,
      position: current?.campaignId === campaign.id ? current.position : position,
      answers: { ...(current?.campaignId === campaign.id ? current.answers : answers), [key]: value } }));
    setNotice("");
  }

  async function ensureApplication(): Promise<string | null> {
    if (!auth.data || !campaign) return null;
    if (application) return application.id;
    try {
      const result = await action.mutateAsync({ kind: "create", campaignId: campaign.id,
        position, csrfToken: auth.data.csrfToken });
      if (!isApplication(result)) return null;
      setCreatedApplication(result);
      return result.id;
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("recruitmentApplications.actionError"));
      return null;
    }
  }

  async function saveDraft(): Promise<string | null> {
    if (!auth.data || !campaign) return null;
    setPageError("");
    setNotice("");
    const applicationId = await ensureApplication();
    if (!applicationId) return null;
    try {
      const result = await action.mutateAsync({ kind: "save", applicationId,
        position, answers, csrfToken: auth.data.csrfToken });
      if (isApplication(result)) setCreatedApplication(result);
      setNotice(t("recruitmentApplications.saved"));
      return applicationId;
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("recruitmentApplications.actionError"));
      return null;
    }
  }

  async function upload(fieldKey: string, file: File | undefined) {
    if (!auth.data || !campaign || !file) return;
    const field = campaign.formSchema.find((item) => item.key === fieldKey);
    if (!field) return;
    setPageError("");
    setNotice("");
    const applicationId = await ensureApplication();
    if (!applicationId) return;
    try {
      const result = await action.mutateAsync({ kind: "upload", applicationId, field,
        file, csrfToken: auth.data.csrfToken });
      if (isApplication(result)) setCreatedApplication(result);
      setNotice(t("recruitmentApplications.uploaded"));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("recruitmentApplications.actionError"));
    }
  }

  async function submit() {
    if (!auth.data || !campaign || submitting.current) return;
    // Check required answers before asking to confirm, so nothing is created for an incomplete form.
    const attached = new Set((application?.attachments ?? []).map((item) => item.fieldKey));
    const missing = campaign.formSchema.filter((field) => field.required && (field.type === "file"
      ? !attached.has(field.key)
      : !([answers[field.key] ?? ""].flat().some((value) => value.trim())))).map((field) => field.label);
    if (missing.length) {
      setNotice("");
      setPageError(t("recruitmentApplications.requiredMissing", { fields: missing.join(", ") }));
      return;
    }
    submitting.current = true;
    try {
      if (!window.confirm(t("recruitmentApplications.submitConfirm"))) return;
      const applicationId = await saveDraft();
      if (!applicationId) return;
      setPageError("");
      const result = await action.mutateAsync({ kind: "submit", applicationId,
        csrfToken: auth.data.csrfToken });
      if (isApplication(result)) setCreatedApplication(result);
      setNotice(t("recruitmentApplications.submitted"));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("recruitmentApplications.actionError"));
    } finally {
      submitting.current = false;
    }
  }

  async function withdraw() {
    if (!auth.data || !application || !window.confirm(t("recruitmentApplications.withdrawConfirm"))) return;
    setPageError("");
    try {
      const result = await action.mutateAsync({ kind: "withdraw", applicationId: application.id,
        csrfToken: auth.data.csrfToken });
      if (isApplication(result)) setCreatedApplication(result);
      setNotice(t("recruitmentApplications.withdrawn"));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("recruitmentApplications.actionError"));
    }
  }

  async function download(attachmentId: string) {
    if (!application) return;
    try {
      const result = await action.mutateAsync({ kind: "access", applicationId: application.id, attachmentId });
      if (result && typeof result === "object" && "url" in result && typeof result.url === "string") {
        window.location.assign(result.url);
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("recruitmentApplications.actionError"));
    }
  }

  if (auth.isPending || campaignQuery.isPending || (auth.data && applicationQuery.isPending)) {
    return <div className="mx-auto max-w-4xl space-y-5"><AppSkeleton className="h-44 w-full" />
      <AppSkeleton className="h-[34rem] w-full" /></div>;
  }
  if (!auth.data) return <AppCard className="mx-auto max-w-3xl space-y-3">
    <p>{t("recruitmentApplications.signInFirst")}</p>
    <Link className="font-semibold text-accent-app" to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>
      {t("recruitmentApplications.signInLink")}</Link>
  </AppCard>;
  // 404 means the campaign is no longer public (closed or completed): not something a retry fixes.
  const campaignGone = (campaignQuery.error as { status?: number } | null)?.status === 404;
  if (campaignQuery.isError || !campaign) return <AppCard className="mx-auto max-w-3xl space-y-4">
    <p role="alert" className="text-danger-app">{campaignGone || !campaignQuery.error
      ? t("recruitmentApplications.unavailable") : campaignQuery.error.message}</p>
    {campaignGone ? <Link className="font-semibold text-accent-app" to="/workspace/recruitment">
      {t("recruitmentApplications.backToApplications")}</Link>
      : <AppButton variant="secondary" onClick={() => void campaignQuery.refetch()}>{t("recruitmentApplications.retry")}</AppButton>}
  </AppCard>;
  if (applicationQuery.isError) return <AppCard className="mx-auto max-w-3xl space-y-4">
    <p role="alert" className="text-danger-app">{applicationQuery.error.message || t("recruitmentApplications.loadError")}</p>
    <AppButton variant="secondary" onClick={() => void applicationQuery.refetch()}>{t("recruitmentApplications.retry")}</AppButton>
  </AppCard>;

  const appAttachments = application?.attachments ?? [];
  return <div className="mx-auto max-w-4xl">
    <Link to={`/clubs/${campaign.clubId}`} className="text-sm font-semibold text-accent-app">{t("recruitmentApplications.back")}</Link>
    <header className="mt-5 rounded-2xl border border-border-app bg-surface-app p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-app">{t("recruitmentApplications.campaign")}</p>
      <h1 className="mt-2 text-3xl font-bold font-heading sm:text-4xl">{campaign.title}</h1>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><p className="text-sm text-muted-app">{t("recruitmentApplications.closes")}</p>
          <p className="mt-1 font-semibold">{new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(campaign.windowEnd))}</p></div>
        <div><p className="text-sm text-muted-app">{t("recruitmentApplications.places")}</p><p className="mt-1 font-semibold">{campaign.capacity}</p></div>
      </div>
      {campaign.criteria && <div className="mt-5"><h2 className="text-sm font-bold">{t("recruitmentApplications.criteria")}</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-app">{campaign.criteria}</p></div>}
      <div className="mt-5"><h2 className="text-sm font-bold">{t("recruitmentApplications.rounds")}</h2>
        <ol className="mt-2 flex flex-wrap gap-2">{campaign.selectionSteps.map((step, index) => <li key={`${step.name}-${index}`}
          className="rounded-full border border-border-app px-3 py-1 text-sm">{index + 1}. {step.name}</li>)}</ol></div>
    </header>

    <AppCard className="mt-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-wide text-accent-app">{t("recruitmentApplications.answers")}</p>
          <h2 className="mt-1 text-xl font-bold font-heading">{t("recruitmentApplications.formTitle")}</h2></div>
        {application && <span className="rounded-full border border-border-app px-3 py-1 text-sm">{stateLabel(application.state, t)}</span>}
      </div>
      {notice && <p role="status" className="mt-5 rounded-lg bg-success-app/10 p-4 text-success-app">{notice}</p>}
      {pageError && <p role="alert" className="mt-5 rounded-lg bg-danger-app/10 p-4 text-danger-app">{pageError}</p>}
      {application?.decisionReason && <p className="mt-4 rounded-lg bg-surface-app p-3 text-sm"><strong>{t("recruitmentApplications.decisionReason")}: </strong>{application.decisionReason}</p>}

      <form className="mt-5 space-y-5" onSubmit={(event) => { event.preventDefault(); void saveDraft(); }}>
        <fieldset disabled={!editable || action.isPending} className="space-y-5 disabled:opacity-80">
          <label className="block text-sm font-semibold">{t("recruitmentApplications.positions")}
            <select className="mt-2 min-h-11 w-full rounded-lg border border-border-app bg-surface-app px-3 py-2" value={position}
              onChange={(event) => setFormState({ campaignId: campaign.id,
                position: event.target.value, answers })}>
              {campaign.positions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select></label>
          {campaign.formSchema.map((field) => {
            const label = <span>{field.label}<span className="ml-2 text-xs font-normal text-muted-app">
              {field.required ? t("recruitmentApplications.required") : t("recruitmentApplications.optional")}</span></span>;
            const value = answers[field.key];
            const attachment = appAttachments.find((item) => item.fieldKey === field.key);
            if (field.type === "file") return <div key={field.key} className="rounded-xl border border-border-app p-4">
              <p className="text-sm font-semibold">{label}</p>
              <p className="mt-1 text-xs text-muted-app">{t("recruitmentApplications.fileHint")}</p>
              {attachment ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="break-all text-sm">{attachment.fileName}</span>
                <AppButton type="button" variant="secondary" disabled={action.isPending}
                  onClick={() => void download(attachment.id)}>{t("recruitmentApplications.download")}</AppButton>
              </div> : <p className="mt-3 text-sm text-muted-app">{t("recruitmentApplications.noFile")}</p>}
              {editable && <label className="mt-3 block text-sm">{t("recruitmentApplications.selectFile")}
                <input className="mt-2 block w-full text-sm" type="file" accept=".pdf,.png,.jpg,.jpeg,.docx"
                  onChange={(event) => void upload(field.key, event.target.files?.[0])} />
              </label>}
            </div>;
            if (field.type === "select") return <label key={field.key} className="block text-sm font-semibold">{label}
              <select className="mt-2 min-h-11 w-full rounded-lg border border-border-app bg-surface-app px-3 py-2"
                value={typeof value === "string" ? value : ""} onChange={(event) => changeAnswer(field.key, event.target.value)}>
                <option value="">{t("recruitmentApplications.selectAnswer")}</option>
                {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
              </select></label>;
            if (field.type === "multiselect") {
              const values = Array.isArray(value) ? value : [];
              return <fieldset key={field.key} className="rounded-xl border border-border-app p-4">
                <legend className="px-1 text-sm font-semibold">{label}</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">{(field.options ?? []).map((option) => <label key={option}
                  className="flex items-start gap-2 rounded-lg bg-surface-app p-3 text-sm">
                  <input type="checkbox" checked={values.includes(option)} onChange={(event) => changeAnswer(field.key,
                    event.target.checked ? [...values, option] : values.filter((item) => item !== option))} />{option}
                </label>)}</div>
              </fieldset>;
            }
            if (field.type === "textarea") return <label key={field.key} className="block text-sm font-semibold">{label}
              <AppTextarea className="mt-2 min-h-28 w-full" maxLength={10_000}
                value={typeof value === "string" ? value : ""} onChange={(event) => changeAnswer(field.key, event.target.value)} /></label>;
            return <label key={field.key} className="block text-sm font-semibold">{label}
              <AppInput className="mt-2 w-full" type={field.type === "url" ? "url" : "text"} maxLength={10_000}
                value={typeof value === "string" ? value : ""} onChange={(event) => changeAnswer(field.key, event.target.value)} /></label>;
          })}
        </fieldset>
        <div className="flex flex-wrap gap-3 border-t border-border-app pt-5">
          {editable && <>
            <AppButton type="submit" variant="secondary" disabled={action.isPending}>
              {action.isPending ? t("recruitmentApplications.saving") : t("recruitmentApplications.saveDraft")}</AppButton>
            <AppButton type="button" disabled={action.isPending} onClick={() => void submit()}>
              {action.isPending ? t("recruitmentApplications.submitting") : t("recruitmentApplications.submit")}</AppButton>
          </>}
          {canWithdraw && <AppButton type="button" variant="secondary" disabled={action.isPending}
            onClick={() => void withdraw()}>{t("recruitmentApplications.withdraw")}</AppButton>}
          <Link to="/workspace/recruitment" className="inline-flex min-h-11 items-center justify-center rounded-md px-3 font-semibold text-accent-app">
            {t("recruitmentApplications.backToApplications")}</Link>
        </div>
      </form>
    </AppCard>
  </div>;
}
