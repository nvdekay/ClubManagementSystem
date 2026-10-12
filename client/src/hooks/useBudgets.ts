import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBudget, fetchBudgets, recordBudgetFlow, type BudgetFlowInput } from "@/services/budgets";

export const budgetsKeyRoot = ["budgets"] as const;

export function useBudgets(enabled: boolean) {
  return useQuery({ queryKey: [...budgetsKeyRoot, "list"], queryFn: ({ signal }) => fetchBudgets(signal), enabled, retry: false });
}

export function useBudget(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...budgetsKeyRoot, "detail", id], queryFn: ({ signal }) => fetchBudget(id!, signal),
    enabled: enabled && Boolean(id), retry: false });
}

export function useRecordBudgetFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: { id: string; input: BudgetFlowInput; csrfToken: string }) =>
      recordBudgetFlow(action.id, action.input, action.csrfToken),
    onSuccess: async (detail) => {
      queryClient.setQueryData([...budgetsKeyRoot, "detail", detail.id], detail);
      await queryClient.invalidateQueries({ queryKey: [...budgetsKeyRoot, "list"] });
    },
  });
}
