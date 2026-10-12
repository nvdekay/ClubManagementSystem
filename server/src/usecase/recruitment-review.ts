import { DomainError } from "../domain/errors.js";
import type { RecruitmentApplicationState, RecruitmentAttachmentStorage, RecruitmentDecision,
  RecruitmentReviewRepository } from "../domain/recruitment-application.js";
import type { ClubAccessRepository } from "../domain/access.js";
import { assertClubAccess, type AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

function reviewerId(actor: AccessActor | null): string {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState !== "Active") throw new DomainError("account is not active", "locked");
  return actor.id;
}

async function authorize(access: ClubAccessRepository, actor: AccessActor | null,
  clubId: string, now: Date) {
  if (!objectId.test(clubId)) throw new DomainError("invalid club id", "validation");
  const userId = reviewerId(actor);
  await assertClubAccess(access, actor, clubId, "club.application.review", now);
  return userId;
}

export async function listRecruitmentApplicationsForReview(
  repo: RecruitmentReviewRepository, access: ClubAccessRepository, actor: AccessActor | null,
  clubId: string, campaignId: string, state: RecruitmentApplicationState | undefined, now = new Date(),
) {
  await authorize(access, actor, clubId, now);
  if (!objectId.test(campaignId)) throw new DomainError("invalid campaign id", "validation");
  return repo.listForReview(clubId, campaignId, state);
}

export async function reviewerAttachmentAccess(
  repo: RecruitmentReviewRepository, storage: RecruitmentAttachmentStorage | null,
  access: ClubAccessRepository, actor: AccessActor | null,
  input: { clubId: string; campaignId: string; applicationId: string; attachmentId: string },
  now = new Date(),
) {
  await authorize(access, actor, input.clubId, now);
  for (const [label, value] of [["campaign", input.campaignId], ["application", input.applicationId]] as const) {
    if (!objectId.test(value)) throw new DomainError(`invalid ${label} id`, "validation");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.attachmentId)) {
    throw new DomainError("invalid attachment id", "validation");
  }
  const attachment = await repo.reviewAttachment(input);
  if (!attachment) throw new DomainError("recruitment attachment not found", "not_found");
  if (!storage) throw new DomainError("file storage is not configured", "unavailable");
  return { url: await storage.accessUrl(attachment.assetId), fileName: attachment.fileName };
}

export async function reviewRecruitmentApplications(
  repo: RecruitmentReviewRepository, access: ClubAccessRepository, actor: AccessActor | null,
  input: { clubId: string; campaignId: string; applicationIds: string[];
    action: "screen" | "shortlist" | "decide" | "promote" | "close-withdrawn";
    outcome?: RecruitmentDecision; reason?: string }, now = new Date(),
) {
  const actorId = await authorize(access, actor, input.clubId, now);
  if (!objectId.test(input.campaignId) || !input.applicationIds.length || input.applicationIds.length > 100
    || input.applicationIds.some((id) => !objectId.test(id))
    || new Set(input.applicationIds).size !== input.applicationIds.length) {
    throw new DomainError("invalid recruitment review request", "validation");
  }
  const reason = input.reason?.trim();
  if (reason && reason.length > 2000) throw new DomainError("review reason is too long", "validation");
  if (input.action === "decide" && !input.outcome) {
    throw new DomainError("decision outcome is required", "validation");
  }
  if (input.action === "decide" && input.outcome === "Rejected" && !reason) {
    throw new DomainError("rejection reason is required", "validation");
  }
  if (input.action === "shortlist" && !reason) {
    throw new DomainError("shortlist reason is required", "validation");
  }
  return repo.transition({ ...input, ...(reason ? { reason } : {}), actorId, now });
}

export async function onboardAcceptedRecruitmentApplication(
  repo: RecruitmentReviewRepository, access: ClubAccessRepository, actor: AccessActor | null,
  input: { clubId: string; campaignId: string; applicationId: string; joinedAt: Date; departmentId?: string },
  now = new Date(),
) {
  const actorId = await authorize(access, actor, input.clubId, now);
  if (!objectId.test(input.campaignId) || !objectId.test(input.applicationId)
    || (input.departmentId && !objectId.test(input.departmentId))
    || Number.isNaN(input.joinedAt.getTime()) || input.joinedAt > now) {
    throw new DomainError("invalid onboarding request", "validation");
  }
  return repo.onboard({ ...input, actorId, now });
}

export async function declineAcceptedRecruitmentApplication(
  repo: RecruitmentReviewRepository, access: ClubAccessRepository, actor: AccessActor | null,
  input: { clubId: string; campaignId: string; applicationId: string; reason?: string }, now = new Date(),
) {
  const actorId = await authorize(access, actor, input.clubId, now);
  if (!objectId.test(input.campaignId) || !objectId.test(input.applicationId)
    || (input.reason && input.reason.trim().length > 2000)) {
    throw new DomainError("invalid decline request", "validation");
  }
  return repo.declineAccepted({ ...input, ...(input.reason ? { reason: input.reason.trim() } : {}), actorId, now });
}
