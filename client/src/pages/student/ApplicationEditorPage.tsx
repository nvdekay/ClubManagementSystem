import { useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge, type AppBadgeTone } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useApplication, useApplicationAction, useApplicationConfig,
  useApplicationPreview, useDocumentAccess, useFounderLookup } from "@/hooks/useApplications";
import type { FounderProfile } from "@/services/applications";
import { useAuth } from "@/hooks/useAuth";
import type { ApplicationConfig, DraftInput, ProposedRole } from "@/services/applications";
import { cn } from "@/utils/cn";

function stateTone(state: string): AppBadgeTone {
  if (state === "Approved") return "success";
  if (state === "Rejected" || state === "Expired") return "danger";
  if (state === "Revision Requested") return "warning";
  if (state === "Draft" || state === "Withdrawn") return "neutral";
  return "info";
}

const sectionClass = "border-t border-border-app pt-8";
const sectionTitleClass = "font-heading text-lg font-bold";
const fileInputClass = "mt-2 block w-full rounded-xl border border-dashed border-border-app bg-bg-app p-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary-soft-app file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-app";

function initialDraft(config: ApplicationConfig, founderId: string): DraftInput {
  return { clubName: "", field: "", objectives: "", foundingUserIds: founderId ? [founderId] : [],
    proposedRoles: config.defaultRoles.map((role) => ({ ...role, permissionCodes: [] })) };
}

