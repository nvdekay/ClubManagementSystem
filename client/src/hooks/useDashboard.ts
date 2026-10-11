import { useQuery } from "@tanstack/react-query";
import { fetchDashboard, type DashboardContext } from "@/services/dashboard";

export const dashboardKeyRoot = ["dashboard"] as const;

export function useDashboard(context: DashboardContext) {
  return useQuery({
    queryKey: [...dashboardKeyRoot, context.workspace, context.workspace === "club" ? context.clubId : ""],
    queryFn: ({ signal }) => fetchDashboard(context, signal),
  });
}
