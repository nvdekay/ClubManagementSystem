export interface PublicClub {
  id: string;
  code: string;
  name: string;
  field: string;
  state: "Active" | "Suspended";
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  operatingScope?: string;
  logoUrl?: string;
}

export interface PublicCampaign {
  id: string;
  title: string;
  state: string;
  windowStart: string;
  windowEnd: string;
  capacity: number;
}

export interface PublicEvent {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  startAt: string;
  endAt: string;
  venueText?: string;
  capacity: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ClubPage extends Page<PublicClub> {
  fields: string[];
}

export interface ClubDetail {
  club: PublicClub;
  board: Array<{ memberName: string; positionName: string; termName: string }>;
  campaigns: PublicCampaign[];
  upcomingEvents: PublicEvent[];
  history: PublicEvent[];
}

export class PublicApiError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
  }
}

async function publicGet<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1/public/${path}`, { signal });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new PublicApiError(response.status, body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

export function fetchClubs(
  search: string, field: string, page: number, signal: AbortSignal,
): Promise<ClubPage> {
  const params = new URLSearchParams({ search, field, page: String(page) });
  return publicGet(`clubs?${params}`, signal);
}

export function fetchClub(id: string, signal: AbortSignal): Promise<ClubDetail> {
  return publicGet(`clubs/${encodeURIComponent(id)}`, signal);
}

export function fetchEvents(page: number, signal: AbortSignal): Promise<Page<PublicEvent>> {
  return publicGet(`events?page=${page}`, signal);
}

export function fetchEvent(id: string, signal: AbortSignal): Promise<{
  event: PublicEvent;
  club: { id: string; name: string };
}> {
  return publicGet(`events/${encodeURIComponent(id)}`, signal);
}
