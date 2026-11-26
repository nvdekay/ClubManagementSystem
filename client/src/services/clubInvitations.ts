import { apiRequest, type ApiRequestOptions } from '@/services/apiRequest'
export interface ClubInvitation {
  id: string
  clubId: string
  status: 'Pending' | 'Accepted' | 'Declined' | 'Expired' | 'Withdrawn'
  deadline: string
  responseNote?: string
  responseDetails?: Record<string, string | number>
  event: {
    id: string
    title: string
    state: string
    startAt: string
    endAt: string
    venue?: string
    objective?: string
    coordination?: string
  }
}
export interface InvitationResponse {
  outcome: 'Accepted' | 'Declined'
  responseNote?: string
  responseDetails?: Record<string, string | number>
}
// Calls the API through the shared helper
function request<T>(clubId: string, path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1/clubs/${encodeURIComponent(clubId)}/invitations${path}`, options)
}
// GET lời mời tham gia sự kiện trường gửi tới CLB
export function fetchClubInvitations(
  clubId: string,
  signal: AbortSignal,
): Promise<ClubInvitation[]> {
  return request(clubId, '', { signal })
}
// POST /response: CLB phản hồi lời mời
export function respondToInvitation(
  clubId: string,
  id: string,
  input: InvitationResponse,
  csrfToken: string,
): Promise<ClubInvitation> {
  return request(clubId, `/${encodeURIComponent(id)}/response`, {
    method: 'POST',
    csrfToken,
    body: input,
  })
}
