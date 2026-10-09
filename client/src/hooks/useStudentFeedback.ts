import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchClubFeedbackInbox,
  fetchIcpdpFeedbackInbox,
  fetchMyStudentFeedback,
  sendStudentFeedback,
  type StudentFeedbackInput,
} from "@/services/studentFeedback";

const key = ["student-feedback"] as const;

export function useMyStudentFeedback(enabled: boolean) {
  return useQuery({ queryKey: [...key, "mine"], queryFn: ({ signal }) => fetchMyStudentFeedback(signal),
    enabled, retry: false });
}

export function useClubFeedbackInbox(clubId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...key, "club", clubId], queryFn: ({ signal }) => fetchClubFeedbackInbox(clubId!, signal),
    enabled: enabled && Boolean(clubId), retry: false });
}

export function useIcpdpFeedbackInbox(enabled: boolean) {
  return useQuery({ queryKey: [...key, "icpdp"], queryFn: ({ signal }) => fetchIcpdpFeedbackInbox(signal),
    enabled, retry: false });
}

export function useSendStudentFeedback() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: StudentFeedbackInput & { csrfToken: string }) => {
      const { csrfToken, ...body } = input;
      return sendStudentFeedback(body, csrfToken);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
