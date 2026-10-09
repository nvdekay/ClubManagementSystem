import { describe, expect, it, vi } from "vitest";
import type {
  EventRegistration,
  EventRegistrationContext,
  EventRegistrationRepository,
} from "../../src/domain/event-registration.js";
import type { PolicyRepository } from "../../src/domain/policy.js";
import {
  cancelEventRegistration,
  getEventRegistrationContext,
  registerForEvent,
} from "../../src/usecase/event-registration.js";

const now = new Date("2026-10-09T10:00:00Z");
const studentId = "000000000000000000000001";
const eventId = "000000000000000000000002";
const registrationId = "000000000000000000000003";
const actor = { id: studentId, accountState: "Active" as const };

function registration(state: EventRegistration["state"] = "Confirmed"): EventRegistration {
  return { id: registrationId, eventId, studentId, clubId: "000000000000000000000004",
    clubName: "Robotics", eventTitle: "Demo Day",
    eventStartAt: new Date("2026-10-10T10:00:00Z"), eventEndAt: new Date("2026-10-10T12:00:00Z"),
    state, answers: { dietary: "Vegetarian" }, createdAt: now };
}

function context(overrides: Partial<EventRegistrationContext> = {}): EventRegistrationContext {
  return { event: { id: eventId, clubId: "000000000000000000000004", clubName: "Robotics",
    title: "Demo Day", state: "Upcoming", audienceScope: "PUBLIC",
    startAt: new Date("2026-10-10T10:00:00Z"), endAt: new Date("2026-10-10T12:00:00Z"),
    registrationOpenAt: new Date("2026-10-01T00:00:00Z"),
    registrationCloseAt: new Date("2026-10-10T00:00:00Z"), capacity: 10,
    confirmedRegistrationCount: 2, waitlistEnabled: true },
  formSchema: [{ key: "dietary", label: "Dietary preference", type: "select", required: true,
    options: ["None", "Vegetarian"] }], isActiveClubMember: false, registration: null, ...overrides };
}

function repo(data: EventRegistrationContext = context()): EventRegistrationRepository {
  return { context: vi.fn(async () => data), listMine: vi.fn(async () => []),
    findOwned: vi.fn(async () => registration()), register: vi.fn(async () => registration()),
    cancel: vi.fn(async () => registration("Cancelled")) };
}

const policy: PolicyRepository = { findEffective: vi.fn(async () => ({ id: "policy", effectiveFrom: now,
  createdBy: studentId, createdAt: now, allowedEmailDomains: ["example.edu"], minFoundingMembers: 3,
  mandatoryApplicationDocuments: [], reportDeadlines: [], conflictThresholdMinutes: 0,
  feedbackWindowHours: 48, feedbackMinRespondents: 5, allowOverbooking: false,
  enforceOverdueReportBlock: false, academicCalendar: [] })) };

describe("UC29 event registration", () => {
  it("registers with normalized answers and the effective overbooking policy", async () => {
    const repository = repo();
    await registerForEvent(repository, policy, actor, eventId, { dietary: " Vegetarian " }, now);
    expect(repository.register).toHaveBeenCalledWith({ eventId, studentId,
      answers: { dietary: "Vegetarian" }, allowOverbooking: false, now });
  });

  it("rejects closed windows, members-only outsiders, duplicates, and invalid answers", async () => {
    const closed = repo(context({ event: { ...context().event,
      registrationCloseAt: new Date("2026-10-09T09:00:00Z") } }));
    await expect(registerForEvent(closed, policy, actor, eventId,
      { dietary: "None" }, now)).rejects.toMatchObject({ kind: "conflict" });
    const privateEvent = repo(context({ event: { ...context().event, audienceScope: "MEMBERS_ONLY" } }));
    await expect(registerForEvent(privateEvent, policy, actor, eventId,
      { dietary: "None" }, now)).rejects.toMatchObject({ kind: "forbidden" });
    const duplicate = repo(context({ registration: registration() }));
    await expect(registerForEvent(duplicate, policy, actor, eventId,
      { dietary: "None" }, now)).rejects.toMatchObject({ kind: "conflict" });
    await expect(registerForEvent(repo(), policy, actor, eventId,
      { dietary: "Unknown" }, now)).rejects.toMatchObject({ kind: "validation" });
  });

  it("derives the registration-open view and only cancels before event start", async () => {
    await expect(getEventRegistrationContext(repo(), actor, eventId, now))
      .resolves.toMatchObject({ registrationOpen: true });
    const repository = repo();
    await cancelEventRegistration(repository, actor, registrationId, now);
    expect(repository.cancel).toHaveBeenCalledWith(registrationId, studentId, now);
    vi.mocked(repository.findOwned).mockResolvedValueOnce({ ...registration(), eventStartAt: now });
    await expect(cancelEventRegistration(repository, actor, registrationId, now))
      .rejects.toMatchObject({ kind: "conflict" });
  });
});
