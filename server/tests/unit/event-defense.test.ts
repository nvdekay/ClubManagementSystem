import { describe, expect, it, vi } from "vitest";
import type { ClubAccessRepository, ClubAccessSnapshot } from "../../src/domain/access.js";
import type { AuthRepository } from "../../src/domain/auth.js";
import {
  assertCanConfirmDefense,
  assertCanRequestReschedule,
  assertCanStartDefense,
  assertRevisionDeadlineBeforeDefense,
  hasActiveDefense,
  isDefenseConfirmationOverdue,
  validateDefenseScheduleSlot,
  type EventDefenseRepository,
  type EventDefenseSession,
} from "../../src/domain/event-defense.js";
import type { EventProposalDetail, EventProposalReviewRepository } from "../../src/domain/event-proposal-review.js";
import {
  confirmClubEventDefense,
  decideAfterDefense,
  requestClubDefenseReschedule,
  saveDefenseNote,
  scheduleEventDefense,
  startEventDefense,
} from "../../src/usecase/event-defense.js";

const now = new Date("2026-10-10T08:00:00Z");
const plus48h = new Date("2026-10-12T08:00:00Z");
const plus72h = new Date("2026-10-13T08:00:00Z");
const officerId = "000000000000000000000001";
const eventId = "000000000000000000000002";
const clubId = "000000000000000000000003";
const propertyId = "000000000000000000000004";
const leaderId = "000000000000000000000005";

const officerActor = { id: officerId, accountState: "Active" as const };
const leaderActor = { id: leaderId, accountState: "Active" as const };

