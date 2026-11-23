import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { decideSuspension, fetchSuspensions, submitSuspension } from "@/services/suspensionRequests";
const key = ["suspension-requests"] as const;
// Query yêu cầu tạm ngưng CLB
export function useSuspensionRequests(clubId: string | undefined, enabled: boolean) { return useQuery({ queryKey: [...key, clubId], queryFn: ({ signal }) => fetchSuspensions(clubId, signal), enabled }); }
// Mutation gửi hoặc quyết định yêu cầu tạm ngưng, rồi làm mới cache
export function useSuspensionRequestAction(clubId?: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: async (a: { csrfToken: string } & ({ kind: "submit"; input: Parameters<typeof submitSuspension>[1] } | { kind: "decide"; id: string; outcome: "Approve" | "Reject"; reason: string })) =>
    { if (a.kind === "submit") await submitSuspension(clubId!, a.input, a.csrfToken); else await decideSuspension(a.id, a.outcome, a.reason, a.csrfToken); },
  onSuccess: async () => { await client.invalidateQueries({ queryKey: key }); await client.invalidateQueries({ queryKey: ["auth"] }); } });
}
