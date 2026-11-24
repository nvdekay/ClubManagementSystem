import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  claimReview,
  decideReview,
  fetchReview,
  fetchReviewQueue,
  reviewDocumentAccess,
  type ReviewDecisionInput,
} from '@/services/applicationReviews'

const reviewKey = ['application-reviews'] as const

// Query hàng đợi hồ sơ thành lập CLB chờ ICPDP
export function useApplicationReviewQueue(enabled: boolean) {
  return useQuery({
    queryKey: [...reviewKey, 'queue'],
    queryFn: ({ signal }) => fetchReviewQueue(signal),
    enabled,
    retry: false,
  })
}

// Mutation lấy link tài liệu của hồ sơ khi xét duyệt
export function useReviewDocumentAccess() {
  return useMutation({
    mutationFn: ({ id, documentId }: { id: string; documentId: string }) =>
      reviewDocumentAccess(id, documentId),
  })
}

// Query chi tiết một hồ sơ đang xét duyệt
export function useApplicationReview(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...reviewKey, 'detail', id],
    queryFn: ({ signal }) => fetchReview(id!, signal),
    enabled: enabled && Boolean(id),
    retry: false,
  })
}

// Mutation nhận xử lý hoặc quyết định hồ sơ, rồi làm mới cache
export function useApplicationReviewAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      action:
        | { kind: 'claim'; id: string; csrfToken: string }
        | { kind: 'decide'; id: string; input: ReviewDecisionInput; csrfToken: string },
    ) =>
      action.kind === 'claim'
        ? claimReview(action.id, action.csrfToken)
        : decideReview(action.id, action.input, action.csrfToken),
    onSuccess: async (detail) => {
      queryClient.setQueryData([...reviewKey, 'detail', detail.application.id], detail)
      await queryClient.invalidateQueries({ queryKey: reviewKey })
      await queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
  })
}
