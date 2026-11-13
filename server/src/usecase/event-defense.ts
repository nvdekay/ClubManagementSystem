import type { ClubAccessRepository } from "../domain/access.js";
import type { AuthRepository } from "../domain/auth.js";
import { DomainError } from "../domain/errors.js";
import {
  MAX_DEFENSE_DURATION_MINUTES,
  MIN_DEFENSE_DURATION_MINUTES,
  validateDefenseScheduleSlot,
  type EventDefenseRepository,
  type RespondRescheduleInput,
  type ScheduleDefenseInput,
} from "../domain/event-defense.js";
import {
  approvedBudget,
  type EventProposalReviewRepository,
  type EventReviewDecisionInput,
} from "../domain/event-proposal-review.js";
import { assertClubAccess, type AccessActor } from "./access.js";
import { normalizedEventDecision } from "./event-proposal-review.js";

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const MINUTE_MS = 60 * 1000;

async function requireOfficer(auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null): Promise<string> {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") {
    throw new DomainError(actor.lockReason || "account locked", "locked");
  }
  if (!OBJECT_ID.test(actor.id)) throw new DomainError("invalid actor", "validation");
  if (!(await auth.systemRoleCodes(actor.id)).includes("ICPDP_OFFICER")) {
    throw new DomainError("ICPDP officer role required", "forbidden");
  }
  return actor.id;
}

function validObjectId(value: string, label: string): string {
  if (!OBJECT_ID.test(value)) throw new DomainError(`invalid ${label}`, "validation");
  return value;
}

function trimmedRequired(value: string | undefined, label: string, maxLength: number): string {
  const text = value?.trim() ?? "";
  if (!text) throw new DomainError(`${label} is required`, "validation");
  if (text.length > maxLength) {
    throw new DomainError(`${label} cannot exceed ${maxLength} characters`, "validation");
  }
  return text;
}

function trimmedOptional(value: string | undefined, maxLength: number): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  if (text.length > maxLength) {
    throw new DomainError(`note cannot exceed ${maxLength} characters`, "validation");
  }
  return text;
}

export async function listAvailableDefenseRooms(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null,
  startAt: Date,
  durationMinutes: number,
  excludeDefenseId?: string,
) {
  await requireOfficer(auth, actor);
  if (!(startAt instanceof Date) || Number.isNaN(startAt.getTime())) {
    throw new DomainError("valid start time is required", "validation", { field: "startAt" });
  }
  if (!Number.isInteger(durationMinutes)
    || durationMinutes < MIN_DEFENSE_DURATION_MINUTES
    || durationMinutes > MAX_DEFENSE_DURATION_MINUTES) {
    throw new DomainError(
      `duration must be an integer between ${MIN_DEFENSE_DURATION_MINUTES} and ${MAX_DEFENSE_DURATION_MINUTES} minutes`,
      "validation",
      { field: "durationMinutes" },
    );
  }
  const endAt = new Date(startAt.getTime() + durationMinutes * MINUTE_MS);
  const excludeId = excludeDefenseId ? validObjectId(excludeDefenseId, "defense id") : undefined;
  return repo.listAvailableRooms(startAt, endAt, excludeId);
}

export async function scheduleEventDefense(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null,
  eventId: string,
  input: ScheduleDefenseInput,
  now: Date,
) {
  const officerId = await requireOfficer(auth, actor);
  const id = validObjectId(eventId, "event id");
  const propertyId = validObjectId(input.propertyId, "property id");
  const title = trimmedRequired(input.title, "defense title", 200);
  const note = trimmedOptional(input.note, 2000);
  const slot = validateDefenseScheduleSlot(input.startAt, input.durationMinutes, now);
  return repo.schedule(id, officerId, { ...slot, propertyId, title, ...(note ? { note } : {}) }, now);
}

export async function cancelEventDefense(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null,
  eventId: string,
  reason: string,
  now: Date,
) {
  const officerId = await requireOfficer(auth, actor);
  const id = validObjectId(eventId, "event id");
  const cleanReason = trimmedRequired(reason, "cancellation reason", 2000);
  return repo.cancel(id, officerId, cleanReason, now);
}

