import {
  ANNUAL_FORMATS, MAX_ACHIEVEMENTS, MAX_REMARKS, annualYears, buildAnnualReport, parsePeriodCode, validateAnnualYear,
  type Season,
} from "../domain/annual-report.js";
import type { AuthRepository } from "../domain/auth.js";
import {
  EXPORT_FORMATS, EXPORT_SHEET_NAMES, EXPORT_STATUSES, EXPORT_TITLES, EXPORT_TYPES, validateExportFilter,
  type ExportFileWriter, type ExportFilter, type ExportRepository, type ExportType,
} from "../domain/data-export.js";
import { DomainError } from "../domain/errors.js";
import type { PolicyRepository } from "../domain/policy.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;
type ExportAuth = Pick<AuthRepository, "systemRoleCodes" | "findUserById">;

/** BR61: only ICPDP officers export. */
async function officer(auth: ExportAuth, actor: AccessActor | null): Promise<string> {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") {
    throw new DomainError(actor.lockReason || "account locked", "locked");
  }
  if (!objectId.test(actor.id)) throw new DomainError("invalid actor", "validation");
  if (!(await auth.systemRoleCodes(actor.id)).includes("ICPDP_OFFICER")) {
    throw new DomainError("ICPDP officer role required", "forbidden");
  }
  return actor.id;
}

/** FR-UC55-12: one or more distinct types; a status filter belongs to a single type's lifecycle. */
function exportTypes(values: string[], filter: ExportFilter): ExportType[] {
  const types = values.map((value) => {
    const type = EXPORT_TYPES.find((item) => item === value);
    if (!type) throw new DomainError("invalid export type", "validation", { field: "types" });
    return type;
  });
  if (!types.length || new Set(types).size !== types.length) {
    throw new DomainError("choose one or more distinct export types", "validation", { field: "types" });
  }
  if (types.length > 1 && filter.status !== undefined) {
    throw new DomainError("a status filter needs exactly one export type", "validation", { field: "status" });
  }
  return types;
}

async function semesters(policy: PolicyRepository, now: Date) {
  return (await policy.findEffective(now))?.academicCalendar ?? [];
}

/** A semester becomes its date window; the code is kept for entities that store it. */
async function resolved(policy: PolicyRepository, type: ExportType, filter: ExportFilter,
  now: Date): Promise<ExportFilter> {
  const valid = validateExportFilter(type, filter);
  if (valid.periodCode === undefined) return valid;
  const semester = (await semesters(policy, now)).find((item) => item.code === valid.periodCode);
  if (!semester) throw new DomainError("semester is not in the academic calendar", "validation", { field: "period" });
  return { ...valid, from: semester.startAt, to: semester.endAt };
}

export async function exportOptions(repo: ExportRepository, policy: PolicyRepository, auth: ExportAuth,
  actor: AccessActor | null, now: Date) {
  await officer(auth, actor);
  const [periods, clubs, codes] = await Promise.all([semesters(policy, now), repo.clubs(), repo.publishedPeriodCodes()]);
  return {
    types: EXPORT_TYPES.map((type) => ({ type, title: EXPORT_TITLES[type], statuses: EXPORT_STATUSES[type] })),
    formats: EXPORT_FORMATS,
    periods: periods.map((semester) => ({ code: semester.code, startAt: semester.startAt, endAt: semester.endAt })),
    clubs,
    annualYears: annualYears(codes),
  };
}

/** FR-02: the row count shown before exporting, per selected type. */
export async function previewExport(repo: ExportRepository, policy: PolicyRepository, auth: ExportAuth,
  actor: AccessActor | null, input: { types: string[]; filter: ExportFilter }, now: Date) {
  await officer(auth, actor);
  const types = exportTypes(input.types, input.filter);
  const filter = await resolved(policy, types[0]!, input.filter, now);
  const counts = await Promise.all(types.map(async (type) => ({ type, rowCount: (await repo.table(type, filter)).rows.length })));
  return { rowCount: counts.reduce((total, item) => total + item.rowCount, 0), types: counts };
}

function dateTime(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh" }).format(value);
}

