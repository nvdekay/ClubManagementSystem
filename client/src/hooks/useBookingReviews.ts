import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  claimBooking, decideBooking, fetchBooking, fetchBookingQueue, type BookingDecisionInput,
} from "@/services/bookingReviews";

const bookingKey = ["booking-reviews"] as const;

export function useBookingQueue(enabled: boolean) {
  return useQuery({ queryKey: [...bookingKey, "queue"], queryFn: ({ signal }) => fetchBookingQueue(signal),
    enabled, retry: false });
}

export function useBooking(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...bookingKey, "detail", id], queryFn: ({ signal }) => fetchBooking(id!, signal),
    enabled: enabled && Boolean(id), retry: false });
}

export function useBookingAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action:
      | { kind: "claim"; id: string; csrfToken: string }
      | { kind: "decide"; id: string; input: BookingDecisionInput; csrfToken: string }) =>
      action.kind === "claim" ? claimBooking(action.id, action.csrfToken)
        : decideBooking(action.id, action.input, action.csrfToken),
    onSuccess: async (detail) => {
      queryClient.setQueryData([...bookingKey, "detail", detail.booking.id], detail);
      await queryClient.invalidateQueries({ queryKey: [...bookingKey, "queue"] });
    },
  });
}
