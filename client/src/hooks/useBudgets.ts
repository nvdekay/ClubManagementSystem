import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchBudget, fetchBudgets, type BudgetFilter } from '@/services/budgets'

export const budgetsKeyRoot = ['budgets'] as const

// Query một trang ngân sách cho ICPDP theo bộ lọc và CLB (trang bắt đầu từ 1)
/** Trang trước vẫn hiển thị trong khi trang hoặc bộ lọc mới đang tải. */
export function useBudgets(
  filter: BudgetFilter,
  clubId: string,
  page: number,
  pageSize: number,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...budgetsKeyRoot, 'list', filter, clubId, page, pageSize],
    queryFn: ({ signal }) => fetchBudgets(filter, clubId, page, pageSize, signal),
    enabled,
    placeholderData: keepPreviousData,
  })
}

// Query chi tiết một ngân sách
export function useBudget(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...budgetsKeyRoot, 'detail', id],
    queryFn: ({ signal }) => fetchBudget(id!, signal),
    enabled: enabled && Boolean(id),
  })
}
