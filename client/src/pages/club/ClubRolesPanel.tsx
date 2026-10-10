import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { appToast } from "@/components/ui/toast/AppToast";
import { useAuth } from "@/hooks/useAuth";
import { useClubRoleAction, useClubRoles } from "@/hooks/useClubRoles";
import type { Locale } from "@/i18n";
import type { ClubRole, ClubRoleHolder } from "@/services/clubRoles";
import { cn } from "@/utils/cn";
import { formatDay } from "@/utils/formatDate";
import { ClubRoleAssignDialog } from "./ClubRoleAssignDialog";
import { ClubRoleDialog } from "./ClubRoleDialog";
import { ClubRoleHistory } from "./ClubRoleHistory";
import { permissionLabel } from "./clubRolePermissions";

/** Chips shown on a card before the rest collapse into "+N". */
const VISIBLE_PERMISSIONS = 4;

type Confirm = { kind: "deactivate"; role: ClubRole } | { kind: "revoke"; role: ClubRole; holder: ClubRoleHolder };
type Open = { kind: "create" } | { kind: "edit"; role: ClubRole } | { kind: "assign"; role: ClubRole } | Confirm;

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function isRegular(role: ClubRole) {
  return !role.isLeaderRole && !role.isBoardSeat && !role.isDefaultMemberRole;
}

export function ClubRolesPanel({ clubId }: { clubId: string }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "history" ? "history" : "roles";
  const auth = useAuth();
  const roles = useClubRoles(clubId, true);
  const [open, setOpen] = useState<Open | null>(null);
  function close() { setOpen(null); }

  const nav = (
    <div role="tablist" aria-label={t("clubRoles.viewsLabel")} className="mb-6 inline-flex flex-wrap gap-1 rounded-full bg-surface-app p-1">
      {(["roles", "history"] as const).map((item) => (
        <button key={item} type="button" role="tab" aria-selected={view === item}
          onClick={() => setSearchParams(item === "history" ? { tab: "roles", view: "history" } : { tab: "roles" })}
          className={cn("min-h-9 rounded-full px-4 text-sm font-semibold text-muted-app hover:text-text-app",
            { "bg-bg-app text-primary-app shadow-sm hover:text-primary-app": view === item })}>
          {item === "history" ? t("clubRoles.viewHistory") : t("clubRoles.viewRoles")}
        </button>
      ))}
    </div>
  );

  if (roles.isPending) return <>{nav}<div className="space-y-4">
    <AppSkeleton className="h-12 w-full" /><AppSkeleton className="h-40 w-full" /><AppSkeleton className="h-40 w-full" /></div></>;
  if (roles.isError || !roles.data) return <>{nav}
    <AppNotice tone="danger" role="alert" title={roles.error?.message ?? t("clubRoles.loadError")}>
      <AppButton variant="secondary" onClick={() => void roles.refetch()}>{t("clubRoles.retry")}</AppButton>
    </AppNotice></>;

  const data = roles.data;
  const csrfToken = auth.data?.csrfToken ?? "";
  if (view === "history") return <>{nav}<ClubRoleHistory versions={data.versions} /></>;

  const leadership = data.roles.filter((role) => role.isLeaderRole || role.isBoardSeat);
  const custom = data.roles.filter(isRegular);
  const members = data.roles.filter((role) => role.isDefaultMemberRole);

  return (
    <>
      {nav}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <h2 className="font-heading text-xl font-bold">{t("clubRoles.roles")}</h2>
          <p className="mt-1 text-sm text-muted-app">{t("clubRoles.rolesHint")}</p>
        </div>
        <AppButton onClick={() => setOpen({ kind: "create" })}><AppIcon name="plus" className="size-4" />{t("clubRoles.addRole")}</AppButton>
      </div>
      {!data.activeTermId && <AppNotice tone="info" className="mb-6">{t("clubRoles.noTerm")}</AppNotice>}

      <RoleGroup title={t("clubRoles.groupLeadership")} hint={t("clubRoles.groupLeadershipHint")}>
        {leadership.map((role) => <RoleCard key={role.id} role={role} onOpen={setOpen} canAssign={false} />)}
      </RoleGroup>
      <RoleGroup title={t("clubRoles.groupCustom")} empty={custom.length ? undefined : t("clubRoles.groupCustomEmpty")}>
        {custom.map((role) => <RoleCard key={role.id} role={role} onOpen={setOpen} canAssign={Boolean(data.activeTermId)} />)}
      </RoleGroup>
      <RoleGroup title={t("clubRoles.groupMembers")}>
        {members.map((role) => <RoleCard key={role.id} role={role} onOpen={setOpen} canAssign={false} />)}
      </RoleGroup>

      {(open?.kind === "create" || open?.kind === "edit") && <ClubRoleDialog clubId={clubId} csrfToken={csrfToken}
        role={open.kind === "edit" ? open.role : undefined} departments={data.departments}
        grantablePermissions={data.grantablePermissions} onClose={close} />}
      {open?.kind === "assign" && <ClubRoleAssignDialog clubId={clubId} csrfToken={csrfToken} role={open.role}
        members={data.members} onClose={close} />}
      {(open?.kind === "deactivate" || open?.kind === "revoke") && <ConfirmDialog clubId={clubId} csrfToken={csrfToken}
        confirm={open} onClose={close} />}
    </>
  );
}

