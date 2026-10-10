import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppInput } from "@/components/ui/input/AppInput";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSelect } from "@/components/ui/select/AppSelect";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useClubRoleAction, useClubRoles } from "@/hooks/useClubRoles";
import type { Locale } from "@/i18n";
import type { ClubRole, ClubRoleInput, ClubRoleStructureVersion } from "@/services/clubRoles";
import { cn } from "@/utils/cn";
import { formatDate, formatDay } from "@/utils/formatDate";

const permissionLabelKeys = {
  "club.profile.manage": "clubRoles.permProfile",
  "club.recruitment.manage": "clubRoles.permRecruitment",
  "club.application.review": "clubRoles.permApplicationReview",
  "club.member.manage": "clubRoles.permMember",
  "club.event.manage": "clubRoles.permEvent",
  "club.attendance.manage": "clubRoles.permAttendance",
  "club.report.submit": "clubRoles.permReport",
  "club.expense.record": "clubRoles.permExpense",
  "club.booking.manage": "clubRoles.permBooking",
  "club.feedback.view": "clubRoles.permFeedback",
  "club.complaint.respond": "clubRoles.permComplaint",
} as const;

const sourceKeys = {
  APPLICATION: "clubRoles.sourceAPPLICATION",
  TRANSITION: "clubRoles.sourceTRANSITION",
  ROLE_MANAGEMENT: "clubRoles.sourceROLE_MANAGEMENT",
} as const;

const emptyRole: ClubRoleInput = { name: "", unit: "", isSingleHolder: false, permissionCodes: [], reason: "" };

type VersionRole = ClubRoleStructureVersion["roles"][number];

/** A5: roles added, removed or changed between two structure versions, matched by position. */
function diffVersions(from: ClubRoleStructureVersion, to: ClubRoleStructureVersion) {
  const before = new Map(from.roles.map((role) => [role.positionId, role]));
  const after = new Map(to.roles.map((role) => [role.positionId, role]));
  const added = to.roles.filter((role) => !before.has(role.positionId));
  const removed = from.roles.filter((role) => !after.has(role.positionId));
  const changed = to.roles.flatMap((role) => {
    const old = before.get(role.positionId);
    if (!old) return [];
    const granted = role.permissionCodes.filter((code) => !old.permissionCodes.includes(code));
    const dropped = old.permissionCodes.filter((code) => !role.permissionCodes.includes(code));
    const renamed = old.name !== role.name ? old.name : undefined;
    const other = old.unit !== role.unit || old.isSingleHolder !== role.isSingleHolder || old.isBoardSeat !== role.isBoardSeat;
    return granted.length || dropped.length || renamed || other ? [{ role, granted, dropped, renamed }] : [];
  });
  return { added, removed, changed };
}

