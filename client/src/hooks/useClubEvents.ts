import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actOnClubEvent, fetchClubEventOptions, createClubEvent, fetchClubEvent, fetchClubEventFeedback, fetchClubEvents, fetchEventParticipants, type ClubEventInput } from "@/services/clubEvents";
export const clubEventsKeyRoot = ["club-events"] as const;
export function useClubEvents(clubId: string, enabled: boolean) {
  return useQuery({ queryKey: [...clubEventsKeyRoot, clubId, "list"], queryFn: ({ signal }) => fetchClubEvents(clubId, signal), enabled, retry: false });
}
export function useClubEvent(clubId: string, id: string, enabled: boolean) {
  return useQuery({ queryKey: [...clubEventsKeyRoot, clubId, "detail", id], queryFn: ({ signal }) => fetchClubEvent(clubId, id, signal), enabled: enabled && Boolean(id), retry: false });
}
export function useEventParticipants(clubId: string, id: string, enabled: boolean) {
  return useQuery({ queryKey: [...clubEventsKeyRoot, clubId, "participants", id], queryFn: ({ signal }) => fetchEventParticipants(clubId, id, signal), enabled: enabled && Boolean(id), retry: false });
}
export function useClubEventFeedback(clubId: string, ids: string[], enabled: boolean) {
  return useQuery({ queryKey: [...clubEventsKeyRoot, clubId, "feedback", ids], queryFn: ({ signal }) => fetchClubEventFeedback(clubId, ids, signal), enabled: enabled && ids.length > 0, retry: false });
}
export function useClubEventMutation(clubId: string) {
  const cache = useQueryClient();
  return useMutation({ mutationFn: (input: { csrfToken: string } & (
    { kind: "create"; input: ClubEventInput } | { kind: "action"; id: string; action: string; body: object })) =>
    input.kind === "create" ? createClubEvent(clubId, input.input, input.csrfToken) : actOnClubEvent(clubId, input.id, input.action, input.body, input.csrfToken),
    onSuccess: async () => { await cache.invalidateQueries({ queryKey: clubEventsKeyRoot }); } });
}

export function useClubEventOptions(clubId: string, enabled: boolean) {
  return useQuery({ queryKey: [...clubEventsKeyRoot, clubId, "options"], queryFn: ({ signal }) => fetchClubEventOptions(clubId, signal), enabled, retry: false });
}
