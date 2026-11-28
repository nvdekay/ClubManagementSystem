import { useInvalidatingMutation } from '@/hooks/useInvalidatingMutation'
import { useQuery } from '@tanstack/react-query'
import {
  decidePeriodicReport,
  fetchPeriodicOverview,
  fetchPeriodicReport,
  recordMissingPeriodicReport,
  savePeriodicCampaign,
  type PeriodicCampaignInput,
  type PeriodicDecisionInput,
  type Severity,
} from '@/services/periodicReports'

const periodicKey = ['periodic-reports'] as const

// Query tổng quan báo cáo định kỳ theo kỳ
export function usePeriodicOverview(period: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...periodicKey, 'overview', period ?? ''],
    queryFn: ({ signal }) => fetchPeriodicOverview(period, signal),
    enabled,
  })
}

// Mutation lưu đợt thu báo cáo định kỳ, rồi làm mới cache
export function useSavePeriodicCampaign() {
  return useInvalidatingMutation(
    (action: { input: PeriodicCampaignInput; csrfToken: string }) =>
      savePeriodicCampaign(action.input, action.csrfToken),
    [periodicKey],
  )
}

// Query chi tiết một báo cáo định kỳ
export function usePeriodicReport(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...periodicKey, 'detail', id],
    queryFn: ({ signal }) => fetchPeriodicReport(id!, signal),
    enabled: enabled && Boolean(id),
  })
}

// Mutation ICPDP quyết định báo cáo định kỳ, rồi làm mới tổng quan
export function useDecidePeriodicReport() {
  return useInvalidatingMutation(
    (action: { id: string; input: PeriodicDecisionInput; csrfToken: string }) =>
      decidePeriodicReport(action.id, action.input, action.csrfToken),
    [[...periodicKey, 'overview']],
    (detail) => [[...periodicKey, 'detail', detail.id], detail],
  )
}

// Mutation ghi nhận CLB không nộp báo cáo, rồi làm mới tổng quan
export function useRecordMissingPeriodicReport() {
  return useInvalidatingMutation(
    (action: {
      input: { clubId: string; periodCode: string; severity: Severity; note?: string }
      csrfToken: string
    }) => recordMissingPeriodicReport(action.input, action.csrfToken),
    [[...periodicKey, 'overview']],
  )
}
