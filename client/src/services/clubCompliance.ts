import type { ViolationDetail } from "./violations";
import type { EvaluationDetail } from "./evaluations";
async function request<T>(clubId: string, path: string, init: RequestInit): Promise<T> {
  const r = await fetch(`/api/v1/clubs/${encodeURIComponent(clubId)}${path}`, { credentials: "same-origin", ...init });
  if (!r.ok) { const b = await r.json().catch(() => null) as { message?: string } | null; throw new Error(b?.message ?? `HTTP ${r.status}`); }
  return (await r.json() as { data: T }).data;
}
export function fetchClubViolations(clubId: string, signal: AbortSignal): Promise<ViolationDetail[]> { return request(clubId, "/violations", { signal }); }
export function fetchClubEvaluations(clubId: string, signal: AbortSignal): Promise<EvaluationDetail[]> { return request(clubId, "/evaluations", { signal }); }
export function submitComplianceResponse(clubId: string, action: { id: string; text: string } | { id: string; actionId: string; note: string; evidence: { note: string; url?: string }[] }, csrfToken: string): Promise<{ submitted: boolean }> {
  const path = `/violations/${encodeURIComponent(action.id)}${"text" in action ? "/response" : `/actions/${encodeURIComponent(action.actionId)}/submission`}`;
  const body = "text" in action ? { text: action.text } : { note: action.note, evidence: action.evidence };
  return request(clubId, path, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) });
}
