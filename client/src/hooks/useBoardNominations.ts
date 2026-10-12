import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  claimBoardNomination,
  decideBoardNomination,
  fetchBoardNomination,
  fetchBoardNominationContext,
  fetchBoardNominationQueue,
  submitBoardNomination,
  type BoardNominationDecisionInput,
} from "@/services/boardNominations";

const boardNominationKey = ["board-nominations"] as const;

export function useBoardNominationContext(clubId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...boardNominationKey, "context", clubId],
    queryFn: ({ signal }) => fetchBoardNominationContext(clubId!, signal),
    enabled: enabled && Boolean(clubId), retry: false });
}

export function useBoardNominationQueue(enabled: boolean) {
  return useQuery({ queryKey: [...boardNominationKey, "queue"],
    queryFn: ({ signal }) => fetchBoardNominationQueue(signal), enabled, retry: false });
}

export function useBoardNomination(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...boardNominationKey, "detail", id],
    queryFn: ({ signal }) => fetchBoardNomination(id!, signal),
    enabled: enabled && Boolean(id), retry: false });
}

export function useBoardNominationAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action:
      | { kind: "submit"; clubId: string; seats: Array<{ positionId: string; membershipId: string }>;
        csrfToken: string }
      | { kind: "claim"; id: string; csrfToken: string }
      | { kind: "decide"; id: string; input: BoardNominationDecisionInput; csrfToken: string }) => {
      switch (action.kind) {
        case "submit": return submitBoardNomination(action.clubId, action.seats, action.csrfToken);
        case "claim": return claimBoardNomination(action.id, action.csrfToken);
        case "decide": return decideBoardNomination(action.id, action.input, action.csrfToken);
      }
    },
    onSuccess: async (result, action) => {
      if (action.kind !== "submit") {
        queryClient.setQueryData([...boardNominationKey, "detail", result.id], result);
      }
      await queryClient.invalidateQueries({ queryKey: boardNominationKey });
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
      if (action.kind === "submit") {
        await queryClient.invalidateQueries({ queryKey: [...boardNominationKey, "context", action.clubId] });
      }
    },
  });
}
