import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import type { AnnualEvaluation, AnnualPeriodicReport } from "../../domain/annual-report.js";
import {
  EXPORT_STATUSES, type ExportCell, type ExportFilter, type ExportRepository, type ExportTable, type ExportType,
} from "../../domain/data-export.js";
import type { Classification } from "../../domain/evaluation.js";
import { EVALUATION_DIMENSIONS, type SchemeThresholds } from "../../domain/evaluation-scheme.js";
import { ucmsModels } from "./ucms-models.js";

type Doc = Record<string, unknown>;

// Định dạng ngày giờ theo múi giờ Việt Nam cho ô export
function date(value: unknown): ExportCell {
  return value instanceof Date ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh" }).format(value) : null;
}

// Chuyển giá trị tiền thành số cho ô export
function money(value: unknown): ExportCell {
  return value === undefined || value === null ? null : Number(String(value));
}

// Lấy chuỗi không rỗng, ngược lại null
function text(value: unknown): ExportCell {
  return typeof value === "string" && value ? value : null;
}

// Chuyển sang số hữu hạn, không hợp lệ thì undefined
function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

// Ép giá trị về object thường, ngược lại object rỗng
function object(value: unknown): Doc {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Doc : {};
}

// Dựng điều kiện khoảng thời gian from/to của bộ lọc export
function range(filter: ExportFilter): Record<string, Date> | null {
  if (!filter.from && !filter.to) return null;
  return { ...(filter.from ? { $gte: filter.from } : {}), ...(filter.to ? { $lte: filter.to } : {}) };
}

// Dựng điều kiện lọc theo CLB của bộ lọc export
function club(filter: ExportFilter): Doc {
  return filter.clubId ? { clubId: new Types.ObjectId(filter.clubId) } : {};
}

