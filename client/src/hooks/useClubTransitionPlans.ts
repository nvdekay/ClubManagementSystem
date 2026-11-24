import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTransitionContext, writeTransitionPlan } from '@/services/clubTransitionPlans'
const key = ['club-transition-plans'] as const
// Query kế hoạch chuyển giao nhiệm kỳ của CLB
export function useClubTransitionPlans(clubId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...key, clubId],
    queryFn: ({ signal }) => fetchTransitionContext(clubId, signal),
    enabled,
  })
}
// Mutation tạo, lưu hoặc nộp kế hoạch chuyển giao, rồi làm mới cache
export function useWriteTransitionPlan(clubId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (a: { action: Parameters<typeof writeTransitionPlan>[1]; csrfToken: string }) =>
      writeTransitionPlan(clubId, a.action, a.csrfToken),
    onSuccess: () => client.invalidateQueries({ queryKey: [...key, clubId] }),
  })
}
