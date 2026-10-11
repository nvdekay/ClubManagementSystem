import type { Property } from "./properties";

export interface RoomAllocationOccurrence { bookingId: string; startAt: string; endAt: string; state: string }
export interface RoomAllocation {
  id: string; semesterCode: string; clubId: string; clubName: string;
  propertyId: string; propertyName: string; location: string;
  /** 1 = Monday … 7 = Sunday. */
  weekday: number; slot: number; note?: string;
  allocatedBy: string; allocatedByName?: string; allocatedAt: string;
  revokedAt?: string; revokeReason?: string;
  occurrences: RoomAllocationOccurrence[];
}
export interface RoomAllocationOptions {
  semesters: Array<{ code: string; startAt: string; endAt: string }>;
  clubs: Array<{ id: string; name: string; state: string }>;
  rooms: Property[];
}
export interface RoomAllocationInput {
  semesterCode: string; clubId: string; propertyId: string; weekday: number; slot: number; note?: string;
}
export interface RoomAllocationConflict { startAt: string; endAt: string; source: "booking" | "event"; title: string; clubName?: string }

/** Keeps the server's `details` (e.g. the clashing dates) next to the message. */
export class RoomAllocationError extends Error {
  constructor(message: string, readonly details?: unknown) { super(message); this.name = "RoomAllocationError"; }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { message?: string; details?: unknown } | null;
    throw new RoomAllocationError(body?.message ?? `HTTP ${res.status}`, body?.details);
  }
  return ((await res.json()) as { data: T }).data;
}
function post<T>(path: string, body: unknown, csrfToken: string): Promise<T> {
  return request(path, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body) });
}

export function fetchRoomAllocationOptions(signal: AbortSignal): Promise<RoomAllocationOptions> {
  return request("/admin/room-allocations/options", { signal });
}
export function fetchRoomAllocations(semesterCode: string, signal: AbortSignal): Promise<RoomAllocation[]> {
  return request(`/admin/room-allocations?${new URLSearchParams({ semesterCode })}`, { signal });
}
export function fetchClubRoomAllocations(clubId: string, signal: AbortSignal): Promise<RoomAllocation[]> {
  return request(`/clubs/${encodeURIComponent(clubId)}/room-allocations`, { signal });
}
export function createRoomAllocation(input: RoomAllocationInput, csrfToken: string): Promise<RoomAllocation> {
  return post("/admin/room-allocations", input, csrfToken);
}
export function revokeRoomAllocation(id: string, reason: string, csrfToken: string): Promise<RoomAllocation> {
  return post(`/admin/room-allocations/${encodeURIComponent(id)}/revoke`, { reason }, csrfToken);
}
