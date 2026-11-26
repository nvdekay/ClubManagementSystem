import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchEventProposalPreviewFile } from '@/services/clubEvents'
import {
  accessEventProposalDocument,
  actOnClubEvent,
  fetchEventProposalTemplate,
  uploadEventProposalDocument,
  fetchClubEventOptions,
  createClubEvent,
  fetchClubEvent,
  fetchClubEventFeedback,
  fetchClubEvents,
  fetchEventParticipants,
  type ClubEventInput,
} from '@/services/clubEvents'
export const clubEventsKeyRoot = ['club-events'] as const
// Query danh sách sự kiện của CLB
export function useClubEvents(clubId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...clubEventsKeyRoot, clubId, 'list'],
    queryFn: ({ signal }) => fetchClubEvents(clubId, signal),
    enabled,
  })
}
// Query chi tiết một sự kiện của CLB
export function useClubEvent(clubId: string, id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...clubEventsKeyRoot, clubId, 'detail', id],
    queryFn: ({ signal }) => fetchClubEvent(clubId, id, signal),
    enabled: enabled && Boolean(id),
  })
}
// Query người tham gia của một sự kiện
export function useEventParticipants(clubId: string, id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...clubEventsKeyRoot, clubId, 'participants', id],
    queryFn: ({ signal }) => fetchEventParticipants(clubId, id, signal),
    enabled: enabled && Boolean(id),
  })
}
// Query phản hồi của các sự kiện theo danh sách id
export function useClubEventFeedback(clubId: string, ids: string[], enabled: boolean) {
  return useQuery({
    queryKey: [...clubEventsKeyRoot, clubId, 'feedback', ids],
    queryFn: ({ signal }) => fetchClubEventFeedback(clubId, ids, signal),
    enabled: enabled && ids.length > 0,
  })
}
// Mutation thao tác với sự kiện của CLB, rồi làm mới cache
export function useClubEventMutation(clubId: string) {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (
      input: { csrfToken: string } & (
        | { kind: 'create'; input: ClubEventInput }
        | { kind: 'action'; id: string; action: string; body: object }
        | { kind: 'upload-document'; id: string; file: File; mimeType: string }
      ),
    ) => {
      switch (input.kind) {
        case 'create':
          return createClubEvent(clubId, input.input, input.csrfToken)
        case 'upload-document':
          return uploadEventProposalDocument(
            clubId,
            input.id,
            input.file,
            input.mimeType,
            input.csrfToken,
          )
        default:
          return actOnClubEvent(clubId, input.id, input.action, input.body, input.csrfToken)
      }
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: clubEventsKeyRoot })
    },
  })
}

// Query các lựa chọn khi tạo sự kiện của CLB
export function useClubEventOptions(clubId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...clubEventsKeyRoot, clubId, 'options'],
    queryFn: ({ signal }) => fetchClubEventOptions(clubId, signal),
    enabled,
  })
}

/** Dùng chung với thẻ mẫu của ICPDP, nơi ghi mẫu mới vào mục này. */
export const eventProposalTemplateKey = ['event-proposal-template'] as const
// Query thông tin mẫu đề xuất sự kiện
export function useEventProposalTemplate(enabled: boolean) {
  return useQuery({
    queryKey: eventProposalTemplateKey,
    queryFn: ({ signal }) => fetchEventProposalTemplate(signal),
    enabled,
  })
}
// Mutation lấy link xem file đề xuất sự kiện
export function useEventProposalDocumentAccess(clubId: string) {
  return useMutation({
    mutationFn: (input: { id: string; revisionNo?: number; inline?: boolean }) =>
      accessEventProposalDocument(clubId, input.id, input.revisionNo, input.inline),
  })
}

export function useEventProposalPreview(
  clubId: string,
  id: string,
  documentId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...clubEventsKeyRoot, clubId, 'document-preview', id, documentId],
    queryFn: ({ signal }) => fetchEventProposalPreviewFile(clubId, id, signal),
    enabled,
    staleTime: 5 * 60_000,
  })
}
