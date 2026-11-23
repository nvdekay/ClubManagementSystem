import { describe, expect, it } from "vitest";
import {
  assertInvoiceSubmission,
  changeSponsoredItem,
  DIRECT_VENDOR_THRESHOLD_VND,
  initialPaymentChannel,
  initialSponsoredItemStatus,
  invoicePayable,
  isClubAction,
  resolvePaymentChannel,
  validateInvoiceImage,
  type InvoiceImage,
  type SponsoredItem,
  type VendorBankInfo,
} from "../../src/domain/sponsored-item.js";

const image: InvoiceImage = {
  id: "image-1",
  assetId: "private-1",
  fileName: "invoice.png",
  mimeType: "image/png",
  bytes: 100,
  digest: "digest-1",
  uploadedAt: "2026-11-01T00:00:00Z",
  uploadedBy: "leader",
};

const vendorBankInfo: VendorBankInfo = {
  vendorName: "Cong ty Am thanh Alpha",
  accountHolder: "CONG TY AM THANH ALPHA",
  accountNumber: "19036888999",
  bankName: "Techcombank",
  bankBranch: "Ha Noi",
  transferNote: "HD-2026-01",
};

function item(overrides: Partial<SponsoredItem> = {}): SponsoredItem {
  return {
    id: "line-1",
    category: "Venue",
    requestedAmount: 4_000_000,
    approvedAmount: 4_000_000,
    fundingDecision: "AFTER_EVENT",
    paymentChannel: "VIA_OFFICER_REIMBURSE",
    approvedAt: "2026-11-01T00:00:00Z",
    eventEndAt: "2026-11-10T00:00:00Z",
    status: "Draft",
    amount: 3_500_000,
    description: "Venue invoice",
    images: [image],
    ...overrides,
  };
}

