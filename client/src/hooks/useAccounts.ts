import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authKeyRoot } from "@/hooks/useAuth";
import { applyAccountAction, fetchAdminUsers, type AccountAction } from "@/services/accounts";

const accountsKeyRoot = ["accounts"] as const;

// Query danh sách người dùng để ICPDP quản trị tài khoản
/** Một trang tài khoản (trang bắt đầu từ 1); trang trước vẫn hiển thị trong khi trang kế tiếp đang tải. */
export function useAccounts(search: string, page: number, pageSize: number, enabled: boolean) {
  return useQuery({
    queryKey: [...accountsKeyRoot, search, page, pageSize],
    queryFn: ({ signal }) => fetchAdminUsers(search, page, pageSize, signal),
    enabled,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

// Mutation cấp/thu hồi role hoặc khoá/mở khoá tài khoản, rồi làm mới cache
export function useAccountAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ action, csrfToken }: { action: AccountAction; csrfToken: string }) =>
      applyAccountAction(action, csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountsKeyRoot }),
        queryClient.invalidateQueries({ queryKey: authKeyRoot }),
      ]);
    },
  });
}
