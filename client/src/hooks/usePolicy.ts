import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createPolicy, fetchPolicies, type CreatePolicyInput } from '@/services/policy'

const policyKeyRoot = ['policies'] as const

// Query các chính sách và phiên bản
export function usePolicies(enabled: boolean) {
  return useQuery({
    queryKey: [...policyKeyRoot, 'recent'],
    queryFn: ({ signal }) => fetchPolicies(signal),
    enabled,
  })
}

// Mutation tạo phiên bản chính sách mới, rồi làm mới cache
export function useCreatePolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ input, csrfToken }: { input: CreatePolicyInput; csrfToken: string }) =>
      createPolicy(input, csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: policyKeyRoot })
    },
  })
}
