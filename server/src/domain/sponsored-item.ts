import { DomainError } from "./errors.js";

export const FUNDING_DECISIONS = ["NOT_SPONSORED", "BEFORE_EVENT", "AFTER_EVENT"] as const;
export type FundingDecision = (typeof FUNDING_DECISIONS)[number];
export const PAYMENT_CHANNELS = ["VIA_OFFICER_ADVANCE", "VIA_OFFICER_REIMBURSE", "DIRECT_VENDOR"] as const;
export type PaymentChannel = (typeof PAYMENT_CHANNELS)[number];
export const DIRECT_VENDOR_THRESHOLD_VND = 5_000_000;
export const INVOICE_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
export type InvoiceMimeType = (typeof INVOICE_MIME_TYPES)[number];
export const MAX_INVOICE_IMAGES = 5;
export const MAX_INVOICE_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_INVOICE_PDF_BYTES = 10 * 1024 * 1024;
export type InvoiceStatus =
  | "AwaitingAdvance"
  | "AdvanceSent"
  | "Draft"
  | "Submitted"
  | "Returned"
  | "Accepted"
  | "RefundPending"
  | "RefundSubmitted"
  | "Reconciled"
  | "Rejected"
  | "Expired"
  | "Paid";

export interface VendorBankInfo {
  vendorName: string;
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  bankBranch?: string;
  transferNote?: string;
}

