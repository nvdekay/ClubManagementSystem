import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CLUB_NOTIFICATION_CODES, ICPDP_NOTIFICATION_CODES, STUDENT_NOTIFICATION_CODES, notificationAudience,
  type NotificationAudience,
} from "../../src/domain/notification.js";

/** Who actually receives each code, checked against every enqueue site in `src/infra`. */
const expected: Record<NotificationAudience, string[]> = {
  student: [
    // mongo-club-application-repository / -review-repository / mongo-application-expiry-repository → founder
    "CLUB_APPLICATION_SUBMITTED", "CLUB_APPLICATION_WITHDRAWN", "CLUB_APPLICATION_APPROVED",
    "CLUB_APPLICATION_REJECTED", "CLUB_APPLICATION_REVISION_REQUESTED", "CLUB_APPLICATION_EXPIRED",
    // event registration, waitlist, cancellation, reschedule, check-in → registrant
    "EVENT_REGISTRATION_CONFIRMED", "EVENT_REGISTRATION_WAITLISTED", "EVENT_REGISTRATION_PROMOTED",
    "EVENT_REGISTRATION_CANCELLED", "EVENT_CANCELLED", "EVENT_RESCHEDULED", "EVENT_CHECKED_IN",
    // recruitment outcome → applicant
    "RECRUITMENT_APPLICATION_ACCEPTED", "RECRUITMENT_APPLICATION_REJECTED", "RECRUITMENT_APPLICATION_WAITLISTED",
    "RECRUITMENT_APPLICATION_ONBOARDED", "RECRUITMENT_APPLICATION_DECLINED", "RECRUITMENT_CAMPAIGN_CANCELLED",
    // membership changes and club lifecycle → the member
    "CLUB_MEMBERSHIP_ONBOARDED", "CLUB_MEMBERSHIP_ACTIVE", "CLUB_MEMBERSHIP_INACTIVE", "CLUB_MEMBERSHIP_BANNED",
    "CLUB_MEMBERSHIP_LEFT", "MEMBERSHIP_RECONFIRMATION_REQUIRED", "MEMBERSHIP_RECONFIRMATION_EXPIRED",
    "CLUB_SUSPENDED", "CLUB_REACTIVATED", "CLUB_DISSOLUTION_DECIDED", "CLUB_DISSOLVING", "CLUB_DISSOLVED",
    // legacy, no longer sent (UC23 withdrawn)
    "CLUB_ROLE_ASSIGNED", "CLUB_ROLE_REVOKED", "CLUB_ROLE_UPDATED",
    // mongo-complaint-repository → the complainant
    "COMPLAINT_TRIAGED", "COMPLAINT_CLOSED", "COMPLAINT_ESCALATED",
  ],
  icpdp: [
    "BOOKING_SUBMITTED", "BOOKING_CANCELLED", "BOOKING_RELEASED", "BOARD_NOMINATION_SUBMITTED",
    "SUSPENSION_REQUEST_SUBMITTED", "PERIODIC_REPORT_SUBMITTED", "VIOLATION_RESPONSE_SUBMITTED",
    "CORRECTIVE_ACTION_SUBMITTED", "EVENT_INVITATION_ACCEPTED", "EVENT_INVITATION_DECLINED",
    "CLUB_SUSPENSION_ENDING", "CLUB_LIFECYCLE_FAILED", "CLUB_DISSOLUTION_COMPLETED",
    "REPORT_ESCALATED_TO_ICPDP", "REFUND_OVERDUE_TO_ICPDP",
    // mongo-complaint-repository → ICPDP officers
    "COMPLAINT_SUBMITTED", "COMPLAINT_CLUB_RESPONDED", "COMPLAINT_RESPONSE_OVERDUE",
  ],
  club: [
    "EVENT_PROPOSAL_APPROVED", "EVENT_PROPOSAL_REJECTED", "EVENT_PROPOSAL_REVISION_REQUESTED", "EVENT_PROPOSAL_EXPIRED",
    "PROPERTY_BOOKING_STATUS", "ROOM_ALLOCATED", "ROOM_ALLOCATION_REVOKED",
    "RECRUITMENT_APPLICATION_SUBMITTED", "RECRUITMENT_APPLICATION_WITHDRAWN", "MEMBERSHIP_WITHDRAWAL_REQUESTED",
    "TRANSITION_PLAN_RETURNED", "LEADERSHIP_TRANSITION_CONFIRMED", "BOARD_NOMINATION_DECIDED",
    "SUSPENSION_REQUEST_REJECTED", "COMPLAINT_FORWARDED",
    "VIOLATION_RESPONSE_REQUESTED", "VIOLATION_CLOSED_NO_VIOLATION", "VIOLATION_DECIDED", "VIOLATION_ACTIONS_ASSIGNED",
    "VIOLATION_ACTION_VERIFIED", "VIOLATION_ACTION_FAILED", "VIOLATION_RESOLVED",
    "PERIODIC_REPORT_OPENED", "PERIODIC_REPORT_ACCEPTED", "PERIODIC_REPORT_RETURNED", "PERIODIC_REPORT_MISSING", "EVALUATION_PUBLISHED",
    "SCHOOL_EVENT_INVITATION", "SCHOOL_EVENT_INVITATION_WITHDRAWN",
    "REPORT_DUE_SOON", "REPORT_DEADLINE_PASSED", "REPORT_ESCALATED",
    "REPORT_SAVE", "REPORT_SUBMIT", "REPORT_CLAIM", "REPORT_DECISION", "REPORT_OVERDUE",
    "SETTLEMENT_DUE_SOON", "SETTLEMENT_OVERDUE", "REFUND_DUE_SOON", "REFUND_OVERDUE",
    "SETTLEMENT_EXPENSE", "SETTLEMENT_EVIDENCE", "SETTLEMENT_SUBMIT", "SETTLEMENT_CLAIM", "SETTLEMENT_RETURN",
    "SETTLEMENT_FINALIZE", "BUDGET_ADVANCE_RECORDED", "BUDGET_TOPUP_RECORDED", "BUDGET_REFUND_RECORDED",
  ],
};

