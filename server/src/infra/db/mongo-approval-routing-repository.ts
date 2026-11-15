import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import type {
  ApprovalRoutingRepository, RoutedRequestType, RoutingRule, RoutingRuleSet, RoutingSample, RiskCategory,
} from "../../domain/approval-routing.js";
import { DomainError } from "../../domain/errors.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;

// Trả Date nếu giá trị là Date, ngược lại undefined
function date(value: unknown): Date | undefined {
  return value instanceof Date ? value : undefined;
}

// Bỏ trường requiredLevel cũ khỏi rule định tuyến
/** Các bộ rule lưu từ thời còn duyệt hai cấp vẫn mang `requiredLevel`; hiện nay trường này vô nghĩa. */
function withoutLegacyLevel(rule: Doc): RoutingRule {
  const copy = { ...rule };
  delete copy.requiredLevel;
  return copy as unknown as RoutingRule;
}

// Ánh xạ document thành RoutingRuleSet
function ruleSetFrom(doc: Doc): RoutingRuleSet {
  return { id: String(doc._id), versionNo: Number(doc.versionNo), state: doc.state as RoutingRuleSet["state"],
    rules: (Array.isArray(doc.rules) ? doc.rules as Record<string, unknown>[] : []).map(withoutLegacyLevel), createdBy: String(doc.createdBy), createdAt: doc.createdAt as Date,
    ...(date(doc.updatedAt) ? { updatedAt: date(doc.updatedAt) } : {}),
    ...(doc.activatedBy ? { activatedBy: String(doc.activatedBy) } : {}),
    ...(date(doc.activatedAt) ? { activatedAt: date(doc.activatedAt) } : {}),
    ...(date(doc.supersededAt) ? { supersededAt: date(doc.supersededAt) } : {}) };
}

// Chuyển giá trị tiền sang number, mặc định 0
function money(value: unknown): number {
  return typeof value === "number" ? value : Number(String(value ?? 0)) || 0;
}

