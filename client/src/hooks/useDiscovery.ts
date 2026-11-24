import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  fetchClub,
  fetchClubs,
  fetchEvent,
  fetchEvents,
  type PublicEventFilter,
} from '@/services/discovery'

export const discoveryKeyRoot = ['public-discovery'] as const

// Query danh sách CLB công khai theo từ khoá, lĩnh vực và trang
export function useClubs(search: string, field: string, page: number) {
  return useQuery({
    queryKey: [...discoveryKeyRoot, 'clubs', search, field, page],
    queryFn: ({ signal }) => fetchClubs(search, field, page, signal),
    placeholderData: keepPreviousData,
  })
}

// Query chi tiết một CLB công khai
export function useClub(id: string) {
  return useQuery({
    queryKey: [...discoveryKeyRoot, 'club', id],
    queryFn: ({ signal }) => fetchClub(id, signal),
    enabled: Boolean(id),
  })
}

// Query danh sách sự kiện công khai theo trang, trạng thái và từ khoá
export function useEvents(page: number, status: PublicEventFilter = 'upcoming', search = '') {
  return useQuery({
    queryKey: [...discoveryKeyRoot, 'events', page, status, search],
    queryFn: ({ signal }) => fetchEvents(page, signal, status, search),
    placeholderData: keepPreviousData,
  })
}

// Query chi tiết một sự kiện công khai
export function useEvent(id: string) {
  return useQuery({
    queryKey: [...discoveryKeyRoot, 'event', id],
    queryFn: ({ signal }) => fetchEvent(id, signal),
    enabled: Boolean(id),
  })
}
