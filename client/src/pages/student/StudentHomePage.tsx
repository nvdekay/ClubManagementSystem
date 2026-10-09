import { useTranslation } from "react-i18next";

import { WorkspaceHome } from "@/components/custom/WorkspaceHome";

export function StudentHomePage() {
  const { t } = useTranslation();
  return <WorkspaceHome kind="student" actions={[
    { href: "/workspace/recruitment", label: t("recruitmentApplications.title"), description: t("recruitmentApplications.description") },
    { href: "/workspace/applications", label: t("applications.title"), description: t("auth.studentApplicationsDescription") },
    { href: "/clubs", label: t("discovery.navClubs"), description: t("auth.discoverClubsDescription") },
    { href: "/events", label: t("discovery.navEvents"), description: t("auth.discoverEventsDescription") },
  ]} />;
}
