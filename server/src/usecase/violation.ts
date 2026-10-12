import type { AuthRepository } from "../domain/auth.js";
import { DomainError } from "../domain/errors.js";
import {
  normalizedOpenInput,
  type OpenViolationInput, type ViolationRepository, type ViolationStep,
} from "../domain/violation.js";
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

export async function listViolations(repo: ViolationRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null) {
  await officer(auth, actor);
  return repo.list();
}

export async function getViolation(repo: ViolationRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, id: string, now: Date) {
  await officer(auth, actor);
  const found = await repo.find(checkedId(id, "case"), now);
  if (!found) throw new DomainError("violation case not found", "not_found");
  return found;
}

export async function getViolationSources(repo: ViolationRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, clubId: string) {
  await officer(auth, actor);
  const found = await repo.sources(checkedId(clubId, "club"));
  if (!found) throw new DomainError("club not found", "not_found");
  return found;
}

export async function openViolation(repo: ViolationRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, input: OpenViolationInput, now: Date) {
  const officerId = await officer(auth, actor);
  checkedId(input.clubId, "club");
  if (input.originRefId) checkedId(input.originRefId, "source record");
  return repo.open(normalizedOpenInput(input), officerId, now);
}

export async function applyViolationCaseStep(repo: ViolationRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, id: string, step: ViolationStep, now: Date) {
  const officerId = await officer(auth, actor);
  return repo.apply(checkedId(id, "case"), officerId, step, now);
}
