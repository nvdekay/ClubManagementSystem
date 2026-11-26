import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchLoginError, fetchMe, logout, type Me } from '@/services/auth'

export const authKeyRoot = ['auth'] as const
const authKey = [...authKeyRoot, 'me'] as const

// Marks the session as signed out (e.g. after any request answered 401); WorkspaceShell then
// redirects to /login with the current page as returnTo.
export function markSignedOut(queryClient: QueryClient) {
  queryClient.setQueryData(authKey, null)
}

// Ẩn workspace Student với nhân sự ICPDP trên giao diện
/** Nhân sự ICPDP làm việc trong workspace ICPDP, nên giao diện ẩn workspace Student của họ (quyền truy cập ở server không đổi). */
function hideStudentForIcpdp(me: Me | null): Me | null {
  if (!me?.workspaces.some((workspace) => workspace.kind === 'icpdp')) {
    return me
  }
  return { ...me, workspaces: me.workspaces.filter((workspace) => workspace.kind !== 'student') }
}

// Query phiên đăng nhập hiện tại (user, workspace, quyền)
export function useAuth() {
  return useQuery({
    queryKey: authKey,
    queryFn: ({ signal }) => fetchMe(signal),
    select: hideStudentForIcpdp,
  })
}

// Mutation đăng xuất, đặt phiên về null và xoá cache dữ liệu còn lại
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Cập nhật query "me" đang chạy trước: `clear()` sẽ xoá nó, khiến các observer `useAuth` đang mount còn bám vào
      // query cũ, làm giao diện vẫn ở trạng thái đã đăng nhập cho đến khi tải lại trang.
      queryClient.setQueryData(authKey, null)
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== authKeyRoot[0] })
    },
  })
}

// Query lý do đăng nhập thất bại gần nhất
export function useLoginError(enabled: boolean) {
  return useQuery({
    queryKey: [...authKeyRoot, 'login-error'],
    queryFn: ({ signal }) => fetchLoginError(signal),
    enabled,
    staleTime: Infinity,
  })
}
