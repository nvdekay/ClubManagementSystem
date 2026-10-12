import type { AuthRepository } from "../domain/auth.js";
import { DomainError } from "../domain/errors.js";
import {
  PROPERTY_TYPES, validatePropertyDetails,
  type PropertyDetails, type PropertyInput, type PropertyRepository,
} from "../domain/property.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

async function officer(auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null): Promise<string> {
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

function propertyId(value: string): string {
  if (!objectId.test(value)) throw new DomainError("invalid property id", "validation");
  return value;
}

export async function listProperties(repo: PropertyRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null) {
  await officer(auth, actor);
  return repo.list();
}

export async function createProperty(repo: PropertyRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, input: PropertyInput, now: Date) {
  const actorId = await officer(auth, actor);
  if (!PROPERTY_TYPES.includes(input.type)) {
    throw new DomainError("invalid property type", "validation", { field: "type" });
  }
  return repo.create({ type: input.type, ...validatePropertyDetails(input.type, input) }, actorId, now);
}

export async function updateProperty(repo: PropertyRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, id: string,
  details: PropertyDetails, now: Date) {
  const actorId = await officer(auth, actor);
  const current = await repo.find(propertyId(id));
  if (!current) throw new DomainError("property not found", "not_found");
  return repo.update(current.id, validatePropertyDetails(current.type, details), actorId, now);
}

export async function setPropertyActive(repo: PropertyRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, id: string,
  isActive: boolean, now: Date) {
  const actorId = await officer(auth, actor);
  return repo.setActive(propertyId(id), isActive, actorId, now);
}

/** BR41: a property that has ever been booked is only deactivated, never deleted. */
export async function deleteProperty(repo: PropertyRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, id: string, now: Date) {
  const actorId = await officer(auth, actor);
  const current = await repo.find(propertyId(id));
  if (!current) throw new DomainError("property not found", "not_found");
  if (await repo.hasBookings(current.id)) {
    throw new DomainError("property has bookings; deactivate it instead", "conflict");
  }
  await repo.remove(current.id, actorId, now);
  return { deleted: true as const };
}
