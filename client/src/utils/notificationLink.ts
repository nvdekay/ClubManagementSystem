import type { AppNotification } from "@/services/notifications";

type Rule = [RegExp, (item: AppNotification) => string | undefined];

function club(path: string) {
  return function link(item: AppNotification): string | undefined {
    return item.clubId ? `/club/${encodeURIComponent(item.clubId)}${path}` : undefined;
  };
}

function fixed(path: string) {
  return function link(): string { return path; };
}

/** Detail page `base/<entityId>`, or the list when the row has no entity. */
function detail(base: string) {
  return function link(item: AppNotification): string {
    return item.entityId ? `${base}/${encodeURIComponent(item.entityId)}` : base;
  };
}

// First match wins, so the specific codes sit above the family prefixes they belong to. Each code leads to
// the workspace of the people who receive it (server: domain/notification.ts audience lists).
const rules: Rule[] = [
  [/^(EVENT_REGISTRATION_|EVENT_CANCELLED$|EVENT_RESCHEDULED$|EVENT_CHECKED_IN$)/, fixed("/workspace/event-registrations")],
  [/^EVENT_PROPOSAL_/, club("/events")],
  // The founder's own application (receipts and decisions alike).
  [/^CLUB_APPLICATION_APPROVED$/, (item) => club("")(item) ?? detail("/workspace/applications")(item)],
  [/^CLUB_APPLICATION_/, detail("/workspace/applications")],
  [/^BOARD_NOMINATION_SUBMITTED$/, detail("/workspace/board-nominations")],
  [/^BOARD_NOMINATION_/, club("/board")],
  [/^BOOKING_(SUBMITTED|CANCELLED|RELEASED)$/, fixed("/workspace/bookings")],
  [/^PROPERTY_BOOKING_STATUS$/, club("/bookings")],
  [/^ROOM_ALLOCATION/, club("/rooms")],
  [/^RECRUITMENT_APPLICATION_(SUBMITTED|WITHDRAWN)$/, club("/recruitment")],
  [/^RECRUITMENT_/, fixed("/workspace/recruitment")],
  [/^MEMBERSHIP_WITHDRAWAL_REQUESTED$/, club("/members")],
  [/^(CLUB_MEMBERSHIP_|MEMBERSHIP_RECONFIRMATION_)/, fixed("/workspace/clubs")],
  [/^(TRANSITION_PLAN_|LEADERSHIP_TRANSITION_)/, club("/transition-plans")],
  [/^SUSPENSION_REQUEST_SUBMITTED$/, fixed("/workspace/suspension-requests")],
  [/^SUSPENSION_REQUEST_/, club("/suspension-requests")],
  [/^(VIOLATION_RESPONSE_SUBMITTED|CORRECTIVE_ACTION_SUBMITTED)$/,
    (item) => item.entityId ? `/workspace/violations/${encodeURIComponent(item.entityId)}` : "/workspace/violations"],
  [/^VIOLATION_/, club("/violations")],
  [/^PERIODIC_REPORT_SUBMITTED$/, detail("/workspace/periodic-reports")],
  [/^PERIODIC_REPORT_/, club("/periodic-reports")],
  [/^EVALUATION_PUBLISHED$/, club("/evaluations")],
  [/^(CLUB_SUSPENSION_ENDING|CLUB_LIFECYCLE_FAILED|CLUB_DISSOLUTION_COMPLETED)$/, fixed("/icpdp/clubs")],
  [/^CLUB_/, (item) => item.clubId ? `/clubs/${encodeURIComponent(item.clubId)}` : undefined],
  [/^EVENT_INVITATION_/, (item) => typeof item.payload.eventId === "string"
    ? `/workspace/school-events/${encodeURIComponent(item.payload.eventId)}` : "/workspace/school-events"],
  [/^SCHOOL_EVENT_INVITATION/, club("/invitations")],
  [/^REPORT_ESCALATED_TO_ICPDP$/, fixed("/workspace/event-reports")],
  [/^REPORT_/, club("/event-reports")],
  [/^REFUND_OVERDUE_TO_ICPDP$/, detail("/workspace/budgets")],
  [/^(BUDGET_|SETTLEMENT_|REFUND_)/, club("/budgets")],
];

/** Where a notification leads in the app, or undefined when there is no page for it. */
export function notificationLink(item: AppNotification): string | undefined {
  const rule = rules.find(([pattern]) => pattern.test(item.eventCode));
  return rule?.[1](item);
}

const families = ["EVENT_REGISTRATION", "EVENT_PROPOSAL", "CLUB_APPLICATION", "BOARD_NOMINATION", "BOOKING",
  "PROPERTY_BOOKING", "ROOM_ALLOCATION", "RECRUITMENT", "CLUB_MEMBERSHIP", "MEMBERSHIP", "TRANSITION_PLAN",
  "LEADERSHIP_TRANSITION", "SUSPENSION_REQUEST", "VIOLATION", "CORRECTIVE_ACTION", "PERIODIC_REPORT", "EVALUATION",
  "EVENT_INVITATION", "SCHOOL_EVENT", "REPORT", "SETTLEMENT", "REFUND", "BUDGET", "EVENT", "CLUB"] as const;

export type NotificationFamily = (typeof families)[number] | "OTHER";

/** Topic used for the fallback title of a code that has no title of its own. */
export function notificationFamily(eventCode: string): NotificationFamily {
  return families.find((family) => eventCode === family || eventCode.startsWith(`${family}_`)) ?? "OTHER";
}

/** The most specific human-readable subject in the payload (event title, club, period, room). */
export function notificationSubject(item: AppNotification): string | undefined {
  for (const field of ["title", "eventTitle", "clubName", "periodCode", "propertyName", "semesterCode"]) {
    const value = item.payload[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}
