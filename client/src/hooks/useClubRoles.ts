import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchClubRoleDirectory, assignClubRole, createClubRole, deactivateClubRole, fetchClubRoles, revokeClubRole, updateClubRole,
  type ClubRoleAssignmentInput, type ClubRoleInput, type ClubRoleOverview,
} from "@/services/clubRoles";

const clubRolesKeyRoot = ["club-roles"] as const;
function clubRolesKey(clubId: string | undefined) {
  return [...clubRolesKeyRoot, clubId] as const;
}

type ClubRoleAction =
  | { kind: "create"; clubId: string; input: ClubRoleInput; csrfToken: string }
  | { kind: "update"; clubId: string; roleId: string; input: ClubRoleInput; csrfToken: string }
  | { kind: "deactivate"; clubId: string; roleId: string; csrfToken: string }
  | { kind: "assign"; clubId: string; roleId: string; input: ClubRoleAssignmentInput; csrfToken: string }
  | { kind: "revoke"; clubId: string; roleId: string; assignmentId: string; csrfToken: string };

export function useClubRoles(clubId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: clubRolesKey(clubId),
    queryFn: ({ signal }) => fetchClubRoles(clubId!, signal),
    enabled: enabled && Boolean(clubId), retry: false });
}

export function useClubRoleAction() {
  const queryClient = useQueryClient();
  return useMutation<ClubRoleOverview, Error, ClubRoleAction>({
    mutationFn: (action) => {
      switch (action.kind) {
        case "create": return createClubRole(action.clubId, action.input, action.csrfToken);
        case "update": return updateClubRole(action.clubId, action.roleId, action.input, action.csrfToken);
        case "deactivate": return deactivateClubRole(action.clubId, action.roleId, action.csrfToken);
        case "assign": return assignClubRole(action.clubId, action.roleId, action.input, action.csrfToken);
        case "revoke": return revokeClubRole(action.clubId, action.roleId, action.assignmentId, action.csrfToken);
      }
    },
    // Every mutation answers with the whole overview, so the cache is replaced without a refetch.
    onSuccess: async (overview, action) => {
      await queryClient.cancelQueries({ queryKey: clubRolesKey(action.clubId) });
      queryClient.setQueryData(clubRolesKey(action.clubId), overview);
      await queryClient.invalidateQueries({ queryKey: [...clubRolesKeyRoot, "directory", action.clubId] });
    },
  });
}

export function useClubRoleDirectory(clubId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...clubRolesKeyRoot, "directory", clubId], enabled: enabled && Boolean(clubId), retry: false,
    queryFn: ({ signal }) => fetchClubRoleDirectory(clubId!, signal) });
}
