import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createDraft, documentAccess, fetchApplication, fetchApplicationConfig,
  fetchMyApplications, previewApplication, removeDocument, saveDraft,
  submitDraft, uploadDocument, withdrawDraft, type DraftInput,
} from "@/services/applications";

const applicationsKey = ["applications"] as const;

export function useApplicationConfig(enabled: boolean) {
  return useQuery({ queryKey: [...applicationsKey, "config"],
    queryFn: ({ signal }) => fetchApplicationConfig(signal), enabled, retry: false });
}

export function useMyApplications(enabled: boolean) {
  return useQuery({ queryKey: [...applicationsKey, "mine"],
    queryFn: ({ signal }) => fetchMyApplications(signal), enabled, retry: false });
}

export function useApplication(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...applicationsKey, "detail", id],
    queryFn: ({ signal }) => fetchApplication(id!, signal), enabled: enabled && Boolean(id), retry: false });
}

export function useApplicationPreview(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: [...applicationsKey, "preview", id],
    queryFn: ({ signal }) => previewApplication(id!, signal),
    enabled: enabled && Boolean(id), retry: false });
}

export function useApplicationAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action:
      | { kind: "create"; input: DraftInput; csrfToken: string }
      | { kind: "save"; id: string; input: DraftInput; draftRevision: number; csrfToken: string }
      | { kind: "submit" | "withdraw"; id: string; csrfToken: string }
      | { kind: "upload"; id: string; documentType: string; file: File; csrfToken: string }
      | { kind: "remove"; id: string; documentId: string; csrfToken: string }) => {
      switch (action.kind) {
        case "create": return createDraft(action.input, action.csrfToken);
        case "save": return saveDraft(action.id, action.input, action.draftRevision, action.csrfToken);
        case "submit": return submitDraft(action.id, action.csrfToken);
        case "withdraw": return withdrawDraft(action.id, action.csrfToken);
        case "upload": return uploadDocument(action.id, action.documentType, action.file, action.csrfToken);
        case "remove": return removeDocument(action.id, action.documentId, action.csrfToken);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: applicationsKey });
    },
  });
}

export function useDocumentAccess() {
  return useMutation({ mutationFn: ({ id, documentId }: { id: string; documentId: string }) =>
    documentAccess(id, documentId) });
}
