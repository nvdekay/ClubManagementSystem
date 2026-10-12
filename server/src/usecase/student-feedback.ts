import type { ClubAccessRepository } from "../domain/access.js";
import type { AuthRepository } from "../domain/auth.js";
import { DomainError } from "../domain/errors.js";
import {
  normalizeFeedbackMessage,
  type StudentFeedbackInput,
  type StudentFeedbackRepository,
} from "../domain/student-feedback.js";
import { assertClubAccess, type AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

function signedIn(actor: AccessActor | null): string {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") throw new DomainError(actor.lockReason || "account locked", "locked");
  if (!objectId.test(actor.id)) throw new DomainError("invalid actor", "validation");
  return actor.id;
}

function id(value: string, label: string): string {
  if (!objectId.test(value)) throw new DomainError(`invalid ${label}`, "validation");
  return value;
}

export async function sendStudentFeedback(repo: StudentFeedbackRepository, actor: AccessActor | null,
  input: StudentFeedbackInput, now: Date) {
  const studentId = signedIn(actor);
  let message: string;
  try { message = normalizeFeedbackMessage(input.message); }
  catch (error) { throw new DomainError(error instanceof Error ? error.message : "invalid message", "validation"); }
  if (input.recipient === "CLUB" && !input.clubId) throw new DomainError("choose the club to send feedback to", "validation");
  if (input.eventId && !input.clubId) throw new DomainError("an event can only be linked together with its club", "validation");
  if (input.clubId) {
    const club = await repo.club(id(input.clubId, "club id"));
    if (!club || club.state === "Dissolved") throw new DomainError("club not found", "not_found");
    if (input.eventId && !await repo.eventBelongsToClub(id(input.eventId, "event id"), input.clubId)) {
      throw new DomainError("the event does not belong to this club", "validation");
    }
  }
  return repo.submit({ ...input, message, studentId, now });
}

export async function listMyStudentFeedback(repo: StudentFeedbackRepository, actor: AccessActor | null) {
  return repo.listMine(signedIn(actor));
}

/** Club inbox: only feedback addressed to this club, for members holding club.feedback.view. */
export async function listClubFeedbackInbox(repo: StudentFeedbackRepository, access: ClubAccessRepository,
  actor: AccessActor | null, clubId: string, now: Date) {
  await assertClubAccess(access, actor, id(clubId, "club id"), "club.feedback.view", now);
  return repo.inbox("CLUB", clubId);
}

/** ICPDP inbox: only feedback students addressed to ICPDP. */
export async function listIcpdpFeedbackInbox(repo: StudentFeedbackRepository, auth: AuthRepository,
  actor: AccessActor | null) {
  const actorId = signedIn(actor);
  if (!(await auth.systemRoleCodes(actorId)).includes("ICPDP_OFFICER")) {
    throw new DomainError("ICPDP officer role required", "forbidden");
  }
  return repo.inbox("ICPDP");
}
