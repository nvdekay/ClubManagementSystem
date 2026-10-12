import { DomainError } from "../domain/errors.js";
import type {
  RecruitmentAnswer, RecruitmentApplication, RecruitmentApplicationRepository,
  RecruitmentAttachmentStorage,
} from "../domain/recruitment-application.js";
import { validateRecruitmentAnswers } from "../domain/recruitment-application.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;
const allowedMimeTypes = new Set([
  "application/pdf", "image/png", "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const maxFileBytes = 10 * 1024 * 1024;

function owner(actor: AccessActor | null): string {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") {
    throw new DomainError(actor.lockReason || "account locked", "locked");
  }
  if (!objectId.test(actor.id)) throw new DomainError("invalid actor", "validation");
  return actor.id;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validId(value: string, field: string): string {
  if (!objectId.test(value)) throw new DomainError(`invalid ${field}`, "validation");
  return value;
}

function validAttachmentId(value: string): string {
  if (!uuid.test(value)) throw new DomainError("invalid attachment id", "validation");
  return value;
}

function fileSignatureMatches(mimeType: string, bytes: Buffer): boolean {
  if (mimeType === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (mimeType === "image/png") return bytes.subarray(0, 8).equals(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/jpeg") return bytes.length >= 3 &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
      && bytes.includes(Buffer.from("[Content_Types].xml"));
  }
  return false;
}

function ownedApplication(application: RecruitmentApplication | null): RecruitmentApplication {
  if (!application) throw new DomainError("recruitment application not found", "not_found");
  return application;
}

function editable(application: RecruitmentApplication): void {
  if (application.state !== "Draft") {
    throw new DomainError("recruitment application is no longer editable", "conflict");
  }
}

async function openCampaign(repo: RecruitmentApplicationRepository, campaignId: string, now: Date) {
  const id = validId(campaignId, "campaign id");
  const campaign = await repo.campaign(id, now);
  if (!campaign || !campaign.clubId) {
    throw new DomainError("recruitment campaign not found or closed", "not_found");
  }
  return campaign;
}

async function eligible(repo: RecruitmentApplicationRepository, userId: string, clubId: string) {
  const result = await repo.eligibility(userId, clubId);
  if (!result.userActive) throw new DomainError("student account is not active", "forbidden");
  if (result.bannedMembership) throw new DomainError("banned student cannot apply to this club", "forbidden");
  if (result.activeMembership) throw new DomainError("active club members cannot apply to recruitment", "conflict");
}

function normalizedAnswers(answers: Record<string, RecruitmentAnswer>): Record<string, RecruitmentAnswer> {
  const entries = Object.entries(answers);
  if (entries.length > 30) throw new DomainError("too many application answers", "validation");
  const result: Record<string, RecruitmentAnswer> = {};
  for (const [key, value] of entries) {
    if (!/^[a-z][a-z0-9_]{0,49}$/.test(key) || (typeof value !== "string" && !Array.isArray(value))
      || (typeof value === "string" && value.length > 10_000)
      || (Array.isArray(value) && (value.length > 30 || value.some((item) =>
        typeof item !== "string" || item.length > 500)))) {
      throw new DomainError("invalid recruitment answer", "validation", { field: key });
    }
    result[key] = typeof value === "string" ? value.trim() : value.map((item) => item.trim());
  }
  return result;
}

export async function publicRecruitmentApplicationForm(
  repo: RecruitmentApplicationRepository, campaignId: string, now: Date,
) {
  return openCampaign(repo, campaignId, now);
}

export async function listMyRecruitmentApplications(
  repo: RecruitmentApplicationRepository, actor: AccessActor | null,
) {
  return repo.listMine(owner(actor));
}

export async function getMyRecruitmentApplication(
  repo: RecruitmentApplicationRepository, actor: AccessActor | null, applicationId: string,
) {
  return ownedApplication(await repo.findOwned(validId(applicationId, "application id"), owner(actor)));
}

export async function getMyCampaignApplication(
  repo: RecruitmentApplicationRepository, actor: AccessActor | null, campaignId: string,
) {
  const campaign = validId(campaignId, "campaign id");
  return repo.findMineForCampaign(campaign, owner(actor));
}

export async function createRecruitmentApplicationDraft(
  repo: RecruitmentApplicationRepository, actor: AccessActor | null,
  campaignId: string, position: string, now: Date,
) {
  const userId = owner(actor);
  const campaign = await openCampaign(repo, campaignId, now);
  await eligible(repo, userId, campaign.clubId!);
  const normalizedPosition = position.trim();
  if (!(campaign.positions ?? []).some((item) => item.toLocaleLowerCase("vi-VN")
    === normalizedPosition.toLocaleLowerCase("vi-VN"))) {
    throw new DomainError("application position is not part of this campaign", "validation");
  }
  return repo.createDraft({ campaign, userId, position: normalizedPosition, now });
}

export async function saveRecruitmentApplicationDraft(
  repo: RecruitmentApplicationRepository, actor: AccessActor | null, applicationId: string,
  input: { position: string; answers: Record<string, RecruitmentAnswer> }, now: Date,
) {
  const userId = owner(actor);
  const application = ownedApplication(await repo.findOwned(validId(applicationId, "application id"), userId));
  editable(application);
  const campaign = await openCampaign(repo, application.campaignId, now);
  await eligible(repo, userId, campaign.clubId!);
  const position = input.position.trim();
  if (!(campaign.positions ?? []).some((item) => item.toLocaleLowerCase("vi-VN")
    === position.toLocaleLowerCase("vi-VN"))) {
    throw new DomainError("application position is not part of this campaign", "validation");
  }
  return repo.updateDraft({ applicationId: application.id, userId, position,
    answers: normalizedAnswers(input.answers), now });
}

export async function uploadRecruitmentAttachment(
  repo: RecruitmentApplicationRepository, storage: RecruitmentAttachmentStorage | null,
  actor: AccessActor | null, applicationId: string, fieldKey: string, fileName: string,
  mimeType: string, bytes: Buffer, now: Date,
) {
  const userId = owner(actor);
  const application = ownedApplication(await repo.findOwned(validId(applicationId, "application id"), userId));
  editable(application);
  const campaign = await openCampaign(repo, application.campaignId, now);
  const field = campaign.formSchema?.find((item) => item.key === fieldKey && item.type === "file");
  if (!field) throw new DomainError("attachment field is not part of this campaign", "validation");
  if (!storage) throw new DomainError("file storage is not configured", "unavailable");
  const normalizedName = fileName.trim();
  if (!normalizedName || normalizedName.length > 255
    || [...normalizedName].some((character) => character.charCodeAt(0) < 32)
    || !allowedMimeTypes.has(mimeType) || bytes.length === 0 || bytes.length > maxFileBytes
    || !fileSignatureMatches(mimeType, bytes)) {
    throw new DomainError("invalid recruitment attachment", "validation");
  }
  const attachment = await storage.upload({ ownerId: userId, applicationId: application.id,
    fieldKey, fileName: normalizedName, mimeType, bytes, now });
  return repo.addAttachment({ applicationId: application.id, userId, attachment });
}

export async function recruitmentAttachmentAccess(
  repo: RecruitmentApplicationRepository, storage: RecruitmentAttachmentStorage | null,
  actor: AccessActor | null, applicationId: string, attachmentId: string,
) {
  const attachment = await repo.attachmentAccess(validId(applicationId, "application id"),
    owner(actor), validAttachmentId(attachmentId));
  if (!attachment) throw new DomainError("recruitment attachment not found", "not_found");
  if (!storage) throw new DomainError("file storage is not configured", "unavailable");
  return { url: await storage.accessUrl(attachment.assetId), fileName: attachment.fileName };
}

export async function submitRecruitmentApplication(
  repo: RecruitmentApplicationRepository, actor: AccessActor | null, applicationId: string,
  now: Date,
) {
  const userId = owner(actor);
  const application = ownedApplication(await repo.findOwned(validId(applicationId, "application id"), userId));
  editable(application);
  const campaign = await openCampaign(repo, application.campaignId, now);
  await eligible(repo, userId, campaign.clubId!);
  validateRecruitmentAnswers({ campaign, position: application.position,
    answers: application.answers, attachments: application.attachments });
  return repo.submit(application.id, userId, now);
}

export async function withdrawRecruitmentApplication(
  repo: RecruitmentApplicationRepository, actor: AccessActor | null, applicationId: string,
  now: Date,
) {
  const userId = owner(actor);
  const application = ownedApplication(await repo.findOwned(validId(applicationId, "application id"), userId));
  if (!["Submitted", "Screening", "Shortlisted"].includes(application.state)) {
    throw new DomainError("recruitment application cannot be withdrawn in this state", "conflict");
  }
  return repo.withdraw(application.id, userId, now);
}
