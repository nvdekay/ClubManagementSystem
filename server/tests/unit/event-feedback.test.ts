import { describe, expect, it, vi } from "vitest";
import type { EventFeedbackRepository, FeedbackTarget, MyEventFeedback } from "../../src/domain/event-feedback.js";
import { summarizeFeedback, validateFeedback } from "../../src/domain/event-feedback.js";
import type { PolicyRepository } from "../../src/domain/policy.js";
import { getEventFeedbackContext, submitEventFeedback } from "../../src/usecase/event-feedback.js";

const studentId = "000000000000000000000001";
const eventId = "000000000000000000000002";
const actor = { id: studentId, accountState: "Active" as const };
const checkedInAt = new Date("2026-10-10T10:10:00Z");
const eventEndAt = new Date("2026-10-10T12:00:00Z");
const duringEvent = new Date("2026-10-10T11:00:00Z");
// 72h policy window → closes 2026-10-13T12:00Z.
const policy = { findEffective: vi.fn(async () => ({ feedbackWindowHours: 72 })) } as unknown as PolicyRepository;

function feedback(): MyEventFeedback {
  return { id: "000000000000000000000009", eventId, eventTitle: "Demo Day", clubName: "Robotics", rating: 4,
    comment: "Great", isAnonymous: false, submittedAt: duringEvent };
}

function repo(target: FeedbackTarget | null = { attendance: { id: "000000000000000000000005",
  clubId: "000000000000000000000004", checkedInAt, eventEndAt }, feedback: null }) {
  return { target: vi.fn(async () => target), submit: vi.fn(async () => feedback()),
    listMine: vi.fn(async () => [feedback()]) } satisfies EventFeedbackRepository;
}

const input = { rating: 4, comment: "  Great event  ", isAnonymous: true };

describe("event feedback (UC48)", () => {
  it("accepts a 1–5 rating and a non-empty comment of bounded length", () => {
    expect(validateFeedback({ rating: 5, comment: " ok " })).toEqual({ rating: 5, comment: "ok" });
    for (const bad of [{ rating: 0, comment: "x" }, { rating: 6, comment: "x" }, { rating: 4.5, comment: "x" },
      { rating: 3, comment: "   " }, { rating: 3, comment: "x".repeat(2_001) }]) {
      expect(() => validateFeedback(bad)).toThrow();
    }
  });

  it("stores the trimmed, anonymous-flagged feedback against the attendance during the window", async () => {
    const data = repo();
    await submitEventFeedback(data, policy, actor, eventId, input, duringEvent);
    expect(data.submit).toHaveBeenCalledWith({ eventId, studentId, attendanceId: "000000000000000000000005",
      clubId: "000000000000000000000004", rating: 4, comment: "Great event", isAnonymous: true, now: duringEvent });
  });

  it("rejects attendees who never checked in, repeats and a closed window (E3, E1, E2)", async () => {
    await expect(submitEventFeedback(repo({ attendance: null, feedback: null }), policy, actor, eventId, input, duringEvent))
      .rejects.toMatchObject({ kind: "forbidden" });
    const submitted = repo({ attendance: { id: "a", clubId: "c", checkedInAt, eventEndAt }, feedback: feedback() });
    await expect(submitEventFeedback(submitted, policy, actor, eventId, input, duringEvent))
      .rejects.toMatchObject({ kind: "conflict" });
    expect(submitted.submit).not.toHaveBeenCalled();
    await expect(submitEventFeedback(repo(), policy, actor, eventId, input, new Date("2026-10-13T12:00:00Z")))
      .rejects.toMatchObject({ kind: "conflict" });
    await expect(submitEventFeedback(repo(), policy, actor, eventId, { ...input, rating: 7 }, duringEvent))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(submitEventFeedback(repo(), policy, null, eventId, input, duringEvent))
      .rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("tells the event page whether the form may be shown", async () => {
    expect(await getEventFeedbackContext(repo({ attendance: null, feedback: null }), policy, actor, eventId, duringEvent))
      .toMatchObject({ attended: false, canSubmit: false });
    expect(await getEventFeedbackContext(repo(), policy, actor, eventId, duringEvent)).toMatchObject({
      attended: true, canSubmit: true, opensAt: checkedInAt, closesAt: new Date("2026-10-13T12:00:00Z") });
    expect(await getEventFeedbackContext(repo(), policy, actor, eventId, new Date("2026-10-14T00:00:00Z")))
      .toMatchObject({ attended: true, canSubmit: false });
  });

  it("reveals only the respondent count below the BR40 minimum", () => {
    expect(summarizeFeedback([5, 4], 3)).toEqual({ respondents: 2, visible: false });
    expect(summarizeFeedback([], 0)).toEqual({ respondents: 0, visible: false });
    expect(summarizeFeedback([5, 4, 4], 3)).toEqual({ respondents: 3, visible: true, averageRating: 4.33,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 } });
  });
});
