import { useTranslation } from "react-i18next";

import { AppBadge } from "@/components/ui/badge/AppBadge";
import type { MembershipState } from "@/services/memberSpace";

const labels = { Active: "memberSpace.stateActive", Inactive: "memberSpace.stateInactive",
  Left: "memberSpace.stateLeft", Banned: "memberSpace.stateBanned" } as const;

export function MembershipStateBadge({ state }: { state: MembershipState }) {
  const { t } = useTranslation();
  return <AppBadge tone={state === "Active" ? "success" : state === "Inactive" ? "warning" : "neutral"}>
    {t(labels[state])}</AppBadge>;
}
