import { useInvalidatingMutation } from '@/hooks/useInvalidatingMutation'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  applyViolationStep,
  fetchViolation,
  fetchViolations,
  fetchViolationSources,
  openViolation,
  type OpenViolationInput,
  type ViolationFilter,
  type ViolationStep,
} from '@/services/violations'

const violationKey = ['violations'] as const

// Query một trang vi phạm của các CLB theo bộ lọc (trang bắt đầu từ 1)
/** Trang trước vẫn hiển thị trong khi trang hoặc bộ lọc mới đang tải. */
export function useViolations(
  filter: ViolationFilter,
  page: number,
  pageSize: number,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...violationKey, 'list', filter, page, pageSize],
    queryFn: ({ signal }) => fetchViolations(filter, page, pageSize, signal),
    enabled,
    placeholderData: keepPreviousData,
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
  return useInvalidatingMutation(
    (action: { input: OpenViolationInput; csrfToken: string }) =>
      openViolation(action.input, action.csrfToken),
    [[...violationKey, 'list']],
    (detail) => [[...violationKey, 'detail', detail.id], detail],
  )
}

// Mutation thực hiện bước xử lý vi phạm, rồi làm mới cache
export function useViolationStep() {
  return useInvalidatingMutation(
    (action: { id: string; step: ViolationStep; csrfToken: string }) =>
      applyViolationStep(action.id, action.step, action.csrfToken),
    [[...violationKey, 'list']],
    (detail) => [[...violationKey, 'detail', detail.id], detail],
  )
}
