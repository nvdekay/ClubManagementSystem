import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { checkInToEvent, fetchMyAttendances } from "@/services/eventCheckIns";

const key = ["attendances"] as const;

// Query lịch sử điểm danh của tôi
export function useMyAttendances(enabled: boolean) {
  return useQuery({ queryKey: [...key, "mine"], queryFn: ({ signal }) => fetchMyAttendances(signal),
    enabled, retry: false });
}

// Mutation điểm danh sự kiện bằng mã, rồi làm mới cache
export function useEventCheckIn() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { eventId: string; code: string; csrfToken: string }) =>
      checkInToEvent(input.eventId, input.code, input.csrfToken),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
      // A walk-in check-in also creates a registration, and the dashboard counts attendances.
      await client.invalidateQueries({ queryKey: ["event-registrations"] });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
