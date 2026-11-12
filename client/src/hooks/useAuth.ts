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
      // Update the live "me" query first: `clear()` would drop it, leaving mounted `useAuth` observers on the old
      // query, so the UI stayed signed in until a reload.
      queryClient.setQueryData(authKey, null);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== authKeyRoot[0] });
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
