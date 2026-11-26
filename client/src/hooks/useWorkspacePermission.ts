import { useAuth } from '@/hooks/useAuth'
import type { Workspace } from '@/services/auth'

// The signed-in user's club workspace for a club, or undefined when they have none there
export function useClubWorkspace(clubId: string | null | undefined): Workspace | undefined {
  const auth = useAuth()
  if (!clubId) {
    return undefined
  }
  return auth.data?.workspaces.find(
    (workspace) => workspace.kind === 'club' && workspace.clubId === clubId,
  )
}

// Whether the signed-in user holds a permission in a club workspace (UI only; the server re-checks)
export function useWorkspacePermission(
  clubId: string | null | undefined,
  permission: string,
): boolean {
  return Boolean(useClubWorkspace(clubId)?.permissions.includes(permission))
}
