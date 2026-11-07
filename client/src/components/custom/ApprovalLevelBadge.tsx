import { useTranslation } from "react-i18next";

import { AppBadge } from "@/components/ui/badge/AppBadge";

interface ApprovalLevelBadgeProps {
  requiredLevel?: number;
  currentLevel?: number;
}

/** UC05: shown on a review that needs two approval levels; level 2 belongs to ICPDP_HEAD. */
export function ApprovalLevelBadge({ requiredLevel = 1, currentLevel = 1 }: ApprovalLevelBadgeProps) {
  const { t } = useTranslation();
  if (requiredLevel < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AppBadge tone={currentLevel >= 2 ? "warning" : "info"}>{t("routing.levelBadge", { current: currentLevel, total: requiredLevel })}</AppBadge>
      <span className="text-xs text-muted-app">{currentLevel >= 2 ? t("routing.levelTwoHint") : t("routing.levelOneHint")}</span>
    </div>
  );
}
