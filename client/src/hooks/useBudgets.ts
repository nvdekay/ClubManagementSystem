import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchBudget, fetchBudgets, fetchReconciliation, recordBudgetFlow, runReconciliationAction,
  type BudgetFlowInput, type ReconciliationAction,
} from "@/services/budgets";

const budgetKey = ["budgets"] as const;

export function useBudgets(enabled: boolean) {
  return useQuery({ queryKey: [...budgetKey, "list"], queryFn: ({ signal }) => fetchBudgets(signal), enabled, retry: false });
}

export function useBudget(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...budgetKey, "detail", id], queryFn: ({ signal }) => fetchBudget(id!, signal),
    enabled: enabled && Boolean(id), retry: false });
}

export function useRecordBudgetFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: { id: string; input: BudgetFlowInput; csrfToken: string }) =>
      recordBudgetFlow(action.id, action.input, action.csrfToken),
    onSuccess: async (detail) => {
      queryClient.setQueryData([...budgetKey, "detail", detail.id], detail);
      await queryClient.invalidateQueries({ queryKey: [...budgetKey, "list"] });
    },
  });
}

export function useReconciliation(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...budgetKey, "reconciliation", id], queryFn: ({ signal }) => fetchReconciliation(id!, signal),
    enabled: enabled && Boolean(id), retry: false });
}

export function useReconciliationAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: { id: string; action: ReconciliationAction; csrfToken: string }) =>
      runReconciliationAction(action.id, action.action, action.csrfToken),
    // Reconciling changes the budget state and the money flow it accepts next.
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: [...budgetKey, "reconciliation", variables.id] });
      await queryClient.invalidateQueries({ queryKey: [...budgetKey, "detail", variables.id] });
      await queryClient.invalidateQueries({ queryKey: [...budgetKey, "list"] });
    },
  });
}
