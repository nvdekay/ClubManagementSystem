import { assertEventNotice, eventCancellationIsLate, eventConflictResult, validateEventPublication } from "../../src/domain/club-event-rules.js";
import { describe, expect, it, vi } from "vitest";
import type { ClubAccessSnapshot } from "../../src/domain/access.js";
import type { ClubEventRepository } from "../../src/domain/club-event.js";
import { eventActionPermission } from "../../src/domain/club-event.js";
import { actOnClubEvent, clubEventFeedback, clubEventParticipants, createClubEvent, listClubEvents, type ClubEventDeps } from "../../src/usecase/club-event.js";
import { clubEventBody, clubEventPublishBody } from "../../src/interface/http/club-event-routes.js";

const clubId = "111111111111111111111111";
const id = "222222222222222222222222";
const actor = { id: "333333333333333333333333", accountState: "Active" as const };
const now = new Date("2026-10-11T00:00:00Z");
// A Club Leader holds a confirmed board seat; a plain member holds only the two default permissions.
function deps(role: "leader" | "member" | "left" = "leader"): ClubEventDeps {
  const snapshot: ClubAccessSnapshot = { clubId, clubName: "Test", clubState: "Active",
    membership: { id, clubId, state: role === "left" ? "Left" : "Active" }, isApprovedFounder: false,
    terms: [{ id, clubId, state: "Active", startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01") }],
    assignments: role === "leader" ? [{ clubId, termId: id, positionId: id, membershipId: id,
      effectiveFrom: new Date("2026-01-01"), confirmedBy: actor.id }] : [],
    positions: [{ id, clubId, isActive: true, isLeaderRole: false, isBoardSeat: true, code: "VICE_LEADER" }] };
  return { access: { findSnapshot: async () => snapshot }, auth: { systemRoleCodes: async () => [] },
    repo: { options: vi.fn(), list: vi.fn(), find: vi.fn(), create: vi.fn(), act: vi.fn(), participants: vi.fn(), feedback: vi.fn() } as ClubEventRepository };
}
describe("club event access and HTTP validation", () => {
  it("lets a Club Leader read feedback and participants; a plain member reads participants only", async () => {
    const d = deps();
    await clubEventFeedback(d, actor, clubId, [id, id], now);
    expect(d.repo.feedback).toHaveBeenCalledWith(clubId, [id], now);
    await clubEventParticipants(d, actor, clubId, id, now);
    expect(d.repo.participants).toHaveBeenCalled();
    const member = deps("member");
    await expect(clubEventFeedback(member, actor, clubId, [id], now)).rejects.toMatchObject({ kind: "forbidden" });
    await clubEventParticipants(member, actor, clubId, id, now);
    expect(member.repo.participants).toHaveBeenCalled();
    const left = deps("left");
    await expect(clubEventParticipants(left, actor, clubId, id, now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(left.repo.participants).not.toHaveBeenCalled();
    expect(eventActionPermission({ kind: "finalize" })).toBe("club.attendance.manage");
  });
  it("lets a plain member run waitlist and attendance actions (UC30, UC32) without event management data", async () => {
    const member = deps("member");
    vi.mocked(member.repo.list).mockResolvedValue([{ id, clubId, title: "Event", objective: "Secret goal", plan: "Plan",
      budgetLines: [{ category: "Room", purpose: "Rent", amount: 1 }], bookingIds: [id], registrationForm: [],
      checkInCode: "ABC123" } as unknown as Awaited<ReturnType<ClubEventRepository["list"]>>[number]]);
    const [listed] = await listClubEvents(member, actor, clubId, now);
    expect(listed).toMatchObject({ objective: "", plan: "", budgetLines: [], bookingIds: [], checkInCode: "ABC123" });
    vi.mocked(member.repo.act).mockResolvedValue({ event: { id, objective: "Secret goal", plan: "Plan" } as unknown as
      Awaited<ReturnType<ClubEventRepository["act"]>>["event"], versions: [{} as never], decisions: [{} as never], bookings: [] });
    for (const action of [{ kind: "promote" as const, registrationId: id }, { kind: "finalize" as const }]) {
      const result = await actOnClubEvent(member, actor, clubId, id, action, now);
      expect(result.event).toMatchObject({ objective: "", plan: "" });
      expect(result.versions).toEqual([]);
      expect(result.decisions).toEqual([]);
    }
    await expect(createClubEvent(member, actor, clubId, {} as Parameters<typeof createClubEvent>[3], now))
      .rejects.toMatchObject({ kind: "forbidden" });
    await expect(actOnClubEvent(deps("left"), actor, clubId, id, { kind: "finalize" }, now)).rejects.toMatchObject({ kind: "forbidden" });
  });
  it("rejects missing, locked and invalid actors before accessing private feedback", async () => {
    const d = deps();
    await expect(clubEventFeedback(d, null, clubId, [id], now)).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(clubEventFeedback(d, { ...actor, accountState: "Locked" }, clubId, [id], now)).rejects.toMatchObject({ kind: "locked" });
    await expect(clubEventFeedback(d, actor, clubId, ["invalid"], now)).rejects.toMatchObject({ kind: "validation" });
    expect(d.repo.feedback).not.toHaveBeenCalled();
  });
  it("requires the special system role to unlock attendance", async () => {
    const d = deps();
    await expect(actOnClubEvent(d, actor, clubId, id, { kind: "unlock", reason: "Correction" }, now)).rejects.toMatchObject({ kind: "forbidden" });
    d.auth.systemRoleCodes = async () => ["ATTENDANCE_UNLOCK"];
    vi.mocked(d.repo.act).mockResolvedValue({ event: {} as Awaited<ReturnType<ClubEventRepository["act"]>>["event"], versions: [], decisions: [], bookings: [] });
    await actOnClubEvent(d, actor, clubId, id, { kind: "unlock", reason: "Correction" }, now);
    expect(d.repo.act).toHaveBeenCalled();
  });
  it("validates proposal fields and forbids Mongo operators and undeclared fields", () => {
    const body = { title: "Event", objective: "Goal", plan: "Plan", startAt: "2026-10-30T00:00:00Z", endAt: "2026-10-30T02:00:00Z",
      venueText: "Campus", audienceScope: "PUBLIC", capacity: 20, riskCategory: "LOW", budgetLines: [], bookingIds: [] };
    expect(clubEventBody.safeParse(body).success).toBe(true);
    expect(clubEventBody.safeParse({ ...body, propertyId: { $ne: null } }).success).toBe(false);
    expect(clubEventBody.safeParse({ ...body, state: "Approved" }).success).toBe(false);
    expect(clubEventBody.safeParse({ ...body, budgetLines: [{ category: "Room", purpose: "Rental", amount: 1.5 }] }).success).toBe(false);
    expect(clubEventPublishBody.safeParse({ expectedVersion: 0, checkInOpenAt: body.startAt,
      checkInCloseAt: body.endAt, allowWalkIn: true, waitlistEnabled: true }).success).toBe(true);
  });
});

describe("event rules at exact policy boundaries", () => {
  it("accepts exact advance notice and flags only cancellations inside the notice", () => {
    const start = new Date(now.getTime() + 24 * 3600000);
    expect(() => assertEventNotice(start, now, 24)).not.toThrow();
    expect(() => assertEventNotice(start, new Date(now.getTime() + 1), 24)).toThrow();
    expect(eventCancellationIsLate(start, now, 24)).toBe(false);
    expect(eventCancellationIsLate(start, new Date(now.getTime() + 1), 24)).toBe(true);
  });
  it("distinguishes blocking and warning conflicts using the effective policy", () => {
    expect(eventConflictResult([], 15, false)).toBe("No Conflict");
    expect(eventConflictResult([14], 15, false)).toBe("Warning");
    expect(eventConflictResult([15], 15, false)).toBe("Blocking Conflict");
    expect(eventConflictResult([60], 15, true)).toBe("Warning");
  });
  it("validates registration and free admission independently of event lifecycle state", () => {
    const startAt = new Date(now.getTime() + 3600000), endAt = new Date(now.getTime() + 7200000);
    const base = { checkInOpenAt: startAt, checkInCloseAt: endAt, allowWalkIn: true, waitlistEnabled: true };
    expect(() => validateEventPublication(base, startAt, endAt, now)).not.toThrow();
    expect(() => validateEventPublication({ ...base, allowWalkIn: false }, startAt, endAt, now)).toThrow();
    expect(() => validateEventPublication({ ...base, registrationOpenAt: now, registrationCloseAt: endAt }, startAt, endAt, now)).toThrow();
  });
});