/**
 * Codes built at run time (template literals, a variable, a constant), which the source scan below cannot
 * read. Keep this in step when such a site changes.
 */
const dynamicCodes = [
  // `CLUB_APPLICATION_${nextState}` / `EVENT_PROPOSAL_${nextState}`: Approved | Rejected | Revision Requested
  "CLUB_APPLICATION_APPROVED", "CLUB_APPLICATION_REJECTED", "CLUB_APPLICATION_REVISION_REQUESTED",
  "EVENT_PROPOSAL_APPROVED", "EVENT_PROPOSAL_REJECTED", "EVENT_PROPOSAL_REVISION_REQUESTED",
  // `RECRUITMENT_APPLICATION_${nextState}` and `CLUB_MEMBERSHIP_${state}`
  "RECRUITMENT_APPLICATION_ACCEPTED", "RECRUITMENT_APPLICATION_REJECTED", "RECRUITMENT_APPLICATION_WAITLISTED",
  "CLUB_MEMBERSHIP_ACTIVE", "CLUB_MEMBERSHIP_INACTIVE", "CLUB_MEMBERSHIP_BANNED",
  // `BUDGET_${kind}_RECORDED`, `REPORT_${kind}`, `SETTLEMENT_${kind}` (accountability-workflow)
  "BUDGET_ADVANCE_RECORDED", "BUDGET_TOPUP_RECORDED", "BUDGET_REFUND_RECORDED",
  "REPORT_SAVE", "REPORT_SUBMIT", "REPORT_CLAIM", "REPORT_DECISION", "REPORT_OVERDUE",
  "SETTLEMENT_EXPENSE", "SETTLEMENT_EVIDENCE", "SETTLEMENT_SUBMIT", "SETTLEMENT_CLAIM", "SETTLEMENT_RETURN",
  "SETTLEMENT_FINALIZE",
  // `action` variables: school event replies, periodic report decision, violation steps with notifyClub
  "EVENT_INVITATION_ACCEPTED", "EVENT_INVITATION_DECLINED", "PERIODIC_REPORT_ACCEPTED", "PERIODIC_REPORT_RETURNED",
  "VIOLATION_RESPONSE_REQUESTED", "VIOLATION_CLOSED_NO_VIOLATION", "VIOLATION_DECIDED", "VIOLATION_ACTIONS_ASSIGNED",
  "VIOLATION_ACTION_VERIFIED", "VIOLATION_ACTION_FAILED", "VIOLATION_RESOLVED",
  // constants in mongo-room-allocation-repository and the officer copies of accountability reminders
  "ROOM_ALLOCATED", "ROOM_ALLOCATION_REVOKED", "REPORT_ESCALATED_TO_ICPDP", "REFUND_OVERDUE_TO_ICPDP",
];
// Legacy codes from the withdrawn UC23; no server code sends them any more.
const legacyCodes = ["CLUB_ROLE_ASSIGNED", "CLUB_ROLE_REVOKED", "CLUB_ROLE_UPDATED"];

