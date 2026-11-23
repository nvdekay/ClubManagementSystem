import { createHash, randomUUID } from "node:crypto";
import type { ApplicationFileStorage } from "../domain/club-application.js";
import { DomainError } from "../domain/errors.js";
import type { PolicyRepository } from "../domain/policy.js";
import {
  assertInvoiceEditable,
  canAccessRefundAccount,
  isClubAction,
  MAX_INVOICE_IMAGES,
  validateInvoiceImage,
  type SponsoredItemAction,
  type SponsoredItemRepository,
} from "../domain/sponsored-item.js";
import { assertClubAccess, type AccessActor } from "./access.js";
import { assertFinanceOfficer, financeId, type EventFinanceDeps } from "./event-finance.js";

export interface SponsoredItemDeps {
  repo: SponsoredItemRepository;
  access: EventFinanceDeps["access"];
  auth: EventFinanceDeps["auth"];
  files: ApplicationFileStorage | null;
  policy?: PolicyRepository;
}

// Xem ngân sách hạng mục tài trợ theo quyền CLB hoặc ICPDP
export async function getSponsoredBudget(deps: SponsoredItemDeps, actor: AccessActor | null,
  id: string, clubId: string | undefined, now: Date) {
  if (clubId) await assertClubAccess(deps.access, actor, financeId(clubId), "club.expense.record", now);
  else await assertFinanceOfficer(deps.auth, actor);
  const budget = await deps.repo.find(financeId(id), clubId);
  if (!budget) throw new DomainError("sponsored budget not found", "not_found");
  return budget;
}

// Thực hiện thao tác trên hạng mục tài trợ theo vai trò CLB hoặc ICPDP
export async function actOnSponsoredItem(deps: SponsoredItemDeps, actor: AccessActor | null,
  id: string, clubId: string | undefined, itemId: string, revision: number,
  action: SponsoredItemAction, now: Date) {
  await getSponsoredBudget(deps, actor, id, clubId, now);
  if (!Number.isInteger(revision) || revision < 0) throw new DomainError("invalid revision", "validation");
  if (isClubAction(action) !== Boolean(clubId)) throw new DomainError("action not allowed for this role", "forbidden");
  return deps.repo.act(id, itemId, revision, actor!.id, clubId, action, now);
}

// CLB tải ảnh/PDF chứng từ hóa đơn hoặc biên lai hoàn trả cho hạng mục, chặn tệp trùng và quá giới hạn
export async function uploadInvoiceImage(deps: SponsoredItemDeps, actor: AccessActor | null,
  id: string, clubId: string, itemId: string, revision: number,
  input: { fileName: string; mimeType: string; bytes: Buffer }, now: Date,
  target: "invoice" | "refund" = "invoice") {
  const budget = await getSponsoredBudget(deps, actor, id, clubId, now);
  const item = budget.items.find((line) => line.id === itemId);
  if (!item) throw new DomainError("budget item not found", "not_found");
  if (target === "refund") {
    if (item.fundingDecision !== "BEFORE_EVENT" || item.status !== "RefundPending" || !(item.refundAmount && item.refundAmount > 0)) {
      throw new DomainError("this item is not awaiting a refund transfer", "conflict");
    }
    if (budget.revision !== revision || (item.refundProofs?.length ?? 0) >= MAX_INVOICE_IMAGES) {
      throw new DomainError("budget changed or image limit reached", "conflict");
    }
  } else {
    assertInvoiceEditable(item, now);
    if (budget.revision !== revision || item.images.length >= MAX_INVOICE_IMAGES) {
      throw new DomainError("budget changed or image limit reached", "conflict");
    }
  }
  const mimeType = validateInvoiceImage(input.mimeType, input.bytes);
  if (!input.fileName.trim() || input.fileName.length > 200) throw new DomainError("invalid image filename", "validation");
  const digest = createHash("sha256").update(input.bytes).digest("hex");
  const hasDuplicate = budget.items.some((line) =>
    line.images.some((image) => image.digest === digest)
    || (line.refundProofs ?? []).some((image) => image.digest === digest),
  );
  if (hasDuplicate) throw new DomainError("duplicate invoice image", "conflict");
  if (!deps.files) throw new DomainError("file storage unavailable", "unavailable");
  const file = await deps.files.upload({ ownerId: actor!.id, applicationId: id,
    documentType: target === "refund" ? "REFUND_PROOF" : "INVOICE",
    fileName: input.fileName, mimeType, bytes: input.bytes, visibility: "private", now });
  const uploaded = {
    id: randomUUID(), assetId: file.assetId, fileName: input.fileName, mimeType,
    bytes: input.bytes.length, digest, uploadedAt: now.toISOString(), uploadedBy: actor!.id,
  };
  return actOnSponsoredItem(deps, actor, id, clubId, itemId, revision,
    target === "refund" ? { kind: "refundImage", image: uploaded } : { kind: "image", image: uploaded }, now);
}

// Cấp URL tạm để xem hoặc tải xuống tệp chứng từ (hóa đơn hoặc biên lai hoàn trả) của hạng mục
export async function invoiceImageUrl(deps: SponsoredItemDeps, actor: AccessActor | null,
  id: string, clubId: string | undefined, itemId: string, imageId: string, now: Date, inline = true) {
  const budget = await getSponsoredBudget(deps, actor, id, clubId, now);
  const item = budget.items.find((line) => line.id === itemId);
  const image = item?.images.find((file) => file.id === imageId)
    ?? item?.refundProofs?.find((file) => file.id === imageId);
  if (!image) throw new DomainError("invoice image not found", "not_found");
  if (!deps.files) throw new DomainError("file storage unavailable", "unavailable");
  return { url: await deps.files.accessUrl(image.assetId, { inline }), fileName: image.fileName, mimeType: image.mimeType };
}

// Chỉ trả thông tin tài khoản hoàn trả của nhà trường khi CLB có hạng mục BEFORE_EVENT đang chờ/đã gửi hoàn trả
export async function getRefundAccount(deps: SponsoredItemDeps, actor: AccessActor | null,
  id: string, clubId: string, itemId: string, now: Date) {
  const budget = await getSponsoredBudget(deps, actor, id, clubId, now);
  const item = budget.items.find((line) => line.id === itemId);
  if (!item) throw new DomainError("budget item not found", "not_found");
  if (!canAccessRefundAccount(item)) {
    throw new DomainError("refund bank account is only available when this item requires a refund", "conflict");
  }
  const policy = deps.policy ? await deps.policy.findEffective(now) : null;
  if (!policy?.schoolRefundAccount) {
    throw new DomainError("school refund bank account is not configured", "unavailable");
  }
  return { refundAmount: item.refundAmount!, account: policy.schoolRefundAccount };
}
