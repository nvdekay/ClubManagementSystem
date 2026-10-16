export interface ReportInput {
  actualResult: string;
  incidents?: string;
  lessonsLearned?: string;
  evidence: { note: string; url: string }[];
}
export interface ReportSnapshot {
  proposal: unknown;
  attendance: { confirmed: number; attended: number; absent: number };
  budget: unknown;
  expenses: unknown;
  feedback: unknown;
  policyVersionId: string;
  dueAt: string;
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
  submittedAt?: string;
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
  dueAt: string;
  overdue: boolean;
  attendanceFinalized: boolean;
  report?: PostEventReport;
}
export interface ReportConfigurationIssue { eventId: string; eventTitle: string; state: string; revision: number; configurationError: "REPORT_DEADLINE_NOT_CONFIGURED" }
export interface ReportDetail {
  obligation: ReportObligation;
  versions: PostEventReport[];
  preview: ReportSnapshot;
}
export interface ExpenseInput {
  category: string;
  amount: number;
  spentAt: string;
  description?: string;
}
export interface FinancialEvidence {
  id: string;
  type: "INVOICE" | "RECEIPT" | "PROOF_OF_PAYMENT";
  externalLink: string;
  uploadedBy: string;
  uploadedAt: string;
}
export interface Expense extends ExpenseInput {
  id: string;
  isOutOfCategory: boolean;
  isOverRemaining: boolean;
  hasEvidence: boolean;
  reviewOutcome?: string;
  reviewReason?: string;
  evidences: FinancialEvidence[];
}
export interface FinanceDetail {
  id: string;
  clubId: string;
  eventId: string;
  eventTitle: string;
  eventState: string;
  state: string;
  revision: number;
  settlementDueAt?: string;
  settlementSubmittedAt?: string;
  isSettlementLate: boolean;
  acceptedTotal?: number;
  settlementBalance?: number;
  recoveryAmount?: number;
  recoveryDueAt?: string;
  refundedTotal: number;
  lines: { category: string; approvedAmount: number }[];
  expenses: Expense[];
  totals: {
    approvedTotal: number;
    advanceTotal: number;
    recordedTotal: number;
    supportedTotal: number;
    unsupportedTotal: number;
    remaining: number;
  };
  task?: { id: string; assigneeId?: string };
  history: { action: string; at: string; snapshot: unknown; reason?: string }[];
}
export type AccountabilityContext =
  { kind: "club"; clubId: string } | { kind: "admin" };
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    credentials: "same-origin",
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? `HTTP ${res.status}`);
  }
  return ((await res.json()) as { data: T }).data;
}
function reportBase(context: AccountabilityContext) {
  return context.kind === "club"
    ? `/clubs/${encodeURIComponent(context.clubId)}/event-reports`
    : "/admin/event-reports";
}
function financeBase(context: AccountabilityContext, id?: string) {
  if (context.kind === "club")
    return `/clubs/${encodeURIComponent(context.clubId)}/budgets${id ? `/${encodeURIComponent(id)}` : ""}`;
  return `/admin/budgets/${encodeURIComponent(id ?? "")}/reconciliation`;
}
export function fetchReportObligations(
  context: AccountabilityContext,
  signal: AbortSignal,
): Promise<(ReportObligation | ReportConfigurationIssue)[]> {
  return request(reportBase(context), { signal });
}
export function fetchReportDetail(
  context: AccountabilityContext,
  id: string,
  signal: AbortSignal,
): Promise<ReportDetail> {
  return request(`${reportBase(context)}/${encodeURIComponent(id)}`, {
    signal,
  });
}
export function fetchClubFinances(
  clubId: string,
  signal: AbortSignal,
): Promise<FinanceDetail[]> {
  return request(financeBase({ kind: "club", clubId }), { signal });
}
export function fetchFinanceDetail(
  context: AccountabilityContext,
  id: string,
  signal: AbortSignal,
): Promise<FinanceDetail> {
  return request(financeBase(context, id), { signal });
}
export function reportAction(
  context: AccountabilityContext,
  id: string,
  body: object,
  token: string,
): Promise<ReportDetail> {
  return request(`${reportBase(context)}/${encodeURIComponent(id)}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify(body),
  });
}
export function financeAction(
  context: AccountabilityContext,
  id: string,
  body: object,
  token: string,
): Promise<FinanceDetail> {
  return request(`${financeBase(context, id)}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify(body),
  });
}
