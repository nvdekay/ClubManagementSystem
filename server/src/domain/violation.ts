import { DomainError } from "./errors.js";

/** Where a case came from (UC40 FR-01). `OTHER` covers what an officer notices directly. */
export const VIOLATION_ORIGINS = ["COMPLAINT", "REPORT_FINDING", "OVERDUE_REPORT", "FINANCIAL_EXCEPTION",
  "UNAUTHORIZED_EVENT", "LATE_BOOKING_CANCELLATION", "OTHER"] as const;
export type ViolationOrigin = (typeof VIOLATION_ORIGINS)[number];

/** BR27: the severity scale is a constant of the policy document (BR42). */
export const VIOLATION_SEVERITIES = ["MINOR", "MODERATE", "SERIOUS"] as const;
export type ViolationSeverity = (typeof VIOLATION_SEVERITIES)[number];

export type ViolationState = "Open" | "Under Investigation" | "Awaiting Club Response" | "Decision Issued"
  | "Corrective Action" | "Resolved" | "Closed";
export const LIFECYCLE_LINKS = ["SUSPEND", "DISSOLVE"] as const;
export type LifecycleLink = (typeof LIFECYCLE_LINKS)[number];

/** Default time a club gets to explain itself (constant of the policy document). */
export const RESPONSE_DUE_DAYS = 7;
export const MAX_CORRECTIVE_ACTIONS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ViolationEvidence {
  note: string;
  url?: string;
  addedBy: string;
  addedAt: Date;
}

export interface ClubResponse {
  requestMessage: string;
  requestedBy: string;
  requestedAt: Date;
  dueAt: Date;
  /** `CLUB` is written by the club side (contract in the SPEC); the others by ICPDP. */
  source?: "CLUB" | "RECORDED_BY_ICPDP" | "NO_RESPONSE";
  text?: string;
  respondedBy?: string;
  respondedAt?: Date;
  recordedBy?: string;
}

