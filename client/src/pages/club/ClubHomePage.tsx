import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { WorkspaceHome } from "@/components/custom/WorkspaceHome";
import { useAuth } from "@/hooks/useAuth";

export function ClubHomePage() {
  const { t } = useTranslation();
  const { clubId } = useParams();
  const auth = useAuth();
  const canManageProfile = auth.data?.workspaces.some((workspace) => workspace.kind === "club"
    && workspace.clubId === clubId && workspace.permissions.includes("club.profile.manage"));
  const canManageRecruitment = auth.data?.workspaces.some((workspace) => workspace.kind === "club"
    && workspace.clubId === clubId && workspace.permissions.includes("club.recruitment.manage"));
  const canNominateBoard = auth.data?.workspaces.some((workspace) => workspace.kind === "club"
    && workspace.clubId === clubId && workspace.permissions.includes("club.board.nominate"));
  return <WorkspaceHome kind="club" clubId={clubId} actions={[
    ...(canNominateBoard ? [{ href: `/club/${clubId ?? ""}/board`,
      label: t("boardNominations.title"), description: t("boardNominations.description") }] : []),
    ...(canManageProfile ? [{ href: `/club/${clubId ?? ""}/settings`,
      label: t("clubSettings.title"), description: t("clubSettings.description") }] : []),
    ...(canManageRecruitment ? [{ href: `/club/${clubId ?? ""}/recruitment`,
      label: t("recruitmentCampaigns.title"), description: t("recruitmentCampaigns.description") }] : []),
    { href: `/clubs/${clubId ?? ""}`, label: t("auth.clubPublicPage"), description: t("auth.clubPublicPageDescription") },
    { href: "/events", label: t("discovery.navEvents"), description: t("auth.clubEventsDescription") },
    { href: "/workspace", label: t("auth.switchWorkspace"), description: t("auth.switchWorkspaceDescription") },
  ]} />;
}
