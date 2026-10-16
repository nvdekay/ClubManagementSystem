import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchClubInvitations, respondToInvitation, type InvitationResponse } from "@/services/clubInvitations";
const key = ["club-invitations"] as const;
export function useClubInvitations(clubId: string, enabled: boolean) {
  return useQuery({ queryKey: [...key, clubId], queryFn: ({ signal }) => fetchClubInvitations(clubId, signal), enabled });
}
export function useRespondToInvitation(clubId: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (action: { id: string; input: InvitationResponse; csrfToken: string }) =>
    respondToInvitation(clubId, action.id, action.input, action.csrfToken),
  onSuccess: () => client.invalidateQueries({ queryKey: [...key, clubId] }) });
}
