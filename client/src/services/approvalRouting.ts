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
  matched: number;
  items: Array<{ entityType: RoutedRequestType; entityId: string; title: string; decidedAt: string; ruleId?: string; slaHours?: number }>;
}

// Gọi API /api/v1 và trả về data, ném ApiError nếu lỗi
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

// Gửi request có phương thức, CSRF và body JSON
function send<T>(method: string, path: string, csrfToken: string, body?: unknown) {
  return request<T>(path, { method, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body ?? {}) });
}

// GET /admin/routing-rules: các bộ luật định tuyến phê duyệt
export function fetchRoutingRuleSets(signal: AbortSignal) {
  return request<RoutingRuleSet[]>("/admin/routing-rules", { signal });
}
// POST tạo bản nháp bộ luật định tuyến phê duyệt
export function createRoutingDraft(rules: RoutingRule[], csrfToken: string) {
  return send<RoutingRuleSet>("POST", "/admin/routing-rules", csrfToken, { rules });
}
// PUT lưu bản nháp bộ luật định tuyến
export function saveRoutingDraft(id: string, rules: RoutingRule[], csrfToken: string) {
  return send<RoutingRuleSet>("PUT", `/admin/routing-rules/${encodeURIComponent(id)}`, csrfToken, { rules });
}
// POST /activate: kích hoạt bộ luật định tuyến
export function activateRoutingRuleSet(id: string, csrfToken: string) {
  return send<RoutingRuleSet>("POST", `/admin/routing-rules/${encodeURIComponent(id)}/activate`, csrfToken);
}
// GET /simulation: mô phỏng bộ luật trên dữ liệu thực
export function fetchRoutingSimulation(id: string, limit: number, signal: AbortSignal) {
  return request<RoutingSimulation>(`/admin/routing-rules/${encodeURIComponent(id)}/simulation?limit=${limit}`, { signal });
}
