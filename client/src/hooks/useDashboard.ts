import { useQuery } from "@tanstack/react-query";
import { fetchDashboard, type DashboardContext } from "@/services/dashboard";

export function useDashboard(context: DashboardContext) {
  return useQuery({
    queryKey: ["dashboard", context.workspace, context.workspace === "club" ? context.clubId : ""],
    queryFn: ({ signal }) => fetchDashboard(context, signal),
  });
}
