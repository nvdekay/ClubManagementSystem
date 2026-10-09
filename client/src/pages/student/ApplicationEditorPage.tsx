import { useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useApplication, useApplicationAction, useApplicationConfig,
  useApplicationPreview, useDocumentAccess, useFounderLookup } from "@/hooks/useApplications";
import type { FounderProfile } from "@/services/applications";
import { useAuth } from "@/hooks/useAuth";
import type { ApplicationConfig, DraftInput, ProposedRole } from "@/services/applications";

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
    return <AppSkeleton className="mx-auto mt-8 h-72 max-w-4xl" />;
  }
  if (!auth.data) {
    return <AppCard className="mx-auto mt-8 max-w-3xl">
      <p>{t("applications.signIn")}</p>
      <Link className="mt-3 inline-block font-semibold text-accent-app"
        to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>{t("applications.signInLink")}</Link>
    </AppCard>;
  }
  if (config.isError || !config.data) {
    return <AppCard className="mx-auto mt-8 max-w-3xl"><p role="alert">{t("applications.unconfigured")}</p></AppCard>;
  }
  if (id && (detail.isError || !application)) {
    return <AppCard className="mx-auto mt-8 max-w-3xl"><p role="alert">{t("applications.notFound")}</p></AppCard>;
  }
  if (!currentDraft) return <AppSkeleton className="mx-auto mt-8 h-72 max-w-4xl" />;

  const documents = application?.draft.documents ?? [];
  const requiredDocuments = config.data.requirements.mandatoryApplicationDocuments;

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/workspace/applications" className="text-sm font-semibold text-accent-app">{t("applications.back")}</Link>
      <h1 className="mt-4 text-3xl font-bold font-heading">{id ? currentDraft.clubName || t("applications.title") : t("applications.new")}</h1>
      <p className="mt-2 text-muted-app">{t("applications.description")}</p>
      {state && <p className="mt-2 text-sm text-muted-app">{t("applications.state")}: {stateLabel(state)}</p>}
      {latestDecision && (state === "Revision Requested" || state === "Rejected") && (
        <section role="status" className="mt-6 rounded-xl border border-warning-app/40 bg-warning-app/10 p-5">
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
      <div className="mt-8 space-y-6">
      <fieldset disabled={!editable} className="space-y-6 disabled:opacity-80">
        <AppCard className="grid gap-5 p-5 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2 font-heading">{t("applications.basic")}</h2>
          <label className="text-sm">{t("applications.clubName")}
            <AppInput className="mt-2 block w-full" maxLength={200} required value={currentDraft.clubName}
              onChange={(event) => change("clubName", event.target.value)} />
          </label>
          <label className="text-sm">{t("applications.field")}
            <AppInput className="mt-2 block w-full" maxLength={100} required value={currentDraft.field}
              onChange={(event) => change("field", event.target.value)} />
          </label>
          <label className="text-sm sm:col-span-2">{t("applications.objectives")}
            <AppTextarea className="mt-2 block w-full" maxLength={5000} value={currentDraft.objectives}
              onChange={(event) => change("objectives", event.target.value)} />
          </label>
          <div className="text-sm sm:col-span-2">
            <p>{t("applications.founders")}</p>
            <ul className="mt-2 space-y-2">{currentDraft.foundingUserIds.map((founderId) => {
              const profile = founderProfile(founderId);
              return <li key={founderId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-app px-3 py-2">
                <span className="min-w-0"><span className="font-semibold">{profile?.displayName ?? founderId}</span>
                  {profile && <span className="block break-all text-xs text-muted-app">{profile.email}</span>}</span>
                {founderId !== auth.data?.user.id && <AppButton type="button" variant="secondary"
                  onClick={() => change("foundingUserIds", currentDraft.foundingUserIds.filter((value) => value !== founderId))}>
                  {t("applications.remove")}</AppButton>}
              </li>;
            })}</ul>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="min-w-56 flex-1">{t("applications.founderEmail")}
                <AppInput className="mt-2 block w-full" type="email" value={founderEmail}
                  onChange={(event) => { setFounderEmail(event.target.value); setFounderError(null); }}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addFounder(); } }} />
              </label>
              <AppButton type="button" variant="secondary" disabled={!founderEmail.trim() || founderLookup.isPending}
                onClick={() => void addFounder()}>{t("applications.addFounder")}</AppButton>
            </div>
            {founderError && <p role="alert" className="mt-2 text-sm text-danger-app">{founderError}</p>}
            <span className="mt-1 block text-xs text-muted-app">
              {t("applications.foundersHint", { count: config.data.requirements.minFoundingMembers })}
            </span>
          </div>
        </AppCard>
      </fieldset>

        <AppCard className="space-y-4 p-5">
          <h2 className="text-lg font-semibold font-heading">{t("applications.documents")}</h2>
          <p className="text-sm text-muted-app">{requiredDocuments.length
            ? t("applications.requiredDocuments", { types: requiredDocuments.join(", ") })
            : t("applications.noRequiredDocuments")}</p>
          {requiredDocuments.some((required) => !documents.some((document) => document.documentType === required)) && (
            <p role="status" className="text-sm text-warning-app">{t("applications.missingDocuments", {
              types: requiredDocuments.filter((required) =>
                !documents.some((document) => document.documentType === required)).join(", "),
            })}</p>
          )}
          {!id && <p className="text-sm text-muted-app">{t("applications.saveFirst")}</p>}
          {documents.length ? documents.map((document) => (
            <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-app p-3">
              <span className="min-w-0 break-words">{document.documentType}: {document.fileName}</span>
              <div className="flex flex-wrap gap-2">
                <AppButton type="button" variant="secondary" onClick={() => void download(document.id)}>
                  {t("applications.download")}
                </AppButton>
                {editable && <AppButton type="button" variant="secondary" onClick={() => void remove(document.id)}>
                  {t("applications.remove")}
                </AppButton>}
              </div>
            </div>
          )) : <p className="text-sm text-muted-app">{t("applications.noDocuments")}</p>}
          {id && editable && (
            <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => void handleUpload(event)}>
              <label className="min-w-48 flex-1 text-sm">{t("applications.documentType")}
                <AppInput className="mt-2 block w-full" list="required-document-types" required
                  value={documentType} onChange={(event) => setDocumentType(event.target.value)} />
                <datalist id="required-document-types">
                  {requiredDocuments.map((document) => <option key={document} value={document} />)}
                </datalist>
              </label>
              <label className="min-w-48 flex-1 text-sm">{t("applications.selectFile")}
                <input className="mt-2 block w-full text-sm" type="file" accept=".pdf,.png,.jpg,.jpeg,.docx"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
              </label>
              <AppButton type="submit" disabled={!file || action.isPending}>{t("applications.upload")}</AppButton>
            </form>
          )}
        </AppCard>

      <fieldset disabled={!editable} className="space-y-6 disabled:opacity-80">
        <AppCard className="space-y-5 p-5">
          <div>
            <h2 className="text-lg font-semibold font-heading">{t("applications.roles")}</h2>
            <p className="mt-1 text-sm text-muted-app">{t("applications.rolesHint")}</p>
          </div>
          {currentDraft.proposedRoles.map((role, index) => (
            <section key={role.code || index} className="space-y-4 rounded-md border border-border-app p-4">
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
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={role.isBoardSeat} disabled={role.isLeaderRole || role.isDefaultMemberRole}
                    onChange={(event) => updateRole(index, { isBoardSeat: event.target.checked })} />
                  {t("applications.boardSeat")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={role.isSingleHolder} disabled={role.isLeaderRole || role.isDefaultMemberRole}
                    onChange={(event) => updateRole(index, { isSingleHolder: event.target.checked })} />
                  {t("applications.singleHolder")}
                </label>
              </div>
              <fieldset disabled={role.isLeaderRole} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <legend className="mb-2 text-sm font-medium">{t("applications.permissions")}</legend>
                {config.data.grantablePermissions.map((permission) => (
                  <label key={permission} title={permission} className="flex items-start gap-2 text-xs">
                    <input type="checkbox" checked={role.permissionCodes.includes(permission)}
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
          ])}>{t("applications.addRole")}</AppButton>
        </AppCard>

        {localError && !action.isError && <p role="alert" className="text-sm text-danger-app">{localError}</p>}
        {action.isError && <p role="alert" className="text-sm text-danger-app">{t("applications.actionError")} {action.error.message}</p>}
        {action.isSuccess && <p role="status" className="text-sm text-success-app">{t("applications.success")}</p>}
        {editable && <div className="flex flex-wrap gap-3">
          <AppButton type="button" variant="secondary" disabled={action.isPending} onClick={() => void save()}>
            {action.isPending ? t("applications.saving") : t("applications.save")}
          </AppButton>
          {id && <AppButton type="button" disabled={action.isPending} onClick={() => void prepareSubmission()}>
            {t("applications.submit")}
          </AppButton>}
        </div>}
      {confirmSubmit && <AppCard className="space-y-3 border border-primary-app p-5">
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
        </AppCard>}
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
        <section className="mt-10 space-y-3">
          <h2 className="text-xl font-semibold font-heading">{t("applications.history")}</h2>
          {detail.data?.versions.length ? detail.data.versions.map((version) => (
            <AppCard key={version.id} className="space-y-2">
              <h3 className="font-semibold font-heading">{t("applications.version", { number: version.versionNo })}</h3>
              <p className="text-sm text-muted-app">{t("applications.submittedAt", { date:
                new Intl.DateTimeFormat(i18n.language === "vi" ? "vi-VN" : "en-US", {
                  dateStyle: "medium", timeStyle: "short",
                }).format(new Date(version.submittedAt)) })}</p>
              <p className="text-xs text-muted-app">{t("applications.policyVersion", { id: version.policyVersionId })}</p>
              <details>
                <summary className="text-sm font-medium text-accent-app">{version.snapshot.clubName}</summary>
                <p className="mt-2 text-sm">{version.snapshot.objectives}</p>
                <p className="mt-2 text-xs text-muted-app">
                  {version.snapshot.documents.map((document) => document.fileName).join(", ")}
                </p>
              </details>
            </AppCard>
          )) : <p className="text-sm text-muted-app">{t("applications.historyEmpty")}</p>}
        </section>
      )}
    </div>
  );
}
