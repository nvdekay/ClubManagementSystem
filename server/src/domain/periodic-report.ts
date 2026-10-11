import { DomainError } from "./errors.js";
import type { AcademicSemester, ReportDeadline } from "./policy.js";
import type { ViolationSeverity } from "./violation.js";

/** Policy `reportDeadlines[].reportType` that sets the periodic report deadline (BR20). */
export const PERIODIC_REPORT_TYPE = "PERIODIC";
export const DEFAULT_PERIODIC_DUE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export const RETURN_SECTIONS = ["narrative", "nextPlan", "figures", "evidence", "other"] as const;
export type ReturnSection = (typeof RETURN_SECTIONS)[number];
export type PeriodicOutcome = "Accept" | "Return";

/** The system's own numbers for a club and a semester (FR-UC39-01). The club freezes the same shape. */
export interface PeriodFigures {
  events?: { completed?: number; cancelled?: number };
  members?: { active?: number };
  attendance?: { total?: number };
  finance?: { budgets?: number; approvedTotal?: number; disbursedTotal?: number };
  capturedAt?: Date;
}

export interface PeriodicReportRow {
  clubId: string;
  clubName: string;
  clubState: string;
  dueAt: Date;
  reportId?: string;
  state?: string;
  versionNo?: number;
  lateFlag?: boolean;
  submittedAt?: Date;
  /** Due date passed and nothing was submitted. */
  overdue: boolean;
  /** The OVERDUE_REPORT case ICPDP already opened for this club and period (E1). */
  violationId?: string;
}

export interface PeriodicOverview {
  periods: { code: string; startAt: Date; endAt: Date }[];
  periodCode?: string;
  dueAt?: Date;
  rows: PeriodicReportRow[];
}

export interface PeriodicReportDetail {
  id: string;
  clubId: string;
  clubName: string;
  periodCode: string;
  periodType: string;
  state: string;
  versionNo: number;
  lateFlag: boolean;
  dueAt: Date;
  submittedAt?: Date;
  narrative?: string;
  nextPlan?: string;
  evidence: { note?: string; url?: string }[];
  preloadedFigures: PeriodFigures;
  live: Required<Omit<PeriodFigures, "capturedAt">>;
  decision?: { outcome: PeriodicOutcome; observation?: string; reason?: string; sections: ReturnSection[];
    decidedByName?: string; decidedAt: Date };
  history: { action: string; at: Date; actorName?: string; reason?: string }[];
}

export interface PeriodicDecisionInput {
  outcome: PeriodicOutcome;
  /** Accept only: a note kept for the evaluation period (A1). */
  observation?: string;
  /** Return only: required, with the sections the club must fix. */
  reason?: string;
  sections?: ReturnSection[];
}

export interface PeriodicReportRepository {
  overview(periodCode: string, dueAt: Date, now: Date): Promise<PeriodicReportRow[]>;
  find(id: string): Promise<PeriodicReportDetail | null>;
  decide(id: string, officerId: string, input: PeriodicDecisionInput, now: Date): Promise<PeriodicReportDetail>;
  /** E1: opens an OVERDUE_REPORT case for a club that did not submit on time. */
  recordMissing(clubId: string, periodCode: string, dueAt: Date, officerId: string,
    input: { severity: ViolationSeverity; note?: string }, now: Date): Promise<{ violationId: string }>;
}

export function periodicDueDays(deadlines: readonly ReportDeadline[] | undefined): number {
  const entry = deadlines?.find((item) => item.reportType.trim().toUpperCase() === PERIODIC_REPORT_TYPE);
  return entry ? entry.dueDaysAfterPeriodEnd : DEFAULT_PERIODIC_DUE_DAYS;
}

export function periodicDueAt(period: Pick<AcademicSemester, "endAt">, dueDays: number): Date {
  return new Date(period.endAt.getTime() + dueDays * DAY_MS);
}

function trimmed(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

export function normalizedPeriodicDecision(input: PeriodicDecisionInput): PeriodicDecisionInput {
  const observation = trimmed(input.observation);
  const reason = trimmed(input.reason);
  const sections = [...new Set(input.sections ?? [])];
  if (observation && observation.length > 2_000 || reason && reason.length > 5_000) {
    throw new DomainError("review text is too long", "validation");
  }
  if (sections.some((item) => !RETURN_SECTIONS.includes(item))) {
    throw new DomainError("invalid section", "validation", { field: "sections" });
  }
  if (input.outcome === "Accept") {
    if (reason || sections.length) throw new DomainError("a reason and sections only go with a return", "validation");
    return { outcome: "Accept", ...(observation ? { observation } : {}) };
  }
  if (observation) throw new DomainError("an observation only goes with an acceptance", "validation", { field: "observation" });
  if (!reason) throw new DomainError("a reason is required to return a report", "validation", { field: "reason" });
  if (!sections.length) throw new DomainError("say which parts must be corrected", "validation", { field: "sections" });
  return { outcome: "Return", reason, sections };
}
