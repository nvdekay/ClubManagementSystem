import { apiFetch } from '@/services/apiError'

export type FundingDecision = 'NOT_SPONSORED' | 'BEFORE_EVENT' | 'AFTER_EVENT'
export type PaymentChannel = 'VIA_OFFICER_ADVANCE' | 'VIA_OFFICER_REIMBURSE' | 'DIRECT_VENDOR'
export const DIRECT_VENDOR_THRESHOLD_VND = 5_000_000
export const MAX_INVOICE_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_INVOICE_PDF_BYTES = 10 * 1024 * 1024

export interface VendorBankInfo {
  vendorName: string
  accountHolder: string
  accountNumber: string
  bankName: string
  bankBranch?: string
  transferNote?: string
}

export interface SchoolRefundAccount {
  accountHolder: string
  accountNumber: string
  bankName: string
  bankBranch?: string
  transferNote?: string
}

export interface RefundAccountInfo {
  refundAmount: number
  account: SchoolRefundAccount
}

export interface InvoiceImage {
  id: string
  fileName: string
  mimeType: string
  bytes: number
}

export type SponsoredItemStatus =
  | 'AwaitingAdvance'
  | 'AdvanceSent'
  | 'Draft'
  | 'Submitted'
  | 'Returned'
  | 'Accepted'
  | 'RefundPending'
  | 'RefundSubmitted'
  | 'Reconciled'
  | 'Rejected'
  | 'Expired'
  | 'Paid'

export interface SponsoredItem {
  id: string
  category: string
  fundingDecision: FundingDecision
  paymentChannel?: PaymentChannel
  vendorBankInfo?: VendorBankInfo
  approvedAmount: number
  approvedAt: string
  eventEndAt: string
  status: SponsoredItemStatus
  amount: number
  description: string
  images: InvoiceImage[]
  advanceAmount?: number
  advancedAt?: string
  advancedBy?: string
  advanceReceivedAt?: string
  advanceReceivedBy?: string
  submittedAt?: string
  payable?: number
  validAmount?: number
  reconciliationDelta?: number
  reviewReason?: string
  refundAmount?: number
  refundProofs?: InvoiceImage[]
  refundNote?: string
  refundSubmittedAt?: string
  refundReviewReason?: string
  refundConfirmedAt?: string
  refundConfirmedBy?: string
  paidAt?: string
  paidBy?: string
  reason?: string
}

export interface SponsoredBudget {
  id: string
  eventId: string
  clubId: string
  eventState: string
  revision: number
  items: SponsoredItem[]
}

export type ItemAction =
  | {
      kind: 'save'
      amount: number
      description: string
      paymentChannel?: 'VIA_OFFICER_REIMBURSE' | 'DIRECT_VENDOR'
      vendorBankInfo?: VendorBankInfo
    }
  | { kind: 'removeImage'; imageId: string }
  | { kind: 'submit' }
  | { kind: 'return'; reason: string }
  | { kind: 'review'; validAmount: number; reason: string }
  | { kind: 'recordAdvance' }
  | { kind: 'confirmAdvanceReceived' }
  | { kind: 'pay' }
  | { kind: 'confirmVendorPaid' }
  | { kind: 'removeRefundImage'; imageId: string }
  | { kind: 'submitRefund'; note?: string }
  | { kind: 'returnRefund'; reason: string }
  | { kind: 'confirmRefund'; reason?: string }

// Suy ra kênh giải ngân hiện hành của hạng mục
export function resolvePaymentChannel(
  item: Pick<SponsoredItem, 'fundingDecision' | 'approvedAmount' | 'paymentChannel'>,
): PaymentChannel | undefined {
  if (item.fundingDecision === 'NOT_SPONSORED') {
    return undefined
  }
  if (item.fundingDecision === 'BEFORE_EVENT') {
    return 'VIA_OFFICER_ADVANCE'
  }
  if (item.approvedAmount >= DIRECT_VENDOR_THRESHOLD_VND) {
    return 'DIRECT_VENDOR'
  }
  return item.paymentChannel === 'DIRECT_VENDOR' ? 'DIRECT_VENDOR' : 'VIA_OFFICER_REIMBURSE'
}

// Dựng đường dẫn mục hoá đơn của ngân sách, theo CLB hoặc admin
function base(id: string, clubId?: string): string {
  return `/api/v1/${clubId ? `clubs/${clubId}` : 'admin'}/budgets/${id}/items`
}

// Đọc trường data của response, ném lỗi nếu thất bại
async function data<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as { data?: T; message?: string } | null
  if (!response.ok || !body || body.data === undefined) {
    throw new Error(body?.message ?? 'Unable to process invoice request')
  }
  return body.data
}

// GET các mục tài trợ của ngân sách; null nếu không có
export async function fetchSponsoredBudget(
  id: string,
  clubId?: string,
  signal?: AbortSignal,
): Promise<SponsoredBudget | null> {
  const response = await apiFetch(base(id, clubId), { credentials: 'include', signal })
  if (response.status === 404) {
    return null
  }
  return data<SponsoredBudget>(response)
}

// POST /actions: thao tác trên một mục hoá đơn tài trợ
export async function changeSponsoredItem(
  id: string,
  clubId: string | undefined,
  itemId: string,
  revision: number,
  action: ItemAction,
  csrfToken: string,
): Promise<SponsoredBudget> {
  return data(
    await apiFetch(`${base(id, clubId)}/${itemId}/actions`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ revision, action }),
    }),
  )
}

// POST /images: tải tệp chứng từ (JPG/PNG/PDF) của một mục (hóa đơn hoặc biên lai hoàn trả)
export async function uploadInvoiceImage(
  id: string,
  clubId: string,
  itemId: string,
  revision: number,
  file: File,
  csrfToken: string,
  target: 'invoice' | 'refund' = 'invoice',
): Promise<SponsoredBudget> {
  const query = new URLSearchParams({
    revision: String(revision),
    fileName: file.name,
    ...(target === 'refund' ? { target: 'refund' } : {}),
  })
  return data(
    await apiFetch(`${base(id, clubId)}/${itemId}/images?${query}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': file.type, 'X-CSRF-Token': csrfToken },
      body: file,
    }),
  )
}

// GET /refund-account: lấy thông tin tài khoản hoàn trả của nhà trường (chỉ cấp khi CLB thực hiện hoàn trả)
export async function fetchRefundAccount(
  id: string,
  clubId: string,
  itemId: string,
  signal?: AbortSignal,
): Promise<RefundAccountInfo> {
  return data<RefundAccountInfo>(
    await apiFetch(`${base(id, clubId)}/${itemId}/refund-account`, {
      credentials: 'include',
      signal,
    }),
  )
}

// GET link xem hoặc tải xuống tệp chứng từ
export async function fetchInvoiceImageUrl(
  id: string,
  clubId: string | undefined,
  itemId: string,
  imageId: string,
  signal?: AbortSignal,
  download = false,
): Promise<{ url: string; fileName?: string; mimeType?: string }> {
  const suffix = download ? '?download=1' : ''
  return data(
    await apiFetch(`${base(id, clubId)}/${itemId}/images/${imageId}${suffix}`, {
      credentials: 'include',
      signal,
    }),
  )
}
