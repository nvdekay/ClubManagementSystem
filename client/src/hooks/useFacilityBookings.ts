import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBookingSlots, changeBooking, fetchBlackoutBookings, fetchBooking, fetchBookingAvailability, fetchBookingEvents,
  fetchBookingProperties, fetchBookings, type BookingAction } from "@/services/facilityBookings";

const bookingKey = ["facilityBookings"] as const;
export function useBookingEvents(clubId: string | null, enabled: boolean) {
  return useQuery({ queryKey: [...bookingKey, "events", clubId], enabled: Boolean(clubId) && enabled,
    queryFn: ({ signal }) => fetchBookingEvents(clubId!, signal) });
}
export function useBookings(clubId: string | null, enabled: boolean) {
  return useQuery({ queryKey: [...bookingKey, "list", clubId], enabled,
    queryFn: ({ signal }) => fetchBookings(clubId, signal) });
}
export function useBooking(clubId: string | null, id: string | null) {
  return useQuery({ queryKey: [...bookingKey, "detail", clubId, id], enabled: Boolean(id),
    queryFn: ({ signal }) => fetchBooking(clubId, id!, signal) });
}
export function useBookingProperties(clubId: string | null, enabled: boolean) {
  return useQuery({ queryKey: [...bookingKey, "properties", clubId], enabled,
    queryFn: ({ signal }) => fetchBookingProperties(clubId, signal) });
}
export function useBookingAvailability(clubId: string | null, propertyId: string, startAt: string, endAt: string) {
  return useQuery({ queryKey: [...bookingKey, "availability", clubId, propertyId, startAt, endAt],
    enabled: Boolean(clubId && propertyId && startAt && endAt && startAt < endAt),
    queryFn: ({ signal }) => fetchBookingAvailability(clubId!, propertyId, startAt, endAt, signal) });
}
export function useBlackoutBookings(propertyId: string | null, blackoutKey: string) {
  return useQuery({ queryKey: [...bookingKey, "blackouts", propertyId, blackoutKey], enabled: Boolean(propertyId),
    queryFn: ({ signal }) => fetchBlackoutBookings(propertyId!, signal) });
}
export function useBookingAction(csrfToken: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (action: BookingAction) => changeBooking(action, csrfToken),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: bookingKey }); } });
}

export function useBookingSlots(enabled: boolean) {
  return useQuery({ queryKey: [...bookingKey, "slots"], enabled,
    queryFn: ({ signal }) => fetchBookingSlots(signal) });
}
