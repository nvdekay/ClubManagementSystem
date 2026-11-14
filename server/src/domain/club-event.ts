import type { ClubPermission } from "./access.js";
import type { RequestedBudgetLine } from "./event-proposal-review.js";
import type { EventRegistrationFormField } from "./event-registration.js";
import type { FeedbackSummary } from "./event-feedback.js";

/** Lifecycle of a self-funded members-only event that never goes through ICPDP review. */
export const INTERNAL_CLUB_EVENT_STATES = ["DRAFT", "CREATED", "PUBLIC", "ONGOING", "FINISH", "CANCELLED"] as const;
export type InternalClubEventState = typeof INTERNAL_CLUB_EVENT_STATES[number];
export function isInternalClubEventState(state: string): state is InternalClubEventState {
  return (INTERNAL_CLUB_EVENT_STATES as readonly string[]).includes(state);
}
export type ClubEventState = "Draft" | "Pending Approval" | "Under Review" | "Revision Requested" |
  "Approved" | "Rejected" | "Expired" | "Upcoming" | "Ongoing" | "Completed" | "Report Submitted" | "Cancelled" | "Closed" |
  InternalClubEventState;
export interface EventOccurrence {
  startAt: Date;
  endAt: Date;
  propertyId?: string;
  venueText?: string;
}
export interface ClubEventInput {
  title: string; objective: string; plan: string; startAt: Date; endAt: Date;
  venueText?: string; propertyId?: string; audienceScope: "PUBLIC" | "MEMBERS_ONLY";
  capacity: number; riskCategory: "LOW" | "MEDIUM" | "HIGH"; riskNote?: string; facilityNeeds?: string;
  occurrences?: EventOccurrence[]; budgetLines: RequestedBudgetLine[];
  bookingIds: string[]; registrationForm?: EventRegistrationFormField[];
}
export type InternalClubEventInput = Pick<ClubEventInput, "title" | "objective" | "plan" | "startAt" | "endAt" |
  "venueText" | "propertyId" | "capacity" | "riskCategory" | "bookingIds">;
export type InternalClubEventMode = "draft" | "create" | "publish";
/** The proposal document (UC25) a club attaches to an ICPDP proposal; frozen in every submitted revision. */
export interface EventProposalDocument {
  id: string; fileName: string; mimeType: string; bytes: number; assetId: string; uploadedAt: Date; uploadedBy: string;
}
/** What clients see: the storage asset id never leaves the server. */
export type PublicEventProposalDocument = Omit<EventProposalDocument, "assetId">;
export function publicProposalDocument(document: EventProposalDocument): PublicEventProposalDocument {
  const { assetId: _assetId, ...rest } = document;
  return rest;
}
/** Drops the asset id from the `proposalDocument` inside a stored event payload, leaving everything else as is. */
export function publicEventPayload<T>(payload: T): T {
  if (!payload || typeof payload !== "object" || !("proposalDocument" in payload)) return payload;
  const { proposalDocument, ...rest } = payload as Record<string, unknown>;
  return (proposalDocument && typeof proposalDocument === "object"
    ? { ...rest, proposalDocument: publicProposalDocument(proposalDocument as EventProposalDocument) } : rest) as T;
}
export interface EventProposalTemplateInfo { fileName: string; mimeType: string; bytes: number; updatedAt: Date; isSystemDefault: boolean }
/** The active template: the bundled system default (served from its bytes) or the latest ICPDP upload (served from storage). */
export type EventProposalTemplate = EventProposalTemplateInfo &
  ({ isSystemDefault: true; content: Buffer } | { isSystemDefault: false; assetId: string });
export interface EventProposalFileStorage {
  uploadProposalDocument(input: { clubId: string; eventId: string; actorId: string; fileName: string; mimeType: string;
    bytes: Buffer; now: Date }): Promise<EventProposalDocument>;
  uploadTemplateDocument(input: { actorId: string; fileName: string; mimeType: string; bytes: Buffer; now: Date }): Promise<EventProposalDocument>;
  /** Short-lived signed URL. */
  accessUrl(assetId: string, options?: { inline: boolean }): Promise<string>;
}
export interface ClubEvent extends ClubEventInput {
  proposalDocument?: PublicEventProposalDocument;
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
  budget?: { id?: string; state: string; approvedTotal: number; disbursedTotal: number };
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
  notifyMembers?: boolean;
}
export type ClubEventAction =
  | { kind: "save"; input: ClubEventInput; expectedVersion: number }
  | { kind: "submit"; expectedVersion: number }
  | { kind: "attach-document"; document: EventProposalDocument }
  | { kind: "save-internal"; input: InternalClubEventInput; expectedVersion: number }
  | { kind: "create-internal"; expectedVersion: number }
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
  options(clubId: string): Promise<{ properties: { id: string; name: string }[]; bookings: { id: string; propertyId: string; propertyType?: string; eventId?: string; title: string; startAt: Date; endAt: Date }[] }>;
  list(clubId: string): Promise<ClubEvent[]>;
  find(clubId: string, eventId: string): Promise<ClubEventDetail | null>;
  create(clubId: string, input: ClubEventInput, actorId: string, now: Date): Promise<ClubEventDetail>;
  createInternal(clubId: string, input: InternalClubEventInput, mode: InternalClubEventMode,
    publishInput: EventPublishInput | undefined, actorId: string, now: Date): Promise<ClubEventDetail>;
  act(clubId: string, eventId: string, action: ClubEventAction, actorId: string, now: Date): Promise<ClubEventDetail>;
  participants(clubId: string, eventId: string): Promise<EventParticipant[]>;
  feedback(clubId: string, eventIds: string[], now: Date): Promise<ClubFeedbackSummary[]>;
  /** "draft" is the club's working copy, "latest" the highest submitted revision; null when the event does not exist. */
  proposalDocument(eventId: string, revision: number | "draft" | "latest"): Promise<{ clubId: string; document: EventProposalDocument | null } | null>;
  proposalTemplate(): Promise<EventProposalTemplate>;
  saveProposalTemplate(document: EventProposalDocument, actorId: string, now: Date): Promise<EventProposalTemplateInfo>;
}
export function eventActionPermission(action: ClubEventAction): ClubPermission {
  return ["capacity", "promote", "check-in", "correct", "finalize", "unlock"].includes(action.kind)
    ? "club.attendance.manage" : "club.event.manage";
}