const code = /"([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)"/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
    ? sourceFiles(join(dir, entry.name))
    : entry.name.endsWith(".ts") && !entry.name.includes("generated") ? [join(dir, entry.name)] : []);
}

/** Text of a call starting at `start` (the open parenthesis) up to its matching close. */
function callText(text: string, start: number): string {
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === "(") depth += 1;
    else if (text[index] === ")" && (depth -= 1) === 0) return text.slice(start, index);
  }
  return text.slice(start);
}

/** Literal codes at every enqueue site: `eventCode: …`, and the code arguments of the notify helpers. */
function enqueuedLiteralCodes(): Set<string> {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../src/infra");
  const found = new Set<string>();
  for (const file of sourceFiles(root)) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/eventCode:\s*([^,\n]+)/g)) {
      for (const literal of match[1]!.matchAll(code)) found.add(literal[1]!);
    }
    for (const match of text.matchAll(/\b(queueNotifications|notify|remindOnce)\(/g)) {
      if (/function\s+$/.test(text.slice(Math.max(0, match.index - 20), match.index))) continue;
      for (const literal of callText(text, match.index + match[0].length - 1).matchAll(code)) found.add(literal[1]!);
    }
  }
  return found;
}

describe("notification audience", () => {
  const all = Object.values(expected).flat();

  it("classifies every code the server enqueues explicitly", () => {
    const enqueued = new Set([...enqueuedLiteralCodes(), ...dynamicCodes]);
    const unclassified = [...enqueued].filter((item) => !all.includes(item));
    expect(unclassified, "add the new code to a list in domain/notification.ts and here").toEqual([]);
    // Nothing is pinned that the server no longer sends, apart from known legacy codes.
    expect(all.filter((item) => !enqueued.has(item) && !legacyCodes.includes(item))).toEqual([]);
  });

  it("pins the audience of every code", () => {
    for (const [audience, codes] of Object.entries(expected)) {
      for (const item of codes) expect([item, notificationAudience(item)]).toEqual([item, audience]);
    }
    expect([...STUDENT_NOTIFICATION_CODES].sort()).toEqual([...expected.student].sort());
    expect([...ICPDP_NOTIFICATION_CODES].sort()).toEqual([...expected.icpdp].sort());
    expect([...CLUB_NOTIFICATION_CODES].sort()).toEqual([...expected.club].sort());
    expect(new Set(all).size).toBe(all.length);
  });

  it("treats an unknown code as the student's own and an old ICPDP CLUB_DISSOLVED copy as ICPDP", () => {
    expect(notificationAudience("SOMETHING_NEW")).toBe("student");
    expect(notificationAudience("CLUB_DISSOLVED", {})).toBe("student");
    expect(notificationAudience("CLUB_DISSOLVED", { clubName: "X", outstandingPeriodicReports: 0 })).toBe("icpdp");
  });
});
