export interface SuspensionRequest {
  id: string; clubId: string; clubName: string; state: "Pending" | "Approved" | "Rejected"; reason: string; until: string;
  obligationsPlan: string; recoveryPlan: string; submittedAt: string; decisionReason?: string;
}
export interface SuspensionContext { requests: SuspensionRequest[]; impacts: { id: string; kind: string; title: string; startAt: string }[] }
async function request<T>(path: string, init: RequestInit): Promise<T> {
  const r = await fetch(`/api/v1${path}`, { credentials: "same-origin", ...init });
  if (!r.ok) { const b = await r.json().catch(() => null) as { message?: string } | null; throw new Error(b?.message ?? `HTTP ${r.status}`); }
  return (await r.json() as { data: T }).data;
}
export async function fetchSuspensions(clubId: string | undefined, signal: AbortSignal): Promise<SuspensionContext> {
  if (clubId) return request(`/clubs/${encodeURIComponent(clubId)}/suspension-requests`, { signal });
  return { requests: await request<SuspensionRequest[]>("/admin/suspension-requests", { signal }), impacts: [] };
}
export function submitSuspension(clubId: string, input: { reason: string; until: string; obligationsPlan: string; recoveryPlan: string; acknowledgedImpactIds: string[] }, csrfToken: string): Promise<SuspensionRequest> {
  return request(`/clubs/${encodeURIComponent(clubId)}/suspension-requests`, post(input, csrfToken));
}
export function decideSuspension(id: string, outcome: "Approve" | "Reject", reason: string, csrfToken: string): Promise<SuspensionRequest[]> {
  return request(`/admin/suspension-requests/${encodeURIComponent(id)}/decision`, post({ outcome, reason }, csrfToken));
}
function post(body: object, csrfToken: string): RequestInit { return { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }; }
