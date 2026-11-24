import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { changePeriodicReport, fetchClubPeriodicReports } from '@/services/clubPeriodicReports'
const key = ['club-periodic-reports'] as const
// Query báo cáo định kỳ của CLB
export function useClubPeriodicReports(clubId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...key, clubId],
    queryFn: ({ signal }) => fetchClubPeriodicReports(clubId, signal),
    enabled,
  })
}
// Mutation tạo, lưu hoặc nộp báo cáo định kỳ, rồi làm mới cache
export function useChangePeriodicReport(clubId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      action: Parameters<typeof changePeriodicReport>[1]
      csrfToken: string
    }) => changePeriodicReport(clubId, input.action, input.csrfToken),
    onSuccess: () => client.invalidateQueries({ queryKey: [...key, clubId] }),
  })
}
