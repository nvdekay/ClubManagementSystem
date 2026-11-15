import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accessEventProposalDocument, actOnClubEvent, confirmInternalClubEvent, fetchEventProposalTemplate, uploadEventProposalDocument, createInternalClubEvent, fetchClubEventOptions, createClubEvent, fetchClubEvent, fetchClubEventFeedback, fetchClubEvents, fetchEventParticipants, updateInternalClubEvent,
  type ClubEventInput, type EventPublishInput, type InternalClubEventInput, type InternalCreateMode } from "@/services/clubEvents";
export const clubEventsKeyRoot = ["club-events"] as const;
// Query danh sách sự kiện của CLB
export function useClubEvents(clubId: string, enabled: boolean) {
  return useQuery({ queryKey: [...clubEventsKeyRoot, clubId, "list"], queryFn: ({ signal }) => fetchClubEvents(clubId, signal), enabled, retry: false });
}
// Query chi tiết một sự kiện của CLB
export function useClubEvent(clubId: string, id: string, enabled: boolean) {
  return useQuery({ queryKey: [...clubEventsKeyRoot, clubId, "detail", id], queryFn: ({ signal }) => fetchClubEvent(clubId, id, signal), enabled: enabled && Boolean(id), retry: false });
}
// Query người tham gia của một sự kiện
export function useEventParticipants(clubId: string, id: string, enabled: boolean) {
  return useQuery({ queryKey: [...clubEventsKeyRoot, clubId, "participants", id], queryFn: ({ signal }) => fetchEventParticipants(clubId, id, signal), enabled: enabled && Boolean(id), retry: false });
}
// Query phản hồi của các sự kiện theo danh sách id
export function useClubEventFeedback(clubId: string, ids: string[], enabled: boolean) {
  return useQuery({ queryKey: [...clubEventsKeyRoot, clubId, "feedback", ids], queryFn: ({ signal }) => fetchClubEventFeedback(clubId, ids, signal), enabled: enabled && ids.length > 0, retry: false });
}
// Mutation thao tác với sự kiện của CLB, rồi làm mới cache
export function useClubEventMutation(clubId: string) {
  const cache = useQueryClient();
  return useMutation({ mutationFn: (input: { csrfToken: string } & (
    { kind: "create"; input: ClubEventInput } | { kind: "action"; id: string; action: string; body: object }
    | { kind: "internal-create"; input: InternalClubEventInput; mode: InternalCreateMode; publishInput?: EventPublishInput }
    | { kind: "internal-save"; id: string; input: InternalClubEventInput; expectedVersion: number }
    | { kind: "internal-confirm"; id: string; expectedVersion: number }
    | { kind: "upload-document"; id: string; file: File; mimeType: string })) => {
    switch (input.kind) {
      case "create": return createClubEvent(clubId, input.input, input.csrfToken);
      case "internal-create": return createInternalClubEvent(clubId, input.input, input.mode, input.publishInput, input.csrfToken);
      case "internal-save": return updateInternalClubEvent(clubId, input.id, input.input, input.expectedVersion, input.csrfToken);
      case "internal-confirm": return confirmInternalClubEvent(clubId, input.id, input.expectedVersion, input.csrfToken);
      case "upload-document": return uploadEventProposalDocument(clubId, input.id, input.file, input.mimeType, input.csrfToken);
      default: return actOnClubEvent(clubId, input.id, input.action, input.body, input.csrfToken);
    }
  },
    onSuccess: async () => { await cache.invalidateQueries({ queryKey: clubEventsKeyRoot }); } });
}

// Query các lựa chọn khi tạo sự kiện của CLB
export function useClubEventOptions(clubId: string, enabled: boolean) {
  return useQuery({ queryKey: [...clubEventsKeyRoot, clubId, "options"], queryFn: ({ signal }) => fetchClubEventOptions(clubId, signal), enabled, retry: false });
}

/** Dùng chung với thẻ mẫu của ICPDP, nơi ghi mẫu mới vào mục này. */
export const eventProposalTemplateKey = ["event-proposal-template"] as const;
// Query thông tin mẫu đề xuất sự kiện
export function useEventProposalTemplate(enabled: boolean) {
  return useQuery({ queryKey: eventProposalTemplateKey, queryFn: ({ signal }) => fetchEventProposalTemplate(signal), enabled, retry: false });
}
// Mutation lấy link xem file đề xuất sự kiện
export function useEventProposalDocumentAccess(clubId: string) {
  return useMutation({ mutationFn: (input: { id: string; revisionNo?: number; inline?: boolean }) =>
    accessEventProposalDocument(clubId, input.id, input.revisionNo, input.inline) });
}
