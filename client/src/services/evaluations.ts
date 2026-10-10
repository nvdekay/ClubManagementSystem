export type EvaluationState = "Draft" | "Data Ready" | "Under Review" | "Finalized" | "Published";
export type Classification = "EXCELLENT" | "GOOD" | "FAIR" | "NEEDS_IMPROVEMENT";

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
  periods: { code: string; startAt: string; endAt: string; hasActiveScheme: boolean }[];
  periodCode?: string;
  scheme?: { id: string; version: number };
  rows: EvaluationRow[];
  canPublish: boolean;
}

export interface Lineage {
  metric: string;
  sourceEntity: string;
  sourceIds: string[];
  sourcePeriod: string;
  value: number;
}

export interface DimensionView {
  code: string;
  name: string;
  weight: number;
  allowsManual: boolean;
  score?: number;
  computedScore?: number;
  insufficientData: boolean;
  isManual: boolean;
  justification?: string;
  evidence: Lineage[];
}

export interface EvaluationDetail {
  id: string;
  clubId: string;
  clubName: string;
  periodCode: string;
  schemeVersion: number;
  state: EvaluationState;
  revisionNo: number;
  totalScore?: number;
  classification?: Classification;
  generatedAt?: string;
  finalizedAt?: string;
  publishedAt?: string;
  dimensions: DimensionView[];
  revisions: { id: string; revisionNo: number; state: EvaluationState; totalScore?: number; publishedAt?: string }[];
  trend: { periodCode: string; totalScore?: number; classification?: Classification }[];
  thresholds: { excellent: number; good: number; fair: number };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin/evaluations${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

function post(csrfToken: string, body?: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}) };
}

export function fetchEvaluationOverview(period: string | undefined, signal: AbortSignal): Promise<EvaluationOverview> {
  return request(period ? `?period=${encodeURIComponent(period)}` : "", { signal });
}

export function fetchEvaluation(id: string, signal: AbortSignal): Promise<EvaluationDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal });
}

export function generateEvaluations(periodCode: string, csrfToken: string): Promise<EvaluationOverview> {
  return request("/generate", post(csrfToken, { periodCode }));
}

export function publishEvaluations(periodCode: string, csrfToken: string): Promise<EvaluationOverview> {
  return request("/publish", post(csrfToken, { periodCode }));
}

export type EvaluationAction =
  | { kind: "regenerate" | "finalize" | "reopen" }
  | { kind: "manual"; dimensionCode: string; manual: { score: number; justification: string } | null };

export function runEvaluationAction(id: string, action: EvaluationAction, csrfToken: string): Promise<EvaluationDetail> {
  const path = `/${encodeURIComponent(id)}/${action.kind}`;
  return request(path, post(csrfToken, action.kind === "manual"
    ? { dimensionCode: action.dimensionCode, manual: action.manual } : undefined));
}
