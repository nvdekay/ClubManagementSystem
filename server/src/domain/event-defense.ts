import { DomainError } from "./errors.js";
import type { EventProposalDetail, NormalizedEventDecision } from "./event-proposal-review.js";

export const EVENT_DEFENSE_STATES = [
  "SCHEDULED",
  "CONFIRMED",
  "RESCHEDULE_REQUESTED",
  "IN_PROGRESS",
  "DEFENDED",
  "CANCELLED",
  "NO_SHOW",
] as const;

export type EventDefenseState = typeof EVENT_DEFENSE_STATES[number];

export const DEFENSE_OUTCOMES = [
  "PASSED",
  "FAILED",
  "REVISION_REQUIRED",
  "RE_DEFENSE",
] as const;

export type DefenseOutcome = typeof DEFENSE_OUTCOMES[number];

export const ACTIVE_DEFENSE_STATES: ReadonlySet<EventDefenseState> = new Set([
  "SCHEDULED",
  "CONFIRMED",
  "RESCHEDULE_REQUESTED",
  "IN_PROGRESS",
]);

export const DEFENSE_SCHEDULE_NOTICE_HOURS = 48;
export const DEFENSE_CONFIRM_NOTICE_HOURS = 24;
export const DEFENSE_REVISION_GAP_HOURS = 12;
export const DEFENSE_EARLY_START_MINUTES = 30;
export const MIN_DEFENSE_DURATION_MINUTES = 15;
export const MAX_DEFENSE_DURATION_MINUTES = 240;

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export interface DefenseOfficerNote {
  officerId: string;
  officerName: string;
  content: string;
  updatedAt: Date;
}

