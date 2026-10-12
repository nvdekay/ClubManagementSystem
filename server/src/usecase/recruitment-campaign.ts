import { resolveClubPermissions, type ClubAccessRepository } from "../domain/access.js";
import type { PolicyRepository } from "../domain/policy.js";
import type {
  RecruitmentCampaignInput, RecruitmentCampaignRepository,
} from "../domain/recruitment-campaign.js";
import { DomainError } from "../domain/errors.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;
const formKey = /^[a-z][a-z0-9_]{0,49}$/;

function id(value: string, label: string): string {
  if (!objectId.test(value)) throw new DomainError(`invalid ${label}`, "validation");
  return value;
}

function optionalText(value: string | undefined, max: number, field: string): string | undefined {
  const normalized = value?.trim();
  if (normalized && normalized.length > max) {
    throw new DomainError(`invalid campaign ${field}`, "validation", { field });
  }
  return normalized || undefined;
}

function normalizeInput(input: RecruitmentCampaignInput): RecruitmentCampaignInput {
  const title = input.title.trim();
  const positions = input.positions.map((position) => position.trim());
  if (!title || title.length > 150 || positions.length === 0 || positions.length > 30
    || positions.some((position) => !position || position.length > 100)
    || new Set(positions.map((position) => position.toLocaleLowerCase("vi-VN"))).size !== positions.length) {
    throw new DomainError("invalid campaign title or positions", "validation");
  }
  if (!(input.windowStart instanceof Date) || !(input.windowEnd instanceof Date)
    || Number.isNaN(input.windowStart.getTime()) || Number.isNaN(input.windowEnd.getTime())
    || input.windowStart >= input.windowEnd) {
    throw new DomainError("invalid campaign application window", "validation");
  }
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 10_000) {
    throw new DomainError("invalid campaign capacity", "validation");
  }
  const selectionSteps = input.selectionSteps.map((step) => ({
    name: step.name.trim(), description: optionalText(step.description, 2_000, "step description"),
    ...(step.startsAt ? { startsAt: step.startsAt } : {}),
    ...(step.endsAt ? { endsAt: step.endsAt } : {}),
  }));
  if (selectionSteps.length === 0 || selectionSteps.length > 10
    || selectionSteps.some((step) => !step.name || step.name.length > 100
      || (step.startsAt && Number.isNaN(step.startsAt.getTime()))
      || (step.endsAt && Number.isNaN(step.endsAt.getTime()))
      || (step.startsAt && step.endsAt && step.startsAt >= step.endsAt))) {
    throw new DomainError("invalid campaign selection steps", "validation");
  }
  const formSchema = input.formSchema.map((field) => ({
    ...field, key: field.key.trim(), label: field.label.trim(),
    ...(field.options ? { options: field.options.map((option) => option.trim()) } : {}),
  }));
  if (formSchema.length > 30 || formSchema.some((field) => !formKey.test(field.key)
    || !field.label || field.label.length > 150)
    || new Set(formSchema.map((field) => field.key)).size !== formSchema.length
    || formSchema.some((field) => ["select", "multiselect"].includes(field.type)
      ? !field.options || field.options.length < 2 || field.options.length > 30
        || field.options.some((option) => !option || option.length > 100)
        || new Set(field.options.map((option) => option.toLocaleLowerCase("vi-VN"))).size !== field.options.length
      : field.options !== undefined)) {
    throw new DomainError("invalid campaign application form", "validation");
  }
  const rubric = input.rubric.map((criterion) => ({ ...criterion,
    key: criterion.key.trim(), label: criterion.label.trim() }));
  if (rubric.length > 20 || rubric.some((criterion) => !formKey.test(criterion.key)
    || !criterion.label || criterion.label.length > 150 || !Number.isInteger(criterion.maxScore)
    || criterion.maxScore < 1 || criterion.maxScore > 100)
    || new Set(rubric.map((criterion) => criterion.key)).size !== rubric.length) {
    throw new DomainError("invalid campaign rubric", "validation");
  }
  return {
    title, positions, criteria: optionalText(input.criteria, 10_000, "criteria"),
    windowStart: input.windowStart, windowEnd: input.windowEnd, capacity: input.capacity,
    selectionSteps, formSchema, rubric,
  };
}

