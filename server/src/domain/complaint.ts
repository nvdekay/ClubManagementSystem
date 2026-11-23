import { DomainError } from "./errors.js";
import { VIOLATION_SEVERITIES, type ViolationSeverity } from "./violation.js";

/**
 * UC50–UC52 khiếu nại chính thức (BR38, BR39). Sinh viên khiếu nại một CLB thẳng lên ICPDP;
 * ICPDP phân loại (Dismissed / Forwarded / Escalated); chỉ khiếu nại Forwarded mới đến CLB,
 * CLB phản hồi một lần; sau đó ICPDP đóng lại hoặc nâng thành hồ sơ vi phạm UC40.
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
/** Các trạng thái sinh viên còn được rút khiếu nại (UC50 A1) và ICPDP được liên kết thành một sự việc (UC50 E1). */
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

/** Toàn bộ nội dung ICPDP và tác giả được đọc. CLB không bao giờ nhận dạng dữ liệu này (D5). */
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

/** Góc nhìn của ICPDP có thêm người khiếu nại; chỉ ICPDP mới nhận được. */
export interface ComplaintForIcpdp extends Complaint {
  complainant: { id: string; displayName: string; email: string };
  linkedComplaintIds: string[];
}

/** D5: CLB thấy nội dung được chuyển và ghi chú của ICPDP, không bao giờ thấy người khiếu nại. */
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
  /** UC50 E1: ICPDP xác định hai khiếu nại của một sinh viên về cùng một CLB là cùng một sự việc. */
  | { kind: "link"; targetId: string; reason: string };

export interface ComplaintRepository {
  club(clubId: string): Promise<{ id: string; name: string; state: string } | null>;
  eventBelongsToClub(eventId: string, clubId: string): Promise<boolean>;
  /** Tạo khiếu nại, task ICPDP, audit và thông báo ICPDP trong cùng một transaction. */
  submit(input: ComplaintInput & { studentId: string; now: Date }): Promise<Complaint>;
  listMine(studentId: string): Promise<Complaint[]>;
  /** Chỉ khi khiếu nại thuộc về sinh viên và còn Submitted / Under Triage; ngược lại trả null. */
  withdraw(studentId: string, complaintId: string, now: Date): Promise<Complaint | null>;
  queue(filter: { state?: ComplaintState }): Promise<ComplaintForIcpdp[]>;
  findForIcpdp(complaintId: string): Promise<ComplaintForIcpdp | null>;
  /** Áp dụng một bước của ICPDP với điều kiện trạng thái; báo conflict nếu khiếu nại đã đổi trạng thái trong lúc đó. */
  decide(complaintId: string, officerId: string, decision: ComplaintDecision, now: Date): Promise<ComplaintForIcpdp>;
  clubInbox(clubId: string): Promise<ComplaintForClub[]>;
  respond(clubId: string, complaintId: string, actorId: string, response: Omit<ComplaintClubResponse, "at">,
    now: Date): Promise<ComplaintForClub>;
  /** UC52 E1: đánh dấu mỗi khiếu nại Forwarded quá hạn một lần (audit + thông báo ICPDP); trả về số lượng. */
  flagOverdueResponses(now: Date): Promise<number>;
}

// Ném lỗi validation cho trường khiếu nại không hợp lệ
function invalid(message: string, field: string): never {
  throw new DomainError(message, "validation", { field });
}

// Cắt khoảng trắng và kiểm tra độ dài nội dung khiếu nại
export function complaintText(value: string, field: string, max = MAX_COMPLAINT_TEXT): string {
  const trimmed = value.trim();
  if (!trimmed) invalid(`${field} is required`, field);
  if (trimmed.length > max) invalid(`${field} must be at most ${max} characters`, field);
  return trimmed;
}

// Kiểm tra và chuẩn hoá các link minh chứng đính kèm khiếu nại
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

// Kiểm tra bước quyết định của ICPDP hợp lệ với trạng thái khiếu nại hiện tại
/** Kiểm tra một bước của ICPDP với trạng thái hiện tại (BR39: mọi kết quả đều phải có lý do). */
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
      // UC51 E1: CLB đã giải thể không còn phản hồi hay bị xử lý được nữa; khiếu nại được đóng kèm lịch sử.
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