export interface EventDefenseSession {
  id: string;
  eventId: string;
  revisionNo: number;
  title: string;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  propertyId: string;
  propertyName: string;
  note?: string;
  state: EventDefenseState;
  rescheduleReason?: string;
  confirmedAt?: Date;
  confirmedBy?: string;
  startedAt?: Date;
  endedAt?: Date;
  leadOfficerId: string;
  notes: DefenseOfficerNote[];
  outcome?: DefenseOutcome;
  outcomeReason?: string;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailableDefenseRoom {
  id: string;
  code: string;
  name: string;
  location: string;
  capacity?: number;
  available: boolean;
  conflictReason?: string;
}

export interface ScheduleDefenseInput {
  title: string;
  startAt: Date;
  durationMinutes: number;
  propertyId: string;
  note?: string;
}

export interface RespondRescheduleInput {
  accept: boolean;
  startAt?: Date;
  durationMinutes?: number;
  propertyId?: string;
  note?: string;
  reason?: string;
}

export interface ClubEventDefenseView {
  eventId: string;
  eventTitle: string;
  eventState: string;
  activeSession?: EventDefenseSession;
  history: EventDefenseSession[];
}

export interface EventDefenseRepository {
  listAvailableRooms(startAt: Date, endAt: Date, excludeDefenseId?: string): Promise<AvailableDefenseRoom[]>;
  getLiveSession(eventId: string): Promise<EventDefenseSession | null>;
  getClubDefense(clubId: string, eventId: string): Promise<ClubEventDefenseView | null>;
  schedule(eventId: string, officerId: string, input: ScheduleDefenseInput, now: Date): Promise<EventDefenseSession>;
  cancel(eventId: string, officerId: string, reason: string, now: Date): Promise<EventDefenseSession>;
  respondReschedule(eventId: string, officerId: string, input: RespondRescheduleInput, now: Date): Promise<EventDefenseSession>;
  start(eventId: string, officerId: string, now: Date): Promise<EventDefenseSession>;
  saveNote(eventId: string, officerId: string, content: string, now: Date): Promise<EventDefenseSession>;
  end(eventId: string, officerId: string, now: Date): Promise<EventDefenseSession>;
  markNoShow(eventId: string, officerId: string, reason: string, now: Date): Promise<EventDefenseSession>;
  decideAfterDefense(eventId: string, officerId: string, input: NormalizedEventDecision, now: Date): Promise<EventProposalDetail>;
  confirmByClub(clubId: string, eventId: string, actorId: string, now: Date): Promise<EventDefenseSession>;
  requestRescheduleByClub(clubId: string, eventId: string, actorId: string, reason: string, now: Date): Promise<EventDefenseSession>;
  alertOverdueConfirmations(now: Date): Promise<number>;
}

export function hasActiveDefense(session?: Pick<EventDefenseSession, "state"> | null): boolean {
  return Boolean(session && ACTIVE_DEFENSE_STATES.has(session.state));
}

export function isDefenseConfirmationOverdue(session: Pick<EventDefenseSession, "state" | "startAt">, now: Date): boolean {
  return session.state === "SCHEDULED" && session.startAt.getTime() - now.getTime() < DEFENSE_CONFIRM_NOTICE_HOURS * HOUR_MS;
}

export function validateDefenseScheduleSlot(
  startAt: Date,
  durationMinutes: number,
  now: Date,
): { startAt: Date; endAt: Date; durationMinutes: number } {
  if (!(startAt instanceof Date) || Number.isNaN(startAt.getTime())) {
    throw new DomainError("valid defense start time is required", "validation", { field: "startAt" });
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < MIN_DEFENSE_DURATION_MINUTES || durationMinutes > MAX_DEFENSE_DURATION_MINUTES) {
    throw new DomainError(
      `defense duration must be an integer between ${MIN_DEFENSE_DURATION_MINUTES} and ${MAX_DEFENSE_DURATION_MINUTES} minutes`,
      "validation",
      { field: "durationMinutes" },
    );
  }
  if (startAt.getTime() - now.getTime() < DEFENSE_SCHEDULE_NOTICE_HOURS * HOUR_MS) {
    throw new DomainError(
      `defense must be scheduled at least ${DEFENSE_SCHEDULE_NOTICE_HOURS} hours in advance`,
      "validation",
      { field: "startAt" },
    );
  }
  return {
    startAt,
    endAt: new Date(startAt.getTime() + durationMinutes * MINUTE_MS),
    durationMinutes,
  };
}

export function assertRevisionDeadlineBeforeDefense(revisionDeadlineAt: Date, defenseStartAt: Date): void {
  if (defenseStartAt.getTime() - revisionDeadlineAt.getTime() < DEFENSE_REVISION_GAP_HOURS * HOUR_MS) {
    throw new DomainError(
      `revision deadline must be at least ${DEFENSE_REVISION_GAP_HOURS} hours before the scheduled defense`,
      "validation",
      { field: "revisionDeadlineAt" },
    );
  }
}

export function assertCanConfirmDefense(session: Pick<EventDefenseSession, "state" | "startAt">, now: Date): void {
  if (session.state !== "SCHEDULED") {
    throw new DomainError("only a scheduled defense session can be confirmed", "conflict");
  }
  if (session.startAt.getTime() - now.getTime() < DEFENSE_CONFIRM_NOTICE_HOURS * HOUR_MS) {
    throw new DomainError(
      `defense confirmation deadline (${DEFENSE_CONFIRM_NOTICE_HOURS}h before start) has passed`,
      "conflict",
    );
  }
}

export function assertCanRequestReschedule(
  session: Pick<EventDefenseSession, "state" | "startAt">,
  reason: string,
  now: Date,
): string {
  if (session.state !== "SCHEDULED" && session.state !== "CONFIRMED") {
    throw new DomainError("reschedule can only be requested for a scheduled or confirmed defense", "conflict");
  }
  if (session.startAt.getTime() - now.getTime() < DEFENSE_CONFIRM_NOTICE_HOURS * HOUR_MS) {
    throw new DomainError(
      `reschedule requests must be submitted at least ${DEFENSE_CONFIRM_NOTICE_HOURS} hours before start`,
      "conflict",
    );
  }
  const trimmed = reason.trim();
  if (!trimmed || trimmed.length > 2000) {
    throw new DomainError("reschedule reason is required (max 2000 characters)", "validation", { field: "reason" });
  }
  return trimmed;
}

export function assertCanStartDefense(session: Pick<EventDefenseSession, "state" | "startAt">, now: Date): void {
  if (session.state !== "SCHEDULED" && session.state !== "CONFIRMED") {
    throw new DomainError("defense session cannot be started in its current state", "conflict");
  }
  if (now.getTime() < session.startAt.getTime() - DEFENSE_EARLY_START_MINUTES * MINUTE_MS) {
    throw new DomainError(
      `defense can only start at most ${DEFENSE_EARLY_START_MINUTES} minutes before the scheduled start time`,
      "conflict",
    );
  }
}

export function normalizeDefenseOutcome(outcome: string): DefenseOutcome {
  switch (outcome) {
    case "Approve":
      return "PASSED";
    case "Reject":
      return "FAILED";
    case "Request revision":
      return "REVISION_REQUIRED";
    case "Re-defense":
      return "RE_DEFENSE";
    default:
      throw new DomainError("invalid defense outcome", "validation", { field: "outcome" });
  }
}
