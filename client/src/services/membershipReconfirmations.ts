import { apiClient } from '@/services/apiRequest'
export interface Reconfirmation {
  id: string
  clubName: string
  periodCode: string
  dueAt: string
  state: 'Pending' | 'Confirmed' | 'Exempt' | 'Expired'
}
const request = apiClient('/api/v1/memberships/reconfirmations')
// GET các yêu cầu xác nhận lại thành viên của tôi
export function fetchReconfirmations(signal: AbortSignal): Promise<Reconfirmation[]> {
  return request('/mine', { signal })
}
// POST xác nhận tiếp tục là thành viên CLB
export function confirmReconfirmation(id: string, csrfToken: string): Promise<Reconfirmation> {
  return request(`/${encodeURIComponent(id)}/confirm`, {
    method: 'POST',
    csrfToken,
  })
}
