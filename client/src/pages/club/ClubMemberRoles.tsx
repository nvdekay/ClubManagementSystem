import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useClubRoleDirectory } from "@/hooks/useClubRoles";

import { cn } from "@/utils/cn";

import { groupPermissions, permissionDescription, permissionLabel } from "./clubRolePermissions";

interface ClubMemberRolesProps { clubId: string; enabled: boolean }
export function ClubMemberRoles({ clubId, enabled }: ClubMemberRolesProps) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const directory = useClubRoleDirectory(clubId, enabled);
  if (directory.isPending) return <AppSkeleton className="h-48 w-full" />;
  if (directory.isError) return <AppNotice tone="danger" role="alert">
    <p>{t("clubRoles.directoryError")}</p>
    <AppButton variant="secondary" onClick={() => void directory.refetch()}>{t("memberSpace.retry")}</AppButton>
  </AppNotice>;
  const roles = directory.data.roles;
  const selected = roles.find((role) => role.id === selectedId) ?? roles[0];
  return <section className="space-y-4">
    {!selected ? <p className="text-sm text-muted-app">{t("clubRoles.directoryEmpty")}</p> :
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
        <div className="min-w-0 rounded-xl border border-border-app p-4">
          <h2 className="mb-3 font-heading text-lg font-bold">{t("clubRoles.roles")}</h2>
          <div className="space-y-1">
            {roles.map((role) => <button type="button" key={role.id} aria-pressed={selected.id === role.id}
              onClick={() => setSelectedId(role.id)}
              className={cn("flex min-h-11 w-full flex-wrap items-center gap-2 rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-app",
                selected.id === role.id ? "border-primary-app bg-primary-app/10" : "border-transparent hover:bg-surface-app")}>
              <span className="min-w-0 flex-1 font-medium break-words">{role.name}</span>
              {role.isLeaderRole && <AppBadge tone="info">{t("clubRoles.leader")}</AppBadge>}
              {role.isDefaultMemberRole && <AppBadge>{t("clubRoles.members")}</AppBadge>}
            </button>)}
          </div>
        </div>
        <article className="min-w-0 rounded-xl border border-border-app p-4 sm:p-5" aria-labelledby="selected-role-permissions">
          <h2 id="selected-role-permissions" className="font-heading text-lg font-bold break-words">
            {t("clubRoles.permissions")} · {selected.name}
          </h2>
          {selected.unit && <p className="mt-1 text-sm text-muted-app">{selected.unit}</p>}
          {selected.isDefaultMemberRole && <p className="mt-2 text-sm text-muted-app">{t("clubRoles.membersHint")}</p>}
          {selected.permissionCodes.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {groupPermissions(selected.permissionCodes).map((group) => <section key={group.labelKey}>
              <h3 className="mb-3 font-semibold">{t(group.labelKey)}</h3>
              <ul className="space-y-3 text-sm">
                {group.codes.map((code) => <li key={code} className="flex items-start gap-2">
                  <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded border border-primary-app bg-primary-app/10 text-primary-app">✓</span>
                  <div className="min-w-0"><p className="font-medium break-words">{permissionLabel(t, code)}</p>
                    {permissionDescription(t, code) && <p className="mt-1 text-muted-app">{permissionDescription(t, code)}</p>}
                  </div>
                </li>)}
              </ul>
            </section>)}
          </div> : <p className="mt-4 text-sm text-muted-app">{t("clubRoles.noPermissions")}</p>}
        </article>
      </div>}
  </section>;
}
