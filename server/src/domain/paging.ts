/** Page size an ICPDP queue returns when the caller does not ask for one. */
export const DEFAULT_PAGE_SIZE = 20
/** Largest page a list endpoint serves; bigger requests are a validation error. */
export const MAX_PAGE_SIZE = 100
/** Upper bound for the page number, so `skip` stays a sane integer. */
export const MAX_PAGE = 100_000

/** One page of a server-side paged list; `page` starts at 1. */
export interface PageRequest {
  page: number
  pageSize: number
}

export interface Page<T> {
  items: T[]
  /** Rows matching the filter across every page. */
  total: number
  page: number
  pageSize: number
}

// Số bản ghi cần bỏ qua để tới đầu trang được yêu cầu
export function pageSkip(request: PageRequest): number {
  return (request.page - 1) * request.pageSize
}
