import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applyViolationStep, fetchViolation, fetchViolations, fetchViolationSources, openViolation,
  type OpenViolationInput, type ViolationStep,
} from "@/services/violations";

const violationKey = ["violations"] as const;

export function useViolations(enabled: boolean) {
  return useQuery({ queryKey: [...violationKey, "list"], queryFn: ({ signal }) => fetchViolations(signal), enabled, retry: false });
}

export function useViolation(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...violationKey, "detail", id], queryFn: ({ signal }) => fetchViolation(id!, signal),
    enabled: enabled && Boolean(id), retry: false });
}

export function useViolationSources(clubId: string) {
  return useQuery({ queryKey: [...violationKey, "sources", clubId], queryFn: ({ signal }) => fetchViolationSources(clubId, signal),
    enabled: Boolean(clubId), retry: false });
}

export function useOpenViolation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: { input: OpenViolationInput; csrfToken: string }) => openViolation(action.input, action.csrfToken),
    onSuccess: async (detail) => {
      queryClient.setQueryData([...violationKey, "detail", detail.id], detail);
      await queryClient.invalidateQueries({ queryKey: [...violationKey, "list"] });
    },
  });
}

export function useViolationStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: { id: string; step: ViolationStep; csrfToken: string }) =>
      applyViolationStep(action.id, action.step, action.csrfToken),
    onSuccess: async (detail) => {
      queryClient.setQueryData([...violationKey, "detail", detail.id], detail);
      await queryClient.invalidateQueries({ queryKey: [...violationKey, "list"] });
    },
  });
}
