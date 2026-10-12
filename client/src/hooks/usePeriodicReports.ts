import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  decidePeriodicReport, fetchPeriodicOverview, fetchPeriodicReport, recordMissingPeriodicReport,
  type PeriodicDecisionInput, type Severity,
} from "@/services/periodicReports";

const periodicKey = ["periodic-reports"] as const;

export function usePeriodicOverview(period: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...periodicKey, "overview", period ?? ""], queryFn: ({ signal }) => fetchPeriodicOverview(period, signal),
    enabled, retry: false });
}

export function usePeriodicReport(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...periodicKey, "detail", id], queryFn: ({ signal }) => fetchPeriodicReport(id!, signal),
    enabled: enabled && Boolean(id), retry: false });
}

export function useDecidePeriodicReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: { id: string; input: PeriodicDecisionInput; csrfToken: string }) =>
      decidePeriodicReport(action.id, action.input, action.csrfToken),
    onSuccess: async (detail) => {
      queryClient.setQueryData([...periodicKey, "detail", detail.id], detail);
      await queryClient.invalidateQueries({ queryKey: [...periodicKey, "overview"] });
    },
  });
}

export function useRecordMissingPeriodicReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: { input: { clubId: string; periodCode: string; severity: Severity; note?: string }; csrfToken: string }) =>
      recordMissingPeriodicReport(action.input, action.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...periodicKey, "overview"] });
    },
  });
}
