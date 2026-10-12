import { describe, expect, it, vi } from "vitest";
import type { MemberSpace, MemberSpaceRepository } from "../../src/domain/member-space.js";
import type { MembershipState } from "../../src/domain/membership.js";
import type { PolicyRepository } from "../../src/domain/policy.js";
import { getMemberSpace } from "../../src/usecase/member-space.js";

const now = new Date("2026-10-10T12:00:00Z");
const clubId = "000000000000000000000002";
const actor = { id: "000000000000000000000001", accountState: "Active" as const };
const policy = { findEffective: vi.fn(async () => ({ feedbackWindowHours: 48 })) } as unknown as PolicyRepository;

function space(state: MembershipState = "Active"): MemberSpace {
  return { club: { id: clubId, name: "Robotics", state: "Active" },
    membership: { id: "m", state, joinedAt: now, positions: ["Thủ quỹ"] }, members: [], board: [],
    upcomingEvents: [], otherClubs: [],
    attendance: [
      { eventId: "e1", eventTitle: "Open window", checkedInAt: now, eventEndAt: new Date("2026-10-10T10:00:00Z"),
        feedbackSubmitted: false },
      { eventId: "e2", eventTitle: "Already sent", checkedInAt: now, eventEndAt: new Date("2026-10-10T10:00:00Z"),
        feedbackSubmitted: true },
      { eventId: "e3", eventTitle: "Window closed", checkedInAt: now, eventEndAt: new Date("2026-10-07T10:00:00Z"),
        feedbackSubmitted: false },
    ] };
}

function repo(data: MemberSpace | null) {
  return { find: vi.fn(async () => data) } satisfies MemberSpaceRepository;
}

describe("member space (UC24)", () => {
  it("lists only feedback that is still owed and whose window is open (FR-05)", async () => {
    const result = await getMemberSpace(repo(space()), policy, actor, clubId, now);
    expect(result.feedbackToSend).toEqual([{ eventId: "e1", eventTitle: "Open window",
      closesAt: new Date("2026-10-12T10:00:00Z") }]);
  });

  it("lets Inactive members in but sends Left, Banned and non-members away (E1)", async () => {
    await expect(getMemberSpace(repo(space("Inactive")), policy, actor, clubId, now)).resolves.toBeDefined();
    for (const state of ["Left", "Banned"] as const) {
      await expect(getMemberSpace(repo(space(state)), policy, actor, clubId, now))
        .rejects.toMatchObject({ kind: "forbidden" });
    }
    await expect(getMemberSpace(repo(null), policy, actor, clubId, now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(getMemberSpace(repo(space()), policy, null, clubId, now)).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(getMemberSpace(repo(space()), policy, actor, "nope", now)).rejects.toMatchObject({ kind: "validation" });
  });
});
