import { budgetsKeyRoot } from "./useBudgets";
import { dashboardKeyRoot } from "./useDashboard";
import { clubEventsKeyRoot } from "./useClubEvents";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchClubFinances,
  fetchFinanceDetail,
  fetchReportDetail,
  fetchReportObligations,
  financeAction,
  reportAction,
  type ReportDetail,
  type FinanceDetail,
  type AccountabilityContext,
} from "@/services/accountability";
export const accountabilityKeyRoot = ["accountability"] as const;
export function useReportObligations(
  context: AccountabilityContext,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...accountabilityKeyRoot, "reports", context],
    queryFn: ({ signal }) => fetchReportObligations(context, signal),
    enabled,
    retry: false,
  });
}
export function useReportDetail(
  context: AccountabilityContext,
  id: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...accountabilityKeyRoot, "report", context, id],
    queryFn: ({ signal }) => fetchReportDetail(context, id, signal),
    enabled: enabled && !!id,
    retry: false,
  });
}
export function useClubFinances(clubId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...accountabilityKeyRoot, "finances", clubId],
    queryFn: ({ signal }) => fetchClubFinances(clubId, signal),
    enabled,
    retry: false,
  });
}
export function useFinanceDetail(
  context: AccountabilityContext,
  id: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...accountabilityKeyRoot, "finance", context, id],
    queryFn: ({ signal }) => fetchFinanceDetail(context, id, signal),
    enabled: enabled && !!id,
    retry: false,
  });
}
export function useAccountabilityAction(
  context: AccountabilityContext,
  resource: "report" | "finance",
  id: string,
) {
  const cache = useQueryClient();
  return useMutation<
    ReportDetail | FinanceDetail,
    Error,
    { body: object; token: string }
  >({
    mutationFn: ({ body, token }: { body: object; token: string }) =>
      resource === "report"
        ? reportAction(context, id, body, token)
        : financeAction(context, id, body, token),
    onSuccess: async () => {
      await Promise.all(
        [
          accountabilityKeyRoot,
          budgetsKeyRoot,
          dashboardKeyRoot,
          clubEventsKeyRoot,
        ].map((queryKey) => cache.invalidateQueries({ queryKey })),
      );
    },
  });
}
