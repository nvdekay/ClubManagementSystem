import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  claimEventProposal, decideEventProposal, fetchEventProposal, fetchEventProposalQueue,
  type EventReviewDecisionInput,
} from "@/services/eventProposalReviews";

const eventProposalKey = ["event-proposal-reviews"] as const;

export function useEventProposalQueue(enabled: boolean) {
  return useQuery({ queryKey: [...eventProposalKey, "queue"],
    queryFn: ({ signal }) => fetchEventProposalQueue(signal), enabled, retry: false });
}

export function useEventProposal(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...eventProposalKey, "detail", id],
    queryFn: ({ signal }) => fetchEventProposal(id!, signal), enabled: enabled && Boolean(id), retry: false });
}

export function useEventProposalAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action:
      | { kind: "claim"; id: string; csrfToken: string }
      | { kind: "decide"; id: string; input: EventReviewDecisionInput; csrfToken: string }) =>
      action.kind === "claim" ? claimEventProposal(action.id, action.csrfToken)
        : decideEventProposal(action.id, action.input, action.csrfToken),
    onSuccess: async (detail) => {
      queryClient.setQueryData([...eventProposalKey, "detail", detail.event.id], detail);
      await queryClient.invalidateQueries({ queryKey: [...eventProposalKey, "queue"] });
    },
  });
}