export interface CorrectiveAction {
  id: string;
  description: string;
  dueAt: Date;
  state: "Pending" | "Verified" | "Failed";
  linkedLifecycleAction?: LifecycleLink;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export interface ViolationCase {
  id: string;
  clubId: string;
  clubName: string;
  originType: ViolationOrigin;
  originRefId?: string;
  severity: ViolationSeverity;
  title: string;
  description?: string;
  evidence: ViolationEvidence[];
  state: ViolationState;
  clubResponse?: ClubResponse;
  decisionReason?: string;
  decisionEvidence: ViolationEvidence[];
  openedBy: string;
  openedAt: Date;
  decidedBy?: string;
  decidedAt?: Date;
  responseDueAt?: Date;
  resolvedAt?: Date;
  actions: CorrectiveAction[];
}

export interface ViolationSummary {
  id: string;
  clubId: string;
  clubName: string;
  originType: ViolationOrigin;
  severity: ViolationSeverity;
  title: string;
  state: ViolationState;
  openedAt: Date;
  responseDueAt?: Date;
  /** The club has not answered and the response deadline has passed. */
  responseOverdue: boolean;
  pendingActions: number;
}

export interface ViolationHistoryEntry {
  action: string;
  at: Date;
  actorName?: string;
  reason?: string;
}

export interface ViolationDetail extends ViolationCase {
  clubState: string;
  source?: { kind: "event" | "budget"; id: string; label: string };
  names: Record<string, string>;
  history: ViolationHistoryEntry[];
}

export interface ViolationSources {
  events: { id: string; title: string; startAt: Date; state: string }[];
  budgets: { id: string; eventTitle: string; state: string }[];
}

export interface EvidenceInput {
  note: string;
  url?: string;
}

export interface OpenViolationInput {
  clubId: string;
  originType: ViolationOrigin;
  originRefId?: string;
  severity: ViolationSeverity;
  title: string;
  description?: string;
  evidence?: EvidenceInput[];
}

export type ViolationStep =
  | { type: "investigate" }
  | { type: "addEvidence"; evidence: EvidenceInput }
  | { type: "requestResponse"; message: string; dueAt?: Date }
  | { type: "recordResponse"; text?: string; noResponse?: boolean }
  | { type: "decide"; finding: "VIOLATION" | "NO_VIOLATION"; reason: string; evidence?: EvidenceInput[] }
  | { type: "addActions"; actions: { description: string; dueAt: Date; linkedLifecycleAction?: LifecycleLink }[] }
  | { type: "verifyAction"; actionId: string; outcome: "Verified" | "Failed"; note?: string }
  | { type: "resolve"; note?: string };

export interface StepResult {
  next: ViolationCase;
  /** Audit action code. */
  action: string;
  reason?: string;
  /** Whether the club board is told about this step. */
  notifyClub: boolean;
}

export interface ViolationRepository {
  list(): Promise<ViolationSummary[]>;
  find(id: string, now: Date): Promise<ViolationDetail | null>;
  sources(clubId: string): Promise<ViolationSources | null>;
  open(input: OpenViolationInput, officerId: string, now: Date): Promise<ViolationDetail>;
  /** Applies `applyViolationStep` to the stored case inside a transaction and persists the result. */
  apply(id: string, officerId: string, step: ViolationStep, now: Date): Promise<ViolationDetail>;
}

const finalStates = new Set<ViolationState>(["Resolved", "Closed"]);

function invalid(message: string, field?: string): never {
  throw new DomainError(message, "validation", field ? { field } : undefined);
}

function conflict(message: string): never {
  throw new DomainError(message, "conflict");
}

function text(value: string | undefined, max: number, field: string): string | undefined {
  const trimmed = value?.trim();
  if (trimmed && trimmed.length > max) invalid(`${field} is too long`, field);
  return trimmed || undefined;
}

export function normalizedEvidence(items: readonly EvidenceInput[] | undefined, actorId: string, now: Date): ViolationEvidence[] {
  if ((items?.length ?? 0) > 20) invalid("too many evidence items", "evidence");
  return (items ?? []).flatMap((item) => {
    const note = text(item.note, 1_000, "evidence");
    const url = text(item.url, 500, "evidence");
    if (url && !/^https?:\/\//i.test(url)) invalid("evidence link must start with http:// or https://", "evidence");
    if (!note && !url) return [];
    return [{ note: note ?? url!, ...(url ? { url } : {}), addedBy: actorId, addedAt: now }];
  });
}

export function normalizedOpenInput(input: OpenViolationInput): OpenViolationInput {
  if (!VIOLATION_ORIGINS.includes(input.originType)) invalid("invalid violation origin", "originType");
  if (!VIOLATION_SEVERITIES.includes(input.severity)) invalid("invalid violation severity", "severity");
  const title = text(input.title, 200, "title");
  if (!title) invalid("a title is required", "title");
  return { ...input, title, description: text(input.description, 5_000, "description") };
}

/** UC40 state machine: what a step does to a case, or why it is not allowed now. */
export function applyViolationStep(current: ViolationCase, step: ViolationStep, actorId: string, now: Date): StepResult {
  if (finalStates.has(current.state)) conflict("this case is already closed");
  const next: ViolationCase = { ...current, evidence: [...current.evidence], actions: current.actions.map((item) => ({ ...item })) };
  switch (step.type) {
    case "investigate": {
      if (current.state !== "Open") conflict("only an open case can move to investigation");
      return { next: { ...next, state: "Under Investigation" }, action: "VIOLATION_INVESTIGATING", notifyClub: false };
    }
    case "addEvidence": {
      const [item] = normalizedEvidence([step.evidence], actorId, now);
      if (!item) invalid("evidence needs a note or a link", "evidence");
      next.evidence.push(item);
      return { next, action: "VIOLATION_EVIDENCE_ADDED", notifyClub: false };
    }
    case "requestResponse": {
      if (current.state !== "Open" && current.state !== "Under Investigation") {
        conflict("the club can only be asked to respond before a decision");
      }
      const message = text(step.message, 2_000, "message");
      if (!message) invalid("tell the club what to explain", "message");
      const dueAt = step.dueAt ?? new Date(now.getTime() + RESPONSE_DUE_DAYS * DAY_MS);
      if (dueAt <= now) invalid("the response deadline must be in the future", "dueAt");
      return { next: { ...next, state: "Awaiting Club Response", responseDueAt: dueAt,
        clubResponse: { requestMessage: message, requestedBy: actorId, requestedAt: now, dueAt } },
      action: "VIOLATION_RESPONSE_REQUESTED", reason: message, notifyClub: true };
    }
    case "recordResponse": {
      if (current.state !== "Awaiting Club Response" || !current.clubResponse) conflict("no club response is awaited");
      if (current.clubResponse.source) conflict("the club response is already recorded");
      if (step.noResponse) {
        if (now <= current.clubResponse.dueAt) conflict("the response deadline has not passed yet");
        return { next: { ...next, clubResponse: { ...current.clubResponse, source: "NO_RESPONSE", recordedBy: actorId,
          respondedAt: now } }, action: "VIOLATION_NO_RESPONSE_RECORDED", notifyClub: false };
      }
      const answer = text(step.text, 5_000, "text");
      if (!answer) invalid("enter what the club answered", "text");
      return { next: { ...next, clubResponse: { ...current.clubResponse, source: "RECORDED_BY_ICPDP", text: answer,
        recordedBy: actorId, respondedAt: now } }, action: "VIOLATION_RESPONSE_RECORDED", notifyClub: false };
    }
    case "decide": {
      const reason = text(step.reason, 5_000, "reason");
      if (!reason) invalid("a decision needs a reason (BR28)", "reason");
      const evidence = normalizedEvidence(step.evidence, actorId, now);
      if (step.finding === "NO_VIOLATION") {
        if (current.state === "Decision Issued" || current.state === "Corrective Action") {
          conflict("a decision has already been issued");
        }
        return { next: { ...next, state: "Closed", decisionReason: reason, decisionEvidence: evidence, decidedBy: actorId,
          decidedAt: now, resolvedAt: now }, action: "VIOLATION_CLOSED_NO_VIOLATION", reason, notifyClub: true };
      }
      if (current.state !== "Awaiting Club Response" || !current.clubResponse?.source) {
        conflict("record the club's response (or that it did not respond) before finding a violation");
      }
      if (!evidence.length) invalid("a violation finding needs evidence (BR28)", "evidence");
      return { next: { ...next, state: "Decision Issued", decisionReason: reason, decisionEvidence: evidence,
        decidedBy: actorId, decidedAt: now }, action: "VIOLATION_DECIDED", reason, notifyClub: true };
    }
    case "addActions": {
      if (current.state !== "Decision Issued" && current.state !== "Corrective Action") {
        conflict("corrective actions follow a violation decision");
      }
      if (!step.actions.length || current.actions.length + step.actions.length > MAX_CORRECTIVE_ACTIONS) {
        invalid("add between 1 and 10 corrective actions", "actions");
      }
      for (const item of step.actions) {
        if (!text(item.description, 1_000, "actions")) invalid("each corrective action needs a description", "actions");
        if (Number.isNaN(item.dueAt.getTime()) || item.dueAt <= now) invalid("each corrective action needs a future deadline", "actions");
        if (item.linkedLifecycleAction && !LIFECYCLE_LINKS.includes(item.linkedLifecycleAction)) invalid("invalid lifecycle link", "actions");
      }
      next.actions.push(...step.actions.map((item, index) => ({ id: `new-${index}`, description: item.description.trim(),
        dueAt: item.dueAt, state: "Pending" as const,
        ...(item.linkedLifecycleAction ? { linkedLifecycleAction: item.linkedLifecycleAction } : {}) })));
      return { next: { ...next, state: "Corrective Action" }, action: "VIOLATION_ACTIONS_ASSIGNED", notifyClub: true };
    }
    case "verifyAction": {
      if (current.state !== "Corrective Action") conflict("there is no corrective action to verify");
      const item = next.actions.find((action) => action.id === step.actionId);
      if (!item) throw new DomainError("corrective action not found", "not_found");
      if (item.state !== "Pending") conflict("this corrective action is already checked");
      item.state = step.outcome;
      item.verifiedBy = actorId;
      item.verifiedAt = now;
      const done = next.actions.every((action) => action.state === "Verified");
      return { next: { ...next, ...(done ? { state: "Resolved" as const, resolvedAt: now } : {}) },
        action: done ? "VIOLATION_RESOLVED" : step.outcome === "Verified" ? "VIOLATION_ACTION_VERIFIED" : "VIOLATION_ACTION_FAILED",
        reason: text(step.note, 1_000, "note"), notifyClub: true };
    }
    case "resolve": {
      if (current.state !== "Decision Issued" && current.state !== "Corrective Action") {
        conflict("only a decided case can be resolved");
      }
      if (current.actions.some((action) => action.state === "Pending")) conflict("some corrective actions are not checked yet");
      return { next: { ...next, state: "Resolved", resolvedAt: now }, action: "VIOLATION_RESOLVED",
        reason: text(step.note, 1_000, "note"), notifyClub: true };
    }
  }
}
