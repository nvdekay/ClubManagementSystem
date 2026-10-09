import { describe, expect, it, vi } from "vitest";
import type { Attendance, CheckInTarget, EventCheckInRepository } from "../../src/domain/event-checkin.js";
import { checkInCodesMatch, checkInWindow, feedbackWindow } from "../../src/domain/event-checkin.js";
import type { PolicyRepository } from "../../src/domain/policy.js";
import { checkInToEvent, listMyAttendances } from "../../src/usecase/event-checkin.js";

const now = new Date("2026-10-10T10:30:00Z");
const studentId = "000000000000000000000001";
const eventId = "000000000000000000000002";
const actor = { id: studentId, accountState: "Active" as const };

function attendance(overrides: Partial<Attendance> = {}): Attendance {
  return { id: "000000000000000000000009", eventId, eventTitle: "Demo Day", clubId: "000000000000000000000004",
    clubName: "Robotics", eventStartAt: new Date("2026-10-10T10:00:00Z"),
    eventEndAt: new Date("2026-10-10T12:00:00Z"), checkedInAt: now, method: "self", abnormalFlags: [],
    ...overrides };
}

function target(overrides: Partial<CheckInTarget> = {}, event: Partial<CheckInTarget["event"]> = {}): CheckInTarget {
  return { event: { id: eventId, clubId: "000000000000000000000004", title: "Demo Day", state: "Ongoing",
    audienceScope: "PUBLIC", published: true, startAt: new Date("2026-10-10T10:00:00Z"),
    endAt: new Date("2026-10-10T12:00:00Z"), checkInCode: "DEMO-42", allowWalkIn: false, ...event },
  registrationState: "Confirmed", isActiveClubMember: false, attendance: null, ...overrides };
}

function repo(data: CheckInTarget = target()) {
  return { target: vi.fn(async () => data),
    checkIn: vi.fn(async (input: { method: "self" | "walk-in" }) => ({
      attendance: attendance({ method: input.method,
        abnormalFlags: input.method === "walk-in" ? ["walk-in"] : [] }), created: true })),
    listMine: vi.fn(async () => [attendance()]) } satisfies EventCheckInRepository;
}

const policy = { findEffective: vi.fn(async () => ({ feedbackWindowHours: 72 })) } as unknown as PolicyRepository;

describe("event check-in (UC31)", () => {
  it("matches codes regardless of case and surrounding spaces", () => {
    expect(checkInCodesMatch("DEMO-42", "  demo-42 ")).toBe(true);
    expect(checkInCodesMatch("DEMO-42", "DEMO-43")).toBe(false);
  });

  it("defaults the check-in window to the event's start and end", () => {
    expect(checkInWindow(target().event)).toEqual({ opensAt: new Date("2026-10-10T10:00:00Z"),
      closesAt: new Date("2026-10-10T12:00:00Z") });
    const opensAt = new Date("2026-10-10T09:30:00Z");
    expect(checkInWindow(target({}, { checkInOpenAt: opensAt }).event).opensAt).toEqual(opensAt);
  });

  it("checks a confirmed student in and opens feedback from check-in to end + window hours (BR36)", async () => {
    const data = repo();
    const result = await checkInToEvent(data, policy, actor, eventId, " demo-42", now);
    expect(data.checkIn).toHaveBeenCalledWith({ eventId, studentId, method: "self", now });
    expect(result).toMatchObject({ alreadyCheckedIn: false, method: "self", feedbackOpensAt: now,
      feedbackClosesAt: new Date("2026-10-13T12:00:00Z") });
  });

  it("returns the first record on a repeated check-in without writing (E1)", async () => {
    const first = attendance({ checkedInAt: new Date("2026-10-10T10:05:00Z") });
    const data = repo(target({ attendance: first }, { state: "Completed" }));
    const result = await checkInToEvent(data, policy, actor, eventId, "wrong", now);
    expect(result).toMatchObject({ alreadyCheckedIn: true, checkedInAt: first.checkedInAt });
    expect(data.checkIn).not.toHaveBeenCalled();
  });

  it("rejects a wrong code, an unopened event and a closed window before writing", async () => {
    await expect(checkInToEvent(repo(), policy, actor, eventId, "nope", now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(checkInToEvent(repo(target({}, { state: "Approved" })), policy, actor, eventId, "DEMO-42", now))
      .rejects.toMatchObject({ kind: "conflict" });
    await expect(checkInToEvent(repo(target({}, { published: false })), policy, actor, eventId, "DEMO-42", now))
      .rejects.toMatchObject({ kind: "conflict" });
    const late = new Date("2026-10-10T12:00:00Z");
    await expect(checkInToEvent(repo(), policy, actor, eventId, "DEMO-42", late))
      .rejects.toMatchObject({ kind: "conflict" });
    await expect(checkInToEvent(repo(target({}, { checkInCode: undefined })), policy, actor, eventId, "x", now))
      .rejects.toMatchObject({ kind: "conflict" });
  });

  it("requires a confirmed registration unless the event takes walk-ins (E3, A2)", async () => {
    for (const registrationState of [null, "Waitlisted", "Cancelled"] as const) {
      await expect(checkInToEvent(repo(target({ registrationState })), policy, actor, eventId, "DEMO-42", now))
        .rejects.toMatchObject({ kind: "forbidden" });
    }
    const walkIn = repo(target({ registrationState: null }, { allowWalkIn: true }));
    const result = await checkInToEvent(walkIn, policy, actor, eventId, "DEMO-42", now);
    expect(walkIn.checkIn).toHaveBeenCalledWith({ eventId, studentId, method: "walk-in", now });
    expect(result.abnormalFlags).toEqual(["walk-in"]);
  });

  it("limits members-only events to active members and rejects guests and locked accounts", async () => {
    await expect(checkInToEvent(repo(target({}, { audienceScope: "MEMBERS_ONLY" })), policy, actor, eventId,
      "DEMO-42", now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(checkInToEvent(repo(target({ isActiveClubMember: true }, { audienceScope: "MEMBERS_ONLY" })),
      policy, actor, eventId, "DEMO-42", now)).resolves.toMatchObject({ method: "self" });
    await expect(checkInToEvent(repo(), policy, null, eventId, "DEMO-42", now))
      .rejects.toMatchObject({ kind: "unauthorized" });
    await expect(checkInToEvent(repo(), policy, { ...actor, accountState: "Locked" }, eventId, "DEMO-42", now))
      .rejects.toMatchObject({ kind: "locked" });
  });

  it("lists the student's check-ins with their feedback windows", async () => {
    expect(await listMyAttendances(repo(), policy, actor, now)).toEqual([
      { ...attendance(), feedbackOpensAt: now, feedbackClosesAt: new Date("2026-10-13T12:00:00Z") }]);
    expect(feedbackWindow(attendance(), null).feedbackClosesAt).toBeNull();
  });
});
