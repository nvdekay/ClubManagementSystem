import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useApplication, useApplicationAction, useApplicationConfig,
  useApplicationPreview, useDocumentAccess, useFounderLookup } from "@/hooks/useApplications";
import { useAuth } from "@/hooks/useAuth";
import type {
  ApplicationDocument, ApplicationDocumentType, ApplicationDraft, ApplicationRequestError, DraftInput,
  FounderProfile, FounderRole, FoundingField, FoundingIssue,
} from "@/services/applications";
import { cn } from "@/utils/cn";

function stateTone(state: string): AppBadgeTone {
  if (state === "Approved") return "success";
  if (state === "Rejected" || state === "Expired") return "danger";
  if (state === "Revision Requested") return "warning";
  if (state === "Draft" || state === "Withdrawn") return "neutral";
  return "info";
}

const sectionTitleClass = "font-heading text-lg font-bold";
const roles: FounderRole[] = ["LEADER", "VICE_LEADER", "MEMBER"];
const fileRules: Record<ApplicationDocumentType, { accept: string; types: string[]; maxBytes: number; size: string }> = {
  PROPOSAL: { accept: ".pdf,.docx", maxBytes: 10 * 1024 * 1024, size: "10 MB",
    types: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
  LOGO: { accept: ".png,.jpg,.jpeg", maxBytes: 2 * 1024 * 1024, size: "2 MB",
    types: ["image/png", "image/jpeg"] },
};
/** Which step fixes each submission issue, so the review step can jump straight there. */
const issueStep: Record<FoundingIssue, number> = {
  clubName: 0, field: 0, fieldUnavailable: 0, summary: 0, objectives: 0, fanpageUrl: 0, contactEmail: 0,
  foundersTooFew: 1, applicantNotFounder: 1, duplicateFounder: 1, leaderCount: 1, viceLeaderCount: 1,
  leaderHoldsAnotherClub: 1, proposal: 2, logo: 2,
};

function inputFrom(draft: ApplicationDraft): DraftInput {
  return { clubName: draft.clubName, fieldId: draft.fieldId, summary: draft.summary,
    objectives: draft.objectives, fanpageUrl: draft.fanpageUrl, contactEmail: draft.contactEmail,
    founders: draft.founders };
}

export function ApplicationEditorPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAuth();
  const config = useApplicationConfig(Boolean(auth.data));
  const detail = useApplication(id, Boolean(auth.data));
  const action = useApplicationAction();
  const documentAccess = useDocumentAccess();
  const founderLookup = useFounderLookup();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftInput | null>(null);
  const [notice, setNotice] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  const [submitIssues, setSubmitIssues] = useState<FoundingIssue[] | null>(null);
  const [nameConflict, setNameConflict] = useState(false);
  const [founderEmail, setFounderEmail] = useState("");
  const [founderError, setFounderError] = useState<string | null>(null);
  const [addedFounders, setAddedFounders] = useState<Record<string, FounderProfile>>({});
  const [uploading, setUploading] = useState<ApplicationDocumentType | null>(null);
  const fileInputs = { PROPOSAL: useRef<HTMLInputElement>(null), LOGO: useRef<HTMLInputElement>(null) };
  const application = detail.data?.application;
  const state = application?.state;
  const editable = !id || state === "Draft" || state === "Revision Requested";
  const canWithdraw = state === "Submitted" || state === "Under Review" || state === "Revision Requested";
  // The server preview lists what still blocks submission; only fetched on the review step.
  const preview = useApplicationPreview(id, editable && step === 3 && !action.isPending);
  const latestDecision = detail.data?.decisions.at(-1);
  const me = auth.data?.user;
  const currentDraft: DraftInput | null = draft ?? (application ? inputFrom(application.draft)
    : me ? { clubName: "", fieldId: "", summary: "", objectives: "", fanpageUrl: "", contactEmail: "",
      founders: [{ userId: me.id, role: "LEADER" }] } : null);
  const documents = application?.draft.documents ?? [];
  const steps = [t("applications.stepClub"), t("applications.stepFounders"),
    t("applications.stepFiles"), t("applications.stepReview")];

  function stateLabel(value: string): string {
    switch (value) {
      case "Draft": return t("applications.statusDraft");
      case "Submitted": return t("applications.statusSubmitted");
      case "Under Review": return t("applications.statusUnderReview");
      case "Revision Requested": return t("applications.statusRevisionRequested");
      case "Approved": return t("applications.statusApproved");
      case "Rejected": return t("applications.statusRejected");
      case "Withdrawn": return t("applications.statusWithdrawn");
      case "Expired": return t("applications.statusExpired");
      default: return value;
    }
  }

  function sectionLabel(section: string): string {
    switch (section) {
      case "club-information": return t("reviews.sectionClub");
      case "founders": return t("reviews.sectionFounders");
      case "documents": return t("reviews.sectionDocuments");
      case "role-structure": return t("reviews.sectionRoles");
      case "other": return t("reviews.sectionOther");
      default: return section;
    }
  }

  function errorText(error: unknown): string {
    return error instanceof Error ? error.message : t("applications.actionError");
  }

  function change<K extends keyof DraftInput>(key: K, value: DraftInput[K]) {
    setNotice(null);
    setSubmitIssues(null);
    setDraft((current) => ({ ...(current ?? currentDraft!), [key]: value }));
  }

  /** Persist local edits (creating the draft on first save); resolves to the application id. */
  async function persist(): Promise<string | null> {
    if (!currentDraft || !auth.data) return null;
    if (id && !draft) return id;
    setNotice(null);
    try {
      const result = id
        ? await action.mutateAsync({ kind: "save", id, input: currentDraft,
          draftRevision: application?.draftRevision ?? 0, csrfToken: auth.data.csrfToken })
        : await action.mutateAsync({ kind: "create", input: currentDraft, csrfToken: auth.data.csrfToken });
      if (!("draft" in result)) throw new Error(t("applications.actionError"));
      setDraft(null);
      if (!id) navigate(`/workspace/applications/${result.id}`, { replace: true });
      return result.id;
    } catch (error) {
      setNotice({ tone: "danger", text: errorText(error) });
      return null;
    }
  }

  async function goTo(target: number) {
    if (editable && !(await persist())) return;
    setStep(target);
  }

  async function saveOnly() {
    if (await persist()) setNotice({ tone: "success", text: t("applications.success") });
  }

  function founderProfile(userId: string): FounderProfile | undefined {
    if (me && userId === me.id) return { id: me.id, displayName: me.displayName, email: me.email };
    return addedFounders[userId] ?? detail.data?.founders.find((item) => item.id === userId);
  }

  async function addFounder() {
    const email = founderEmail.trim();
    if (!email || !currentDraft) return;
    setFounderError(null);
    try {
      const profile = await founderLookup.mutateAsync(email);
      if (currentDraft.founders.some((founder) => founder.userId === profile.id)) {
        setFounderError(t("applications.founderAlreadyAdded"));
        return;
      }
      setAddedFounders((current) => ({ ...current, [profile.id]: profile }));
      const hasVice = currentDraft.founders.some((founder) => founder.role === "VICE_LEADER");
      change("founders", [...currentDraft.founders,
        { userId: profile.id, role: hasVice ? "MEMBER" : "VICE_LEADER" }]);
      setFounderEmail("");
    } catch (error) {
      const status = (error as { status?: number }).status;
      setFounderError(status === 404 ? t("applications.founderNotFound") : t("applications.founderLookupError"));
    }
  }

  /** Only one president: choosing a new one hands the previous president the chosen person's old role. */
  function setRole(userId: string, role: FounderRole) {
    if (!currentDraft) return;
    const previous = currentDraft.founders.find((founder) => founder.userId === userId)?.role ?? "MEMBER";
    change("founders", currentDraft.founders.map((founder) => {
      if (founder.userId === userId) return { ...founder, role };
      if (role === "LEADER" && founder.role === "LEADER") return { ...founder, role: previous };
      return founder;
    }));
  }

  async function upload(documentType: ApplicationDocumentType, file: File | undefined) {
    if (!file || !id || !auth.data) return;
    const rule = fileRules[documentType];
    if (!rule.types.includes(file.type)) {
      setNotice({ tone: "danger", text: t("applications.fileWrongType") });
      return;
    }
    if (file.size > rule.maxBytes) {
      setNotice({ tone: "danger", text: t("applications.fileTooLarge", { size: rule.size }) });
      return;
    }
    setNotice(null);
    setUploading(documentType);
    try {
      await action.mutateAsync({ kind: "upload", id, documentType, file, csrfToken: auth.data.csrfToken });
    } catch (error) {
      setNotice({ tone: "danger", text: errorText(error) });
    } finally {
      setUploading(null);
    }
  }

  async function remove(documentId: string) {
    if (!id || !auth.data) return;
    setNotice(null);
    try { await action.mutateAsync({ kind: "remove", id, documentId, csrfToken: auth.data.csrfToken }); }
    catch (error) { setNotice({ tone: "danger", text: errorText(error) }); }
  }

  async function download(documentId: string) {
    if (!id) return;
    setNotice(null);
    try {
      const access = await documentAccess.mutateAsync({ id, documentId });
      window.location.assign(access.url);
    } catch (error) {
      setNotice({ tone: "danger", text: errorText(error) });
    }
  }

  async function submit() {
    if (!id || !auth.data || !window.confirm(t("applications.submitPrompt"))) return;
    setNotice(null);
    try {
      const result = await action.mutateAsync({ kind: "submit", id, csrfToken: auth.data.csrfToken });
      if ("activeNameConflict" in result) setNameConflict(result.activeNameConflict);
      setNotice({ tone: "success", text: t("applications.submitted") });
    } catch (error) {
      const issues = (error as ApplicationRequestError).details?.issues;
      if (issues?.length) setSubmitIssues(issues);
      else setNotice({ tone: "danger", text: errorText(error) });
    }
  }

  async function withdraw() {
    if (!id || !auth.data || !window.confirm(t("applications.withdrawConfirm"))) return;
    setNotice(null);
    try { await action.mutateAsync({ kind: "withdraw", id, csrfToken: auth.data.csrfToken }); }
    catch (error) { setNotice({ tone: "danger", text: errorText(error) }); }
  }

  if (auth.isPending || (auth.data && (config.isPending || (id && detail.isPending)))) {
    return <div className="max-w-4xl space-y-4"><AppSkeleton className="h-12 w-2/3" /><AppSkeleton className="h-72 w-full" /></div>;
  }
  if (!auth.data) {
    return <AppNotice className="max-w-3xl">
      <p>{t("applications.signIn")}</p>
      <Link className="inline-block font-semibold text-accent-app"
        to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>{t("applications.signInLink")}</Link>
    </AppNotice>;
  }
  if (config.isError || !config.data) {
    return <AppNotice tone="danger" className="max-w-3xl"><p role="alert">{t("applications.unconfigured")}</p></AppNotice>;
  }
  if (id && (detail.isError || !application)) {
    return <AppNotice tone="danger" className="max-w-3xl"><p role="alert">{t("applications.notFound")}</p></AppNotice>;
  }
  if (!currentDraft) return <AppSkeleton className="h-72 w-full max-w-4xl" />;

  const { requirements, maxViceLeaders } = config.data;
  const required = requirements.required;
  const fieldOptions = config.data.fields.map((field) => ({ value: field.id, label: field.name }));
  // A field ICPDP hid after it was saved stays visible (flagged) until the student re-picks.
  if (currentDraft.fieldId && !fieldOptions.some((option) => option.value === currentDraft.fieldId)) {
    fieldOptions.push({ value: currentDraft.fieldId,
      label: t("applications.fieldHidden", { name: application?.draft.field || currentDraft.fieldId }) });
  }
  const leaders = currentDraft.founders.filter((founder) => founder.role === "LEADER").length;
  const viceLeaders = currentDraft.founders.filter((founder) => founder.role === "VICE_LEADER").length;
  const rolesValid = leaders === 1 && viceLeaders >= 1 && viceLeaders <= maxViceLeaders;
  const missingFounders = Math.max(0, requirements.minFoundingMembers - currentDraft.founders.length);
  const issues = submitIssues ?? preview.data?.issues ?? [];
  function uploaded(type: ApplicationDocumentType): ApplicationDocument | undefined {
    return documents.find((item) => item.documentType === type);
  }

  function label(text: string, field?: FoundingField | "always"): ReactNode {
    const isRequired = field === "always" || (field ? required[field] : false);
    return <span className="flex flex-wrap items-center gap-2">{text}
      <span className={cn("text-xs font-normal text-muted-app", { "text-danger-app": isRequired })}>
        {isRequired ? `* ${t("applications.required")}` : t("applications.optional")}</span></span>;
  }

  function fileCard(type: ApplicationDocumentType, title: string, hint: string, field: FoundingField) {
    const current = uploaded(type);
    const rule = fileRules[type];
    return <section className="space-y-3 rounded-2xl bg-surface-app p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-60">
          <h3 className="font-heading font-bold">{label(title, field)}</h3>
          <p className="mt-1 text-sm text-muted-app">{hint}</p>
        </div>
        {type === "LOGO" && current?.publicUrl && <img src={current.publicUrl} alt={t("applications.logoPreview")}
          className="size-20 shrink-0 rounded-xl border border-border-app object-cover" />}
      </div>
      {current && <div className="flex flex-wrap items-center gap-3">
        <AppIcon name="file" className="text-primary-app" />
        <span className="min-w-0 flex-1 basis-40 break-words text-sm">{current.fileName}</span>
        <div className="flex flex-wrap gap-2">
          <AppButton type="button" variant="secondary" onClick={() => void download(current.id)}>
            {t("applications.download")}</AppButton>
          {editable && <AppButton type="button" variant="secondary" disabled={action.isPending}
            onClick={() => void remove(current.id)}>{t("applications.remove")}</AppButton>}
        </div>
      </div>}
      {editable && id && <>
        <input ref={fileInputs[type]} type="file" accept={rule.accept} className="hidden"
          onChange={(event) => { void upload(type, event.target.files?.[0]); event.target.value = ""; }} />
        <AppButton type="button" variant={current ? "secondary" : "primary"} disabled={action.isPending}
          onClick={() => fileInputs[type].current?.click()}>
          <AppIcon name="plus" className="size-4" />
          {uploading === type ? t("applications.uploading") : current ? t("applications.replace") : t("applications.choose")}
        </AppButton>
      </>}
    </section>;
  }

  function founderRow(userId: string, role: FounderRole, readOnly: boolean) {
    const profile = founderProfile(userId);
    const name = profile?.displayName ?? userId;
    return <li key={userId} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint-soft-app text-sm font-bold text-mint-app">
        {name.trim().charAt(0).toUpperCase()}</span>
      <span className="min-w-0 flex-1 basis-40">
        <span className="block font-semibold break-words">{name}{userId === me?.id && ` (${t("applications.you")})`}</span>
        {profile && <span className="block text-xs break-all text-muted-app">{profile.email}</span>}
      </span>
      {readOnly ? <AppBadge tone={role === "MEMBER" ? "neutral" : "info"}>{t(`applications.role${role}`)}</AppBadge>
        : <div className="flex flex-wrap items-center gap-2">
          <AppSelect className="w-44" label={t("applications.roleLabel", { name })} value={role}
            options={roles.map((value) => ({ value, label: t(`applications.role${value}`) }))}
            onChange={(value) => setRole(userId, value)} />
          {userId !== me?.id && <AppButton type="button" variant="secondary" onClick={() => change("founders",
            currentDraft!.founders.filter((founder) => founder.userId !== userId))}>{t("applications.remove")}</AppButton>}
        </div>}
    </li>;
  }

  /** What was entered, shown on the review step and as the read-only view after submission. */
  function summary(value: DraftInput & { field?: string }) {
    const fieldName = config.data!.fields.find((field) => field.id === value.fieldId)?.name ?? value.field ?? "";
    const rows: [string, string][] = [[t("applications.clubName"), value.clubName], [t("applications.field"), fieldName],
      [t("applications.summary"), value.summary], [t("applications.objectives"), value.objectives],
      [t("applications.fanpageUrl"), value.fanpageUrl], [t("applications.contactEmail"), value.contactEmail]];
    return <div className="space-y-6">
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,12rem)_1fr]">{rows.map(([term, text]) => <div key={term} className="contents">
        <dt className="text-sm font-medium text-muted-app">{term}</dt>
        <dd className="text-sm break-words whitespace-pre-wrap">{text || "—"}</dd></div>)}</dl>
      <div>
        <h3 className="font-heading font-bold">{t("applications.founders")}</h3>
        <ul className="mt-2 divide-y divide-border-app rounded-xl border border-border-app">
          {value.founders.map((founder) => founderRow(founder.userId, founder.role, true))}</ul>
      </div>
      <div className="flex flex-wrap gap-6">
        {(["PROPOSAL", "LOGO"] as const).map((type) => {
          const current = uploaded(type);
          return <div key={type} className="min-w-0 flex-1 basis-56">
            <h3 className="font-heading font-bold">{type === "PROPOSAL" ? t("applications.proposal") : t("applications.logo")}</h3>
            {current ? <div className="mt-2 flex flex-wrap items-center gap-3">
              {type === "LOGO" && current.publicUrl && <img src={current.publicUrl} alt={t("applications.logoPreview")}
                className="size-14 rounded-lg border border-border-app object-cover" />}
              <button type="button" className="text-left text-sm font-semibold break-all text-accent-app"
                onClick={() => void download(current.id)}>{current.fileName}</button>
            </div> : <p className="mt-2 text-sm text-muted-app">—</p>}
          </div>;
        })}
      </div>
    </div>;
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title={id ? currentDraft.clubName || t("applications.title") : t("applications.new")}
        description={t("applications.description")}
        back={{ to: "/workspace/applications", label: t("applications.back") }}
        actions={state && <AppBadge tone={stateTone(state)}>{t("applications.state")}: {stateLabel(state)}</AppBadge>} />
      {latestDecision && (state === "Revision Requested" || state === "Rejected") && (
        <section role="status" className={cn("mb-8 rounded-xl border-l-4 px-5 py-4", {
          "border-warning-app bg-warning-app/10": state === "Revision Requested",
          "border-danger-app bg-danger-app/10": state === "Rejected",
        })}>
          <h2 className="font-semibold font-heading">{state === "Rejected"
            ? t("applications.feedbackRejectedTitle") : t("applications.feedbackRevisionTitle")}</h2>
          {latestDecision.reason && <p className="mt-2 whitespace-pre-wrap text-sm">{latestDecision.reason}</p>}
          {latestDecision.sections.length > 0 && <p className="mt-3 text-sm">
            <span className="font-semibold">{t("applications.feedbackSections")}:</span>{" "}
            {latestDecision.sections.map(sectionLabel).join(", ")}</p>}
          {state === "Revision Requested" && application?.revisionDeadlineAt && <p className="mt-2 text-sm">
            <span className="font-semibold">{t("applications.feedbackDeadline")}:</span>{" "}
            {new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" })
              .format(new Date(application.revisionDeadlineAt))}</p>}
        </section>
      )}

      {notice && <AppNotice tone={notice.tone} role={notice.tone === "danger" ? "alert" : "status"} className="mb-6">
        {notice.text}</AppNotice>}
      {nameConflict && <AppNotice tone="warning" role="status" className="mb-6">{t("applications.submitWarning")}</AppNotice>}

      {!editable && application ? <section className="space-y-6">{summary(application.draft)}</section> : <>
        <nav aria-label={t("applications.stepOf", { current: step + 1, total: steps.length })} className="mb-8">
          <ol className="flex flex-wrap gap-2">{steps.map((name, index) => (
            <li key={name}>
              <button type="button" aria-current={index === step ? "step" : undefined}
                disabled={action.isPending || (!id && index > 0)} onClick={() => void goTo(index)}
                className={cn("flex min-h-10 items-center gap-2 rounded-full border border-border-app px-4 text-sm font-medium text-muted-app",
                  { "border-primary-app bg-primary-soft-app text-primary-app": index === step })}>
                <span className="font-bold">{index + 1}</span>{name}
              </button>
            </li>
          ))}</ol>
        </nav>

        {step === 0 && <section className="grid gap-5 sm:grid-cols-2">
          <p className="text-sm text-muted-app sm:col-span-2">{t("applications.publicHint")}</p>
          <label className="text-sm font-medium">{label(t("applications.clubName"), "always")}
            <AppInput className="mt-2 block w-full" maxLength={200} value={currentDraft.clubName}
              onChange={(event) => change("clubName", event.target.value)} />
            <span className="mt-1 block text-xs font-normal text-muted-app">{t("applications.clubNameHint")}</span>
          </label>
          <div className="text-sm font-medium">{label(t("applications.field"), "always")}
            {fieldOptions.length ? <AppSelect className="mt-2 w-full" label={t("applications.field")}
              value={currentDraft.fieldId} onChange={(value) => change("fieldId", value)}
              options={[{ value: "", label: t("applications.fieldPlaceholder") }, ...fieldOptions]} />
              : <p className="mt-2 text-sm font-normal text-danger-app">{t("applications.noFields")}</p>}
          </div>
          <label className="text-sm font-medium sm:col-span-2">{label(t("applications.summary"), "summary")}
            <AppTextarea className="mt-2 block w-full" maxLength={1000} rows={2} value={currentDraft.summary}
              onChange={(event) => change("summary", event.target.value)} />
            <span className="mt-1 block text-xs font-normal text-muted-app">{t("applications.summaryHint")}</span>
          </label>
          <label className="text-sm font-medium sm:col-span-2">{label(t("applications.objectives"), "objectives")}
            <AppTextarea className="mt-2 block w-full" maxLength={5000} value={currentDraft.objectives}
              onChange={(event) => change("objectives", event.target.value)} />
            <span className="mt-1 block text-xs font-normal text-muted-app">{t("applications.objectivesHint")}</span>
          </label>
          <label className="text-sm font-medium">{label(t("applications.fanpageUrl"), "fanpageUrl")}
            <AppInput className="mt-2 block w-full" type="url" maxLength={2000} value={currentDraft.fanpageUrl}
              placeholder={t("applications.fanpagePlaceholder")} onChange={(event) => change("fanpageUrl", event.target.value)} />
          </label>
          <label className="text-sm font-medium">{label(t("applications.contactEmail"), "contactEmail")}
            <AppInput className="mt-2 block w-full" type="email" maxLength={320} value={currentDraft.contactEmail}
              onChange={(event) => change("contactEmail", event.target.value)} />
          </label>
        </section>}

        {step === 1 && <section className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className={sectionTitleClass}>{t("applications.founders")}</h2>
            <AppBadge tone={missingFounders ? "warning" : "success"}>{t("applications.foundersProgress",
              { count: currentDraft.founders.length, required: requirements.minFoundingMembers })}</AppBadge>
            <span className="text-sm text-muted-app">{missingFounders
              ? t("applications.foundersMissing", { count: missingFounders }) : t("applications.foundersEnough")}</span>
          </div>
          <ul className="divide-y divide-border-app rounded-xl border border-border-app">
            {currentDraft.founders.map((founder) => founderRow(founder.userId, founder.role, false))}</ul>
          <p className={cn("text-sm text-muted-app", { "text-danger-app": !rolesValid })}>
            {t("applications.rolesRule", { max: maxViceLeaders })}</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1 basis-56 text-sm font-medium">{t("applications.founderEmail")}
              <AppInput className="mt-2 block w-full" type="email" value={founderEmail}
                onChange={(event) => { setFounderEmail(event.target.value); setFounderError(null); }}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addFounder(); } }} />
            </label>
            <AppButton type="button" variant="secondary" disabled={!founderEmail.trim() || founderLookup.isPending}
              onClick={() => void addFounder()}><AppIcon name="plus" className="size-4" />{t("applications.addFounder")}</AppButton>
          </div>
          {founderError && <p role="alert" className="text-sm text-danger-app">{founderError}</p>}
          <p className="text-xs text-muted-app">{t("applications.foundersHint")}</p>
          <AppNotice>{t("applications.rolesHint")}</AppNotice>
        </section>}

        {step === 2 && <section className="space-y-5">
          {!id && <p className="text-sm text-muted-app">{t("applications.saveFirst")}</p>}
          {fileCard("PROPOSAL", t("applications.proposal"), t("applications.proposalHint"), "proposal")}
          {fileCard("LOGO", t("applications.logo"), t("applications.logoHint"), "logo")}
          <p className="text-sm text-muted-app">{t("applications.otherDocumentsHint")}</p>
        </section>}

        {step === 3 && <section className="space-y-6">
          <h2 className={sectionTitleClass}>{t("applications.reviewTitle")}</h2>
          {preview.isPending && !submitIssues ? <AppSkeleton className="h-20 w-full" />
            : preview.isError && !submitIssues ? <AppNotice tone="danger" role="alert">{preview.error.message}</AppNotice>
              : issues.length ? <AppNotice tone="warning" role="status">
                <p className="font-semibold">{t("applications.reviewBlocked")}</p>
                <ul className="mt-2 space-y-1">{issues.map((issue) => <li key={issue} className="flex flex-wrap items-center gap-2">
                  <span>{t(`applications.issue_${issue}`, { count: requirements.minFoundingMembers })}</span>
                  <button type="button" className="text-sm font-semibold text-accent-app"
                    onClick={() => setStep(issueStep[issue])}>{t("applications.fix")}</button>
                </li>)}</ul>
              </AppNotice> : <AppNotice tone="success" role="status">{t("applications.reviewReady")}</AppNotice>}
          {preview.data?.activeNameConflict && <AppNotice tone="warning">{t("applications.submitWarning")}</AppNotice>}
          {summary({ ...currentDraft, field: application?.draft.field })}
        </section>}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-border-app pt-6">
          {step > 0 && <AppButton type="button" variant="secondary" disabled={action.isPending}
            onClick={() => void goTo(step - 1)}>{t("applications.previous")}</AppButton>}
          <AppButton type="button" variant="secondary" disabled={action.isPending} onClick={() => void saveOnly()}>
            {action.isPending ? t("applications.saving") : t("applications.save")}</AppButton>
          {step < 3 && <AppButton type="button" disabled={action.isPending || !currentDraft.clubName.trim() || !currentDraft.fieldId}
            onClick={() => void goTo(step + 1)}>{t("applications.next")}</AppButton>}
          {step === 3 && <AppButton type="button" disabled={action.isPending || preview.isPending || issues.length > 0}
            onClick={() => void submit()}><AppIcon name="send" className="size-4" />{t("applications.submit")}</AppButton>}
        </div>
      </>}

      {canWithdraw && <div className="mt-8"><AppButton type="button" variant="secondary" disabled={action.isPending}
        onClick={() => void withdraw()}>{t("applications.withdraw")}</AppButton></div>}

      {application && (
        <section className="mt-10 space-y-3 border-t border-border-app pt-8">
          <h2 className={sectionTitleClass}>{t("applications.history")}</h2>
          {detail.data?.versions.length ? <ol className="space-y-0">{detail.data.versions.map((version) => (
            <li key={version.id} className="relative space-y-2 border-l-2 border-border-app pb-6 pl-6 last:pb-0">
              <span aria-hidden="true" className="absolute top-1 -left-[7px] size-3 rounded-full bg-primary-app" />
              <h3 className="font-semibold font-heading">{t("applications.version", { number: version.versionNo })}</h3>
              <p className="text-sm text-muted-app">{t("applications.submittedAt", { date:
                new Intl.DateTimeFormat(i18n.language === "vi" ? "vi-VN" : "en-US", {
                  dateStyle: "medium", timeStyle: "short",
                }).format(new Date(version.submittedAt)) })}</p>
              <p className="text-xs text-muted-app">{t("applications.policyVersion", { id: version.policyVersionId })}</p>
              <details>
                <summary className="inline-flex min-h-10 items-center text-sm font-medium text-accent-app">{version.snapshot.clubName}</summary>
                <p className="mt-2 text-sm">{version.snapshot.summary || version.snapshot.objectives}</p>
                <p className="mt-2 text-xs text-muted-app">
                  {version.snapshot.documents.map((item: ApplicationDocument) => item.fileName).join(", ")}
                </p>
              </details>
            </li>
          ))}</ol> : <p className="text-sm text-muted-app">{t("applications.historyEmpty")}</p>}
        </section>
      )}
    </div>
  );
}
