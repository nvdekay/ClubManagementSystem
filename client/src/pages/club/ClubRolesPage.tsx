import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppNotice } from "@/components/ui/notice/AppNotice";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { ClubRolesPanel } from "./ClubRolesPanel";

/** UC23: the Club Leader's role and permission management (club.role.manage). */
export function ClubRolesPage() {
  const { clubId = "" } = useParams();
  const { t } = useTranslation();
  const auth = useAuth();
  if (auth.isPending) return <AppSkeleton className="h-48 w-full" />;
  const canManage = Boolean(auth.data?.workspaces.some((item) => item.clubId === clubId
    && item.permissions.includes("club.role.manage")));
  return (
    <>
      <PageHeader title={t("clubRoles.pageTitle")} description={t("clubRoles.pageDescription")} />
      {canManage ? <ClubRolesPanel clubId={clubId} />
        : <AppNotice tone="danger" role="alert">{t("clubRoles.permissionDenied")}</AppNotice>}
    </>
  );
}
