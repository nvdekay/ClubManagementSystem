import { useInvalidatingMutation } from '@/hooks/useInvalidatingMutation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  accessRecruitmentFile,
  createRecruitmentApplication,
  fetchMyCampaignApplication,
  declineRecruitmentApplication,
  fetchApplicationsForReview,
  onboardRecruitmentApplication,
  reviewApplications,
  fetchMyRecruitmentApplications,
  saveRecruitmentApplication,
  submitRecruitmentApplication,
  uploadRecruitmentFile,
  withdrawRecruitmentApplication,
  accessReviewRecruitmentFile,
  fetchCandidateEvaluations,
  saveCandidateEvaluation,
} from '@/services/recruitmentApplications'
import type { RecruitmentAnswer, RecruitmentApplication } from '@/services/recruitmentApplications'
import type { RecruitmentFormField } from '@/services/recruitmentCampaigns'

const recruitmentApplicationKey = ['recruitment-applications'] as const

// Query key của danh sách đơn ứng tuyển của tôi
function applicationListKey() {
  return [...recruitmentApplicationKey, 'mine'] as const
}

// Query key của đơn của tôi trong một đợt tuyển
function campaignApplicationKey(campaignId: string | undefined) {
  return [...recruitmentApplicationKey, 'campaign', campaignId] as const
}

// Query đơn ứng tuyển CLB của tôi
export function useMyRecruitmentApplications(enabled: boolean) {
  return useQuery({
    queryKey: applicationListKey(),
    queryFn: ({ signal }) => fetchMyRecruitmentApplications(signal),
    enabled,
  })
}

// Query đơn của tôi trong một đợt tuyển
export function useMyCampaignApplication(campaignId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: campaignApplicationKey(campaignId),
    queryFn: ({ signal }) => fetchMyCampaignApplication(campaignId!, signal),
    enabled: enabled && Boolean(campaignId),
  })
}

// Query đơn ứng tuyển của đợt tuyển để CLB xét
export function useApplicationsForReview(
  clubId: string | undefined,
  campaignId: string | undefined,
) {
  return useQuery({
    queryKey: [...recruitmentApplicationKey, 'review', clubId, campaignId],
    queryFn: ({ signal }) => fetchApplicationsForReview(clubId!, campaignId!, signal),
    enabled: Boolean(clubId && campaignId),
  })
}

// Mutation gửi kết quả xét duyệt đơn ứng tuyển, rồi làm mới cache
export function useReviewRecruitmentApplications() {
  return useInvalidatingMutation(
    (input: {
      clubId: string
      campaignId: string
      action: Parameters<typeof reviewApplications>[2]['action']
      applicationIds: string[]
      outcome?: 'Accepted' | 'Rejected' | 'Waitlisted'
      reason?: string
      csrfToken: string
    }) => {
      const { clubId, campaignId, ...body } = input
      return reviewApplications(clubId, campaignId, body)
    },
    [[...recruitmentApplicationKey, 'review']],
  )
}

// Mutation nhận hoặc từ chối ứng viên, rồi làm mới cache
export function useRecruitmentOnboardingAction() {
  return useInvalidatingMutation(
    (input: {
      kind: 'onboard' | 'decline'
      clubId: string
      campaignId: string
      applicationId: string
      csrfToken: string
    }) =>
      input.kind === 'onboard'
        ? onboardRecruitmentApplication(
            input.clubId,
            input.campaignId,
            input.applicationId,
            input.csrfToken,
          )
        : declineRecruitmentApplication(
            input.clubId,
            input.campaignId,
            input.applicationId,
            input.csrfToken,
          ),
    [[...recruitmentApplicationKey, 'review']],
  )
}

// Query key của đánh giá ứng viên trong một đợt tuyển
function evaluationsKey(clubId: string | undefined, campaignId: string | undefined) {
  return [...recruitmentApplicationKey, 'evaluations', clubId, campaignId] as const
}

// Query đánh giá ứng viên của đợt tuyển
export function useCandidateEvaluations(
  clubId: string | undefined,
  campaignId: string | undefined,
) {
  return useQuery({
    queryKey: evaluationsKey(clubId, campaignId),
    queryFn: ({ signal }) => fetchCandidateEvaluations(clubId!, campaignId!, signal),
    enabled: Boolean(clubId && campaignId),
  })
}

// Mutation lưu đánh giá một ứng viên, rồi làm mới cache
export function useSaveCandidateEvaluation() {
  // Phần tóm tắt (trung bình/độ phân tán) do server tính, nên tải lại thay vì vá cache.
  return useInvalidatingMutation(
    (input: {
      clubId: string
      campaignId: string
      applicationId: string
      scores: Record<string, number>
      comment?: string
      csrfToken: string
    }) =>
      saveCandidateEvaluation(
        input.clubId,
        input.campaignId,
        input.applicationId,
        { scores: input.scores, ...(input.comment ? { comment: input.comment } : {}) },
        input.csrfToken,
      ),
    (_saved, input) => [evaluationsKey(input.clubId, input.campaignId)],
  )
}

// Mutation lấy link file đính kèm của ứng viên khi xét đơn
export function useReviewAttachmentAccess() {
  return useMutation({
    mutationFn: (input: {
      clubId: string
      campaignId: string
      applicationId: string
      attachmentId: string
    }) =>
      accessReviewRecruitmentFile(
        input.clubId,
        input.campaignId,
        input.applicationId,
        input.attachmentId,
      ),
  })
}

// Mutation tạo, lưu, nộp, rút đơn ứng tuyển và tải file, rồi làm mới cache
export function useRecruitmentApplicationAction() {
  const queryClient = useQueryClient()
  return useMutation<
    RecruitmentApplication | { url: string; fileName: string },
    Error,
    | { kind: 'create'; campaignId: string; position: string; csrfToken: string }
    | {
        kind: 'save'
        applicationId: string
        position: string
        answers: Record<string, RecruitmentAnswer>
        csrfToken: string
      }
    | {
        kind: 'upload'
        applicationId: string
        field: RecruitmentFormField
        file: File
        csrfToken: string
      }
    | { kind: 'submit'; applicationId: string; csrfToken: string }
    | { kind: 'withdraw'; applicationId: string; csrfToken: string }
    | { kind: 'access'; applicationId: string; attachmentId: string }
  >({
    mutationFn: (action) => {
      switch (action.kind) {
        case 'create':
          return createRecruitmentApplication(action.campaignId, action.position, action.csrfToken)
        case 'save':
          return saveRecruitmentApplication(
            action.applicationId,
            action.position,
            action.answers,
            action.csrfToken,
          )
        case 'upload':
          return uploadRecruitmentFile(
            action.applicationId,
            action.field,
            action.file,
            action.csrfToken,
          )
        case 'submit':
          return submitRecruitmentApplication(action.applicationId, action.csrfToken)
        case 'withdraw':
          return withdrawRecruitmentApplication(action.applicationId, action.csrfToken)
        case 'access':
          return accessRecruitmentFile(action.applicationId, action.attachmentId)
      }
    },
    // Every application query (list, campaign, detail) sits under this root key.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recruitmentApplicationKey }),
  })
}
