/** Điều phối API xét duyệt; trang quản lý trạng thái giao diện, service quản lý yêu cầu HTTP. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eventProposalTemplateKey } from "@/hooks/useClubEvents";
import {
  accessReviewProposalDocument, claimEventProposal, decideEventCancellation, decideEventProposal, fetchEventProposal, fetchEventProposalQueue,
  uploadProposalTemplate, fetchReviewProposalPreviewFile, type EventReviewDecisionInput,
} from "@/services/eventProposalReviews";

// Tách dữ liệu đệm danh sách và chi tiết dưới cùng nhóm khóa xét duyệt.
const eventProposalKey = ["event-proposal-reviews"] as const;

/** Tải các hồ sơ đang chờ xử lý khi nơi gọi bật quyền truy cập cho ICPDP. */
export function useEventProposalQueue(enabled: boolean) {
  return useQuery({ queryKey: [...eventProposalKey, "queue"],
    queryFn: ({ signal }) => fetchEventProposalQueue(signal), enabled, retry: false });
}

/** Lưu đệm chi tiết theo mã đề xuất và hủy yêu cầu đọc không còn cần bằng AbortSignal. */
export function useEventProposal(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...eventProposalKey, "detail", id],
    queryFn: ({ signal }) => fetchEventProposal(id!, signal), enabled: enabled && Boolean(id), retry: false });
}

/** Gửi thao tác xét duyệt, thay chi tiết bằng kết quả server và làm mới danh sách chờ. */
export function useEventProposalAction() {
  const queryClient = useQueryClient();
  return useMutation({
    // Loại thao tác xác định service cần gọi; trang dùng chung trạng thái ghi dữ liệu của hook.
    mutationFn: (action:
      | { kind: "claim"; id: string; csrfToken: string }
      | { kind: "decide"; id: string; input: EventReviewDecisionInput; csrfToken: string }
      | { kind: "decideCancellation"; id: string; input: { approve: boolean; reason?: string }; csrfToken: string }) => {
      if (action.kind === "claim") return claimEventProposal(action.id, action.csrfToken);
      if (action.kind === "decideCancellation") return decideEventCancellation(action.id, action.input, action.csrfToken);
      return decideEventProposal(action.id, action.input, action.csrfToken);
    },
    onSuccess: async (detail) => {
      // Cập nhật ngay người phụ trách và trạng thái mới; danh sách chờ cũng có thể đã thay đổi.
      queryClient.setQueryData([...eventProposalKey, "detail", detail.event.id], detail);
      await queryClient.invalidateQueries({ queryKey: [...eventProposalKey, "queue"] });
    },
  });
}

/** Thay mẫu đề xuất và cập nhật bộ nhớ đệm dùng chung giữa CLB và ICPDP. */
export function useUploadProposalTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { file: File; mimeType: string; csrfToken: string }) =>
      uploadProposalTemplate(input.file, input.mimeType, input.csrfToken),
    // Server trả đủ thông tin mẫu hiện hành nên không cần gọi thêm API đọc thông tin mẫu.
    onSuccess: (template) => { queryClient.setQueryData(eventProposalTemplateKey, template); },
  });
}

/** Lấy đường dẫn truy cập tài liệu tạm thời cho phiên bản mới nhất hoặc phiên bản được chỉ định. */
export function useReviewProposalDocumentAccess() {
  return useMutation({ mutationFn: (input: { id: string; revisionNo?: number; inline?: boolean }) =>
    accessReviewProposalDocument(input.id, input.revisionNo, input.inline) });
}

/** Cache files by submitted revision and document identity, never the editable draft. */
export function useReviewProposalPreview(id: string, revisionNo: number, documentId: string, enabled: boolean) {
  return useQuery({ queryKey: [...eventProposalKey, "document-preview", id, revisionNo, documentId],
    queryFn: ({ signal }) => fetchReviewProposalPreviewFile(id, revisionNo, signal),
    enabled: enabled && Boolean(id && revisionNo && documentId), retry: false, staleTime: 5 * 60_000 });
}
