import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchClubInvitations,
  respondToInvitation,
  type InvitationResponse,
} from '@/services/clubInvitations'
const key = ['club-invitations'] as const
// Query lời mời tham gia sự kiện trường gửi tới CLB
export function useClubInvitations(clubId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...key, clubId],
    queryFn: ({ signal }) => fetchClubInvitations(clubId, signal),
    enabled,
  })
}
// Mutation CLB phản hồi lời mời, rồi làm mới cache
export function useRespondToInvitation(clubId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (action: { id: string; input: InvitationResponse; csrfToken: string }) =>
      respondToInvitation(clubId, action.id, action.input, action.csrfToken),
    onSuccess: () => client.invalidateQueries({ queryKey: [...key, clubId] }),
  })
}
