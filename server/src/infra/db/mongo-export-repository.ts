import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import {
  EXPORT_STATUSES, type ExportCell, type ExportFilter, type ExportRepository, type ExportTable, type ExportType,
} from "../../domain/data-export.js";
import { EVALUATION_DIMENSIONS } from "../../domain/evaluation-scheme.js";
import { ucmsModels } from "./ucms-models.js";

type Doc = Record<string, unknown>;

function date(value: unknown): ExportCell {
  return value instanceof Date ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh" }).format(value) : null;
}

function money(value: unknown): ExportCell {
  return value === undefined || value === null ? null : Number(String(value));
}

function text(value: unknown): ExportCell {
  return typeof value === "string" && value ? value : null;
}

function range(filter: ExportFilter): Record<string, Date> | null {
  if (!filter.from && !filter.to) return null;
  return { ...(filter.from ? { $gte: filter.from } : {}), ...(filter.to ? { $lte: filter.to } : {}) };
}

function club(filter: ExportFilter): Doc {
  return filter.clubId ? { clubId: new Types.ObjectId(filter.clubId) } : {};
}

export function mongoExportRepository(): ExportRepository {
  const models = ucmsModels;

  async function names(ids: unknown[], model: "clubs" | "users" | "events") {
    const valid = [...new Set(ids.filter(Boolean).map(String))].map((value) => new Types.ObjectId(value));
    const docs = valid.length ? await models[model]!.find({ _id: { $in: valid } })
      .select(model === "users" ? "displayName email" : model === "events" ? "title" : "name").lean() : [];
    return new Map(docs.map((doc) => [String(doc._id), doc as Doc]));
  }

  async function clubsTable(filter: ExportFilter): Promise<ExportTable> {
    const docs = await models.clubs!.find({
      ...(filter.clubId ? { _id: new Types.ObjectId(filter.clubId) } : {}),
      ...(filter.status ? { state: filter.status } : {}),
    }).sort({ name: 1 }).collation({ locale: "vi" }).lean();
    const counts = await models.clubMemberships!.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { clubId: { $in: docs.map((doc) => doc._id) }, state: "Active" } },
      { $group: { _id: "$clubId", count: { $sum: 1 } } }]);
    const byClub = new Map(counts.map((item) => [String(item._id), item.count]));
    return {
      columns: ["Mã CLB", "Tên CLB", "Lĩnh vực", "Trạng thái", "Thành viên đang hoạt động", "Email liên hệ", "Ngày tạo"],
      rows: docs.map((doc) => [text(doc.code), text(doc.name), text(doc.field), text(doc.state),
        byClub.get(String(doc._id)) ?? 0, text(doc.contactEmail), date(doc.createdAt)]),
    };
  }

  async function membersTable(filter: ExportFilter): Promise<ExportTable> {
    // In a period: members who joined before it ended and had not left before it started.
    const docs = await models.clubMemberships!.find({
      ...club(filter), ...(filter.status ? { state: filter.status } : {}),
      ...(filter.to ? { joinedAt: { $lte: filter.to } } : {}),
      ...(filter.from ? { $or: [{ leftAt: null }, { leftAt: { $gte: filter.from } }] } : {}),
    }).lean();
    const [clubs, users] = await Promise.all([names(docs.map((doc) => doc.clubId), "clubs"),
      names(docs.map((doc) => doc.userId), "users")]);
    const rows = docs.map((doc) => {
      const user = users.get(String(doc.userId));
      return [text(clubs.get(String(doc.clubId))?.name), text(user?.displayName), text(user?.email), text(doc.state),
        text(doc.defaultRole), date(doc.joinedAt), date(doc.leftAt)];
    }).sort((left, right) => String(left[0]).localeCompare(String(right[0]), "vi")
      || String(left[1]).localeCompare(String(right[1]), "vi"));
    return { columns: ["CLB", "Họ tên", "Email", "Trạng thái", "Vai trò", "Ngày tham gia", "Ngày rời"], rows };
  }

  async function eventsTable(filter: ExportFilter): Promise<ExportTable> {
    const window = range(filter);
    const docs = await models.events!.find({
      ...club(filter), state: filter.status ?? { $in: [...EXPORT_STATUSES.EVENTS] },
      ...(filter.periodCode ? { semesterCode: filter.periodCode } : window ? { startAt: window } : {}),
    }).sort({ startAt: 1 }).lean();
    const ids = docs.map((doc) => doc._id);
    const [registrations, attendance] = await Promise.all([
      models.eventRegistrations!.aggregate<{ _id: { eventId: Types.ObjectId; state: string }; count: number }>([
        { $match: { eventId: { $in: ids } } }, { $group: { _id: { eventId: "$eventId", state: "$state" }, count: { $sum: 1 } } }]),
      models.attendances!.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { eventId: { $in: ids } } }, { $group: { _id: "$eventId", count: { $sum: 1 } } }]),
    ]);
    function registered(eventId: unknown, state: string): number {
      return registrations.find((item) => String(item._id.eventId) === String(eventId) && item._id.state === state)?.count ?? 0;
    }
    const attended = new Map(attendance.map((item) => [String(item._id), item.count]));
    return {
      columns: ["Đơn vị tổ chức", "Sự kiện", "Học kỳ", "Bắt đầu", "Kết thúc", "Trạng thái", "Sức chứa",
        "Đăng ký xác nhận", "Danh sách chờ", "Đã huỷ đăng ký", "Điểm danh đã chốt", "Số người có mặt"],
      // FR-04: attendance is only reported once it has been finalized (UC32).
      rows: docs.map((doc) => [text(doc.clubName) ?? "ICPDP", text(doc.title), text(doc.semesterCode),
        date(doc.startAt), date(doc.endAt), text(doc.state), Number(doc.capacity ?? 0),
        registered(doc._id, "Confirmed"), registered(doc._id, "Waitlisted"), registered(doc._id, "Cancelled"),
        doc.attendanceFinalized === true ? "Có" : "Chưa",
        doc.attendanceFinalized === true ? attended.get(String(doc._id)) ?? 0 : null]),
    };
  }

  async function financeTable(filter: ExportFilter): Promise<ExportTable> {
    const window = range(filter);
    const docs = await models.eventBudgets!.find({
      ...club(filter), ...(filter.status ? { state: filter.status } : {}),
      ...(filter.periodCode ? { periodCode: filter.periodCode } : window ? { createdAt: window } : {}),
    }).sort({ createdAt: 1 }).lean();
    const [clubs, events, reconciliations] = await Promise.all([
      names(docs.map((doc) => doc.clubId), "clubs"), names(docs.map((doc) => doc.eventId), "events"),
      models.financialReconciliations!.find({ eventBudgetId: { $in: docs.map((doc) => doc._id) } }).lean(),
    ]);
    const outcome = new Map(reconciliations.map((item) => [String(item.eventBudgetId), item.outcome]));
    return {
      columns: ["CLB", "Sự kiện", "Kỳ", "Số xin", "Số duyệt", "Đã giải ngân", "Chi hợp lệ", "Chênh lệch tất toán",
        "Phải hoàn", "Đã hoàn", "Trạng thái", "Kết quả đối soát"],
      rows: docs.map((doc) => [text(clubs.get(String(doc.clubId))?.name), text(events.get(String(doc.eventId))?.title),
        text(doc.periodCode), money(doc.requestedTotal), money(doc.approvedTotal), money(doc.disbursedTotal),
        money(doc.acceptedTotal), money(doc.settlementBalance), money(doc.recoveryAmount), money(doc.refundedTotal),
        text(doc.state), text(outcome.get(String(doc._id)))]),
    };
  }

  async function complianceTable(filter: ExportFilter): Promise<ExportTable> {
    const window = range(filter);
    const feedbackOnly = filter.status === "Submitted";
    const [violations, complaints] = await Promise.all([
      feedbackOnly ? [] : models.violations!.find({ ...club(filter), ...(filter.status ? { state: filter.status } : {}),
        ...(window ? { openedAt: window } : {}) }).lean(),
      filter.status && !feedbackOnly ? [] : models.complaints!.find({ ...club(filter),
        ...(window ? { submittedAt: window } : {}) }).lean(),
    ]);
    const [clubs, users] = await Promise.all([
      names([...violations, ...complaints].map((doc) => doc.clubId), "clubs"),
      // BR61: anonymous senders are never looked up, so their identity cannot reach the file.
      names(complaints.filter((doc) => doc.isAnonymous !== true).map((doc) => doc.complainantId), "users"),
    ]);
    const rows: { at: number; row: ExportCell[] }[] = [
      ...violations.map((doc) => ({ at: (doc.openedAt as Date).getTime(), row: [
        "Hồ sơ vi phạm", text(clubs.get(String(doc.clubId))?.name), text(doc.title), text(doc.description),
        text(doc.severity), text(doc.state), "ICPDP", date(doc.openedAt)] })),
      ...complaints.map((doc) => {
        const sender = doc.isAnonymous === true ? "Ẩn danh" : users.get(String(doc.complainantId));
        return { at: (doc.submittedAt as Date).getTime(), row: [
          doc.recipient === "ICPDP" ? "Góp ý gửi ICPDP" : "Góp ý gửi CLB", text(clubs.get(String(doc.clubId))?.name),
          text(doc.type), text(doc.description), null, text(doc.state),
          typeof sender === "string" ? sender : sender ? `${String(sender.displayName)} <${String(sender.email)}>` : null,
          date(doc.submittedAt)] };
      }),
    ];
    return {
      columns: ["Loại hồ sơ", "CLB", "Tiêu đề / loại", "Mô tả", "Mức độ", "Trạng thái", "Người gửi", "Ngày"],
      rows: rows.sort((left, right) => left.at - right.at).map((item) => item.row),
    };
  }

  async function evaluationsTable(filter: ExportFilter): Promise<ExportTable> {
    const window = range(filter);
    // BR30/BR61: only published results; the latest published revision per club and period.
    const docs = await models.evaluations!.find({ ...club(filter), state: "Published",
      ...(filter.periodCode ? { periodCode: filter.periodCode } : window ? { publishedAt: window } : {}),
    }).sort({ revisionNo: -1 }).lean();
    const byClubPeriod = new Map<string, Doc>();
    for (const doc of docs) {
      const key = `${String(doc.clubId)}:${String(doc.periodCode)}`;
      if (!byClubPeriod.has(key)) byClubPeriod.set(key, doc); // sorted by revision, so the first is the latest
    }
    // Comparison table (A1): grouped by period, best total first.
    const unique = [...byClubPeriod.values()].sort((left, right) =>
      String(left.periodCode).localeCompare(String(right.periodCode))
      || Number(String(right.totalScore ?? 0)) - Number(String(left.totalScore ?? 0)));
    const [clubs, results] = await Promise.all([names(unique.map((doc) => doc.clubId), "clubs"),
      models.evaluationDimensionResults!.find({ evaluationId: { $in: unique.map((doc) => doc._id) } }).lean()]);
    function score(evaluationId: unknown, code: string): ExportCell {
      const result = results.find((item) => String(item.evaluationId) === String(evaluationId) && item.dimensionCode === code);
      if (!result) return null;
      return result.isInsufficientData === true ? "Thiếu dữ liệu" : money(result.score);
    }
    return {
      columns: ["CLB", "Kỳ", ...EVALUATION_DIMENSIONS.map((dimension) => `${dimension.code} ${dimension.name}`),
        "Tổng điểm", "Xếp loại", "Công bố lúc"],
      rows: unique.map((doc) => [text(clubs.get(String(doc.clubId))?.name), text(doc.periodCode),
        ...EVALUATION_DIMENSIONS.map((dimension) => score(doc._id, dimension.code)), money(doc.totalScore),
        text(doc.classification), date(doc.publishedAt)]),
    };
  }

  const tables: Record<ExportType, (filter: ExportFilter) => Promise<ExportTable>> = {
    CLUBS: clubsTable, MEMBERS: membersTable, EVENTS: eventsTable, FINANCE: financeTable,
    COMPLIANCE: complianceTable, EVALUATIONS: evaluationsTable,
  };

  return {
    table(type, filter) {
      return tables[type](filter);
    },
    async clubs() {
      const docs = await models.clubs!.find().select("name").sort({ name: 1 }).collation({ locale: "vi" }).lean();
      return docs.map((doc) => ({ id: String(doc._id), name: String(doc.name) }));
    },
    async audit(input) {
      await models.auditLogs!.create({ entityType: "DataExport", entityId: new Types.ObjectId(),
        action: "DATA_EXPORTED", actorId: new Types.ObjectId(input.actorId), actorRole: "ICPDP_OFFICER",
        after: { type: input.type, format: input.format, filter: input.filter, rowCount: input.rowCount },
        correlationId: randomUUID(), at: input.at });
    },
  };
}
