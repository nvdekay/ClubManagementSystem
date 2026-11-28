import { eventRegistrationsKeyRoot } from '@/hooks/useEventRegistrations'
import { dashboardKeyRoot } from '@/hooks/useDashboard'
import { useInvalidatingMutation } from '@/hooks/useInvalidatingMutation'
import { useQuery } from '@tanstack/react-query'
import { checkInToEvent, fetchMyAttendances } from '@/services/eventCheckIns'

const key = ['attendances'] as const

// Query lịch sử điểm danh của tôi
export function useMyAttendances(enabled: boolean) {
  return useQuery({
    queryKey: [...key, 'mine'],
    queryFn: ({ signal }) => fetchMyAttendances(signal),
    enabled,
  })
}

// Mutation điểm danh sự kiện bằng mã, rồi làm mới cache
export function useEventCheckIn() {
  // Điểm danh trực tiếp (walk-in) cũng tạo một đăng ký, và dashboard có đếm lượt tham dự.
  return useInvalidatingMutation(
    (input: { eventId: string; code: string; csrfToken: string }) =>
      checkInToEvent(input.eventId, input.code, input.csrfToken),
    [key, eventRegistrationsKeyRoot, dashboardKeyRoot],
  )
}
