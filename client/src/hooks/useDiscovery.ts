import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchClub, fetchClubs, fetchEvent, fetchEvents,
} from "@/services/discovery";

export const discoveryKeyRoot = ["public-discovery"] as const;

export function useClubs(search: string, field: string, page: number) {
  return useQuery({
    queryKey: [...discoveryKeyRoot, "clubs", search, field, page],
    queryFn: ({ signal }) => fetchClubs(search, field, page, signal),
    placeholderData: keepPreviousData,
  });
}

export function useClub(id: string) {
  return useQuery({
    queryKey: [...discoveryKeyRoot, "club", id],
    queryFn: ({ signal }) => fetchClub(id, signal),
    enabled: Boolean(id),
  });
}

export function useEvents(page: number) {
  return useQuery({
    queryKey: [...discoveryKeyRoot, "events", page],
    queryFn: ({ signal }) => fetchEvents(page, signal),
    placeholderData: keepPreviousData,
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: [...discoveryKeyRoot, "event", id],
    queryFn: ({ signal }) => fetchEvent(id, signal),
    enabled: Boolean(id),
  });
}
