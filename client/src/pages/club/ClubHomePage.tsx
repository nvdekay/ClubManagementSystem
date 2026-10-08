import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { WorkspaceHome } from "@/components/custom/WorkspaceHome";

export function ClubHomePage() {
  const { t } = useTranslation();
  const { clubId } = useParams();
  return <WorkspaceHome kind="club" clubId={clubId} actions={[
    { href: `/clubs/${clubId ?? ""}`, label: t("auth.clubPublicPage"), description: t("auth.clubPublicPageDescription") },
    { href: "/events", label: t("discovery.navEvents"), description: t("auth.clubEventsDescription") },
    { href: "/workspace", label: t("auth.switchWorkspace"), description: t("auth.switchWorkspaceDescription") },
  ]} />;
}
