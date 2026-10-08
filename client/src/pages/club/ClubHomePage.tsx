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
  return <WorkspaceHome kind="club" clubId={clubId} actions={[
    ...(canManageProfile ? [{ href: `/club/${clubId ?? ""}/settings`,
      label: t("clubSettings.title"), description: t("clubSettings.description") }] : []),
    { href: `/clubs/${clubId ?? ""}`, label: t("auth.clubPublicPage"), description: t("auth.clubPublicPageDescription") },
    { href: "/events", label: t("discovery.navEvents"), description: t("auth.clubEventsDescription") },
    { href: "/workspace", label: t("auth.switchWorkspace"), description: t("auth.switchWorkspaceDescription") },
  ]} />;
}
