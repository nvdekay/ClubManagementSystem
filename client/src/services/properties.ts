export type PropertyType = "ROOM" | "HALL" | "EQUIPMENT";

/** `day` 1 = Monday … 7 = Sunday; days not listed cannot be booked. */
export interface BookableHours {
  day: number;
  open: string;
  close: string;
}

export interface Blackout {
  startAt: string;
  endAt: string;
  reason: string;
}

export interface PropertyDetails {
  name: string;
  location: string;
  capacity?: number;
  equipment: string[];
  bookableHours: BookableHours[];
  blackouts: Blackout[];
}

export interface Property extends PropertyDetails {
  id: string;
  code: string;
  type: PropertyType;
  isActive: boolean;
}

/** Non-2xx response; `field` names the invalid input when the server reports one. */
export class PropertyRequestError extends Error {
  constructor(message: string, readonly status: number, readonly field?: string) {
    super(message);
    this.name = "PropertyRequestError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin/properties${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      { message?: string; details?: { field?: unknown } } | null;
    throw new PropertyRequestError(body?.message ?? `HTTP ${response.status}`, response.status,
      typeof body?.details?.field === "string" ? body.details.field : undefined);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

function mutation(method: string, csrfToken: string, body?: object): RequestInit {
  return { method, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}) };
}

export function fetchProperties(signal: AbortSignal): Promise<Property[]> {
  return request("", { signal });
}

export function createProperty(input: PropertyDetails & { type: PropertyType }, csrfToken: string): Promise<Property> {
  return request("", mutation("POST", csrfToken, input));
}

export function updateProperty(id: string, details: PropertyDetails, csrfToken: string): Promise<Property> {
  return request(`/${encodeURIComponent(id)}`, mutation("PATCH", csrfToken, details));
}

export function setPropertyActive(id: string, isActive: boolean, csrfToken: string): Promise<Property> {
  return request(`/${encodeURIComponent(id)}/activation`, mutation("POST", csrfToken, { isActive }));
}

export function deleteProperty(id: string, csrfToken: string): Promise<{ deleted: true }> {
  return request(`/${encodeURIComponent(id)}`, mutation("DELETE", csrfToken));
}
