import type { TFunction } from "i18next";

import type { AppBadgeTone } from "@/components/ui/badge/AppBadge";

/** Comments ICPDP stores on a decision (UC26): the parts to revise and any approval conditions. */
export type DecisionComments = { sections?: string[]; conditions?: string[] };

export const stateTones: Record<string, AppBadgeTone> = {
  Draft: "neutral",
  "Pending Approval": "warning",
  "Revision Requested": "warning",
  "Re-defense Pending": "info",
  Approved: "success",
  Upcoming: "success",
  Ongoing: "success",
  Completed: "neutral",
  "Report Submitted": "neutral",
  Closed: "neutral",
  Rejected: "danger",
  Cancelled: "danger",
};

export function localTime(value: string) {
  return new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16);
}

export function iso(value: string) {
  return new Date(`${value}:00+07:00`).toISOString();
}

export function numberError(t: TFunction, value: number, min: number, max: number) {
  if (!Number.isInteger(value)) return t("common.invalidNumber");
  if (value < min) return t("common.numberMin", { min });
  return value > max ? t("common.numberMax", { max }) : null;
}

export function sectionLabel(t: TFunction, value: string) {
  switch (value) {
    case "schedule": return t("eventReviews.sectionschedule");
    case "venue": return t("eventReviews.sectionvenue");
    case "content": return t("eventReviews.sectioncontent");
    case "risk": return t("eventReviews.sectionrisk");
    case "budget": return t("eventReviews.sectionbudget");
    default: return t("eventReviews.sectionother");
  }
}
