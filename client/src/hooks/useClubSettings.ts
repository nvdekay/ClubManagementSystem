import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applyDepartmentTemplate, createDepartment, deactivateDepartment, fetchClubSettings,
  saveClubProfile, updateDepartment, type ClubDepartmentInput, type ClubProfileInput,
} from "@/services/clubSettings";

const settingsKey = ["club-settings"] as const;
type ClubSettingsAction =
  | { kind: "profile"; clubId: string; input: ClubProfileInput; csrfToken: string }
  | { kind: "template"; clubId: string; csrfToken: string }
  | { kind: "createDepartment"; clubId: string; input: ClubDepartmentInput; csrfToken: string }
  | { kind: "updateDepartment"; clubId: string; departmentId: string;
    input: ClubDepartmentInput; csrfToken: string }
  | { kind: "deactivateDepartment"; clubId: string; departmentId: string; csrfToken: string };

export function useClubSettings(clubId: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...settingsKey, clubId],
    queryFn: ({ signal }) => fetchClubSettings(clubId!, signal),
    enabled: enabled && Boolean(clubId), retry: false });
}

export function useClubSettingsAction() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, ClubSettingsAction>({
    mutationFn: (action) => {
      switch (action.kind) {
        case "profile": return saveClubProfile(action.clubId, action.input, action.csrfToken);
        case "template": return applyDepartmentTemplate(action.clubId, action.csrfToken);
        case "createDepartment": return createDepartment(action.clubId, action.input, action.csrfToken);
        case "updateDepartment": return updateDepartment(action.clubId, action.departmentId,
          action.input, action.csrfToken);
        case "deactivateDepartment": return deactivateDepartment(action.clubId,
          action.departmentId, action.csrfToken);
      }
    },
    onSuccess: async (_data, action) => {
      await queryClient.invalidateQueries({ queryKey: [...settingsKey, action.clubId] });
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}
