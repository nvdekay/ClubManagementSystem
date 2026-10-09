import { useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useMyCampaignApplication, useRecruitmentApplicationAction } from "@/hooks/useRecruitmentApplications";
import { usePublicRecruitmentCampaign } from "@/hooks/useRecruitmentCampaigns";
import type { RecruitmentApplication } from "@/services/recruitmentApplications";
import type { RecruitmentAnswer } from "@/services/recruitmentApplications";
import { cn } from "@/utils/cn";

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

function stateTone(state: RecruitmentApplication["state"]): AppBadgeTone {
  if (state === "Accepted" || state === "Onboarded") return "success";
  if (state === "Rejected" || state === "Declined") return "danger";
  if (state === "Waitlisted") return "warning";
  if (state === "Draft" || state === "Withdrawn") return "neutral";
  return "info";
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
    return <div className="space-y-5"><AppSkeleton className="h-16 w-2/3" />
      <AppSkeleton className="h-[34rem] w-full" /></div>;
  }
  if (!auth.data) return <AppNotice className="max-w-3xl">
    <p>{t("recruitmentApplications.signInFirst")}</p>
    <Link className="inline-block font-semibold text-accent-app" to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>
      {t("recruitmentApplications.signInLink")}</Link>
  </AppNotice>;
  // 404 means the campaign is no longer public (closed or completed): not something a retry fixes.
  const campaignGone = (campaignQuery.error as { status?: number } | null)?.status === 404;
  if (campaignQuery.isError || !campaign) return <AppNotice tone="danger" className="max-w-3xl">
    <p role="alert" className="font-semibold text-danger-app">{campaignGone || !campaignQuery.error
      ? t("recruitmentApplications.unavailable") : campaignQuery.error.message}</p>
    {campaignGone ? <Link className="inline-block font-semibold text-accent-app" to="/workspace/recruitment">
      {t("recruitmentApplications.backToApplications")}</Link>
      : <AppButton variant="secondary" onClick={() => void campaignQuery.refetch()}>{t("recruitmentApplications.retry")}</AppButton>}
  </AppNotice>;
  if (applicationQuery.isError) return <AppNotice tone="danger" className="max-w-3xl">
    <p role="alert" className="font-semibold text-danger-app">{applicationQuery.error.message || t("recruitmentApplications.loadError")}</p>
    <AppButton variant="secondary" onClick={() => void applicationQuery.refetch()}>{t("recruitmentApplications.retry")}</AppButton>
  </AppNotice>;

  const appAttachments = application?.attachments ?? [];
  const selectClass = "mt-2 min-h-11 w-full rounded-xl border border-border-app bg-bg-app px-3.5 py-2 text-sm font-normal text-text-app transition-colors hover:border-primary-app focus-visible:border-ring-app focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:outline-none";
  return <>
    <PageHeader title={campaign.title} back={{ to: `/clubs/${campaign.clubId}`, label: t("recruitmentApplications.back") }}
      actions={application && <AppBadge tone={stateTone(application.state)}>{stateLabel(application.state, t)}</AppBadge>} />
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-labelledby="recruitment-form-title" className="min-w-0 lg:order-1">
        <p className="text-xs font-semibold tracking-wide text-primary-app uppercase">{t("recruitmentApplications.answers")}</p>
        <h2 id="recruitment-form-title" className="mt-1 font-heading text-xl font-bold">{t("recruitmentApplications.formTitle")}</h2>
        <div className="mt-5 space-y-3">
          {notice && <AppNotice tone="success" role="status">{notice}</AppNotice>}
          {pageError && <AppNotice tone="danger" role="alert">{pageError}</AppNotice>}
          {application?.decisionReason && <AppNotice><p><strong>{t("recruitmentApplications.decisionReason")}: </strong>{application.decisionReason}</p></AppNotice>}
        </div>

        <form className="mt-6 space-y-6" onSubmit={(event) => { event.preventDefault(); void saveDraft(); }}>
          <fieldset disabled={!editable || action.isPending} className="space-y-6 disabled:opacity-80">
            <label className="block text-sm font-semibold">{t("recruitmentApplications.positions")}
              <select className={selectClass} value={position}
                onChange={(event) => setFormState({ campaignId: campaign.id,
                  position: event.target.value, answers })}>
                {campaign.positions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select></label>
            {campaign.formSchema.map((field) => {
              const label = <span>{field.label}<span className="ml-2 text-xs font-normal text-muted-app">
                {field.required ? t("recruitmentApplications.required") : t("recruitmentApplications.optional")}</span></span>;
              const value = answers[field.key];
              const attachment = appAttachments.find((item) => item.fieldKey === field.key);
              if (field.type === "file") return <div key={field.key} className="border-t border-border-app pt-6">
                <p className="text-sm font-semibold">{label}</p>
                <p className="mt-1 text-xs text-muted-app">{t("recruitmentApplications.fileHint")}</p>
                {attachment ? <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-surface-app px-3 py-2">
                  <AppIcon name="file" className="text-primary-app" />
                  <span className="min-w-0 flex-1 text-sm break-all">{attachment.fileName}</span>
                  <AppButton type="button" variant="secondary" disabled={action.isPending}
                    onClick={() => void download(attachment.id)}>{t("recruitmentApplications.download")}</AppButton>
                </div> : <p className="mt-3 text-sm text-muted-app">{t("recruitmentApplications.noFile")}</p>}
                {editable && <label className="mt-3 block text-sm">{t("recruitmentApplications.selectFile")}
                  <input className="mt-2 block w-full rounded-xl border border-dashed border-border-app bg-bg-app p-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary-soft-app file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-app" type="file" accept=".pdf,.png,.jpg,.jpeg,.docx"
                    onChange={(event) => void upload(field.key, event.target.files?.[0])} />
                </label>}
              </div>;
              if (field.type === "select") return <label key={field.key} className="block text-sm font-semibold">{label}
                <select className={selectClass}
                  value={typeof value === "string" ? value : ""} onChange={(event) => changeAnswer(field.key, event.target.value)}>
                  <option value="">{t("recruitmentApplications.selectAnswer")}</option>
                  {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
                </select></label>;
              if (field.type === "multiselect") {
                const values = Array.isArray(value) ? value : [];
                return <fieldset key={field.key}>
                  <legend className="text-sm font-semibold">{label}</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">{(field.options ?? []).map((option) => <label key={option}
                    className={cn("flex min-h-11 items-start gap-2.5 rounded-xl border border-border-app px-3 py-2.5 text-sm transition-colors hover:border-primary-app", {
                      "border-primary-app bg-primary-soft-app": values.includes(option),
                    })}>
                    <input type="checkbox" className="mt-0.5 size-4 accent-primary-app" checked={values.includes(option)} onChange={(event) => changeAnswer(field.key,
                      event.target.checked ? [...values, option] : values.filter((item) => item !== option))} />{option}
                  </label>)}</div>
                </fieldset>;
              }
              if (field.type === "textarea") return <label key={field.key} className="block text-sm font-semibold">{label}
                <AppTextarea className="mt-2 min-h-28 w-full font-normal" maxLength={10_000}
                  value={typeof value === "string" ? value : ""} onChange={(event) => changeAnswer(field.key, event.target.value)} /></label>;
              return <label key={field.key} className="block text-sm font-semibold">{label}
                <AppInput className="mt-2 w-full font-normal" type={field.type === "url" ? "url" : "text"} maxLength={10_000}
                  value={typeof value === "string" ? value : ""} onChange={(event) => changeAnswer(field.key, event.target.value)} /></label>;
            })}
          </fieldset>
          <div className="flex flex-wrap gap-3 border-t border-border-app pt-6">
            {editable && <>
              <AppButton type="button" disabled={action.isPending} onClick={() => void submit()}>
                <AppIcon name="send" className="size-4" />
                {action.isPending ? t("recruitmentApplications.submitting") : t("recruitmentApplications.submit")}</AppButton>
              <AppButton type="submit" variant="secondary" disabled={action.isPending}>
                {action.isPending ? t("recruitmentApplications.saving") : t("recruitmentApplications.saveDraft")}</AppButton>
            </>}
            {canWithdraw && <AppButton type="button" variant="secondary" disabled={action.isPending}
              onClick={() => void withdraw()}>{t("recruitmentApplications.withdraw")}</AppButton>}
            <Link to="/workspace/recruitment" className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-accent-app hover:underline focus-visible:outline-2 focus-visible:outline-ring-app">
              {t("recruitmentApplications.backToApplications")}</Link>
          </div>
        </form>
      </section>

      <aside aria-label={t("recruitmentApplications.campaign")} className="space-y-5 rounded-2xl bg-surface-app p-5 lg:sticky lg:top-6 lg:order-2">
        <p className="text-xs font-semibold tracking-wide text-primary-app uppercase">{t("recruitmentApplications.campaign")}</p>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <div><dt className="text-sm text-muted-app">{t("recruitmentApplications.closes")}</dt>
            <dd className="mt-1 font-semibold">{new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(campaign.windowEnd))}</dd></div>
          <div><dt className="text-sm text-muted-app">{t("recruitmentApplications.places")}</dt><dd className="mt-1 font-semibold">{campaign.capacity}</dd></div>
        </dl>
        {campaign.criteria && <div className="border-t border-border-app pt-4"><h2 className="text-sm font-bold">{t("recruitmentApplications.criteria")}</h2>
          <p className="mt-1 text-sm whitespace-pre-wrap text-muted-app">{campaign.criteria}</p></div>}
        <div className="border-t border-border-app pt-4"><h2 className="text-sm font-bold">{t("recruitmentApplications.rounds")}</h2>
          <ol className="mt-3 space-y-2">{campaign.selectionSteps.map((step, index) => <li key={`${step.name}-${index}`}
            className="flex items-center gap-3 text-sm">
            <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft-app text-xs font-bold text-primary-app">{index + 1}</span>
            <span className="min-w-0 break-words">{step.name}</span></li>)}</ol></div>
      </aside>
    </div>
  </>;
}
