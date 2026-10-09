import { useTranslation } from "react-i18next";

import { WorkspaceHome } from "@/components/custom/WorkspaceHome";
import { RoleDashboard } from "@/components/custom/RoleDashboard";

export function IcpdpHomePage() {
  const { t } = useTranslation();
  return <WorkspaceHome subtitle={t("auth.icpdpHome")} actions={[
    { href: "/workspace/reviews", icon: "inbox", label: t("reviews.title"), description: t("reviews.description") },
    { href: "/workspace/board-nominations", icon: "badge", label: t("boardNominations.queueTitle"),
      description: t("boardNominations.queueDescription") },
    { href: "/workspace/policy", icon: "shield", label: t("policy.title"), description: t("auth.policyDescription") },
    { href: "/icpdp/accounts", icon: "users", label: t("auth.manageAccounts"), description: t("auth.manageAccountsDescription") },
    { href: "/clubs", icon: "compass", label: t("discovery.navClubs"), description: t("auth.reviewClubsDescription") },
  ]}><RoleDashboard context={{ workspace: "icpdp" }} /></WorkspaceHome>;
}
