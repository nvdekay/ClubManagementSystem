import { ApiError, apiFetch } from "@/services/apiError";
import type { DimensionCode } from "@/services/evaluationSchemes";
import type { Classification } from "@/services/evaluations";

export type ExportType = "CLUBS" | "MEMBERS" | "EVENTS" | "FINANCE" | "CLUB_BUDGETS" | "COMPLIANCE" | "EVALUATIONS";
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
  /** Newest first; only years with at least one Published evaluation. */
  annualYears: AnnualYearOption[];
}

// Mirrors server/src/domain/annual-report.ts (UC55 A2).
export type Season = "SPRING" | "SUMMER" | "FALL";
export type Trend = "UP" | "DOWN" | "STABLE";
export type AnnualFormat = "pdf" | "xlsx";
export const MAX_REMARKS = 2_000;
export const MAX_ACHIEVEMENTS = 20;

export interface AnnualYearOption {
  year: number;
  terms: { season: Season; periodCodes: string[]; published: boolean }[];
}

export interface AnnualClubRow {
  clubId: string;
  clubName: string;
  field: string | null;
  state: string;
  terms: Record<Season, { score: number; classification: Classification } | null>;
  /** 0 means "no evaluation yet"; such rows come last. */
  evaluatedTerms: number;
  yearScore: number | null;
  yearClassification: Classification | null;
  trend: Trend | null;
  dimensions: Record<DimensionCode, number | null>;
}

export interface AnnualAchievement {
  key: string;
  clubName: string;
  title: string;
  description: string;
  periodCode: string;
  season: Season;
}

interface ClubRef { clubId: string; clubName: string }

export interface AnnualReport {
  year: number;
  provisional: boolean;
  terms: AnnualYearOption["terms"];
  missingTerms: Season[];
  thresholds: { excellent: number; good: number; fair: number };
  overview: { clubsByState: Record<string, number>; clubsCreated: number; activeMembers: number;
    completedEvents: number; participations: number };
  evaluation: {
    evaluatedClubs: number;
    byClassification: Record<Classification, number>;
    averageYearScore: number | null;
    averageByTerm: Record<Season, number | null>;
    rows: AnnualClubRow[];
    top: (ClubRef & { yearScore: number })[];
  };
  dimensions: {
    averages: { code: DimensionCode; name: string; average: number | null }[];
    highest: DimensionCode | null;
    lowest: DimensionCode | null;
  };
  finance: { hasData: boolean; approvedTotal: number; disbursedTotal: number; disbursementRate: number | null;
    clubsWithoutAcceptedReport: number };
  compliance: { openViolations: number; needsImprovement: ClubRef[]; declining: ClubRef[];
    suspendedOrDissolving: (ClubRef & { state: string })[] };
  achievements: AnnualAchievement[];
}

/** Non-2xx response; 404 means nothing matched the filter (no file is produced). */
export class ExportRequestError extends ApiError {
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
  return apiFetch(`/api/v1/admin/exports${path}`, { method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) });
}

export async function fetchExportOptions(signal: AbortSignal): Promise<ExportOptions> {
  const response = await apiFetch("/api/v1/admin/exports/options", { signal, credentials: "same-origin" });
  if (!response.ok) return failure(response);
  const body: { data: ExportOptions } = await response.json();
  return body.data;
}

export interface ExportPreview {
  rowCount: number;
  types: { type: ExportType; rowCount: number }[];
}

/** Several types: one xlsx, a sheet per type; csv/pdf and the status filter need exactly one (FR-UC55-12). */
export async function previewExport(types: ExportType[], filter: ExportFilter, csrfToken: string): Promise<ExportPreview> {
  const response = await post("/preview", csrfToken, { types, filter });
  if (!response.ok) return failure(response);
  const body: { data: ExportPreview } = await response.json();
  return body.data;
}

/** The generated file; the name comes from the server's Content-Disposition. */
async function file(response: Response, fallbackName: string): Promise<{ blob: Blob; fileName: string }> {
  if (!response.ok) return failure(response);
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const fileName = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName;
  return { blob: await response.blob(), fileName };
}

export async function downloadExport(types: ExportType[], filter: ExportFilter, format: ExportFormat,
  csrfToken: string): Promise<{ blob: Blob; fileName: string }> {
  return file(await post("", csrfToken, { types, filter, format }), `ucms-export.${format}`);
}

/** 404 when the year has no Published evaluation. */
export async function previewAnnualReport(year: number, csrfToken: string): Promise<AnnualReport> {
  const response = await post("/annual-report/preview", csrfToken, { year });
  if (!response.ok) return failure(response);
  const body: { data: AnnualReport } = await response.json();
  return body.data;
}

export async function downloadAnnualReport(input: { year: number; format: AnnualFormat; remarks?: string;
  achievementKeys?: string[] }, csrfToken: string): Promise<{ blob: Blob; fileName: string }> {
  return file(await post("/annual-report", csrfToken, input), `bao-cao-danh-gia-clb-${input.year}.${input.format}`);
}
