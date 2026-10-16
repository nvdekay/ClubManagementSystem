import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTransitionContext, writeTransitionPlan } from "@/services/clubTransitionPlans";
const key = ["club-transition-plans"] as const;
export function useClubTransitionPlans(clubId: string, enabled: boolean) {
  return useQuery({ queryKey: [...key, clubId], queryFn: ({ signal }) => fetchTransitionContext(clubId, signal), enabled });
}
export function useWriteTransitionPlan(clubId: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (a: { action: Parameters<typeof writeTransitionPlan>[1]; csrfToken: string }) => writeTransitionPlan(clubId, a.action, a.csrfToken),
    onSuccess: () => client.invalidateQueries({ queryKey: [...key, clubId] }) });
}