async function actorForClub(access: ClubAccessRepository, actor: AccessActor | null,
  clubId: string, now: Date) {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") {
    throw new DomainError(actor.lockReason || "account locked", "locked");
  }
  const userId = id(actor.id, "actor id");
  const parsedClubId = id(clubId, "club id");
  const snapshot = await access.findSnapshot(userId, parsedClubId);
  if (!snapshot) throw new DomainError("club access denied", "forbidden");
  if (snapshot.clubState !== "Active") {
    throw new DomainError("club is not active", "conflict", { clubState: snapshot.clubState });
  }
  const permissions = resolveClubPermissions(snapshot, now);
  if (!permissions.includes("club.recruitment.manage")) {
    throw new DomainError("club access denied", "forbidden");
  }
  return { clubId: parsedClubId, actorId: userId };
}

export async function listRecruitmentCampaigns(repo: RecruitmentCampaignRepository,
  access: ClubAccessRepository, actor: AccessActor | null, clubId: string, now = new Date()) {
  const ids = await actorForClub(access, actor, clubId, now);
  return repo.list(ids.clubId);
}

export async function getRecruitmentCampaign(repo: RecruitmentCampaignRepository,
  access: ClubAccessRepository, actor: AccessActor | null, clubId: string, campaignId: string,
  now = new Date()) {
  const ids = await actorForClub(access, actor, clubId, now);
  const campaign = await repo.find(ids.clubId, id(campaignId, "campaign id"));
  if (!campaign) throw new DomainError("recruitment campaign not found", "not_found");
  return campaign;
}

export async function createRecruitmentCampaignDraft(repo: RecruitmentCampaignRepository,
  access: ClubAccessRepository, actor: AccessActor | null, clubId: string,
  input: RecruitmentCampaignInput, now: Date) {
  const ids = await actorForClub(access, actor, clubId, now);
  const campaign = await repo.createDraft(ids.clubId, ids.actorId, normalizeInput(input), now);
  const overlaps = await repo.overlaps(ids.clubId, campaign.id, campaign.positions,
    campaign.windowStart, campaign.windowEnd);
  return { campaign, overlaps };
}

export async function updateRecruitmentCampaignDraft(repo: RecruitmentCampaignRepository,
  access: ClubAccessRepository, actor: AccessActor | null, clubId: string, campaignId: string,
  input: RecruitmentCampaignInput, now: Date) {
  const ids = await actorForClub(access, actor, clubId, now);
  const campaign = await repo.updateDraft(ids.clubId, id(campaignId, "campaign id"),
    ids.actorId, normalizeInput(input), now);
  const overlaps = await repo.overlaps(ids.clubId, campaign.id, campaign.positions,
    campaign.windowStart, campaign.windowEnd);
  return { campaign, overlaps };
}

export async function publishRecruitmentCampaign(repo: RecruitmentCampaignRepository,
  access: ClubAccessRepository, policy: PolicyRepository, actor: AccessActor | null,
  clubId: string, campaignId: string, confirmOverlap: boolean, now: Date) {
  const ids = await actorForClub(access, actor, clubId, now);
  const campaign = await repo.find(ids.clubId, id(campaignId, "campaign id"));
  if (!campaign) throw new DomainError("recruitment campaign not found", "not_found");
  const activePolicy = await policy.findEffective(now);
  if (!activePolicy) throw new DomainError("policy is not configured for this date", "unavailable");
  const semesters = activePolicy.academicCalendar.filter((semester) =>
    campaign.windowStart >= semester.startAt && campaign.windowEnd <= semester.endAt);
  if (semesters.length !== 1) {
    throw new DomainError("campaign window must fit within one academic semester", "validation", {
      field: "window", academicCalendar: activePolicy.academicCalendar.map((semester) => ({
        code: semester.code, startAt: semester.startAt, endAt: semester.endAt,
      })),
    });
  }
  const overlaps = await repo.overlaps(ids.clubId, campaign.id, campaign.positions,
    campaign.windowStart, campaign.windowEnd);
  if (overlaps.length && !confirmOverlap) {
    throw new DomainError("overlapping recruitment campaigns require confirmation", "conflict",
      { overlaps });
  }
  return { campaign: await repo.publish(ids.clubId, campaign.id, ids.actorId, now), overlaps };
}

export async function cancelRecruitmentCampaign(repo: RecruitmentCampaignRepository,
  access: ClubAccessRepository, actor: AccessActor | null, clubId: string, campaignId: string,
  now: Date) {
  const ids = await actorForClub(access, actor, clubId, now);
  return repo.cancel(ids.clubId, id(campaignId, "campaign id"), ids.actorId, now);
}
