import { DomainError } from "./errors.js";

export const FUNDING_DECISIONS = ["NOT_SPONSORED", "BEFORE_EVENT", "AFTER_EVENT"] as const;
export type FundingDecision = (typeof FUNDING_DECISIONS)[number];
export const MAX_INVOICE_IMAGES = 5;
export const MAX_INVOICE_IMAGE_BYTES = 5 * 1024 * 1024;
export type InvoiceStatus = "Draft" | "Submitted" | "Returned" | "Accepted" | "Rejected" | "Expired" | "Paid";

export interface InvoiceImage {
  id: string;
  assetId: string;
  fileName: string;
  mimeType: "image/jpeg" | "image/png";
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
  reason?: string;
  approvedAt: string;
  eventEndAt: string;
  status: InvoiceStatus;
  amount: number;
  description: string;
  images: InvoiceImage[];
  submittedAt?: string;
  validAmount?: number;
  payable?: number;
  reviewReason?: string;
  paidAt?: string;
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
  | { kind: "save"; amount: number; description: string }
  | { kind: "image"; image: InvoiceImage }
  | { kind: "removeImage"; imageId: string }
  | { kind: "submit" }
  | { kind: "return"; reason: string }
  | { kind: "review"; validAmount: number; reason: string }
  /** The club confirms it received the money; the accountant who transfers it is outside the system. */
  | { kind: "pay" };

export interface SponsoredItemRepository {
  find(budgetId: string, clubId?: string): Promise<SponsoredBudget | null>;
  act(budgetId: string, itemId: string, revision: number, actorId: string,
    clubId: string | undefined, action: SponsoredItemAction, now: Date): Promise<SponsoredBudget>;
}

const CLUB_EDIT_ACTIONS = ["save", "image", "removeImage", "submit"];
// Kiểm tra thao tác có thuộc về CLB hay thuộc về ICPDP
/** Actions the club performs; every other action belongs to the ICPDP officer. */
export function isClubAction(action: SponsoredItemAction): boolean {
  return action.kind === "pay" || CLUB_EDIT_ACTIONS.includes(action.kind);
}

// Áp dụng một thao tác lên khoản chi tài trợ và trả về trạng thái mới
export function changeSponsoredItem(item: SponsoredItem, action: SponsoredItemAction, now: Date): SponsoredItem {
  const next = { ...item, images: [...item.images] };
  if (CLUB_EDIT_ACTIONS.includes(action.kind)) assertInvoiceEditable(item, now);
  switch (action.kind) {
    case "save":
      if (!Number.isSafeInteger(action.amount) || action.amount <= 0 || action.description.length > 2000) {
        throw new DomainError("invalid expense fields", "validation");
      }
      next.amount = action.amount;
      next.description = action.description.trim();
      break;
    case "image":
      if (item.images.length >= MAX_INVOICE_IMAGES) throw new DomainError("at most five images per item", "conflict");
      if (item.images.some((image) => image.digest === action.image.digest)) throw new DomainError("duplicate invoice image", "conflict");
      next.images.push(action.image);
      break;
    case "removeImage":
      if (!item.images.some((image) => image.id === action.imageId)) throw new DomainError("invoice image not found", "not_found");
      next.images = item.images.filter((image) => image.id !== action.imageId);
      break;
    case "submit":
      assertInvoiceSubmission(item, now);
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
      next.status = next.payable > 0 ? "Accepted" : "Rejected";
      break;
    case "pay":
      if (item.status !== "Accepted" || !item.payable || item.paidAt) {
        throw new DomainError("this item is not awaiting payment", "conflict");
      }
      next.status = "Paid";
      next.paidAt = now.toISOString();
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

// Đảm bảo bộ hoá đơn có số tiền, ảnh hợp lệ và sự kiện đã kết thúc trước khi nộp
export function assertInvoiceSubmission(item: SponsoredItem, now: Date): void {
  assertInvoiceEditable(item, now);
  if (item.fundingDecision === "NOT_SPONSORED") {
    throw new DomainError("this item is not sponsored", "conflict");
  }
  if (item.fundingDecision === "AFTER_EVENT" && now < new Date(item.eventEndAt)) {
    throw new DomainError("submit this invoice pack after the event ends", "conflict");
  }
  if (!Number.isSafeInteger(item.amount) || item.amount <= 0 || !item.images.length
    || item.images.length > MAX_INVOICE_IMAGES) {
    throw new DomainError("a positive expense amount and one to five invoice images are required", "validation");
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

// Kiểm tra ảnh hoá đơn tải lên là JPEG hoặc PNG đúng nội dung
export function validateInvoiceImage(mimeType: string, bytes: Uint8Array): "image/jpeg" | "image/png" {
  const png = [137, 80, 78, 71, 13, 10, 26, 10];
  const valid = mimeType === "image/png"
    ? bytes.length >= png.length && png.every((value, index) => bytes[index] === value)
    : mimeType === "image/jpeg" && bytes.length >= 3
      && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!valid || bytes.length > MAX_INVOICE_IMAGE_BYTES) {
    throw new DomainError("invoice images must be JPG or PNG and at most 5 MiB", "validation");
  }
  return mimeType as "image/jpeg" | "image/png";
}
