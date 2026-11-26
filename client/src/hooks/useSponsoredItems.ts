import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { budgetsKeyRoot } from './useBudgets'
import { accountabilityKeyRoot } from './useAccountability'
import { dashboardKeyRoot } from './useDashboard'
import {
  changeSponsoredItem,
  fetchInvoiceImageUrl,
  fetchRefundAccount,
  fetchSponsoredBudget,
  uploadInvoiceImage,
  type ItemAction,
  type SponsoredBudget,
} from '@/services/sponsoredItems'

const sponsoredKey = ['sponsored-items'] as const

// Query các mục hoá đơn tài trợ của ngân sách
export function useSponsoredItems(id: string, clubId?: string) {
  return useQuery({
    queryKey: [...sponsoredKey, id, clubId],
    queryFn: ({ signal }) => fetchSponsoredBudget(id, clubId, signal),
  })
}

// Query link xem tệp chứng từ, tự làm mới trước khi hết hạn
export function useInvoiceImage(
  id: string,
  clubId: string | undefined,
  itemId: string,
  imageId: string,
) {
  return useQuery({
    queryKey: [...sponsoredKey, id, clubId, itemId, imageId],
    queryFn: ({ signal }) => fetchInvoiceImageUrl(id, clubId, itemId, imageId, signal, false),
    staleTime: 30_000,
    refetchInterval: 45_000,
  })
}

// Mutation lấy URL tải xuống (attachment=true) cho một tệp chứng từ
export function useDownloadInvoiceFile(id: string, clubId: string | undefined) {
  return useMutation({
    mutationFn: (input: { itemId: string; imageId: string }) =>
      fetchInvoiceImageUrl(id, clubId, input.itemId, input.imageId, undefined, true),
  })
}

// Query thông tin tài khoản ngân hàng hoàn trả của nhà trường (chỉ gọi khi CLB bấm thực hiện hoàn trả)
export function useRefundAccount(
  id: string,
  clubId: string | undefined,
  itemId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...sponsoredKey, id, clubId, itemId, 'refund-account'],
    queryFn: ({ signal }) => fetchRefundAccount(id, clubId!, itemId, signal),
    enabled: Boolean(clubId && enabled),
  })
}

// Mutation thao tác trên mục hoá đơn tài trợ, rồi làm mới cache
export function useSponsoredItemAction(id: string, clubId: string | undefined, csrfToken: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (
      input:
        | { itemId: string; revision: number; action: ItemAction }
        | {
            itemId: string
            revision: number
            files: File[]
            target?: 'invoice' | 'refund'
            onProgress: (done: number) => void
          },
    ) => {
      if (!('files' in input)) {
        return changeSponsoredItem(
          id,
          clubId,
          input.itemId,
          input.revision,
          input.action,
          csrfToken,
        )
      }
      let revision = input.revision
      let result: SponsoredBudget | undefined
      for (const [index, file] of input.files.entries()) {
        result = await uploadInvoiceImage(
          id,
          clubId!,
          input.itemId,
          revision,
          file,
          csrfToken,
          input.target ?? 'invoice',
        )
        revision = result.revision
        client.setQueryData([...sponsoredKey, id, clubId], result)
        input.onProgress(index + 1)
      }
      return result
    },
    onSuccess: (result) => {
      if (result) {
        client.setQueryData([...sponsoredKey, id, clubId], result)
      }
    },
    onSettled: async () => {
      await Promise.all(
        [
          [...sponsoredKey, id, clubId],
          budgetsKeyRoot,
          accountabilityKeyRoot,
          dashboardKeyRoot,
        ].map((queryKey) => client.invalidateQueries({ queryKey })),
      )
    },
  })
}
