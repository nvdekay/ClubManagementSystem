import { useMutation, useQuery } from "@tanstack/react-query";

import {
  downloadExport, fetchExportOptions, previewExport, type ExportFilter, type ExportFormat, type ExportType,
} from "@/services/exports";

const exportsKeyRoot = ["exports"] as const;

export function useExportOptions(enabled: boolean) {
  return useQuery({ queryKey: [...exportsKeyRoot, "options"],
    queryFn: ({ signal }) => fetchExportOptions(signal), enabled, retry: false });
}

export function useExportPreview() {
  return useMutation({ mutationFn: ({ type, filter, csrfToken }: { type: ExportType; filter: ExportFilter;
    csrfToken: string }) => previewExport(type, filter, csrfToken) });
}

export function useExportDownload() {
  return useMutation({ mutationFn: ({ type, filter, format, csrfToken }: { type: ExportType;
    filter: ExportFilter; format: ExportFormat; csrfToken: string }) => downloadExport(type, filter, format, csrfToken) });
}
