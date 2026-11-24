import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchClubEvaluations,
  fetchClubViolations,
  submitComplianceResponse,
} from '@/services/clubCompliance'
const key = ['club-compliance'] as const
// Query vi phạm của CLB
export function useClubViolations(clubId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...key, clubId, 'violations'],
    queryFn: ({ signal }) => fetchClubViolations(clubId, signal),
    enabled,
  })
}
// Query kết quả đánh giá của CLB
export function useClubEvaluations(clubId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...key, clubId, 'evaluations'],
    queryFn: ({ signal }) => fetchClubEvaluations(clubId, signal),
    enabled,
  })
}
// Mutation gửi giải trình hoặc minh chứng khắc phục, rồi làm mới vi phạm
export function useSubmitComplianceResponse(clubId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (a: {
      action: Parameters<typeof submitComplianceResponse>[1]
      csrfToken: string
    }) => submitComplianceResponse(clubId, a.action, a.csrfToken),
    onSuccess: () => client.invalidateQueries({ queryKey: [...key, clubId, 'violations'] }),
  })
}
