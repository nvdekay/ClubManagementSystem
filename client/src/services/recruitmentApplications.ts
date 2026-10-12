import type { RecruitmentFormField, RecruitmentRubricCriterion } from "./recruitmentCampaigns";

export type RecruitmentAnswer = string | string[];

export interface RecruitmentAttachment {
  id: string;
  fieldKey: string;
  fileName: string;
  mimeType: string;
  bytes: number;
  uploadedAt: string;
}

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
  state: "Draft" | "Submitted" | "Screening" | "Shortlisted" | "Accepted" | "Rejected"
    | "Waitlisted" | "Onboarded" | "Withdrawn" | "Declined";
  decisionOutcome?: string;
  decisionReason?: string;
  applicantName?: string;
  submittedAt?: string;
  withdrawnAt?: string;
}

export type RecruitmentReviewAction = "screen" | "shortlist" | "decide" | "promote" | "close-withdrawn";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

function mutation(method: string, csrfToken: string, body?: object): RequestInit {
  return { method, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}) };
}

export function fetchMyRecruitmentApplications(signal: AbortSignal) {
  return request<RecruitmentApplication[]>("/applications/recruitment/mine", { signal });
}

export function fetchMyCampaignApplication(campaignId: string, signal: AbortSignal) {
  return request<RecruitmentApplication | null>(`/applications/recruitment/by-campaign/${encodeURIComponent(campaignId)}`, { signal });
}

export function fetchMyRecruitmentApplication(applicationId: string, signal: AbortSignal) {
  return request<RecruitmentApplication>(`/applications/recruitment/${encodeURIComponent(applicationId)}`, { signal });
}

export function createRecruitmentApplication(campaignId: string, position: string, csrfToken: string) {
  return request<RecruitmentApplication>("/applications/recruitment",
    mutation("POST", csrfToken, { campaignId, position }));
}

export function saveRecruitmentApplication(applicationId: string, position: string,
  answers: Record<string, RecruitmentAnswer>, csrfToken: string) {
  return request<RecruitmentApplication>(`/applications/recruitment/${encodeURIComponent(applicationId)}/draft`,
    mutation("PATCH", csrfToken, { position, answers }));
}

export async function uploadRecruitmentFile(applicationId: string, field: RecruitmentFormField,
  file: File, csrfToken: string) {
  const response = await fetch(`/api/v1/applications/recruitment/${encodeURIComponent(applicationId)}/attachments`, {
    method: "POST", credentials: "same-origin", body: file,
    headers: { "X-CSRF-Token": csrfToken, "X-Field-Key": encodeURIComponent(field.key),
      "X-Filename": encodeURIComponent(file.name), "Content-Type": file.type },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: RecruitmentApplication } = await response.json();
  return body.data;
}

export function accessReviewRecruitmentFile(clubId: string, campaignId: string,
  applicationId: string, attachmentId: string) {
  return request<{ url: string; fileName: string }>(`/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/applications/${encodeURIComponent(applicationId)}/attachments/${encodeURIComponent(attachmentId)}/access`);
}

export function accessRecruitmentFile(applicationId: string, attachmentId: string) {
  return request<{ url: string; fileName: string }>(`/applications/recruitment/${encodeURIComponent(applicationId)}/attachments/${encodeURIComponent(attachmentId)}/access`);
}

export function submitRecruitmentApplication(applicationId: string, csrfToken: string) {
  return request<RecruitmentApplication>(`/applications/recruitment/${encodeURIComponent(applicationId)}/submit`,
    mutation("POST", csrfToken));
}

export function withdrawRecruitmentApplication(applicationId: string, csrfToken: string) {
  return request<RecruitmentApplication>(`/applications/recruitment/${encodeURIComponent(applicationId)}/withdraw`,
    mutation("POST", csrfToken));
}

export function fetchApplicationsForReview(clubId: string, campaignId: string, signal: AbortSignal) {
  return request<RecruitmentApplication[]>(`/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/applications`, { signal });
}

export function reviewApplications(clubId: string, campaignId: string, input: {
  action: RecruitmentReviewAction; applicationIds: string[]; outcome?: "Accepted" | "Rejected" | "Waitlisted";
  reason?: string; csrfToken: string;
}) {
  const { csrfToken, ...body } = input;
  return request<RecruitmentApplication[]>(`/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/applications/review`,
    mutation("POST", csrfToken, body));
}

export function onboardRecruitmentApplication(clubId: string, campaignId: string, applicationId: string,
  csrfToken: string, joinedAt?: string) {
  return request<RecruitmentApplication>(`/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/applications/${encodeURIComponent(applicationId)}/onboard`,
    mutation("POST", csrfToken, joinedAt ? { joinedAt } : {}));
}

export function declineRecruitmentApplication(clubId: string, campaignId: string, applicationId: string,
  csrfToken: string) {
  return request<RecruitmentApplication>(`/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/applications/${encodeURIComponent(applicationId)}/decline`,
    mutation("POST", csrfToken));
}

export interface CandidateEvaluation {
  id: string;
  applicationId: string;
  reviewerId: string;
  reviewerName?: string;
  scores: Record<string, number>;
  totalScore?: number;
  comment?: string;
  createdAt: string;
}

export interface CandidateEvaluationGroup {
  applicationId: string;
  evaluations: CandidateEvaluation[];
  summary: { count: number; scoredCount: number; maxTotal: number; mean?: number;
    min?: number; max?: number; stdDev?: number };
}

export interface CandidateEvaluationList {
  rubric: RecruitmentRubricCriterion[];
  applications: CandidateEvaluationGroup[];
}

export function fetchCandidateEvaluations(clubId: string, campaignId: string, signal: AbortSignal) {
  return request<CandidateEvaluationList>(`/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/evaluations`, { signal });
}

export function saveCandidateEvaluation(clubId: string, campaignId: string, applicationId: string,
  input: { scores: Record<string, number>; comment?: string }, csrfToken: string) {
  return request<CandidateEvaluation>(`/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/applications/${encodeURIComponent(applicationId)}/evaluation`,
    mutation("PUT", csrfToken, input));
}
