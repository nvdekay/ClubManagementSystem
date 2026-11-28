import { authKeyRoot } from '@/hooks/useAuth'
import { useInvalidatingMutation } from '@/hooks/useInvalidatingMutation'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  decideSuspension,
  fetchAdminSuspensions,
  fetchSuspensions,
  submitSuspension,
} from '@/services/suspensionRequests'
const key = ['suspension-requests'] as const
// Query yêu cầu tạm ngưng và tác động của một CLB
export function useSuspensionRequests(clubId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...key, clubId],
    queryFn: ({ signal }) => fetchSuspensions(clubId!, signal),
    enabled: enabled && Boolean(clubId),
  })
}
// Query một trang hàng đợi yêu cầu tạm ngưng cho ICPDP (trang bắt đầu từ 1)
/** Trang trước vẫn hiển thị trong khi trang mới đang tải. */
export function useAdminSuspensionRequests(page: number, pageSize: number, enabled: boolean) {
  return useQuery({
    queryKey: [...key, 'admin', page, pageSize],
    queryFn: ({ signal }) => fetchAdminSuspensions(page, pageSize, signal),
    enabled,
    placeholderData: keepPreviousData,
  })
}
// Mutation gửi hoặc quyết định yêu cầu tạm ngưng, rồi làm mới cache
export function useSuspensionRequestAction(clubId?: string) {
  return useInvalidatingMutation(
    async (
      a: { csrfToken: string } & (
        | { kind: 'submit'; input: Parameters<typeof submitSuspension>[1] }
        | { kind: 'decide'; id: string; outcome: 'Approve' | 'Reject'; reason: string }
      ),
    ) => {
      if (a.kind === 'submit') {
        await submitSuspension(clubId!, a.input, a.csrfToken)
      } else {
        await decideSuspension(a.id, a.outcome, a.reason, a.csrfToken)
      }
    },
    [key, authKeyRoot],
  )
}
