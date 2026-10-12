export type ExportType = "CLUBS" | "MEMBERS" | "EVENTS" | "FINANCE" | "COMPLIANCE" | "EVALUATIONS";
export type ExportFormat = "xlsx" | "csv" | "pdf";

export interface ExportFilter {
  periodCode?: string;
  from?: string;
  to?: string;
  clubId?: string;
  status?: string;
}

export interface ExportOptions {
  types: { type: ExportType; title: string; statuses: string[] }[];
  formats: ExportFormat[];
  periods: { code: string; startAt: string; endAt: string }[];
  clubs: { id: string; name: string }[];
}

/** Non-2xx response; 404 means nothing matched the filter (no file is produced). */
export class ExportRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ExportRequestError";
  }
}

async function failure(response: Response): Promise<never> {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  throw new ExportRequestError(body?.message ?? `HTTP ${response.status}`, response.status);
}

function post(path: string, csrfToken: string, body: object): Promise<Response> {
  return fetch(`/api/v1/admin/exports${path}`, { method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) });
}

export async function fetchExportOptions(signal: AbortSignal): Promise<ExportOptions> {
  const response = await fetch("/api/v1/admin/exports/options", { signal, credentials: "same-origin" });
  if (!response.ok) return failure(response);
  const body: { data: ExportOptions } = await response.json();
  return body.data;
}

export async function previewExport(type: ExportType, filter: ExportFilter, csrfToken: string): Promise<number> {
  const response = await post("/preview", csrfToken, { type, filter });
  if (!response.ok) return failure(response);
  const body: { data: { rowCount: number } } = await response.json();
  return body.data.rowCount;
}

/** Downloads the generated file; the name comes from the server's Content-Disposition. */
export async function downloadExport(type: ExportType, filter: ExportFilter, format: ExportFormat,
  csrfToken: string): Promise<{ blob: Blob; fileName: string }> {
  const response = await post("", csrfToken, { type, filter, format });
  if (!response.ok) return failure(response);
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const fileName = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `ucms-export.${format}`;
  return { blob: await response.blob(), fileName };
}
