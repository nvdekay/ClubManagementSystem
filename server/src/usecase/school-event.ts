import type { AuthRepository } from "../domain/auth.js";
import { DomainError } from "../domain/errors.js";
import type { PolicyRepository } from "../domain/policy.js";
import {
  normalizedInvitation, normalizedSchoolEvent,
  type SchoolEventInput, type SchoolEventRepository,
} from "../domain/school-event.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

async function officer(auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null): Promise<string> {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") {
    throw new DomainError(actor.lockReason || "account locked", "locked");
  }
  if (!objectId.test(actor.id)) throw new DomainError("invalid actor", "validation");
  if (!(await auth.systemRoleCodes(actor.id)).includes("ICPDP_OFFICER")) {
    throw new DomainError("ICPDP officer role required", "forbidden");
  }
  return actor.id;
}

function checkedId(value: string, what: string): string {
  if (!objectId.test(value)) throw new DomainError(`invalid ${what} id`, "validation");
  return value;
}

async function existing(repo: SchoolEventRepository, id: string) {
  const found = await repo.find(checkedId(id, "event"));
  if (!found) throw new DomainError("school event not found", "not_found");
  return found;
}

export async function listSchoolEvents(repo: SchoolEventRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null) {
  await officer(auth, actor);
  return repo.list();
}

export async function getSchoolEvent(repo: SchoolEventRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, id: string) {
  await officer(auth, actor);
  return existing(repo, id);
}

/** FR-UC53-02: the conflict warning shown while the officer fills in the form. */
export async function checkSchoolEventConflicts(repo: SchoolEventRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, input: { propertyId?: string; startAt: Date; endAt: Date }) {
  await officer(auth, actor);
  if (input.propertyId) checkedId(input.propertyId, "property");
  if (Number.isNaN(input.startAt.getTime()) || Number.isNaN(input.endAt.getTime()) || input.endAt <= input.startAt) {
    throw new DomainError("the event must end after it starts", "validation", { field: "endAt" });
  }
  return repo.conflicts(input.propertyId, input.startAt, input.endAt);
}

export async function createSchoolEvent(repo: SchoolEventRepository, policy: PolicyRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, input: SchoolEventInput, now: Date) {
  const officerId = await officer(auth, actor);
  if (input.propertyId) checkedId(input.propertyId, "property");
  for (const clubId of input.clubIds ?? []) checkedId(clubId, "club");
  const calendar = (await policy.findEffective(now))?.academicCalendar ?? [];
  return repo.create(normalizedSchoolEvent(input, calendar, now), officerId, now);
}

export async function inviteClubs(repo: SchoolEventRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, id: string, input: { clubIds?: string[]; allActiveClubs?: boolean; deadline?: Date }, now: Date) {
  const officerId = await officer(auth, actor);
  for (const clubId of input.clubIds ?? []) checkedId(clubId, "club");
  const event = await existing(repo, id);
  if (!["Approved", "Upcoming"].includes(event.state)) {
    throw new DomainError("clubs can only be invited before the event takes place", "conflict");
  }
  return repo.invite(event.id, normalizedInvitation(input, event.startAt, now, true), officerId, now);
}

export async function withdrawInvitation(repo: SchoolEventRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, id: string, invitationId: string, now: Date) {
  const officerId = await officer(auth, actor);
  return repo.withdraw(checkedId(id, "event"), checkedId(invitationId, "invitation"), officerId, now);
}

export async function publishSchoolEvent(repo: SchoolEventRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, id: string, now: Date) {
  const officerId = await officer(auth, actor);
  const event = await existing(repo, id);
  if (event.state !== "Approved") throw new DomainError("only an unpublished school event can be published", "conflict");
  if (event.startAt <= now) throw new DomainError("the event has already started", "conflict");
  return repo.publish(event.id, officerId, now);
}

export async function runInvitationExpiryJob(repo: SchoolEventRepository, now: Date) {
  return repo.expireInvitations(now);
}
