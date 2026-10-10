import { useState } from "react";
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
  const [formRevision, setFormRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const selected = data.roles.find((role) => role.id === selectedId) ?? data.roles[0];

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

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section aria-label={t("clubRoles.roles")} className="overflow-hidden rounded-2xl border border-border-app bg-bg-app">
          <div className="border-b border-border-app bg-surface-app px-4 py-3 text-sm font-semibold">{t("clubRoles.name")}</div>
          <div className="divide-y divide-border-app">{data.roles.map((role) => (
            <button key={role.id} type="button" aria-pressed={selected?.id === role.id}
              onClick={() => {
                if (selected?.id === role.id || (dirty && !window.confirm(t("clubRoles.discardChanges")))) return;
                setDirty(false); setSelectedId(role.id);
              }}
              className={cn("flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-surface-app",
                { "bg-primary-soft-app text-primary-app": selected?.id === role.id })}>
              <span className="min-w-0"><span className="block font-semibold break-words">{role.name}</span>
                {role.unit && <span className="block text-xs text-muted-app">{role.unit}</span>}</span>
              <AppBadge>{role.isLeaderRole ? t("clubRoles.leader") : role.isBoardSeat ? t("clubRoles.board")
                : role.isDefaultMemberRole ? t("clubRoles.members") : t("clubRoles.holderCount", { count: role.holders.length })}</AppBadge>
            </button>
          ))}</div>
        </section>
        {selected && <div className="min-w-0 space-y-4">
          <h3 className="font-heading text-lg font-bold break-words">{t("clubRoles.permissions")} · {selected.name}</h3>
          {selected.isLeaderRole ? <AppNotice>{t("clubRoles.leaderLocked")}</AppNotice>
            : <ClubRoleDialog key={`${selected.id}:${formRevision}`} inline clubId={clubId} csrfToken={csrfToken} role={selected}
              departments={data.departments} grantablePermissions={data.grantablePermissions} onDirtyChange={setDirty}
              onClose={() => { setDirty(false); setFormRevision((value) => value + 1); }} />}
          <RoleCard key={selected.id} role={selected} onOpen={setOpen}
            canAssign={isRegular(selected) && Boolean(data.activeTermId)} />
        </div>}
      </div>

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

function RoleCard({ role, canAssign, onOpen }: { role: ClubRole; canAssign: boolean; onOpen: (open: Open) => void }) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === "vi" ? "vi" : "en";
  const regular = isRegular(role);

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border-app bg-bg-app p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 basis-40">
          <h4 className="font-bold break-words">{role.name}</h4>
          {role.unit && <p className="text-sm text-muted-app break-words">{role.unit}</p>}
        </div>
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
