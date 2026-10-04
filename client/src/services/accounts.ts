import type { AuthUser } from "@/services/auth";

export type SystemRoleCode = "ICPDP_OFFICER" | "ICPDP_HEAD" | "ATTENDANCE_UNLOCK";

export interface AdminUserPage {
  items: Array<{ user: AuthUser; systemRoles: string[] }>;
  total: number;
}

export type AccountAction =
  | { kind: "grant" | "revoke"; userId: string; roleCode: SystemRoleCode; reason: string }
  | { kind: "lock" | "unlock"; userId: string; reason: string };

async function accountRequest(path: string, method: "POST" | "DELETE", csrfToken: string,
  body: object): Promise<void> {
  const response = await fetch(path, {
    method, credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(result?.message ?? `HTTP ${response.status}`);
  }
}

export async function fetchAdminUsers(search: string, signal: AbortSignal): Promise<AdminUserPage> {
  const params = new URLSearchParams({ search });
  const response = await fetch(`/api/v1/admin/users?${params}`, { signal, credentials: "same-origin" });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(result?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: AdminUserPage } = await response.json();
  return body.data;
}

export async function applyAccountAction(action: AccountAction, csrfToken: string): Promise<void> {
  const base = `/api/v1/admin/users/${encodeURIComponent(action.userId)}`;
  if (action.kind === "grant") {
    await accountRequest(`${base}/roles`, "POST", csrfToken,
      { roleCode: action.roleCode, reason: action.reason });
  } else if (action.kind === "revoke") {
    await accountRequest(`${base}/roles/${encodeURIComponent(action.roleCode)}`, "DELETE", csrfToken,
      { reason: action.reason });
  } else {
    await accountRequest(`${base}/${action.kind}`, "POST", csrfToken, { reason: action.reason });
  }
}
