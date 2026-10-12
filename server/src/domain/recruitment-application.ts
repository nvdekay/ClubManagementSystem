import type { PublicCampaign } from "./public-discovery.js";
import { DomainError } from "./errors.js";

export type RecruitmentAnswer = string | string[];

export interface RecruitmentAttachment {
  id: string;
  fieldKey: string;
  fileName: string;
  mimeType: string;
  bytes: number;
  assetId: string;
  uploadedAt: Date;
}

export type RecruitmentApplicationState = "Draft" | "Submitted" | "Screening" | "Shortlisted"
  | "Accepted" | "Rejected" | "Waitlisted" | "Onboarded" | "Withdrawn" | "Declined";

export interface RecruitmentApplication {
  id: string;
  campaignId: string;
  clubId: string;
  userId: string;
  campaignTitle?: string;
  clubName?: string;
  position: string;
  answers: Record<string, RecruitmentAnswer>;
  attachments: RecruitmentAttachment[];
  state: RecruitmentApplicationState;
  decisionOutcome?: string;
  decisionReason?: string;
  submittedAt?: Date;
  withdrawnAt?: Date;
}

export type RecruitmentDecision = "Shortlisted" | "Accepted" | "Rejected" | "Waitlisted";

export interface RecruitmentReviewRepository {
  listForReview(clubId: string, campaignId: string, state?: RecruitmentApplicationState):
    Promise<RecruitmentApplication[]>;
  transition(input: { clubId: string; campaignId: string; applicationIds: string[];
    action: "screen" | "shortlist" | "decide" | "promote" | "close-withdrawn";
    outcome?: RecruitmentDecision; reason?: string; actorId: string; now: Date }):
    Promise<RecruitmentApplication[]>;
  onboard(input: { clubId: string; campaignId: string; applicationId: string;
    actorId: string; joinedAt: Date; departmentId?: string; now: Date }): Promise<RecruitmentApplication>;
  declineAccepted(input: { clubId: string; campaignId: string; applicationId: string;
    actorId: string; reason?: string; now: Date }): Promise<RecruitmentApplication>;
  /** Attachment of a submitted (non-draft) application in this club's campaign, for reviewers. */
  reviewAttachment(input: { clubId: string; campaignId: string; applicationId: string;
    attachmentId: string }): Promise<RecruitmentAttachment | null>;
}

export interface RecruitmentEligibility {
  userActive: boolean;
  activeMembership: boolean;
  bannedMembership: boolean;
}

export interface RecruitmentApplicationRepository extends RecruitmentReviewRepository {
  campaign(campaignId: string, now: Date): Promise<PublicCampaign | null>;
  eligibility(userId: string, clubId: string): Promise<RecruitmentEligibility>;
  createDraft(input: { campaign: PublicCampaign; userId: string; position: string;
    now: Date }): Promise<RecruitmentApplication>;
  findOwned(applicationId: string, userId: string): Promise<RecruitmentApplication | null>;
  findMineForCampaign(campaignId: string, userId: string): Promise<RecruitmentApplication | null>;
  listMine(userId: string): Promise<RecruitmentApplication[]>;
  updateDraft(input: { applicationId: string; userId: string; position: string;
    answers: Record<string, RecruitmentAnswer>; now: Date }): Promise<RecruitmentApplication>;
  addAttachment(input: { applicationId: string; userId: string;
    attachment: RecruitmentAttachment }): Promise<RecruitmentApplication>;
  attachmentAccess(applicationId: string, userId: string,
    attachmentId: string): Promise<RecruitmentAttachment | null>;
  submit(applicationId: string, userId: string, now: Date): Promise<RecruitmentApplication>;
  withdraw(applicationId: string, userId: string, now: Date): Promise<RecruitmentApplication>;
}

export interface RecruitmentAttachmentStorage {
  upload(input: { ownerId: string; applicationId: string; fieldKey: string;
    fileName: string; mimeType: string; bytes: Buffer; now: Date }): Promise<RecruitmentAttachment>;
  accessUrl(assetId: string): Promise<string>;
}

const objectId = /^[0-9a-f]{24}$/i;

export function validateRecruitmentAnswers(input: {
  campaign: PublicCampaign;
  position: string;
  answers: Record<string, RecruitmentAnswer>;
  attachments: readonly RecruitmentAttachment[];
}): void {
  const positions = input.campaign.positions ?? [];
  if (!positions.some((position) => position.toLocaleLowerCase("vi-VN")
    === input.position.toLocaleLowerCase("vi-VN"))) {
    throw new DomainError("application position is not part of this campaign", "validation");
  }
  const fields = input.campaign.formSchema ?? [];
  const allowedKeys = new Set(fields.filter((field) => field.type !== "file").map((field) => field.key));
  if (Object.keys(input.answers).some((key) => !allowedKeys.has(key))) {
    throw new DomainError("application contains an unknown answer", "validation");
  }
  const attachmentKeys = new Set(input.attachments.map((attachment) => attachment.fieldKey));
  for (const field of fields) {
    if (field.type === "file") {
      const matching = input.attachments.filter((attachment) => attachment.fieldKey === field.key);
      if (matching.length > 1 || (field.required && matching.length === 0)) {
        throw new DomainError("required application attachment is missing or duplicated", "validation", {
          field: field.key,
        });
      }
      continue;
    }
    const answer = input.answers[field.key];
    if (answer === undefined || answer === "" || (Array.isArray(answer) && answer.length === 0)) {
      if (field.required) throw new DomainError("required application answer is missing", "validation", {
        field: field.key,
      });
      continue;
    }
    if (field.type === "multiselect") {
      if (!Array.isArray(answer) || !answer.length || answer.some((value) =>
        !(field.options ?? []).includes(value))) {
        throw new DomainError("invalid application answer", "validation", { field: field.key });
      }
    } else if (typeof answer !== "string" || answer.length > 10_000
      || (field.type === "select" && !(field.options ?? []).includes(answer))) {
      throw new DomainError("invalid application answer", "validation", { field: field.key });
    }
    if (field.type === "url" && typeof answer === "string") {
      try {
        const url = new URL(answer);
        if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error();
      } catch {
        throw new DomainError("invalid application URL", "validation", { field: field.key });
      }
    }
  }
  if (input.attachments.some((attachment) => !fields.some((field) =>
    field.type === "file" && field.key === attachment.fieldKey))) {
    throw new DomainError("application contains an unexpected attachment", "validation");
  }
  if (attachmentKeys.size !== input.attachments.length) {
    throw new DomainError("only one attachment is allowed per file question", "validation");
  }
  if (!objectId.test(input.campaign.id) || !objectId.test(input.campaign.clubId ?? "")) {
    throw new DomainError("invalid recruitment campaign", "validation");
  }
}
