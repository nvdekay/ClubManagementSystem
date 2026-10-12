export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  accountState: "Active" | "Locked";
  lockReason?: string;
}

export interface Workspace {
  kind: "student" | "icpdp" | "club";
  clubId?: string;
  clubName?: string;
  role?: "leader" | "member" | "founder";
  permissions: string[];
}

export interface Me {
  user: AuthUser;
  csrfToken: string;
  systemRoles: string[];
  workspaces: Workspace[];
}

export async function fetchMe(signal: AbortSignal): Promise<Me | null> {
  const response = await fetch("/api/v1/auth/me", { signal, credentials: "same-origin" });
  // Auth routes are intentionally absent until OAuth credentials are configured.
  if (response.status === 401 || response.status === 404) return null;
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: Me } = await response.json();
  return body.data;
}

export async function logout(csrfToken: string): Promise<void> {
  const response = await fetch("/api/v1/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-CSRF-Token": csrfToken },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
}

export function googleLoginUrl(returnTo: string): string {
  const params = new URLSearchParams({ returnTo });
  return `/api/v1/auth/login?${params.toString()}`;
}

export async function fetchLoginError(signal: AbortSignal): Promise<string | null> {
  const response = await fetch("/api/v1/auth/error", { signal, credentials: "same-origin" });
  if (!response.ok) return null;
  const body: { data: { reason: string | null } } = await response.json();
  return body.data.reason;
}
