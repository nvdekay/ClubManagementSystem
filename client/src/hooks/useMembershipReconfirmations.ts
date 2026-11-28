import { useInvalidatingMutation } from '@/hooks/useInvalidatingMutation'
import { useQuery } from '@tanstack/react-query'
import { confirmReconfirmation, fetchReconfirmations } from '@/services/membershipReconfirmations'
const key = ['membership-reconfirmations'] as const
// Query các yêu cầu xác nhận lại thành viên của người dùng
export function useMembershipReconfirmations(userId: string | undefined) {
  return useQuery({
    queryKey: [...key, userId],
    queryFn: ({ signal }) => fetchReconfirmations(signal),
    enabled: Boolean(userId),
  })
}
// Mutation xác nhận tiếp tục là thành viên CLB
export function useConfirmMembership() {
  return useInvalidatingMutation(
    (a: { id: string; csrfToken: string }) => confirmReconfirmation(a.id, a.csrfToken),
    [key],
  )
}
