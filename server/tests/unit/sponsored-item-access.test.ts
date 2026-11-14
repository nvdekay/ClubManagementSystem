import { describe, expect, it, vi } from "vitest";
import { invoiceImageUrl, type SponsoredItemDeps } from "../../src/usecase/sponsored-item.js";

const id = "a10000000000000000000001";
const actor = { id, accountState: "Active" as const };
function fixture() {
  const sign = vi.fn(async () => "https://storage.example/signed");
  const find = vi.fn(async () => ({ id, eventId: id, clubId: id, eventState: "Approved", revision: 0,
    items: [{ id: "item", category: "Venue", requestedAmount: 100, approvedAmount: 100,
      fundingDecision: "BEFORE_EVENT" as const, approvedAt: "2026-11-01", eventEndAt: "2026-11-20",
      status: "Draft" as const, amount: 100, description: "", images: [{ id: "image", assetId: "private",
        fileName: "invoice.png", mimeType: "image/png" as const, bytes: 100, digest: "digest", uploadedAt: "2026-11-02", uploadedBy: id }] }] }));
  const deps: SponsoredItemDeps = { repo: { find, act: vi.fn() },
    access: { findSnapshot: async () => null }, auth: { systemRoleCodes: async () => ["ICPDP_OFFICER"] },
    files: { upload: vi.fn(), accessUrl: sign } };
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
  it("binds the signed asset to the requested item and image", async () => {
    const { deps, sign } = fixture();
    await expect(invoiceImageUrl(deps, actor, id, undefined, "other", "image", new Date())).rejects.toMatchObject({ kind: "not_found" });
    expect(sign).not.toHaveBeenCalled();
    await expect(invoiceImageUrl(deps, actor, id, undefined, "item", "image", new Date())).resolves.toEqual({ url: "https://storage.example/signed" });
    expect(sign).toHaveBeenCalledWith("private", { inline: true });
  });
  it("denies a locked officer and a user without the officer role", async () => {
    const { deps, sign } = fixture();
    await expect(invoiceImageUrl(deps, { ...actor, accountState: "Locked" }, id, undefined, "item", "image", new Date())).rejects.toMatchObject({ kind: "locked" });
    deps.auth.systemRoleCodes = async () => [];
    await expect(invoiceImageUrl(deps, actor, id, undefined, "item", "image", new Date())).rejects.toMatchObject({ kind: "forbidden" });
    expect(sign).not.toHaveBeenCalled();
  });
});
