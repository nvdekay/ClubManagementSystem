import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EventRegistrationError,
  cancelEventRegistration,
  fetchEventRegistrationContext,
  fetchMyEventRegistrations,
  registerForEvent,
  type EventRegistrationAnswer,
} from "@/services/eventRegistrations";

const key = ["event-registrations"] as const;

// Kiểm tra lỗi có phải do cần đăng nhập
/** True khi yêu cầu đăng ký/điểm danh thất bại do khách chưa đăng nhập. */
export function isSignInRequired(error: unknown): boolean {
  return error instanceof EventRegistrationError && error.status === 401;
}

// Query điều kiện đăng ký của một sự kiện
/** Chỉ chạy với người dùng đã đăng nhập; query bị tắt sẽ ở trạng thái pending, nên nơi gọi cần rẽ nhánh theo `enabled` trước. */
export function useEventRegistrationContext(eventId: string, enabled: boolean) {
  return useQuery({ queryKey: [...key, "context", eventId],
    queryFn: ({ signal }) => fetchEventRegistrationContext(eventId, signal),
    enabled: enabled && Boolean(eventId), retry: false });
}

// Query đăng ký sự kiện của tôi
export function useMyEventRegistrations(enabled: boolean) {
  return useQuery({ queryKey: [...key, "mine"],
    queryFn: ({ signal }) => fetchMyEventRegistrations(signal), enabled, retry: false });
}

// Mutation đăng ký hoặc huỷ đăng ký sự kiện, rồi làm mới cache
export function useEventRegistrationAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: { kind: "register"; eventId: string; csrfToken: string;
      answers: Record<string, EventRegistrationAnswer> }
      | { kind: "cancel"; registrationId: string; csrfToken: string }) =>
      action.kind === "register" ? registerForEvent(action.eventId, action.answers, action.csrfToken)
        : cancelEventRegistration(action.registrationId, action.csrfToken),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
