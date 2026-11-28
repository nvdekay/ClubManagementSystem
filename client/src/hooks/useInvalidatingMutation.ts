import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'

/**
 * Mutation that, on success, optionally seeds one cache entry from the response and then
 * invalidates the given query keys one after another (in order).
 */
export function useInvalidatingMutation<TData, TVars>(
  mutationFn: (vars: TVars) => Promise<TData>,
  invalidate: readonly QueryKey[] | ((data: TData, vars: TVars) => readonly QueryKey[]),
  seed?: (data: TData, vars: TVars) => readonly [QueryKey, unknown] | null,
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async (data: TData, vars: TVars) => {
      const entry = seed?.(data, vars)
      if (entry) {
        client.setQueryData(entry[0], entry[1])
      }
      for (const queryKey of typeof invalidate === 'function'
        ? invalidate(data, vars)
        : invalidate) {
        await client.invalidateQueries({ queryKey })
      }
    },
  })
}
