import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchLoginError, fetchMe, logout } from "@/services/auth";

export const authKeyRoot = ["auth"] as const;
const authKey = [...authKeyRoot, "me"] as const;

export function useAuth() {
  return useQuery({ queryKey: authKey, queryFn: ({ signal }) => fetchMe(signal), retry: false });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(authKey, null);
    },
  });
}

export function useLoginError(enabled: boolean) {
  return useQuery({
    queryKey: [...authKeyRoot, "login-error"],
    queryFn: ({ signal }) => fetchLoginError(signal),
    enabled,
    staleTime: Infinity,
    retry: false,
  });
}
