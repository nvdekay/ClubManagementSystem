import { DomainError } from "./errors.js";
export interface ReportInput {
  actualResult: string;
  incidents?: string;
  lessonsLearned?: string;
  evidence: { note: string; url: string }[];
}
export interface ReportSnapshot {
  proposal: unknown;
  attendance: {
    confirmed: number;
    attended: number;
    absent: number;
    finalizedAt?: Date;
  };
  budget: unknown;
  expenses: unknown;
  feedback: unknown;
  policyVersionId: string;
  dueAt: Date;
}
export interface PostEventReport extends ReportInput {
  id: string;
  eventId: string;
  clubId: string;
  eventTitle: string;
  eventState: string;
  state: string;
  versionNo: number;
  revision: number;
  lateFlag: boolean;
  submittedAt?: Date;
  decisionOutcome?: string;
  decisionReason?: string;
  findingViolationId?: string;
  preloadedFigures: ReportSnapshot;
  task?: { id: string; assigneeId?: string };
}
export interface ReportObligation {
  eventId: string;
  eventTitle: string;
  state: string;
  revision: number;
  dueAt: Date;
  overdue: boolean;
  report?: PostEventReport;
}
export interface ReportDetail {
  obligation: ReportObligation;
  versions: PostEventReport[];
  preview: ReportSnapshot;
}
export type ReportAction =
  | { kind: "save"; revision: number; input: ReportInput }
  | { kind: "submit"; revision: number }
  | { kind: "claim"; revision: number }
  | {
      kind: "decision";
      revision: number;
      outcome: "accept" | "return" | "finding";
      reason: string;
      violationId?: string;
    }
  | { kind: "overdue"; revision: number; reason: string };
export interface ReportConfigurationIssue { eventId: string; eventTitle: string; state: string; revision: number; configurationError: "REPORT_DEADLINE_NOT_CONFIGURED" }
export interface PostEventReportRepository {
  list(clubId: string | undefined, now: Date): Promise<(ReportObligation | ReportConfigurationIssue)[]>;
  find(
    eventId: string,
    clubId: string | undefined,
    now: Date,
  ): Promise<ReportDetail | null>;
  act(
    eventId: string,
    clubId: string | undefined,
    actorId: string,
    action: ReportAction,
    now: Date,
  ): Promise<ReportDetail>;
}
export function normalizeReport(input: ReportInput): ReportInput {
  if (
    !input.actualResult.trim() ||
    input.actualResult.length > 10000 ||
    (input.incidents?.length ?? 0) > 10000 ||
    (input.lessonsLearned?.length ?? 0) > 10000 ||
    input.evidence.length > 20
  )
    throw new DomainError("invalid report fields", "validation");
  for (const item of input.evidence) {
    let url: URL;
    try {
      url = new URL(item.url);
    } catch {
      throw new DomainError("invalid report evidence URL", "validation");
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      item.url.length > 2000 ||
      item.note.length > 1000
    ) {
      throw new DomainError(
        "report evidence requires an HTTPS link",
        "validation",
      );
    }
  }
  return {
    ...input,
    actualResult: input.actualResult.trim(),
    incidents: input.incidents?.trim(),
    lessonsLearned: input.lessonsLearned?.trim(),
  };
}
export function assertReportSubmission(
  state: string,
  finalized: boolean,
  internalWithoutBudget: boolean,
): void {
  if (internalWithoutBudget || state !== "Completed" || !finalized)
    throw new DomainError(
      "report requires completed event and finalized attendance",
      "conflict",
    );
}
