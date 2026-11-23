import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authKeyRoot } from "@/hooks/useAuth";
import { applyAccountAction, fetchAdminUsers, type AccountAction } from "@/services/accounts";

const accountsKeyRoot = ["accounts"] as const;

/** One page of accounts (page starts at 1); the previous page stays on screen while the next loads. */
export function useAccounts(search: string, page: number, pageSize: number, enabled: boolean) {
  return useQuery({
    queryKey: [...accountsKeyRoot, search, page, pageSize],
    queryFn: ({ signal }) => fetchAdminUsers(search, page, pageSize, signal),
    enabled,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

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
