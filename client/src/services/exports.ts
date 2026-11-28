import { apiRequest, postFile, type DownloadedFile } from '@/services/apiRequest'
import type { DimensionCode } from '@/services/evaluationSchemes'
import type { Classification } from '@/services/evaluations'

export type ExportType =
  'CLUBS' | 'MEMBERS' | 'EVENTS' | 'FINANCE' | 'CLUB_BUDGETS' | 'COMPLIANCE' | 'EVALUATIONS'
export type ExportFormat = 'xlsx' | 'csv' | 'pdf'

export interface ExportFilter {
  periodCode?: string
  from?: string
  to?: string
  clubId?: string
  status?: string
}

export interface ExportOptions {
  types: { type: ExportType; title: string; statuses: string[] }[]
  formats: ExportFormat[]
  periods: { code: string; startAt: string; endAt: string }[]
  clubs: { id: string; name: string }[]
  /** Mới nhất trước; chỉ gồm các năm có ít nhất một đánh giá Published. */
  annualYears: AnnualYearOption[]
}

// Phản chiếu server/src/domain/annual-report.ts (UC55 A2).
export type Season = 'SPRING' | 'SUMMER' | 'FALL'
export type Trend = 'UP' | 'DOWN' | 'STABLE'
export type AnnualFormat = 'pdf' | 'xlsx'
export const MAX_REMARKS = 2_000
export const MAX_ACHIEVEMENTS = 20

export interface AnnualYearOption {
  year: number
  terms: { season: Season; periodCodes: string[]; published: boolean }[]
}

export interface AnnualClubRow {
  clubId: string
  clubName: string
  field: string | null
  state: string
  terms: Record<Season, { score: number; classification: Classification } | null>
  /** 0 nghĩa là "chưa có đánh giá"; các dòng này xếp cuối. */
  evaluatedTerms: number
  yearScore: number | null
  yearClassification: Classification | null
  trend: Trend | null
  dimensions: Record<DimensionCode, number | null>
}

export interface AnnualAchievement {
  key: string
  clubName: string
  title: string
  description: string
  periodCode: string
  season: Season
}

interface ClubRef {
  clubId: string
  clubName: string
}

export interface AnnualReport {
  year: number
  provisional: boolean
  terms: AnnualYearOption['terms']
  missingTerms: Season[]
  thresholds: { excellent: number; good: number; fair: number }
  overview: {
    clubsByState: Record<string, number>
    clubsCreated: number
    activeMembers: number
    completedEvents: number
    participations: number
  }
  evaluation: {
    evaluatedClubs: number
    byClassification: Record<Classification, number>
    averageYearScore: number | null
    averageByTerm: Record<Season, number | null>
    rows: AnnualClubRow[]
    top: (ClubRef & { yearScore: number })[]
  }
  dimensions: {
    averages: { code: DimensionCode; name: string; average: number | null }[]
    highest: DimensionCode | null
    lowest: DimensionCode | null
  }
  finance: {
    hasData: boolean
    approvedTotal: number
    disbursedTotal: number
    disbursementRate: number | null
    clubsWithoutAcceptedReport: number
  }
  compliance: {
    openViolations: number
    needsImprovement: ClubRef[]
    declining: ClubRef[]
    suspendedOrDissolving: (ClubRef & { state: string })[]
  }
  achievements: AnnualAchievement[]
}

// CSRF-protected POST to /admin/exports that unwraps `{ data }`; a 404 means nothing matches the filter
function post<T>(path: string, csrfToken: string, body: object): Promise<T> {
  return apiRequest<T>(`/api/v1/admin/exports${path}`, { method: 'POST', csrfToken, body })
}

// GET /admin/exports/options: các loại dữ liệu và bộ lọc có thể xuất
export async function fetchExportOptions(signal: AbortSignal): Promise<ExportOptions> {
  return apiRequest<ExportOptions>('/api/v1/admin/exports/options', { signal })
}

export interface ExportPreview {
  rowCount: number
  types: { type: ExportType; rowCount: number }[]
}

// POST /preview: xem trước dữ liệu sẽ xuất
/** Nhiều loại: một file xlsx, mỗi loại một sheet; csv/pdf và bộ lọc trạng thái cần đúng một loại (FR-UC55-12). */
export async function previewExport(
  types: ExportType[],
  filter: ExportFilter,
  csrfToken: string,
): Promise<ExportPreview> {
  return post<ExportPreview>('/preview', csrfToken, { types, filter })
}

// POST /admin/exports: tải file dữ liệu xuất
export async function downloadExport(
  types: ExportType[],
  filter: ExportFilter,
  format: ExportFormat,
  csrfToken: string,
): Promise<DownloadedFile> {
  return postFile(
    '/api/v1/admin/exports',
    { types, filter, format },
    csrfToken,
    `ucms-export.${format}`,
  )
}

// POST /annual-report/preview: xem trước báo cáo đánh giá năm
/** 404 khi năm đó không có đánh giá Published. */
export async function previewAnnualReport(year: number, csrfToken: string): Promise<AnnualReport> {
  return post<AnnualReport>('/annual-report/preview', csrfToken, { year })
}

// POST /annual-report: tải báo cáo đánh giá năm
export async function downloadAnnualReport(
  input: { year: number; format: AnnualFormat; remarks?: string; achievementKeys?: string[] },
  csrfToken: string,
): Promise<DownloadedFile> {
  return postFile(
    '/api/v1/admin/exports/annual-report',
    input,
    csrfToken,
    `bao-cao-danh-gia-clb-${input.year}.${input.format}`,
  )
}
