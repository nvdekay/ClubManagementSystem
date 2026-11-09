import { ApiError, apiFetch } from "@/services/apiError";
export type RoutedRequestType = "CLUB_APPLICATION" | "EVENT_PROPOSAL" | "PROPERTY_BOOKING";
export type RiskCategory = "LOW" | "MEDIUM" | "HIGH";
export type RoutedPropertyType = "HALL" | "OUTDOOR" | "STAGE" | "EQUIPMENT";

export interface RoutingRule {
  id: string;
  requestType: RoutedRequestType;
  minAmount?: number;
  maxAmount?: number;
  riskCategories?: RiskCategory[];
  propertyTypes?: RoutedPropertyType[];
  minOpenViolations?: number;
  maxOpenViolations?: number;
  requiredLevel: 1 | 2;
  slaHours: number;
}

export interface RoutingRuleSet {
  id: string;
  versionNo: number;
  state: "Draft" | "Active" | "Superseded";
  rules: RoutingRule[];
  createdAt: string;
  activatedAt?: string;
}

export interface RoutingSimulation {
  total: number;
  secondLevel: number;
  items: Array<{ entityType: RoutedRequestType; entityId: string; title: string; decidedAt: string; requiredLevel: 1 | 2; ruleId?: string }>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`/api/v1${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string; details?: { overlaps?: string[][] } } | null;
    const overlaps = body?.details?.overlaps?.map((pair) => pair.join(" ↔ ")).join(", ");
    throw new ApiError(overlaps ? `${body?.message ?? "error"}: ${overlaps}` : body?.message ?? `HTTP ${response.status}`);
  }
  const body = await response.json() as { data: T };
  return body.data;
}

function send<T>(method: string, path: string, csrfToken: string, body?: unknown) {
  return request<T>(path, { method, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body ?? {}) });
}

export function fetchRoutingRuleSets(signal: AbortSignal) {
  return request<RoutingRuleSet[]>("/admin/routing-rules", { signal });
}
export function createRoutingDraft(rules: RoutingRule[], csrfToken: string) {
  return send<RoutingRuleSet>("POST", "/admin/routing-rules", csrfToken, { rules });
}
export function saveRoutingDraft(id: string, rules: RoutingRule[], csrfToken: string) {
  return send<RoutingRuleSet>("PUT", `/admin/routing-rules/${encodeURIComponent(id)}`, csrfToken, { rules });
}
export function activateRoutingRuleSet(id: string, csrfToken: string) {
  return send<RoutingRuleSet>("POST", `/admin/routing-rules/${encodeURIComponent(id)}/activate`, csrfToken);
}
export function fetchRoutingSimulation(id: string, limit: number, signal: AbortSignal) {
  return request<RoutingSimulation>(`/admin/routing-rules/${encodeURIComponent(id)}/simulation?limit=${limit}`, { signal });
}
