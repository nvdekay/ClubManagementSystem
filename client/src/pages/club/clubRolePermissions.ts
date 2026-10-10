import type { TFunction } from "i18next";

/** Label + one-line description i18n keys for each grantable club permission. */
const permissionKeys = {
  "club.role.manage": ["clubRoles.permRole", "clubRoles.descRole"],
  "club.board.nominate": ["clubRoles.permBoard", "clubRoles.descBoard"],
  "club.transition.plan": ["clubRoles.permTransition", "clubRoles.descTransition"],
  "club.suspension.request": ["clubRoles.permSuspension", "clubRoles.descSuspension"],
  "club.profile.manage": ["clubRoles.permProfile", "clubRoles.descProfile"],
  "club.recruitment.manage": ["clubRoles.permRecruitment", "clubRoles.descRecruitment"],
  "club.application.review": ["clubRoles.permApplicationReview", "clubRoles.descApplicationReview"],
  "club.member.manage": ["clubRoles.permMember", "clubRoles.descMember"],
  "club.event.manage": ["clubRoles.permEvent", "clubRoles.descEvent"],
  "club.attendance.manage": ["clubRoles.permAttendance", "clubRoles.descAttendance"],
  "club.report.submit": ["clubRoles.permReport", "clubRoles.descReport"],
  "club.expense.record": ["clubRoles.permExpense", "clubRoles.descExpense"],
  "club.booking.manage": ["clubRoles.permBooking", "clubRoles.descBooking"],
  "club.feedback.view": ["clubRoles.permFeedback", "clubRoles.descFeedback"],
  "club.complaint.respond": ["clubRoles.permComplaint", "clubRoles.descComplaint"],
} as const;

type KnownPermission = keyof typeof permissionKeys;
type GroupLabelKey = "clubRoles.permGroupPeople" | "clubRoles.permGroupEvents" | "clubRoles.permGroupFinance"
  | "clubRoles.permGroupComms" | "clubRoles.permGroupOther";

/** Checklist groups in the role dialog; codes the server adds later fall into "Other". */
const permissionGroups: Array<{ labelKey: GroupLabelKey; codes: KnownPermission[] }> = [
  { labelKey: "clubRoles.permGroupPeople", codes: ["club.recruitment.manage", "club.application.review", "club.member.manage"] },
  { labelKey: "clubRoles.permGroupEvents", codes: ["club.event.manage", "club.attendance.manage"] },
  { labelKey: "clubRoles.permGroupFinance", codes: ["club.expense.record", "club.booking.manage"] },
  { labelKey: "clubRoles.permGroupComms", codes: ["club.profile.manage", "club.report.submit", "club.feedback.view", "club.complaint.respond"] },
];

export function permissionLabel(t: TFunction, code: string): string {
  const keys = permissionKeys[code as KnownPermission];
  return keys ? t(keys[0]) : code;
}

export function permissionDescription(t: TFunction, code: string): string | undefined {
  const keys = permissionKeys[code as KnownPermission];
  return keys ? t(keys[1]) : undefined;
}

/** Groups the grantable catalogue from the server, keeping only codes it actually offers. */
export function groupPermissions(grantable: string[]): Array<{ labelKey: GroupLabelKey; codes: string[] }> {
  const offered = new Set(grantable);
  const grouped = permissionGroups.map((group) => ({ ...group, codes: group.codes.filter((code) => offered.has(code)) }));
  const known = new Set<string>(permissionGroups.flatMap((group) => group.codes));
  const other = grantable.filter((code) => !known.has(code));
  return [...grouped, { labelKey: "clubRoles.permGroupOther" as const, codes: other }].filter((group) => group.codes.length);
}
