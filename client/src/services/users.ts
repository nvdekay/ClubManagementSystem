export interface User {
  id: string;
  email: string;
  name: string;
  /** ISO timestamp — Dates serialize to strings in JSON. */
  createdAt: string;
}

export interface UserPage {
  items: User[];
  /** Total matches across all pages — drives the table's page count. */
  total: number;
}

export async function fetchUsers({
  search,
  limit,
  offset,
  signal,
}: {
  search?: string;
  limit?: number;
  offset?: number;
  signal: AbortSignal;
}): Promise<UserPage> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (limit) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  const qs = params.size ? `?${params}` : "";
  const res = await fetch(`/api/v1/users${qs}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body: { data: UserPage } = await res.json();
  return body.data;
}

export async function createUser(input: { email: string; name: string }): Promise<User> {
  const res = await fetch("/api/v1/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    // Error bodies aren't always JSON (proxy errors, HTML 404s) — don't let .json() throw.
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "");
  }
  const body: { data: User } = await res.json();
  return body.data;
}
