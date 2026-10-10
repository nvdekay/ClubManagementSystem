import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchEvaluation, fetchEvaluationOverview, generateEvaluations, publishEvaluations, runEvaluationAction,
  type EvaluationAction,
} from "@/services/evaluations";

const evaluationKey = ["evaluations"] as const;

export function useEvaluationOverview(period: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...evaluationKey, "overview", period ?? ""],
    queryFn: ({ signal }) => fetchEvaluationOverview(period, signal), enabled, retry: false });
}

export function useEvaluation(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...evaluationKey, "detail", id], queryFn: ({ signal }) => fetchEvaluation(id!, signal),
    enabled: enabled && Boolean(id), retry: false });
}

export function useEvaluationPeriodAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: { kind: "generate" | "publish"; periodCode: string; csrfToken: string }) =>
      action.kind === "generate" ? generateEvaluations(action.periodCode, action.csrfToken)
        : publishEvaluations(action.periodCode, action.csrfToken),
    onSuccess: async (overview) => {
      queryClient.setQueryData([...evaluationKey, "overview", overview.periodCode ?? ""], overview);
      await queryClient.invalidateQueries({ queryKey: evaluationKey });
    },
  });
}

export function useEvaluationAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; action: EvaluationAction; csrfToken: string }) =>
      runEvaluationAction(input.id, input.action, input.csrfToken),
    onSuccess: async (detail) => {
      queryClient.setQueryData([...evaluationKey, "detail", detail.id], detail);
      await queryClient.invalidateQueries({ queryKey: [...evaluationKey, "overview"] });
    },
  });
}
