import { DomainError } from "./errors.js";
import type { AcademicSemester, ReportDeadline } from "./policy.js";
import type { ViolationSeverity } from "./violation.js";

/** Policy `reportDeadlines[].reportType` that sets the periodic report deadline (BR20). */
export const PERIODIC_REPORT_TYPE = "PERIODIC";
export const DEFAULT_PERIODIC_DUE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export const RETURN_SECTIONS = [
  "members", "events", "achievements", "customFields",
  "narrative", "nextPlan", "figures", "evidence", "other",
] as const;
export type ReturnSection = (typeof RETURN_SECTIONS)[number];
export type PeriodicOutcome = "Accept" | "Return";

export const CUSTOM_FIELD_TYPES = ["text", "number", "evidence"] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export interface PeriodicCustomField {
  id: string;
  label: string;
  description?: string;
  type: CustomFieldType;
  required: boolean;
}

export interface PeriodicCampaign {
  periodCode: string;
  isOpen: boolean;
  dueAt: Date;
  announcement?: string;
  customFields: PeriodicCustomField[];
  updatedAt?: Date;
}

export interface PeriodicCampaignInput {
  periodCode: string;
  isOpen: boolean;
  dueAt: Date;
  announcement?: string;
  customFields?: PeriodicCustomField[];
}

export interface PeriodicMemberEntry {
  userId?: string;
  fullName: string;
  studentCode: string;
  email: string;
  activityScore: number;
  source?: "SYSTEM" | "MANUAL";
}

export interface PeriodicEventEntry {
  eventId?: string;
  title: string;
  description: string;
  heldAt: string;
  participantCount: number;
  evidenceUrl?: string;
  evidenceNote?: string;
  source?: "SYSTEM" | "MANUAL";
}

export interface PeriodicAchievementEntry {
  title: string;
  description: string;
  evidenceUrl?: string;
  evidenceNote?: string;
}

export interface PeriodicCustomAnswer {
  fieldId: string;
  label?: string;
  type?: CustomFieldType;
  textValue?: string;
  numberValue?: number;
  evidenceUrl?: string;
}

export interface PeriodicSystemSnapshot {
  members: PeriodicMemberEntry[];
  events: PeriodicEventEntry[];
}

/** The system's own numbers for a club and a semester (FR-UC39-01). The club freezes the same shape. */
export interface PeriodFigures {
  events?: { completed?: number; cancelled?: number };
  members?: { active?: number };
  attendance?: { total?: number };
  finance?: { budgets?: number; approvedTotal?: number; disbursedTotal?: number };
  capturedAt?: Date;
  systemData?: PeriodicSystemSnapshot;
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
  campaign?: PeriodicCampaign;
  rows: PeriodicReportRow[];
}

export interface PeriodicReportVersion {
  versionNo: number;
  narrative: string;
  nextPlan: string;
  evidence: { note?: string; url?: string }[];
  members?: PeriodicMemberEntry[];
  events?: PeriodicEventEntry[];
  achievements?: PeriodicAchievementEntry[];
  customAnswers?: PeriodicCustomAnswer[];
  preloadedFigures: PeriodFigures;
  submittedAt: Date;
  decision?: {
    outcome: string;
    reason?: string;
    sections?: string[];
    observation?: string;
    resubmitDueAt?: Date;
    decidedAt: Date;
  };
}

export interface PeriodicReportDetail {
  revision?: number;
  versions?: PeriodicReportVersion[];
  id: string;
  clubId: string;
  clubName: string;
  periodCode: string;
  periodType: string;
  state: string;
  versionNo: number;
  lateFlag: boolean;
  dueAt: Date;
  resubmitDueAt?: Date;
  submittedAt?: Date;
  narrative?: string;
  nextPlan?: string;
  evidence: { note?: string; url?: string }[];
  members?: PeriodicMemberEntry[];
  events?: PeriodicEventEntry[];
  achievements?: PeriodicAchievementEntry[];
  customAnswers?: PeriodicCustomAnswer[];
  campaign?: PeriodicCampaign;
  systemData?: PeriodicSystemSnapshot;
  preloadedFigures: PeriodFigures;
  live: Required<Omit<PeriodFigures, "capturedAt" | "systemData">>;
  decision?: {
    outcome: PeriodicOutcome;
    observation?: string;
    reason?: string;
    sections: ReturnSection[];
    resubmitDueAt?: Date;
    decidedByName?: string;
    decidedAt: Date;
  };
  history: { action: string; at: Date; actorName?: string; reason?: string }[];
}

