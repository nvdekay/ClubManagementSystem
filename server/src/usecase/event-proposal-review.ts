import type { AuthRepository } from "../domain/auth.js";
import { DomainError } from "../domain/errors.js";
import {
  approvedBudget, EVENT_REVIEW_SECTIONS, MAX_APPROVAL_CONDITIONS,
  type EventProposalReviewRepository, type EventReviewDecisionInput, type EventReviewSection,
  type NormalizedEventDecision,
} from "../domain/event-proposal-review.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;
const sections = new Set<string>(EVENT_REVIEW_SECTIONS);

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

function eventId(value: string): string {
  if (!objectId.test(value)) throw new DomainError("invalid event id", "validation");
  return value;
}

function trimmed(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

export function normalizedEventDecision(input: EventReviewDecisionInput, now: Date): NormalizedEventDecision {
  const reason = trimmed(input.reason);
  const reviewNote = trimmed(input.reviewNote);
  const chosen = [...new Set((input.sections ?? []).map((section) => section.trim()))];
  const conditions = (input.conditions ?? []).map((condition) => condition.trim()).filter(Boolean);
  const budgetLines = (input.budgetLines ?? []).map((line) => ({
    approvedAmount: line.approvedAmount, ...(trimmed(line.reason) ? { reason: trimmed(line.reason) } : {}),
  }));
  if (!reason && input.outcome !== "Approve") {
    throw new DomainError("decision reason is required", "validation", { field: "reason" });
  }
  if (reason && reason.length > 5_000 || reviewNote && reviewNote.length > 10_000
    || conditions.some((condition) => condition.length > 500)
    || budgetLines.some((line) => line.reason && line.reason.length > 500)) {
    throw new DomainError("review text is too long", "validation");
  }
  if (chosen.some((section) => !sections.has(section))) {
    throw new DomainError("invalid review section", "validation", { field: "sections" });
  }
  if (input.outcome === "Request revision") {
    if (!chosen.length) throw new DomainError("revision sections are required", "validation", { field: "sections" });
    if (!input.revisionDeadlineAt || input.revisionDeadlineAt <= now) {
      throw new DomainError("future revision deadline is required", "validation", { field: "revisionDeadlineAt" });
    }
  } else if (input.revisionDeadlineAt) {
    throw new DomainError("revision deadline only applies to revision requests", "validation");
  }
  if (input.outcome !== "Approve" && (conditions.length || budgetLines.length)) {
    throw new DomainError("conditions and approved amounts only apply to an approval", "validation");
  }
  if (conditions.length > MAX_APPROVAL_CONDITIONS) {
    throw new DomainError("too many approval conditions", "validation", { field: "conditions" });
  }
  return {
    outcome: input.outcome, reason, reviewNote, sections: chosen as EventReviewSection[],
    revisionDeadlineAt: input.revisionDeadlineAt, conditions, budgetLines,
  };
}

export async function listEventProposalReviews(repo: EventProposalReviewRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null) {
  await officer(auth, actor);
  return repo.listOpen();
}

export async function getEventProposalReview(repo: EventProposalReviewRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, id: string, now: Date) {
  await officer(auth, actor);
  const detail = await repo.find(eventId(id), now);
  if (!detail) throw new DomainError("event proposal not found", "not_found");
  return detail;
}

export async function claimEventProposalReview(repo: EventProposalReviewRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, id: string, now: Date) {
  return repo.claim(eventId(id), await officer(auth, actor), now);
}

export async function decideEventProposalReview(repo: EventProposalReviewRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, id: string,
  input: EventReviewDecisionInput, now: Date) {
  const officerId = await officer(auth, actor);
  const decision = normalizedEventDecision(input, now);
  const detail = await repo.find(eventId(id), now);
  if (!detail) throw new DomainError("event proposal not found", "not_found");
  if (decision.outcome === "Approve") {
    const current = detail.versions.find((version) => version.revisionNo === detail.event.currentRevisionNo)
      ?? detail.versions.at(-1);
    // Fails fast with a field-level error; the repository re-checks inside its transaction.
    approvedBudget(current?.budgetLines ?? [], decision.budgetLines);
  }
  return repo.decide(detail.event.id, officerId, decision, now);
}

export async function runEventLifecycleJob(repo: EventProposalReviewRepository, now: Date) {
  return repo.advanceLifecycle(now);
}
