import { useInvalidatingMutation } from '@/hooks/useInvalidatingMutation'
import { useQuery } from '@tanstack/react-query'

import {
  createClubField,
  fetchClubFields,
  removeClubField,
  updateClubField,
  type ClubFieldInput,
} from '@/services/clubFields'

const clubFieldsKeyRoot = ['clubFields'] as const

// Query danh mục lĩnh vực CLB
export function useClubFields(enabled: boolean) {
  return useQuery({
    queryKey: [...clubFieldsKeyRoot, 'catalog'],
    queryFn: ({ signal }) => fetchClubFields(signal),
    enabled,
  })
}

// Đổi tên cũng ghi đè tên lĩnh vực trong các CLB, nên mọi mutation đều tải lại danh sách có kèm số lượt dùng.
// Mutation tạo lĩnh vực CLB, rồi làm mới cache
export function useCreateClubField() {
  return useInvalidatingMutation(
    ({ input, csrfToken }: { input: ClubFieldInput; csrfToken: string }) =>
      createClubField(input, csrfToken),
    [clubFieldsKeyRoot],
  )
}

// Mutation cập nhật lĩnh vực CLB, rồi làm mới cache
export function useUpdateClubField() {
  return useInvalidatingMutation(
    ({ id, input, csrfToken }: { id: string; input: ClubFieldInput; csrfToken: string }) =>
      updateClubField(id, input, csrfToken),
    [clubFieldsKeyRoot],
  )
}

// Mutation xoá lĩnh vực CLB, rồi làm mới cache
export function useRemoveClubField() {
  return useInvalidatingMutation(
    ({ id, csrfToken }: { id: string; csrfToken: string }) => removeClubField(id, csrfToken),
    [clubFieldsKeyRoot],
  )
}
