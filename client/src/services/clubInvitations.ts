export interface ClubInvitation {
  id: string; clubId: string; status: "Pending" | "Accepted" | "Declined" | "Expired" | "Withdrawn"; deadline: string; responseNote?: string;
  responseDetails?: Record<string, string | number>;
  event: { id: string; title: string; state: string; startAt: string; endAt: string;
    venue?: string; objective?: string; coordination?: string };
}
export interface InvitationResponse {
  outcome: "Accepted" | "Declined"; responseNote?: string; responseDetails?: Record<string, string | number>;
}
async function request<T>(clubId: string, path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1/clubs/${encodeURIComponent(clubId)}/invitations${path}`, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${res.status}`);
  }
  return (await res.json() as { data: T }).data;
}
export function fetchClubInvitations(clubId: string, signal: AbortSignal): Promise<ClubInvitation[]> {
  return request(clubId, "", { signal });
}
export function respondToInvitation(clubId: string, id: string, input: InvitationResponse, csrfToken: string): Promise<ClubInvitation> {
  return request(clubId, `/${encodeURIComponent(id)}/response`, { method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(input) });
}