// Repository xuất dữ liệu báo cáo của ICPDP từ MongoDB
export function mongoExportRepository(): ExportRepository {
  const models = ucmsModels;

  // Tra tên theo danh sách id trong collection clubs, users hoặc events
  async function names(ids: unknown[], model: "clubs" | "users" | "events") {
    const valid = [...new Set(ids.filter(Boolean).map(String))].map((value) => new Types.ObjectId(value));
    const docs = valid.length ? await models[model]!.find({ _id: { $in: valid } })
      .select(model === "users" ? "displayName email" : model === "events" ? "title" : "name").lean() : [];
    return new Map(docs.map((doc) => [String(doc._id), doc as Doc]));
  }

  // Bảng export danh sách CLB kèm số thành viên
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

  // Bảng export thành viên theo CLB và kỳ lọc
  async function membersTable(filter: ExportFilter): Promise<ExportTable> {
    // Trong một kỳ: thành viên vào trước khi kỳ kết thúc và chưa rời trước khi kỳ bắt đầu.
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

  // Bảng export sự kiện kèm số lượng đăng ký
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
        { $match: { eventId: { $in: ids }, abnormalFlags: { $ne: "no-show" } } }, { $group: { _id: "$eventId", count: { $sum: 1 } } }]),
    ]);
    function registered(eventId: unknown, state: string): number {
      return registrations.find((item) => String(item._id.eventId) === String(eventId) && item._id.state === state)?.count ?? 0;
    }
    const attended = new Map(attendance.map((item) => [String(item._id), item.count]));
    return {
      columns: ["Đơn vị tổ chức", "Sự kiện", "Học kỳ", "Bắt đầu", "Kết thúc", "Trạng thái", "Sức chứa",
        "Đăng ký xác nhận", "Danh sách chờ", "Đã huỷ đăng ký", "Điểm danh đã chốt", "Số người có mặt"],
      // FR-04: điểm danh chỉ được báo cáo khi đã chốt (UC32).
      rows: docs.map((doc) => [text(doc.clubName) ?? "ICPDP", text(doc.title), text(doc.semesterCode),
        date(doc.startAt), date(doc.endAt), text(doc.state), Number(doc.capacity ?? 0),
        registered(doc._id, "Confirmed"), registered(doc._id, "Waitlisted"), registered(doc._id, "Cancelled"),
        doc.attendanceFinalized === true ? "Có" : "Chưa",
        doc.attendanceFinalized === true ? attended.get(String(doc._id)) ?? 0 : null]),
    };
  }

  // Truy vấn ngân sách sự kiện theo bộ lọc export
  /** FINANCE và CLUB_BUDGETS đọc cùng các ngân sách, nên tổng của chúng luôn khớp nhau. */
  function budgets(filter: ExportFilter) {
    const window = range(filter);
    return models.eventBudgets!.find({
      ...club(filter), ...(filter.status ? { state: filter.status } : {}),
      ...(filter.periodCode ? { periodCode: filter.periodCode } : window ? { createdAt: window } : {}),
    }).sort({ createdAt: 1 }).lean();
  }

  // Bảng export tài chính sự kiện kèm đối soát
  async function financeTable(filter: ExportFilter): Promise<ExportTable> {
    const docs = await budgets(filter);
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

  // Bảng export tổng hợp ngân sách theo từng CLB
  async function clubBudgetsTable(filter: ExportFilter): Promise<ExportTable> {
    const docs = await budgets(filter);
    const columns = ["CLB", "Số ngân sách", "Tổng được duyệt", "Tổng đã giải ngân", "Chi thực tế đã quyết toán",
      "Phải hoàn", "Đã hoàn", "Chưa đối soát"];
    // Hoàn toàn không có ngân sách trong phạm vi: loại này rỗng (E1), không phải một sheet toàn số 0.
    if (!docs.length) return { columns, rows: [] };
    const clubs = await models.clubs!.find(filter.clubId ? { _id: new Types.ObjectId(filter.clubId) } : {})
      .select("name").sort({ name: 1 }).collation({ locale: "vi" }).lean();
    function sum(own: Doc[], field: string): number {
      return own.reduce((total, doc) => total + (optionalNumber(doc[field]) ?? 0), 0);
    }
    return {
      columns,
      rows: clubs.map((item) => {
        const own = docs.filter((doc) => String(doc.clubId) === String(item._id));
        // Chưa đối soát: vẫn trước khi ICPDP quyết định quyết toán (UC37).
        const open = own.filter((doc) => ["Approved", "Disbursed", "Settlement Submitted", "Reconciliation Pending"]
          .includes(String(doc.state))).length;
        return [text(item.name), own.length, sum(own, "approvedTotal"), sum(own, "disbursedTotal"), sum(own, "acceptedTotal"),
          sum(own, "recoveryAmount"), sum(own, "refundedTotal"), open];
      }),
    };
  }

  // Bảng export vi phạm và phản hồi/khiếu nại
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
      // BR61: người gửi ẩn danh không bao giờ được tra cứu, nên danh tính không thể lọt vào file.
      names(complaints.filter((doc) => doc.isAnonymous !== true).map((doc) => doc.complainantId), "users"),
    ]);
    const rows: { at: number; row: ExportCell[] }[] = [
      ...violations.map((doc) => ({ at: (doc.openedAt as Date).getTime(), row: [
        "Hồ sơ vi phạm", text(clubs.get(String(doc.clubId))?.name), text(doc.title), text(doc.description),
        text(doc.severity), text(doc.state), "ICPDP", date(doc.openedAt)] })),
      ...complaints.map((doc) => {
        const sender = doc.isAnonymous === true ? "Ẩn danh" : users.get(String(doc.complainantId));
        return { at: (doc.submittedAt as Date).getTime(), row: [
          // Các dòng ghi trước 07/11/2026 là feedback một chiều có người nhận; các dòng sau là khiếu nại UC50.
          doc.recipient === "ICPDP" ? "Góp ý gửi ICPDP" : doc.recipient === "CLUB" ? "Góp ý gửi CLB" : "Khiếu nại",
          text(clubs.get(String(doc.clubId))?.name),
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

  // BR30/BR61: bảng export kết quả đánh giá đã Published
  async function evaluationsTable(filter: ExportFilter): Promise<ExportTable> {
    const window = range(filter);
    // BR30/BR61: chỉ kết quả đã công bố; lấy revision đã công bố mới nhất cho mỗi CLB và kỳ.
    const docs = await models.evaluations!.find({ ...club(filter), state: "Published",
      ...(filter.periodCode ? { periodCode: filter.periodCode } : window ? { publishedAt: window } : {}),
    }).sort({ revisionNo: -1 }).lean();
    const byClubPeriod = new Map<string, Doc>();
    for (const doc of docs) {
      const key = `${String(doc.clubId)}:${String(doc.periodCode)}`;
      if (!byClubPeriod.has(key)) byClubPeriod.set(key, doc); // đã sắp theo revision, nên bản đầu là mới nhất
    }
    // Bảng so sánh (A1): nhóm theo kỳ, tổng điểm cao nhất trước.
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
    CLUBS: clubsTable, MEMBERS: membersTable, EVENTS: eventsTable, FINANCE: financeTable, CLUB_BUDGETS: clubBudgetsTable,
    COMPLIANCE: complianceTable, EVALUATIONS: evaluationsTable,
  };

  return {
    // Dựng bảng export theo loại dữ liệu
    table(type, filter) {
      return tables[type](filter);
    },
    // Danh sách CLB (id, tên) cho bộ lọc export
    async clubs() {
      const docs = await models.clubs!.find().select("name").sort({ name: 1 }).collation({ locale: "vi" }).lean();
      return docs.map((doc) => ({ id: String(doc._id), name: String(doc.name) }));
    },
    // Mã các kỳ đã có kết quả đánh giá Published
    async publishedPeriodCodes() {
      return (await models.evaluations!.distinct("periodCode", { state: "Published" })).map(String);
    },
    // Nguồn dữ liệu tổng hợp theo năm từ đánh giá Published và báo cáo Accepted
    async annualSource(inYear) {
      const [evaluationCodes, reportCodes] = await Promise.all([
        models.evaluations!.distinct("periodCode", { state: "Published" }),
        models.periodicReports!.distinct("periodCode", { state: "Accepted" })]);
      // BR30: revision Published mới nhất của mỗi CLB và kỳ; bản nháp và các revision sau đó bị huỷ công bố không bao giờ được tính.
      const latest = await models.evaluations!.aggregate<{ doc: Doc }>([
        { $match: { state: "Published", periodCode: { $in: evaluationCodes.map(String).filter(inYear) } } },
        { $sort: { revisionNo: -1 } },
        { $group: { _id: { clubId: "$clubId", periodCode: "$periodCode" }, doc: { $first: "$$ROOT" } } }]);
      const docs = latest.map((item) => item.doc);
      const [results, schemes, reports, clubs] = await Promise.all([
        models.evaluationDimensionResults!.find({ evaluationId: { $in: docs.map((doc) => doc._id) } }).lean(),
        models.evaluationSchemes!.find({ _id: { $in: docs.map((doc) => doc.schemeId) } }).select({ thresholds: 1 }).lean(),
        // UC39: chỉ báo cáo ICPDP đã chấp nhận; dòng báo cáo giữ phiên bản đã chấp nhận.
        models.periodicReports!.find({ state: "Accepted", periodCode: { $in: reportCodes.map(String).filter(inYear) } })
          .select({ clubId: 1, periodCode: 1, versionNo: 1, preloadedFigures: 1 }).lean(),
        models.clubs!.find().select({ name: 1, field: 1, state: 1, createdAt: 1 }).lean(),
      ]);
      const thresholds = new Map(schemes.map((scheme) => [String(scheme._id), scheme.thresholds as SchemeThresholds]));
      const evaluations: AnnualEvaluation[] = docs.map((doc) => {
        const own = results.filter((item) => String(item.evaluationId) === String(doc._id));
        const evidence = own.flatMap((item) => (Array.isArray(item.evidence) ? item.evidence as Doc[] : []));
        function metric(key: string): number | undefined {
          return optionalNumber(evidence.find((item) => item.metric === key)?.value);
        }
        const total = optionalNumber(doc.totalScore);
        return {
          clubId: String(doc.clubId), periodCode: String(doc.periodCode), revisionNo: Number(doc.revisionNo ?? 1),
          ...(doc.publishedAt instanceof Date ? { publishedAt: doc.publishedAt } : {}),
          ...(total !== undefined ? { totalScore: total } : {}),
          ...(typeof doc.classification === "string" && doc.classification
            ? { classification: doc.classification as Classification } : {}),
          thresholds: thresholds.get(String(doc.schemeId)) ?? { excellent: 85, good: 70, fair: 50 },
          dimensions: own.map((item) => {
            const score = optionalNumber(item.score);
            return { code: String(item.dimensionCode), ...(score !== undefined ? { score } : {}),
              insufficientData: item.isInsufficientData === true };
          }),
          metrics: { activeMembers: metric("activeMembers"), completedEvents: metric("completedEvents"),
            attendances: metric("attendances"), openViolations: metric("openViolations") },
        };
      });
      const accepted: AnnualPeriodicReport[] = reports.map((doc) => {
        const figures = object(doc.preloadedFigures);
        const finance = object(figures.finance);
        const achievements = object(figures.clubData).achievements;
        return {
          id: String(doc._id), clubId: String(doc.clubId), periodCode: String(doc.periodCode),
          versionNo: Number(doc.versionNo ?? 1),
          approvedTotal: optionalNumber(finance.approvedTotal), disbursedTotal: optionalNumber(finance.disbursedTotal),
          achievements: (Array.isArray(achievements) ? achievements as unknown[] : []).map((item) => ({
            title: String(object(item).title ?? ""), description: String(object(item).description ?? "") })),
        };
      });
      return {
        evaluations, reports: accepted,
        clubs: clubs.map((doc) => ({ id: String(doc._id), name: String(doc.name ?? ""),
          ...(typeof doc.field === "string" && doc.field ? { field: doc.field } : {}), state: String(doc.state),
          ...(doc.createdAt instanceof Date ? { createdAt: doc.createdAt } : {}) })),
      };
    },
    // Ghi audit log DATA_EXPORTED cho mỗi lần export
    async audit(input) {
      await models.auditLogs!.create({ entityType: "DataExport", entityId: new Types.ObjectId(),
        action: "DATA_EXPORTED", actorId: new Types.ObjectId(input.actorId), actorRole: "ICPDP_OFFICER",
        after: { type: input.type, format: input.format, filter: input.filter, rowCount: input.rowCount },
        correlationId: randomUUID(), at: input.at });
    },
  };
}
