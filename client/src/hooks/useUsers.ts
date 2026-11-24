import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createUser, fetchUsers } from '@/services/users'

// Key gốc cho các thao tác cache xuyên suốt (invalidate/cancel khớp theo tiền tố);
// usersKey(...) xác định một trang từ server — mọi đầu vào của queryFn đều là một phần của key.
const usersKeyRoot = ['users'] as const
// Query key của một trang danh sách người dùng
function usersKey(search: string, limit: number, offset: number) {
  return [...usersKeyRoot, search, limit, offset] as const
}

// Query danh sách người dùng có tìm kiếm và phân trang
export function useUsers(search = '', limit = 20, offset = 0) {
  return useQuery({
    queryKey: usersKey(search, limit, offset),
    queryFn: ({ signal }) => fetchUsers({ search, limit, offset, signal }),
    // Hiện các dòng của trang trước trong khi trang mới đang tải — không bị chớp trống.
    placeholderData: keepPreviousData,
  })
}

// Mutation tạo người dùng, rồi làm mới danh sách
export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      // Danh sách giờ được lọc ở server — chỉ riêng response không cho biết người dùng mới
      // có khớp với tìm kiếm đang dùng hay không, nên tải lại thay vì setQueryData.
      await queryClient.invalidateQueries({ queryKey: usersKeyRoot })
    },
  })
}
