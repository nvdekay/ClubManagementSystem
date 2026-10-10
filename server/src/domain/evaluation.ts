import { DomainError } from "./errors.js";
import { EVALUATION_DIMENSIONS, type DimensionCode, type EvaluationScheme, type SchemeThresholds } from "./evaluation-scheme.js";

export type EvaluationState = "Draft" | "Data Ready" | "Under Review" | "Finalized" | "Published";
export type Classification = "EXCELLENT" | "GOOD" | "FAIR" | "NEEDS_IMPROVEMENT";

/** One raw figure behind a score, and where it came from (EVL-02 data lineage). */
export interface MetricValue {
  value: number;
  sourceEntity: string;
  sourceIds: string[];
}

export const METRIC_KEYS = ["registrations", "attendances", "uniqueAttendees", "outsiderAttendees", "activeMembers",
  "completedEvents", "publicCompletedEvents", "cancelledEvents", "acceptedInvitations", "applications", "feedbackCount",
  "feedbackAverage", "reportsDue", "reportsOnTime", "budgets", "budgetsClean", "leaderSeated", "membersLeft",
  "violationPenalty", "openViolations"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];
export type ClubMetrics = Record<MetricKey, MetricValue>;

export interface Lineage {
  metric: MetricKey;
  sourceEntity: string;
  sourceIds: string[];
  sourcePeriod: string;
  value: number;
}

export interface DimensionResult {
  code: DimensionCode;
  /** Final score used in the total: the manual score when there is one, else the computed score. */
  score?: number;
  computedScore?: number;
  insufficientData: boolean;
  isManual: boolean;
  justification?: string;
  evidence: Lineage[];
}

export interface DimensionView extends DimensionResult {
  name: string;
  weight: number;
  allowsManual: boolean;
}

export interface EvaluationRecord {
  id: string;
  clubId: string;
  clubName: string;
  periodCode: string;
  schemeId: string;
  schemeVersion: number;
  state: EvaluationState;
  revisionNo: number;
  totalScore?: number;
  classification?: Classification;
  generatedAt?: Date;
  finalizedAt?: Date;
  publishedAt?: Date;
  dimensions: DimensionView[];
}

export interface EvaluationDetail extends EvaluationRecord {
  /** Every revision of this club and period, newest first (BR30: published ones stay readable). */
  revisions: { id: string; revisionNo: number; state: EvaluationState; totalScore?: number; publishedAt?: Date }[];
  /** Published results of the same club in earlier periods (FR-UC43-07 trend). */
  trend: { periodCode: string; totalScore?: number; classification?: Classification }[];
  thresholds: SchemeThresholds;
}

export interface EvaluationRow {
  evaluationId?: string;
  clubId: string;
  clubName: string;
  clubState: string;
  state?: EvaluationState;
  revisionNo?: number;
  totalScore?: number;
  classification?: Classification;
  insufficientCount: number;
  manualCount: number;
}

export interface EvaluationOverview {
  periods: { code: string; startAt: Date; endAt: Date; hasActiveScheme: boolean }[];
  periodCode?: string;
  scheme?: { id: string; version: number };
  rows: EvaluationRow[];
  /** Every club in scope has a latest revision and all of them are Finalized (BR60: one scorecard for all). */
  canPublish: boolean;
}

export interface PeriodWindow {
  code: string;
  startAt: Date;
  endAt: Date;
}

export type DraftTarget =
  | { kind: "new" }
  | { kind: "replace"; evaluationId: string }
  | { kind: "revision"; fromEvaluationId: string };

export interface EvaluationRepository {
  /** Clubs evaluated in a period: those Active, Suspended or Dissolving. */
  clubsInScope(): Promise<{ id: string; name: string; state: string }[]>;
  /** Latest revision per club for the period. */
  latest(periodCode: string): Promise<EvaluationRecord[]>;
  find(id: string): Promise<EvaluationDetail | null>;
  collectMetrics(clubId: string, period: PeriodWindow, now: Date): Promise<ClubMetrics>;
  writeDraft(input: { clubId: string; periodCode: string; scheme: EvaluationScheme; results: DimensionResult[];
    target: DraftTarget }, officerId: string, now: Date): Promise<string>;
  setManual(id: string, code: DimensionCode, manual: { score: number; justification: string } | null,
    officerId: string, now: Date): Promise<void>;
  finalize(id: string, total: { totalScore?: number; classification?: Classification }, officerId: string, now: Date): Promise<void>;
  reopen(id: string, officerId: string, now: Date): Promise<void>;
  /** Publishes every Finalized latest revision of the period and notifies each club board. */
  publish(periodCode: string, officerId: string, now: Date): Promise<number>;
}

const SEVERITY_PENALTY = { MINOR: 10, MODERATE: 25, SERIOUS: 50 } as const;
export const OPEN_CASE_PENALTY = 5;

