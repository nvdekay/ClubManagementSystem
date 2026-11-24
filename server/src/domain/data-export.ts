import type {
  AnnualAchievement,
  AnnualFormat,
  AnnualReport,
  AnnualSource,
} from './annual-report.js'
import { DomainError } from './errors.js'

/** Danh mục xuất dữ liệu cố định (UC55 FR-01). */
export const EXPORT_TYPES = [
  'CLUBS',
  'MEMBERS',
  'EVENTS',
  'FINANCE',
  'CLUB_BUDGETS',
  'COMPLIANCE',
  'EVALUATIONS',
] as const
export type ExportType = (typeof EXPORT_TYPES)[number]

export const EXPORT_FORMATS = ['xlsx', 'csv', 'pdf'] as const
export type ExportFormat = (typeof EXPORT_FORMATS)[number]

/** Tiêu đề file và tiêu đề cột bằng tiếng Việt: file được gửi nguyên trạng cho ban quản lý nhà trường. */
export const EXPORT_TITLES: Record<ExportType, string> = {
  CLUBS: 'Danh sách CLB và trạng thái',
  MEMBERS: 'Thành viên theo CLB',
  EVENTS: 'Sự kiện kèm đăng ký và điểm danh',
  FINANCE: 'Ngân sách, giải ngân và đối soát',
  CLUB_BUDGETS: 'Ngân sách theo CLB',
  COMPLIANCE: 'Hồ sơ vi phạm và góp ý/khiếu nại',
  EVALUATIONS: 'Kết quả đánh giá CLB',
}

/** Tên worksheet của workbook nhiều loại: Excel cho tối đa 31 ký tự và không chấp nhận các ký tự []:*?/\ . */
export const EXPORT_SHEET_NAMES: Record<ExportType, string> = {
  CLUBS: 'CLB',
  MEMBERS: 'Thành viên',
  EVENTS: 'Sự kiện',
  FINANCE: 'Tài chính',
  CLUB_BUDGETS: 'Ngân sách theo CLB',
  COMPLIANCE: 'Vi phạm và góp ý',
  EVALUATIONS: 'Đánh giá CLB',
}

/** Các giá trị trạng thái mỗi loại có thể lọc (chính các trạng thái vòng đời của thực thể). */
export const EXPORT_STATUSES: Record<ExportType, readonly string[]> = {
  CLUBS: ['Pending Setup', 'Active', 'Suspended', 'Dissolving', 'Dissolved'],
  MEMBERS: ['Active', 'Inactive', 'Left', 'Banned'],
  EVENTS: [
    'Approved',
    'Upcoming',
    'Ongoing',
    'Completed',
    'Report Submitted',
    'Closed',
    'Cancelled',
    'CREATED',
    'PUBLIC',
    'ONGOING',
    'FINISH',
    'CANCELLED',
  ],
  FINANCE: [
    'Approved',
    'Cancelled',
    'Disbursed',
    'Settlement Submitted',
    'Reconciliation Pending',
    'Reconciled',
    'Recovery Pending',
    'Closed',
  ],
  // Mỗi CLB một dòng nên không có trạng thái vòng đời nào để lọc.
  CLUB_BUDGETS: [],
  // Trạng thái hồ sơ vi phạm cùng trạng thái phản hồi của sinh viên (luôn là "Submitted").
  COMPLIANCE: [
    'Open',
    'Under Investigation',
    'Awaiting Club Response',
    'Decision Issued',
    'Corrective Action',
    'Resolved',
    'Closed',
    'Submitted',
  ],
  EVALUATIONS: ['Published'],
}

export type ExportCell = string | number | null

export interface ExportTable {
  columns: string[]
  rows: ExportCell[][]
}

/**
 * Hoặc là một học kỳ, hoặc là một khoảng ngày tường minh. Usecase quy học kỳ ra ngày, nên query
 * luôn nhận `from`/`to` và có thể khớp thêm theo chính mã học kỳ.
 */
export interface ExportFilter {
  periodCode?: string
  from?: Date
  to?: Date
  clubId?: string
  status?: string
}

export interface ExportFile {
  bytes: Buffer
  mimeType: string
  extension: string
}

export interface ExportRepository {
  table(type: ExportType, filter: ExportFilter): Promise<ExportTable>
  clubs(): Promise<{ id: string; name: string }[]>
  /** Báo cáo năm (A2) được audit với loại ANNUAL_REPORT, lọc theo năm, đếm theo CLB. */
  audit(input: {
    actorId: string
    type: ExportType | 'ANNUAL_REPORT'
    format: ExportFormat
    filter: ExportFilter | { year: number }
    rowCount: number
    at: Date
  }): Promise<void>
  /** Các mã kỳ khác nhau có đánh giá Published (danh sách năm của UC55 A2). */
  publishedPeriodCodes(): Promise<string[]>
  /** Với các mã kỳ mà `inYear` chấp nhận: phiên bản Published mới nhất của mỗi CLB và kỳ, các báo cáo
   * định kỳ Accepted, và toàn bộ CLB. */
  annualSource(inYear: (periodCode: string) => boolean): Promise<AnnualSource>
}

/** Nội dung file báo cáo năm in ra: báo cáo, các dòng tiêu đề, thành tích do officer chọn, nhận xét. */
export interface AnnualReportDocument {
  report: AnnualReport
  heading: string[]
  achievements: AnnualAchievement[]
  remarks?: string
}

/** Ghi một bảng ra file; các dòng `heading` đứng đầu (khi nào, ai, bộ lọc nào — FR-05). */
export interface ExportFileWriter {
  write(
    format: ExportFormat,
    title: string,
    heading: string[],
    table: ExportTable,
  ): Promise<ExportFile>
  /** Xuất nhiều loại: một sheet thông tin (`heading` cùng số dòng của mỗi sheet), sau đó mỗi bảng một sheet. */
  writeWorkbook(
    title: string,
    heading: string[],
    sheets: { name: string; title: string; table: ExportTable }[],
  ): Promise<ExportFile>
  writeAnnual(
    format: AnnualFormat,
    title: string,
    document: AnnualReportDocument,
  ): Promise<ExportFile>
}

const objectId = /^[0-9a-f]{24}$/i

// Kiểm tra bộ lọc kỳ hoặc khoảng ngày khi xuất dữ liệu
export function validateExportFilter(type: ExportType, filter: ExportFilter): ExportFilter {
  if (filter.periodCode !== undefined && (filter.from || filter.to)) {
    throw new DomainError('choose a semester or a date range, not both', 'validation', {
      field: 'period',
    })
  }
  if (
    (filter.from && Number.isNaN(filter.from.getTime())) ||
    (filter.to && Number.isNaN(filter.to.getTime())) ||
    (filter.from && filter.to && filter.from > filter.to)
  ) {
    throw new DomainError('invalid export date range', 'validation', { field: 'period' })
  }
  if (filter.clubId !== undefined && !objectId.test(filter.clubId)) {
    throw new DomainError('invalid export club', 'validation', { field: 'clubId' })
  }
  if (filter.status !== undefined && !EXPORT_STATUSES[type].includes(filter.status)) {
    throw new DomainError('invalid export status', 'validation', { field: 'status' })
  }
  return filter
}
