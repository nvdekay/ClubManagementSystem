import { DomainError } from "../domain/errors.js";
import type {
  EventRegistrationAnswer,
  EventRegistrationContext,
  EventRegistrationRepository,
} from "../domain/event-registration.js";
import { validateEventRegistrationAnswers } from "../domain/event-registration.js";
import type { PolicyRepository } from "../domain/policy.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

function student(actor: AccessActor | null): string {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") throw new DomainError(actor.lockReason || "account locked", "locked");
  if (!objectId.test(actor.id)) throw new DomainError("invalid actor", "validation");
  return actor.id;
}

function id(value: string, label: string): string {
  if (!objectId.test(value)) throw new DomainError(`invalid ${label}`, "validation");
  return value;
}

function assertOpen(context: EventRegistrationContext, now: Date): void {
  const event = context.event;
  if (event.state !== "Upcoming" || !event.registrationOpenAt || !event.registrationCloseAt
    || event.registrationOpenAt > now || event.registrationCloseAt <= now || event.startAt <= now) {
    throw new DomainError("event registration is not open", "conflict");
  }
  if (event.audienceScope === "MEMBERS_ONLY" && !context.isActiveClubMember) {
    throw new DomainError("event is limited to active club members", "forbidden");
  }
  if (!event.clubId) throw new DomainError("event registration is unavailable", "conflict");
}

export async function getEventRegistrationContext(repo: EventRegistrationRepository,
  actor: AccessActor | null, eventId: string, now: Date) {
  const result = await repo.context(id(eventId, "event id"), student(actor));
  if (!result) throw new DomainError("event not found", "not_found");
  return { ...result, registrationOpen: result.event.state === "Upcoming"
    && Boolean(result.event.registrationOpenAt && result.event.registrationCloseAt)
    && result.event.registrationOpenAt! <= now && now < result.event.registrationCloseAt!
    && now < result.event.startAt };
}

export async function listMyEventRegistrations(repo: EventRegistrationRepository,
  actor: AccessActor | null) {
  return repo.listMine(student(actor));
}

export async function registerForEvent(repo: EventRegistrationRepository, policy: PolicyRepository,
  actor: AccessActor | null, eventId: string,
  answers: Record<string, EventRegistrationAnswer>, now: Date) {
  const studentId = student(actor);
  const validEventId = id(eventId, "event id");
  const context = await repo.context(validEventId, studentId);
  if (!context) throw new DomainError("event not found", "not_found");
  assertOpen(context, now);
  if (context.registration && context.registration.state !== "Cancelled") {
    throw new DomainError("student is already registered for this event", "conflict");
  }
  let normalized: Record<string, EventRegistrationAnswer>;
  try { normalized = validateEventRegistrationAnswers(context.formSchema, answers); }
  catch (error) {
    throw new DomainError(error instanceof Error ? error.message : "invalid registration answers", "validation");
  }
  const effectivePolicy = await policy.findEffective(now);
  return repo.register({ eventId: validEventId, studentId, answers: normalized,
    allowOverbooking: effectivePolicy?.allowOverbooking === true, now });
}

export async function cancelEventRegistration(repo: EventRegistrationRepository,
  actor: AccessActor | null, registrationId: string, now: Date) {
  const studentId = student(actor);
  const validRegistrationId = id(registrationId, "registration id");
  const registration = await repo.findOwned(validRegistrationId, studentId);
  if (!registration) throw new DomainError("event registration not found", "not_found");
  if (registration.state === "Cancelled") {
    throw new DomainError("event registration is already cancelled", "conflict");
  }
  if (registration.eventStartAt <= now) {
    throw new DomainError("event registration cannot be cancelled after the event starts", "conflict");
  }
  return repo.cancel(validRegistrationId, studentId, now);
}
