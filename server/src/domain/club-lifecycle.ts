import { DomainError } from "./errors.js";

/** Reminder lead time before a timed suspension ends on its own. */
export const SUSPENSION_REMINDER_MS = 3 * 24 * 60 * 60 * 1000;

export interface ClubSuspension {
  reason: string;
  suspendedAt: Date;
  suspendedBy: string;
  /** null: suspended until ICPDP reactivates the club. */
  until: Date | null;
  reminderSentAt?: Date;
}

export interface ClubDissolution {
  decidedAt: Date;
  decidedBy: string;
  reason: string;
  effectiveSemester: string;
  /** Dissolving starts here (the next semester begins)… */
  effectiveFrom: Date;
  /** …and the club is Dissolved here (that semester ends). */
  effectiveTo: Date;
}

export interface ClubLifecycleSummary {
  id: string;
  code: string;
  name: string;
  field: string;
  state: string;
  activeMembers: number;
  suspension?: ClubSuspension;
  dissolution?: ClubDissolution;
}

export interface ClubLifecycleHistoryEntry {
  action: string;
  reason?: string;
  actorName?: string;
  at: Date;
}

export interface ClubLifecycleDetail extends ClubLifecycleSummary {
  openCampaigns: { id: string; title: string; windowEnd: Date }[];
  upcomingEvents: { id: string; title: string; startAt: Date; endAt: Date; registrations: number }[];
  activeTerm?: { name: string; startAt: Date; endAt: Date };
  history: ClubLifecycleHistoryEntry[];
}

/** What a cascade cancelled, so ICPDP sees the consequence of the decision. */
export interface CascadeResult {
  cancelledEvents: number;
  cancelledRegistrations: number;
  cancelledBookings: number;
}

export interface ClubLifecycleRepository {
  list(): Promise<ClubLifecycleSummary[]>;
  detail(clubId: string, now: Date): Promise<ClubLifecycleDetail | null>;
  suspend(clubId: string, input: { reason: string; until: Date | null }, actorId: string, now: Date): Promise<CascadeResult>;
  /** `actorId` null: reactivated by the lifecycle job when the suspension ran out. */
  reactivate(clubId: string, reason: string, actorId: string | null, now: Date): Promise<void>;
  decideDissolution(clubId: string, decision: ClubDissolution, now: Date): Promise<CascadeResult>;
  /** Timed suspensions ending within the reminder window that were not reminded yet. */
  suspensionsDueForReminder(now: Date): Promise<ClubLifecycleSummary[]>;
  markReminded(clubId: string, officerIds: string[], now: Date): Promise<void>;
  expiredSuspensions(now: Date): Promise<ClubLifecycleSummary[]>;
  startDissolving(now: Date): Promise<string[]>;
  completeDissolutions(now: Date): Promise<string[]>;
  officerIds(): Promise<string[]>;
}

export function validateLifecycleReason(reason: string): string {
  const normalized = typeof reason === "string" ? reason.trim() : "";
  if (!normalized || normalized.length > 2_000) {
    throw new DomainError("a reason is required", "validation", { field: "reason" });
  }
  return normalized;
}

/** The semester after the one running at `now` (or the first one that has not started yet). */
export function nextSemester<T extends { code: string; startAt: Date; endAt: Date }>(
  calendar: readonly T[], now: Date): T | null {
  return [...calendar].sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
    .find((semester) => semester.startAt > now) ?? null;
}
