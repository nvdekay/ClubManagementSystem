import { useQuery } from "@tanstack/react-query";
import {
  fetchClubBoardHistory, fetchDashboard, fetchInternalEvent, fetchInternalEvents, type DashboardContext,
} from "@/services/dashboard";

export const dashboardKeyRoot = ["dashboard"] as const;

// Query số liệu dashboard theo ngữ cảnh
export function useDashboard(context: DashboardContext) {
  return useQuery({
    queryKey: [...dashboardKeyRoot, context.workspace, context.workspace === "club" ? context.clubId : ""],
    queryFn: ({ signal }) => fetchDashboard(context, signal),
  });
}

// Query sự kiện nội bộ lọc theo CLB và học kỳ
export function useInternalEvents(filter: { clubId: string; semesterCode: string }, enabled: boolean) {
  return useQuery({ queryKey: [...dashboardKeyRoot, "internal-events", filter.clubId, filter.semesterCode],
    queryFn: ({ signal }) => fetchInternalEvents(filter, signal), enabled, retry: false });
}

// Query chi tiết một sự kiện nội bộ
export function useInternalEvent(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...dashboardKeyRoot, "internal-event", id],
    queryFn: ({ signal }) => fetchInternalEvent(id!, signal), enabled: enabled && Boolean(id), retry: false });
}

// Query lịch sử ban chủ nhiệm của CLB
export function useClubBoardHistory(clubId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...dashboardKeyRoot, "board-history", clubId],
    queryFn: ({ signal }) => fetchClubBoardHistory(clubId!, signal), enabled: enabled && Boolean(clubId), retry: false });
}
