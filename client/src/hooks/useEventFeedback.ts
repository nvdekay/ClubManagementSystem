import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchEventFeedbackContext,
  fetchMyEventFeedback,
  submitEventFeedback,
  type EventFeedbackInput,
} from "@/services/eventFeedback";

const key = ["event-feedback"] as const;

// Query điều kiện và form phản hồi của một sự kiện
export function useEventFeedbackContext(eventId: string, enabled: boolean) {
  return useQuery({ queryKey: [...key, "context", eventId],
    queryFn: ({ signal }) => fetchEventFeedbackContext(eventId, signal), enabled: enabled && Boolean(eventId),
    retry: false });
}

// Query phản hồi sự kiện của tôi
export function useMyEventFeedback(enabled: boolean) {
  return useQuery({ queryKey: [...key, "mine"], queryFn: ({ signal }) => fetchMyEventFeedback(signal),
    enabled, retry: false });
}

// Mutation gửi phản hồi sự kiện, rồi làm mới cache
export function useSubmitEventFeedback() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: EventFeedbackInput & { eventId: string; csrfToken: string }) =>
      submitEventFeedback(input.eventId, { rating: input.rating, comment: input.comment,
        isAnonymous: input.isAnonymous }, input.csrfToken),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
