import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBudget, fetchBudgets, recordBudgetFlow, type BudgetFlowInput } from "@/services/budgets";

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
