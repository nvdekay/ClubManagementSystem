import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  accessRecruitmentFile, createRecruitmentApplication, fetchMyCampaignApplication,
  declineRecruitmentApplication, fetchApplicationsForReview, onboardRecruitmentApplication, reviewApplications,
  fetchMyRecruitmentApplications, fetchMyRecruitmentApplication, saveRecruitmentApplication,
  submitRecruitmentApplication, uploadRecruitmentFile, withdrawRecruitmentApplication, accessReviewRecruitmentFile,
  fetchCandidateEvaluations, saveCandidateEvaluation,
} from "@/services/recruitmentApplications";
import type { RecruitmentAnswer, RecruitmentApplication } from "@/services/recruitmentApplications";
import type { RecruitmentFormField } from "@/services/recruitmentCampaigns";

const recruitmentApplicationKey = ["recruitment-applications"] as const;

function applicationListKey() {
  return [...recruitmentApplicationKey, "mine"] as const;
}

function campaignApplicationKey(campaignId: string | undefined) {
  return [...recruitmentApplicationKey, "campaign", campaignId] as const;
}

function applicationDetailKey(applicationId: string | undefined) {
  return [...recruitmentApplicationKey, "detail", applicationId] as const;
}

export function useMyRecruitmentApplications(enabled: boolean) {
  return useQuery({ queryKey: applicationListKey(), queryFn: ({ signal }) =>
    fetchMyRecruitmentApplications(signal), enabled, retry: false });
}

export function useMyCampaignApplication(campaignId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: campaignApplicationKey(campaignId), queryFn: ({ signal }) =>
    fetchMyCampaignApplication(campaignId!, signal), enabled: enabled && Boolean(campaignId), retry: false });
}

export function useMyRecruitmentApplication(applicationId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: applicationDetailKey(applicationId), queryFn: ({ signal }) =>
    fetchMyRecruitmentApplication(applicationId!, signal), enabled: enabled && Boolean(applicationId), retry: false });
}

export function useApplicationsForReview(clubId: string | undefined, campaignId: string | undefined) {
  return useQuery({ queryKey: [...recruitmentApplicationKey, "review", clubId, campaignId],
    queryFn: ({ signal }) => fetchApplicationsForReview(clubId!, campaignId!, signal),
    enabled: Boolean(clubId && campaignId), retry: false });
}

export function useReviewRecruitmentApplications() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: { clubId: string; campaignId: string; action: Parameters<typeof reviewApplications>[2]["action"];
    applicationIds: string[]; outcome?: "Accepted" | "Rejected" | "Waitlisted"; reason?: string; csrfToken: string }) => {
    const { clubId, campaignId, ...body } = input;
    return reviewApplications(clubId, campaignId, body);
  }, onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: [...recruitmentApplicationKey, "review"] });
  } });
}

export function useRecruitmentOnboardingAction() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: { kind: "onboard" | "decline"; clubId: string;
    campaignId: string; applicationId: string; csrfToken: string }) => input.kind === "onboard"
    ? onboardRecruitmentApplication(input.clubId, input.campaignId, input.applicationId, input.csrfToken)
    : declineRecruitmentApplication(input.clubId, input.campaignId, input.applicationId, input.csrfToken),
  onSuccess: async () => queryClient.invalidateQueries({ queryKey: [...recruitmentApplicationKey, "review"] }) });
}

function evaluationsKey(clubId: string | undefined, campaignId: string | undefined) {
  return [...recruitmentApplicationKey, "evaluations", clubId, campaignId] as const;
}

export function useCandidateEvaluations(clubId: string | undefined, campaignId: string | undefined) {
  return useQuery({ queryKey: evaluationsKey(clubId, campaignId),
    queryFn: ({ signal }) => fetchCandidateEvaluations(clubId!, campaignId!, signal),
    enabled: Boolean(clubId && campaignId), retry: false });
}

export function useSaveCandidateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: { clubId: string; campaignId: string; applicationId: string;
    scores: Record<string, number>; comment?: string; csrfToken: string }) =>
    saveCandidateEvaluation(input.clubId, input.campaignId, input.applicationId,
      { scores: input.scores, ...(input.comment ? { comment: input.comment } : {}) }, input.csrfToken),
  // The summary (mean/dispersion) is computed server-side, so refetch instead of patching the cache.
  onSuccess: async (_saved, input) => queryClient.invalidateQueries({ queryKey: evaluationsKey(input.clubId, input.campaignId) }) });
}

export function useReviewAttachmentAccess() {
  return useMutation({ mutationFn: (input: { clubId: string; campaignId: string; applicationId: string;
    attachmentId: string }) => accessReviewRecruitmentFile(input.clubId, input.campaignId,
    input.applicationId, input.attachmentId) });
}

export function useRecruitmentApplicationAction() {
  const queryClient = useQueryClient();
  return useMutation<RecruitmentApplication | { url: string; fileName: string }, Error,
    | { kind: "create"; campaignId: string; position: string; csrfToken: string }
    | { kind: "save"; applicationId: string; position: string; answers: Record<string, RecruitmentAnswer>; csrfToken: string }
    | { kind: "upload"; applicationId: string; field: RecruitmentFormField; file: File; csrfToken: string }
    | { kind: "submit"; applicationId: string; csrfToken: string }
    | { kind: "withdraw"; applicationId: string; csrfToken: string }
    | { kind: "access"; applicationId: string; attachmentId: string }>({
    mutationFn: (action) => {
      switch (action.kind) {
        case "create": return createRecruitmentApplication(action.campaignId, action.position, action.csrfToken);
        case "save": return saveRecruitmentApplication(action.applicationId, action.position,
          action.answers, action.csrfToken);
        case "upload": return uploadRecruitmentFile(action.applicationId, action.field,
          action.file, action.csrfToken);
        case "submit": return submitRecruitmentApplication(action.applicationId, action.csrfToken);
        case "withdraw": return withdrawRecruitmentApplication(action.applicationId, action.csrfToken);
        case "access": return accessRecruitmentFile(action.applicationId, action.attachmentId);
      }
    },
    onSuccess: async (_result, action) => {
      await queryClient.invalidateQueries({ queryKey: recruitmentApplicationKey });
      if ("applicationId" in action) {
        await queryClient.invalidateQueries({ queryKey: applicationDetailKey(action.applicationId) });
      }
      if (action.kind === "create") {
        await queryClient.invalidateQueries({ queryKey: campaignApplicationKey(action.campaignId) });
      }
    },
  });
}