export function ApplicationEditorPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = useAuth();
  const config = useApplicationConfig(Boolean(auth.data));
  const detail = useApplication(id, Boolean(auth.data));
  // Fetched on demand by "review and submit" (refetch ignores enabled); loading it eagerly 409s
  // once the application is no longer editable.
  const preview = useApplicationPreview(id, false);
  const action = useApplicationAction();
  const documentAccess = useDocumentAccess();
  const [draft, setDraft] = useState<DraftInput | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [nameConflict, setNameConflict] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const founderLookup = useFounderLookup();
  const [founderEmail, setFounderEmail] = useState("");
  const [founderError, setFounderError] = useState<string | null>(null);
  const [addedFounders, setAddedFounders] = useState<Record<string, FounderProfile>>({});
  const application = detail.data?.application;
  const latestDecision = detail.data?.decisions.at(-1);
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
  const state = application?.state;
  const editable = !id || state === "Draft" || state === "Revision Requested";
  const canWithdraw = state === "Submitted" || state === "Under Review" || state === "Revision Requested";
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
  const currentDraft = draft ?? (application ? {
    clubName: application.draft.clubName, field: application.draft.field,
    objectives: application.draft.objectives,
    foundingUserIds: application.draft.foundingUserIds,
    proposedRoles: application.draft.proposedRoles,
  } : config.data ? initialDraft(config.data, auth.data?.user.id ?? "") : null);

  function change<K extends keyof DraftInput>(key: K, value: DraftInput[K]) {
    setConfirmSubmit(false);
    setDraft((current) => ({ ...(current ?? currentDraft!), [key]: value }));
  }

  function updateRole(index: number, update: Partial<ProposedRole>) {
    const roles = currentDraft?.proposedRoles.map((role, position) =>
      position === index ? { ...role, ...update } : role) ?? [];
    change("proposedRoles", roles);
  }

  async function save(): Promise<string | null> {
    if (!currentDraft || !auth.data) return null;
    setLocalError(null);
    try {
      const result = id
        ? await action.mutateAsync({ kind: "save", id, input: currentDraft,
          draftRevision: application?.draftRevision ?? 0, csrfToken: auth.data.csrfToken })
        : await action.mutateAsync({ kind: "create", input: currentDraft, csrfToken: auth.data.csrfToken });
      if (!("draft" in result)) throw new Error(t("applications.actionError"));
      const saved = result;
      if (!id) navigate(`/workspace/applications/${saved.id}`, { replace: true });
      return saved.id;
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : t("applications.actionError"));
      return null;
    }
  }

  async function prepareSubmission() {
    setLocalError(null);
    setNameConflict(false);
    const applicationId = await save();
    if (!applicationId || applicationId !== id) return;
    const result = await preview.refetch();
    if (result.isError || !result.data) {
      setLocalError(result.error?.message ?? t("applications.actionError"));
      return;
    }
    if (result.data?.activeNameConflict) setNameConflict(true);
    setConfirmSubmit(true);
  }

  async function confirmSubmission() {
    if (!id || !auth.data) return;
    setLocalError(null);
    try {
      const result = await action.mutateAsync({ kind: "submit", id, csrfToken: auth.data.csrfToken });
      if ("activeNameConflict" in result) setNameConflict(result.activeNameConflict);
      setConfirmSubmit(false);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : t("applications.actionError"));
    }
  }

  function founderProfile(founderId: string): FounderProfile | undefined {
    if (auth.data && founderId === auth.data.user.id) {
      return { id: founderId, displayName: auth.data.user.displayName, email: auth.data.user.email };
    }
    return addedFounders[founderId] ?? detail.data?.founders.find((item) => item.id === founderId);
  }

  async function addFounder() {
    const email = founderEmail.trim();
    if (!email || !currentDraft) return;
    setFounderError(null);
    try {
      const profile = await founderLookup.mutateAsync(email);
      if (currentDraft.foundingUserIds.includes(profile.id)) {
        setFounderError(t("applications.founderAlreadyAdded"));
        return;
      }
      setAddedFounders((current) => ({ ...current, [profile.id]: profile }));
      change("foundingUserIds", [...currentDraft.foundingUserIds, profile.id]);
      setFounderEmail("");
    } catch (error) {
      const status = (error as { status?: number }).status;
      setFounderError(status === 404 ? t("applications.founderNotFound") : t("applications.founderLookupError"));
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !file || !documentType || !auth.data) return;
    setLocalError(null);
    try {
      await action.mutateAsync({ kind: "upload", id, file, documentType, csrfToken: auth.data.csrfToken });
      setFile(null);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : t("applications.actionError"));
    }
  }

  async function withdraw() {
    if (!id || !auth.data || !window.confirm(t("applications.withdrawConfirm"))) return;
    setLocalError(null);
    try { await action.mutateAsync({ kind: "withdraw", id, csrfToken: auth.data.csrfToken }); }
    catch (error) { setLocalError(error instanceof Error ? error.message : t("applications.actionError")); }
  }

  async function remove(documentId: string) {
    if (!id || !auth.data) return;
    setLocalError(null);
    try { await action.mutateAsync({ kind: "remove", id, documentId, csrfToken: auth.data.csrfToken }); }
    catch (error) { setLocalError(error instanceof Error ? error.message : t("applications.actionError")); }
  }

  async function download(documentId: string) {
    if (!id) return;
    setLocalError(null);
    try {
      const access = await documentAccess.mutateAsync({ id, documentId });
      window.location.assign(access.url);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : t("applications.actionError"));
    }
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

  const documents = application?.draft.documents ?? [];
  const requiredDocuments = config.data.requirements.mandatoryApplicationDocuments;

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

      {/* Only the editable sections sit in a disabled fieldset: it would also disable the
          document download and withdraw buttons, which stay available after submission. */}
      <div className="space-y-10">
      <fieldset disabled={!editable} className="space-y-10 disabled:opacity-80">
        <section className="grid gap-5 sm:grid-cols-2">
          <h2 className={cn(sectionTitleClass, "sm:col-span-2")}>{t("applications.basic")}</h2>
          <label className="text-sm font-medium">{t("applications.clubName")}
            <AppInput className="mt-2 block w-full" maxLength={200} required value={currentDraft.clubName}
              onChange={(event) => change("clubName", event.target.value)} />
          </label>
          <label className="text-sm font-medium">{t("applications.field")}
            <AppInput className="mt-2 block w-full" maxLength={100} required value={currentDraft.field}
              onChange={(event) => change("field", event.target.value)} />
          </label>
          <label className="text-sm font-medium sm:col-span-2">{t("applications.objectives")}
            <AppTextarea className="mt-2 block w-full" maxLength={5000} value={currentDraft.objectives}
              onChange={(event) => change("objectives", event.target.value)} />
          </label>
          <div className="text-sm sm:col-span-2">
            <p className="font-medium">{t("applications.founders")}</p>
            <ul className="mt-2 divide-y divide-border-app rounded-xl border border-border-app">{currentDraft.foundingUserIds.map((founderId) => {
              const profile = founderProfile(founderId);
              return <li key={founderId} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint-soft-app text-sm font-bold text-mint-app">
                  {(profile?.displayName ?? founderId).trim().charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="block font-semibold break-words">{profile?.displayName ?? founderId}</span>
                  {profile && <span className="block text-xs break-all text-muted-app">{profile.email}</span>}</span>
                {founderId !== auth.data?.user.id && <AppButton type="button" variant="secondary"
                  onClick={() => change("foundingUserIds", currentDraft.foundingUserIds.filter((value) => value !== founderId))}>
                  {t("applications.remove")}</AppButton>}
              </li>;
            })}</ul>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1 basis-56 font-medium">{t("applications.founderEmail")}
                <AppInput className="mt-2 block w-full" type="email" value={founderEmail}
                  onChange={(event) => { setFounderEmail(event.target.value); setFounderError(null); }}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addFounder(); } }} />
              </label>
              <AppButton type="button" variant="secondary" disabled={!founderEmail.trim() || founderLookup.isPending}
                onClick={() => void addFounder()}><AppIcon name="plus" className="size-4" />{t("applications.addFounder")}</AppButton>
            </div>
            {founderError && <p role="alert" className="mt-2 text-sm text-danger-app">{founderError}</p>}
            <span className="mt-1 block text-xs text-muted-app">
              {t("applications.foundersHint", { count: config.data.requirements.minFoundingMembers })}
            </span>
          </div>
        </section>
      </fieldset>

        <section className={cn(sectionClass, "space-y-4")}>
          <h2 className={sectionTitleClass}>{t("applications.documents")}</h2>
          <p className="text-sm text-muted-app">{requiredDocuments.length
            ? t("applications.requiredDocuments", { types: requiredDocuments.join(", ") })
            : t("applications.noRequiredDocuments")}</p>
          {requiredDocuments.some((required) => !documents.some((document) => document.documentType === required)) && (
            <p role="status" className="rounded-xl border-l-4 border-warning-app bg-warning-app/10 px-4 py-3 text-sm text-warning-app">{t("applications.missingDocuments", {
              types: requiredDocuments.filter((required) =>
                !documents.some((document) => document.documentType === required)).join(", "),
            })}</p>
          )}
          {!id && <p className="text-sm text-muted-app">{t("applications.saveFirst")}</p>}
          {documents.length ? <ul className="divide-y divide-border-app border-y border-border-app">{documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center gap-3 px-1 py-3">
              <AppIcon name="file" className="text-primary-app" />
              <span className="min-w-0 flex-1 basis-48 break-words"><span className="font-semibold">{document.documentType}</span>
                <span className="block text-sm text-muted-app">{document.fileName}</span></span>
              <div className="flex flex-wrap gap-2">
                <AppButton type="button" variant="secondary" onClick={() => void download(document.id)}>
                  {t("applications.download")}
                </AppButton>
                {editable && <AppButton type="button" variant="secondary" onClick={() => void remove(document.id)}>
                  {t("applications.remove")}
                </AppButton>}
              </div>
            </li>
          ))}</ul> : <p className="text-sm text-muted-app">{t("applications.noDocuments")}</p>}
          {id && editable && (
            <form className="flex flex-wrap items-end gap-3 rounded-2xl bg-surface-app p-4" onSubmit={(event) => void handleUpload(event)}>
              <label className="min-w-0 flex-1 basis-48 text-sm font-medium">{t("applications.documentType")}
                <AppInput className="mt-2 block w-full" list="required-document-types" required
                  value={documentType} onChange={(event) => setDocumentType(event.target.value)} />
                <datalist id="required-document-types">
                  {requiredDocuments.map((document) => <option key={document} value={document} />)}
                </datalist>
              </label>
              <label className="min-w-0 flex-1 basis-48 text-sm font-medium">{t("applications.selectFile")}
                <input className={fileInputClass} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
              </label>
              <AppButton type="submit" disabled={!file || action.isPending}>{t("applications.upload")}</AppButton>
            </form>
          )}
        </section>

      <fieldset disabled={!editable} className="space-y-6 disabled:opacity-80">
        <section className={cn(sectionClass, "space-y-5")}>
          <div>
            <h2 className={sectionTitleClass}>{t("applications.roles")}</h2>
            <p className="mt-1 text-sm text-muted-app">{t("applications.rolesHint")}</p>
          </div>
          {currentDraft.proposedRoles.map((role, index) => (
            <section key={role.code || index} className="space-y-4 rounded-2xl bg-surface-app p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm">{t("applications.roleCode")}
                  <AppInput className="mt-1 block w-full" value={role.code} disabled={role.isLeaderRole || role.isDefaultMemberRole}
                    onChange={(event) => updateRole(index, { code: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })} />
                </label>
                <label className="text-sm">{t("applications.roleName")}
                  <AppInput className="mt-1 block w-full" value={role.isLeaderRole ? t("applications.roleLeader")
                    : role.isDefaultMemberRole ? t("applications.roleMembers") : role.name}
                    disabled={role.isLeaderRole || role.isDefaultMemberRole}
                    onChange={(event) => updateRole(index, { name: event.target.value })} />
                </label>
                <label className="text-sm">{t("applications.roleUnit")}
                  <AppInput className="mt-1 block w-full" value={role.unit ?? ""} disabled={role.isLeaderRole || role.isDefaultMemberRole}
                    onChange={(event) => updateRole(index, { unit: event.target.value })} />
                </label>
              </div>
              <div className="flex flex-wrap gap-5">
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 shrink-0 accent-primary-app" checked={role.isBoardSeat} disabled={role.isLeaderRole || role.isDefaultMemberRole}
                    onChange={(event) => updateRole(index, { isBoardSeat: event.target.checked })} />
                  {t("applications.boardSeat")}
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 shrink-0 accent-primary-app" checked={role.isSingleHolder} disabled={role.isLeaderRole || role.isDefaultMemberRole}
                    onChange={(event) => updateRole(index, { isSingleHolder: event.target.checked })} />
                  {t("applications.singleHolder")}
                </label>
              </div>
              <fieldset disabled={role.isLeaderRole} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <legend className="mb-2 text-sm font-medium">{t("applications.permissions")}</legend>
                {config.data.grantablePermissions.map((permission) => (
                  <label key={permission} title={permission} className="flex min-h-11 items-start gap-2 text-sm">
                    <input type="checkbox" className="size-4 shrink-0 accent-primary-app" checked={role.permissionCodes.includes(permission)}
                      onChange={(event) => updateRole(index, { permissionCodes: event.target.checked
                        ? [...role.permissionCodes, permission]
                        : role.permissionCodes.filter((value) => value !== permission) })} />
                    {t(`applications.perm_${permission.replaceAll(".", "_")}`, { defaultValue: permission })}
                  </label>
                ))}
              </fieldset>
              {!role.isLeaderRole && !role.isDefaultMemberRole && (
                <AppButton type="button" variant="secondary" onClick={() => change("proposedRoles",
                  currentDraft.proposedRoles.filter((_, position) => position !== index))}>
                  {t("applications.removeRole")}
                </AppButton>
              )}
            </section>
          ))}
          <AppButton type="button" variant="secondary" onClick={() => change("proposedRoles", [
            ...currentDraft.proposedRoles, { code: "", name: "", unit: "", isBoardSeat: false,
              isLeaderRole: false, isDefaultMemberRole: false, isSingleHolder: false, permissionCodes: [] },
          ])}><AppIcon name="plus" className="size-4" />{t("applications.addRole")}</AppButton>
        </section>

        {localError && !action.isError && <AppNotice tone="danger" role="alert">{localError}</AppNotice>}
        {action.isError && <AppNotice tone="danger" role="alert">{t("applications.actionError")} {action.error.message}</AppNotice>}
        {action.isSuccess && <AppNotice tone="success" role="status">{t("applications.success")}</AppNotice>}
        {editable && <div className="flex flex-wrap gap-3 border-t border-border-app pt-6">
          <AppButton type="button" variant="secondary" disabled={action.isPending} onClick={() => void save()}>
            {action.isPending ? t("applications.saving") : t("applications.save")}
          </AppButton>
          {id && <AppButton type="button" disabled={action.isPending} onClick={() => void prepareSubmission()}>
            <AppIcon name="send" className="size-4" />{t("applications.submit")}
          </AppButton>}
        </div>}
      {confirmSubmit && <div className="space-y-3 rounded-2xl border-l-4 border-primary-app bg-primary-soft-app p-5">
          <p>{t("applications.submitPrompt")}</p>
          {nameConflict && <p role="alert" className="text-sm text-danger-app">{t("applications.submitWarning")}</p>}
          <div className="flex flex-wrap gap-3">
            <AppButton type="button" disabled={action.isPending} onClick={() => void confirmSubmission()}>
              {t("applications.confirmSubmit")}
            </AppButton>
            <AppButton type="button" variant="secondary" onClick={() => setConfirmSubmit(false)}>
              {t("applications.cancelSubmit")}
            </AppButton>
          </div>
        </div>}
      </fieldset>
        {canWithdraw && <AppButton type="button" variant="secondary" disabled={action.isPending}
          onClick={() => void withdraw()}>
          {t("applications.withdraw")}
        </AppButton>}
      </div>
      {nameConflict && !confirmSubmit && <p role="status" className="mt-4 text-sm text-danger-app">
        {t("applications.submitWarning")}
      </p>}

      {application && (
        <section className={cn(sectionClass, "mt-10 space-y-3")}>
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
                <p className="mt-2 text-sm">{version.snapshot.objectives}</p>
                <p className="mt-2 text-xs text-muted-app">
                  {version.snapshot.documents.map((document) => document.fileName).join(", ")}
                </p>
              </details>
            </li>
          ))}</ol> : <p className="text-sm text-muted-app">{t("applications.historyEmpty")}</p>}
        </section>
      )}
    </div>
  );
}
