import { ApiError, apiFetch } from "@/services/apiError";
import type { AuthUser } from "@/services/auth";

export type SystemRoleCode = "ICPDP_OFFICER" | "ICPDP_HEAD" | "ATTENDANCE_UNLOCK";

export interface AdminUserClub {
  clubId: string;
  clubName: string;
  membershipState: string;
  positions: string[];
}

export interface AdminUserPage {
  items: Array<{ user: AuthUser; systemRoles: string[]; clubs: AdminUserClub[];
    lockCase?: { violationId: string; title: string; clubName: string } }>;
  total: number;
  page: number;
  pageSize: number;
}

export type AccountAction =
  | { kind: "grant" | "revoke"; userId: string; roleCode: SystemRoleCode; reason: string }
  | { kind: "lock"; userId: string; reason: string; violationId?: string }
  | { kind: "unlock"; userId: string; reason: string };

async function accountRequest(path: string, method: "POST" | "DELETE", csrfToken: string,
  body: object): Promise<void> {
  const response = await apiFetch(path, {
    method, credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(result?.message ?? `HTTP ${response.status}`);
  }
}

export async function fetchAdminUsers(search: string, page: number, pageSize: number,
  signal: AbortSignal): Promise<AdminUserPage> {
  const params = new URLSearchParams({ search, page: String(page), pageSize: String(pageSize) });
  const response = await apiFetch(`/api/v1/admin/users?${params}`, { signal, credentials: "same-origin" });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(result?.message ?? `HTTP ${response.status}`);
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
  } else if (action.kind === "lock") {
    await accountRequest(`${base}/lock`, "POST", csrfToken,
      { reason: action.reason, ...(action.violationId ? { violationId: action.violationId } : {}) });
  } else {
    await accountRequest(`${base}/unlock`, "POST", csrfToken, { reason: action.reason });
  }
}
