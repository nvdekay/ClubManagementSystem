import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  activateScheme, createScheme, deleteScheme, fetchSchemes, updateScheme, type SchemeSettings,
} from "@/services/evaluationSchemes";

const schemesKeyRoot = ["evaluationSchemes"] as const;

export function useEvaluationSchemes(enabled: boolean) {
  return useQuery({ queryKey: [...schemesKeyRoot, "catalogue"],
    queryFn: ({ signal }) => fetchSchemes(signal), enabled, retry: false });
}

/** Activation also supersedes another scheme, so every change refetches the whole list. */
export function useEvaluationSchemeAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action:
      | { kind: "create"; periodCode: string; copyFromId?: string; csrfToken: string }
      | { kind: "update"; id: string; settings: SchemeSettings; csrfToken: string }
      | { kind: "activate" | "delete"; id: string; csrfToken: string }) => {
      switch (action.kind) {
        case "create": return createScheme({ periodCode: action.periodCode,
          ...(action.copyFromId ? { copyFromId: action.copyFromId } : {}) }, action.csrfToken);
        case "update": return updateScheme(action.id, action.settings, action.csrfToken);
        case "activate": return activateScheme(action.id, action.csrfToken);
        case "delete": return deleteScheme(action.id, action.csrfToken);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schemesKeyRoot }),
  });
}
