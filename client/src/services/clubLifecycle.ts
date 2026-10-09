export interface ClubSuspension {
  reason: string;
  suspendedAt: string;
  suspendedBy: string;
  until: string | null;
  reminderSentAt?: string;
}

export interface ClubDissolution {
  decidedAt: string;
  decidedBy: string;
  reason: string;
  effectiveSemester: string;
  effectiveFrom: string;
  effectiveTo: string;
}

export interface ClubLifecycleSummary {
  id: string;
  code: string;
  name: string;
  field: string;
  state: string;
  activeMembers: number;
  suspension?: ClubSuspension;
  dissolution?: ClubDissolution;
}

export interface ClubLifecycleDetail extends ClubLifecycleSummary {
  openCampaigns: { id: string; title: string; windowEnd: string }[];
  upcomingEvents: { id: string; title: string; startAt: string; endAt: string; registrations: number }[];
  activeTerm?: { name: string; startAt: string; endAt: string };
  history: { action: string; reason?: string; actorName?: string; at: string }[];
}

export interface CascadeResult {
  cancelledEvents: number;
  cancelledRegistrations: number;
  cancelledBookings: number;
}

/** Non-2xx response; keeps the status so 409 (state changed) reads differently from 400. */
export class LifecycleRequestError extends Error {
  constructor(message: string, readonly status: number, readonly field?: string) {
    super(message);
    this.name = "LifecycleRequestError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin/clubs${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string; details?: { field?: unknown } } | null;
    throw new LifecycleRequestError(body?.message ?? `HTTP ${response.status}`, response.status,
      typeof body?.details?.field === "string" ? body.details.field : undefined);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

function post(path: string, csrfToken: string, body: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body) };
}

export function fetchClubLifecycles(signal: AbortSignal): Promise<{
  clubs: ClubLifecycleSummary[]; expiringSuspensions: ClubLifecycleSummary[];
}> {
  return request("", { signal });
}

export function fetchClubLifecycle(id: string, signal: AbortSignal): Promise<{
  club: ClubLifecycleDetail; nextSemester: { code: string; startAt: string; endAt: string } | null;
}> {
  return request(`/${encodeURIComponent(id)}`, { signal });
}

export function suspendClub(id: string, input: { reason: string; until?: string }, csrfToken: string): Promise<CascadeResult> {
  return request(`/${encodeURIComponent(id)}/suspend`, post("", csrfToken, input));
}

export function reactivateClub(id: string, reason: string, csrfToken: string): Promise<{ reactivated: true }> {
  return request(`/${encodeURIComponent(id)}/reactivate`, post("", csrfToken, { reason }));
}

export function dissolveClub(id: string, reason: string, csrfToken: string): Promise<CascadeResult & {
  effectiveSemester: string;
}> {
  return request(`/${encodeURIComponent(id)}/dissolve`, post("", csrfToken, { reason }));
}
