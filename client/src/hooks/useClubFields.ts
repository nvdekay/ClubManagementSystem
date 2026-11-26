import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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

// Trả về hàm làm mới cache danh mục lĩnh vực CLB
/** Đổi tên cũng ghi đè tên lĩnh vực trong các CLB, nên mọi mutation đều tải lại danh sách có kèm số lượt dùng. */
function useInvalidateClubFields() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: clubFieldsKeyRoot })
}

// Mutation tạo lĩnh vực CLB, rồi làm mới cache
export function useCreateClubField() {
  const invalidate = useInvalidateClubFields()
  return useMutation({
    mutationFn: ({ input, csrfToken }: { input: ClubFieldInput; csrfToken: string }) =>
      createClubField(input, csrfToken),
    onSuccess: invalidate,
  })
}

// Mutation cập nhật lĩnh vực CLB, rồi làm mới cache
export function useUpdateClubField() {
  const invalidate = useInvalidateClubFields()
  return useMutation({
    mutationFn: ({
      id,
      input,
      csrfToken,
    }: {
      id: string
      input: ClubFieldInput
      csrfToken: string
    }) => updateClubField(id, input, csrfToken),
    onSuccess: invalidate,
  })
}

// Mutation xoá lĩnh vực CLB, rồi làm mới cache
export function useRemoveClubField() {
  const invalidate = useInvalidateClubFields()
  return useMutation({
    mutationFn: ({ id, csrfToken }: { id: string; csrfToken: string }) =>
      removeClubField(id, csrfToken),
    onSuccess: invalidate,
  })
}