function RoleGroup({ title, hint, empty, children }: { title: string; hint?: string; empty?: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h3 className="font-heading text-sm font-bold tracking-wide text-muted-app uppercase">{title}</h3>
      {hint && <p className="mt-1 text-xs text-muted-app">{hint}</p>}
      {empty ? <p className="mt-3 rounded-2xl border border-dashed border-border-app p-5 text-sm text-muted-app">{empty}</p>
        : <div className="mt-3 grid gap-4 lg:grid-cols-2">{children}</div>}
    </section>
  );
}

function RoleCard({ role, canAssign, onOpen }: { role: ClubRole; canAssign: boolean; onOpen: (open: Open) => void }) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const [showAll, setShowAll] = useState(false);
  const regular = isRegular(role);
  const permissions = showAll ? role.permissionCodes : role.permissionCodes.slice(0, VISIBLE_PERMISSIONS);
  const hidden = role.permissionCodes.length - permissions.length;

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border-app bg-bg-app p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 basis-40">
          <h4 className="font-bold break-words">{role.name}</h4>
          {role.unit && <p className="text-sm text-muted-app break-words">{role.unit}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {role.isLeaderRole && <AppBadge tone="info">{t("clubRoles.leader")}</AppBadge>}
          {role.isBoardSeat && !role.isLeaderRole && <AppBadge tone="warning">{t("clubRoles.board")}</AppBadge>}
          {role.isDefaultMemberRole && <AppBadge>{t("clubRoles.members")}</AppBadge>}
          {role.isSingleHolder && !role.isLeaderRole && <AppBadge>{t("clubRoles.singleHolder")}</AppBadge>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {role.isLeaderRole ? <span className="rounded-full bg-primary-soft-app px-2.5 py-1 text-xs font-medium text-primary-app">{t("clubRoles.allPermissions")}</span>
          : !role.permissionCodes.length ? <span className="text-sm text-muted-app">{t("clubRoles.noPermissions")}</span>
            : <>
              {permissions.map((code) => <span key={code} className="rounded-full bg-surface-strong-app px-2.5 py-1 text-xs font-medium">{permissionLabel(t, code)}</span>)}
              {hidden > 0 && <button type="button" className="rounded-full border border-border-app px-2.5 py-1 text-xs font-semibold text-primary-app hover:border-primary-app"
                onClick={() => setShowAll(true)}>{t("clubRoles.moreCount", { count: hidden })}</button>}
            </>}
      </div>

      <div className="border-t border-border-app pt-3">
        {role.isDefaultMemberRole ? <p className="text-sm text-muted-app">{t("clubRoles.membersHint")}</p> : <>
          <p className="text-xs font-semibold text-muted-app">{t("clubRoles.holderCount", { count: role.holders.length })}</p>
          {role.holders.length > 0 && <ul className="mt-2 space-y-2">{role.holders.map((holder) => (
            <li key={holder.assignmentId} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft-app text-xs font-bold text-primary-app">{initials(holder.displayName)}</span>
              <span className="min-w-0 flex-1 basis-32 text-sm">
                <span className="block font-medium break-words">{holder.displayName}</span>
                {(new Date(holder.effectiveFrom) > new Date() || holder.effectiveTo) && <span className="block text-xs text-muted-app">
                  {new Date(holder.effectiveFrom) > new Date() ? t("clubRoles.from", { date: formatDay(holder.effectiveFrom, locale) }) : ""}
                  {holder.effectiveTo ? ` ${t("clubRoles.until", { date: formatDay(holder.effectiveTo, locale) })}` : ""}</span>}
              </span>
              {regular && <AppButton variant="ghost" className="min-h-9 px-3 text-xs hover:text-danger-app sm:min-h-8"
                onClick={() => onOpen({ kind: "revoke", role, holder })}>{t("clubRoles.revoke")}</AppButton>}
            </li>
          ))}</ul>}
        </>}
      </div>

      {role.isLeaderRole ? <p className="text-xs text-muted-app">{t("clubRoles.leaderLocked")}</p>
        : <div className="mt-auto flex flex-wrap gap-2">
          {canAssign && <AppButton onClick={() => onOpen({ kind: "assign", role })}>{t("clubRoles.assign")}</AppButton>}
          <AppButton variant="secondary" onClick={() => onOpen({ kind: "edit", role })}>{t("clubRoles.edit")}</AppButton>
          {regular && <AppButton variant="ghost" className="hover:text-danger-app" onClick={() => onOpen({ kind: "deactivate", role })}>
            {t("clubRoles.deactivate")}</AppButton>}
        </div>}
    </article>
  );
}

