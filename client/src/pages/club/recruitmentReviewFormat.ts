import type { AppBadgeTone } from "@/components/ui/badge/AppBadge";
import type { RecruitmentApplication } from "@/services/recruitmentApplications";

/** Shared by the review table, the detail dialog and the evaluation panel (UC18/UC19). */
export function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function stateTone(state: RecruitmentApplication["state"]): AppBadgeTone {
  if (state === "Accepted" || state === "Onboarded") return "success";
  if (state === "Rejected") return "danger";
  if (state === "Waitlisted" || state === "Shortlisted") return "warning";
  if (state === "Withdrawn" || state === "Declined") return "neutral";
  return "info";
}

export function formatDate(value: string | undefined, locale: string) {
  return value ? new Date(value).toLocaleDateString(locale) : "—";
}
