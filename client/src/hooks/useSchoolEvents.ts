import { useInvalidatingMutation } from '@/hooks/useInvalidatingMutation'
import { useQuery } from '@tanstack/react-query'
import {
  createSchoolEvent,
  fetchScheduleConflicts,
  fetchSchoolEvent,
  fetchSchoolEvents,
  inviteClubs,
  publishSchoolEvent,
  withdrawInvitation,
  type InviteInput,
  type SchoolEventDetail,
  type SchoolEventInput,
} from '@/services/schoolEvents'

const schoolEventKey = ['school-events'] as const

// Query danh sách sự kiện do trường tổ chức
export function useSchoolEvents(enabled: boolean) {
  return useQuery({
    queryKey: [...schoolEventKey, 'list'],
    queryFn: ({ signal }) => fetchSchoolEvents(signal),
    enabled,
  })
}

// Query chi tiết một sự kiện của trường
export function useSchoolEvent(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...schoolEventKey, 'detail', id],
    queryFn: ({ signal }) => fetchSchoolEvent(id!, signal),
    enabled: enabled && Boolean(id),
  })
}

// Query xung đột lịch của cơ sở vật chất trong khoảng thời gian
/** Cảnh báo BR15 khi đang điền form; chỉ hỏi server khi đã chọn phòng và khoảng thời gian hợp lệ. */
export function useScheduleConflicts(
  input: { propertyId: string; startAt: string; endAt: string } | null,
) {
  return useQuery({
    queryKey: [...schoolEventKey, 'conflicts', input],
    queryFn: ({ signal }) => fetchScheduleConflicts(input!, signal),
    enabled: Boolean(input),
  })
}

// Mutation tạo sự kiện của trường, rồi làm mới danh sách
export function useCreateSchoolEvent() {
  return useInvalidatingMutation(
    (action: { input: SchoolEventInput; csrfToken: string }) =>
      createSchoolEvent(action.input, action.csrfToken),
    [[...schoolEventKey, 'list']],
    (result) => [[...schoolEventKey, 'detail', result.detail.id], result.detail],
  )
}

// Mutation mời CLB, thu hồi lời mời hoặc công khai sự kiện, rồi làm mới cache
export function useSchoolEventAction() {
  return useInvalidatingMutation(
    async (
      action:
        | { kind: 'invite'; id: string; input: InviteInput; csrfToken: string }
        | { kind: 'withdraw'; id: string; invitationId: string; csrfToken: string }
        | { kind: 'publish'; id: string; csrfToken: string },
    ): Promise<SchoolEventDetail> => {
      if (action.kind === 'invite') {
        return (await inviteClubs(action.id, action.input, action.csrfToken)).detail
      }
      if (action.kind === 'withdraw') {
        return withdrawInvitation(action.id, action.invitationId, action.csrfToken)
      }
      return publishSchoolEvent(action.id, action.csrfToken)
    },
    [[...schoolEventKey, 'list']],
    (detail) => [[...schoolEventKey, 'detail', detail.id], detail],
  )
}
