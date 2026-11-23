import { DomainError } from "./errors.js";
import {
  isValidEvidenceLink,
  type PeriodicAchievementEntry,
  type PeriodicCampaign,
  type PeriodicCustomAnswer,
  type PeriodicCustomField,
  type PeriodicEventEntry,
  type PeriodicMemberEntry,
  type PeriodicReportDetail,
} from "./periodic-report.js";

export interface PeriodicDraftInput {
  narrative?: string;
  nextPlan?: string;
  evidence?: { note?: string; url?: string }[];
  members?: PeriodicMemberEntry[];
  events?: PeriodicEventEntry[];
  achievements?: PeriodicAchievementEntry[];
  customAnswers?: PeriodicCustomAnswer[];
}

export interface ClubPeriodicReportRepository {
  list(clubId: string): Promise<PeriodicReportDetail[]>;
  getCampaign?(periodCode: string): Promise<PeriodicCampaign | null>;
  create(clubId: string, periodCode: string, dueAt: Date, userId: string, now: Date): Promise<PeriodicReportDetail>;
  save(clubId: string, id: string, revision: number, input: PeriodicDraftInput, userId: string, now: Date): Promise<PeriodicReportDetail>;
  submit(clubId: string, id: string, revision: number, userId: string, now: Date): Promise<PeriodicReportDetail>;
}

function normalizeMembers(raw: PeriodicMemberEntry[] | undefined, submitting: boolean): PeriodicMemberEntry[] | undefined {
  if (raw === undefined) return undefined;
  if (raw.length > 500) throw new DomainError("too many members in report", "validation", { field: "members" });
  const members = raw.map((item) => {
    const fullName = item.fullName.trim();
    const studentCode = item.studentCode.trim();
    const email = item.email.trim();
    const activityScore = Number(item.activityScore);
    if (fullName.length > 200 || studentCode.length > 100 || email.length > 320) {
      throw new DomainError("member information is too long", "validation", { field: "members" });
    }
    if (!Number.isFinite(activityScore) || activityScore < 0 || activityScore > 10) {
      throw new DomainError("activity score must be between 0 and 10", "validation", { field: "members" });
    }
    if (submitting && (!fullName || !studentCode || !email)) {
      throw new DomainError("each member requires name, student code, email and activity score (0-10)", "validation", { field: "members" });
    }
    return {
      ...(item.userId ? { userId: item.userId.trim() } : {}),
      fullName,
      studentCode,
      email,
      activityScore: Math.round(activityScore * 100) / 100,
      source: item.source === "SYSTEM" ? "SYSTEM" as const : "MANUAL" as const,
    };
  });
  if (submitting && members.length === 0) {
    throw new DomainError("at least one active member is required in the report", "validation", { field: "members" });
  }
  return members;
}

function normalizeEvents(raw: PeriodicEventEntry[] | undefined, submitting: boolean): PeriodicEventEntry[] | undefined {
  if (raw === undefined) return undefined;
  if (raw.length > 200) throw new DomainError("too many events in report", "validation", { field: "events" });
  return raw.map((item) => {
    const title = item.title.trim();
    const description = item.description.trim();
    const heldAt = item.heldAt.trim();
    const participantCount = Number(item.participantCount);
    const evidenceUrl = item.evidenceUrl?.trim() || undefined;
    const evidenceNote = item.evidenceNote?.trim() || undefined;
    if (title.length > 300 || description.length > 5_000 || heldAt.length > 100 || (evidenceNote?.length ?? 0) > 1_000) {
      throw new DomainError("event information is too long", "validation", { field: "events" });
    }
    if (!Number.isFinite(participantCount) || participantCount < 0 || !Number.isInteger(participantCount)) {
      throw new DomainError("participant count must be a non-negative integer", "validation", { field: "events" });
    }
    if (evidenceUrl && !isValidEvidenceLink(evidenceUrl)) {
      throw new DomainError("invalid event evidence image or URL", "validation", { field: "events" });
    }
    if (submitting && (!title || !description || !heldAt || !evidenceUrl)) {
      throw new DomainError("each event requires title, description, time, participant count and evidence image/URL", "validation", { field: "events" });
    }
    return {
      ...(item.eventId ? { eventId: item.eventId.trim() } : {}),
      title,
      description,
      heldAt,
      participantCount,
      ...(evidenceUrl ? { evidenceUrl } : {}),
      ...(evidenceNote ? { evidenceNote } : {}),
      source: item.source === "SYSTEM" ? "SYSTEM" as const : "MANUAL" as const,
    };
  });
}

