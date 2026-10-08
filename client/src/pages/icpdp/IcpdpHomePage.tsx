import { useTranslation } from "react-i18next";

import { WorkspaceHome } from "@/components/custom/WorkspaceHome";

export function IcpdpHomePage() {
  const { t } = useTranslation();
  return <WorkspaceHome kind="icpdp" actions={[
    { href: "/workspace/policy", label: t("policy.title"), description: t("auth.policyDescription") },
    { href: "/clubs", label: t("discovery.navClubs"), description: t("auth.reviewClubsDescription") },
    { href: "/workspace", label: t("auth.switchWorkspace"), description: t("auth.switchWorkspaceDescription") },
  ]} />;
}
