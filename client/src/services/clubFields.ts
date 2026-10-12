export interface ClubFieldUsage {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  clubCount: number;
  applicationCount: number;
}

export interface ClubFieldInput {
  name: string;
  sortOrder: number;
}

export type ClubFieldRemoval = "deleted" | "deactivated";

/** 409 from the server: another field already uses this name. */
export class DuplicateClubFieldError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateClubFieldError";
  }
}

async function failure(response: Response): Promise<never> {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  const message = body?.message ?? `HTTP ${response.status}`;
  if (response.status === 409) throw new DuplicateClubFieldError(message);
  throw new Error(message);
}

async function mutate<T>(path: string, method: "POST" | "PATCH" | "DELETE", csrfToken: string,
  body?: ClubFieldInput): Promise<T> {
  const response = await fetch(path, {
    method, credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) return failure(response);
  const result: { data: T } = await response.json();
  return result.data;
}

export async function fetchClubFields(signal: AbortSignal): Promise<ClubFieldUsage[]> {
  const response = await fetch("/api/v1/admin/club-fields", { signal, credentials: "same-origin" });
  if (!response.ok) return failure(response);
  const body: { data: ClubFieldUsage[] } = await response.json();
  return body.data;
}

export function createClubField(input: ClubFieldInput, csrfToken: string) {
  return mutate<ClubFieldUsage>("/api/v1/admin/club-fields", "POST", csrfToken, input);
}

export function updateClubField(id: string, input: ClubFieldInput, csrfToken: string) {
  return mutate<ClubFieldUsage>(`/api/v1/admin/club-fields/${encodeURIComponent(id)}`, "PATCH",
    csrfToken, input);
}

export async function removeClubField(id: string, csrfToken: string): Promise<ClubFieldRemoval> {
  const result = await mutate<{ result: ClubFieldRemoval }>(
    `/api/v1/admin/club-fields/${encodeURIComponent(id)}`, "DELETE", csrfToken);
  return result.result;
}
