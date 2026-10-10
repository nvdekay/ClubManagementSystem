import { describe, expect, it } from "vitest";
import {
  checkInCode, defaultInvitationDeadline, normalizedInvitation, normalizedSchoolEvent, semesterOf,
} from "../../src/domain/school-event.js";
import { publishSchoolEvent } from "../../src/usecase/school-event.js";

const now = new Date("2026-10-10T08:00:00Z");
const calendar = [{ code: "Fall 2026", startAt: new Date("2026-09-01T00:00:00Z"), endAt: new Date("2026-12-31T00:00:00Z") }];
const startAt = new Date("2026-11-01T01:00:00Z");
const endAt = new Date("2026-11-01T10:00:00Z");

describe("school event rules", () => {
  it("normalizes a school event inside one semester with a default reply deadline", () => {
    const event = normalizedSchoolEvent({ title: " Ngày hội CLB ", startAt, endAt, venueText: "Sân trường", capacity: 500,
      clubIds: ["a", "a", "b"] }, calendar, now);
    expect(event).toMatchObject({ title: "Ngày hội CLB", semesterCode: "Fall 2026",
      invitation: { clubIds: ["a", "b"], allActiveClubs: false, deadline: new Date("2026-10-29T01:00:00Z") } });
  });

  it("rejects a past start, a missing venue, a bad capacity or an event across semesters", () => {
    expect(() => normalizedSchoolEvent({ title: "x", startAt: now, endAt, venueText: "x", capacity: 1 }, calendar, now)).toThrow(/future/);
    expect(() => normalizedSchoolEvent({ title: "x", startAt, endAt, capacity: 1 }, calendar, now)).toThrow(/venue/);
    expect(() => normalizedSchoolEvent({ title: "x", startAt, endAt, venueText: "x", capacity: 0 }, calendar, now)).toThrow(/capacity/);
    expect(() => semesterOf(calendar, startAt, new Date("2027-01-05T00:00:00Z"))).toThrow(/semester/);
  });

  it("keeps the reply deadline between now and the start", () => {
    expect(defaultInvitationDeadline(new Date("2026-10-11T08:00:00Z"), now)).toEqual(new Date("2026-10-11T08:00:00Z"));
    expect(() => normalizedInvitation({ clubIds: ["a"], deadline: new Date("2026-11-02T00:00:00Z") }, startAt, now, true))
      .toThrow(/deadline/);
    expect(() => normalizedInvitation({}, startAt, now, true)).toThrow(/at least one club/);
    expect(normalizedInvitation({ allActiveClubs: true }, startAt, now, true).allActiveClubs).toBe(true);
  });

  it("makes six-character check-in codes without ambiguous characters", () => {
    expect(checkInCode(() => 0)).toBe("AAAAAA");
    expect(checkInCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it("refuses to publish an event that has already started", async () => {
    const detail = { id: "000000000000000000000001", state: "Approved", startAt: now } as never;
    const repo = { find: async () => detail } as never;
    await expect(publishSchoolEvent(repo, { systemRoleCodes: async () => ["ICPDP_OFFICER"] },
      { id: "000000000000000000000002", accountState: "Active" }, "000000000000000000000001", now))
      .rejects.toMatchObject({ kind: "conflict" });
  });
});
