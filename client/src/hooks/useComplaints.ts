import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  decideComplaint, fetchClubComplaints, fetchComplaintQueue, fetchMyComplaints, respondToComplaint, submitComplaint,
  withdrawComplaint, type ComplaintClubResponse, type ComplaintDecisionInput, type ComplaintInput, type ComplaintState,
} from "@/services/complaints";

const complaintsKeyRoot = ["complaints"] as const;
const complaintsKey = {
  mine: () => [...complaintsKeyRoot, "mine"] as const,
  queue: (state: ComplaintState | "") => [...complaintsKeyRoot, "queue", state] as const,
  club: (clubId: string) => [...complaintsKeyRoot, "club", clubId] as const,
};

// Query khiếu nại của tôi
export function useMyComplaints(enabled: boolean) {
  return useQuery({ queryKey: complaintsKey.mine(), queryFn: ({ signal }) => fetchMyComplaints(signal), enabled, retry: false });
}
// Query hàng đợi khiếu nại của ICPDP theo trạng thái
export function useComplaintQueue(state: ComplaintState | "", enabled: boolean) {
  return useQuery({ queryKey: complaintsKey.queue(state), queryFn: ({ signal }) => fetchComplaintQueue(state, signal),
    enabled, retry: false });
}
// Query khiếu nại liên quan tới CLB
export function useClubComplaints(clubId: string, enabled: boolean) {
  return useQuery({ queryKey: complaintsKey.club(clubId), queryFn: ({ signal }) => fetchClubComplaints(clubId, signal),
    enabled: enabled && Boolean(clubId), retry: false });
}

// Bọc mutation khiếu nại và làm mới cache khiếu nại, dashboard
function useComplaintMutation<T>(run: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: run, onSuccess: async () => {
    // Danh sách được lọc ở server, nên mọi danh sách khiếu nại đều được tải lại.
    await client.invalidateQueries({ queryKey: complaintsKeyRoot });
    await client.invalidateQueries({ queryKey: ["dashboard"] });
  } });
}

// Mutation gửi khiếu nại mới
export function useSubmitComplaint() {
  return useComplaintMutation((input: ComplaintInput & { csrfToken: string }) => {
    const { csrfToken, ...body } = input;
    return submitComplaint(body, csrfToken);
  });
}
// Mutation rút khiếu nại
export function useWithdrawComplaint() {
  return useComplaintMutation((input: { id: string; csrfToken: string }) => withdrawComplaint(input.id, input.csrfToken));
}
// Mutation ICPDP ra quyết định khiếu nại
export function useDecideComplaint() {
  return useComplaintMutation((input: { id: string; decision: ComplaintDecisionInput; csrfToken: string }) =>
    decideComplaint(input.id, input.decision, input.csrfToken));
}
// Mutation CLB phản hồi khiếu nại
export function useRespondToComplaint() {
  return useComplaintMutation((input: { clubId: string; id: string; response: Omit<ComplaintClubResponse, "at">; csrfToken: string }) =>
    respondToComplaint(input.clubId, input.id, input.response, input.csrfToken));
}
