import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createClubField, fetchClubFields, removeClubField, updateClubField, type ClubFieldInput,
} from "@/services/clubFields";

const clubFieldsKeyRoot = ["clubFields"] as const;

export function useClubFields(enabled: boolean) {
  return useQuery({
    queryKey: [...clubFieldsKeyRoot, "catalog"],
    queryFn: ({ signal }) => fetchClubFields(signal),
    enabled,
    retry: false,
  });
}

/** Renames also rewrite clubs' field names, so every mutation refetches the usage-aware list. */
function useInvalidateClubFields() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: clubFieldsKeyRoot });
}

export function useCreateClubField() {
  const invalidate = useInvalidateClubFields();
  return useMutation({
    mutationFn: ({ input, csrfToken }: { input: ClubFieldInput; csrfToken: string }) =>
      createClubField(input, csrfToken),
    onSuccess: invalidate,
  });
}

export function useUpdateClubField() {
  const invalidate = useInvalidateClubFields();
  return useMutation({
    mutationFn: ({ id, input, csrfToken }: { id: string; input: ClubFieldInput; csrfToken: string }) =>
      updateClubField(id, input, csrfToken),
    onSuccess: invalidate,
  });
}

export function useRemoveClubField() {
  const invalidate = useInvalidateClubFields();
  return useMutation({
    mutationFn: ({ id, csrfToken }: { id: string; csrfToken: string }) => removeClubField(id, csrfToken),
    onSuccess: invalidate,
  });
}
