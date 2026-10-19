import { useQuery } from "@tanstack/react-query";
import {
  fetchClubBoardHistory, fetchDashboard, fetchInternalEvent, fetchInternalEvents, type DashboardContext,
} from "@/services/dashboard";

export const dashboardKeyRoot = ["dashboard"] as const;

export function useDashboard(context: DashboardContext) {
  return useQuery({
    queryKey: [...dashboardKeyRoot, context.workspace, context.workspace === "club" ? context.clubId : ""],
    queryFn: ({ signal }) => fetchDashboard(context, signal),
  });
}

export function useInternalEvents(filter: { clubId: string; semesterCode: string }, enabled: boolean) {
  return useQuery({ queryKey: [...dashboardKeyRoot, "internal-events", filter.clubId, filter.semesterCode],
    queryFn: ({ signal }) => fetchInternalEvents(filter, signal), enabled, retry: false });
}

export function useInternalEvent(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...dashboardKeyRoot, "internal-event", id],
    queryFn: ({ signal }) => fetchInternalEvent(id!, signal), enabled: enabled && Boolean(id), retry: false });
}

export function useClubBoardHistory(clubId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...dashboardKeyRoot, "board-history", clubId],
    queryFn: ({ signal }) => fetchClubBoardHistory(clubId!, signal), enabled: enabled && Boolean(clubId), retry: false });
}
