import { DomainError } from "./errors.js";
import type { AcademicSemester } from "./policy.js";

/** BR59 default: clubs answer three days before the event starts (constant of the policy document). */
export const INVITATION_DEADLINE_DAYS_BEFORE = 3;
export const MAX_INVITED_CLUBS = 200;
/** The organiser name stored on school-wide events, which have no club (DBML `events.clubName`). */
export const SCHOOL_ORGANIZER_NAME = "ICPDP";
const DAY_MS = 24 * 60 * 60 * 1000;

export type InvitationStatus = "Pending" | "Accepted" | "Declined" | "Expired" | "Withdrawn";

export interface EventInvitation {
  id: string;
  clubId: string;
  clubName: string;
  status: InvitationStatus;
  deadline: Date;
  invitedAt: Date;
  respondedAt?: Date;
  responseNote?: string;
  responseDetails?: unknown;
}

export interface InvitationCounts {
  invited: number;
  pending: number;
  accepted: number;
  declined: number;
  expired: number;
  withdrawn: number;
}

export interface ScheduleConflict {
  kind: "event" | "booking";
  title: string;
  startAt: Date;
  endAt: Date;
}

export interface SchoolEventSummary {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  venueText?: string;
  property?: { id: string; code: string; name: string };
  capacity: number;
  state: string;
  semesterCode: string;
  publishedAt?: Date;
  confirmedRegistrationCount: number;
  counts: InvitationCounts;
}

export interface SchoolEventDetail extends SchoolEventSummary {
  objective?: string;
  coordination?: string;
  conflictResult: "No Conflict" | "Warning";
  conflicts: ScheduleConflict[];
  checkInCode?: string;
  registrationCloseAt?: Date;
  invitations: EventInvitation[];
}

export interface SchoolEventInput {
  title: string;
  objective?: string;
  coordination?: string;
  startAt: Date;
  endAt: Date;
  venueText?: string;
  propertyId?: string;
  capacity: number;
  invitationDeadline?: Date;
  clubIds?: string[];
  allActiveClubs?: boolean;
}

export interface NormalizedSchoolEvent extends Omit<SchoolEventInput, "invitationDeadline" | "clubIds" | "allActiveClubs"> {
  semesterCode: string;
  invitation: NormalizedInvitation;
}

export interface NormalizedInvitation {
  clubIds: string[];
  allActiveClubs: boolean;
  deadline: Date;
}

export interface InvitationOutcome {
  invited: string[];
  /** Clubs skipped because they are not Active (BR59) or were already invited. */
  skipped: { clubId: string; reason: "notActive" | "alreadyInvited" }[];
}

export interface SchoolEventRepository {
  list(): Promise<SchoolEventSummary[]>;
  find(id: string): Promise<SchoolEventDetail | null>;
  /** BR15: approved events and bookings on the same property that overlap the time window. */
  conflicts(propertyId: string | undefined, startAt: Date, endAt: Date, excludeEventId?: string): Promise<ScheduleConflict[]>;
  create(input: NormalizedSchoolEvent, officerId: string, now: Date): Promise<{ detail: SchoolEventDetail; outcome: InvitationOutcome }>;
  invite(id: string, invitation: NormalizedInvitation, officerId: string, now: Date): Promise<{ detail: SchoolEventDetail; outcome: InvitationOutcome }>;
  withdraw(id: string, invitationId: string, officerId: string, now: Date): Promise<SchoolEventDetail>;
  publish(id: string, officerId: string, now: Date): Promise<SchoolEventDetail>;
  /** BR59: Pending invitations past their deadline become Expired. */
  expireInvitations(now: Date): Promise<number>;
}

function invalid(message: string, field: string): never {
  throw new DomainError(message, "validation", { field });
}

function text(value: string | undefined, max: number, field: string): string | undefined {
  const trimmed = value?.trim();
  if (trimmed && trimmed.length > max) invalid(`${field} is too long`, field);
  return trimmed || undefined;
}

/** BR44: the semester that holds the whole event. */
export function semesterOf(calendar: readonly AcademicSemester[], startAt: Date, endAt: Date): string {
  const found = calendar.find((semester) => semester.startAt <= startAt && endAt <= semester.endAt);
  if (!found) invalid("the event must start and end within one semester of the academic calendar", "startAt");
  return found.code;
}

export function defaultInvitationDeadline(startAt: Date, now: Date): Date {
  const deadline = new Date(startAt.getTime() - INVITATION_DEADLINE_DAYS_BEFORE * DAY_MS);
  return deadline > now ? deadline : startAt;
}

export function normalizedInvitation(input: { clubIds?: string[]; allActiveClubs?: boolean; deadline?: Date },
  startAt: Date, now: Date, requireClubs: boolean): NormalizedInvitation {
  const clubIds = [...new Set(input.clubIds ?? [])];
  if (clubIds.length > MAX_INVITED_CLUBS) invalid("too many clubs", "clubIds");
  if (requireClubs && !clubIds.length && !input.allActiveClubs) invalid("choose at least one club to invite", "clubIds");
  const deadline = input.deadline ?? defaultInvitationDeadline(startAt, now);
  if (Number.isNaN(deadline.getTime()) || deadline <= now || deadline > startAt) {
    invalid("the reply deadline must be in the future and no later than the event start", "invitationDeadline");
  }
  return { clubIds, allActiveClubs: input.allActiveClubs === true, deadline };
}

export function normalizedSchoolEvent(input: SchoolEventInput, calendar: readonly AcademicSemester[], now: Date): NormalizedSchoolEvent {
  const title = text(input.title, 200, "title");
  if (!title) invalid("a title is required", "title");
  if (Number.isNaN(input.startAt.getTime()) || input.startAt <= now) invalid("the event must start in the future", "startAt");
  if (Number.isNaN(input.endAt.getTime()) || input.endAt <= input.startAt) invalid("the event must end after it starts", "endAt");
  const venueText = text(input.venueText, 200, "venueText");
  if (!venueText && !input.propertyId) invalid("choose a room or type a venue", "venueText");
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 100_000) invalid("invalid capacity", "capacity");
  return {
    title, objective: text(input.objective, 5_000, "objective"), coordination: text(input.coordination, 5_000, "coordination"),
    startAt: input.startAt, endAt: input.endAt, venueText, ...(input.propertyId ? { propertyId: input.propertyId } : {}),
    capacity: input.capacity, semesterCode: semesterOf(calendar, input.startAt, input.endAt),
    invitation: normalizedInvitation({ clubIds: input.clubIds, allActiveClubs: input.allActiveClubs,
      deadline: input.invitationDeadline }, input.startAt, now, false),
  };
}

/** A short code students type at the venue (UC31); ambiguous characters are left out. */
export function checkInCode(random: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(random() * alphabet.length)]).join("");
}