export async function exportData(repo: ExportRepository, writer: ExportFileWriter, policy: PolicyRepository,
  auth: ExportAuth, actor: AccessActor | null,
  input: { types: string[]; filter: ExportFilter; format: string }, now: Date) {
  const actorId = await officer(auth, actor);
  const types = exportTypes(input.types, input.filter);
  const format = EXPORT_FORMATS.find((item) => item === input.format);
  if (!format) throw new DomainError("invalid export format", "validation", { field: "format" });
  if (types.length > 1 && format !== "xlsx") {
    throw new DomainError("several export types go in one xlsx file", "validation", { field: "format" });
  }
  const filter = await resolved(policy, types[0]!, input.filter, now);
  const tables = await Promise.all(types.map((type) => repo.table(type, filter)));
  // E1: nothing matched, so no empty file is produced.
  if (tables.every((table) => !table.rows.length)) throw new DomainError("no data matches this filter", "not_found");

  const [user, clubs] = await Promise.all([auth.findUserById(actorId), filter.clubId ? repo.clubs() : []]);
  const clubName = filter.clubId ? clubs.find((club) => club.id === filter.clubId)?.name ?? filter.clubId : null;
  const period = filter.periodCode ? `học kỳ ${filter.periodCode}`
    : filter.from || filter.to ? `${filter.from ? dateTime(filter.from) : "…"} – ${filter.to ? dateTime(filter.to) : "…"}`
      : "toàn bộ thời gian";
  const heading = [
    `Xuất lúc: ${dateTime(now)}`,
    `Người xuất: ${user ? `${user.displayName} <${user.email}>` : actorId}`,
    `Bộ lọc: ${period}; CLB: ${clubName ?? "tất cả"}; trạng thái: ${filter.status ?? "tất cả"}`,
  ];
  const stamp = now.toISOString().slice(0, 10);
  const single = types.length === 1 ? types[0]! : null;
  const file = single
    ? await writer.write(format, EXPORT_TITLES[single], [...heading.slice(0, 2), `${heading[2]}; ${tables[0]!.rows.length} dòng`],
      tables[0]!)
    : await writer.writeWorkbook("Báo cáo tổng hợp", heading,
      types.map((type, index) => ({ name: EXPORT_SHEET_NAMES[type], title: EXPORT_TITLES[type], table: tables[index]! })));
  // FR-07: one audit record per exported type.
  for (const [index, type] of types.entries()) {
    await repo.audit({ actorId, type, format, filter, rowCount: tables[index]!.rows.length, at: now });
  }
  return { fileName: single ? `ucms-${single.toLowerCase()}-${stamp}.${file.extension}`
    : `bao-cao-tong-hop-${stamp}.${file.extension}`, file };
}

async function annualReport(repo: ExportRepository, rawYear: unknown) {
  const year = validateAnnualYear(rawYear);
  // FR-UC55-09: a year without any Published evaluation produces nothing.
  if (!(await repo.publishedPeriodCodes()).some((code) => parsePeriodCode(code)?.year === year)) {
    throw new DomainError("no published evaluation in this academic year", "not_found");
  }
  return buildAnnualReport(year, await repo.annualSource((code) => parsePeriodCode(code)?.year === year));
}

/** UC55 A2: the whole annual report as JSON, to read before exporting. Not audited. */
export async function previewAnnualReport(repo: ExportRepository, auth: ExportAuth, actor: AccessActor | null,
  input: { year: unknown }) {
  await officer(auth, actor);
  return annualReport(repo, input.year);
}

function termName(season: Season, year: number): string {
  return `${season.charAt(0)}${season.slice(1).toLowerCase()} ${year}`;
}

export async function exportAnnualReport(repo: ExportRepository, writer: ExportFileWriter, auth: ExportAuth,
  actor: AccessActor | null, input: { year: unknown; format: string; remarks?: string; achievementKeys?: string[] }, now: Date) {
  const actorId = await officer(auth, actor);
  const format = ANNUAL_FORMATS.find((item) => item === input.format);
  if (!format) throw new DomainError("invalid export format", "validation", { field: "format" });
  const remarks = input.remarks?.trim() || undefined;
  if (remarks && remarks.length > MAX_REMARKS) throw new DomainError("remarks are too long", "validation", { field: "remarks" });
  const keys = [...new Set(input.achievementKeys ?? [])];
  if (keys.length > MAX_ACHIEVEMENTS) {
    throw new DomainError(`pick at most ${MAX_ACHIEVEMENTS} achievements`, "validation", { field: "achievementKeys" });
  }
  const report = await annualReport(repo, input.year);
  const known = new Set(report.achievements.map((item) => item.key));
  if (keys.some((key) => !known.has(key))) {
    throw new DomainError("an achievement does not belong to this year", "validation", { field: "achievementKeys" });
  }

  const user = await auth.findUserById(actorId);
  const published = report.terms.filter((term) => term.published).map((term) => termName(term.season, report.year));
  const heading = [
    ...(report.provisional ? [`Báo cáo tạm tính — còn thiếu học kỳ: ${report.missingTerms
      .map((season) => termName(season, report.year)).join(", ")}`] : []),
    `Học kỳ có dữ liệu: ${published.join(", ")}`,
    `Xuất lúc: ${dateTime(now)}`,
    `Người xuất: ${user?.displayName ?? actorId}`,
  ];
  const file = await writer.writeAnnual(format, `Báo cáo tổng kết hoạt động Câu lạc bộ năm học ${report.year}`,
    { report, heading, achievements: report.achievements.filter((item) => keys.includes(item.key)), ...(remarks ? { remarks } : {}) });
  await repo.audit({ actorId, type: "ANNUAL_REPORT", format, filter: { year: report.year },
    rowCount: report.evaluation.evaluatedClubs, at: now });
  return { fileName: `bao-cao-danh-gia-clb-${report.year}.${file.extension}`, file };
}
