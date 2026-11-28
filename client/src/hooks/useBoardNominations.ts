import { authKeyRoot } from '@/hooks/useAuth'
import { useInvalidatingMutation } from '@/hooks/useInvalidatingMutation'
import { useQuery } from '@tanstack/react-query'
import {
  claimBoardNomination,
  decideBoardNomination,
  fetchBoardNomination,
  fetchBoardNominationContext,
  fetchBoardNominationQueue,
  fetchClubBoardNominations,
  submitBoardNomination,
  type BoardNominationDecisionInput,
} from '@/services/boardNominations'

const boardNominationKey = ['board-nominations'] as const

// Query ngữ cảnh đề cử ban chủ nhiệm của CLB
export function useBoardNominationContext(clubId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...boardNominationKey, 'context', clubId],
    queryFn: ({ signal }) => fetchBoardNominationContext(clubId!, signal),
    enabled: enabled && Boolean(clubId),
  })
}

// Query các đề cử ban chủ nhiệm của CLB
export function useClubBoardNominations(clubId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...boardNominationKey, 'club', clubId],
    queryFn: ({ signal }) => fetchClubBoardNominations(clubId!, signal),
    enabled: enabled && Boolean(clubId),
  })
}

// Query hàng đợi đề cử ban chủ nhiệm cho ICPDP
export function useBoardNominationQueue(enabled: boolean) {
  return useQuery({
    queryKey: [...boardNominationKey, 'queue'],
    queryFn: ({ signal }) => fetchBoardNominationQueue(signal),
    enabled,
  })
}

// Query chi tiết một đề cử ban chủ nhiệm
export function useBoardNomination(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...boardNominationKey, 'detail', id],
    queryFn: ({ signal }) => fetchBoardNomination(id!, signal),
    enabled: enabled && Boolean(id),
  })
}

// Mutation nộp, nhận xử lý hoặc quyết định đề cử, rồi làm mới cache
export function useBoardNominationAction() {
  return useInvalidatingMutation(
    (
      action:
        | {
            kind: 'submit'
            clubId: string
            seats: Array<{ positionId: string; membershipId: string }>
            csrfToken: string
          }
        | { kind: 'claim'; id: string; csrfToken: string }
        | { kind: 'decide'; id: string; input: BoardNominationDecisionInput; csrfToken: string },
    ) => {
      switch (action.kind) {
        case 'submit':
          return submitBoardNomination(action.clubId, action.seats, action.csrfToken)
        case 'claim':
          return claimBoardNomination(action.id, action.csrfToken)
        case 'decide':
          return decideBoardNomination(action.id, action.input, action.csrfToken)
      }
    },
    // The context query sits under boardNominationKey, so it is refreshed too.
    [boardNominationKey, authKeyRoot],
    (result, action) =>
      action.kind === 'submit' ? null : [[...boardNominationKey, 'detail', result.id], result],
  )
}
