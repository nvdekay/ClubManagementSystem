import { DomainError } from "./errors.js";
import { VIOLATION_SEVERITIES, type ViolationSeverity } from "./violation.js";

/**
 * UC50–UC52 formal complaint (BR38, BR39). A student complains about a club straight to ICPDP;
 * ICPDP triages it (Dismissed / Forwarded / Escalated); only a Forwarded complaint reaches the club,
 * which answers once; ICPDP then closes it or escalates it into a UC40 violation case.
 */
export const COMPLAINT_TYPES = ["CONDUCT", "EVENT", "FINANCE", "SAFETY", "OTHER"] as const;
export type ComplaintType = (typeof COMPLAINT_TYPES)[number];
export const COMPLAINT_STATES = ["Submitted", "Under Triage", "Dismissed", "Forwarded", "Club Responded", "Escalated",
  "Closed", "Withdrawn"] as const;
export type ComplaintState = (typeof COMPLAINT_STATES)[number];
export const TRIAGE_OUTCOMES = ["Dismissed", "Forwarded", "Escalated"] as const;
export type TriageOutcome = (typeof TRIAGE_OUTCOMES)[number];
export const TRIAGE_VALIDITIES = ["VALID", "PARTLY_VALID", "UNFOUNDED"] as const;
export type TriageValidity = (typeof TRIAGE_VALIDITIES)[number];
/** States a student may still withdraw from (UC50 A1) and that ICPDP may link as one incident (UC50 E1). */
export const UNDECIDED_COMPLAINT_STATES: readonly ComplaintState[] = ["Submitted", "Under Triage"];
export const OPEN_COMPLAINT_STATES: readonly ComplaintState[] = ["Submitted", "Under Triage", "Forwarded", "Club Responded"];
export const MAX_COMPLAINT_TEXT = 4_000;
export const MAX_COMPLAINT_EVIDENCE = 5;
export const COMPLAINT_RESPONSE_DAYS = 7;

export interface ComplaintEvidence { label: string; url: string }

export interface ComplaintInput {
  clubId: string;
  eventId?: string;
  type: ComplaintType;
  description: string;
  evidence: ComplaintEvidence[];
}

export interface ComplaintTriage {
  severity: ViolationSeverity;
  validity: TriageValidity;
  outcome: TriageOutcome;
  reason: string;
  actorId: string;
  at: Date;
}

export interface ComplaintClubResponse { text: string; action: string; evidence: ComplaintEvidence[]; at: Date }

/** Everything ICPDP and the author may read. The club never receives this shape (D5). */
export interface Complaint {
  id: string;
  clubId?: string;
  clubName?: string;
  clubState?: string;
  eventId?: string;
  eventTitle?: string;
  type: string;
  description: string;
  evidence: ComplaintEvidence[];
  state: ComplaintState;
  triage?: ComplaintTriage;
  clubResponse?: ComplaintClubResponse;
  closure?: { reason: string; at: Date };
  forwardedAt?: Date;
  respondedAt?: Date;
  responseDueAt?: Date;
  violationId?: string;
  linkedComplaintId?: string;
  submittedAt: Date;
  withdrawnAt?: Date;
  closedAt?: Date;
}

/** ICPDP's view adds who complained; only ICPDP ever gets it. */
export interface ComplaintForIcpdp extends Complaint {
  complainant: { id: string; displayName: string; email: string };
  linkedComplaintIds: string[];
}

/** D5: the club sees the forwarded matter and ICPDP's note, never the complainant. */
export interface ComplaintForClub {
  id: string;
  clubId: string;
  eventTitle?: string;
  type: string;
  description: string;
  evidence: ComplaintEvidence[];
  state: "Forwarded" | "Club Responded" | "Closed" | "Escalated";
  forwardNote: string;
  forwardedAt: Date;
  responseDueAt?: Date;
  clubResponse?: ComplaintClubResponse;
}

export type ComplaintDecision =
  | { kind: "open" }
  | { kind: "triage"; outcome: TriageOutcome; severity: ViolationSeverity; validity: TriageValidity; reason: string;
    responseDueAt?: Date }
  | { kind: "close"; reason: string }
  | { kind: "escalate"; severity: ViolationSeverity; reason: string }
  /** UC50 E1: ICPDP judges two complaints of one student about one club to be the same incident. */
  | { kind: "link"; targetId: string; reason: string };

