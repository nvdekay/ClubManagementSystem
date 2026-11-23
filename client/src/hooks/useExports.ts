import { useMutation, useQuery } from "@tanstack/react-query";

import {
  downloadAnnualReport, downloadExport, fetchExportOptions, previewAnnualReport, previewExport,
  type AnnualFormat, type ExportFilter, type ExportFormat, type ExportType,
} from "@/services/exports";

const exportsKeyRoot = ["exports"] as const;

export function useExportOptions(enabled: boolean) {
  return useQuery({ queryKey: [...exportsKeyRoot, "options"],
    queryFn: ({ signal }) => fetchExportOptions(signal), enabled, retry: false });
}

export function useExportPreview() {
  return useMutation({ mutationFn: ({ types, filter, csrfToken }: { types: ExportType[]; filter: ExportFilter;
    csrfToken: string }) => previewExport(types, filter, csrfToken) });
}

export function useExportDownload() {
  return useMutation({ mutationFn: ({ types, filter, format, csrfToken }: { types: ExportType[];
    filter: ExportFilter; format: ExportFormat; csrfToken: string }) => downloadExport(types, filter, format, csrfToken) });
}

export function useAnnualReportPreview() {
  return useMutation({ mutationFn: ({ year, csrfToken }: { year: number; csrfToken: string }) =>
    previewAnnualReport(year, csrfToken) });
}

export function useAnnualReportDownload() {
  return useMutation({ mutationFn: ({ csrfToken, ...input }: { year: number; format: AnnualFormat; remarks?: string;
    achievementKeys?: string[]; csrfToken: string }) => downloadAnnualReport(input, csrfToken) });
}
