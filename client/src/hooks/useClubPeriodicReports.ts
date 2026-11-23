import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changePeriodicReport, fetchClubPeriodicReports } from "@/services/clubPeriodicReports";
const key = ["club-periodic-reports"] as const;
export function useClubPeriodicReports(clubId: string, enabled: boolean) {
  return useQuery({ queryKey: [...key, clubId], queryFn: ({ signal }) => fetchClubPeriodicReports(clubId, signal), enabled });
}
export function useChangePeriodicReport(clubId: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: { action: Parameters<typeof changePeriodicReport>[1]; csrfToken: string }) =>
    changePeriodicReport(clubId, input.action, input.csrfToken), onSuccess: () => client.invalidateQueries({ queryKey: [...key, clubId] }) });
}
