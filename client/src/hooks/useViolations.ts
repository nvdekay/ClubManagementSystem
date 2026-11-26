import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  applyViolationStep,
  fetchViolation,
  fetchViolations,
  fetchViolationSources,
  openViolation,
  type OpenViolationInput,
  type ViolationStep,
} from '@/services/violations'

const violationKey = ['violations'] as const

// Query danh sách vi phạm của các CLB
export function useViolations(enabled: boolean) {
  return useQuery({
    queryKey: [...violationKey, 'list'],
    queryFn: ({ signal }) => fetchViolations(signal),
    enabled,
  })
}

// Query chi tiết một vi phạm
export function useViolation(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...violationKey, 'detail', id],
    queryFn: ({ signal }) => fetchViolation(id!, signal),
    enabled: enabled && Boolean(id),
  })
}

// Query nguồn dữ liệu để mở vi phạm cho một CLB
export function useViolationSources(clubId: string) {
  return useQuery({
    queryKey: [...violationKey, 'sources', clubId],
    queryFn: ({ signal }) => fetchViolationSources(clubId, signal),
    enabled: Boolean(clubId),
  })
}

// Mutation mở hồ sơ vi phạm mới, rồi làm mới danh sách
export function useOpenViolation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: { input: OpenViolationInput; csrfToken: string }) =>
      openViolation(action.input, action.csrfToken),
    onSuccess: async (detail) => {
      queryClient.setQueryData([...violationKey, 'detail', detail.id], detail)
      await queryClient.invalidateQueries({ queryKey: [...violationKey, 'list'] })
    },
  })
}

// Mutation thực hiện bước xử lý vi phạm, rồi làm mới cache
export function useViolationStep() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: { id: string; step: ViolationStep; csrfToken: string }) =>
      applyViolationStep(action.id, action.step, action.csrfToken),
    onSuccess: async (detail) => {
      queryClient.setQueryData([...violationKey, 'detail', detail.id], detail)
      await queryClient.invalidateQueries({ queryKey: [...violationKey, 'list'] })
    },
  })
}
