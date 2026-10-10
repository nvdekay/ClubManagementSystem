import type { AuthRepository } from "../domain/auth.js";
import {
  normalizedBookingDecision,
  type BookingDecisionInput, type BookingReviewRepository,
} from "../domain/booking-review.js";
import { DomainError } from "../domain/errors.js";
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

function bookingId(value: string): string {
  if (!objectId.test(value)) throw new DomainError("invalid booking id", "validation");
  return value;
}

export async function listBookingReviews(repo: BookingReviewRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null) {
  await officer(auth, actor);
  return repo.listOpen();
}

export async function getBookingReview(repo: BookingReviewRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, id: string, now: Date) {
  await officer(auth, actor);
  const detail = await repo.find(bookingId(id), now);
  if (!detail) throw new DomainError("booking not found", "not_found");
  return detail;
}

/** FR-UC46-01: opening the request moves it to Under Review and assigns it to the officer. */
export async function claimBookingReview(repo: BookingReviewRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, id: string, now: Date) {
  return repo.claim(bookingId(id), await officer(auth, actor), now);
}

export async function decideBookingReview(repo: BookingReviewRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, id: string, input: BookingDecisionInput, now: Date) {
  const officerId = await officer(auth, actor);
  if (input.alternative?.propertyId && !objectId.test(input.alternative.propertyId)) {
    throw new DomainError("invalid property id", "validation", { field: "alternative" });
  }
  return repo.decide(bookingId(id), officerId, normalizedBookingDecision(input, now), now);
}
