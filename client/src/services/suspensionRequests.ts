import { ApiError, apiFetch } from "@/services/apiError";
export interface SuspensionRequest {
  id: string; clubId: string; clubName: string; state: "Pending" | "Approved" | "Rejected"; reason: string; until: string;
  obligationsPlan: string; recoveryPlan: string; submittedAt: string; decisionReason?: string;
}
export interface SuspensionContext { requests: SuspensionRequest[]; impacts: { id: string; kind: string; title: string; startAt: string }[] }
// Gọi API /api/v1 và trả về data, ném ApiError nếu lỗi
async function request<T>(path: string, init: RequestInit): Promise<T> {
  const r = await apiFetch(`/api/v1${path}`, { credentials: "same-origin", ...init });
  if (!r.ok) { const b = await r.json().catch(() => null) as { message?: string } | null; throw new ApiError(b?.message ?? `HTTP ${r.status}`); }
  return (await r.json() as { data: T }).data;
}
// GET yêu cầu tạm ngưng CLB (của CLB hoặc cho ICPDP)
export async function fetchSuspensions(clubId: string | undefined, signal: AbortSignal): Promise<SuspensionContext> {
  if (clubId) return request(`/clubs/${encodeURIComponent(clubId)}/suspension-requests`, { signal });
  return { requests: await request<SuspensionRequest[]>("/admin/suspension-requests", { signal }), impacts: [] };
}
// POST CLB gửi yêu cầu tạm ngưng
export function submitSuspension(clubId: string, input: { reason: string; until: string; obligationsPlan: string; recoveryPlan: string; acknowledgedImpactIds: string[] }, csrfToken: string): Promise<SuspensionRequest> {
  return request(`/clubs/${encodeURIComponent(clubId)}/suspension-requests`, post(input, csrfToken));
}
// POST /decision: ICPDP duyệt hoặc từ chối yêu cầu tạm ngưng
export function decideSuspension(id: string, outcome: "Approve" | "Reject", reason: string, csrfToken: string): Promise<SuspensionRequest[]> {
  return request(`/admin/suspension-requests/${encodeURIComponent(id)}/decision`, post({ outcome, reason }, csrfToken));
}
// Dựng RequestInit POST có CSRF và body JSON
function post(body: object, csrfToken: string): RequestInit { return { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }; }
