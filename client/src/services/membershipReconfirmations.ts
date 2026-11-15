import { ApiError, apiFetch } from "@/services/apiError";
export interface Reconfirmation { id: string; clubName: string; periodCode: string; dueAt: string; state: "Pending" | "Confirmed" | "Exempt" | "Expired" }
// Gọi API /memberships/reconfirmations và trả về data, ném ApiError nếu lỗi
async function request<T>(path: string, init: RequestInit): Promise<T> {
  const r = await apiFetch(`/api/v1/memberships/reconfirmations${path}`, { credentials: "same-origin", ...init });
  if (!r.ok) { const b = await r.json().catch(() => null) as { message?: string } | null; throw new ApiError(b?.message ?? `HTTP ${r.status}`); }
  return (await r.json() as { data: T }).data;
}
// GET các yêu cầu xác nhận lại thành viên của tôi
export function fetchReconfirmations(signal: AbortSignal): Promise<Reconfirmation[]> { return request("/mine", { signal }); }
// POST xác nhận tiếp tục là thành viên CLB
export function confirmReconfirmation(id: string, csrfToken: string): Promise<Reconfirmation> { return request(`/${encodeURIComponent(id)}/confirm`, { method: "POST", headers: { "X-CSRF-Token": csrfToken } }); }