export interface PeriodicDecisionInput {
  outcome: PeriodicOutcome;
  /** Accept only: a note kept for the evaluation period (A1). */
  observation?: string;
  /** Return only: required, with the sections the club must fix. */
  reason?: string;
  sections?: ReturnSection[];
  /** Return only: optional new deadline for the club to resubmit. */
  resubmitDueAt?: Date;
}

export interface PeriodicReportRepository {
  overview(periodCode: string, dueAt: Date, now: Date): Promise<PeriodicReportRow[]>;
  getCampaign?(periodCode: string): Promise<PeriodicCampaign | null>;
  saveCampaign?(officerId: string, input: PeriodicCampaign, now: Date): Promise<PeriodicCampaign>;
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

export function isValidEvidenceLink(url: string): boolean {
  if (!url || url.length > 5_000_000) return false;
  if (/^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/i.test(url)) return true;
  if (url.length > 2_000) return false;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function normalizedPeriodicCampaign(input: PeriodicCampaignInput): PeriodicCampaign {
  const periodCode = input.periodCode.trim();
  if (!periodCode || periodCode.length > 100) {
    throw new DomainError("invalid reporting period", "validation", { field: "periodCode" });
  }
  if (!(input.dueAt instanceof Date) || Number.isNaN(input.dueAt.getTime())) {
    throw new DomainError("invalid deadline", "validation", { field: "dueAt" });
  }
  const announcement = trimmed(input.announcement);
  if (announcement && announcement.length > 5_000) {
    throw new DomainError("announcement is too long", "validation", { field: "announcement" });
  }
  const rawFields = input.customFields ?? [];
  if (rawFields.length > 30) {
    throw new DomainError("too many custom fields", "validation", { field: "customFields" });
  }
  const seenIds = new Set<string>();
  const customFields = rawFields.map((field, index) => {
    const id = field.id.trim() || `field_${index + 1}`;
    const label = field.label.trim();
    const description = trimmed(field.description);
    if (!label || label.length > 200) {
      throw new DomainError("custom field label is required and must be under 200 characters", "validation", { field: "customFields" });
    }
    if (description && description.length > 1_000) {
      throw new DomainError("custom field description is too long", "validation", { field: "customFields" });
    }
    if (!CUSTOM_FIELD_TYPES.includes(field.type)) {
      throw new DomainError("invalid custom field type", "validation", { field: "customFields" });
    }
    if (seenIds.has(id)) {
      throw new DomainError("duplicate custom field identifier", "validation", { field: "customFields" });
    }
    seenIds.add(id);
    return {
      id,
      label,
      ...(description ? { description } : {}),
      type: field.type,
      required: Boolean(field.required),
    };
  });
  return {
    periodCode,
    isOpen: Boolean(input.isOpen),
    dueAt: input.dueAt,
    ...(announcement ? { announcement } : {}),
    customFields,
  };
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
    if (reason || sections.length || input.resubmitDueAt) {
      throw new DomainError("a reason and sections only go with a return", "validation");
    }
    return { outcome: "Accept", ...(observation ? { observation } : {}) };
  }
  if (observation) throw new DomainError("an observation only goes with an acceptance", "validation", { field: "observation" });
  if (!reason) throw new DomainError("a reason is required to return a report", "validation", { field: "reason" });
  if (!sections.length) throw new DomainError("say which parts must be corrected", "validation", { field: "sections" });
  if (input.resubmitDueAt && Number.isNaN(input.resubmitDueAt.getTime())) {
    throw new DomainError("invalid resubmission deadline", "validation", { field: "resubmitDueAt" });
  }
  return {
    outcome: "Return",
    reason,
    sections,
    ...(input.resubmitDueAt ? { resubmitDueAt: input.resubmitDueAt } : {}),
  };
}
