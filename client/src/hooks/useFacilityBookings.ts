import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchBookingSlots,
  changeBooking,
  fetchBlackoutBookings,
  fetchBooking,
  fetchBookingAvailability,
  fetchBookingEvents,
  fetchBookingProperties,
  fetchBookings,
  type BookingAction,
} from '@/services/facilityBookings'

const bookingKey = ['facilityBookings'] as const
// Query sự kiện của CLB có thể gắn vào booking
export function useBookingEvents(clubId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...bookingKey, 'events', clubId],
    enabled: Boolean(clubId) && enabled,
    queryFn: ({ signal }) => fetchBookingEvents(clubId!, signal),
  })
}
// Query danh sách booking của CLB hoặc admin
export function useBookings(clubId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...bookingKey, 'list', clubId],
    enabled,
    queryFn: ({ signal }) => fetchBookings(clubId, signal),
  })
}
// Query chi tiết một booking
export function useBooking(clubId: string | null, id: string | null) {
  return useQuery({
    queryKey: [...bookingKey, 'detail', clubId, id],
    enabled: Boolean(id),
    queryFn: ({ signal }) => fetchBooking(clubId, id!, signal),
  })
}
// Query cơ sở vật chất có thể đặt
export function useBookingProperties(clubId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...bookingKey, 'properties', clubId],
    enabled,
    queryFn: ({ signal }) => fetchBookingProperties(clubId, signal),
  })
}
// Query lịch bận của cơ sở vật chất trong khoảng thời gian
export function useBookingAvailability(
  clubId: string | null,
  propertyId: string,
  startAt: string,
  endAt: string,
) {
  return useQuery({
    queryKey: [...bookingKey, 'availability', clubId, propertyId, startAt, endAt],
    enabled: Boolean(clubId && propertyId && startAt && endAt && startAt < endAt),
    queryFn: ({ signal }) => fetchBookingAvailability(clubId!, propertyId, startAt, endAt, signal),
  })
}
// Query booking xung đột với lịch khoá của cơ sở vật chất
export function useBlackoutBookings(propertyId: string | null, blackoutKey: string) {
  return useQuery({
    queryKey: [...bookingKey, 'blackouts', propertyId, blackoutKey],
    enabled: Boolean(propertyId),
    queryFn: ({ signal }) => fetchBlackoutBookings(propertyId!, signal),
  })
}
// Mutation lưu, nộp, huỷ hoặc quyết định booking, rồi làm mới cache
export function useBookingAction(csrfToken: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (action: BookingAction) => changeBooking(action, csrfToken),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: bookingKey })
    },
  })
}

// Query các ca đặt phòng
export function useBookingSlots(enabled: boolean) {
  return useQuery({
    queryKey: [...bookingKey, 'slots'],
    enabled,
    queryFn: ({ signal }) => fetchBookingSlots(signal),
  })
}