export interface ComplaintRepository {
  club(clubId: string): Promise<{ id: string; name: string; state: string } | null>;
  eventBelongsToClub(eventId: string, clubId: string): Promise<boolean>;
  /** Creates the complaint, its ICPDP task, audit and ICPDP notification in one transaction. */
  submit(input: ComplaintInput & { studentId: string; now: Date }): Promise<Complaint>;
  listMine(studentId: string): Promise<Complaint[]>;
  /** Only when it belongs to the student and is still Submitted / Under Triage; null otherwise. */
  withdraw(studentId: string, complaintId: string, now: Date): Promise<Complaint | null>;
  queue(filter: { state?: ComplaintState }): Promise<ComplaintForIcpdp[]>;
  findForIcpdp(complaintId: string): Promise<ComplaintForIcpdp | null>;
  /** Applies one ICPDP step with a state precondition; conflict when the complaint moved meanwhile. */
  decide(complaintId: string, officerId: string, decision: ComplaintDecision, now: Date): Promise<ComplaintForIcpdp>;
  clubInbox(clubId: string): Promise<ComplaintForClub[]>;
  respond(clubId: string, complaintId: string, actorId: string, response: Omit<ComplaintClubResponse, "at">,
    now: Date): Promise<ComplaintForClub>;
  /** UC52 E1: flags each overdue Forwarded complaint once (audit + ICPDP notification); returns how many. */
  flagOverdueResponses(now: Date): Promise<number>;
}

function invalid(message: string, field: string): never {
  throw new DomainError(message, "validation", { field });
}

export function complaintText(value: string, field: string, max = MAX_COMPLAINT_TEXT): string {
  const trimmed = value.trim();
  if (!trimmed) invalid(`${field} is required`, field);
  if (trimmed.length > max) invalid(`${field} must be at most ${max} characters`, field);
  return trimmed;
}

export function normalizeEvidence(items: readonly ComplaintEvidence[]): ComplaintEvidence[] {
  if (items.length > MAX_COMPLAINT_EVIDENCE) invalid(`attach at most ${MAX_COMPLAINT_EVIDENCE} evidence links`, "evidence");
  return items.map((item) => {
    const url = item.url.trim();
    let parsed: URL;
    try { parsed = new URL(url); } catch { return invalid("evidence must be a valid link", "evidence"); }
    if (!["http:", "https:"].includes(parsed.protocol) || url.length > 500) invalid("evidence must be an http(s) link", "evidence");
    return { label: item.label.trim().slice(0, 120) || parsed.hostname, url };
  });
}

/** Checks one ICPDP step against the current state (BR39: a reason for every outcome). */
export function assertComplaintDecision(current: Pick<Complaint, "state" | "clubState">, decision: ComplaintDecision,
  now: Date): ComplaintDecision {
  switch (decision.kind) {
    case "open":
      if (current.state !== "Submitted") throw new DomainError("only a submitted complaint can be opened", "conflict");
      return decision;
    case "triage": {
      if (current.state !== "Under Triage") throw new DomainError("open the complaint before triaging it", "conflict");
      if (!TRIAGE_OUTCOMES.includes(decision.outcome)) invalid("invalid triage outcome", "outcome");
      if (!TRIAGE_VALIDITIES.includes(decision.validity)) invalid("invalid validity", "validity");
      if (!VIOLATION_SEVERITIES.includes(decision.severity)) invalid("invalid severity", "severity");
      const reason = complaintText(decision.reason, "reason", 2_000);
      // UC51 E1: a dissolved club can no longer answer or be sanctioned; the complaint is closed with its history.
      if (current.clubState === "Dissolved" && decision.outcome !== "Dismissed") {
        throw new DomainError("the club is dissolved; record and dismiss the complaint", "conflict");
      }
      if (decision.outcome === "Forwarded") {
        const due = decision.responseDueAt ?? new Date(now.getTime() + COMPLAINT_RESPONSE_DAYS * 86_400_000);
        if (due <= now) invalid("the response deadline must be in the future", "responseDueAt");
        return { ...decision, reason, responseDueAt: due };
      }
      return { ...decision, reason, responseDueAt: undefined };
    }
    case "close":
      if (current.state !== "Club Responded") throw new DomainError("only a complaint the club answered can be closed", "conflict");
      return { ...decision, reason: complaintText(decision.reason, "reason", 2_000) };
    case "link":
      if (!UNDECIDED_COMPLAINT_STATES.includes(current.state)) {
        throw new DomainError("only an undecided complaint can be linked to another", "conflict");
      }
      return { ...decision, reason: complaintText(decision.reason, "reason", 2_000) };
    case "escalate":
      if (current.state !== "Club Responded") throw new DomainError("only a complaint the club answered can be escalated here", "conflict");
      if (current.clubState === "Dissolved") throw new DomainError("the club is dissolved", "conflict");
      if (!VIOLATION_SEVERITIES.includes(decision.severity)) invalid("invalid severity", "severity");
      return { ...decision, reason: complaintText(decision.reason, "reason", 2_000) };
  }
}
