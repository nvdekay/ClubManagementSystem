import { useTranslation } from "react-i18next";

import { AppBadge } from "@/components/ui/badge/AppBadge";
import type { MembershipState } from "@/services/memberSpace";

/** Key i18n của nhãn trạng thái thành viên. */
export const membershipStateLabels = { Active: "memberSpace.stateActive", Inactive: "memberSpace.stateInactive",
  Left: "memberSpace.stateLeft", Banned: "memberSpace.stateBanned" } as const;

// Badge trạng thái thành viên CLB
export function MembershipStateBadge({ state }: { state: MembershipState }) {
  const { t } = useTranslation();
  return <AppBadge tone={state === "Active" ? "success" : state === "Inactive" ? "warning" : "neutral"}>
    {t(membershipStateLabels[state])}</AppBadge>;
}