export function ClubRolesPanel({ clubId }: { clubId: string }) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const auth = useAuth();
  const roles = useClubRoles(clubId, true);
  const action = useClubRoleAction();
  const [draft, setDraft] = useState<ClubRoleInput>(emptyRole);
  const [editing, setEditing] = useState<ClubRole | null>(null);
  const [assignment, setAssignment] = useState({ roleId: "", membershipId: "", from: "", to: "" });
  const [compare, setCompare] = useState<{ from?: number; to?: number }>({});

  function permissionLabel(code: string) {
    const key = permissionLabelKeys[code as keyof typeof permissionLabelKeys];
    return key ? t(key) : code;
  }

  async function run(change: Parameters<typeof action.mutateAsync>[0], after?: () => void) {
    try { await action.mutateAsync(change); after?.(); } catch { /* Mutation error is rendered below. */ }
  }

  function resetForm() {
    setEditing(null);
    setDraft(emptyRole);
  }

  function edit(role: ClubRole) {
    setEditing(role);
    setDraft({ name: role.name, unit: role.unit ?? "", isSingleHolder: role.isSingleHolder,
      permissionCodes: [...role.permissionCodes], reason: "" });
  }

  function togglePermission(code: string, checked: boolean) {
    setDraft((current) => ({ ...current, permissionCodes: checked
      ? [...current.permissionCodes, code] : current.permissionCodes.filter((item) => item !== code) }));
  }

  if (roles.isPending) return <div className="space-y-4"><AppSkeleton className="h-40 w-full" /><AppSkeleton className="h-64 w-full" /></div>;
  if (roles.isError || !roles.data) return (
    <AppNotice tone="danger" role="alert" title={roles.error?.message ?? t("clubRoles.loadError")}>
      <AppButton variant="secondary" onClick={() => void roles.refetch()}>{t("clubRoles.retry")}</AppButton>
    </AppNotice>
  );
  const data = roles.data;
  const csrfToken = auth.data?.csrfToken ?? "";
  const regularRoles = data.roles.filter((role) => !role.isLeaderRole && !role.isBoardSeat && !role.isDefaultMemberRole);
  const activeMembers = data.members.filter((member) => member.state === "Active");
  const input = { ...draft, unit: draft.unit || undefined, reason: draft.reason?.trim() || undefined };
  const fromVersion = data.versions.find((version) => version.versionNo === (compare.from ?? data.versions[1]?.versionNo));
  const toVersion = data.versions.find((version) => version.versionNo === (compare.to ?? data.versions[0]?.versionNo));
  const diff = fromVersion && toVersion ? diffVersions(fromVersion, toVersion) : null;
  const versionOptions = data.versions.map((version) => ({ value: version.versionNo,
    label: t("clubRoles.version", { no: version.versionNo }) }));

  function roleBadges(role: ClubRole | VersionRole) {
    return <>
      {role.isLeaderRole && <AppBadge tone="info">{t("clubRoles.leader")}</AppBadge>}
      {role.isBoardSeat && !role.isLeaderRole && <AppBadge tone="warning">{t("clubRoles.board")}</AppBadge>}
      {role.isDefaultMemberRole && <AppBadge>{t("clubRoles.members")}</AppBadge>}
    </>;
  }

  return (
    <>
      <div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <h2 className="font-heading text-xl font-bold">{t("clubRoles.roles")}</h2>
          <ul className="mt-4 divide-y divide-border-app border-y border-border-app">{data.roles.map((role) => (
            <li key={role.id} className={cn("space-y-3 px-1 py-4", { "bg-primary-soft-app": editing?.id === role.id })}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 basis-48">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold break-words">{role.name}</h3>{roleBadges(role)}
                    <AppBadge>{role.isSingleHolder ? t("clubRoles.singleHolder") : t("clubRoles.multiHolder")}</AppBadge></div>
                  {role.unit && <p className="mt-1 text-sm text-muted-app">{role.unit}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!role.isLeaderRole && <AppButton variant="secondary" onClick={() => edit(role)}>{t("clubRoles.edit")}</AppButton>}
                  {regularRoles.includes(role) && <AppButton variant="ghost" className="hover:text-danger-app" disabled={action.isPending}
                    onClick={() => { if (window.confirm(t("clubRoles.deactivateConfirm"))) void run({ kind: "deactivate", clubId, roleId: role.id, csrfToken }); }}>
                    {t("clubRoles.deactivate")}</AppButton>}
                </div>
              </div>
              <p className="text-sm">{role.isLeaderRole ? t("clubRoles.allPermissions") : role.permissionCodes.length
                ? role.permissionCodes.map(permissionLabel).join(" · ") : <span className="text-muted-app">{t("clubRoles.noPermissions")}</span>}</p>
              <div className="text-sm">
                <p className="font-semibold">{t("clubRoles.holders")}</p>
                {role.isDefaultMemberRole ? <p className="text-muted-app">{t("clubRoles.membersHint")}</p>
                  : !role.holders.length ? <p className="text-muted-app">{t("clubRoles.noHolders")}</p>
                    : <ul className="mt-1 space-y-1">{role.holders.map((holder) => (
                      <li key={holder.assignmentId} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="min-w-0 break-words">{holder.displayName} <span className="text-muted-app">
                          {new Date(holder.effectiveFrom) > new Date() ? t("clubRoles.from", { date: formatDay(holder.effectiveFrom, locale) }) : ""}
                          {holder.effectiveTo ? ` ${t("clubRoles.until", { date: formatDay(holder.effectiveTo, locale) })}` : ""}</span></span>
                        {regularRoles.includes(role) && <AppButton variant="ghost" className="hover:text-danger-app" disabled={action.isPending}
                          onClick={() => { if (window.confirm(t("clubRoles.revokeConfirm", { name: holder.displayName }))) void run({ kind: "revoke", clubId, roleId: role.id, assignmentId: holder.assignmentId, csrfToken }); }}>
                          {t("clubRoles.revoke")}</AppButton>}
                      </li>
                    ))}</ul>}
                {(role.isBoardSeat || role.isLeaderRole) && <p className="mt-1 text-xs text-muted-app">{t("clubRoles.boardHoldersHint")}</p>}
              </div>
            </li>
          ))}</ul>
        </section>

        <div className="space-y-8">
          <section className="rounded-2xl bg-surface-app p-5 sm:p-6">
            <h2 className="font-heading text-lg font-bold">{editing ? t("clubRoles.editRole") : t("clubRoles.addRole")}</h2>
            <label className="mt-4 block text-sm font-semibold">{t("clubRoles.name")}
              <AppInput className="mt-2 block w-full font-normal" value={draft.name} maxLength={120}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
            <div className="mt-4 text-sm font-semibold">{t("clubRoles.unit")}
              <AppSelect className="mt-2 block w-full" label={t("clubRoles.unit")} value={draft.unit ?? ""}
                options={[{ value: "", label: t("clubRoles.noUnit") }, ...data.departments.map((name) => ({ value: name, label: name }))]}
                onChange={(unit) => setDraft((current) => ({ ...current, unit }))} /></div>
            <label className="mt-4 flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary-app" checked={draft.isSingleHolder}
                disabled={Boolean(editing && (editing.isBoardSeat || editing.isDefaultMemberRole))}
                onChange={(event) => setDraft((current) => ({ ...current, isSingleHolder: event.target.checked }))} />
              {t("clubRoles.singleHolder")}</label>
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold">{t("clubRoles.permissions")}</legend>
              <p className="mt-1 text-xs text-muted-app">{t("clubRoles.permissionsHint")}</p>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">{data.grantablePermissions.map((code) => (
                <label key={code} className="flex min-h-10 items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-primary-app" checked={draft.permissionCodes.includes(code)}
                    onChange={(event) => togglePermission(code, event.target.checked)} />{permissionLabel(code)}</label>
              ))}</div>
            </fieldset>
            <label className="mt-4 block text-sm font-semibold">{t("clubRoles.reason")}
              <AppInput className="mt-2 block w-full font-normal" value={draft.reason} maxLength={500}
                onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value }))} /></label>
            <div className="mt-5 flex flex-wrap gap-2">
              <AppButton disabled={action.isPending || !draft.name.trim()} onClick={() => void run(editing
                ? { kind: "update", clubId, roleId: editing.id, input, csrfToken }
                : { kind: "create", clubId, input, csrfToken }, resetForm)}>
                {action.isPending ? t("clubRoles.saving") : t("clubRoles.save")}</AppButton>
              {editing && <AppButton variant="secondary" onClick={resetForm}>{t("clubRoles.cancel")}</AppButton>}
            </div>
          </section>

          <section className="rounded-2xl bg-surface-app p-5 sm:p-6">
            <h2 className="font-heading text-lg font-bold">{t("clubRoles.assign")}</h2>
            {!data.activeTermId ? <p className="mt-2 text-sm text-muted-app">{t("clubRoles.noTerm")}</p> : <>
              <div className="mt-4 text-sm font-semibold">{t("clubRoles.roles")}
                <AppSelect className="mt-2 block w-full" label={t("clubRoles.roles")} value={assignment.roleId}
                  options={[{ value: "", label: "—" }, ...regularRoles.map((role) => ({ value: role.id, label: role.name }))]}
                  onChange={(roleId) => setAssignment((current) => ({ ...current, roleId }))} /></div>
              <div className="mt-4 text-sm font-semibold">{t("clubRoles.member")}
                <AppSelect className="mt-2 block w-full" label={t("clubRoles.member")} value={assignment.membershipId}
                  options={[{ value: "", label: t("clubRoles.chooseMember") }, ...activeMembers.map((member) => ({
                    value: member.membershipId, label: `${member.displayName} (${member.email})` }))]}
                  onChange={(membershipId) => setAssignment((current) => ({ ...current, membershipId }))} /></div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">{t("clubRoles.start")}<AppInput className="mt-2 block w-full font-normal" type="date"
                  value={assignment.from} onChange={(event) => setAssignment((current) => ({ ...current, from: event.target.value }))} /></label>
                <label className="block text-sm font-semibold">{t("clubRoles.end")}<AppInput className="mt-2 block w-full font-normal" type="date"
                  value={assignment.to} min={assignment.from || undefined} onChange={(event) => setAssignment((current) => ({ ...current, to: event.target.value }))} /></label>
              </div>
              <AppButton className="mt-5" disabled={action.isPending || !assignment.roleId || !assignment.membershipId}
                onClick={() => void run({ kind: "assign", clubId, roleId: assignment.roleId, csrfToken, input: {
                  membershipId: assignment.membershipId,
                  ...(assignment.from ? { effectiveFrom: new Date(`${assignment.from}T00:00:00`).toISOString() } : {}),
                  ...(assignment.to ? { effectiveTo: new Date(`${assignment.to}T23:59:59`).toISOString() } : {}),
                } }, () => setAssignment({ roleId: "", membershipId: "", from: "", to: "" }))}>{t("clubRoles.assignButton")}</AppButton>
            </>}
          </section>
        </div>
      </div>

      {action.isError && <AppNotice tone="danger" role="alert" className="mt-6">{action.error.message}</AppNotice>}
      {action.isSuccess && <AppNotice tone="success" role="status" className="mt-6">{t("clubRoles.success")}</AppNotice>}

      <section className="mt-10">
        <h2 className="font-heading text-xl font-bold">{t("clubRoles.history")}</h2>
        <ul className="mt-4 divide-y divide-border-app border-y border-border-app">{data.versions.map((version) => (
          <li key={version.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-1 py-3 text-sm">
            <span className="font-bold">{t("clubRoles.version", { no: version.versionNo })}</span>
            <span className="text-muted-app">{formatDate(version.effectiveFrom, locale)}</span>
            <span>{version.source in sourceKeys ? t(sourceKeys[version.source as keyof typeof sourceKeys]) : version.source}</span>
            {version.reason && <span className="min-w-0 break-words text-muted-app">{version.reason}</span>}
          </li>
        ))}</ul>
        {data.versions.length > 1 && fromVersion && toVersion && diff && <div className="mt-6">
          <h3 className="font-heading font-bold">{t("clubRoles.compare")}</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="text-sm font-semibold">{t("clubRoles.compareFrom")}<AppSelect className="mt-2 block w-full" label={t("clubRoles.compareFrom")}
              value={fromVersion.versionNo} options={versionOptions} onChange={(from) => setCompare((current) => ({ ...current, from }))} /></div>
            <div className="text-sm font-semibold">{t("clubRoles.compareTo")}<AppSelect className="mt-2 block w-full" label={t("clubRoles.compareTo")}
              value={toVersion.versionNo} options={versionOptions} onChange={(to) => setCompare((current) => ({ ...current, to }))} /></div>
          </div>
          {!diff.added.length && !diff.removed.length && !diff.changed.length
            ? <p className="mt-4 text-sm text-muted-app">{t("clubRoles.unchanged")}</p>
            : <ul className="mt-4 space-y-2 text-sm">
              {diff.added.map((role) => <li key={`a-${role.positionId}`} className="flex flex-wrap items-center gap-2"><AppBadge tone="success">{t("clubRoles.added")}</AppBadge><span className="font-semibold">{role.name}</span>{roleBadges(role)}<span className="text-muted-app">{role.permissionCodes.map(permissionLabel).join(" · ")}</span></li>)}
              {diff.removed.map((role) => <li key={`r-${role.positionId}`} className="flex flex-wrap items-center gap-2"><AppBadge tone="danger">{t("clubRoles.removed")}</AppBadge><span className="font-semibold">{role.name}</span>{roleBadges(role)}</li>)}
              {diff.changed.map(({ role, granted, dropped, renamed }) => <li key={`c-${role.positionId}`} className="flex flex-wrap items-center gap-2">
                <AppBadge tone="warning">{t("clubRoles.changed")}</AppBadge>
                <span className="font-semibold">{renamed ? `${renamed} → ${role.name}` : role.name}</span>{roleBadges(role)}
                {granted.map((code) => <span key={`+${code}`} className="text-success-app">+ {permissionLabel(code)}</span>)}
                {dropped.map((code) => <span key={`-${code}`} className="text-danger-app">− {permissionLabel(code)}</span>)}
              </li>)}
            </ul>}
        </div>}
      </section>
    </>
  );
}
