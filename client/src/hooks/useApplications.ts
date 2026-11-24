import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createDraft,
  documentAccess,
  fetchApplication,
  fetchApplicationConfig,
  lookupFounder,
  fetchMyApplications,
  previewApplication,
  removeDocument,
  saveDraft,
  submitDraft,
  uploadDocument,
  withdrawDraft,
  type ApplicationDocumentType,
  type DraftInput,
} from '@/services/applications'

const applicationsKey = ['applications'] as const

// Query cấu hình form hồ sơ thành lập CLB
export function useApplicationConfig(enabled: boolean) {
  return useQuery({
    queryKey: [...applicationsKey, 'config'],
    queryFn: ({ signal }) => fetchApplicationConfig(signal),
    enabled,
    retry: false,
  })
}

// Query hồ sơ thành lập CLB của tôi
export function useMyApplications(enabled: boolean) {
  return useQuery({
    queryKey: [...applicationsKey, 'mine'],
    queryFn: ({ signal }) => fetchMyApplications(signal),
    enabled,
    retry: false,
  })
}

// Query chi tiết một hồ sơ thành lập CLB
export function useApplication(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...applicationsKey, 'detail', id],
    queryFn: ({ signal }) => fetchApplication(id!, signal),
    enabled: enabled && Boolean(id),
    retry: false,
  })
}

// Query xem trước hồ sơ trước khi nộp
export function useApplicationPreview(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...applicationsKey, 'preview', id],
    queryFn: ({ signal }) => previewApplication(id!, signal),
    enabled: enabled && Boolean(id),
    retry: false,
  })
}

// Mutation tạo, lưu, nộp, rút hồ sơ và quản lý tài liệu, rồi làm mới cache
export function useApplicationAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      action:
        | { kind: 'create'; input: DraftInput; csrfToken: string }
        | { kind: 'save'; id: string; input: DraftInput; draftRevision: number; csrfToken: string }
        | { kind: 'submit' | 'withdraw'; id: string; csrfToken: string }
        | {
            kind: 'upload'
            id: string
            documentType: ApplicationDocumentType
            file: File
            csrfToken: string
          }
        | { kind: 'remove'; id: string; documentId: string; csrfToken: string },
    ) => {
      switch (action.kind) {
        case 'create':
          return createDraft(action.input, action.csrfToken)
        case 'save':
          return saveDraft(action.id, action.input, action.draftRevision, action.csrfToken)
        case 'submit':
          return submitDraft(action.id, action.csrfToken)
        case 'withdraw':
          return withdrawDraft(action.id, action.csrfToken)
        case 'upload':
          return uploadDocument(action.id, action.documentType, action.file, action.csrfToken)
        case 'remove':
          return removeDocument(action.id, action.documentId, action.csrfToken)
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: applicationsKey })
    },
  })
}

// Mutation tra cứu thành viên sáng lập theo email
export function useFounderLookup() {
  return useMutation({ mutationFn: (email: string) => lookupFounder(email) })
}

// Mutation lấy link truy cập tài liệu của hồ sơ
export function useDocumentAccess() {
  return useMutation({
    mutationFn: ({ id, documentId }: { id: string; documentId: string }) =>
      documentAccess(id, documentId),
  })
}
