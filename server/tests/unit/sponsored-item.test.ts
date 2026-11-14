import { describe, expect, it } from "vitest";
import {
  assertInvoiceSubmission, changeSponsoredItem, invoicePayable, validateInvoiceImage,
  type SponsoredItem, type InvoiceImage,
} from "../../src/domain/sponsored-item.js";

const image: InvoiceImage = { id: "image-1", assetId: "private-1", fileName: "invoice.png",
  mimeType: "image/png", bytes: 100, digest: "digest-1", uploadedAt: "2026-11-01T00:00:00Z", uploadedBy: "leader" };
function item(overrides: Partial<SponsoredItem> = {}): SponsoredItem {
  return { id: "line-1", category: "Venue", requestedAmount: 10_000_000, approvedAmount: 10_000_000,
    fundingDecision: "BEFORE_EVENT", approvedAt: "2026-11-01T00:00:00Z", eventEndAt: "2026-11-10T00:00:00Z",
    status: "Draft", amount: 8_000_000, description: "Venue invoice", images: [image], ...overrides };
}
describe("sponsored item invoice lifecycle", () => {
  it("allows before-event submission at approval and at the original deadline", () => {
    expect(() => assertInvoiceSubmission(item(), new Date("2026-11-01T00:00:00Z"))).not.toThrow();
    expect(() => assertInvoiceSubmission(item(), new Date("2026-11-24T00:00:00Z"))).not.toThrow();
    expect(() => assertInvoiceSubmission(item(), new Date("2026-11-24T00:00:00.001Z"))).toThrow();
  });
  it("allows after-event submission only from the end timestamp", () => {
    const after = item({ fundingDecision: "AFTER_EVENT" });
    expect(() => assertInvoiceSubmission(after, new Date("2026-11-09T23:59:59.999Z"))).toThrow();
    expect(() => assertInvoiceSubmission(after, new Date(after.eventEndAt))).not.toThrow();
  });
  it("records actual costs without any advance but forbids claims for non-sponsored items", () => {
    const actual = changeSponsoredItem(item({ fundingDecision: "NOT_SPONSORED", approvedAmount: 0 }),
      { kind: "save", amount: 100, description: "Actual cost" }, new Date("2026-11-02"));
    expect(actual.amount).toBe(100);
    expect(() => assertInvoiceSubmission(actual, new Date("2026-11-02"))).toThrow();
  });
  it("pays valid invoices rather than the entire approved cap and never pays twice", () => {
    const now = new Date("2026-12-01");
    const accepted = changeSponsoredItem(item({ status: "Submitted" }), { kind: "review", validAmount: 8_000_000, reason: "Valid" }, now);
    expect(accepted.payable).toBe(8_000_000);
    const paid = changeSponsoredItem(accepted, { kind: "pay", amount: 8_000_000, paidAt: now.toISOString(), paymentReference: "BANK-1" }, now);
    expect(paid.status).toBe("Paid");
    expect(() => changeSponsoredItem(paid, { kind: "pay", amount: 8_000_000, paidAt: now.toISOString(), paymentReference: "BANK-2" }, now)).toThrow();
    expect(() => changeSponsoredItem(accepted, { kind: "pay", amount: 4_000_000, paidAt: now.toISOString(), paymentReference: "PART" }, now)).toThrow();
    expect(invoicePayable(item({ status: "Submitted", amount: 12_000_000 }), 12_000_000)).toBe(10_000_000);
  });
  it("prevents late correction but permits timely submitted packs to be reviewed after deadline", () => {
    const submitted = item({ status: "Submitted" });
    expect(() => changeSponsoredItem(submitted, { kind: "return", reason: "Missing detail" }, new Date("2026-11-25"))).toThrow();
    expect(changeSponsoredItem(submitted, { kind: "review", validAmount: 0, reason: "Invalid" }, new Date("2026-11-25")).status).toBe("Rejected");
  });
  it("enforces the cumulative five-image limit, duplicate guard and submitted lock", () => {
    const full = item({ images: Array.from({ length: 5 }, (_, index) => ({ ...image, id: String(index), digest: String(index) })) });
    expect(() => changeSponsoredItem(full, { kind: "image", image }, new Date("2026-11-02"))).toThrow();
    expect(() => changeSponsoredItem(item(), { kind: "image", image }, new Date("2026-11-02"))).toThrow();
    expect(() => changeSponsoredItem(item({ status: "Submitted" }), { kind: "removeImage", imageId: image.id }, new Date("2026-11-02"))).toThrow();
  });
  it("rejects spoofed files and files larger than five MiB", () => {
    expect(() => validateInvoiceImage("image/png", new Uint8Array([1, 2, 3]))).toThrow();
    const bytes = new Uint8Array(5 * 1024 * 1024 + 1);
    bytes.set([255, 216, 255]);
    expect(() => validateInvoiceImage("image/jpeg", bytes)).toThrow();
    expect(validateInvoiceImage("image/png", new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe("image/png");
  });
});
