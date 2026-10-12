import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authKeyRoot } from "@/hooks/useAuth";
import { applyAccountAction, fetchAdminUsers, type AccountAction } from "@/services/accounts";

const accountsKeyRoot = ["accounts"] as const;

export function useAccounts(search: string, enabled: boolean) {
  return useQuery({
    queryKey: [...accountsKeyRoot, search],
    queryFn: ({ signal }) => fetchAdminUsers(search, signal),
    enabled,
    retry: false,
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
