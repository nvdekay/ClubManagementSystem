import { useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppCard } from "@/components/ui/card/AppCard";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { AppTextarea } from "@/components/ui/textarea/AppTextarea";
import { useAuth } from "@/hooks/useAuth";
import { useClubSettings, useClubSettingsAction } from "@/hooks/useClubSettings";
import type {
  ClubChannel,
  ClubDepartment,
  ClubDepartmentInput,
  ClubProfileInput,
} from "@/services/clubSettings";

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
  const settings = useClubSettings(clubId, canManage);
  const action = useClubSettingsAction();
  const [profileDraft, setProfileDraft] = useState<ClubProfileInput | null>(null);
  const [department, setDepartment] = useState<ClubDepartmentInput>(emptyDepartment);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    return <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
      <AppSkeleton className="h-[34rem] w-full" /><AppSkeleton className="h-[34rem] w-full" />
    </div>;
  }
  if (!auth.data) return (
    <AppCard className="mx-auto max-w-2xl">
      <p>{t("clubSettings.signIn")}</p>
      <Link className="mt-3 inline-block font-semibold text-accent-app"
        to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>
        {t("clubSettings.signInLink")}</Link>
    </AppCard>
  );
  if (!canManage) return (
    <AppCard className="mx-auto max-w-2xl"><p role="alert" className="text-danger-app">
      {t("clubSettings.permissionDenied")}
    </p></AppCard>
  );
  if (settings.isError || !settings.data) return (
    <AppCard className="mx-auto max-w-2xl space-y-4">
      <p role="alert" className="text-danger-app">{settings.error?.message ?? t("clubSettings.loadError")}</p>
      <AppButton variant="secondary" onClick={() => void settings.refetch()}>{t("clubSettings.retry")}</AppButton>
    </AppCard>
  );

  const current = settings.data.profile;
  return (
    <div className="mx-auto max-w-7xl">
      <Link to={`/club/${clubId ?? ""}`} className="text-sm font-semibold text-accent-app">{t("clubSettings.back")}</Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-border-app pb-6">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-app">{t("clubSettings.eyebrow")}</p>
          <h1 className="mt-2 text-3xl font-bold font-heading sm:text-4xl">{t("clubSettings.title")}</h1>
          <p className="mt-3 text-muted-app">{t("clubSettings.description")}</p>
        </div>
        <span className="rounded-full border border-border-app bg-surface-app px-4 py-2 text-sm font-semibold">
          {current.state === "Pending Setup" ? t("clubSettings.pendingSetup") : current.state}
        </span>
      </div>

      <section className="mt-8 rounded-xl border border-border-app bg-surface-app/50 p-5 sm:p-6">
        <h2 className="text-lg font-bold font-heading">{t("clubSettings.readOnly")}</h2>
        <p className="mt-1 text-sm text-muted-app">{t("clubSettings.readOnlyHint")}</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([["code", current.code], ["name", current.name], ["field", current.field],
            ["state", current.state === "Pending Setup" ? t("clubSettings.pendingSetup") : current.state === "Active" ? t("discovery.active") : current.state === "Suspended" ? t("discovery.suspended") : current.state]] as const).map(([label, value]) => (
            <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-muted-app">{t(`clubSettings.${label}`)}</dt><dd className="mt-1 font-semibold">{value}</dd></div>
          ))}
        </dl>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <AppCard className="p-5 sm:p-6">
          <div ref={profileRef} className="contents">
          <h2 className="text-xl font-bold font-heading">{t("clubSettings.profile")}</h2>
          <label className="mt-5 block text-sm font-semibold">{t("clubSettings.descriptionLabel")}
            <AppTextarea className="mt-2 min-h-32 w-full" value={profile.description}
              onChange={(event) => profileField("description", event.target.value)} maxLength={10000} />
          </label>
          <label className="mt-5 block text-sm font-semibold">{t("clubSettings.scope")}
            <AppTextarea className="mt-2 min-h-24 w-full" value={profile.operatingScope}
              onChange={(event) => profileField("operatingScope", event.target.value)} maxLength={2000} />
          </label>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">{t("clubSettings.email")}<AppInput className="mt-2 w-full" type="email" value={profile.contactEmail} onChange={(event) => profileField("contactEmail", event.target.value)} /></label>
            <label className="block text-sm font-semibold">{t("clubSettings.phone")}<AppInput className="mt-2 w-full" value={profile.contactPhone} onChange={(event) => profileField("contactPhone", event.target.value)} /></label>
          </div>
          <label className="mt-5 block text-sm font-semibold">{t("clubSettings.charter")}<AppInput className="mt-2 w-full" type="url" value={profile.charterUrl} onChange={(event) => profileField("charterUrl", event.target.value)} /></label>

          <div className="mt-6 flex items-center justify-between gap-3"><h3 className="font-bold font-heading">{t("clubSettings.channels")}</h3><AppButton variant="secondary" onClick={() => profileField("channels", [...profile.channels, { label: "", url: "" }])}>{t("clubSettings.addChannel")}</AppButton></div>
          <div className="mt-3 space-y-3">{profile.channels.map((channel, index) => (
            <div key={index} className="grid gap-2 rounded-lg border border-border-app p-3 sm:grid-cols-[1fr_1.4fr_auto]">
              <AppInput required aria-label={t("clubSettings.channelLabel")} placeholder={t("clubSettings.channelLabel")} value={channel.label} onChange={(event) => channelField(index, "label", event.target.value)} />
              <AppInput required aria-label={t("clubSettings.channelUrl")} type="url" placeholder={t("clubSettings.channelUrl")} value={channel.url} onChange={(event) => channelField(index, "url", event.target.value)} />
              <AppButton variant="secondary" onClick={() => profileField("channels", profile.channels.filter((_, currentIndex) => currentIndex !== index))}>{t("clubSettings.removeChannel")}</AppButton>
            </div>
          ))}</div>
          </div>
          <AppButton className="mt-6 w-full sm:w-auto" disabled={action.isPending} onClick={() => void saveProfile()}>{action.isPending ? t("clubSettings.saving") : t("clubSettings.saveProfile")}</AppButton>
        </AppCard>

        <div className="space-y-6">
          <AppCard className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold font-heading">{t("clubSettings.structure")}</h2><p className="mt-2 text-sm text-muted-app">{t("clubSettings.structureHint")}</p></div>
              {!settings.data.departments.length && <AppButton variant="secondary" disabled={action.isPending} onClick={() => void applyTemplate()}>{t("clubSettings.useTemplate")}</AppButton>}
            </div>
            {!settings.data.departments.length ? <div className="mt-6 rounded-lg border border-dashed border-border-app p-6 text-center"><p className="font-semibold">{t("clubSettings.noDepartments")}</p><p className="mt-2 text-sm text-muted-app">{t("clubSettings.templateHint")}</p></div>
              : <div className="mt-5 space-y-3">{settings.data.departments.map((item) => (
                <div key={item.id} className="rounded-lg border border-border-app p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-bold">{item.name}</h3><span className="rounded-full bg-surface-app px-2 py-1 text-xs text-muted-app">{item.isActive ? t("clubSettings.active") : t("clubSettings.inactive")}</span></div>{item.description && <p className="mt-2 text-sm text-muted-app">{item.description}</p>}</div>
                    <div className="flex gap-2"><AppButton variant="secondary" onClick={() => editDepartment(item)}>{t("clubSettings.edit")}</AppButton>{item.isActive && <AppButton variant="secondary" onClick={() => void deactivateDepartment(item)}>{t("clubSettings.deactivate")}</AppButton>}</div></div>
                </div>
              ))}</div>}
          </AppCard>

          <AppCard className="p-5 sm:p-6">
            <h2 className="text-lg font-bold font-heading">{editingId ? t("clubSettings.editDepartment") : t("clubSettings.addDepartment")}</h2>
            <label className="mt-4 block text-sm font-semibold">{t("clubSettings.departmentName")}<AppInput className="mt-2 w-full" value={department.name} onChange={(event) => setDepartment((currentDepartment) => ({ ...currentDepartment, name: event.target.value }))} maxLength={120} /></label>
            <label className="mt-4 block text-sm font-semibold">{t("clubSettings.departmentDescription")}<AppTextarea className="mt-2 min-h-24 w-full" value={department.description} onChange={(event) => setDepartment((currentDepartment) => ({ ...currentDepartment, description: event.target.value }))} maxLength={2000} /></label>
            <label className="mt-4 block text-sm font-semibold">{t("clubSettings.sortOrder")}<AppInput className="mt-2 w-full" type="number" min={0} max={10000} value={department.sortOrder} onChange={(event) => setDepartment((currentDepartment) => ({ ...currentDepartment, sortOrder: Number(event.target.value) }))} /></label>
            <div className="mt-5 flex flex-wrap gap-2"><AppButton disabled={action.isPending || !department.name.trim()} onClick={() => void saveDepartment()}>{t("clubSettings.saveDepartment")}</AppButton>{editingId && <AppButton variant="secondary" onClick={resetDepartment}>{t("clubSettings.cancel")}</AppButton>}</div>
          </AppCard>
        </div>
      </div>
      {action.isError && <p role="alert" className="mt-5 text-sm text-danger-app">{action.error.message || t("clubSettings.actionError")}</p>}
      {action.isSuccess && <p role="status" className="mt-5 text-sm text-success-app">{t("clubSettings.success")}</p>}
    </div>
  );
}
