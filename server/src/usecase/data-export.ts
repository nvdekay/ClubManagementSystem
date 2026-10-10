import type { AuthRepository } from "../domain/auth.js";
import {
  EXPORT_FORMATS, EXPORT_STATUSES, EXPORT_TITLES, EXPORT_TYPES, validateExportFilter,
  type ExportFileWriter, type ExportFilter, type ExportFormat, type ExportRepository, type ExportType,
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

function exportType(value: string): ExportType {
  const type = EXPORT_TYPES.find((item) => item === value);
  if (!type) throw new DomainError("invalid export type", "validation", { field: "type" });
  return type;
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
  const [periods, clubs] = await Promise.all([semesters(policy, now), repo.clubs()]);
  return {
    types: EXPORT_TYPES.map((type) => ({ type, title: EXPORT_TITLES[type], statuses: EXPORT_STATUSES[type] })),
    formats: EXPORT_FORMATS,
    periods: periods.map((semester) => ({ code: semester.code, startAt: semester.startAt, endAt: semester.endAt })),
    clubs,
  };
}

/** FR-02: the row count shown before exporting. */
export async function previewExport(repo: ExportRepository, policy: PolicyRepository, auth: ExportAuth,
  actor: AccessActor | null, input: { type: string; filter: ExportFilter }, now: Date) {
  await officer(auth, actor);
  const type = exportType(input.type);
  const table = await repo.table(type, await resolved(policy, type, input.filter, now));
  return { rowCount: table.rows.length };
}

function dateTime(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh" }).format(value);
}

export async function exportData(repo: ExportRepository, writer: ExportFileWriter, policy: PolicyRepository,
  auth: ExportAuth, actor: AccessActor | null,
  input: { type: string; filter: ExportFilter; format: string }, now: Date) {
  const actorId = await officer(auth, actor);
  const type = exportType(input.type);
  const format = EXPORT_FORMATS.find((item) => item === input.format);
  if (!format) throw new DomainError("invalid export format", "validation", { field: "format" });
  const filter = await resolved(policy, type, input.filter, now);
  const table = await repo.table(type, filter);
  // E1: nothing matched, so no empty file is produced.
  if (!table.rows.length) throw new DomainError("no data matches this filter", "not_found");

  const [user, clubs] = await Promise.all([auth.findUserById(actorId), filter.clubId ? repo.clubs() : []]);
  const clubName = filter.clubId ? clubs.find((club) => club.id === filter.clubId)?.name ?? filter.clubId : null;
  const period = filter.periodCode ? `học kỳ ${filter.periodCode}`
    : filter.from || filter.to ? `${filter.from ? dateTime(filter.from) : "…"} – ${filter.to ? dateTime(filter.to) : "…"}`
      : "toàn bộ thời gian";
  const heading = [
    `Xuất lúc: ${dateTime(now)}`,
    `Người xuất: ${user ? `${user.displayName} <${user.email}>` : actorId}`,
    `Bộ lọc: ${period}; CLB: ${clubName ?? "tất cả"}; trạng thái: ${filter.status ?? "tất cả"}; ${table.rows.length} dòng`,
  ];
  const file = await writer.write(format as ExportFormat, EXPORT_TITLES[type], heading, table);
  await repo.audit({ actorId, type, format, filter, rowCount: table.rows.length, at: now });
  const stamp = now.toISOString().slice(0, 10);
  return { fileName: `ucms-${type.toLowerCase()}-${stamp}.${file.extension}`, file };
}
