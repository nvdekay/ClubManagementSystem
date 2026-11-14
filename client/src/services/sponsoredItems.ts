import { apiFetch } from "@/services/apiError";

export type FundingDecision = "NOT_SPONSORED" | "BEFORE_EVENT" | "AFTER_EVENT";
export interface InvoiceImage { id: string; fileName: string; mimeType: string; bytes: number }
export interface SponsoredItem {
  id: string; category: string; fundingDecision: FundingDecision; approvedAmount: number;
  approvedAt: string; eventEndAt: string; status: "Draft" | "Submitted" | "Returned" | "Accepted" | "Rejected" | "Expired" | "Paid"; amount: number; description: string;
  images: InvoiceImage[]; payable?: number; validAmount?: number; reviewReason?: string;
  paidAt?: string; reason?: string;
}
export interface SponsoredBudget { id: string; eventId: string; clubId: string; eventState: string; revision: number; items: SponsoredItem[] }
export type ItemAction =
  | { kind: "save"; amount: number; description: string }
  | { kind: "removeImage"; imageId: string }
  | { kind: "submit" }
  | { kind: "return"; reason: string }
  | { kind: "review"; validAmount: number; reason: string }
  | { kind: "pay"; amount: number; paidAt: string; paymentReference: string };

function base(id: string, clubId?: string): string {
  return `/api/v1/${clubId ? `clubs/${clubId}` : "admin"}/budgets/${id}/items`;
}
async function data<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { data?: T; message?: string } | null;
  if (!response.ok || !body || body.data === undefined) throw new Error(body?.message ?? "Unable to process invoice request");
  return body.data;
}
export async function fetchSponsoredBudget(id: string, clubId?: string, signal?: AbortSignal): Promise<SponsoredBudget | null> {
  const response = await apiFetch(base(id, clubId), { credentials: "include", signal });
  if (response.status === 404) return null;
  return data<SponsoredBudget>(response);
}
export async function changeSponsoredItem(id: string, clubId: string | undefined, itemId: string,
  revision: number, action: ItemAction, csrfToken: string): Promise<SponsoredBudget> {
  return data(await apiFetch(`${base(id, clubId)}/${itemId}/actions`, { method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ revision, action }) }));
}
export async function uploadInvoiceImage(id: string, clubId: string, itemId: string,
  revision: number, file: File, csrfToken: string): Promise<SponsoredBudget> {
  const query = new URLSearchParams({ revision: String(revision), fileName: file.name });
  return data(await apiFetch(`${base(id, clubId)}/${itemId}/images?${query}`, { method: "POST", credentials: "include",
    headers: { "Content-Type": file.type, "X-CSRF-Token": csrfToken }, body: file }));
}
export async function fetchInvoiceImageUrl(id: string, clubId: string | undefined,
  itemId: string, imageId: string, signal?: AbortSignal): Promise<{ url: string }> {
  return data(await apiFetch(`${base(id, clubId)}/${itemId}/images/${imageId}`, { credentials: "include", signal }));
}
