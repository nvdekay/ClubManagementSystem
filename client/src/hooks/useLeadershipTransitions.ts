import { authKeyRoot } from '@/hooks/useAuth'
import { dashboardKeyRoot } from '@/hooks/useDashboard'
import { useInvalidatingMutation } from '@/hooks/useInvalidatingMutation'
import { useQuery } from '@tanstack/react-query'
import {
  claimLeadershipTransition,
  decideLeadershipTransition,
  fetchLeadershipTransition,
  fetchLeadershipTransitionQueue,
  type TransitionDecisionInput,
} from '@/services/leadershipTransitions'

const key = ['leadership-transitions'] as const

// Query hàng đợi chuyển giao lãnh đạo cho ICPDP
export function useLeadershipTransitionQueue(enabled: boolean) {
  return useQuery({
    queryKey: [...key, 'queue'],
    queryFn: ({ signal }) => fetchLeadershipTransitionQueue(signal),
    enabled,
  })
}

// Query chi tiết một yêu cầu chuyển giao lãnh đạo
export function useLeadershipTransition(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...key, 'detail', id],
    queryFn: ({ signal }) => fetchLeadershipTransition(id!, signal),
    enabled: enabled && Boolean(id),
  })
}

// Mutation nhận xử lý hoặc quyết định chuyển giao, rồi làm mới cache
export function useLeadershipTransitionAction() {
  return useInvalidatingMutation(
    (
      action:
        | { kind: 'claim'; id: string; csrfToken: string }
        | { kind: 'decide'; id: string; csrfToken: string; input: TransitionDecisionInput },
    ) =>
      action.kind === 'claim'
        ? claimLeadershipTransition(action.id, action.csrfToken)
        : decideLeadershipTransition(action.id, action.input, action.csrfToken),
    [key, dashboardKeyRoot, authKeyRoot],
    (result) => [[...key, 'detail', result.id], result],
  )
}