export interface InvoiceImage {
  id: string;
  assetId: string;
  fileName: string;
  mimeType: InvoiceMimeType;
  bytes: number;
  digest: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface SponsoredItem {
  id: string;
  category: string;
  expenseId?: string;
  requestedAmount: number;
  approvedAmount: number;
  fundingDecision: FundingDecision;
  paymentChannel?: PaymentChannel;
  vendorBankInfo?: VendorBankInfo;
  reason?: string;
  approvedAt: string;
  eventEndAt: string;
  status: InvoiceStatus;
  amount: number;
  description: string;
  images: InvoiceImage[];
  advanceAmount?: number;
  advancedAt?: string;
  advancedBy?: string;
  advanceReceivedAt?: string;
  advanceReceivedBy?: string;
  submittedAt?: string;
  validAmount?: number;
  payable?: number;
  reconciliationDelta?: number;
  reviewReason?: string;
  refundAmount?: number;
  refundProofs?: InvoiceImage[];
  refundNote?: string;
  refundSubmittedAt?: string;
  refundReviewReason?: string;
  refundConfirmedAt?: string;
  refundConfirmedBy?: string;
  paidAt?: string;
  paidBy?: string;
  paymentReference?: string;
}

export interface SponsoredBudget {
  id: string;
  eventId: string;
  clubId: string;
  eventState: string;
  revision: number;
  items: SponsoredItem[];
}

export type SponsoredItemAction =
  | {
      kind: "save";
      amount: number;
      description: string;
      paymentChannel?: "VIA_OFFICER_REIMBURSE" | "DIRECT_VENDOR";
      vendorBankInfo?: VendorBankInfo;
    }
  | { kind: "image"; image: InvoiceImage }
  | { kind: "removeImage"; imageId: string }
  | { kind: "submit" }
  | { kind: "return"; reason: string }
  | { kind: "review"; validAmount: number; reason: string }
  /** ICPDP confirms school advance has been transferred to the club (BEFORE_EVENT, no invoice required beforehand). */
  | { kind: "recordAdvance" }
  /** Club confirms receipt of the advance from the ICPDP officer (BEFORE_EVENT). */
  | { kind: "confirmAdvanceReceived" }
  /** Club confirms receipt of officer reimbursement (AFTER_EVENT < 5M self-paid). */
  | { kind: "pay" }
  /** ICPDP confirms school has directly paid the vendor after reviewing contract and bank details. */
  | { kind: "confirmVendorPaid" }
  /** Club uploads a refund transfer receipt for a BEFORE_EVENT item in RefundPending. */
  | { kind: "refundImage"; image: InvoiceImage }
  /** Club removes a refund transfer receipt while in RefundPending. */
  | { kind: "removeRefundImage"; imageId: string }
  /** Club submits refund transfer receipts for ICPDP verification. */
  | { kind: "submitRefund"; note?: string }
  /** ICPDP returns a refund submission for re-uploading receipts. */
  | { kind: "returnRefund"; reason: string }
  /** ICPDP confirms school has received the club's refund transfer. */
  | { kind: "confirmRefund"; reason?: string };

export interface SponsoredItemRepository {
  find(budgetId: string, clubId?: string): Promise<SponsoredBudget | null>;
  act(
    budgetId: string,
    itemId: string,
    revision: number,
    actorId: string,
    clubId: string | undefined,
    action: SponsoredItemAction,
    now: Date,
  ): Promise<SponsoredBudget>;
}

const CLUB_EDIT_ACTIONS = ["save", "image", "removeImage", "submit"];

// Xác định kênh giải ngân mặc định khi duyệt ngân sách
export function initialPaymentChannel(
  fundingDecision: FundingDecision,
  approvedAmount: number,
): PaymentChannel | undefined {
  if (fundingDecision === "NOT_SPONSORED") return undefined;
  if (fundingDecision === "BEFORE_EVENT") return "VIA_OFFICER_ADVANCE";
  return approvedAmount >= DIRECT_VENDOR_THRESHOLD_VND ? "DIRECT_VENDOR" : "VIA_OFFICER_REIMBURSE";
}

// Xác định trạng thái ban đầu của hạng mục khi duyệt ngân sách
export function initialSponsoredItemStatus(fundingDecision: FundingDecision): InvoiceStatus {
  return fundingDecision === "BEFORE_EVENT" ? "AwaitingAdvance" : "Draft";
}

// Suy ra kênh giải ngân hiệu lực của hạng mục (tương thích dữ liệu cũ chưa lưu paymentChannel)
export function resolvePaymentChannel(
  item: Pick<SponsoredItem, "fundingDecision" | "approvedAmount" | "paymentChannel">,
): PaymentChannel | undefined {
  if (item.fundingDecision === "NOT_SPONSORED") return undefined;
  if (item.fundingDecision === "BEFORE_EVENT") return "VIA_OFFICER_ADVANCE";
  if (item.approvedAmount >= DIRECT_VENDOR_THRESHOLD_VND) return "DIRECT_VENDOR";
  return item.paymentChannel === "DIRECT_VENDOR" ? "DIRECT_VENDOR" : "VIA_OFFICER_REIMBURSE";
}

// Kiểm tra và chuẩn hóa thông tin chuyển khoản nhà cung cấp
export function normalizeVendorBankInfo(input: VendorBankInfo): VendorBankInfo {
  const vendorName = input.vendorName.trim();
  const accountHolder = input.accountHolder.trim();
  const accountNumber = input.accountNumber.trim();
  const bankName = input.bankName.trim();
  const bankBranch = input.bankBranch?.trim() || undefined;
  const transferNote = input.transferNote?.trim() || undefined;
  if (
    !vendorName || vendorName.length > 200
    || !accountHolder || accountHolder.length > 200
    || !accountNumber || accountNumber.length > 50 || !/^[0-9A-Za-z -]+$/.test(accountNumber)
    || !bankName || bankName.length > 200
    || (bankBranch && bankBranch.length > 200)
    || (transferNote && transferNote.length > 500)
  ) {
    throw new DomainError("invalid vendor bank transfer details", "validation");
  }
  return {
    vendorName,
    accountHolder,
    accountNumber,
    bankName,
    ...(bankBranch ? { bankBranch } : {}),
    ...(transferNote ? { transferNote } : {}),
  };
}

const CLUB_REFUND_ACTIONS = ["refundImage", "removeRefundImage", "submitRefund"];

// Kiểm tra hạng mục có được phép truy cập thông tin tài khoản hoàn trả của nhà trường hay không
export function canAccessRefundAccount(
  item: Pick<SponsoredItem, "fundingDecision" | "status" | "refundAmount">,
): boolean {
  return item.fundingDecision === "BEFORE_EVENT"
    && (item.status === "RefundPending" || item.status === "RefundSubmitted")
    && (item.refundAmount ?? 0) > 0;
}

// Kiểm tra thao tác có thuộc về CLB hay thuộc về ICPDP
/** Các thao tác do CLB thực hiện; mọi thao tác còn lại thuộc về cán bộ ICPDP. */
export function isClubAction(action: SponsoredItemAction): boolean {
  return action.kind === "pay"
    || action.kind === "confirmAdvanceReceived"
    || CLUB_EDIT_ACTIONS.includes(action.kind)
    || CLUB_REFUND_ACTIONS.includes(action.kind);
}

// Áp dụng một thao tác lên khoản chi tài trợ và trả về trạng thái mới
export function changeSponsoredItem(
  item: SponsoredItem,
  action: SponsoredItemAction,
  now: Date,
  actorId?: string,
): SponsoredItem {
  const next: SponsoredItem = {
    ...item,
    images: [...item.images],
    ...(item.refundProofs ? { refundProofs: [...item.refundProofs] } : {}),
  };
  if (CLUB_EDIT_ACTIONS.includes(action.kind)) assertInvoiceEditable(item, now);
  switch (action.kind) {
    case "recordAdvance":
      if (item.fundingDecision !== "BEFORE_EVENT" || item.status !== "AwaitingAdvance" || item.advancedAt) {
        throw new DomainError("this item is not awaiting a pre-event advance", "conflict");
      }
      next.paymentChannel = "VIA_OFFICER_ADVANCE";
      next.status = "AdvanceSent";
      next.advanceAmount = item.approvedAmount;
      next.advancedAt = now.toISOString();
      if (actorId) next.advancedBy = actorId;
      break;
    case "confirmAdvanceReceived":
      if (item.fundingDecision !== "BEFORE_EVENT" || item.status !== "AdvanceSent" || item.advanceReceivedAt) {
        throw new DomainError("this item is not awaiting advance receipt confirmation", "conflict");
      }
      next.paymentChannel = "VIA_OFFICER_ADVANCE";
      next.status = "Draft";
      next.advanceReceivedAt = now.toISOString();
      if (actorId) next.advanceReceivedBy = actorId;
      break;
    case "save":
      if (!Number.isSafeInteger(action.amount) || action.amount <= 0 || action.description.length > 2000) {
        throw new DomainError("invalid expense fields", "validation");
      }
      next.amount = action.amount;
      next.description = action.description.trim();
      if (item.fundingDecision === "AFTER_EVENT") {
        if (item.approvedAmount >= DIRECT_VENDOR_THRESHOLD_VND) {
          if (action.paymentChannel === "VIA_OFFICER_REIMBURSE") {
            throw new DomainError("items of 5,000,000 VND or more require a direct vendor contract", "validation");
          }
          next.paymentChannel = "DIRECT_VENDOR";
        } else {
          next.paymentChannel = action.paymentChannel ?? resolvePaymentChannel(item);
        }
        if (next.paymentChannel === "DIRECT_VENDOR") {
          if (action.vendorBankInfo !== undefined) {
            next.vendorBankInfo = normalizeVendorBankInfo(action.vendorBankInfo);
          }
        } else {
          delete next.vendorBankInfo;
        }
      } else if (item.fundingDecision === "BEFORE_EVENT") {
        next.paymentChannel = "VIA_OFFICER_ADVANCE";
        delete next.vendorBankInfo;
      }
      break;
    case "image":
      if (item.images.length >= MAX_INVOICE_IMAGES) throw new DomainError("at most five attachments per item", "conflict");
      if (item.images.some((image) => image.digest === action.image.digest)) throw new DomainError("duplicate invoice attachment", "conflict");
      next.images.push(action.image);
      break;
    case "removeImage":
      if (!item.images.some((image) => image.id === action.imageId)) throw new DomainError("invoice attachment not found", "not_found");
      next.images = item.images.filter((image) => image.id !== action.imageId);
      break;
    case "submit":
      assertInvoiceSubmission(item, now);
      next.paymentChannel = resolvePaymentChannel(item);
      next.status = "Submitted";
      next.submittedAt = now.toISOString();
      break;
    case "return":
      if (item.status !== "Submitted" || now >= invoiceDeadline(item)) throw new DomainError("invoice pack cannot be returned after its deadline", "conflict");
      if (!action.reason.trim() || action.reason.length > 2000) throw new DomainError("a correction reason is required", "validation");
      next.status = "Returned";
      next.reviewReason = action.reason.trim();
      break;
    case "review":
      if (!action.reason.trim() || action.reason.length > 2000) throw new DomainError("a review reason is required", "validation");
      next.payable = invoicePayable(item, action.validAmount);
      next.validAmount = action.validAmount;
      next.reviewReason = action.reason.trim();
      if (item.fundingDecision === "BEFORE_EVENT") {
        const advanced = item.advanceAmount ?? item.approvedAmount;
        next.reconciliationDelta = next.payable - advanced;
        if (next.reconciliationDelta < 0) {
          next.refundAmount = advanced - next.payable;
          next.refundProofs = next.refundProofs ?? [];
          next.status = "RefundPending";
        } else {
          delete next.refundAmount;
          next.status = "Reconciled";
        }
      } else {
        next.status = next.payable > 0 ? "Accepted" : "Rejected";
      }
      break;
    case "refundImage": {
      if (item.fundingDecision !== "BEFORE_EVENT" || item.status !== "RefundPending" || !(item.refundAmount && item.refundAmount > 0)) {
        throw new DomainError("this item is not awaiting a refund transfer", "conflict");
      }
      const proofs = next.refundProofs ?? [];
      if (proofs.length >= MAX_INVOICE_IMAGES) throw new DomainError("at most five refund attachments per item", "conflict");
      if (item.images.some((image) => image.digest === action.image.digest)
        || proofs.some((image) => image.digest === action.image.digest)) {
        throw new DomainError("duplicate refund attachment", "conflict");
      }
      next.refundProofs = [...proofs, action.image];
      break;
    }
    case "removeRefundImage": {
      if (item.fundingDecision !== "BEFORE_EVENT" || item.status !== "RefundPending") {
        throw new DomainError("refund attachments cannot be modified in the current state", "conflict");
      }
      const proofs = item.refundProofs ?? [];
      if (!proofs.some((image) => image.id === action.imageId)) throw new DomainError("refund attachment not found", "not_found");
      next.refundProofs = proofs.filter((image) => image.id !== action.imageId);
      break;
    }
    case "submitRefund": {
      if (item.fundingDecision !== "BEFORE_EVENT" || item.status !== "RefundPending" || !(item.refundAmount && item.refundAmount > 0)) {
        throw new DomainError("this item is not awaiting a refund submission", "conflict");
      }
      const proofs = item.refundProofs ?? [];
      if (!proofs.length || proofs.length > MAX_INVOICE_IMAGES) {
        throw new DomainError("one to five refund transfer receipts are required", "validation");
      }
      if (action.note !== undefined && action.note.length > 2000) {
        throw new DomainError("refund note must be at most 2000 characters", "validation");
      }
      next.status = "RefundSubmitted";
      next.refundSubmittedAt = now.toISOString();
      const trimmedNote = action.note?.trim();
      if (trimmedNote) next.refundNote = trimmedNote;
      else delete next.refundNote;
      delete next.refundReviewReason;
      break;
    }
    case "returnRefund":
      if (item.fundingDecision !== "BEFORE_EVENT" || item.status !== "RefundSubmitted") {
        throw new DomainError("this item does not have a submitted refund to return", "conflict");
      }
      if (!action.reason.trim() || action.reason.length > 2000) {
        throw new DomainError("a refund return reason is required", "validation");
      }
      next.status = "RefundPending";
      next.refundReviewReason = action.reason.trim();
      break;
    case "confirmRefund": {
      if (item.fundingDecision !== "BEFORE_EVENT" || item.status !== "RefundSubmitted" || item.refundConfirmedAt) {
        throw new DomainError("this item is not awaiting refund confirmation", "conflict");
      }
      if (action.reason !== undefined && action.reason.length > 2000) {
        throw new DomainError("refund confirmation note must be at most 2000 characters", "validation");
      }
      next.status = "Reconciled";
      next.refundConfirmedAt = now.toISOString();
      if (actorId) next.refundConfirmedBy = actorId;
      const trimmedReason = action.reason?.trim();
      if (trimmedReason) next.refundReviewReason = trimmedReason;
      else delete next.refundReviewReason;
      break;
    }
    case "pay":
      if (resolvePaymentChannel(item) !== "VIA_OFFICER_REIMBURSE") {
        throw new DomainError("this item is not reimbursed through the ICPDP officer", "conflict");
      }
      if (item.status !== "Accepted" || !item.payable || item.paidAt) {
        throw new DomainError("this item is not awaiting payment", "conflict");
      }
      next.status = "Paid";
      next.paidAt = now.toISOString();
      break;
    case "confirmVendorPaid":
      if (resolvePaymentChannel(item) !== "DIRECT_VENDOR") {
        throw new DomainError("this item is not paid directly to a vendor", "conflict");
      }
      if (item.status !== "Accepted" || !item.payable || item.paidAt) {
        throw new DomainError("this item is not awaiting vendor payment confirmation", "conflict");
      }
      next.status = "Paid";
      next.paidAt = now.toISOString();
      if (actorId) next.paidBy = actorId;
      break;
  }
  return next;
}

// Tính hạn nộp hoá đơn sau khi sự kiện kết thúc
export function invoiceDeadline(item: Pick<SponsoredItem, "eventEndAt">): Date {
  return new Date(new Date(item.eventEndAt).getTime() + 14 * 24 * 60 * 60 * 1000);
}

// Đảm bảo bộ hoá đơn còn được sửa (đúng trạng thái và chưa quá hạn)
export function assertInvoiceEditable(item: SponsoredItem, now: Date): void {
  if (!["Draft", "Returned"].includes(item.status) || now > invoiceDeadline(item)) {
    throw new DomainError("invoice pack is locked or its deadline has passed", "conflict");
  }
  if (now < new Date(item.approvedAt)) {
    throw new DomainError("the event has not been approved yet", "conflict");
  }
}

// Đảm bảo bộ hoá đơn có số tiền, tệp hợp lệ, thông tin chuyển khoản NCC (nếu cần) và sự kiện đã kết thúc
export function assertInvoiceSubmission(item: SponsoredItem, now: Date): void {
  assertInvoiceEditable(item, now);
  if (item.fundingDecision === "NOT_SPONSORED") {
    throw new DomainError("this item is not sponsored", "conflict");
  }
  if (item.fundingDecision === "BEFORE_EVENT" && !item.advanceReceivedAt) {
    throw new DomainError("confirm advance receipt before submitting invoices", "conflict");
  }
  if (now < new Date(item.eventEndAt)) {
    throw new DomainError("submit this invoice pack after the event ends", "conflict");
  }
  if (resolvePaymentChannel(item) === "DIRECT_VENDOR") {
    if (!item.vendorBankInfo) {
      throw new DomainError("vendor bank transfer details are required before submission", "validation");
    }
    normalizeVendorBankInfo(item.vendorBankInfo);
  }
  if (!Number.isSafeInteger(item.amount) || item.amount <= 0 || !item.images.length
    || item.images.length > MAX_INVOICE_IMAGES) {
    throw new DomainError("a positive expense amount and one to five attachments are required", "validation");
  }
}

// Tính số tiền được chi trả từ giá trị hoá đơn hợp lệ ICPDP chấp nhận
export function invoicePayable(item: SponsoredItem, validAmount: number): number {
  if (item.status !== "Submitted" || item.fundingDecision === "NOT_SPONSORED") {
    throw new DomainError("a submitted sponsored item is required", "conflict");
  }
  if (!Number.isSafeInteger(validAmount) || validAmount < 0 || validAmount > item.amount) {
    throw new DomainError("accepted invoice value must be between zero and the submitted amount", "validation");
  }
  return Math.min(validAmount, item.approvedAmount);
}

// Kiểm tra tệp chứng từ tải lên là JPG/PNG (tối đa 5 MiB) hoặc PDF (tối đa 10 MiB) đúng nội dung
export function validateInvoiceImage(mimeType: string, bytes: Uint8Array): InvoiceMimeType {
  const png = [137, 80, 78, 71, 13, 10, 26, 10];
  const pdf = [0x25, 0x50, 0x44, 0x46, 0x2d];
  if (mimeType === "application/pdf") {
    const validPdf = bytes.length >= pdf.length && pdf.every((value, index) => bytes[index] === value);
    if (!validPdf || bytes.length > MAX_INVOICE_PDF_BYTES) {
      throw new DomainError("PDF attachments must be valid PDF files and at most 10 MiB", "validation");
    }
    return "application/pdf";
  }
  const validImage = mimeType === "image/png"
    ? bytes.length >= png.length && png.every((value, index) => bytes[index] === value)
    : mimeType === "image/jpeg" && bytes.length >= 3
      && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!validImage || bytes.length > MAX_INVOICE_IMAGE_BYTES) {
    throw new DomainError("invoice images must be JPG or PNG and at most 5 MiB", "validation");
  }
  return mimeType as "image/jpeg" | "image/png";
}
