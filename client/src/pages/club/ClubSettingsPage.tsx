import { useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useClubSettings, useClubSettingsAction } from "@/hooks/useClubSettings";
import { cn } from "@/utils/cn";
import { ClubRolesPanel } from "./ClubRolesPanel";
import {
  MissingProfileFieldsError,
  type ClubChannel,
  type ClubDepartment,
  type ClubDepartmentInput,
  type ClubProfileInput,
} from "@/services/clubSettings";
import type { ClubProfileFormField } from "@/services/policy";

function profileLabelKey(field: ClubProfileFormField) {
  switch (field) {
    case "description": return "clubSettings.descriptionLabel" as const;
    case "operatingScope": return "clubSettings.scope" as const;
    case "contactEmail": return "clubSettings.email" as const;
    case "contactPhone": return "clubSettings.phone" as const;
    case "charterUrl": return "clubSettings.charter" as const;
    case "channels": return "clubSettings.channels" as const;
  }
}

const emptyProfile: ClubProfileInput = {
  description: "", contactEmail: "", contactPhone: "", charterUrl: "",
  channels: [], operatingScope: "",
};
const emptyDepartment: ClubDepartmentInput = { name: "", description: "", sortOrder: 10 };

export function ClubSettingsPage() {
  const { clubId } = useParams();
  const { t } = useTranslation();
  const auth = useAuth();
  const workspace = auth.data?.workspaces.find((item) => item.kind === "club"
    && item.clubId === clubId);
  const canManage = Boolean(workspace?.permissions.includes("club.profile.manage"));
  const canManageRoles = Boolean(workspace?.permissions.includes("club.role.manage"));
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = canManageRoles && searchParams.get("tab") === "roles" ? "roles" : "profile";
  const settings = useClubSettings(clubId, canManage);
  const action = useClubSettingsAction();
  const [profileDraft, setProfileDraft] = useState<ClubProfileInput | null>(null);
  const [department, setDepartment] = useState<ClubDepartmentInput>(emptyDepartment);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [channelsMissing, setChannelsMissing] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const loadedProfile = settings.data ? {
    description: settings.data.profile.description ?? "",
    contactEmail: settings.data.profile.contactEmail ?? "",
    contactPhone: settings.data.profile.contactPhone ?? "",
    charterUrl: settings.data.profile.charterUrl ?? "",
    channels: settings.data.profile.channels.map((channel) => ({ ...channel })),
    operatingScope: settings.data.profile.operatingScope ?? "",
  } satisfies ClubProfileInput : emptyProfile;
  const profile = profileDraft ?? loadedProfile;

  function profileField<K extends keyof ClubProfileInput>(key: K, value: ClubProfileInput[K]) {
    setProfileDraft((current) => ({ ...(current ?? loadedProfile), [key]: value }));
  }

  function channelField(index: number, key: keyof ClubChannel, value: string) {
    setProfileDraft((current) => {
      const source = current ?? loadedProfile;
      return { ...source, channels: source.channels.map((channel, currentIndex) =>
        currentIndex === index ? { ...channel, [key]: value } : channel) };
    });
  }

  async function saveProfile() {
    if (!auth.data || !clubId) return;
    // The profile is not a <form>, so run the browser constraint checks (email, URL, required) by hand.
    const invalid = profileRef.current?.querySelector<HTMLInputElement>("input:invalid, textarea:invalid");
    if (invalid) { invalid.reportValidity(); return; }
    const needsChannel = Boolean(settings.data?.requiredProfileFields.channels) && !profile.channels.length;
    setChannelsMissing(needsChannel);
    if (needsChannel) return;
    try {
      await action.mutateAsync({ kind: "profile", clubId, input: profile,
        csrfToken: auth.data.csrfToken });
      setProfileDraft(null);
    } catch { /* Mutation error is rendered below. */ }
  }

  async function applyTemplate() {
    if (!auth.data || !clubId) return;
    try { await action.mutateAsync({ kind: "template", clubId,
      csrfToken: auth.data.csrfToken }); }
    catch { /* Mutation error is rendered below. */ }
  }

  function editDepartment(value: ClubDepartment) {
    setEditingId(value.id);
    setDepartment({ name: value.name, description: value.description ?? "",
      sortOrder: value.sortOrder });
  }

  function resetDepartment() {
    setEditingId(null);
    setDepartment(emptyDepartment);
  }

  async function saveDepartment() {
    if (!auth.data || !clubId) return;
    try {
      await action.mutateAsync(editingId
        ? { kind: "updateDepartment", clubId, departmentId: editingId,
          input: department, csrfToken: auth.data.csrfToken }
        : { kind: "createDepartment", clubId, input: department,
          csrfToken: auth.data.csrfToken });
      resetDepartment();
    } catch { /* Mutation error is rendered below. */ }
  }

  async function deactivateDepartment(value: ClubDepartment) {
    if (!auth.data || !clubId || !window.confirm(t("clubSettings.deactivateConfirm"))) return;
    try { await action.mutateAsync({ kind: "deactivateDepartment", clubId,
      departmentId: value.id, csrfToken: auth.data.csrfToken }); }
    catch { /* Mutation error is rendered below. */ }
  }

  // A disabled query stays pending forever, so only wait for settings the user may load.
  if (auth.isPending || (canManage && settings.isPending)) {
    return <div className="space-y-6">
      <AppSkeleton className="h-24 w-full" />
      <div className="grid gap-10 lg:grid-cols-2"><AppSkeleton className="h-[30rem] w-full" /><AppSkeleton className="h-[30rem] w-full" /></div>
    </div>;
  }
  if (!auth.data) return (
    <AppNotice>
      <p>{t("clubSettings.signIn")}</p>
      <Link className="inline-block font-semibold text-accent-app"
        to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>
        {t("clubSettings.signInLink")}</Link>
    </AppNotice>
  );
  if (!canManage) return (
    <AppNotice tone="danger" role="alert">{t("clubSettings.permissionDenied")}</AppNotice>
  );
  if (settings.isError || !settings.data) return (
    <AppNotice tone="danger" role="alert" title={settings.error?.message ?? t("clubSettings.loadError")}>
      <AppButton variant="secondary" onClick={() => void settings.refetch()}>{t("clubSettings.retry")}</AppButton>
    </AppNotice>
  );

  // UC23 lives beside UC09 as a second tab, shown only to the club leader (club.role.manage).
  const tabs = canManageRoles && (
    <div role="tablist" aria-label={t("clubSettings.title")} className="mb-6 flex flex-wrap gap-2">
      {(["profile", "roles"] as const).map((item) => (
        <button key={item} type="button" role="tab" aria-selected={tab === item}
          onClick={() => setSearchParams(item === "roles" ? { tab: "roles" } : {})}
          className={cn("min-h-10 rounded-full border border-border-app px-4 text-sm font-medium text-muted-app",
            { "border-primary-app bg-primary-soft-app text-primary-app": tab === item })}>
          {item === "roles" ? t("clubRoles.tabRoles") : t("clubRoles.tabProfile")}
        </button>
      ))}
    </div>
  );
  if (tab === "roles" && clubId) return (
    <>
      <PageHeader title={t("clubRoles.title")} description={t("clubRoles.description")} />
      {tabs}
      <ClubRolesPanel clubId={clubId} />
    </>
  );

  const current = settings.data.profile;
  const required = settings.data.requiredProfileFields;
  const anyRequired = Object.values(required).some(Boolean);
  function label(field: ClubProfileFormField) {
    return <>{t(profileLabelKey(field))}{required[field] && (
      <span className="text-danger-app"> *<span className="sr-only"> ({t("clubSettings.requiredMark")})</span></span>
    )}</>;
  }
  const stateLabel = current.state === "Pending Setup" ? t("clubSettings.pendingSetup")
    : current.state === "Active" ? t("discovery.active")
      : current.state === "Suspended" ? t("discovery.suspended") : current.state;
  return (
    <>
      <PageHeader title={t("clubSettings.title")} description={t("clubSettings.description")} actions={
        <AppBadge tone={current.state === "Active" ? "success" : current.state === "Pending Setup" ? "warning" : "neutral"}>
          {current.state === "Pending Setup" ? t("clubSettings.pendingSetup") : current.state}
        </AppBadge>
      } />
      {tabs}

      <section className="rounded-2xl bg-surface-app px-5 py-5 sm:px-6">
        <h2 className="font-heading text-base font-bold">{t("clubSettings.readOnly")}</h2>
        <p className="mt-1 text-sm text-muted-app">{t("clubSettings.readOnlyHint")}</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([["code", current.code], ["name", current.name], ["field", current.field],
            ["state", stateLabel]] as const).map(([label, value]) => (
            <div key={label} className="min-w-0"><dt className="text-xs font-semibold tracking-wide text-muted-app uppercase">{t(`clubSettings.${label}`)}</dt><dd className="mt-1 font-semibold break-words">{value}</dd></div>
          ))}
        </dl>
      </section>

      <div className="mt-10 grid items-start gap-x-12 gap-y-10 lg:grid-cols-2">
        <section>
          <div ref={profileRef} className="contents">
          <h2 className="font-heading text-xl font-bold">{t("clubSettings.profile")}</h2>
          {anyRequired && <p className="mt-1 text-sm text-muted-app">{t("clubSettings.requiredHint")}</p>}
          <label className="mt-5 block text-sm font-semibold">{label("description")}
            <AppTextarea className="mt-2 block min-h-32 w-full font-normal" value={profile.description}
              required={required.description}
              onChange={(event) => profileField("description", event.target.value)} maxLength={10000} />
          </label>
          <label className="mt-5 block text-sm font-semibold">{label("operatingScope")}
            <AppTextarea className="mt-2 block min-h-24 w-full font-normal" value={profile.operatingScope}
              required={required.operatingScope}
              onChange={(event) => profileField("operatingScope", event.target.value)} maxLength={2000} />
          </label>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">{label("contactEmail")}<AppInput className="mt-2 block w-full font-normal" type="email" required={required.contactEmail} value={profile.contactEmail} onChange={(event) => profileField("contactEmail", event.target.value)} /></label>
            <label className="block text-sm font-semibold">{label("contactPhone")}<AppInput className="mt-2 block w-full font-normal" required={required.contactPhone} value={profile.contactPhone} onChange={(event) => profileField("contactPhone", event.target.value)} /></label>
          </div>
          <label className="mt-5 block text-sm font-semibold">{label("charterUrl")}<AppInput className="mt-2 block w-full font-normal" type="url" required={required.charterUrl} value={profile.charterUrl} onChange={(event) => profileField("charterUrl", event.target.value)} /></label>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border-app pt-6"><h3 className="font-heading font-bold">{label("channels")}</h3><AppButton variant="secondary" onClick={() => profileField("channels", [...profile.channels, { label: "", url: "" }])}><AppIcon name="plus" className="size-4" />{t("clubSettings.addChannel")}</AppButton></div>
          <div className="mt-3 divide-y divide-border-app">{profile.channels.map((channel, index) => (
            <div key={index} className="grid gap-2 py-3 sm:grid-cols-[1fr_1.4fr_auto]">
              <AppInput required aria-label={t("clubSettings.channelLabel")} placeholder={t("clubSettings.channelLabel")} value={channel.label} onChange={(event) => channelField(index, "label", event.target.value)} />
              <AppInput required aria-label={t("clubSettings.channelUrl")} type="url" placeholder={t("clubSettings.channelUrl")} value={channel.url} onChange={(event) => channelField(index, "url", event.target.value)} />
              <AppButton variant="ghost" className="hover:text-danger-app" onClick={() => profileField("channels", profile.channels.filter((_, currentIndex) => currentIndex !== index))}>{t("clubSettings.removeChannel")}</AppButton>
            </div>
          ))}</div>
          {channelsMissing && !profile.channels.length && (
            <p role="alert" className="mt-2 text-sm text-danger-app">{t("clubSettings.channelsRequired")}</p>
          )}
          </div>
          <AppButton className="mt-6 w-full sm:w-auto" disabled={action.isPending} onClick={() => void saveProfile()}>{action.isPending ? t("clubSettings.saving") : t("clubSettings.saveProfile")}</AppButton>
        </section>

        <div className="space-y-8">
          <section>
            <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h2 className="font-heading text-xl font-bold">{t("clubSettings.structure")}</h2><p className="mt-2 text-sm text-muted-app">{t("clubSettings.structureHint")}</p></div>
              {!settings.data.departments.length && <AppButton variant="secondary" disabled={action.isPending} onClick={() => void applyTemplate()}>{t("clubSettings.useTemplate")}</AppButton>}
            </div>
            {!settings.data.departments.length ? <AppNotice className="mt-5" title={t("clubSettings.noDepartments")}><p className="text-muted-app">{t("clubSettings.templateHint")}</p></AppNotice>
              : <ul className="mt-5 divide-y divide-border-app border-y border-border-app">{settings.data.departments.map((item) => (
                <li key={item.id} className={cn("flex flex-wrap items-start justify-between gap-3 px-1 py-4", { "bg-primary-soft-app": editingId === item.id })}>
                  <div className="min-w-0 flex-1 basis-48"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold break-words">{item.name}</h3><AppBadge tone={item.isActive ? "success" : "neutral"}>{item.isActive ? t("clubSettings.active") : t("clubSettings.inactive")}</AppBadge></div>{item.description && <p className="mt-1 text-sm text-muted-app">{item.description}</p>}</div>
                  <div className="flex flex-wrap gap-2"><AppButton variant="secondary" onClick={() => editDepartment(item)}>{t("clubSettings.edit")}</AppButton>{item.isActive && <AppButton variant="ghost" className="hover:text-danger-app" onClick={() => void deactivateDepartment(item)}>{t("clubSettings.deactivate")}</AppButton>}</div>
                </li>
              ))}</ul>}
          </section>

          <section className="rounded-2xl bg-surface-app p-5 sm:p-6">
            <h2 className="font-heading text-lg font-bold">{editingId ? t("clubSettings.editDepartment") : t("clubSettings.addDepartment")}</h2>
            <label className="mt-4 block text-sm font-semibold">{t("clubSettings.departmentName")}<AppInput className="mt-2 block w-full font-normal" value={department.name} onChange={(event) => setDepartment((currentDepartment) => ({ ...currentDepartment, name: event.target.value }))} maxLength={120} /></label>
            <label className="mt-4 block text-sm font-semibold">{t("clubSettings.departmentDescription")}<AppTextarea className="mt-2 block min-h-24 w-full font-normal" value={department.description} onChange={(event) => setDepartment((currentDepartment) => ({ ...currentDepartment, description: event.target.value }))} maxLength={2000} /></label>
            <label className="mt-4 block text-sm font-semibold">{t("clubSettings.sortOrder")}<AppInput className="mt-2 block w-full font-normal" type="number" min={0} max={10000} value={department.sortOrder} onChange={(event) => setDepartment((currentDepartment) => ({ ...currentDepartment, sortOrder: Number(event.target.value) }))} /></label>
            <div className="mt-5 flex flex-wrap gap-2"><AppButton disabled={action.isPending || !department.name.trim()} onClick={() => void saveDepartment()}>{t("clubSettings.saveDepartment")}</AppButton>{editingId && <AppButton variant="secondary" onClick={resetDepartment}>{t("clubSettings.cancel")}</AppButton>}</div>
          </section>
        </div>
      </div>
      {action.isError && <AppNotice tone="danger" role="alert" className="mt-6">
        {action.error instanceof MissingProfileFieldsError
          ? t("clubSettings.missingFields", { fields: action.error.missing
            .map((field) => t(profileLabelKey(field))).join(", ") })
          : action.error.message || t("clubSettings.actionError")}
      </AppNotice>}
      {action.isSuccess && <AppNotice tone="success" role="status" className="mt-6">{t("clubSettings.success")}</AppNotice>}
    </>
  );
}
