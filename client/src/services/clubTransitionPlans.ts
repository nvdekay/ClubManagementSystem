export interface TransitionInput {
  toTerm: { name: string; startAt: string; endAt: string };
  candidates: { positionCode: string; membershipId: string }[];
  handoverItems: { id: string; description: string }[]; assignees: Record<string, string>; earlyReason?: string;
}
export interface TransitionPlan {
  id: string; revision: number; state: string; input: TransitionInput;
  history: { action: string; at: string; reason?: string; snapshot?: TransitionInput }[];
}
export interface TransitionContext {
  term: { id: string; name: string; startAt: string; endAt: string } | null;
  positions: { code: string; name: string; isLeaderRole: boolean; isSingleHolder: boolean }[];
  members: { id: string; displayName: string }[];
  obligations: { id: string; description: string }[]; plans: TransitionPlan[];
}
async function request<T>(clubId: string, path: string, init: RequestInit): Promise<T> {
  const r = await fetch(`/api/v1/clubs/${encodeURIComponent(clubId)}/transition-plans${path}`, { credentials: "same-origin", ...init });
  if (!r.ok) { const b = await r.json().catch(() => null) as { message?: string } | null; throw new Error(b?.message ?? `HTTP ${r.status}`); }
  return (await r.json() as { data: T }).data;
}
export function fetchTransitionContext(clubId: string, signal: AbortSignal): Promise<TransitionContext> { return request(clubId, "", { signal }); }
export function writeTransitionPlan(clubId: string, action: { id?: string; revision?: number; input?: TransitionInput }, csrfToken: string): Promise<TransitionPlan> {
  const path = action.id ? `/${encodeURIComponent(action.id)}${action.input ? "" : "/submit"}` : "";
  return request(clubId, path, { method: action.id && action.input ? "PUT" : "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ ...(action.input ?? {}), ...(action.revision !== undefined ? { revision: action.revision } : {}) }) });
}
