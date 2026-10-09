import { useTranslation } from "react-i18next";

import { WorkspaceHome } from "@/components/custom/WorkspaceHome";
import { RoleDashboard } from "@/components/custom/RoleDashboard";

export function StudentHomePage() {
  const { t } = useTranslation();
  return <WorkspaceHome subtitle={t("auth.student")} actions={[
    { href: "/workspace/recruitment", icon: "send", label: t("recruitmentApplications.title"), description: t("recruitmentApplications.description") },
    { href: "/workspace/applications", icon: "file", label: t("applications.title"), description: t("auth.studentApplicationsDescription") },
    { href: "/clubs", icon: "compass", label: t("discovery.navClubs"), description: t("auth.discoverClubsDescription") },
    { href: "/events", icon: "calendar", label: t("discovery.navEvents"), description: t("auth.discoverEventsDescription") },
  ]}><RoleDashboard context={{ workspace: "student" }} /></WorkspaceHome>;
}
