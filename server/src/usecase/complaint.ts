import type { ClubAccessRepository } from "../domain/access.js";
import type { AuthRepository } from "../domain/auth.js";
import {
  assertComplaintDecision,
  COMPLAINT_STATES,
  COMPLAINT_TYPES,
  complaintText,
  normalizeEvidence,
  type ComplaintClubResponse,
  type ComplaintDecision,
  type ComplaintInput,
  type ComplaintRepository,
  type ComplaintState,
} from "../domain/complaint.js";
import { DomainError } from "../domain/errors.js";
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

async function officer(auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null): Promise<string> {
  const actorId = signedIn(actor);
  if (!(await auth.systemRoleCodes(actorId)).includes("ICPDP_OFFICER")) {
    throw new DomainError("ICPDP officer role required", "forbidden");
  }
  return actorId;
}

/** UC50: a complaint always goes to ICPDP first (BR38); the club is chosen, the event is optional. */
export async function submitComplaint(repo: ComplaintRepository, actor: AccessActor | null, input: ComplaintInput, now: Date) {
  const studentId = signedIn(actor);
  if (!COMPLAINT_TYPES.includes(input.type)) throw new DomainError("invalid complaint type", "validation", { field: "type" });
  const description = complaintText(input.description, "description");
  const evidence = normalizeEvidence(input.evidence);
  const club = await repo.club(id(input.clubId, "club id"));
  if (!club || club.state === "Dissolved") throw new DomainError("club not found", "not_found");
  if (input.eventId && !await repo.eventBelongsToClub(id(input.eventId, "event id"), input.clubId)) {
    throw new DomainError("the event does not belong to this club", "validation", { field: "eventId" });
  }
  return repo.submit({ ...input, description, evidence, studentId, now });
}

export async function listMyComplaints(repo: ComplaintRepository, actor: AccessActor | null) {
  return repo.listMine(signedIn(actor));
}

/** UC50 A1: the author withdraws a complaint ICPDP has not decided yet. */
export async function withdrawComplaint(repo: ComplaintRepository, actor: AccessActor | null, complaintId: string, now: Date) {
  const withdrawn = await repo.withdraw(signedIn(actor), id(complaintId, "complaint id"), now);
  if (!withdrawn) throw new DomainError("only your own complaint that ICPDP has not decided can be withdrawn", "conflict");
  return withdrawn;
}

export async function listComplaintQueue(repo: ComplaintRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, state?: string) {
  await officer(auth, actor);
  if (state && !COMPLAINT_STATES.includes(state as ComplaintState)) throw new DomainError("invalid state", "validation");
  return repo.queue(state ? { state: state as ComplaintState } : {});
}

export async function getComplaintForIcpdp(repo: ComplaintRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, complaintId: string) {
  await officer(auth, actor);
  const found = await repo.findForIcpdp(id(complaintId, "complaint id"));
  if (!found) throw new DomainError("complaint not found", "not_found");
  return found;
}

/** UC51: open, triage (Dismissed / Forwarded / Escalated), then close or escalate after the club answered. */
export async function decideComplaint(repo: ComplaintRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, complaintId: string, decision: ComplaintDecision, now: Date) {
  const officerId = await officer(auth, actor);
  const current = await repo.findForIcpdp(id(complaintId, "complaint id"));
  if (!current) throw new DomainError("complaint not found", "not_found");
  return repo.decide(current.id, officerId, assertComplaintDecision(current, decision, now), now);
}

/** UC52: only forwarded complaints of this club, for club.complaint.respond, without the complainant (D5). */
export async function listClubComplaints(repo: ComplaintRepository, access: ClubAccessRepository, actor: AccessActor | null,
  clubId: string, now: Date) {
  await assertClubAccess(access, actor, id(clubId, "club id"), "club.complaint.respond", now);
  return repo.clubInbox(clubId);
}

export async function respondToComplaint(repo: ComplaintRepository, access: ClubAccessRepository, actor: AccessActor | null,
  clubId: string, complaintId: string, input: Omit<ComplaintClubResponse, "at">, now: Date) {
  await assertClubAccess(access, actor, id(clubId, "club id"), "club.complaint.respond", now);
  const response = { text: complaintText(input.text, "text"), action: complaintText(input.action, "action", 2_000),
    evidence: normalizeEvidence(input.evidence) };
  return repo.respond(clubId, id(complaintId, "complaint id"), actor!.id, response, now);
}

/** UC52 E1 job: idempotent, flags each overdue forwarded complaint once. */
export async function flagOverdueComplaintResponses(repo: ComplaintRepository, now: Date): Promise<number> {
  return repo.flagOverdueResponses(now);
}
