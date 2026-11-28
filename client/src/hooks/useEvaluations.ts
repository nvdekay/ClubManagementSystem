import { useInvalidatingMutation } from '@/hooks/useInvalidatingMutation'
import { useQuery } from '@tanstack/react-query'
import {
  fetchEvaluation,
  fetchEvaluationOverview,
  generateEvaluations,
  publishEvaluations,
  runEvaluationAction,
  type EvaluationAction,
} from '@/services/evaluations'

const evaluationKey = ['evaluations'] as const

// Query tổng quan đánh giá CLB theo kỳ
export function useEvaluationOverview(period: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...evaluationKey, 'overview', period ?? ''],
    queryFn: ({ signal }) => fetchEvaluationOverview(period, signal),
    enabled,
  })
}

// Query chi tiết đánh giá của một CLB
export function useEvaluation(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...evaluationKey, 'detail', id],
    queryFn: ({ signal }) => fetchEvaluation(id!, signal),
    enabled: enabled && Boolean(id),
  })
}

// Mutation sinh hoặc công bố đánh giá của kỳ, rồi làm mới cache
export function useEvaluationPeriodAction() {
  return useInvalidatingMutation(
    (action: { kind: 'generate' | 'publish'; periodCode: string; csrfToken: string }) =>
      action.kind === 'generate'
        ? generateEvaluations(action.periodCode, action.csrfToken)
        : publishEvaluations(action.periodCode, action.csrfToken),
    [evaluationKey],
    (overview) => [[...evaluationKey, 'overview', overview.periodCode ?? ''], overview],
  )
}

// Mutation thao tác trên một đánh giá, rồi làm mới tổng quan
export function useEvaluationAction() {
  return useInvalidatingMutation(
    (input: { id: string; action: EvaluationAction; csrfToken: string }) =>
      runEvaluationAction(input.id, input.action, input.csrfToken),
    [[...evaluationKey, 'overview']],
    (detail) => [[...evaluationKey, 'detail', detail.id], detail],
  )
}
