import { describe, expect, it, vi } from "vitest";
import type { AuthRepository } from "../../src/domain/auth.js";
import {
  blockingConflicts, normalizedBookingDecision, outsideBookableHours,
  type BookingConflict, type BookingReviewRepository,
} from "../../src/domain/booking-review.js";
import { decideBookingReview, listBookingReviews } from "../../src/usecase/booking-review.js";

const now = new Date("2026-10-10T08:00:00Z");
const officer = { id: "000000000000000000000001", accountState: "Active" as const };
const bookingId = "000000000000000000000002";

function auth(roles: string[]): Pick<AuthRepository, "systemRoleCodes"> {
  return { systemRoleCodes: async () => roles };
}

function repo(): BookingReviewRepository {
  return { listOpen: vi.fn(async () => []), find: vi.fn(async () => null),
    claim: vi.fn(async () => { throw new Error("unused"); }), decide: vi.fn(async () => ({}) as never) };
}

function conflict(blocking: boolean): BookingConflict {
  return { kind: "booking", id: "x", title: "CLB khác", startAt: now, endAt: now, state: blocking ? "Approved" : "Requested", blocking };
}

describe("booking review rules", () => {
  it("requires a reason to reject or request a revision, not to approve", () => {
    expect(() => normalizedBookingDecision({ outcome: "Reject", reason: " " }, now)).toThrow(/reason/);
    expect(() => normalizedBookingDecision({ outcome: "Request revision" }, now)).toThrow(/reason/);
    expect(normalizedBookingDecision({ outcome: "Approve" }, now)).toEqual({ outcome: "Approve" });
  });

  it("accepts an alternative only with a revision request and a complete future slot", () => {
    const later = new Date(now.getTime() + 86_400_000);
    const end = new Date(later.getTime() + 3_600_000);
    expect(() => normalizedBookingDecision({ outcome: "Approve", alternative: { startAt: later, endAt: end } }, now))
      .toThrow(/alternative/);
    expect(() => normalizedBookingDecision({ outcome: "Request revision", reason: "Trùng", alternative: { startAt: later } }, now))
      .toThrow(/both/);
    expect(() => normalizedBookingDecision({ outcome: "Request revision", reason: "Trùng",
      alternative: { startAt: end, endAt: later } }, now)).toThrow(/future/);
    expect(normalizedBookingDecision({ outcome: "Request revision", reason: "Trùng", alternative: { startAt: later, endAt: end } }, now))
      .toMatchObject({ alternative: { startAt: later, endAt: end } });
  });

  it("blocks approval only on held slots and only when the policy forbids overbooking", () => {
    expect(blockingConflicts([conflict(true), conflict(false)], false)).toHaveLength(1);
    expect(blockingConflicts([conflict(true)], true)).toEqual([]);
  });

  it("warns when the slot leaves the bookable hours (campus time) or hits a blackout", () => {
    // Monday 2026-10-12, 08:00–10:00 campus time = 01:00–03:00 UTC.
    const property = { bookableHours: [{ day: 1, open: "07:00", close: "17:00" }], blackouts: [] };
    expect(outsideBookableHours(property, new Date("2026-10-12T01:00:00Z"), new Date("2026-10-12T03:00:00Z"))).toBe(false);
    expect(outsideBookableHours(property, new Date("2026-10-12T09:00:00Z"), new Date("2026-10-12T11:00:00Z"))).toBe(true);
    expect(outsideBookableHours(property, new Date("2026-10-13T01:00:00Z"), new Date("2026-10-13T03:00:00Z"))).toBe(true);
    expect(outsideBookableHours({ ...property, blackouts: [{ startAt: new Date("2026-10-12T00:00:00Z"),
      endAt: new Date("2026-10-12T02:00:00Z") }] }, new Date("2026-10-12T01:00:00Z"), new Date("2026-10-12T03:00:00Z"))).toBe(true);
  });

  it("is for ICPDP officers only and validates before writing", async () => {
    const store = repo();
    await expect(listBookingReviews(store, auth([]), officer)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(decideBookingReview(store, auth(["ICPDP_OFFICER"]), officer, bookingId, { outcome: "Reject" }, now))
      .rejects.toMatchObject({ kind: "validation" });
    expect(store.decide).not.toHaveBeenCalled();
  });
});
