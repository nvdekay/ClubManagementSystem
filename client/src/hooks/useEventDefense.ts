import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelEventDefense,
  confirmClubEventDefense,
  decideAfterDefense,
  endEventDefense,
  fetchAvailableDefenseRooms,
  fetchClubEventDefense,
  fetchLiveDefenseSession,
  markDefenseNoShow,
  requestClubDefenseReschedule,
  respondDefenseReschedule,
  saveDefenseNote,
  scheduleEventDefense,
  startEventDefense,
  type RespondRescheduleInput,
  type ScheduleDefenseInput,
} from "@/services/eventDefense";
import type { EventReviewDecisionInput } from "@/services/eventProposalReviews";

const defenseKey = ["event-defense"] as const;
const proposalKey = ["event-proposal-reviews"] as const;

export function useAvailableDefenseRooms(
  startAt: string | undefined,
  durationMinutes: number,
  enabled: boolean,
  excludeDefenseId?: string,
) {
  return useQuery({
    queryKey: [...defenseKey, "rooms", startAt, durationMinutes, excludeDefenseId ?? ""],
    queryFn: ({ signal }) => fetchAvailableDefenseRooms(startAt!, durationMinutes, signal, excludeDefenseId),
    enabled: enabled && Boolean(startAt) && Number.isInteger(durationMinutes) && durationMinutes >= 15 && durationMinutes <= 240,
    retry: false,
  });
}

export function useLiveDefenseSession(eventId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...defenseKey, "live", eventId],
    queryFn: ({ signal }) => fetchLiveDefenseSession(eventId!, signal),
    enabled: enabled && Boolean(eventId),
    refetchInterval: enabled ? 3000 : false,
    retry: false,
  });
}

export function useClubEventDefense(clubId: string, eventId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...defenseKey, "club", clubId, eventId],
    queryFn: ({ signal }) => fetchClubEventDefense(clubId, eventId!, signal),
    enabled: enabled && Boolean(clubId) && Boolean(eventId),
    retry: false,
  });
}

export type EventDefenseMutationAction =
  | { kind: "schedule"; eventId: string; input: ScheduleDefenseInput; csrfToken: string }
  | { kind: "cancel"; eventId: string; reason: string; csrfToken: string }
  | { kind: "respondReschedule"; eventId: string; input: RespondRescheduleInput; csrfToken: string }
  | { kind: "start"; eventId: string; csrfToken: string }
  | { kind: "saveNote"; eventId: string; content: string; csrfToken: string }
  | { kind: "end"; eventId: string; csrfToken: string }
  | { kind: "noShow"; eventId: string; reason?: string; csrfToken: string }
  | { kind: "decideAfter"; eventId: string; input: EventReviewDecisionInput; csrfToken: string }
  | { kind: "confirmClub"; clubId: string; eventId: string; csrfToken: string }
  | { kind: "requestReschedule"; clubId: string; eventId: string; reason: string; csrfToken: string };

export function useEventDefenseActions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: EventDefenseMutationAction) => {
      switch (action.kind) {
        case "schedule":
          return scheduleEventDefense(action.eventId, action.input, action.csrfToken);
        case "cancel":
          return cancelEventDefense(action.eventId, action.reason, action.csrfToken);
        case "respondReschedule":
          return respondDefenseReschedule(action.eventId, action.input, action.csrfToken);
        case "start":
          return startEventDefense(action.eventId, action.csrfToken);
        case "saveNote":
          return saveDefenseNote(action.eventId, action.content, action.csrfToken);
        case "end":
          return endEventDefense(action.eventId, action.csrfToken);
        case "noShow":
          return markDefenseNoShow(action.eventId, action.reason, action.csrfToken);
        case "decideAfter":
          return decideAfterDefense(action.eventId, action.input, action.csrfToken);
        case "confirmClub":
          return confirmClubEventDefense(action.clubId, action.eventId, action.csrfToken);
        case "requestReschedule":
          return requestClubDefenseReschedule(action.clubId, action.eventId, action.reason, action.csrfToken);
      }
    },
    onSuccess: async (_data, variables) => {
      const eventId = variables.eventId;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...proposalKey, "detail", eventId] }),
        queryClient.invalidateQueries({ queryKey: [...proposalKey, "queue"] }),
        queryClient.invalidateQueries({ queryKey: [...defenseKey, "live", eventId] }),
        queryClient.invalidateQueries({ queryKey: [...defenseKey, "rooms"] }),
        ...(variables.kind === "confirmClub" || variables.kind === "requestReschedule"
          ? [queryClient.invalidateQueries({ queryKey: [...defenseKey, "club", variables.clubId, eventId] })]
          : []),
      ]);
    },
  });
}
