import { DomainError } from "./errors.js";
import type { ReportDeadline } from "./policy.js";
import { VIOLATION_SEVERITIES, type ViolationSeverity } from "./violation.js";

/** Policy `reportDeadlines[].reportType` that sets the post-event report deadline (BR20). */
export const POST_EVENT_REPORT_TYPE = "POST_EVENT";
/** Used while the policy document has no POST_EVENT entry. */
export const DEFAULT_POST_EVENT_DUE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PostEventOutcome = "Accept" | "Return" | "AcceptWithFinding";

export interface ReportEvidence {
  note?: string;
  url?: string;
}

/** Frozen by the club at submission (UC33 FR-04); the shape is the contract in the SPEC. */
export interface PreloadedFigures {
  attendance?: { registered?: number; checkedIn?: number };
  budget?: { approvedTotal?: number; disbursedTotal?: number; expenseTotal?: number };
  feedback?: { count?: number; average?: number };
  capturedAt?: Date;
}

export interface PostEventReportSummary {
  id: string;
  eventId: string;
  eventTitle: string;
  clubId: string;
  clubName: string;
  eventEndAt: Date;
  state: string;
  versionNo: number;
  lateFlag: boolean;
  submittedAt?: Date;
  dueAt: Date;
}

/** A completed event whose report deadline passed with nothing submitted (UC34 A1). */
export interface MissingReport {
  eventId: string;
  eventTitle: string;
  clubId: string;
  clubName: string;
  eventEndAt: Date;
  dueAt: Date;
  /** Set once ICPDP has recorded it — the case it opened. */
  violationId?: string;
}

export interface PostEventQueue {
  submitted: PostEventReportSummary[];
  missing: MissingReport[];
}

/** What the system itself knows about the event now, set next to the frozen figures (FR-UC34-01). */
export interface LiveFigures {
  registered: number;
  checkedIn: number;
  attendanceFinalized: boolean;
  budget?: { state: string; approvedTotal: number; disbursedTotal: number };
  feedback: { count: number; average?: number };
}

export interface PostEventReportDetail extends PostEventReportSummary {
  event: { id: string; title: string; objective?: string; startAt: Date; endAt: Date; state: string; capacity: number;
    audienceScope: string; approvalConditions: string[]; venue?: string };
  preloadedFigures: PreloadedFigures;
  actualResult: string;
  incidents?: string;
  lessonsLearned?: string;
  evidence: ReportEvidence[];
  live: LiveFigures;
  /** E1: the frozen check-in count does not match the attendance table. */
  attendanceMismatch: boolean;
  decision?: { outcome: PostEventOutcome; reason?: string; decidedBy: string; decidedByName?: string; decidedAt: Date;
    findingViolationId?: string };
  history: { action: string; at: Date; actorName?: string; reason?: string }[];
}

export interface PostEventDecisionInput {
  outcome: PostEventOutcome;
  reason?: string;
  finding?: { severity: ViolationSeverity; title: string; description?: string };
}

export interface NormalizedPostEventDecision {
  outcome: PostEventOutcome;
  reason?: string;
  finding?: { severity: ViolationSeverity; title: string; description?: string };
}

export interface PostEventReportRepository {
  queue(now: Date, dueDays: number): Promise<PostEventQueue>;
  find(id: string, now: Date, dueDays: number): Promise<PostEventReportDetail | null>;
  /** Re-checks the state and the E1 mismatch inside its transaction. */
  decide(id: string, officerId: string, input: NormalizedPostEventDecision, now: Date, dueDays: number): Promise<PostEventReportDetail>;
  /** A1: opens an OVERDUE_REPORT case for an event that never got its report. */
  recordMissing(eventId: string, officerId: string, input: { severity: ViolationSeverity; note?: string }, now: Date,
    dueDays: number): Promise<{ violationId: string }>;
}

export function postEventDueDays(deadlines: readonly ReportDeadline[] | undefined): number {
  const entry = deadlines?.find((item) => item.reportType.trim().toUpperCase() === POST_EVENT_REPORT_TYPE);
  return entry ? entry.dueDaysAfterPeriodEnd : DEFAULT_POST_EVENT_DUE_DAYS;
}

export function reportDueAt(eventEndAt: Date, dueDays: number): Date {
  return new Date(eventEndAt.getTime() + dueDays * DAY_MS);
}

/** E1: compares the club's frozen check-in figure with the finalized attendance table. */
export function attendanceMismatch(preloaded: PreloadedFigures, live: Pick<LiveFigures, "checkedIn">): boolean {
  const frozen = preloaded.attendance?.checkedIn;
  return typeof frozen === "number" && frozen !== live.checkedIn;
}

function trimmed(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

export function normalizedPostEventDecision(input: PostEventDecisionInput): NormalizedPostEventDecision {
  const reason = trimmed(input.reason);
  if (!reason && input.outcome !== "Accept") {
    throw new DomainError("a reason is required to return a report or record a finding", "validation", { field: "reason" });
  }
  if (reason && reason.length > 5_000) throw new DomainError("reason is too long", "validation", { field: "reason" });
  if (input.outcome !== "AcceptWithFinding") {
    if (input.finding) throw new DomainError("a finding only goes with that outcome", "validation", { field: "finding" });
    return { outcome: input.outcome, ...(reason ? { reason } : {}) };
  }
  const title = trimmed(input.finding?.title);
  const description = trimmed(input.finding?.description);
  if (!input.finding || !title || title.length > 200 || !VIOLATION_SEVERITIES.includes(input.finding.severity)) {
    throw new DomainError("a finding needs a severity and a short title", "validation", { field: "finding" });
  }
  if (description && description.length > 5_000) {
    throw new DomainError("finding description is too long", "validation", { field: "finding" });
  }
  return { outcome: input.outcome, reason,
    finding: { severity: input.finding.severity, title, ...(description ? { description } : {}) } };
}
