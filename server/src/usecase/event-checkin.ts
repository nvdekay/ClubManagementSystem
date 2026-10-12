import { DomainError } from "../domain/errors.js";
import {
  checkInCodesMatch,
  checkInStates,
  feedbackWindow,
  isWithinCheckInWindow,
  type Attendance,
  type EventCheckInRepository,
} from "../domain/event-checkin.js";
import type { PolicyRepository } from "../domain/policy.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

function student(actor: AccessActor | null): string {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") throw new DomainError(actor.lockReason || "account locked", "locked");
  if (!objectId.test(actor.id)) throw new DomainError("invalid actor", "validation");
  return actor.id;
}

async function feedbackHours(policy: PolicyRepository, now: Date): Promise<number | null> {
  return (await policy.findEffective(now))?.feedbackWindowHours ?? null;
}

function view(attendance: Attendance, hours: number | null) {
  return { ...attendance, ...feedbackWindow(attendance, hours) };
}

export async function checkInToEvent(repo: EventCheckInRepository, policy: PolicyRepository,
  actor: AccessActor | null, eventId: string, code: string, now: Date) {
  const studentId = student(actor);
  if (!objectId.test(eventId)) throw new DomainError("invalid event id", "validation");
  const target = await repo.target(eventId, studentId);
  if (!target) throw new DomainError("event not found", "not_found");
  // E1: a repeated check-in returns the first record unchanged (BR18), even after the window.
  if (target.attendance) {
    return { ...view(target.attendance, await feedbackHours(policy, now)), alreadyCheckedIn: true };
  }
  const { event } = target;
  if (!event.published || !(checkInStates as readonly string[]).includes(event.state)) {
    throw new DomainError("event is not open for check-in", "conflict");
  }
  if (!event.checkInCode) throw new DomainError("check-in is not available for this event", "conflict");
  if (!checkInCodesMatch(event.checkInCode, code)) throw new DomainError("invalid check-in code", "validation");
  // E2: outside the window only a club member's manual check-in (with a reason) remains.
  if (!isWithinCheckInWindow(event, now)) {
    throw new DomainError("check-in is outside the event's check-in window", "conflict");
  }
  if (event.audienceScope === "MEMBERS_ONLY" && !target.isActiveClubMember) {
    throw new DomainError("event is limited to active club members", "forbidden");
  }
  // E3 unless the event takes walk-ins (A2), which also creates the registration.
  const method = target.registrationState === "Confirmed" ? "self" : event.allowWalkIn ? "walk-in" : null;
  if (!method) throw new DomainError("a confirmed registration is required to check in", "forbidden");
  const result = await repo.checkIn({ eventId, studentId, method, now });
  return { ...view(result.attendance, await feedbackHours(policy, now)), alreadyCheckedIn: !result.created };
}

export async function listMyAttendances(repo: EventCheckInRepository, policy: PolicyRepository,
  actor: AccessActor | null, now: Date) {
  const studentId = student(actor);
  const [items, hours] = await Promise.all([repo.listMine(studentId), feedbackHours(policy, now)]);
  return items.map((item) => view(item, hours));
}
