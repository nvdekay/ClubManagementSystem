import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  activateScheme,
  createScheme,
  deleteScheme,
  fetchSchemes,
  updateScheme,
  type SchemeSettings,
} from '@/services/evaluationSchemes'

const schemesKeyRoot = ['evaluationSchemes'] as const

// Query danh mục thang đánh giá CLB
export function useEvaluationSchemes(enabled: boolean) {
  return useQuery({
    queryKey: [...schemesKeyRoot, 'catalogue'],
    queryFn: ({ signal }) => fetchSchemes(signal),
    enabled,
    retry: false,
  })
}

// Mutation tạo, sửa, kích hoạt hoặc xoá thang đánh giá, rồi làm mới cache
/** Kích hoạt một thang cũng thay thế thang khác, nên mọi thay đổi đều tải lại toàn bộ danh sách. */
export function useEvaluationSchemeAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      action:
        | { kind: 'create'; periodCode: string; copyFromId?: string; csrfToken: string }
        | { kind: 'update'; id: string; settings: SchemeSettings; csrfToken: string }
        | { kind: 'activate' | 'delete'; id: string; csrfToken: string },
    ) => {
      switch (action.kind) {
        case 'create':
          return createScheme(
            {
              periodCode: action.periodCode,
              ...(action.copyFromId ? { copyFromId: action.copyFromId } : {}),
            },
            action.csrfToken,
          )
        case 'update':
          return updateScheme(action.id, action.settings, action.csrfToken)
        case 'activate':
          return activateScheme(action.id, action.csrfToken)
        case 'delete':
          return deleteScheme(action.id, action.csrfToken)
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schemesKeyRoot }),
  })
}
