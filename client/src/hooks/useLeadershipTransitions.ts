import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  claimLeadershipTransition,
  decideLeadershipTransition,
  fetchLeadershipTransition,
  fetchLeadershipTransitionQueue,
  type TransitionDecisionInput,
} from "@/services/leadershipTransitions";

const key = ["leadership-transitions"] as const;

export function useLeadershipTransitionQueue(enabled: boolean) {
  return useQuery({ queryKey: [...key, "queue"],
    queryFn: ({ signal }) => fetchLeadershipTransitionQueue(signal), enabled, retry: false });
}

export function useLeadershipTransition(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...key, "detail", id],
    queryFn: ({ signal }) => fetchLeadershipTransition(id!, signal),
    enabled: enabled && Boolean(id), retry: false });
}

export function useLeadershipTransitionAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: { kind: "claim"; id: string; csrfToken: string }
      | { kind: "decide"; id: string; csrfToken: string; input: TransitionDecisionInput }) =>
      action.kind === "claim" ? claimLeadershipTransition(action.id, action.csrfToken)
        : decideLeadershipTransition(action.id, action.input, action.csrfToken),
    onSuccess: async (result) => {
      client.setQueryData([...key, "detail", result.id], result);
      await client.invalidateQueries({ queryKey: key });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
      await client.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}
