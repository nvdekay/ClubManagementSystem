import { useQuery } from '@tanstack/react-query'
import { fetchClubBoardHistory, fetchDashboard, type DashboardContext } from '@/services/dashboard'

export const dashboardKeyRoot = ['dashboard'] as const

// Query số liệu dashboard theo ngữ cảnh
export function useDashboard(context: DashboardContext) {
  return useQuery({
    queryKey: [
      ...dashboardKeyRoot,
      context.workspace,
      context.workspace === 'club' ? context.clubId : '',
    ],
    queryFn: ({ signal }) => fetchDashboard(context, signal),
  })
}

// Query sự kiện nội bộ lọc theo CLB và học kỳ
export function useClubBoardHistory(clubId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...dashboardKeyRoot, 'board-history', clubId],
    queryFn: ({ signal }) => fetchClubBoardHistory(clubId!, signal),
    enabled: enabled && Boolean(clubId),
    retry: false,
  })
}
