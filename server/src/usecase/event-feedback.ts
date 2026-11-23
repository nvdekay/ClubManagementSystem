import { DomainError } from "../domain/errors.js";
import {
  feedbackWindowFor,
  isFeedbackWindowOpen,
  validateFeedback,
  type EventFeedbackRepository,
} from "../domain/event-feedback.js";
import type { PolicyRepository } from "../domain/policy.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

function student(actor: AccessActor | null): string {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") throw new DomainError(actor.lockReason || "account locked", "locked");
  if (!objectId.test(actor.id)) throw new DomainError("invalid actor", "validation");
  return actor.id;
}

function eventId(value: string): string {
  if (!objectId.test(value)) throw new DomainError("invalid event id", "validation");
  return value;
}

async function windowHours(policy: PolicyRepository, now: Date): Promise<number | null> {
  return (await policy.findEffective(now))?.feedbackWindowHours ?? null;
}

/** What the event page needs: whether the form may be shown (FR-01, E3) and the student's own record. */
export async function getEventFeedbackContext(repo: EventFeedbackRepository, policy: PolicyRepository,
  actor: AccessActor | null, id: string, now: Date) {
  const target = await repo.target(eventId(id), student(actor));
  if (!target) throw new DomainError("event not found", "not_found");
  if (!target.attendance) return { attended: false, canSubmit: false, opensAt: null, closesAt: null, feedback: null };
  const window = feedbackWindowFor(target.attendance, await windowHours(policy, now));
  return { attended: true, canSubmit: !target.feedback && isFeedbackWindowOpen(window, now),
    opensAt: window.opensAt, closesAt: window.closesAt, feedback: target.feedback };
}

export async function submitEventFeedback(repo: EventFeedbackRepository, policy: PolicyRepository,
  actor: AccessActor | null, id: string, input: { rating: number; comment: string; isAnonymous: boolean },
  now: Date) {
  const studentId = student(actor);
  const validEventId = eventId(id);
  let valid: { rating: number; comment: string };
  try { valid = validateFeedback(input); }
  catch (error) {
    throw new DomainError(error instanceof Error ? error.message : "invalid feedback", "validation");
  }
  const target = await repo.target(validEventId, studentId);
  if (!target) throw new DomainError("event not found", "not_found");
  if (!target.attendance) throw new DomainError("only checked-in attendees can give feedback", "forbidden");
  if (target.feedback) throw new DomainError("feedback was already submitted for this event", "conflict");
  if (!isFeedbackWindowOpen(feedbackWindowFor(target.attendance, await windowHours(policy, now)), now)) {
    throw new DomainError("the feedback window for this event has closed", "conflict");
  }
  return repo.submit({ eventId: validEventId, studentId, attendanceId: target.attendance.id,
    clubId: target.attendance.clubId, ...valid, isAnonymous: input.isAnonymous, now });
}

export async function listMyEventFeedback(repo: EventFeedbackRepository, actor: AccessActor | null) {
  return repo.listMine(student(actor));
}
