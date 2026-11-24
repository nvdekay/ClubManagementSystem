import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  dissolveClub,
  fetchClubLifecycle,
  fetchClubLifecycles,
  reactivateClub,
  suspendClub,
} from '@/services/clubLifecycle'

const lifecycleKeyRoot = ['clubLifecycle'] as const

// Query trạng thái vòng đời của các CLB
export function useClubLifecycles(enabled: boolean) {
  return useQuery({
    queryKey: [...lifecycleKeyRoot, 'list'],
    queryFn: ({ signal }) => fetchClubLifecycles(signal),
    enabled,
    retry: false,
  })
}

// Query chi tiết vòng đời một CLB
export function useClubLifecycle(id: string | null) {
  return useQuery({
    queryKey: [...lifecycleKeyRoot, 'detail', id],
    queryFn: ({ signal }) => fetchClubLifecycle(id!, signal),
    enabled: Boolean(id),
    retry: false,
  })
}

// Mutation tạm ngưng, kích hoạt lại hoặc giải thể CLB, rồi làm mới cache
/** Một quyết định làm thay đổi CLB, các sự kiện của nó và cả danh sách, nên mọi query vòng đời đều được tải lại. */
export function useClubLifecycleAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      action:
        | { kind: 'suspend'; id: string; reason: string; until?: string; csrfToken: string }
        | { kind: 'reactivate' | 'dissolve'; id: string; reason: string; csrfToken: string },
    ) => {
      switch (action.kind) {
        case 'suspend':
          return suspendClub(
            action.id,
            { reason: action.reason, ...(action.until ? { until: action.until } : {}) },
            action.csrfToken,
          )
        case 'reactivate':
          return reactivateClub(action.id, action.reason, action.csrfToken)
        case 'dissolve':
          return dissolveClub(action.id, action.reason, action.csrfToken)
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: lifecycleKeyRoot }),
  })
}
