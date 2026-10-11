import type { Property } from "./properties";

export interface BookingInput {
  propertyId: string; purpose: string; startAt: string; endAt: string;
  headcount: number; equipment: string[]; eventId?: string;
}
export interface Booking extends BookingInput {
  id: string; clubId: string; clubName: string; semesterCode: string; state: string;
  currentVersionNo: number; conflictResult?: string; isLateCancellation: boolean;
  decisionReason?: string; cancelReason?: string;
}
export interface BookingCheck {
  conflictResult: string; capacityWarning: boolean;
  conflicts: Array<{ id: string; startAt: string; endAt: string; source: string }>;
}
export interface BookingDecisionInput {
  outcome: "Approve" | "Reject" | "Request revision"; reason: string; reviewNote?: string;
  overbookingReason?: string;
  alternative?: { propertyId: string; startAt: string; endAt: string };
}
export interface BookingResponsible { id: string; displayName: string; email: string }
export interface BookingDetail {
  responsible?: BookingResponsible;
  overbooking?: { actorId: string; reason: string; at: string; conflicts: BookingCheck["conflicts"] };
  booking: Booking; property: Property | null;
  club: { id: string; name: string; state: string } | null;
  task: { id: string; state: string; assigneeId?: string; openedAt: string } | null;
  check: BookingCheck | null; obligations: string[];
  versions: Array<{ versionNo: number; payload: BookingInput; submittedBy: string; submittedAt: string }>;
  decisions: Array<BookingDecisionInput & { id: string; taskId: string; actorId: string; at: string }>;
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${res.status}`);
  }
  return ((await res.json()) as { data: T }).data;
}
function base(clubId: string | null) {
  return clubId ? `/clubs/${encodeURIComponent(clubId)}/bookings` : "/admin/bookings";
}
export function fetchBookings(clubId: string | null, signal: AbortSignal): Promise<Booking[]> {
  return request(base(clubId), { signal });
}
export function fetchBooking(clubId: string | null, id: string, signal: AbortSignal): Promise<BookingDetail> {
  return request(`${base(clubId)}/${encodeURIComponent(id)}`, { signal });
}
export function fetchBookingProperties(clubId: string | null, signal: AbortSignal): Promise<Property[]> {
  return request(clubId ? `/clubs/${encodeURIComponent(clubId)}/booking-properties` : "/admin/properties", { signal });
}
export function fetchBookingEvents(clubId: string, signal: AbortSignal): Promise<Array<{ id: string; title: string; startAt: string }>> {
  return request(`/clubs/${encodeURIComponent(clubId)}/booking-events`, { signal });
}
export function fetchBookingAvailability(clubId: string, propertyId: string, startAt: string, endAt: string,
  signal: AbortSignal, asOfficer = false): Promise<BookingCheck> {
  const query = new URLSearchParams({ startAt, endAt });
  return request(`${asOfficer ? "/admin" : ""}/clubs/${encodeURIComponent(clubId)}/booking-properties/${encodeURIComponent(propertyId)}/availability?${query}`, { signal });
}
export function fetchBlackoutBookings(propertyId: string, signal: AbortSignal): Promise<Booking[]> {
  return request(`/admin/properties/${encodeURIComponent(propertyId)}/booking-conflicts`, { signal });
}
export function fetchBookingResponsible(clubId: string, signal: AbortSignal, asOfficer = false): Promise<BookingResponsible> {
  return request(`${asOfficer ? "/admin" : ""}/clubs/${encodeURIComponent(clubId)}/booking-responsible`, { signal });
}
export type BookingAction =
  | { kind: "overbook"; clubId: string; input: Pick<BookingInput, "propertyId" | "startAt" | "endAt"> & { reason: string } }
  | { kind: "reserve"; clubId: string; input: Pick<BookingInput, "propertyId" | "startAt" | "endAt"> }
  | { kind: "save"; clubId: string; id?: string; input: BookingInput; expectedVersion: number }
  | { kind: "submit"; clubId: string; id: string; expectedVersion: number }
  | { kind: "cancel"; clubId: string; id: string; reason: string }
  | { kind: "claim"; id: string }
  | { kind: "decision"; id: string; input: BookingDecisionInput };
export function changeBooking(action: BookingAction, csrfToken: string): Promise<BookingDetail> {
  if (action.kind === "overbook") return request(`/admin/clubs/${encodeURIComponent(action.clubId)}/bookings/overbook`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(action.input),
  });
  const clubId = "clubId" in action ? action.clubId : null;
  if (action.kind === "reserve") return request(`${base(action.clubId)}/reserve`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(action.input),
  });
  const path = `${base(clubId)}${action.id ? `/${encodeURIComponent(action.id)}` : ""}`;
  const suffix = action.kind === "save" ? "" : `/${action.kind}`;
  const body = action.kind === "save" ? { ...action.input, ...(action.id ? { expectedVersion: action.expectedVersion } : {}) }
    : action.kind === "submit" ? { expectedVersion: action.expectedVersion }
      : action.kind === "cancel" ? { reason: action.reason } : action.kind === "decision" ? action.input : {};
  return request(`${path}${suffix}`, { method: action.kind === "save" && action.id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) });
}

export interface BookingSlot { number: number; start: string; end: string }
export function fetchBookingSlots(signal: AbortSignal): Promise<BookingSlot[]> {
  return request("/booking-slots", { signal });
}