export async function respondDefenseReschedule(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null,
  eventId: string,
  input: RespondRescheduleInput,
  now: Date,
) {
  const officerId = await requireOfficer(auth, actor);
  const id = validObjectId(eventId, "event id");
  if (input.accept) {
    if (!(input.startAt instanceof Date) || Number.isNaN(input.startAt.getTime()) || input.startAt <= now) {
      throw new DomainError("future defense start time is required", "validation", { field: "startAt" });
    }
    const durationMinutes = input.durationMinutes ?? 60;
    if (!Number.isInteger(durationMinutes)
      || durationMinutes < MIN_DEFENSE_DURATION_MINUTES
      || durationMinutes > MAX_DEFENSE_DURATION_MINUTES) {
      throw new DomainError(
        `duration must be an integer between ${MIN_DEFENSE_DURATION_MINUTES} and ${MAX_DEFENSE_DURATION_MINUTES} minutes`,
        "validation",
        { field: "durationMinutes" },
      );
    }
    const propertyId = validObjectId(input.propertyId ?? "", "property id");
    const note = trimmedOptional(input.note, 2000);
    return repo.respondReschedule(id, officerId, {
      accept: true,
      startAt: input.startAt,
      durationMinutes,
      propertyId,
      ...(note ? { note } : {}),
    }, now);
  }
  const reason = trimmedRequired(input.reason, "rejection reason", 2000);
  return repo.respondReschedule(id, officerId, { accept: false, reason }, now);
}

export async function startEventDefense(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null,
  eventId: string,
  now: Date,
) {
  const officerId = await requireOfficer(auth, actor);
  return repo.start(validObjectId(eventId, "event id"), officerId, now);
}

export async function getLiveDefenseSession(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null,
  eventId: string,
) {
  await requireOfficer(auth, actor);
  const session = await repo.getLiveSession(validObjectId(eventId, "event id"));
  if (!session) throw new DomainError("defense session not found", "not_found");
  return session;
}

export async function saveDefenseNote(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null,
  eventId: string,
  content: string,
  now: Date,
) {
  const officerId = await requireOfficer(auth, actor);
  if (typeof content !== "string" || content.length > 50_000) {
    throw new DomainError("defense note cannot exceed 50000 characters", "validation", { field: "content" });
  }
  return repo.saveNote(validObjectId(eventId, "event id"), officerId, content, now);
}

export async function endEventDefense(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null,
  eventId: string,
  now: Date,
) {
  const officerId = await requireOfficer(auth, actor);
  return repo.end(validObjectId(eventId, "event id"), officerId, now);
}

export async function markDefenseNoShow(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null,
  eventId: string,
  reason: string | undefined,
  now: Date,
) {
  const officerId = await requireOfficer(auth, actor);
  const cleanReason = trimmedOptional(reason, 2000) ?? "Club did not attend the scheduled defense session";
  return repo.markNoShow(validObjectId(eventId, "event id"), officerId, cleanReason, now);
}

export async function decideAfterDefense(
  defenseRepo: EventDefenseRepository,
  reviewRepo: EventProposalReviewRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null,
  eventId: string,
  input: EventReviewDecisionInput,
  now: Date,
) {
  const officerId = await requireOfficer(auth, actor);
  const id = validObjectId(eventId, "event id");
  const decision = normalizedEventDecision(input, now);
  const detail = await reviewRepo.find(id, now);
  if (!detail) throw new DomainError("event proposal not found", "not_found");
  if (decision.outcome === "Approve") {
    const current = detail.versions.find((version) => version.revisionNo === detail.event.currentRevisionNo)
      ?? detail.versions.at(-1);
    approvedBudget(current?.budgetLines ?? [], decision.budgetLines);
  }
  return defenseRepo.decideAfterDefense(id, officerId, decision, now);
}

export async function getClubEventDefense(
  repo: EventDefenseRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  eventId: string,
  now: Date,
) {
  await assertClubAccess(access, actor, clubId, "club.event.manage", now);
  const view = await repo.getClubDefense(validObjectId(clubId, "club id"), validObjectId(eventId, "event id"));
  if (!view) throw new DomainError("event proposal not found", "not_found");
  return view;
}

export async function confirmClubEventDefense(
  repo: EventDefenseRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  eventId: string,
  now: Date,
) {
  await assertClubAccess(access, actor, clubId, "club.event.manage", now);
  return repo.confirmByClub(validObjectId(clubId, "club id"), validObjectId(eventId, "event id"), actor!.id, now);
}

export async function requestClubDefenseReschedule(
  repo: EventDefenseRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  eventId: string,
  reason: string,
  now: Date,
) {
  await assertClubAccess(access, actor, clubId, "club.event.manage", now);
  const cleanReason = trimmedRequired(reason, "reschedule reason", 2000);
  return repo.requestRescheduleByClub(
    validObjectId(clubId, "club id"),
    validObjectId(eventId, "event id"),
    actor!.id,
    cleanReason,
    now,
  );
}

export async function runDefenseConfirmationAlertJob(repo: EventDefenseRepository, now: Date): Promise<number> {
  return repo.alertOverdueConfirmations(now);
}