export function severityPenalty(severity: string): number {
  return SEVERITY_PENALTY[severity as keyof typeof SEVERITY_PENALTY] ?? 0;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function ratio(part: number, whole: number): number {
  return whole > 0 ? Math.min(1, part / whole) : 0;
}

/** The system-defined rule of each dimension (BR60): which figures it reads and how they become 0–100. */
const RULES: Record<DimensionCode, { metrics: MetricKey[]; score: (m: ClubMetrics, minRespondents: number) => number | undefined }> = {
  D1: { metrics: ["registrations", "attendances", "uniqueAttendees", "activeMembers", "completedEvents"],
    score: (m) => m.registrations.value > 0
      ? 50 * ratio(m.attendances.value, m.registrations.value) + 50 * ratio(m.uniqueAttendees.value, Math.max(m.activeMembers.value, 1))
      : undefined },
  D2: { metrics: ["outsiderAttendees", "attendances", "publicCompletedEvents", "acceptedInvitations", "applications"],
    score: (m) => m.publicCompletedEvents.value + m.acceptedInvitations.value + m.applications.value + m.attendances.value > 0
      ? 50 * ratio(m.outsiderAttendees.value, m.attendances.value)
        + Math.min(30, 10 * (m.publicCompletedEvents.value + m.acceptedInvitations.value)) + Math.min(20, m.applications.value)
      : undefined },
  D3: { metrics: ["feedbackCount", "feedbackAverage"],
    score: (m, minRespondents) => m.feedbackCount.value > 0 && m.feedbackCount.value >= minRespondents
      ? (m.feedbackAverage.value - 1) / 4 * 100 : undefined },
  D4: { metrics: ["completedEvents", "cancelledEvents"],
    score: (m) => m.completedEvents.value + m.cancelledEvents.value > 0
      ? 100 * ratio(m.completedEvents.value, m.completedEvents.value + m.cancelledEvents.value) : undefined },
  D5: { metrics: ["reportsDue", "reportsOnTime"],
    score: (m) => m.reportsDue.value > 0 ? 100 * ratio(m.reportsOnTime.value, m.reportsDue.value) : undefined },
  D6: { metrics: ["budgets", "budgetsClean"],
    score: (m) => m.budgets.value > 0 ? 100 * ratio(m.budgetsClean.value, m.budgets.value) : undefined },
  D7: { metrics: ["leaderSeated", "activeMembers", "membersLeft"],
    score: (m) => 50 * (m.leaderSeated.value > 0 ? 1 : 0)
      + 50 * ratio(m.activeMembers.value, m.activeMembers.value + m.membersLeft.value) },
  D8: { metrics: ["violationPenalty", "openViolations"],
    score: (m) => Math.max(0, 100 - m.violationPenalty.value - OPEN_CASE_PENALTY * m.openViolations.value) },
};

/** UC42: scores every dimension of the scheme; a dimension without data is marked, never scored 0 (E1). */
export function scoreDimensions(metrics: ClubMetrics, scheme: Pick<EvaluationScheme, "dimensions">, periodCode: string,
  minRespondents: number): DimensionResult[] {
  return scheme.dimensions.map(({ code }) => {
    const rule = RULES[code];
    const computed = rule.score(metrics, minRespondents);
    const evidence = rule.metrics.map((metric) => ({ metric, sourceEntity: metrics[metric].sourceEntity,
      sourceIds: metrics[metric].sourceIds.slice(0, 50), sourcePeriod: periodCode, value: round(metrics[metric].value) }));
    return { code, ...(computed !== undefined ? { score: round(computed), computedScore: round(computed) } : {}),
      insufficientData: computed === undefined, isManual: false, evidence };
  });
}

export function classify(total: number, thresholds: SchemeThresholds): Classification {
  return total >= thresholds.excellent ? "EXCELLENT" : total >= thresholds.good ? "GOOD"
    : total >= thresholds.fair ? "FAIR" : "NEEDS_IMPROVEMENT";
}

/** Weighted total over the dimensions that have a score; weights are re-spread over them (decision 14). */
export function totalOf(dimensions: Pick<DimensionView, "score" | "weight">[], thresholds: SchemeThresholds):
  { totalScore?: number; classification?: Classification } {
  const scored = dimensions.filter((item) => item.score !== undefined && item.weight > 0);
  const weight = scored.reduce((sum, item) => sum + item.weight, 0);
  if (!weight) return {};
  const totalScore = round(scored.reduce((sum, item) => sum + item.weight * item.score!, 0) / weight);
  return { totalScore, classification: classify(totalScore, thresholds) };
}

/** UC43 FR-02: only a dimension the scheme marks as manual can be scored by hand, with a justification. */
export function checkManualScore(dimension: Pick<DimensionView, "allowsManual"> | undefined,
  manual: { score: number; justification: string } | null): { score: number; justification: string } | null {
  if (!dimension) throw new DomainError("this dimension is not part of the evaluation", "validation", { field: "dimensionCode" });
  if (!dimension.allowsManual) throw new DomainError("the scheme does not allow scoring this dimension by hand", "conflict");
  if (!manual) return null;
  if (!Number.isFinite(manual.score) || manual.score < 0 || manual.score > 100) {
    throw new DomainError("a manual score is between 0 and 100", "validation", { field: "score" });
  }
  const justification = manual.justification.trim();
  if (!justification) throw new DomainError("a manual score needs a justification", "validation", { field: "justification" });
  if (justification.length > 2_000) throw new DomainError("justification is too long", "validation", { field: "justification" });
  return { score: round(manual.score), justification };
}

export const DIMENSION_NAMES = new Map<string, string>(EVALUATION_DIMENSIONS.map((item) => [item.code, item.name]));