function ConfirmDialog({ clubId, csrfToken, confirm, onClose }: { clubId: string; csrfToken: string; confirm: Confirm; onClose: () => void }) {
  const { t } = useTranslation();
  const action = useClubRoleAction();
  const revoke = confirm.kind === "revoke";

  async function run() {
    try {
      if (confirm.kind === "revoke") {
        await action.mutateAsync({ kind: "revoke", clubId, roleId: confirm.role.id, assignmentId: confirm.holder.assignmentId, csrfToken });
        appToast.success(t("clubRoles.revokedSuccess", { name: confirm.holder.displayName }));
      } else {
        await action.mutateAsync({ kind: "deactivate", clubId, roleId: confirm.role.id, csrfToken });
        appToast.success(t("clubRoles.deactivatedSuccess"));
      }
      onClose();
    } catch { /* Rendered below, inside the dialog. */ }
  }

  return (
    <AppDialog open title={revoke ? t("clubRoles.revoke") : t("clubRoles.deactivate")} onClose={onClose} closeLabel={t("clubRoles.close")}>
      <p className="text-sm break-words">{confirm.kind === "revoke"
        ? t("clubRoles.revokeConfirm", { name: confirm.holder.displayName }) : t("clubRoles.deactivateConfirm")}</p>
      <p className="mt-1 text-sm font-semibold break-words">{confirm.role.name}</p>
      {action.isError && <AppNotice tone="danger" role="alert" className="mt-4">{action.error.message}</AppNotice>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <AppButton variant="secondary" onClick={onClose}>{t("clubRoles.cancel")}</AppButton>
        <AppButton className="bg-danger-app" disabled={action.isPending} onClick={() => void run()}>
          {revoke ? t("clubRoles.revoke") : t("clubRoles.deactivate")}</AppButton>
      </div>
    </AppDialog>
  );
}
