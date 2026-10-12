import { DomainError } from "./errors.js";

/** The fixed export catalogue (UC55 FR-01). */
export const EXPORT_TYPES = ["CLUBS", "MEMBERS", "EVENTS", "FINANCE", "COMPLIANCE", "EVALUATIONS"] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];

export const EXPORT_FORMATS = ["xlsx", "csv", "pdf"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** File titles and column headers are Vietnamese: the files go to school management as-is. */
export const EXPORT_TITLES: Record<ExportType, string> = {
  CLUBS: "Danh sách CLB và trạng thái",
  MEMBERS: "Thành viên theo CLB",
  EVENTS: "Sự kiện kèm đăng ký và điểm danh",
  FINANCE: "Ngân sách, giải ngân và đối soát",
  COMPLIANCE: "Hồ sơ vi phạm và góp ý/khiếu nại",
  EVALUATIONS: "Kết quả đánh giá CLB",
};

/** Status values each type can be filtered on (the entity's own lifecycle states). */
export const EXPORT_STATUSES: Record<ExportType, readonly string[]> = {
  CLUBS: ["Pending Setup", "Active", "Suspended", "Dissolving", "Dissolved"],
  MEMBERS: ["Active", "Inactive", "Left", "Banned"],
  EVENTS: ["Approved", "Upcoming", "Ongoing", "Completed", "Report Submitted", "Closed", "Cancelled"],
  FINANCE: ["Approved", "Cancelled", "Disbursed", "Settlement Submitted", "Reconciliation Pending", "Reconciled",
    "Recovery Pending", "Closed"],
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
  audit(input: { actorId: string; type: ExportType; format: ExportFormat; filter: ExportFilter;
    rowCount: number; at: Date }): Promise<void>;
}

/** Writes a table to a file; `heading` lines go first (when, who, which filter — FR-05). */
export interface ExportFileWriter {
  write(format: ExportFormat, title: string, heading: string[], table: ExportTable): Promise<ExportFile>;
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
