import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eventProposalTemplateKey } from "@/hooks/useClubEvents";
import {
  accessReviewProposalDocument, claimEventProposal, decideEventCancellation, decideEventProposal, fetchEventProposal, fetchEventProposalQueue,
  uploadProposalTemplate, type EventReviewDecisionInput,
} from "@/services/eventProposalReviews";

const eventProposalKey = ["event-proposal-reviews"] as const;

// Query hàng đợi đề xuất sự kiện chờ ICPDP
export function useEventProposalQueue(enabled: boolean) {
  return useQuery({ queryKey: [...eventProposalKey, "queue"],
    queryFn: ({ signal }) => fetchEventProposalQueue(signal), enabled, retry: false });
}

// Query chi tiết một đề xuất sự kiện
export function useEventProposal(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...eventProposalKey, "detail", id],
    queryFn: ({ signal }) => fetchEventProposal(id!, signal), enabled: enabled && Boolean(id), retry: false });
}

// Mutation nhận xử lý hoặc quyết định đề xuất sự kiện, rồi làm mới cache
export function useEventProposalAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action:
      | { kind: "claim"; id: string; csrfToken: string }
      | { kind: "decide"; id: string; input: EventReviewDecisionInput; csrfToken: string }
      | { kind: "decideCancellation"; id: string; input: { approve: boolean; reason?: string }; csrfToken: string }) => {
      if (action.kind === "claim") return claimEventProposal(action.id, action.csrfToken);
      if (action.kind === "decideCancellation") return decideEventCancellation(action.id, action.input, action.csrfToken);
      return decideEventProposal(action.id, action.input, action.csrfToken);
    },
    onSuccess: async (detail) => {
      queryClient.setQueryData([...eventProposalKey, "detail", detail.event.id], detail);
      await queryClient.invalidateQueries({ queryKey: [...eventProposalKey, "queue"] });
    },
  });
}

// Mutation tải mẫu đề xuất sự kiện mới
export function useUploadProposalTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { file: File; mimeType: string; csrfToken: string }) =>
      uploadProposalTemplate(input.file, input.mimeType, input.csrfToken),
    onSuccess: (template) => { queryClient.setQueryData(eventProposalTemplateKey, template); },
  });
}

// Mutation lấy link xem file đề xuất khi xét duyệt
export function useReviewProposalDocumentAccess() {
  return useMutation({ mutationFn: (input: { id: string; revisionNo?: number; inline?: boolean }) =>
    accessReviewProposalDocument(input.id, input.revisionNo, input.inline) });
}
