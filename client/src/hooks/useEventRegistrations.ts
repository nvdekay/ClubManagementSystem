import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelEventRegistration,
  fetchEventRegistrationContext,
  fetchMyEventRegistrations,
  registerForEvent,
  type EventRegistrationAnswer,
} from "@/services/eventRegistrations";

const key = ["event-registrations"] as const;

/** Only runs for signed-in users; a disabled query stays pending, so callers branch on `enabled` first. */
export function useEventRegistrationContext(eventId: string, enabled: boolean) {
  return useQuery({ queryKey: [...key, "context", eventId],
    queryFn: ({ signal }) => fetchEventRegistrationContext(eventId, signal),
    enabled: enabled && Boolean(eventId), retry: false });
}

export function useMyEventRegistrations(enabled: boolean) {
  return useQuery({ queryKey: [...key, "mine"],
    queryFn: ({ signal }) => fetchMyEventRegistrations(signal), enabled, retry: false });
}

export function useEventRegistrationAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: { kind: "register"; eventId: string; csrfToken: string;
      answers: Record<string, EventRegistrationAnswer> }
      | { kind: "cancel"; registrationId: string; csrfToken: string }) =>
      action.kind === "register" ? registerForEvent(action.eventId, action.answers, action.csrfToken)
        : cancelEventRegistration(action.registrationId, action.csrfToken),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
