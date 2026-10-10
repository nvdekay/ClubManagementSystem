import { useTranslation } from "react-i18next";

import { AppBadge } from "@/components/ui/badge/AppBadge";
import { AppButton } from "@/components/ui/button/AppButton";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useClubRoleDirectory } from "@/hooks/useClubRoles";

import { permissionDescription, permissionLabel } from "./clubRolePermissions";

interface ClubMemberRolesProps { clubId: string; enabled: boolean }
export function ClubMemberRoles({ clubId, enabled }: ClubMemberRolesProps) {
  const { t } = useTranslation();
  const directory = useClubRoleDirectory(clubId, enabled);
  if (directory.isPending) return <AppSkeleton className="h-48 w-full" />;
  if (directory.isError) return <AppNotice tone="danger" role="alert">
    <p>{t("clubRoles.directoryError")}</p>
    <AppButton variant="secondary" onClick={() => void directory.refetch()}>{t("memberSpace.retry")}</AppButton>
  </AppNotice>;
  return <section className="mb-8 space-y-4">
    <div><h2 className="font-heading text-lg font-bold">{t("clubRoles.tabRoles")}</h2>
      <p className="mt-1 text-sm text-muted-app">{t("clubRoles.directoryDescription")}</p></div>
    {!directory.data.roles.length && <p className="text-sm text-muted-app">{t("clubRoles.directoryEmpty")}</p>}
    <div className="grid gap-4 md:grid-cols-2">
      {directory.data.roles.map((role) => <article key={role.id} className="min-w-0 rounded-xl border border-border-app p-4">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold break-words">{role.name}</h3>
          {role.isLeaderRole && <AppBadge tone="info">{t("clubRoles.leader")}</AppBadge>}
          {role.isDefaultMemberRole && <AppBadge>{t("clubRoles.members")}</AppBadge>}</div>
        {role.unit && <p className="mt-1 text-sm text-muted-app">{role.unit}</p>}
        {role.isDefaultMemberRole && <p className="mt-2 text-sm text-muted-app">{t("clubRoles.membersHint")}</p>}
        {role.permissionCodes.length ? <ul className="mt-3 space-y-2 text-sm">
          {role.permissionCodes.map((code) => <li key={code}>
            <p className="font-medium break-words">{permissionLabel(t, code)}</p>
            {permissionDescription(t, code) && <p className="text-muted-app">{permissionDescription(t, code)}</p>}
          </li>)}
        </ul> : <p className="mt-3 text-sm text-muted-app">{t("clubRoles.noPermissions")}</p>}
      </article>)}
    </div>
  </section>;
}