function sampleSession(overrides: Partial<EventDefenseSession> = {}): EventDefenseSession {
  return {
    id: "000000000000000000000010",
    eventId,
    revisionNo: 1,
    title: "Festival Defense",
    startAt: plus72h,
    endAt: new Date(plus72h.getTime() + 60 * 60_000),
    durationMinutes: 60,
    propertyId,
    propertyName: "BE-101 - Hall",
    state: "SCHEDULED",
    leadOfficerId: officerId,
    notes: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function sampleProposal(): EventProposalDetail {
  return {
    task: { id: "000000000000000000000011", eventId, title: "Festival", state: "Open", assigneeId: officerId, openedAt: now },
    event: {
      id: eventId,
      clubId,
      clubName: "Tech Club",
      title: "Festival",
      startAt: new Date(plus72h.getTime() + 5 * 86_400_000),
      endAt: new Date(plus72h.getTime() + 5 * 86_400_000 + 7_200_000),
      semesterCode: "Fall 2026",
      audienceScope: "PUBLIC",
      capacity: 150,
      state: "Under Review",
      approvalConditions: [],
      currentRevisionNo: 1,
      requestedBudgetTotal: 2_000_000,
    },
    versions: [
      {
        id: "v1",
        revisionNo: 1,
        payload: {},
        budgetLines: [{ category: "Logistics", amount: 2_000_000, purpose: "Sound system" }],
        requestedBudgetTotal: 2_000_000,
        submittedBy: leaderId,
        submittedAt: now,
      },
    ],
    decisions: [],
    club: { id: clubId, name: "Tech Club", state: "Active", obligations: [] },
    bookings: [],
    semesterBudgets: [],
    activeDefenseSession: sampleSession({ state: "DEFENDED" }),
  };
}

function auth(roles: string[]): Pick<AuthRepository, "systemRoleCodes"> {
  return { systemRoleCodes: async () => roles };
}

function clubAccess(isLeader: boolean): ClubAccessRepository {
  const snapshot: ClubAccessSnapshot = {
    clubId,
    clubName: "Tech Club",
    clubState: "Active",
    membership: { id: "m1", clubId, state: "Active" },
    terms: [{ id: "t1", clubId, state: "Active", startAt: new Date("2026-09-01T00:00:00Z"), endAt: new Date("2027-01-01T00:00:00Z") }],
    positions: [{ id: "p1", clubId, code: isLeader ? "LEADER" : "MEMBER", isActive: true, isLeaderRole: isLeader }],
    assignments: [
      {
        clubId,
        termId: "t1",
        membershipId: "m1",
        positionId: "p1",
        effectiveFrom: new Date("2026-09-01T00:00:00Z"),
        effectiveTo: null,
        confirmedBy: officerId,
      },
    ],
    isApprovedFounder: false,
  };
  return { findSnapshot: async () => snapshot };
}

function mockDefenseRepo(overrides: Partial<EventDefenseRepository> = {}): EventDefenseRepository {
  return {
    listAvailableRooms: async () => [],
    getLiveSession: async () => sampleSession(),
    getClubDefense: async () => ({ eventId, eventTitle: "Festival", eventState: "Under Review", history: [] }),
    schedule: async () => sampleSession(),
    cancel: async () => sampleSession({ state: "CANCELLED" }),
    respondReschedule: async () => sampleSession(),
    start: async () => sampleSession({ state: "IN_PROGRESS" }),
    saveNote: async () => sampleSession({ state: "IN_PROGRESS" }),
    end: async () => sampleSession({ state: "DEFENDED" }),
    markNoShow: async () => sampleSession({ state: "NO_SHOW" }),
    decideAfterDefense: async () => sampleProposal(),
    confirmByClub: async () => sampleSession({ state: "CONFIRMED" }),
    requestRescheduleByClub: async () => sampleSession({ state: "RESCHEDULE_REQUESTED" }),
    alertOverdueConfirmations: async () => 0,
    ...overrides,
  };
}

function mockReviewRepo(): EventProposalReviewRepository {
  return {
    listOpen: async () => [],
    find: async () => sampleProposal(),
    claim: async () => sampleProposal(),
    decide: async () => sampleProposal(),
    advanceLifecycle: async () => ({ expired: 0, started: 0, completed: 0 }),
  };
}

describe("Event defense domain & use cases", () => {
  it("enforces >= 48h schedule lead time and 15-240 minute integer duration", () => {
    expect(() => validateDefenseScheduleSlot(new Date(plus48h.getTime() - 1000), 60, now))
      .toThrow("at least 48 hours");
    expect(() => validateDefenseScheduleSlot(plus48h, 10, now))
      .toThrow("between 15 and 240");
    expect(() => validateDefenseScheduleSlot(plus48h, 45.5, now))
      .toThrow("between 15 and 240");
    const valid = validateDefenseScheduleSlot(plus48h, 90, now);
    expect(valid.endAt).toEqual(new Date(plus48h.getTime() + 90 * 60_000));
  });

  it("enforces >= 24h club confirmation & reschedule cutoff", () => {
    const soon = new Date(now.getTime() + 23 * 3600_000);
    expect(() => assertCanConfirmDefense({ state: "SCHEDULED", startAt: soon }, now))
      .toThrow("24h before start");
    expect(isDefenseConfirmationOverdue({ state: "SCHEDULED", startAt: soon }, now)).toBe(true);
    expect(() => assertCanRequestReschedule({ state: "SCHEDULED", startAt: soon }, "Exam", now))
      .toThrow("at least 24 hours");
    expect(assertCanRequestReschedule({ state: "CONFIRMED", startAt: plus72h }, "  Final exam  ", now))
      .toBe("Final exam");
  });

  it("enforces >= 12h gap between revision deadline and scheduled defense", () => {
    const startAt = plus72h;
    expect(() => assertRevisionDeadlineBeforeDefense(new Date(startAt.getTime() - 11 * 3600_000), startAt))
      .toThrow("at least 12 hours");
    expect(() => assertRevisionDeadlineBeforeDefense(new Date(startAt.getTime() - 12 * 3600_000), startAt))
      .not.toThrow();
  });

  it("enforces 30-minute early start window and active defense detection", () => {
    expect(hasActiveDefense(sampleSession({ state: "SCHEDULED" }))).toBe(true);
    expect(hasActiveDefense(sampleSession({ state: "DEFENDED" }))).toBe(false);
    expect(() => assertCanStartDefense({ state: "CONFIRMED", startAt: new Date(now.getTime() + 31 * 60_000) }, now))
      .toThrow("at most 30 minutes");
    expect(() => assertCanStartDefense({ state: "CONFIRMED", startAt: new Date(now.getTime() + 30 * 60_000) }, now))
      .not.toThrow();
  });

  it("requires ICPDP_OFFICER role to schedule, start, save notes, and decide after defense", async () => {
    await expect(
      scheduleEventDefense(
        mockDefenseRepo(),
        auth([]),
        officerActor,
        eventId,
        { title: "Defense", startAt: plus72h, durationMinutes: 60, propertyId },
        now,
      ),
    ).rejects.toMatchObject({ kind: "forbidden" });

    const scheduleSpy = vi.fn(async () => sampleSession());
    await scheduleEventDefense(
      mockDefenseRepo({ schedule: scheduleSpy }),
      auth(["ICPDP_OFFICER"]),
      officerActor,
      eventId,
      { title: "  Festival Defense ", startAt: plus72h, durationMinutes: 60, propertyId, note: "  Bring slides " },
      now,
    );
    expect(scheduleSpy).toHaveBeenCalledWith(
      eventId,
      officerId,
      expect.objectContaining({ title: "Festival Defense", note: "Bring slides", durationMinutes: 60, propertyId }),
      now,
    );

    await expect(startEventDefense(mockDefenseRepo(), auth(["ICPDP_OFFICER"]), null, eventId, now))
      .rejects.toMatchObject({ kind: "unauthorized" });
    await expect(saveDefenseNote(mockDefenseRepo(), auth(["ICPDP_OFFICER"]), officerActor, eventId, "a".repeat(50_001), now))
      .rejects.toMatchObject({ kind: "validation" });
  });

  it("validates approved budget and supports Re-defense in post-defense decisions", async () => {
    const decideAfterSpy = vi.fn(async () => sampleProposal());
    await expect(
      decideAfterDefense(
        mockDefenseRepo({ decideAfterDefense: decideAfterSpy }),
        mockReviewRepo(),
        auth(["ICPDP_OFFICER"]),
        officerActor,
        eventId,
        { outcome: "Approve" },
        now,
      ),
    ).rejects.toMatchObject({ kind: "validation" });

    await decideAfterDefense(
      mockDefenseRepo({ decideAfterDefense: decideAfterSpy }),
      mockReviewRepo(),
      auth(["ICPDP_OFFICER"]),
      officerActor,
      eventId,
      { outcome: "Re-defense", reason: "Need clearer logistics breakdown" },
      now,
    );
    expect(decideAfterSpy).toHaveBeenCalledWith(
      eventId,
      officerId,
      expect.objectContaining({ outcome: "Re-defense", reason: "Need clearer logistics breakdown" }),
      now,
    );
  });

  it("requires club.event.manage permission for club confirm and reschedule requests", async () => {
    await expect(
      confirmClubEventDefense(mockDefenseRepo(), clubAccess(false), leaderActor, clubId, eventId, now),
    ).rejects.toMatchObject({ kind: "forbidden" });

    const confirmSpy = vi.fn(async () => sampleSession({ state: "CONFIRMED" }));
    await confirmClubEventDefense(
      mockDefenseRepo({ confirmByClub: confirmSpy }),
      clubAccess(true),
      leaderActor,
      clubId,
      eventId,
      now,
    );
    expect(confirmSpy).toHaveBeenCalledWith(clubId, eventId, leaderId, now);

    const reschedSpy = vi.fn(async () => sampleSession({ state: "RESCHEDULE_REQUESTED" }));
    await requestClubDefenseReschedule(
      mockDefenseRepo({ requestRescheduleByClub: reschedSpy }),
      clubAccess(true),
      leaderActor,
      clubId,
      eventId,
      "  Midterm schedule conflict ",
      now,
    );
    expect(reschedSpy).toHaveBeenCalledWith(clubId, eventId, leaderId, "Midterm schedule conflict", now);
  });
});
