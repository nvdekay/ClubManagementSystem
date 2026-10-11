import type { ClubPermission } from "./access.js";
import type { RequestedBudgetLine } from "./event-proposal-review.js";
import type { EventRegistrationFormField } from "./event-registration.js";
import type { FeedbackSummary } from "./event-feedback.js";

export type ClubEventState = "Draft" | "Pending Approval" | "Under Review" | "Revision Requested" |
  "Approved" | "Rejected" | "Expired" | "Upcoming" | "Ongoing" | "Completed" | "Report Submitted" | "Cancelled" | "Closed";
export interface ClubEventInput {
  title: string; objective: string; plan: string; startAt: Date; endAt: Date;
  venueText?: string; propertyId?: string; audienceScope: "PUBLIC" | "MEMBERS_ONLY";
  capacity: number; riskCategory: "LOW" | "MEDIUM" | "HIGH"; riskNote?: string; facilityNeeds?: string;
  occurrences?: { startAt: Date; endAt: Date }[]; budgetLines: RequestedBudgetLine[];
  bookingIds: string[]; registrationForm?: EventRegistrationFormField[];
}
export interface ClubEvent extends ClubEventInput {
  id: string; clubId: string; clubName: string; state: ClubEventState; semesterCode: string;
  version: number; currentRevisionNo: number; confirmedRegistrationCount: number;
  approvalConditions: string[]; attendanceFinalized: boolean; conflictResult?: string; conflictDetail?: unknown;
  publishedAt?: Date; registrationOpenAt?: Date; registrationCloseAt?: Date;
  checkInCode?: string; checkInOpenAt?: Date; checkInCloseAt?: Date;
  allowWalkIn: boolean; waitlistEnabled: boolean; revisionDeadlineAt?: Date;
}
export interface ClubEventDetail {
  event: ClubEvent;
  versions: { revisionNo: number; payload: unknown; budgetLines: RequestedBudgetLine[]; submittedAt: Date }[];
  decisions: { outcome: string; reason?: string; comments?: unknown; at: Date }[];
  bookings: { id: string; state: string; propertyId: string; propertyName: string; startAt: Date; endAt: Date }[];
  budget?: { state: string; approvedTotal: number; disbursedTotal: number };
}
export interface EventParticipant {
  studentId: string; name: string; email: string; registrationId?: string; state?: string;
  waitlistPosition?: number; attendanceId?: string; checkedInAt?: Date; method?: string;
  abnormalFlags: string[]; correctionReason?: string; finalized: boolean;
}
export type ClubFeedbackSummary = FeedbackSummary & { eventId: string; title: string; comments?: string[] };
export interface EventPublishInput {
  registrationOpenAt?: Date; registrationCloseAt?: Date;
  checkInOpenAt: Date; checkInCloseAt: Date; allowWalkIn: boolean; waitlistEnabled: boolean;
}
export type ClubEventAction =
  | { kind: "save"; input: ClubEventInput; expectedVersion: number }
  | { kind: "submit"; expectedVersion: number }
  | { kind: "publish"; input: EventPublishInput; expectedVersion: number }
  | { kind: "cancel"; reason: string; expectedVersion: number }
  | { kind: "reschedule"; startAt: Date; endAt: Date; venueText?: string; propertyId?: string; reason: string; expectedVersion: number }
  | { kind: "capacity"; capacity: number }
  | { kind: "promote"; registrationId: string }
  | { kind: "check-in"; studentId: string; reason?: string }
  | { kind: "correct"; studentId: string; reason: string; checkedInAt?: Date; absent: boolean }
  | { kind: "finalize" }
  | { kind: "unlock"; reason: string };
export interface ClubEventRepository {
  options(clubId: string): Promise<{ properties: { id: string; name: string }[]; bookings: { id: string; propertyId: string; propertyType?: string; title: string; startAt: Date; endAt: Date }[] }>;
  list(clubId: string): Promise<ClubEvent[]>;
  find(clubId: string, eventId: string): Promise<ClubEventDetail | null>;
  create(clubId: string, input: ClubEventInput, actorId: string, now: Date): Promise<ClubEventDetail>;
  act(clubId: string, eventId: string, action: ClubEventAction, actorId: string, now: Date): Promise<ClubEventDetail>;
  participants(clubId: string, eventId: string): Promise<EventParticipant[]>;
  feedback(clubId: string, eventIds: string[], now: Date): Promise<ClubFeedbackSummary[]>;
}
export function eventActionPermission(action: ClubEventAction): ClubPermission {
  return ["capacity", "promote", "check-in", "correct", "finalize", "unlock"].includes(action.kind)
    ? "club.attendance.manage" : "club.event.manage";
}
