export interface Reconfirmation { id: string; clubName: string; periodCode: string; dueAt: string; state: "Pending" | "Confirmed" | "Exempt" | "Expired" }
async function request<T>(path: string, init: RequestInit): Promise<T> {
  const r = await fetch(`/api/v1/memberships/reconfirmations${path}`, { credentials: "same-origin", ...init });
  if (!r.ok) { const b = await r.json().catch(() => null) as { message?: string } | null; throw new Error(b?.message ?? `HTTP ${r.status}`); }
  return (await r.json() as { data: T }).data;
}
export function fetchReconfirmations(signal: AbortSignal): Promise<Reconfirmation[]> { return request("/mine", { signal }); }
export function confirmReconfirmation(id: string, csrfToken: string): Promise<Reconfirmation> { return request(`/${encodeURIComponent(id)}/confirm`, { method: "POST", headers: { "X-CSRF-Token": csrfToken } }); }
