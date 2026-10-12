import type { AuthRepository } from "../domain/auth.js";
import type {
  ApplicationReviewDecisionInput,
  ClubApplicationReviewRepository,
} from "../domain/club-application-review.js";
import type { ApplicationFileStorage } from "../domain/club-application.js";
import { DomainError } from "../domain/errors.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;
const allowedSections = new Set([
  "club-information", "founders", "documents", "role-structure", "other",
]);

async function officer(auth: AuthRepository, actor: AccessActor | null): Promise<string> {
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

function applicationId(value: string): string {
  if (!objectId.test(value)) throw new DomainError("invalid application id", "validation");
  return value;
}

function normalizedDecision(input: ApplicationReviewDecisionInput, now: Date) {
  const reason = input.reason?.trim();
  const reviewNote = input.reviewNote?.trim();
  const sections = [...new Set((input.sections ?? []).map((section) => section.trim()))];
  if (!reason && input.outcome !== "Approve") {
    throw new DomainError("decision reason is required", "validation");
  }
  if (reason && reason.length > 5_000 || reviewNote && reviewNote.length > 10_000) {
    throw new DomainError("review text is too long", "validation");
  }
  if (sections.some((section) => !allowedSections.has(section))) {
    throw new DomainError("invalid review section", "validation");
  }
  if (input.outcome === "Request revision") {
    if (!sections.length) throw new DomainError("revision sections are required", "validation");
    if (!input.revisionDeadlineAt || input.revisionDeadlineAt <= now) {
      throw new DomainError("future revision deadline is required", "validation");
    }
  } else if (input.revisionDeadlineAt) {
    throw new DomainError("revision deadline only applies to revision requests", "validation");
  }
  return { outcome: input.outcome, reason, reviewNote, sections,
    revisionDeadlineAt: input.revisionDeadlineAt };
}

export async function listApplicationReviews(repo: ClubApplicationReviewRepository,
  auth: AuthRepository, actor: AccessActor | null) {
  await officer(auth, actor);
  return repo.listOpen();
}

export async function getApplicationReview(repo: ClubApplicationReviewRepository,
  auth: AuthRepository, actor: AccessActor | null, id: string) {
  await officer(auth, actor);
  const detail = await repo.find(applicationId(id));
  if (!detail) throw new DomainError("application review not found", "not_found");
  return detail;
}

export async function claimApplicationReview(repo: ClubApplicationReviewRepository,
  auth: AuthRepository, actor: AccessActor | null, id: string, now: Date) {
  return repo.claim(applicationId(id), await officer(auth, actor), now);
}

export async function decideApplicationReview(repo: ClubApplicationReviewRepository,
  auth: AuthRepository, actor: AccessActor | null, id: string,
  input: ApplicationReviewDecisionInput, now: Date) {
  const officerId = await officer(auth, actor);
  return repo.decide(applicationId(id), officerId, normalizedDecision(input, now), now);
}

export async function applicationReviewDocumentAccess(repo: ClubApplicationReviewRepository,
  auth: AuthRepository, storage: ApplicationFileStorage | null, actor: AccessActor | null,
  id: string, documentId: string) {
  await officer(auth, actor);
  if (!storage) throw new DomainError("file storage is not configured", "unavailable");
  const document = await repo.findDocument(applicationId(id), documentId);
  if (!document) throw new DomainError("application document not found", "not_found");
  return { fileName: document.fileName, url: await storage.accessUrl(document.assetId) };
}
