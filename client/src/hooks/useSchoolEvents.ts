import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSchoolEvent, fetchScheduleConflicts, fetchSchoolEvent, fetchSchoolEvents, inviteClubs, publishSchoolEvent,
  withdrawInvitation, type InviteInput, type SchoolEventDetail, type SchoolEventInput,
} from "@/services/schoolEvents";

const schoolEventKey = ["school-events"] as const;

export function useSchoolEvents(enabled: boolean) {
  return useQuery({ queryKey: [...schoolEventKey, "list"], queryFn: ({ signal }) => fetchSchoolEvents(signal), enabled, retry: false });
}

export function useSchoolEvent(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...schoolEventKey, "detail", id], queryFn: ({ signal }) => fetchSchoolEvent(id!, signal),
    enabled: enabled && Boolean(id), retry: false });
}

/** BR15 warning while the form is filled; only asked once a room and a valid time range are chosen. */
export function useScheduleConflicts(input: { propertyId: string; startAt: string; endAt: string } | null) {
  return useQuery({ queryKey: [...schoolEventKey, "conflicts", input], queryFn: ({ signal }) => fetchScheduleConflicts(input!, signal),
    enabled: Boolean(input), retry: false });
}

export function useCreateSchoolEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: { input: SchoolEventInput; csrfToken: string }) => createSchoolEvent(action.input, action.csrfToken),
    onSuccess: async (result) => {
      queryClient.setQueryData([...schoolEventKey, "detail", result.detail.id], result.detail);
      await queryClient.invalidateQueries({ queryKey: [...schoolEventKey, "list"] });
    },
  });
}

export function useSchoolEventAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action:
      | { kind: "invite"; id: string; input: InviteInput; csrfToken: string }
      | { kind: "withdraw"; id: string; invitationId: string; csrfToken: string }
      | { kind: "publish"; id: string; csrfToken: string }): Promise<SchoolEventDetail> => {
      if (action.kind === "invite") return (await inviteClubs(action.id, action.input, action.csrfToken)).detail;
      if (action.kind === "withdraw") return withdrawInvitation(action.id, action.invitationId, action.csrfToken);
      return publishSchoolEvent(action.id, action.csrfToken);
    },
    onSuccess: async (detail) => {
      queryClient.setQueryData([...schoolEventKey, "detail", detail.id], detail);
      await queryClient.invalidateQueries({ queryKey: [...schoolEventKey, "list"] });
    },
  });
}