describe("sponsored item disbursement and document lifecycle", () => {
  it("initializes channels and statuses using the 5,000,000 VND threshold", () => {
    expect(DIRECT_VENDOR_THRESHOLD_VND).toBe(5_000_000);
    expect(initialPaymentChannel("BEFORE_EVENT", 2_000_000)).toBe("VIA_OFFICER_ADVANCE");
    expect(initialSponsoredItemStatus("BEFORE_EVENT")).toBe("AwaitingAdvance");
    expect(initialPaymentChannel("AFTER_EVENT", 4_999_999)).toBe("VIA_OFFICER_REIMBURSE");
    expect(initialPaymentChannel("AFTER_EVENT", 5_000_000)).toBe("DIRECT_VENDOR");
    expect(initialSponsoredItemStatus("AFTER_EVENT")).toBe("Draft");
    expect(initialPaymentChannel("NOT_SPONSORED", 0)).toBeUndefined();
  });

  it("disburses BEFORE_EVENT advance via officer without upfront invoice, then reconciles after event with delta", () => {
    const beforeEnd = new Date("2026-11-05T00:00:00Z");
    const afterEnd = new Date("2026-11-12T00:00:00Z");
    let current = item({
      fundingDecision: "BEFORE_EVENT",
      paymentChannel: "VIA_OFFICER_ADVANCE",
      status: "AwaitingAdvance",
      amount: 0,
      images: [],
    });

    // Cannot edit or submit invoices before advance is received
    expect(() => changeSponsoredItem(current, { kind: "save", amount: 1_000_000, description: "Early" }, beforeEnd)).toThrow();
    expect(() => changeSponsoredItem(current, { kind: "confirmAdvanceReceived" }, beforeEnd)).toThrow();

    // ICPDP records advance sent without invoice
    current = changeSponsoredItem(current, { kind: "recordAdvance" }, beforeEnd, "officer-1");
    expect(current).toMatchObject({
      status: "AdvanceSent",
      advanceAmount: 4_000_000,
      advancedBy: "officer-1",
    });
    expect(() => changeSponsoredItem(current, { kind: "recordAdvance" }, beforeEnd, "officer-1")).toThrow();

    // Club confirms advance received -> moves to Draft to collect post-event invoices
    current = changeSponsoredItem(current, { kind: "confirmAdvanceReceived" }, beforeEnd, "leader-1");
    expect(current).toMatchObject({
      status: "Draft",
      advanceReceivedBy: "leader-1",
    });

    // Club can save and attach before event ends, but submits after event ends
    current = changeSponsoredItem(current, { kind: "save", amount: 3_200_000, description: "Actual receipts" }, beforeEnd);
    current = changeSponsoredItem(current, { kind: "image", image }, beforeEnd);
    expect(() => changeSponsoredItem(current, { kind: "submit" }, beforeEnd)).toThrow();

    current = changeSponsoredItem(current, { kind: "submit" }, afterEnd);
    expect(current.status).toBe("Submitted");

    // ICPDP reconciles and records variance without opening a refund workflow
    const reconciled = changeSponsoredItem(
      current,
      { kind: "review", validAmount: 3_000_000, reason: "Valid 3M, 200k missing receipt" },
      afterEnd,
    );
    expect(reconciled).toMatchObject({
      status: "Reconciled",
      validAmount: 3_000_000,
      payable: 3_000_000,
      reconciliationDelta: -1_000_000,
    });
    expect(() => changeSponsoredItem(reconciled, { kind: "pay" }, afterEnd)).toThrow();
  });

  it("handles AFTER_EVENT under 5M self-paid (reimbursed via officer) and optional direct vendor contract", () => {
    const afterEnd = new Date("2026-11-11T00:00:00Z");
    const deadline = new Date("2026-11-24T00:00:00Z");
    expect(() => assertInvoiceSubmission(item(), new Date("2026-11-09T23:59:59.999Z"))).toThrow();
    expect(() => assertInvoiceSubmission(item(), deadline)).not.toThrow();
    expect(() => assertInvoiceSubmission(item(), new Date("2026-11-24T00:00:00.001Z"))).toThrow();

    // Self-paid reimbursement path: club confirms receipt from officer
    const submitted = changeSponsoredItem(item(), { kind: "submit" }, afterEnd);
    const accepted = changeSponsoredItem(submitted, { kind: "review", validAmount: 3_500_000, reason: "Valid" }, afterEnd);
    expect(accepted).toMatchObject({ status: "Accepted", payable: 3_500_000 });
    expect(() => changeSponsoredItem(accepted, { kind: "confirmVendorPaid" }, afterEnd, "officer-1")).toThrow();
    const paid = changeSponsoredItem(accepted, { kind: "pay" }, afterEnd);
    expect(paid).toMatchObject({ status: "Paid", paidAt: afterEnd.toISOString() });
    expect(() => changeSponsoredItem(paid, { kind: "pay" }, afterEnd)).toThrow();

    // Optional contract path for item < 5M
    const switched = changeSponsoredItem(
      item(),
      { kind: "save", amount: 3_500_000, description: "Vendor contract", paymentChannel: "DIRECT_VENDOR", vendorBankInfo },
      afterEnd,
    );
    expect(resolvePaymentChannel(switched)).toBe("DIRECT_VENDOR");
    expect(switched.vendorBankInfo).toMatchObject({ vendorName: "Cong ty Am thanh Alpha" });
  });

  it("forces DIRECT_VENDOR for AFTER_EVENT >= 5M, requires vendor bank info, and lets only ICPDP confirm vendor paid", () => {
    const afterEnd = new Date("2026-11-12T00:00:00Z");
    let big = item({
      requestedAmount: 8_000_000,
      approvedAmount: 8_000_000,
      paymentChannel: "DIRECT_VENDOR",
      amount: 7_500_000,
    });

    // Cannot downgrade >= 5M to club self-paid
    expect(() => changeSponsoredItem(
      big,
      { kind: "save", amount: 7_500_000, description: "Self paid attempt", paymentChannel: "VIA_OFFICER_REIMBURSE" },
      afterEnd,
    )).toThrow();

    // Cannot submit without vendor bank details
    expect(() => changeSponsoredItem(big, { kind: "submit" }, afterEnd)).toThrow();

    // Save vendor bank info, submit, review, and ICPDP confirms vendor paid
    big = changeSponsoredItem(
      big,
      { kind: "save", amount: 7_500_000, description: "Stage contract", paymentChannel: "DIRECT_VENDOR", vendorBankInfo },
      afterEnd,
    );
    big = changeSponsoredItem(big, { kind: "submit" }, afterEnd);
    big = changeSponsoredItem(big, { kind: "review", validAmount: 7_500_000, reason: "Contract and bank info verified" }, afterEnd);
    expect(big).toMatchObject({ status: "Accepted", payable: 7_500_000 });

    // Club cannot confirm pay on DIRECT_VENDOR
    expect(() => changeSponsoredItem(big, { kind: "pay" }, afterEnd)).toThrow();

    const paid = changeSponsoredItem(big, { kind: "confirmVendorPaid" }, afterEnd, "officer-2");
    expect(paid).toMatchObject({ status: "Paid", paidBy: "officer-2", paidAt: afterEnd.toISOString() });
    expect(() => changeSponsoredItem(paid, { kind: "confirmVendorPaid" }, afterEnd, "officer-2")).toThrow();
  });

  it("separates club and officer actions accurately", () => {
    expect(isClubAction({ kind: "pay" })).toBe(true);
    expect(isClubAction({ kind: "confirmAdvanceReceived" })).toBe(true);
    expect(isClubAction({ kind: "submit" })).toBe(true);
    expect(isClubAction({ kind: "recordAdvance" })).toBe(false);
    expect(isClubAction({ kind: "review", validAmount: 1, reason: "ok" })).toBe(false);
    expect(isClubAction({ kind: "return", reason: "fix" })).toBe(false);
    expect(isClubAction({ kind: "confirmVendorPaid" })).toBe(false);
  });

  it("caps payable at approvedAmount and forbids claims for non-sponsored items", () => {
    const actual = changeSponsoredItem(
      item({ fundingDecision: "NOT_SPONSORED", approvedAmount: 0, paymentChannel: undefined }),
      { kind: "save", amount: 100, description: "Actual cost" },
      new Date("2026-11-12"),
    );
    expect(actual.amount).toBe(100);
    expect(() => assertInvoiceSubmission(actual, new Date("2026-11-12"))).toThrow();
    expect(invoicePayable(item({ status: "Submitted", approvedAmount: 10_000_000, amount: 12_000_000 }), 12_000_000)).toBe(10_000_000);
  });

  it("prevents late return but permits timely submitted packs to be reviewed after deadline", () => {
    const submitted = item({ status: "Submitted" });
    expect(() => changeSponsoredItem(submitted, { kind: "return", reason: "Missing detail" }, new Date("2026-11-25"))).toThrow();
    expect(changeSponsoredItem(submitted, { kind: "review", validAmount: 0, reason: "Invalid" }, new Date("2026-11-25")).status).toBe("Rejected");
  });

  it("enforces five-attachment limit, duplicate guard, and validates JPG, PNG and PDF magic bytes", () => {
    const full = item({
      images: Array.from({ length: 5 }, (_, index) => ({ ...image, id: String(index), digest: String(index) })),
    });
    expect(() => changeSponsoredItem(full, { kind: "image", image }, new Date("2026-11-12"))).toThrow();
    expect(() => changeSponsoredItem(item(), { kind: "image", image }, new Date("2026-11-12"))).toThrow();
    expect(() => changeSponsoredItem(item({ status: "Submitted" }), { kind: "removeImage", imageId: image.id }, new Date("2026-11-12"))).toThrow();

    expect(() => validateInvoiceImage("image/png", new Uint8Array([1, 2, 3]))).toThrow();
    const bigJpg = new Uint8Array(5 * 1024 * 1024 + 1);
    bigJpg.set([255, 216, 255]);
    expect(() => validateInvoiceImage("image/jpeg", bigJpg)).toThrow();
    expect(validateInvoiceImage("image/png", new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe("image/png");

    // PDF support up to 10 MiB
    const validPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    expect(validateInvoiceImage("application/pdf", validPdf)).toBe("application/pdf");
    expect(() => validateInvoiceImage("application/pdf", new Uint8Array([1, 2, 3, 4, 5]))).toThrow();
    const bigPdf = new Uint8Array(10 * 1024 * 1024 + 1);
    bigPdf.set([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(() => validateInvoiceImage("application/pdf", bigPdf)).toThrow();
  });
});
