import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchClubEvaluations, fetchClubViolations, submitComplianceResponse } from "@/services/clubCompliance";
const key = ["club-compliance"] as const;
export function useClubViolations(clubId: string, enabled: boolean) { return useQuery({ queryKey: [...key, clubId, "violations"], queryFn: ({ signal }) => fetchClubViolations(clubId, signal), enabled }); }
export function useClubEvaluations(clubId: string, enabled: boolean) { return useQuery({ queryKey: [...key, clubId, "evaluations"], queryFn: ({ signal }) => fetchClubEvaluations(clubId, signal), enabled }); }
export function useSubmitComplianceResponse(clubId: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (a: { action: Parameters<typeof submitComplianceResponse>[1]; csrfToken: string }) => submitComplianceResponse(clubId, a.action, a.csrfToken),
    onSuccess: () => client.invalidateQueries({ queryKey: [...key, clubId, "violations"] }) });
}
