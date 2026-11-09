import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchLoginError, fetchMe, logout, type Me } from "@/services/auth";

export const authKeyRoot = ["auth"] as const;
const authKey = [...authKeyRoot, "me"] as const;

/** ICPDP staff work from the ICPDP workspace, so the UI hides their Student workspace (server access is unchanged). */
function hideStudentForIcpdp(me: Me | null): Me | null {
  if (!me?.workspaces.some((workspace) => workspace.kind === "icpdp")) return me;
  return { ...me, workspaces: me.workspaces.filter((workspace) => workspace.kind !== "student") };
}

export function useAuth() {
  return useQuery({ queryKey: authKey, queryFn: ({ signal }) => fetchMe(signal), retry: false, select: hideStudentForIcpdp });
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