function normalizeAchievements(raw: PeriodicAchievementEntry[] | undefined, submitting: boolean): PeriodicAchievementEntry[] | undefined {
  if (raw === undefined) return undefined;
  if (raw.length > 100) throw new DomainError("too many achievements in report", "validation", { field: "achievements" });
  return raw.map((item) => {
    const title = item.title.trim();
    const description = item.description.trim();
    const evidenceUrl = item.evidenceUrl?.trim() || undefined;
    const evidenceNote = item.evidenceNote?.trim() || undefined;
    if (title.length > 300 || description.length > 5_000 || (evidenceNote?.length ?? 0) > 1_000) {
      throw new DomainError("achievement information is too long", "validation", { field: "achievements" });
    }
    if (evidenceUrl && !isValidEvidenceLink(evidenceUrl)) {
      throw new DomainError("invalid achievement evidence image or URL", "validation", { field: "achievements" });
    }
    if (submitting && (!title || !description || !evidenceUrl)) {
      throw new DomainError("each achievement requires title, description and evidence image/URL", "validation", { field: "achievements" });
    }
    return {
      title,
      description,
      ...(evidenceUrl ? { evidenceUrl } : {}),
      ...(evidenceNote ? { evidenceNote } : {}),
    };
  });
}

function normalizeCustomAnswers(
  raw: PeriodicCustomAnswer[] | undefined,
  customFields: readonly PeriodicCustomField[] | undefined,
  submitting: boolean,
): PeriodicCustomAnswer[] | undefined {
  if (raw === undefined && (!customFields || customFields.length === 0)) return undefined;
  const answers = raw ?? [];
  if (answers.length > 50) throw new DomainError("too many custom answers", "validation", { field: "customAnswers" });
  const normalized = answers.map((item) => {
    const fieldId = item.fieldId.trim();
    if (!fieldId || fieldId.length > 100) throw new DomainError("invalid custom field id", "validation", { field: "customAnswers" });
    const textValue = item.textValue?.trim() || undefined;
    const evidenceUrl = item.evidenceUrl?.trim() || undefined;
    if (textValue && textValue.length > 10_000) throw new DomainError("custom field text is too long", "validation", { field: "customAnswers" });
    if (item.numberValue !== undefined && !Number.isFinite(item.numberValue)) {
      throw new DomainError("invalid custom field number", "validation", { field: "customAnswers" });
    }
    if (evidenceUrl && !isValidEvidenceLink(evidenceUrl)) {
      throw new DomainError("invalid custom field evidence image or URL", "validation", { field: "customAnswers" });
    }
    return {
      fieldId,
      ...(item.label ? { label: item.label.trim().slice(0, 200) } : {}),
      ...(item.type ? { type: item.type } : {}),
      ...(textValue ? { textValue } : {}),
      ...(item.numberValue !== undefined ? { numberValue: item.numberValue } : {}),
      ...(evidenceUrl ? { evidenceUrl } : {}),
    };
  });

  if (submitting && customFields?.length) {
    const byId = new Map(normalized.map((item) => [item.fieldId, item]));
    for (const field of customFields) {
      if (!field.required) continue;
      const answer = byId.get(field.id);
      if (field.type === "text" && !answer?.textValue) {
        throw new DomainError(`required field "${field.label}" is missing`, "validation", { field: "customAnswers" });
      }
      if (field.type === "number" && (answer?.numberValue === undefined || !Number.isFinite(answer.numberValue))) {
        throw new DomainError(`required field "${field.label}" is missing`, "validation", { field: "customAnswers" });
      }
      if (field.type === "evidence" && !answer?.evidenceUrl) {
        throw new DomainError(`required field "${field.label}" is missing`, "validation", { field: "customAnswers" });
      }
    }
  }
  return normalized;
}

export function normalizePeriodicDraft(
  input: PeriodicDraftInput,
  submitting = false,
  customFields?: readonly PeriodicCustomField[],
): PeriodicDraftInput {
  const narrative = (input.narrative ?? "").trim();
  const nextPlan = (input.nextPlan ?? "").trim();
  const rawEvidence = input.evidence ?? [];
  if (narrative.length > 20_000 || nextPlan.length > 20_000 || rawEvidence.length > 50) {
    throw new DomainError("report content is too long", "validation");
  }
  const evidence = rawEvidence.map((entry) => {
    const note = entry.note?.trim();
    const url = entry.url?.trim();
    if ((note?.length ?? 0) > 2_000 || (url?.length ?? 0) > 5_000_000) throw new DomainError("evidence is too long", "validation");
    if (url && !isValidEvidenceLink(url)) {
      throw new DomainError("invalid evidence URL", "validation");
    }
    if (!note && !url) throw new DomainError("evidence needs a note or URL", "validation");
    return { ...(note ? { note } : {}), ...(url ? { url } : {}) };
  });

  const hasStructured =
    input.members !== undefined ||
    input.events !== undefined ||
    input.achievements !== undefined ||
    input.customAnswers !== undefined;

  const members = normalizeMembers(input.members, submitting);
  const events = normalizeEvents(input.events, submitting);
  const achievements = normalizeAchievements(input.achievements, submitting);
  const customAnswers = normalizeCustomAnswers(input.customAnswers, customFields, submitting);

  if (submitting && !hasStructured && (!narrative || !nextPlan || !evidence.length)) {
    throw new DomainError("narrative, next plan and evidence are required", "validation");
  }

  return {
    narrative,
    nextPlan,
    evidence,
    ...(members !== undefined ? { members } : {}),
    ...(events !== undefined ? { events } : {}),
    ...(achievements !== undefined ? { achievements } : {}),
    ...(customAnswers !== undefined ? { customAnswers } : {}),
  };
}
