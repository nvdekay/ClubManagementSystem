import { createHash, randomUUID } from "node:crypto";
import type { ApplicationFileStorage } from "../domain/club-application.js";
import { DomainError } from "../domain/errors.js";
import { assertInvoiceEditable, MAX_INVOICE_IMAGES, validateInvoiceImage,
  type SponsoredItemRepository, type SponsoredItemAction } from "../domain/sponsored-item.js";
import { assertClubAccess, type AccessActor } from "./access.js";
import { assertFinanceOfficer, financeId, type EventFinanceDeps } from "./event-finance.js";

export interface SponsoredItemDeps {
  repo: SponsoredItemRepository;
  access: EventFinanceDeps["access"];
  auth: EventFinanceDeps["auth"];
  files: ApplicationFileStorage | null;
}

export async function getSponsoredBudget(deps: SponsoredItemDeps, actor: AccessActor | null,
  id: string, clubId: string | undefined, now: Date) {
  if (clubId) await assertClubAccess(deps.access, actor, financeId(clubId), "club.expense.record", now);
  else await assertFinanceOfficer(deps.auth, actor);
  const budget = await deps.repo.find(financeId(id), clubId);
  if (!budget) throw new DomainError("sponsored budget not found", "not_found");
  return budget;
}

export async function actOnSponsoredItem(deps: SponsoredItemDeps, actor: AccessActor | null,
  id: string, clubId: string | undefined, itemId: string, revision: number,
  action: SponsoredItemAction, now: Date) {
  await getSponsoredBudget(deps, actor, id, clubId, now);
  if (!Number.isInteger(revision) || revision < 0) throw new DomainError("invalid revision", "validation");
  const clubAction = ["save", "image", "removeImage", "submit"].includes(action.kind);
  if (clubAction !== Boolean(clubId)) throw new DomainError("action not allowed for this role", "forbidden");
  return deps.repo.act(id, itemId, revision, actor!.id, clubId, action, now);
}

export async function uploadInvoiceImage(deps: SponsoredItemDeps, actor: AccessActor | null,
  id: string, clubId: string, itemId: string, revision: number,
  input: { fileName: string; mimeType: string; bytes: Buffer }, now: Date) {
  const budget = await getSponsoredBudget(deps, actor, id, clubId, now);
  const item = budget.items.find((line) => line.id === itemId);
  if (!item) throw new DomainError("budget item not found", "not_found");
  assertInvoiceEditable(item, now);
  if (budget.revision !== revision || item.images.length >= MAX_INVOICE_IMAGES) throw new DomainError("budget changed or image limit reached", "conflict");
  const mimeType = validateInvoiceImage(input.mimeType, input.bytes);
  if (!input.fileName.trim() || input.fileName.length > 200) throw new DomainError("invalid image filename", "validation");
  const digest = createHash("sha256").update(input.bytes).digest("hex");
  if (budget.items.some((line) => line.images.some((image) => image.digest === digest))) throw new DomainError("duplicate invoice image", "conflict");
  if (!deps.files) throw new DomainError("file storage unavailable", "unavailable");
  const file = await deps.files.upload({ ownerId: actor!.id, applicationId: id,
    documentType: "INVOICE", fileName: input.fileName, mimeType, bytes: input.bytes, visibility: "private", now });
  return actOnSponsoredItem(deps, actor, id, clubId, itemId, revision, { kind: "image", image: {
    id: randomUUID(), assetId: file.assetId, fileName: input.fileName, mimeType,
    bytes: input.bytes.length, digest, uploadedAt: now.toISOString(), uploadedBy: actor!.id,
  } }, now);
}

export async function invoiceImageUrl(deps: SponsoredItemDeps, actor: AccessActor | null,
  id: string, clubId: string | undefined, itemId: string, imageId: string, now: Date) {
  const budget = await getSponsoredBudget(deps, actor, id, clubId, now);
  const image = budget.items.find((item) => item.id === itemId)?.images.find((file) => file.id === imageId);
  if (!image) throw new DomainError("invoice image not found", "not_found");
  if (!deps.files) throw new DomainError("file storage unavailable", "unavailable");
  return { url: await deps.files.accessUrl(image.assetId, { inline: true }) };
}
