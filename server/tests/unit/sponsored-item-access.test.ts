import { describe, expect, it, vi } from "vitest";
import { DEFAULT_FORM_REQUIREMENTS, type SchoolRefundAccount } from "../../src/domain/policy.js";
import type { SponsoredItem } from "../../src/domain/sponsored-item.js";
import { getRefundAccount, invoiceImageUrl, type SponsoredItemDeps } from "../../src/usecase/sponsored-item.js";

const id = "a10000000000000000000001";
const actor = { id, accountState: "Active" as const };
const schoolAccount: SchoolRefundAccount = {
  accountHolder: "TRUONG DAI HOC FPT",
  accountNumber: "0001122334455",
  bankName: "TPBank",
  bankBranch: "Ha Noi",
  transferNote: "Hoan tra tam ung su kien CLB",
};

function fixture(itemOverrides: Partial<SponsoredItem> = {}, configuredAccount?: SchoolRefundAccount) {
  const sign = vi.fn(async () => "https://storage.example/signed");
  const find = vi.fn(async () => ({ id, eventId: id, clubId: id, eventState: "Approved", revision: 0,
    items: [{
      id: "item", category: "Venue", requestedAmount: 100, approvedAmount: 100,
      fundingDecision: "BEFORE_EVENT" as const, approvedAt: "2026-11-01", eventEndAt: "2026-11-20",
      status: "Draft" as const, amount: 100, description: "",
      images: [{ id: "image", assetId: "private",
        fileName: "invoice.png", mimeType: "image/png" as const, bytes: 100, digest: "digest", uploadedAt: "2026-11-02", uploadedBy: id }],
      refundProofs: [{ id: "refund-img", assetId: "private-refund",
        fileName: "refund.pdf", mimeType: "application/pdf" as const, bytes: 200, digest: "refund-digest", uploadedAt: "2026-11-22", uploadedBy: id }],
      ...itemOverrides,
    }] }));
  const deps: SponsoredItemDeps = {
    repo: { find, act: vi.fn() },
    access: { findSnapshot: async () => null },
    auth: { systemRoleCodes: async () => ["ICPDP_OFFICER"] },
    files: { upload: vi.fn(), accessUrl: sign },
    policy: {
      findEffective: async () => ({
        id: "policy-1",
        minFoundingMembers: 5,
        formRequirements: DEFAULT_FORM_REQUIREMENTS,
        reportDeadlines: [],
        conflictThresholdMinutes: 30,
        feedbackWindowHours: 48,
        feedbackMinRespondents: 5,
        allowOverbooking: false,
        enforceOverdueReportBlock: false,
        academicCalendar: [],
        ...(configuredAccount ? { schoolRefundAccount: configuredAccount } : {}),
        effectiveFrom: new Date("2026-01-01"),
        createdBy: id,
        createdAt: new Date("2026-01-01"),
      }),
    },
  };
  return { deps, find, sign };
}

describe("private invoice access", () => {
  it("does not sign an image for an unauthenticated or unrelated club user", async () => {
    const { deps, find, sign } = fixture();
    await expect(invoiceImageUrl(deps, null, id, id, "item", "image", new Date())).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(invoiceImageUrl(deps, actor, id, id, "item", "image", new Date())).rejects.toMatchObject({ kind: "forbidden" });
    expect(find).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
  });

  it("binds the signed asset to the requested item and image (including refundProofs) for both preview and download", async () => {
    const { deps, sign } = fixture();
    await expect(invoiceImageUrl(deps, actor, id, undefined, "other", "image", new Date())).rejects.toMatchObject({ kind: "not_found" });
    expect(sign).not.toHaveBeenCalled();
    await expect(invoiceImageUrl(deps, actor, id, undefined, "item", "image", new Date())).resolves.toEqual({
      url: "https://storage.example/signed",
      fileName: "invoice.png",
      mimeType: "image/png",
    });
    expect(sign).toHaveBeenCalledWith("private", { inline: true });
    await expect(invoiceImageUrl(deps, actor, id, undefined, "item", "refund-img", new Date(), false)).resolves.toEqual({
      url: "https://storage.example/signed",
      fileName: "refund.pdf",
      mimeType: "application/pdf",
    });
    expect(sign).toHaveBeenCalledWith("private-refund", { inline: false });
  });

  it("denies a locked officer and a user without the officer role", async () => {
    const { deps, sign } = fixture();
    await expect(invoiceImageUrl(deps, { ...actor, accountState: "Locked" }, id, undefined, "item", "image", new Date())).rejects.toMatchObject({ kind: "locked" });
    deps.auth.systemRoleCodes = async () => [];
    await expect(invoiceImageUrl(deps, actor, id, undefined, "item", "image", new Date())).rejects.toMatchObject({ kind: "forbidden" });
    expect(sign).not.toHaveBeenCalled();
  });

  it("reveals school refund account only when club has an item awaiting or submitted for refund", async () => {
    const now = new Date("2026-11-22T00:00:00Z");
    const clubAccess = {
      findSnapshot: async () => ({
        clubId: id,
        clubName: "HEBE Club",
        clubState: "Active",
        membership: { id: "m1", clubId: id, state: "Active" },
        terms: [{ id: "t1", clubId: id, state: "Active", startAt: new Date("2026-01-01"), endAt: new Date("2026-12-31") }],
        positions: [{ id: "p1", clubId: id, code: "CLUB_LEADER", isActive: true, isLeaderRole: true, isBoardSeat: true }],
        assignments: [{
          clubId: id,
          termId: "t1",
          positionId: "p1",
          membershipId: "m1",
          effectiveFrom: new Date("2026-01-01"),
          effectiveTo: null,
          confirmedBy: "officer-1",
        }],
        isApprovedFounder: false,
      }),
    };

    // Draft item cannot read refund account
    const draftFixture = fixture({ status: "Draft" }, schoolAccount);
    draftFixture.deps.access = clubAccess;
    await expect(getRefundAccount(draftFixture.deps, actor, id, id, "item", now))
      .rejects.toMatchObject({ kind: "conflict" });

    // RefundPending item with unconfigured policy returns unavailable
    const missingConfig = fixture({ status: "RefundPending", refundAmount: 500_000 }, undefined);
    missingConfig.deps.access = clubAccess;
    await expect(getRefundAccount(missingConfig.deps, actor, id, id, "item", now))
      .rejects.toMatchObject({ kind: "unavailable" });

    // RefundPending item with configured policy returns refundAmount and school account
    const allowed = fixture({ status: "RefundPending", refundAmount: 500_000 }, schoolAccount);
    allowed.deps.access = clubAccess;
    await expect(getRefundAccount(allowed.deps, actor, id, id, "item", now)).resolves.toEqual({
      refundAmount: 500_000,
      account: schoolAccount,
    });
  });
});
