import { useInvalidatingMutation } from '@/hooks/useInvalidatingMutation'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  changePeriodicReport,
  fetchClubPeriodicReports,
  uploadPeriodicEvidenceImage,
} from '@/services/clubPeriodicReports'
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
  return useInvalidatingMutation(
    (input: { action: Parameters<typeof changePeriodicReport>[1]; csrfToken: string }) =>
      changePeriodicReport(clubId, input.action, input.csrfToken),
    [[...key, clubId]],
  )
}
// Mutation tải ảnh minh chứng; chưa đổi báo cáo nên không làm mới cache
export function useUploadPeriodicEvidence(clubId: string) {
  return useMutation({
    mutationFn: (input: { file: Blob; csrfToken: string }) =>
      uploadPeriodicEvidenceImage(clubId, input.file, input.csrfToken),
  })
}