// Repository quản lý bộ rule định tuyến duyệt và SLA (UC05)
export function mongoApprovalRoutingRepository(): ApprovalRoutingRepository {
  const sets = m.routingRuleSets!;

  async function required(id: Types.ObjectId): Promise<RoutingRuleSet> {
    const doc = await sets.findById(id).lean();
    if (!doc) throw new DomainError("routing rule set not found", "not_found");
    return ruleSetFrom(doc as Doc);
  }

  return {
    // Liệt kê các phiên bản rule set mới nhất
    async list() {
      return (await sets.find({}).sort({ versionNo: -1 }).limit(50).lean()).map((doc) => ruleSetFrom(doc as Doc));
    },
    // Tìm rule set theo id
    async find(id) {
      const doc = await sets.findById(new Types.ObjectId(id)).lean();
      return doc ? ruleSetFrom(doc as Doc) : null;
    },
    // Tạo rule set Draft mới với số phiên bản kế tiếp
    async createDraft(rules, actorId, now) {
      const id = new Types.ObjectId();
      try {
        const latest = await sets.findOne({}).sort({ versionNo: -1 }).lean();
        await sets.create({ _id: id, versionNo: Number(latest?.versionNo ?? 0) + 1, state: "Draft", rules,
          createdBy: new Types.ObjectId(actorId), createdAt: now });
      } catch (error) {
        if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
          throw new DomainError("another version was created meanwhile; retry", "conflict");
        }
        throw error;
      }
      return required(id);
    },
    // Lưu chỉnh sửa rule set đang Draft
    async saveDraft(id, rules, _actorId, now) {
      const changed = await sets.updateOne({ _id: new Types.ObjectId(id), state: "Draft" }, { $set: { rules, updatedAt: now } });
      if (changed.matchedCount !== 1) throw new DomainError("only a draft rule set can be edited", "conflict");
      return required(new Types.ObjectId(id));
    },
    // Kích hoạt rule set Draft và chuyển bộ đang Active sang Superseded
    async activate(id, actorId, now) {
      const target = new Types.ObjectId(id);
      // Chỉ thử một lần, không tự động retry: kích hoạt đồng thời phải báo 409, không được âm thầm
      // thay thế bộ rule mà head kia vừa kích hoạt.
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        const draft = await sets.findOne({ _id: target, state: "Draft" }).session(session).lean();
        if (!draft) throw new DomainError("only a draft rule set can be activated", "conflict");
        // Thay thế bộ cũ trước: partial unique index uq_routing_active chỉ cho phép một bộ Active tại một thời điểm.
        const previous = await sets.findOneAndUpdate({ state: "Active" }, { $set: { state: "Superseded", supersededAt: now } },
          { session }).lean();
        await sets.updateOne({ _id: target, state: "Draft" },
          { $set: { state: "Active", activatedBy: new Types.ObjectId(actorId), activatedAt: now } }, { session });
        await m.auditLogs!.create([{ entityType: "RoutingRuleSet", entityId: target, action: "ROUTING_RULES_ACTIVATED",
          actorId: new Types.ObjectId(actorId), actorRole: "ICPDP Head",
          before: previous ? { activeVersionId: String(previous._id), versionNo: previous.versionNo } : undefined,
          after: { state: "Active" }, correlationId: randomUUID(), at: now }], { session });
        await session.commitTransaction();
      } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        if (error instanceof mongoose.mongo.MongoServerError
          && (error.code === 11000 || error.code === 112 || error.hasErrorLabel("TransientTransactionError"))) {
          throw new DomainError("another rule set was activated meanwhile; reload and retry", "conflict");
        }
        throw error;
      } finally {
        await session.endSession();
      }
      return required(target);
    },
    // Lấy các task duyệt đã quyết định gần đây kèm tên CLB/sự kiện
    async recentDecided(limit) {
      const tasks = await m.approvalTasks!.find({ entityType: { $in: ["CLUB_APPLICATION", "EVENT_PROPOSAL", "PROPERTY_BOOKING"] },
        state: "Decided" }).sort({ closedAt: -1, _id: -1 }).limit(limit).lean();
      const eventIds = tasks.filter((task) => task.entityType === "EVENT_PROPOSAL").map((task) => task.entityId);
      const bookingIds = tasks.filter((task) => task.entityType === "PROPERTY_BOOKING").map((task) => task.entityId);
      const clubIds = [...new Set(tasks.flatMap((task) => (task.clubId ? [String(task.clubId)] : [])))].map((id) => new Types.ObjectId(id));
      const [versions, bookings, violations] = await Promise.all([
        m.eventProposalVersions!.find({ eventId: { $in: eventIds } })
          .select({ eventId: 1, revisionNo: 1, submittedAt: 1, requestedBudgetTotal: 1, "payload.riskCategory": 1 }).lean(),
        m.propertyBookings!.find({ _id: { $in: bookingIds } }).select({ propertyId: 1 }).lean(),
        m.violations!.find({ clubId: { $in: clubIds } }).select({ clubId: 1, openedAt: 1, state: 1, resolvedAt: 1, decidedAt: 1 }).lean(),
      ]);
      const properties = await m.properties!.find({ _id: { $in: bookings.map((row) => row.propertyId) } }).select({ type: 1 }).lean();
      const propertyType = new Map(properties.map((row) => [String(row._id), String(row.type)]));
      const bookingProperty = new Map(bookings.map((row) => [String(row._id), String(row.propertyId)]));
      /** Các vụ việc UC40 của CLB đang mở tại thời điểm `at` — lịch sử tuân thủ mà router đã thấy khi đó. */
      function openAt(clubId: unknown, at: Date): number {
        return violations.filter((row) => String(row.clubId) === String(clubId) && (row.openedAt as Date) <= at
          && !(["Resolved", "Closed"].includes(String(row.state))
            && ((row.resolvedAt ?? row.decidedAt) as Date | undefined ?? at) <= at)).length;
      }
      // Dữ kiện được đọc đúng như router thấy khi review mở ra: revision được nộp lúc đó và mức rủi ro của nó.
      return tasks.map((task): RoutingSample => {
        const type = task.entityType as RoutedRequestType;
        const id = String(task.entityId);
        const opened = task.openedAt as Date;
        const version = versions.filter((row) => String(row.eventId) === id && (row.submittedAt as Date) <= opened)
          .sort((a, b) => Number(b.revisionNo) - Number(a.revisionNo))[0];
        const risk = (version?.payload as Doc | undefined)?.riskCategory;
        return { entityType: type, entityId: id, title: String(task.title ?? ""), decidedAt: (task.closedAt ?? opened) as Date,
          facts: { requestType: type, openViolations: openAt(task.clubId, opened),
            ...(type === "EVENT_PROPOSAL" ? { amount: money(version?.requestedBudgetTotal),
              ...(typeof risk === "string" ? { riskCategory: risk as RiskCategory } : {}) } : {}),
            ...(type === "PROPERTY_BOOKING" ? { propertyType: propertyType.get(bookingProperty.get(id) ?? "") } : {}) } };
      });
    },
  };
}
