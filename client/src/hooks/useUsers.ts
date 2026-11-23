import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createUser, fetchUsers } from "@/services/users";

// Root key for cross-cutting cache ops (invalidate/cancel match by prefix);
// usersKey(...) identifies one server page — every queryFn input is part of the key.
const usersKeyRoot = ["users"] as const;
function usersKey(search: string, limit: number, offset: number) {
  return [...usersKeyRoot, search, limit, offset] as const;
}

export function useUsers(search = "", limit = 20, offset = 0) {
  return useQuery({
    queryKey: usersKey(search, limit, offset),
    queryFn: ({ signal }) => fetchUsers({ search, limit, offset, signal }),
    // Show the previous page's rows while the new one loads — no flash to empty.
    placeholderData: keepPreviousData,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      // The list is server-filtered now — the response alone can't tell whether the new
      // user matches the active search, so refetch instead of setQueryData.
      await queryClient.invalidateQueries({ queryKey: usersKeyRoot });
    },
  });
}
