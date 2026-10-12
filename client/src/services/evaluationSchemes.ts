export type DimensionCode = "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7" | "D8";
export type SchemeState = "Draft" | "Active" | "Superseded";
export type ActivationIssue = "totalWeight" | "coreWeight";

export interface SchemeDimension {
  code: DimensionCode;
  weight: number;
  allowsManual: boolean;
}

export interface SchemeThresholds {
  excellent: number;
  good: number;
  fair: number;
}

export interface SchemeSettings {
  dimensions: SchemeDimension[];
  thresholds: SchemeThresholds;
}

export interface EvaluationScheme extends SchemeSettings {
  id: string;
  periodCode: string;
  version: number;
  state: SchemeState;
  totalWeight: number;
  activatedAt?: string;
  createdAt: string;
}

export interface DimensionInfo {
  code: DimensionCode;
  name: string;
  core: boolean;
  measures: string;
}

export interface SchemeCatalogue {
  schemes: EvaluationScheme[];
  periods: { code: string; startAt: string; endAt: string }[];
  dimensions: DimensionInfo[];
}

/** Non-2xx response; keeps `field` / `issues` from the server's details. */
export class SchemeRequestError extends Error {
  constructor(message: string, readonly status: number, readonly field?: string,
    readonly issues: ActivationIssue[] = []) {
    super(message);
    this.name = "SchemeRequestError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin/evaluation-schemes${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      { message?: string; details?: { field?: unknown; issues?: unknown } } | null;
    throw new SchemeRequestError(body?.message ?? `HTTP ${response.status}`, response.status,
      typeof body?.details?.field === "string" ? body.details.field : undefined,
      Array.isArray(body?.details?.issues) ? body.details.issues as ActivationIssue[] : []);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

function mutation(method: string, csrfToken: string, body?: object): RequestInit {
  return { method, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}) };
}

export function fetchSchemes(signal: AbortSignal): Promise<SchemeCatalogue> {
  return request("", { signal });
}

export function createScheme(input: { periodCode: string; copyFromId?: string },
  csrfToken: string): Promise<EvaluationScheme> {
  return request("", mutation("POST", csrfToken, input));
}

export function updateScheme(id: string, settings: SchemeSettings, csrfToken: string): Promise<EvaluationScheme> {
  return request(`/${encodeURIComponent(id)}`, mutation("PATCH", csrfToken, settings));
}

export function activateScheme(id: string, csrfToken: string): Promise<EvaluationScheme> {
  return request(`/${encodeURIComponent(id)}/activate`, mutation("POST", csrfToken));
}

export function deleteScheme(id: string, csrfToken: string): Promise<{ deleted: true }> {
  return request(`/${encodeURIComponent(id)}`, mutation("DELETE", csrfToken));
}
