import { useQuery } from "@tanstack/react-query";
import { fetchBudget, fetchBudgets } from "@/services/budgets";

export const budgetsKeyRoot = ["budgets"] as const;

// Query danh sách ngân sách cho ICPDP
export function useBudgets(enabled: boolean) {
  return useQuery({ queryKey: [...budgetsKeyRoot, "list"], queryFn: ({ signal }) => fetchBudgets(signal), enabled, retry: false });
}

// Query chi tiết một ngân sách
export function useBudget(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...budgetsKeyRoot, "detail", id],
    queryFn: ({ signal }) => fetchBudget(id!, signal),
    enabled: enabled && Boolean(id),
    retry: false,
  });
}
