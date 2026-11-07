import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateRoutingRuleSet, createRoutingDraft, fetchRoutingRuleSets, fetchRoutingSimulation, saveRoutingDraft, type RoutingRule,
} from "@/services/approvalRouting";

const routingKeyRoot = ["routing-rules"] as const;
const routingKey = {
  list: () => [...routingKeyRoot, "list"] as const,
  simulation: (id: string, limit: number) => [...routingKeyRoot, "simulation", id, limit] as const,
};

export function useRoutingRuleSets(enabled: boolean) {
  return useQuery({ queryKey: routingKey.list(), queryFn: ({ signal }) => fetchRoutingRuleSets(signal), enabled, retry: false });
}
export function useRoutingSimulation(id: string, limit: number, enabled: boolean) {
  return useQuery({ queryKey: routingKey.simulation(id, limit), queryFn: ({ signal }) => fetchRoutingSimulation(id, limit, signal),
    enabled: enabled && Boolean(id), retry: false });
}
export function useRoutingAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { kind: "create"; rules: RoutingRule[]; csrfToken: string }
      | { kind: "save"; id: string; rules: RoutingRule[]; csrfToken: string }
      | { kind: "activate"; id: string; csrfToken: string }) => {
      if (input.kind === "create") return createRoutingDraft(input.rules, input.csrfToken);
      if (input.kind === "save") return saveRoutingDraft(input.id, input.rules, input.csrfToken);
      return activateRoutingRuleSet(input.id, input.csrfToken);
    },
    onSuccess: async () => { await client.invalidateQueries({ queryKey: routingKeyRoot }); },
  });
}
