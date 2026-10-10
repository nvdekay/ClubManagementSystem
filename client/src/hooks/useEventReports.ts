import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  decideEventReport, fetchEventReport, fetchEventReportQueue, recordMissingEventReport,
  type PostEventDecisionInput, type Severity,
} from "@/services/eventReports";

const reportKey = ["event-reports"] as const;

export function useEventReportQueue(enabled: boolean) {
  return useQuery({ queryKey: [...reportKey, "queue"], queryFn: ({ signal }) => fetchEventReportQueue(signal),
    enabled, retry: false });
}

export function useEventReport(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...reportKey, "detail", id], queryFn: ({ signal }) => fetchEventReport(id!, signal),
    enabled: enabled && Boolean(id), retry: false });
}

export function useDecideEventReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: { id: string; input: PostEventDecisionInput; csrfToken: string }) =>
      decideEventReport(action.id, action.input, action.csrfToken),
    onSuccess: async (detail) => {
      queryClient.setQueryData([...reportKey, "detail", detail.id], detail);
      await queryClient.invalidateQueries({ queryKey: [...reportKey, "queue"] });
    },
  });
}

export function useRecordMissingEventReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: { eventId: string; input: { severity: Severity; note?: string }; csrfToken: string }) =>
      recordMissingEventReport(action.eventId, action.input, action.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...reportKey, "queue"] });
    },
  });
}
