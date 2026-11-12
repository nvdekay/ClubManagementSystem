import type { AnnualAchievement, AnnualFormat, AnnualReport, AnnualSource } from "./annual-report.js";
import { DomainError } from "./errors.js";

/** The fixed export catalogue (UC55 FR-01). */
export const EXPORT_TYPES = ["CLUBS", "MEMBERS", "EVENTS", "FINANCE", "CLUB_BUDGETS", "COMPLIANCE", "EVALUATIONS"] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];

export const EXPORT_FORMATS = ["xlsx", "csv", "pdf"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** File titles and column headers are Vietnamese: the files go to school management as-is. */
export const EXPORT_TITLES: Record<ExportType, string> = {
  CLUBS: "Danh sách CLB và trạng thái",
  MEMBERS: "Thành viên theo CLB",
  EVENTS: "Sự kiện kèm đăng ký và điểm danh",
  FINANCE: "Ngân sách, giải ngân và đối soát",
  CLUB_BUDGETS: "Ngân sách theo CLB",
  COMPLIANCE: "Hồ sơ vi phạm và góp ý/khiếu nại",
  EVALUATIONS: "Kết quả đánh giá CLB",
};

/** Worksheet names of a multi-type workbook: Excel allows at most 31 characters and none of []:*?/\ . */
export const EXPORT_SHEET_NAMES: Record<ExportType, string> = {
  CLUBS: "CLB", MEMBERS: "Thành viên", EVENTS: "Sự kiện", FINANCE: "Tài chính", CLUB_BUDGETS: "Ngân sách theo CLB",
  COMPLIANCE: "Vi phạm và góp ý", EVALUATIONS: "Đánh giá CLB",
};

/** Status values each type can be filtered on (the entity's own lifecycle states). */
export const EXPORT_STATUSES: Record<ExportType, readonly string[]> = {
  CLUBS: ["Pending Setup", "Active", "Suspended", "Dissolving", "Dissolved"],
  MEMBERS: ["Active", "Inactive", "Left", "Banned"],
  EVENTS: ["Approved", "Upcoming", "Ongoing", "Completed", "Report Submitted", "Closed", "Cancelled"],
  FINANCE: ["Approved", "Cancelled", "Disbursed", "Settlement Submitted", "Reconciliation Pending", "Reconciled",
    "Recovery Pending", "Closed"],
  // One row per club, so there is no lifecycle state to filter on.
  CLUB_BUDGETS: [],
  // Violation case states plus the state of student feedback (always "Submitted").
  COMPLIANCE: ["Open", "Under Investigation", "Awaiting Club Response", "Decision Issued", "Corrective Action",
    "Resolved", "Closed", "Submitted"],
  EVALUATIONS: ["Published"],
};

export type ExportCell = string | number | null;

export interface ExportTable {
  columns: string[];
  rows: ExportCell[][];
}

/**
 * Either a semester or an explicit date range. The use case resolves a semester to its dates, so queries
 * always get `from`/`to` and may also match on the semester code itself.
 */
export interface ExportFilter {
  periodCode?: string;
  from?: Date;
  to?: Date;
  clubId?: string;
  status?: string;
}

export interface ExportFile {
  bytes: Buffer;
  mimeType: string;
  extension: string;
}

export interface ExportRepository {
  table(type: ExportType, filter: ExportFilter): Promise<ExportTable>;
  clubs(): Promise<{ id: string; name: string }[]>;
  /** Annual reports (A2) audit as type ANNUAL_REPORT, filtered by year, counting clubs. */
  audit(input: { actorId: string; type: ExportType | "ANNUAL_REPORT"; format: ExportFormat;
    filter: ExportFilter | { year: number }; rowCount: number; at: Date }): Promise<void>;
  /** Distinct period codes that have a Published evaluation (UC55 A2 year list). */
  publishedPeriodCodes(): Promise<string[]>;
  /** For the period codes `inYear` accepts: the latest Published revision per club and period, the Accepted periodic
   * reports, and every club. */
  annualSource(inYear: (periodCode: string) => boolean): Promise<AnnualSource>;
}

/** What the annual report file prints: the report, the heading lines, the achievements the officer picked, remarks. */
export interface AnnualReportDocument {
  report: AnnualReport;
  heading: string[];
  achievements: AnnualAchievement[];
  remarks?: string;
}

/** Writes a table to a file; `heading` lines go first (when, who, which filter — FR-05). */
export interface ExportFileWriter {
  write(format: ExportFormat, title: string, heading: string[], table: ExportTable): Promise<ExportFile>;
  /** Multi-type export: an info sheet (`heading` plus each sheet's row count), then one sheet per table. */
  writeWorkbook(title: string, heading: string[], sheets: { name: string; title: string; table: ExportTable }[]): Promise<ExportFile>;
  writeAnnual(format: AnnualFormat, title: string, document: AnnualReportDocument): Promise<ExportFile>;
}

const objectId = /^[0-9a-f]{24}$/i;

export function validateExportFilter(type: ExportType, filter: ExportFilter): ExportFilter {
  if (filter.periodCode !== undefined && (filter.from || filter.to)) {
    throw new DomainError("choose a semester or a date range, not both", "validation", { field: "period" });
  }
  if ((filter.from && Number.isNaN(filter.from.getTime())) || (filter.to && Number.isNaN(filter.to.getTime()))
    || (filter.from && filter.to && filter.from > filter.to)) {
    throw new DomainError("invalid export date range", "validation", { field: "period" });
  }
  if (filter.clubId !== undefined && !objectId.test(filter.clubId)) {
    throw new DomainError("invalid export club", "validation", { field: "clubId" });
  }
  if (filter.status !== undefined && !EXPORT_STATUSES[type].includes(filter.status)) {
    throw new DomainError("invalid export status", "validation", { field: "status" });
  }
  return filter;
}
